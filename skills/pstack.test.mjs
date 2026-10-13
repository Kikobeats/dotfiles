import { test } from 'node:test'
import assert from 'node:assert/strict'
import { HARNESSES, installOn } from './pstack.mjs'

const harnessNamed = name => HARNESSES.find(harness => harness.name === name)

const recorder = (fail = () => null) => {
  const calls = []
  const run = async (binary, args) => {
    const command = [binary, ...args].join(' ')
    calls.push(command)
    const error = fail(command)
    if (error) throw error
  }
  return { calls, run }
}

const withCode = code => Object.assign(new Error(code), { code })

test('a known marketplace is refreshed, then the plugin is installed and updated', async () => {
  const { calls, run } = recorder()

  const result = await installOn({ harness: harnessNamed('Claude Code'), run })

  assert.deepEqual(result, { name: 'Claude Code', status: 'installed' })
  assert.deepEqual(calls, [
    'claude plugin marketplace update pstack-claude',
    'claude plugin install pstack@pstack-claude',
    'claude plugin update pstack@pstack-claude'
  ])
})

test('an unknown marketplace is added when the refresh fails', async () => {
  const { calls, run } = recorder(command =>
    command.includes('marketplace update') ? new Error('not found') : null
  )

  const result = await installOn({ harness: harnessNamed('Copilot'), run })

  assert.equal(result.status, 'installed')
  assert.deepEqual(calls, [
    'copilot plugin marketplace update pstack-claude',
    'copilot plugin marketplace add michael-denyer/pstack-claude',
    'copilot plugin install pstack@pstack-claude',
    'copilot plugin update pstack@pstack-claude'
  ])
})

test('Codex uses its own verbs', async () => {
  const { calls, run } = recorder()

  await installOn({ harness: harnessNamed('Codex'), run })

  assert.deepEqual(calls, [
    'codex plugin marketplace upgrade pstack-claude',
    'codex plugin add pstack@pstack-claude'
  ])
})

test('a harness that is not installed is skipped after one attempt', async () => {
  const { calls, run } = recorder(() => withCode('ENOENT'))

  const result = await installOn({ harness: harnessNamed('Codex'), run })

  assert.deepEqual(result, { name: 'Codex', status: 'skipped, not on PATH' })
  assert.equal(calls.length, 1)
})

test('a marketplace that can be neither refreshed nor added is a failure', async () => {
  const { calls, run } = recorder(() => new Error('no network'))

  const result = await installOn({ harness: harnessNamed('Claude Code'), run })

  assert.equal(result.status, 'failed')
  assert.equal(result.error.message, 'no network')
  assert.deepEqual(calls, [
    'claude plugin marketplace update pstack-claude',
    'claude plugin marketplace add michael-denyer/pstack-claude'
  ])
})

test('a failing install stops before the update and is a failure', async () => {
  const { calls, run } = recorder(command =>
    command.includes('plugin install') ? new Error('boom') : null
  )

  const result = await installOn({ harness: harnessNamed('Claude Code'), run })

  assert.equal(result.status, 'failed')
  assert.equal(calls.at(-1), 'claude plugin install pstack@pstack-claude')
})

test('every harness installs the same plugin from the same marketplace', () => {
  assert.deepEqual(
    HARNESSES.map(harness => harness.name),
    ['Claude Code', 'Codex', 'Copilot']
  )
  for (const harness of HARNESSES) {
    assert.equal(harness.addMarketplace.at(-1), 'michael-denyer/pstack-claude')
    assert.equal(harness.refreshMarketplace.at(-1), 'pstack-claude')
    for (const args of harness.installPlugin) {
      assert.equal(args.at(-1), 'pstack@pstack-claude')
    }
  }
})
