import assert from 'node:assert/strict'
import test from 'node:test'

import { forgeOf, isPullRequestUrl, launchArgs, pullRequestRepo, remoteRepo, reviewPrompt } from './lib.mjs'

const GITLAB = 'https://gitlab.com/microlink/api/-/merge_requests/2097'
const GITHUB = 'https://github.com/Kikobeats/dotfiles/pull/27'

test('a pull request url names its repo, any case, nested gitlab groups included', () => {
  assert.equal(pullRequestRepo(GITLAB), 'gitlab.com/microlink/api')
  assert.equal(pullRequestRepo(GITHUB), 'github.com/kikobeats/dotfiles')
  assert.equal(pullRequestRepo('https://gitlab.com/group/sub/project/-/merge_requests/1'), 'gitlab.com/group/sub/project')
  assert.equal(pullRequestRepo('https://github.com/Kikobeats/dotfiles'), null)
})

test('ssh, scp-style and https remotes name the same repo as the url', () => {
  assert.equal(remoteRepo('git@github.com:Kikobeats/dotfiles.git\n'), pullRequestRepo(GITHUB))
  assert.equal(remoteRepo('https://gitlab.com/microlink/api.git'), pullRequestRepo(GITLAB))
  assert.equal(remoteRepo('ssh://git@gitlab.com/microlink/api'), pullRequestRepo(GITLAB))
  assert.notEqual(remoteRepo('git@gitlab.com:microlink/api.git'), pullRequestRepo(GITHUB))
})

test('the forge decides whether gh or glab reads the pull request', () => {
  assert.equal(forgeOf('github.com/kikobeats/dotfiles'), 'github')
  assert.equal(forgeOf('gitlab.com/microlink/api'), 'gitlab')
  assert.equal(forgeOf('bitbucket.org/x/y'), null)
  assert.equal(forgeOf(null), null)
})

test('a number or branch is passed to gh or glab, a url is checked against the checkout', () => {
  assert.equal(isPullRequestUrl(GITLAB), true)
  assert.equal(isPullRequestUrl('2097'), false)
})

test('the review is the prompt typed by hand, in a focused Cursor terminal tab', () => {
  assert.equal(reviewPrompt(GITLAB), `/loop-review ${GITLAB}`)
  assert.deepEqual(launchArgs({ url: GITLAB, tree: '/t' }), [
    'agent', 'launch', '--agent', 'cursor', '--worktree', 'path:/t',
    '--prompt', `/loop-review ${GITLAB}`, '--surface', 'terminal', '--focus', '--json'
  ])
})
