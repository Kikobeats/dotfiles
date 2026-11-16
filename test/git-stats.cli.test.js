'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const statsBin = path.join(__dirname, '..', 'bin', 'git-stats')
const EMPTY_PATH = '/usr/bin:/bin'

const GH = `
const fs = require('node:fs')
const args = process.argv.slice(2)
fs.appendFileSync(process.env.CALLS, JSON.stringify(args) + '\\n')
const mode = process.env.GH_MODE || 'ok'
if (mode === 'fail') {
  process.stderr.write(process.env.GH_STDERR || 'token expired\\nand more\\n')
  process.exit(1)
}
if (mode === 'empty') process.exit(1)
if (args[1] === 'user') {
  process.stdout.write('me\\n')
  process.exit(0)
}
const query = args.find(arg => arg.startsWith('query=')) || ''
const missing = ['totalCommitContributions', 'totalPullRequestContributions', 'restrictedContributionsCount', 'commitContributionsByRepository', 'pullRequestContributionsByRepository', 'nameWithOwner', 'totalCount', 'maxRepositories: 100']
  .find(field => !query.includes(field))
if (missing) {
  process.stderr.write('missing ' + missing + '\\n')
  process.exit(1)
}
process.stdout.write(JSON.stringify({ data: { user: { contributionsCollection: {
  totalCommitContributions: 10,
  totalPullRequestContributions: 2,
  restrictedContributionsCount: 1,
  commitContributionsByRepository: [{ repository: { nameWithOwner: 'a/one' }, contributions: { totalCount: 10 } }],
  pullRequestContributionsByRepository: []
} } } }))
`

const GLAB = `
const fs = require('node:fs')
const args = process.argv.slice(2)
fs.appendFileSync(process.env.CALLS, JSON.stringify(args) + '\\n')
const include = args[1] === '--include'
const target = include ? args[2] : args[1]
const page = Number(new URLSearchParams((target.split('?')[1]) || '').get('page') || 1)
const fail = message => { process.stderr.write(message + '\\n'); process.exit(1) }
const send = (body, totalPages) => {
  const json = JSON.stringify(body)
  if (!include) return process.stdout.write(json)
  const head = ['HTTP/1.1 200 OK']
  if (totalPages != null) head.push('X-Total-Pages: ' + totalPages)
  process.stdout.write(head.join('\\r\\n') + '\\r\\n\\r\\n' + json)
}
const day = '2026-10-15T00:00:00.000Z'
if (target === 'user') {
  send({ id: 7, username: 'me', email: 'primary@example.com', commit_email: 'commit@example.com', public_email: 'public@example.com' })
} else if (target.startsWith('user/emails')) {
  if (process.env.EMAILS_FAIL) fail('403 forbidden')
  send([{ email: null }, { email: 'api@example.com' }])
} else if (target.includes('/events')) {
  if (page === 1) send(Array.from({ length: 100 }, () => ({ project_id: 1, created_at: day })))
  else if (page === 2) send([{ project_id: 3, created_at: '2026-10-16T00:00:00.000Z' }])
  else if (page === 3) send([])
  else fail('events page ' + page)
} else if (target.includes('merge_requests')) {
  if (page === 1) send(Array.from({ length: 100 }, () => ({ project_id: 1 })), 2)
  else if (page === 2) send([{ project_id: 4, references: { full: 'group/hidden!8' } }, { project_id: 6 }])
  else fail('merge requests page ' + page)
} else if (target.includes('projects?')) {
  if (page === 1) {
    send([
      { id: 1, path_with_namespace: 'group/api', default_branch: 'main' },
      { id: 2, path_with_namespace: 'group/empty' }
    ], 5)
  } else send([{ id: 99, path_with_namespace: 'group/poison', default_branch: 'main' }])
} else if (target.includes('/repository/commits')) {
  if (target.includes('projects/1/')) {
    send([
      { author_email: 'primary@example.com', parent_ids: ['a'] },
      { author_email: 'commit@example.com', parent_ids: ['b'] },
      { author_email: 'public@example.com', parent_ids: ['c'] },
      { author_email: 'api@example.com', parent_ids: ['d'] },
      { author_email: 'primary@example.com', parent_ids: [] },
      { author_email: 'primary@example.com', parent_ids: ['e', 'f'] },
      { author_email: 'other@example.com', parent_ids: ['g'] }
    ])
  } else if (target.includes('projects/3/')) send([{ author_email: 'primary@example.com', parent_ids: ['h'] }])
  else fail('unexpected commits ' + target)
} else if (target.startsWith('projects/')) {
  const id = target.split('/')[1]
  if (id === '3') send({ id: 3, path_with_namespace: 'group/other', default_branch: 'main' })
  else fail('404 ' + id)
} else fail('unexpected ' + target)
`

const writeFake = (dir, name, body) => {
  const file = path.join(dir, name)
  fs.writeFileSync(file, `#!${process.execPath}\n${body}`)
  fs.chmodSync(file, 0o755)
}

const harness = ({ gh = false, glab = false } = {}) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-stats-'))
  if (gh) writeFake(dir, 'gh', GH)
  if (glab) writeFake(dir, 'glab', GLAB)
  return dir
}

const run = (args, dir, env = {}) => spawnSync(process.execPath, [statsBin, ...args], {
  encoding: 'utf8',
  env: { HOME: os.homedir(), PATH: dir ? `${dir}${path.delimiter}${EMPTY_PATH}` : EMPTY_PATH, CALLS: dir ? path.join(dir, 'calls.log') : '', ...env }
})

