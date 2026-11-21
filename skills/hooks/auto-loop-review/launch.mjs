import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { pathToFileURL } from 'node:url'

import { createdByCall, reviewPrompt } from './lib.mjs'

export const ATTEMPTS = 3
export const RETRY_MS = 1000

const stateFile = process.argv[2]
const log = message => console.log(`${new Date().toISOString()} ${path.basename(stateFile ?? '')} ${message}`)

const run = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', timeout: 60_000 })

export const pullRequest = (url, runCommand) => {
  const gitlab = url.match(/^https:\/\/gitlab\.com\/(.+)\/-\/merge_requests\/(\d+)$/)
  if (gitlab) {
    const project = encodeURIComponent(gitlab[1])
    const mr = JSON.parse(runCommand('glab', ['api', `projects/${project}/merge_requests/${gitlab[2]}`]))
    return { open: mr.state === 'opened', createdAtMs: Date.parse(mr.created_at) }
  }
  const pr = JSON.parse(runCommand('gh', ['pr', 'view', url, '--json', 'state,createdAt']))
  return { open: pr.state === 'OPEN', createdAtMs: Date.parse(pr.createdAt) }
}

export const launchedReply = reply => {
  if (!reply.ok) throw new Error(reply.error?.message ?? 'orca agent launch failed')
  return reply
}

export const skipReason = ({ open, createdAtMs, calledAtMs }) => {
  if (calledAtMs && !createdByCall({ createdAtMs, calledAtMs })) return 'created before the session printed it'
  if (!open) return 'not open'
  return null
}

export const safeNotify = (runCommand, message) => {
  try {
    runCommand('osascript', ['-e', `display notification ${JSON.stringify(message)} with title "loop-review"`])
  } catch {}
}

const launchReview = ({ url, tree }) =>
  launchedReply(
    JSON.parse(
      run('orca', [
        'agent',
        'launch',
        '--agent',
        'cursor',
        '--worktree',
        `path:${tree}`,
        '--prompt',
        reviewPrompt(url),
        '--surface',
        'terminal',
        '--focus',
        '--json'
      ])
    )
  )

export const runLaunch = async ({ readState, writeState, load, launch, notify, log: writeLog, sleep: pause, attempts = ATTEMPTS }) => {
  if (!readState()) return writeLog('cancelled')
  let lastError = null
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) await pause()
    const state = readState()
    if (!state) return writeLog('cancelled')
    try {
      const reason = skipReason({ ...load(state.url), calledAtMs: state.calledAtMs })
      if (reason) {
        writeState({ skipped: reason })
        return writeLog(`skipped: ${reason}`)
      }
      launch(state)
      writeState({ launchedAtMs: Date.now() })
      writeLog(`launched ${reviewPrompt(state.url)} in ${state.tree}`)
      return notify(`Started review of ${state.url}`)
    } catch (error) {
      lastError = error
    }
  }
  if (!readState()) return writeLog('cancelled')
  writeState({ error: lastError.message })
  writeLog(`failed: ${lastError.message}`)
  notify(`Could not start the review: ${lastError.message}`)
}

const direct = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href

if (direct) {
  const readState = () => {
    if (!existsSync(stateFile)) return null
    return JSON.parse(readFileSync(stateFile, 'utf8'))
  }
  const writeState = patch => {
    const current = readState()
    if (!current) return
    writeFileSync(stateFile, JSON.stringify({ ...current, ...patch }, null, 2))
  }
  runLaunch({
    readState,
    writeState,
    load: url => pullRequest(url, run),
    launch: launchReview,
    notify: message => safeNotify(run, message),
    log,
    sleep: () => sleep(RETRY_MS)
  }).catch(error => {
    log(`failed: ${error.message}`)
  })
}
