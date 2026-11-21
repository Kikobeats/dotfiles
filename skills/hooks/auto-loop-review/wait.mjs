import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'

import { isQuiet, reviewPrompt, startedByHand } from './lib.mjs'

const QUIET_MS = 10 * 60 * 1000
const POLL_MS = 30 * 1000
const MAX_WAIT_MS = 4 * 60 * 60 * 1000
const CURSOR_CHATS = path.join(homedir(), '.cursor', 'chats')

const stateFile = process.argv[2]
const log = message => console.log(`${new Date().toISOString()} ${path.basename(stateFile)} ${message}`)

const readState = () => (existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, 'utf8')) : null)
const writeState = patch => writeFileSync(stateFile, JSON.stringify({ ...readState(), ...patch }, null, 2))

const run = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', timeout: 60_000 })

const isOpen = url => {
  const gitlab = url.match(/^https:\/\/gitlab\.com\/(.+)\/-\/merge_requests\/(\d+)$/)
  if (gitlab) {
    const project = encodeURIComponent(gitlab[1])
    return JSON.parse(run('glab', ['api', `projects/${project}/merge_requests/${gitlab[2]}`])).state === 'opened'
  }
  return JSON.parse(run('gh', ['pr', 'view', url, '--json', 'state'])).state === 'OPEN'
}

const readJson = file => {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

const cursorChats = () =>
  (existsSync(CURSOR_CHATS) ? readdirSync(CURSOR_CHATS) : []).flatMap(workspace =>
    readdirSync(path.join(CURSOR_CHATS, workspace)).flatMap(chat => {
      const dir = path.join(CURSOR_CHATS, workspace, chat)
      const meta = readJson(path.join(dir, 'meta.json'))
      const prompts = readJson(path.join(dir, 'prompt_history.json'))
      return meta && Array.isArray(prompts) ? [{ createdAtMs: meta.createdAtMs, prompts: prompts.map(String) }] : []
    })
  )

const launch = ({ url, tree }) => {
  const reply = JSON.parse(
    run('orca', [
      'agent', 'launch',
      '--agent', 'cursor',
      '--worktree', `path:${tree}`,
      '--prompt', reviewPrompt(url),
      '--surface', 'terminal',
      '--focus',
      '--json'
    ])
  )
  if (!reply.ok) throw new Error(reply.error?.message ?? 'orca agent launch failed')
  return reply
}

const notify = message => {
  try {
    run('osascript', ['-e', `display notification ${JSON.stringify(message)} with title "loop-review"`])
  } catch {}
}

const main = async () => {
  const { scheduledAtMs } = readState()
  while (Date.now() - scheduledAtMs < MAX_WAIT_MS) {
    await sleep(POLL_MS)
    const state = readState()
    if (!state) return log('cancelled')
    if (!isQuiet({ lastWriteMs: statSync(state.transcriptPath).mtimeMs, nowMs: Date.now(), quietMs: QUIET_MS })) continue
    if (!isOpen(state.url)) return writeState({ skipped: 'not open' }), log('skipped: not open')
    if (startedByHand({ chats: cursorChats(), url: state.url, sinceMs: scheduledAtMs })) {
      return writeState({ skipped: 'started by hand' }), log('skipped: started by hand')
    }
    launch(state)
    writeState({ launchedAtMs: Date.now() })
    log(`launched ${reviewPrompt(state.url)} in ${state.tree}`)
    return notify(`Started review of ${state.url}`)
  }
  writeState({ skipped: 'session never went quiet' })
  log('gave up: session never went quiet')
}

main().catch(error => {
  writeState({ error: error.message })
  log(`failed: ${error.message}`)
  notify(`Could not start the review: ${error.message}`)
})
