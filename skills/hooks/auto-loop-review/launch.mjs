import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { createdByCall, reviewPrompt } from './lib.mjs'

const stateFile = process.argv[2]
const log = message => console.log(`${new Date().toISOString()} ${path.basename(stateFile)} ${message}`)

const readState = () => (existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, 'utf8')) : null)
const writeState = patch => writeFileSync(stateFile, JSON.stringify({ ...readState(), ...patch }, null, 2))

const run = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', timeout: 60_000 })

const pullRequest = url => {
  const gitlab = url.match(/^https:\/\/gitlab\.com\/(.+)\/-\/merge_requests\/(\d+)$/)
  if (gitlab) {
    const project = encodeURIComponent(gitlab[1])
    const mr = JSON.parse(run('glab', ['api', `projects/${project}/merge_requests/${gitlab[2]}`]))
    return { open: mr.state === 'opened', createdAtMs: Date.parse(mr.created_at) }
  }
  const pr = JSON.parse(run('gh', ['pr', 'view', url, '--json', 'state,createdAt']))
  return { open: pr.state === 'OPEN', createdAtMs: Date.parse(pr.createdAt) }
}

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

const skip = reason => (writeState({ skipped: reason }), log(`skipped: ${reason}`))

const main = async () => {
  const { url, tree, calledAtMs } = readState()
  const { open, createdAtMs } = pullRequest(url)
  if (calledAtMs && !createdByCall({ createdAtMs, calledAtMs })) return skip('created before the session printed it')
  if (!open) return skip('not open')
  launch({ url, tree })
  writeState({ launchedAtMs: Date.now() })
  log(`launched ${reviewPrompt(url)} in ${tree}`)
  notify(`Started review of ${url}`)
}

main().catch(error => {
  writeState({ error: error.message })
  log(`failed: ${error.message}`)
  notify(`Could not start the review: ${error.message}`)
})
