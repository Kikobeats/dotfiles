import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { forgeOf, isPullRequestUrl, launchArgs, pullRequestRepo, remoteRepo, reviewPrompt } from './lib.mjs'

const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, encoding: 'utf8', timeout: 60_000, stdio: ['ignore', 'pipe', 'pipe'] }).trim()

const fail = message => {
  console.log(`review: ${message}`)
  process.exit(1)
}

const attempt = (fn, message) => {
  try {
    return fn()
  } catch (error) {
    fail(`${message}: ${(error.stderr || error.message).trim().split('\n')[0]}`)
  }
}

export const readOrca = (runCommand, args) => {
  try {
    return JSON.parse(runCommand('orca', args))
  } catch (error) {
    if (error.stdout) return JSON.parse(error.stdout)
    throw error
  }
}

export const pullRequest = ({ forge, target, tree, runCommand = run }) => {
  if (forge === 'github') {
    const pr = JSON.parse(runCommand('gh', ['pr', 'view', ...(target ? [target] : []), '--json', 'url,state'], tree))
    return { url: pr.url, open: pr.state === 'OPEN' }
  }
  const mr = JSON.parse(runCommand('glab', ['mr', 'view', ...(target ? [target] : []), '--output', 'json'], tree))
  return { url: mr.web_url, open: mr.state === 'opened' }
}

export const targetOf = argv => {
  const args = argv.slice(2).map(item => item.trim()).filter(Boolean)
  if (args.length > 1) return { ok: false, message: 'pass one pull request, a url or a number' }
  return { ok: true, target: args[0] ?? null }
}

export const startReview = ({ target = null, tree, origin, remotes = [], pull, worktree, launch }) => {
  const originRepo = remoteRepo(origin ?? '')
  const have = [origin, ...remotes].map(remote => remoteRepo(remote ?? '')).filter(Boolean)
  if (target && isPullRequestUrl(target) && !have.includes(pullRequestRepo(target))) {
    return { ok: false, message: `${target} belongs to ${pullRequestRepo(target)}, but this checkout is ${originRepo}` }
  }
  const repo = target && isPullRequestUrl(target) ? pullRequestRepo(target) : originRepo
  const forge = forgeOf(repo)
  if (!forge) return { ok: false, message: `origin ${originRepo} is neither GitHub nor GitLab` }
  const { url, open } = pull({ forge, target, tree })
  if (!open) return { ok: false, message: `${url} is not open` }
  const known = worktree(tree)
  if (!known.ok) return { ok: false, message: `${tree} is not open in Orca` }
  const reply = launch({ url, tree })
  if (!reply.ok) return { ok: false, message: `orca agent launch failed: ${reply.error?.message ?? 'unknown error'}` }
  return { ok: true, message: `Started ${reviewPrompt(url)} in Orca, in ${tree}.` }
}

const main = () => {
  const parsed = targetOf(process.argv)
  if (!parsed.ok) fail(parsed.message)
  const target = parsed.target
  const tree = attempt(() => run('git', ['rev-parse', '--show-toplevel']), 'not in a git checkout')
  const names = attempt(() => run('git', ['remote'], tree), 'no origin remote').split('\n').filter(Boolean)
  if (!names.includes('origin')) fail('no origin remote')
  const origin = attempt(() => run('git', ['remote', 'get-url', 'origin'], tree), 'no origin remote')
  const remotes = names
    .filter(name => name !== 'origin')
    .map(name => attempt(() => run('git', ['remote', 'get-url', name], tree), `cannot read remote ${name}`))
  const result = startReview({
    target,
    tree,
    origin,
    remotes,
    pull: spec => pullRequest(spec),
    worktree: dir => readOrca(run, ['worktree', 'show', '--worktree', `path:${dir}`, '--json']),
    launch: spec => readOrca(run, launchArgs(spec))
  })
  if (!result.ok) fail(result.message)
  console.log(result.message)
}

const direct = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
if (direct) main()
