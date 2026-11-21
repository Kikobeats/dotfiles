const PULL_REQUEST_URL = /^https:\/\/([^/]+)\/(.+?)\/(?:-\/merge_requests|pull)\/(\d+)\/?$/

export const pullRequestRepo = url => {
  const match = url.match(PULL_REQUEST_URL)
  return match ? `${match[1]}/${match[2]}`.toLowerCase() : null
}

export const remoteRepo = remote => {
  const match = remote.trim().match(/^(?:[\w+]+:\/\/)?(?:[^@/]+@)?([^/:]+)[:/](.+?)(?:\.git)?\/?$/)
  return match ? `${match[1]}/${match[2]}`.toLowerCase() : null
}

export const forgeOf = repo => (repo?.startsWith('gitlab.com/') ? 'gitlab' : repo?.startsWith('github.com/') ? 'github' : null)

export const isPullRequestUrl = value => PULL_REQUEST_URL.test(value)

export const reviewPrompt = url => `/loop-review ${url}`

export const launchArgs = ({ url, tree }) => [
  'agent', 'launch',
  '--agent', 'cursor',
  '--worktree', `path:${tree}`,
  '--prompt', reviewPrompt(url),
  '--surface', 'terminal',
  '--focus',
  '--json'
]
