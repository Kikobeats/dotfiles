import { execFileSync } from 'node:child_process'

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

const orca = args => {
  try {
    return JSON.parse(run('orca', args))
  } catch (error) {
    if (error.stdout) return JSON.parse(error.stdout)
    throw error
  }
}

const pullRequest = ({ forge, target, tree }) => {
  if (forge === 'github') {
    const pr = JSON.parse(run('gh', ['pr', 'view', ...(target ? [target] : []), '--json', 'url,state'], tree))
    return { url: pr.url, open: pr.state === 'OPEN' }
  }
  const mr = JSON.parse(run('glab', ['mr', 'view', ...(target ? [target] : []), '--output', 'json'], tree))
  return { url: mr.web_url, open: mr.state === 'opened' }
}

const main = () => {
  const target = process.argv[2]?.trim() || null
  const tree = attempt(() => run('git', ['rev-parse', '--show-toplevel']), 'not in a git checkout')
  const repo = remoteRepo(attempt(() => run('git', ['remote', 'get-url', 'origin'], tree), 'no origin remote'))
  const forge = forgeOf(repo)
  if (!forge) fail(`origin ${repo} is neither GitHub nor GitLab`)
  if (target && isPullRequestUrl(target) && pullRequestRepo(target) !== repo) {
    fail(`${target} belongs to ${pullRequestRepo(target)}, but this checkout is ${repo}`)
  }

  const { url, open } = attempt(() => pullRequest({ forge, target, tree }), target ? `cannot read ${target}` : 'no pull request for this branch')
  if (!open) fail(`${url} is not open`)

  const known = attempt(() => orca(['worktree', 'show', '--worktree', `path:${tree}`, '--json']), 'cannot reach Orca')
  if (!known.ok) fail(`${tree} is not open in Orca`)

  const reply = attempt(() => orca(launchArgs({ url, tree })), 'orca agent launch failed')
  if (!reply.ok) fail(`orca agent launch failed: ${reply.error?.message ?? 'unknown error'}`)
  console.log(`Started ${reviewPrompt(url)} in Orca, in ${tree}.`)
}

main()