const calls = dir => {
  const file = path.join(dir, 'calls.log')
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''
}

test('help prints usage and does not call a provider', () => {
  const dir = harness({ gh: true, glab: true })
  for (const flag of ['-h', '--help']) {
    const result = run([flag], dir)
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /Periods are whole UTC days/)
  }
  assert.equal(calls(dir), '')
})

test('a missing provider is skipped, and both missing is a failure', () => {
  const neither = run(['2026-10'])
  assert.equal(neither.status, 1)
  assert.match(neither.stdout, /gh is not installed/)
  assert.match(neither.stdout, /glab is not installed/)

  const dir = harness({ gh: true })
  const one = run(['2026-10'], dir)
  assert.equal(one.status, 0, one.stderr + one.stdout)
  assert.match(one.stdout, /glab is not installed/)
  assert.match(one.stdout, /commits {4}10/)
})

test('a provider that cannot be executed reports the spawn error', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-stats-'))
  fs.writeFileSync(path.join(dir, 'gh'), '#!/bin/sh\n')
  fs.chmodSync(path.join(dir, 'gh'), 0o644)
  const result = run(['2026-10'], dir, { PATH: dir })
  assert.match(result.stdout, /GitHub\n {2}skipped: spawn gh EACCES/)
  assert.match(result.stdout, /glab is not installed/)
})

test('a provider failure reports its first stderr line, or the spawn error when stderr is empty', () => {
  const failed = harness({ gh: true })
  const noisy = run(['2026-10'], failed, { GH_MODE: 'fail' })
  assert.match(noisy.stdout, /skipped: token expired/)
  assert.doesNotMatch(noisy.stdout, /and more/)

  const quiet = harness({ gh: true })
  const empty = run(['2026-10'], quiet, { GH_MODE: 'empty' })
  assert.match(empty.stdout, /skipped: Command failed/)
})

test('an unknown flag fails with the git-stats prefix', () => {
  const result = run(['-x'])
  assert.equal(result.status, 1)
  assert.match(result.stderr, /^git-stats: unknown option -x/)
})

test('--json reports the providers that answered', () => {
  const dir = harness({ gh: true })
  const result = run(['2026-10', '--json'], dir)
  assert.equal(result.status, 0, result.stderr)
  const report = JSON.parse(result.stdout)
  assert.equal(report.total.commits, 10)
  assert.equal(report.providers[0].stats.commits, 10)
  assert.match(report.providers[1].error, /glab is not installed/)
})

test('a long GitHub period is queried in contiguous chunks', () => {
  const dir = harness({ gh: true })
  const result = run(['2023-01-01..2024-12-31'], dir)
  assert.equal(result.status, 0, result.stderr + result.stdout)
  const chunks = calls(dir).trim().split('\n').map(JSON.parse)
    .filter(args => args[1] === 'graphql')
    .map(args => ({
      from: args.find(arg => arg.startsWith('from=')).slice('from='.length),
      to: args.find(arg => arg.startsWith('to=')).slice('to='.length)
    }))
    .sort((a, b) => a.from.localeCompare(b.from))
  assert.equal(chunks.length, 3)
  assert.equal(chunks[0].from, '2023-01-01T00:00:00.000Z')
  assert.equal(chunks.at(-1).to, '2024-12-31T23:59:59.999Z')
  for (let index = 1; index < chunks.length; index++) {
    assert.equal(Date.parse(chunks[index].from) - Date.parse(chunks[index - 1].to), 1)
  }
})

test('GitLab counts each email source, paginates, and skips projects it cannot read', () => {
  const dir = harness({ gh: true, glab: true })
  const result = run(['2026-10', '--repos'], dir)
  assert.equal(result.status, 0, result.stderr + result.stdout)
  assert.match(result.stdout, /commits {4}6$/m)
  assert.match(result.stdout, /PRs {8}102/)
  assert.match(result.stdout, /skipped unreadable projects: 2/)
  assert.match(result.stdout, /group\/hidden\s+0\s+1/)
  assert.match(result.stdout, /group\/other/)
  assert.match(result.stdout, /^\s+6\s+0\s+1$/m)
  assert.doesNotMatch(result.stdout, /group\/poison/)
  assert.doesNotMatch(result.stdout, /group\/empty/)
  const log = calls(dir)
  for (const fragment of [
    'scope=created_by_me', 'state=all', 'created_after=', 'created_before=',
    'membership=true', 'simple=true', 'last_activity_after=', 'user/emails',
    'ref_name=', 'since=', 'until=', 'per_page=100', '/events?', 'after=', 'before='
  ]) {
    assert.match(log, new RegExp(fragment.replace(/[?=]/g, '\\$&')))
  }
  assert.doesNotMatch(log, /projects\/2\/repository/)
  assert.doesNotMatch(log, /projects\/99/)
})

test('GitLab still counts profile emails when the emails endpoint fails', () => {
  const dir = harness({ gh: true, glab: true })
  const result = run(['2026-10'], dir, { EMAILS_FAIL: '1' })
  assert.equal(result.status, 0, result.stderr + result.stdout)
  assert.match(result.stdout, /commits {4}5$/m)
  assert.doesNotMatch(result.stdout, /403 forbidden/)
})
