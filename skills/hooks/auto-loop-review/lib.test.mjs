import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { createdPullRequests, isQuiet, lastTurn, parseTranscript, reviewPrompt, startedByHand, stateKey } from './lib.mjs'

const GITLAB = 'https://gitlab.com/microlink/api/-/merge_requests/2096'
const GITHUB = 'https://github.com/microlinkhq/browserless/pull/1044'

const prompt = text => ({ type: 'user', message: { content: text } })
const notification = text => ({ type: 'user', message: { content: [{ type: 'text', text }] } })
const call = (id, command) => ({ type: 'assistant', message: { content: [{ type: 'tool_use', id, name: 'Bash', input: { command } }] } })
const result = (id, content, extra = {}) => ({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, content, ...extra }] } })

test('a gitlab merge request opened in the turn is found', () => {
  const turn = [call('a', 'glab mr create --target-branch master --yes'), result('a', `Creating merge request\n\n${GITLAB}\n`)]
  assert.deepEqual(createdPullRequests(turn), [GITLAB])
})

test('a github pull request opened in the turn is found, with array content', () => {
  const turn = [call('a', 'gh pr create --fill'), result('a', [{ type: 'text', text: `${GITHUB}\n` }])]
  assert.deepEqual(createdPullRequests(turn), [GITHUB])
})

test('a url printed by any other command is not a new pull request', () => {
  const turn = [
    call('a', 'glab mr view 2096'),
    result('a', GITLAB),
    call('b', 'glab mr update 2000 --ready'),
    result('b', 'https://gitlab.com/microlink/api/-/merge_requests/2000')
  ]
  assert.deepEqual(createdPullRequests(turn), [])
})

test('a create call that failed opens nothing', () => {
  const turn = [call('a', 'glab mr create --yes'), result('a', `already exists: ${GITLAB}`, { is_error: true })]
  assert.deepEqual(createdPullRequests(turn), [])
})

test('the same pull request printed twice is one review', () => {
  const turn = [call('a', 'glab mr create --yes 2>&1 | tail -3'), result('a', `${GITLAB}\nsee ${GITLAB}`)]
  assert.deepEqual(createdPullRequests(turn), [GITLAB])
})

test('only the turn after the last prompt counts, and a task notification starts a turn', () => {
  const entries = [
    prompt('open the MR'),
    call('a', 'glab mr create --yes'),
    result('a', GITLAB),
    notification('<task-notification>ci finished</task-notification>'),
    call('b', 'glab ci status')
  ]
  assert.deepEqual(createdPullRequests(lastTurn(entries)), [])
  assert.deepEqual(createdPullRequests(lastTurn(entries.slice(0, 3))), [GITLAB])
})

test('a tool result is not a prompt, so it does not end the turn', () => {
  const entries = [prompt('go'), call('a', 'gh pr create --fill'), result('a', GITHUB)]
  assert.equal(lastTurn(entries).length, 2)
})

test('a broken transcript line is skipped', () => {
  assert.equal(parseTranscript('{"type":"user"}\nnot json\n\n{"type":"assistant"}').length, 2)
})

test('the session is quiet only after the whole quiet window', () => {
  assert.equal(isQuiet({ lastWriteMs: 0, nowMs: 599_999, quietMs: 600_000 }), false)
  assert.equal(isQuiet({ lastWriteMs: 0, nowMs: 600_000, quietMs: 600_000 }), true)
})

test('a review started by hand after scheduling skips the launch, an older one does not', () => {
  const chats = [{ createdAtMs: 100, prompts: [`/loop-review ${GITLAB}`] }]
  assert.equal(startedByHand({ chats, url: GITLAB, sinceMs: 50 }), true)
  assert.equal(startedByHand({ chats, url: GITLAB, sinceMs: 150 }), false)
  assert.equal(startedByHand({ chats, url: GITHUB, sinceMs: 50 }), false)
})

test('two pull requests get two state files', () => {
  assert.notEqual(stateKey(GITLAB), stateKey(GITHUB))
  assert.match(stateKey(GITLAB), /^[\w.-]+$/)
})

test('the prompt is the one typed by hand', () => {
  assert.equal(reviewPrompt(GITLAB), `/loop-review ${GITLAB}`)
})

const REAL = path.join(
  homedir(),
  '.claude/projects/-Users-kikobeats-orca-workspaces-api-check-eunreachable-against-408-after-3-89-0-firs/0a29f9e5-8156-48ef-9317-db2774e89678.jsonl'
)

test('the real session that opened is-antibot#92 and then !2096 is read, one turn at a time', { skip: !existsSync(REAL) }, () => {
  const entries = parseTranscript(readFileSync(REAL, 'utf8'))
  assert.deepEqual(createdPullRequests(entries), ['https://github.com/microlinkhq/is-antibot/pull/92', GITLAB])
  const createAt = entries.findIndex(entry =>
    entry.message?.content?.some?.(block => block.type === 'tool_result' && JSON.stringify(block.content).includes(GITLAB))
  )
  const turnEnd = entries.findIndex((entry, index) => index > createAt && entry.type === 'user' && typeof entry.message?.content === 'string')
  assert.deepEqual(createdPullRequests(lastTurn(entries.slice(0, turnEnd))), [GITLAB])
})
