import { spawn, execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'

import { createdPullRequests, lastTurn, parseTranscript, pullRequestRepo, remoteRepo, stateKey } from './lib.mjs'

export const STATE_DIR = path.join(homedir(), '.cache', 'auto-loop-review')
const WAITER = path.join(import.meta.dirname, 'wait.mjs')

const readStdin = () => {
  try {
    return JSON.parse(readFileSync(0, 'utf8'))
  } catch {
    return {}
  }
}

const git = (dir, args) => {
  try {
    return execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return null
  }
}

const checkoutOf = (url, dirs) =>
  dirs
    .map(dir => git(dir, ['rev-parse', '--show-toplevel']))
    .find(tree => tree && remoteRepo(git(tree, ['remote', 'get-url', 'origin']) ?? '') === pullRequestRepo(url)) ?? null

const openInOrca = tree => {
  try {
    const reply = execFileSync('orca', ['worktree', 'show', '--worktree', `path:${tree}`, '--json'], {
      encoding: 'utf8',
      timeout: 5_000,
      stdio: ['ignore', 'pipe', 'ignore']
    })
    return JSON.parse(reply).ok === true
  } catch {
    return false
  }
}

const optedOut = tree => git(tree, ['config', 'claude.autoLoopReview']) === 'false'

const schedule = ({ url, tree, transcriptPath, calledAtMs }) => {
  const stateFile = path.join(STATE_DIR, `${stateKey(url)}.json`)
  if (existsSync(stateFile)) return false
  writeFileSync(stateFile, JSON.stringify({ url, tree, transcriptPath, calledAtMs, scheduledAtMs: Date.now() }, null, 2))
  const log = openSync(path.join(STATE_DIR, 'waiter.log'), 'a')
  spawn(process.execPath, [WAITER, stateFile], { detached: true, stdio: ['ignore', log, log] }).unref()
  return true
}

const main = () => {
  const { transcript_path: transcriptPath, cwd } = readStdin()
  if (!transcriptPath || !cwd || !existsSync(transcriptPath)) return
  if (process.env.CLAUDE_AUTO_LOOP_REVIEW === 'off') return
  const created = createdPullRequests(lastTurn(parseTranscript(readFileSync(transcriptPath, 'utf8'))), cwd)
  if (created.length === 0) return
  mkdirSync(STATE_DIR, { recursive: true })
  const scheduled = []
  const notScheduled = []
  for (const { url, dir, calledAtMs } of created) {
    const tree = checkoutOf(url, [dir, cwd])
    if (!tree) notScheduled.push(`${url}: no checkout of its repo where it was created`)
    else if (optedOut(tree)) continue
    else if (!openInOrca(tree)) notScheduled.push(`${url}: ${tree} is not open in Orca`)
    else if (schedule({ url, tree, transcriptPath, calledAtMs })) scheduled.push(url)
  }
  const lines = [
    scheduled.length && `loop-review will start in Orca for ${scheduled.join(', ')} once this session has been quiet for 10 minutes. Cancel with: rm ${STATE_DIR}/<file>.json`,
    ...notScheduled.map(reason => `loop-review not scheduled for ${reason}.`)
  ].filter(Boolean)
  if (lines.length) process.stdout.write(JSON.stringify({ systemMessage: lines.join('\n') }))
}

try {
  main()
} catch (error) {
  process.stderr.write(`auto-loop-review: ${error.message}\n`)
}
