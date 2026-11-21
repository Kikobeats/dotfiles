import { spawn, execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import {
  createdPullRequests,
  lastTurn,
  parseTranscript,
  pullRequestRepo,
  remoteRepo,
  reviewDisabled,
  stateKey
} from './lib.mjs'

export const STATE_DIR = path.join(homedir(), '.cache', 'auto-loop-review')
const LAUNCHER = path.join(import.meta.dirname, 'launch.mjs')

export const parseHookInput = text => {
  try {
    return JSON.parse(text)
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

export const matchingRemote = (names, url, remoteOf) => {
  const want = pullRequestRepo(url)
  if (!want || names == null) return false
  return names.split('\n').some(name => remoteOf(name) === want)
}

const remotesMatch = (tree, url) =>
  matchingRemote(git(tree, ['remote']), url, name => remoteRepo(git(tree, ['remote', 'get-url', name]) ?? ''))

export const checkoutOf = (url, dirs) => {
  for (const dir of dirs) {
    const tree = git(dir, ['rev-parse', '--show-toplevel'])
    if (tree && remotesMatch(tree, url)) return tree
  }
  return null
}

export const worktreeShown = reply => reply?.ok === true

export const orcaHasWorktree = (tree, runCommand) => {
  try {
    return worktreeShown(JSON.parse(runCommand('orca', ['worktree', 'show', '--worktree', `path:${tree}`, '--json'])))
  } catch {
    return false
  }
}

const openInOrca = tree =>
  orcaHasWorktree(tree, (cmd, args) =>
    execFileSync(cmd, args, { encoding: 'utf8', timeout: 5_000, stdio: ['ignore', 'pipe', 'ignore'] })
  )

export const scheduleReview = ({
  url,
  tree,
  calledAtMs,
  stateDir = STATE_DIR,
  launcher = LAUNCHER,
  spawnProcess = spawn,
  now = Date.now
}) => {
  mkdirSync(stateDir, { recursive: true })
  const stateFile = path.join(stateDir, `${stateKey(url)}.json`)
  const logFd = openSync(path.join(stateDir, 'launcher.log'), 'a')
  try {
    writeFileSync(stateFile, JSON.stringify({ url, tree, calledAtMs, scheduledAtMs: now() }, null, 2), { flag: 'wx' })
  } catch (error) {
    if (error.code === 'EEXIST') return false
    throw error
  }
  try {
    spawnProcess(process.execPath, [launcher, stateFile], { detached: true, stdio: ['ignore', logFd, logFd] }).unref()
  } catch (error) {
    unlinkSync(stateFile)
    throw error
  }
  return true
}

export const reviewMessage = ({ scheduled, notScheduled }) => {
  const lines = [
    scheduled.length && `loop-review starting in Orca for ${scheduled.join(', ')}.`,
    ...notScheduled
  ].filter(Boolean)
  return lines.join('\n')
}

export const handle = ({
  transcriptPath,
  cwd,
  env = {},
  readTranscript,
  schedule = scheduleReview,
  worktreeOpen = openInOrca,
  configOf = tree => git(tree, ['config', 'claude.autoLoopReview'])
}) => {
  const scheduled = []
  const notScheduled = []
  if (reviewDisabled({ env: env.CLAUDE_AUTO_LOOP_REVIEW, config: null })) return { scheduled, notScheduled }
  if (!transcriptPath || !cwd) return { scheduled, notScheduled }
  const text = readTranscript(transcriptPath)
  if (text == null) return { scheduled, notScheduled }
  const created = createdPullRequests(lastTurn(parseTranscript(text)), cwd)
  for (const { url, dir, calledAtMs } of created) {
    const tree = checkoutOf(url, [dir, cwd])
    if (!tree) notScheduled.push(`loop-review not scheduled for ${url}: no checkout of its repo where it was created.`)
    else if (reviewDisabled({ env: null, config: configOf(tree) })) continue
    else if (!worktreeOpen(tree)) notScheduled.push(`loop-review not scheduled for ${url}: ${tree} is not open in Orca.`)
    else if (schedule({ url, tree, calledAtMs })) scheduled.push(url)
  }
  return { scheduled, notScheduled }
}

const direct = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href

if (direct) {
  try {
    const input = parseHookInput(readFileSync(0, 'utf8'))
    const message = reviewMessage(
      handle({
        transcriptPath: input.transcript_path,
        cwd: input.cwd,
        env: process.env,
        readTranscript: file => (existsSync(file) ? readFileSync(file, 'utf8') : null)
      })
    )
    if (message) process.stdout.write(JSON.stringify({ systemMessage: message }))
  } catch (error) {
    process.stderr.write(`auto-loop-review: ${error.message}\n`)
  }
}
