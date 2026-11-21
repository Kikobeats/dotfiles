import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { HOOKS, HOOKS_DIR, mergeHooks } from './hooks.mjs'

const orcaStop = { hooks: [{ type: 'command', command: 'sh ~/.orca/agent-hooks/claude-hook.sh' }] }
const commands = entries => entries.flatMap(entry => entry.hooks.map(hook => hook.command))

test('another tool hook on the same event is kept, and ours goes after it', () => {
  const merged = mergeHooks({ Stop: [orcaStop] })
  assert.deepEqual(merged.Stop, [orcaStop, ...HOOKS.Stop])
})

test('installing twice leaves one copy of each hook', () => {
  const twice = mergeHooks(mergeHooks({ Stop: [orcaStop] }))
  assert.deepEqual(twice, mergeHooks({ Stop: [orcaStop] }))
})

test('events we do not hook are left alone', () => {
  const sessionStart = [{ hooks: [{ type: 'command', command: 'rex session-start' }] }]
  assert.deepEqual(mergeHooks({ SessionStart: sessionStart }).SessionStart, sessionStart)
})

test('every hook command points at a file in this repo', () => {
  for (const command of Object.values(HOOKS).flatMap(commands)) {
    const file = command.replace(/^node /, '')
    assert.ok(file.startsWith(HOOKS_DIR), command)
    assert.ok(existsSync(file), command)
  }
})

test('auto-loop-review runs on Stop', () => {
  assert.deepEqual(commands(HOOKS.Stop), [`node ${join(HOOKS_DIR, 'auto-loop-review', 'stop.mjs')}`])
})
