import assert from 'node:assert/strict'
import test from 'node:test'

import { launchArgs } from './lib.mjs'
import { failureLine, pullRequest, readOrca, startReview, targetOf } from './review.mjs'

const GITHUB = 'https://github.com/Kikobeats/dotfiles/pull/27'
const GITLAB = 'https://gitlab.com/microlink/api/-/merge_requests/2097'
const origin = 'git@github.com:Kikobeats/dotfiles.git'

const review = (over = {}) =>
  startReview({
    tree: '/repo',
    origin,
    pull: () => ({ url: GITHUB, open: true }),
    worktree: () => ({ ok: true }),
    launch: () => ({ ok: true }),
    ...over
  })

test('one argument is the target, and a second is refused', () => {
  assert.deepEqual(targetOf(['node', 'review.mjs']), { ok: true, target: null })
  assert.deepEqual(targetOf(['node', 'review.mjs', ' 2097 ']), { ok: true, target: '2097' })
  assert.equal(targetOf(['node', 'review.mjs', '2097', 'extra']).ok, false)
})

test('the pull request of this checkout is opened in Orca', () => {
  const calls = []
  const result = review({
    pull: spec => {
      calls.push(spec)
      return { url: GITHUB, open: true }
    }
  })
  assert.equal(result.ok, true)
  assert.equal(result.message, `Started /loop-review ${GITHUB} in Orca, in /repo.`)
  assert.deepEqual(calls[0], { forge: 'github', target: null, tree: '/repo' })
})

test('a number is passed through, and a gitlab checkout uses glab', () => {
  const calls = []
  review({
    target: '2097',
    origin: 'git@gitlab.com:microlink/api.git',
    pull: spec => {
      calls.push(spec)
      return { url: GITLAB, open: true }
    }
  })
  assert.deepEqual(calls[0], { forge: 'gitlab', target: '2097', tree: '/repo' })
})

test('a url of another forge that this checkout has as a remote uses that forge', () => {
  const calls = []
  const result = review({
    target: GITLAB,
    origin: 'git@github.com:someone/fork.git',
    remotes: ['git@gitlab.com:microlink/api.git'],
    pull: spec => {
      calls.push(spec)
      return { url: GITLAB, open: true }
    }
  })
  assert.equal(result.ok, true)
  assert.equal(calls[0].forge, 'gitlab')
})

test('a files tab or a query on another repo is still that other repo', () => {
  const files = review({ target: `${GITLAB}/diffs` })
  assert.equal(files.ok, false)
  assert.match(files.message, /belongs to gitlab.com\/microlink\/api/)
  const query = review({ target: 'https://github.com/other/repo/pull/27?diff=1' })
  assert.equal(query.ok, false)
  assert.match(query.message, /belongs to github.com\/other\/repo/)
})

test('a url is accepted from any remote of the checkout', () => {
  const upstream = review({ target: GITHUB, origin: 'git@github.com:someone/fork.git', remotes: [origin] })
  assert.equal(upstream.ok, true)
  const elsewhere = review({ target: GITLAB })
  assert.equal(elsewhere.ok, false)
  assert.match(elsewhere.message, /belongs to gitlab.com\/microlink\/api/)
})

test('a closed pull request, a tree Orca does not know, and a failed launch stop', () => {
  assert.match(review({ pull: () => ({ url: GITHUB, open: false }) }).message, /is not open/)
  assert.match(review({ worktree: () => ({ ok: false }) }).message, /not open in Orca/)
  assert.match(review({ launch: () => ({ ok: false, error: { message: 'selector_not_found' } }) }).message, /selector_not_found/)
  assert.match(review({ launch: () => ({ ok: false }) }).message, /unknown error/)
})

test('an origin that is neither GitHub nor GitLab is refused', () => {
  assert.match(review({ origin: 'git@bitbucket.org:x/y.git' }).message, /neither GitHub nor GitLab/)
  assert.match(review({ origin: null, remotes: [] }).message, /neither GitHub nor GitLab/)
})

test('a command failure reports its first line of stderr', () => {
  assert.equal(failureLine({ stderr: 'no such ref\nmore' }), 'no such ref')
  assert.equal(failureLine({ message: 'down' }), 'down')
  assert.equal(failureLine('down'), 'down')
})

test('github and gitlab report their own open state', () => {
  const calls = []
  const runCommand = (cmd, args) => {
    calls.push([cmd, ...args])
    if (cmd === 'gh') return JSON.stringify({ url: GITHUB, state: 'OPEN' })
    return JSON.stringify({ web_url: GITLAB, state: 'opened' })
  }
  assert.equal(pullRequest({ forge: 'github', target: GITHUB, tree: '/repo', runCommand }).open, true)
  assert.deepEqual(calls[0], ['gh', 'pr', 'view', GITHUB, '--json', 'url,state'])
  assert.equal(pullRequest({ forge: 'gitlab', target: null, tree: '/repo', runCommand }).open, true)
  assert.deepEqual(calls[1], ['glab', 'mr', 'view', '--output', 'json'])
  assert.equal(pullRequest({ forge: 'github', target: null, tree: '/repo', runCommand: () => JSON.stringify({ url: GITHUB, state: 'CLOSED' }) }).open, false)
  assert.equal(pullRequest({ forge: 'gitlab', target: null, tree: '/repo', runCommand: () => JSON.stringify({ web_url: GITLAB, state: 'merged' }) }).open, false)
})

test('an orca failure that still printed json is that json', () => {
  const error = Object.assign(new Error('exit 1'), { stdout: JSON.stringify({ ok: false }) })
  assert.deepEqual(
    readOrca(() => {
      throw error
    }, ['worktree']),
    { ok: false }
  )
  assert.deepEqual(readOrca(() => JSON.stringify({ ok: true }), launchArgs({ url: GITHUB, tree: '/repo' })).ok, true)
  assert.throws(() => readOrca(() => {
    throw new Error('down')
  }, []))
})
