import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { HOOKS, HOOKS_DIR, mergeHooks } from './hooks.mjs'

const orcaStop = { hooks: [{ type: 'command', command: 'sh ~/.orca/agent-hooks/claude-hook.sh' }] }
const ourOldStop = { hooks: [{ type: 'command', command: `node ${join(HOOKS_DIR, 'auto-loop-review', 'stop.mjs')}`, timeout: 15 }] }
const commands = entries => entries.flatMap(entry => entry.hooks.map(hook => hook.command))
const scriptOf = command => command.replace(/^node\s+/, '').replace(/^"(.*)"$/, '$1')

test('another tool hook on an event we hook is kept, and ours goes after it', () => {
  const merged = mergeHooks({ PostToolUse: [orcaStop] })
  assert.deepEqual(merged.PostToolUse, [orcaStop, ...HOOKS.PostToolUse])
})

test('a hook we no longer ship is removed, and other tools keep theirs on that event', () => {
  assert.deepEqual(mergeHooks({ Stop: [orcaStop, ourOldStop] }).Stop, [orcaStop])
  assert.equal('Stop' in mergeHooks({ Stop: [ourOldStop] }), false)
})

test('a foreign command that shares an entry with ours is kept', () => {
  const mixed = { matcher: 'Stop', hooks: [orcaStop.hooks[0], ourOldStop.hooks[0]] }
  assert.deepEqual(mergeHooks({ Stop: [mixed] }).Stop, [{ matcher: 'Stop', hooks: [orcaStop.hooks[0]] }])
})

test('installing twice leaves one copy of each hook', () => {
  const once = mergeHooks({ Stop: [orcaStop], PostToolUse: [orcaStop] })
  assert.deepEqual(mergeHooks(once), once)
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
