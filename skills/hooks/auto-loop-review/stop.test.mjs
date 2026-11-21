import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  checkoutOf,
  handle,
  matchingRemote,
  orcaHasWorktree,
  parseHookInput,
  reviewMessage,
  scheduleReview,
  worktreeShown
} from './stop.mjs'

const GITHUB = 'https://github.com/octo/repo/pull/3'
const GITLAB = 'https://gitlab.com/group/sub/repo/-/merge_requests/4'

const git = (dir, args) =>
  execFileSync('git', ['-C', dir, ...args], {
    encoding: 'utf8',
    env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' }
  })

const init = (dir, url, remote = 'origin') => {
  mkdirSync(dir, { recursive: true })
  git(dir, ['init', '-b', 'master'])
  git(dir, ['remote', 'add', remote, url])
}

const entry = value => JSON.stringify(value)

test('hook input that is not json is ignored', () => {
  assert.deepEqual(parseHookInput('not json'), {})
})

test('a missing remote list or a url that is not a pull request matches nothing', () => {
  const boom = () => {
    throw new Error('listed')
  }
  assert.equal(matchingRemote(null, GITHUB, boom), false)
  assert.equal(matchingRemote('origin', 'not a pull request', boom), false)
  assert.equal(
    matchingRemote('origin\nupstream', GITHUB, name => (name === 'upstream' ? 'github.com/octo/repo' : null)),
    true
  )
})

test('an orca worktree reply counts only when it succeeded', () => {
  assert.equal(worktreeShown({ ok: true }), true)
  assert.equal(worktreeShown({ ok: false }), false)
  assert.equal(worktreeShown({}), false)
  const calls = []
  assert.equal(
    orcaHasWorktree('/repo', (cmd, args) => {
      calls.push([cmd, ...args])
      return JSON.stringify({ ok: true })
    }),
    true
  )
  assert.deepEqual(calls[0], ['orca', 'worktree', 'show', '--worktree', 'path:/repo', '--json'])
  assert.equal(
    orcaHasWorktree('/repo', () => {
      throw new Error('down')
    }),
    false
  )
  assert.equal(orcaHasWorktree('/repo', () => 'not json'), false)
})

test('the message names the pull request and says nothing when nothing was scheduled', () => {
  assert.match(reviewMessage({ scheduled: [GITHUB], notScheduled: [] }), /starting in Orca for https:\/\/github.com\/octo\/repo\/pull\/3/)
  assert.equal(reviewMessage({ scheduled: [], notScheduled: [] }), '')
})

test('a review is scheduled once, and a spawn failure can be retried', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'loop-review-schedule-'))
  const url = 'https://github.com/octo/repo/pull/8'
  const file = path.join(dir, 'github.com_octo_repo_pull_8.json')
  const opts = { url, tree: '/repo', calledAtMs: 1, stateDir: dir, now: () => 5 }
  let spawned = 0
  const spawnProcess = (bin, args, options) => {
    spawned++
    assert.equal(options.detached, true)
    assert.equal(options.stdio[0], 'ignore')
    assert.equal(args[0].endsWith('launch.mjs'), true)
    assert.equal(args[1], file)
    return {
      unref() {
        spawnProcess.unrefed = true
      }
    }
  }
  assert.equal(scheduleReview({ ...opts, spawnProcess }), true)
  assert.equal(scheduleReview({ ...opts, spawnProcess }), false)
  assert.equal(spawned, 1)
  assert.equal(spawnProcess.unrefed, true)
  assert.equal(JSON.parse(readFileSync(file, 'utf8')).calledAtMs, 1)
  rmSync(file)
  assert.throws(() =>
    scheduleReview({
      ...opts,
      spawnProcess: () => {
        throw new Error('spawn')
      }
    })
  )
  assert.equal(existsSync(file), false)
  assert.equal(scheduleReview({ ...opts, spawnProcess }), true)
  rmSync(dir, { recursive: true, force: true })
})

test('the review opens the checkout whose remote is the pull request, not the session', t => {
  const root = mkdtempSync(path.join(tmpdir(), 'loop-review-checkout-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const session = path.join(root, 'session')
  const project = path.join(root, 'project')
  const elsewhere = path.join(root, 'elsewhere')
  init(session, 'git@github.com:octo/session.git')
  init(project, 'git@github.com:octo/repo.git', 'upstream')
  init(elsewhere, 'git@github.com:someone/else.git')
  git(elsewhere, ['remote', 'add', 'upstream', 'git@gitlab.com:group/sub/repo.git'])
  const top = dir => git(dir, ['rev-parse', '--show-toplevel']).trim()
  assert.equal(checkoutOf(GITHUB, [project]), top(project))
  assert.equal(checkoutOf('https://github.com/octo/missing/pull/1', [project]), null)
  assert.equal(checkoutOf(GITLAB, [session, elsewhere]), top(elsewhere))

  const transcript = path.join(root, 'turn.jsonl')
  const calledAt = '2026-11-21T21:18:00.000Z'
  writeFileSync(
    transcript,
    [
      entry({
        type: 'assistant',
        timestamp: calledAt,
        message: { content: [{ type: 'tool_use', id: 'a', input: { command: `cd ${project} && gh pr create` } }] }
      }),
      entry({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'a', content: GITHUB }] } })
    ].join('\n')
  )
  const scheduled = []
  const schedule = info => {
    scheduled.push(info)
    return true
  }
  const readTranscript = file => readFileSync(file, 'utf8')
  const opened = handle({ transcriptPath: transcript, cwd: session, readTranscript, worktreeOpen: () => true, schedule })
  assert.equal(scheduled[0].tree, top(project))
  assert.deepEqual(opened.scheduled, [GITHUB])

  git(project, ['config', 'claude.autoLoopReview', 'false'])
  const optedOut = handle({ transcriptPath: transcript, cwd: session, readTranscript, worktreeOpen: () => true, schedule })
  assert.deepEqual(optedOut, { scheduled: [], notScheduled: [] })
  git(project, ['config', '--unset', 'claude.autoLoopReview'])

  const hidden = handle({ transcriptPath: transcript, cwd: session, readTranscript, worktreeOpen: () => false, schedule })
  assert.match(hidden.notScheduled[0], /not open in Orca/)

  const off = handle({
    transcriptPath: transcript,
    cwd: session,
    env: { CLAUDE_AUTO_LOOP_REVIEW: 'off' },
    readTranscript,
    worktreeOpen: () => true,
    schedule
  })
  assert.deepEqual(off, { scheduled: [], notScheduled: [] })
  assert.equal(scheduled.length, 1)
})
