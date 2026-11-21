import { spawn, execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'

import { createdPullRequests, lastTurn, parseTranscript, stateKey } from './lib.mjs'

export const STATE_DIR = path.join(homedir(), '.cache', 'auto-loop-review')
const WAITER = path.join(import.meta.dirname, 'wait.mjs')

const readStdin = () => {
  try {
    return JSON.parse(readFileSync(0, 'utf8'))
  } catch {
    return {}
  }
}

const gitTopLevel = cwd => {
  try {
    return execFileSync('git', ['-C', cwd, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim()
  } catch {
    return null
  }
}

const optedOut = tree => {
  if (process.env.CLAUDE_AUTO_LOOP_REVIEW === 'off') return true
  try {
    return execFileSync('git', ['-C', tree, 'config', 'claude.autoLoopReview'], { encoding: 'utf8' }).trim() === 'false'
  } catch {
    return false
  }
}

const schedule = ({ url, tree, transcriptPath }) => {
  const stateFile = path.join(STATE_DIR, `${stateKey(url)}.json`)
  if (existsSync(stateFile)) return false
  writeFileSync(stateFile, JSON.stringify({ url, tree, transcriptPath, scheduledAtMs: Date.now() }, null, 2))
  const log = openSync(path.join(STATE_DIR, 'waiter.log'), 'a')
  spawn(process.execPath, [WAITER, stateFile], { detached: true, stdio: ['ignore', log, log] }).unref()
  return true
}

const main = () => {
  const { transcript_path: transcriptPath, cwd } = readStdin()
  if (!transcriptPath || !cwd || !existsSync(transcriptPath)) return
  const tree = gitTopLevel(cwd)
  if (!tree || optedOut(tree)) return
  const urls = createdPullRequests(lastTurn(parseTranscript(readFileSync(transcriptPath, 'utf8'))))
  if (urls.length === 0) return
  mkdirSync(STATE_DIR, { recursive: true })
  const scheduled = urls.filter(url => schedule({ url, tree, transcriptPath }))
  if (scheduled.length === 0) return
  process.stdout.write(
    JSON.stringify({
      systemMessage: `loop-review will start in Orca for ${scheduled.join(', ')} once this session has been quiet for 10 minutes. Cancel with: rm ${STATE_DIR}/<file>.json`
    })
  )
}

try {
  main()
} catch (error) {
  process.stderr.write(`auto-loop-review: ${error.message}\n`)
}
