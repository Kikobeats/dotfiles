import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { HOOKS, HOOKS_DIR, mergeHooks } from './hooks.mjs'

const orcaStop = { hooks: [{ type: 'command', command: 'sh ~/.orca/agent-hooks/claude-hook.sh' }] }
const commands = entries => entries.flatMap(entry => entry.hooks.map(hook => hook.command))
const scriptOf = command => command.replace(/^node\s+/, '').replace(/^"(.*)"$/, '$1')

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

test('every hook command points at a file in this repo, quoted so a space in the path survives the shell', () => {
  for (const command of Object.values(HOOKS).flatMap(commands)) {
    const file = scriptOf(command)
    assert.match(command, /^node "/)
    assert.ok(file.startsWith(HOOKS_DIR), command)
    assert.ok(existsSync(file), command)
  }
})

test('a foreign command that shares an entry with ours is kept', () => {
  const mixed = {
    matcher: 'Stop',
    hooks: [orcaStop.hooks[0], HOOKS.Stop[0].hooks[0]]
  }
  const merged = mergeHooks({ Stop: [mixed] })
  assert.deepEqual(merged.Stop[0], { matcher: 'Stop', hooks: [orcaStop.hooks[0]] })
  assert.deepEqual(merged.Stop[1], HOOKS.Stop[0])
})

test('auto-loop-review runs on Stop', () => {
  assert.equal(scriptOf(commands(HOOKS.Stop)[0]), join(HOOKS_DIR, 'auto-loop-review', 'stop.mjs'))
})
