'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')

const {
  parsePeriod, formatDay, parseHttpResponse, summarizeGithub, summarizeGitlab,
  candidateProjectIds, splitRange, totalOf, render, parseArgs
} = require(path.join(__dirname, '..', 'bin', 'git-stats'))

const NOVEMBER_16_2026 = new Date(Date.UTC(2026, 10, 16, 12))

const days = range => [formatDay(range.from), formatDay(range.to)]

test('no period means the current month', () => {
  assert.deepEqual(days(parsePeriod(undefined, NOVEMBER_16_2026)), ['2026-11-01', '2026-11-30'])
})

test('a month name means its most recent occurrence', () => {
  assert.deepEqual(days(parsePeriod('october', NOVEMBER_16_2026)), ['2026-10-01', '2026-10-31'])
  assert.deepEqual(days(parsePeriod('november', NOVEMBER_16_2026)), ['2026-11-01', '2026-11-30'])
  assert.deepEqual(days(parsePeriod('december', NOVEMBER_16_2026)), ['2025-12-01', '2025-12-31'])
})

test('month names accept case and a three letter prefix', () => {
  assert.deepEqual(days(parsePeriod('Oct', NOVEMBER_16_2026)), ['2026-10-01', '2026-10-31'])
  assert.deepEqual(days(parsePeriod('mar', NOVEMBER_16_2026)), ['2026-03-01', '2026-03-31'])
  assert.throws(() => parsePeriod('ma', NOVEMBER_16_2026), /unrecognized period/)
})

test('a period is whole UTC days, ending at the last millisecond', () => {
  const { to } = parsePeriod('2026-10')
  assert.equal(to.getTime(), Date.UTC(2026, 10, 1) - 1)
})

test('YYYY-MM handles month lengths and leap years', () => {
  assert.deepEqual(days(parsePeriod('2026-01')), ['2026-01-01', '2026-01-31'])
  assert.deepEqual(days(parsePeriod('2026-02')), ['2026-02-01', '2026-02-28'])
  assert.deepEqual(days(parsePeriod('2024-02')), ['2024-02-01', '2024-02-29'])
  assert.deepEqual(days(parsePeriod('2026-12')), ['2026-12-01', '2026-12-31'])
  assert.throws(() => parsePeriod('2026-00'), /unrecognized period/)
  assert.throws(() => parsePeriod('2026-13'), /unrecognized period/)
})

test('YYYY covers the whole year', () => {
  assert.deepEqual(days(parsePeriod('2025')), ['2025-01-01', '2025-12-31'])
})

test('FROM..TO is inclusive on both ends', () => {
  assert.deepEqual(days(parsePeriod('2026-10-01..2026-10-15')), ['2026-10-01', '2026-10-15'])
  assert.deepEqual(days(parsePeriod('2026-10-07..2026-10-07')), ['2026-10-07', '2026-10-07'])
})

test('FROM..TO rejects impossible dates and reversed ranges', () => {
  assert.deepEqual(days(parsePeriod('2024-02-29..2024-02-29')), ['2024-02-29', '2024-02-29'])
  assert.throws(() => parsePeriod('2026-02-29..2026-03-01'), /unrecognized period/)
  assert.throws(() => parsePeriod('2026-02-30..2026-03-01'), /unrecognized period/)
  assert.throws(() => parsePeriod('2026-13-01..2026-13-02'), /unrecognized period/)
  assert.throws(() => parsePeriod('2026-10-15..2026-10-01'), /starts after it ends/)
  assert.throws(() => parsePeriod('2026-10-01..2026-10-02..2026-10-03'), /unrecognized period/)
  assert.throws(() => parsePeriod('yesterday'), /unrecognized period/)
})

const repository = (nameWithOwner, totalCount) => ({ repository: { nameWithOwner }, contributions: { totalCount } })

test('GitHub projects are the union of repos with commits or PRs', () => {
  const stats = summarizeGithub([{
    totalCommitContributions: 7,
    totalPullRequestContributions: 3,
    restrictedContributionsCount: 2,
    commitContributionsByRepository: [repository('a/one', 5), repository('a/two', 2)],
    pullRequestContributionsByRepository: [repository('a/two', 1), repository('b/pr-only', 2)]
  }])
  assert.equal(stats.commits, 7)
  assert.equal(stats.pullRequests, 3)
  assert.equal(stats.projects, 3)
  assert.equal(stats.privateContributions, 2)
  assert.equal(stats.unreadableProjects, 0)
  assert.equal(stats.truncated, false)
  assert.deepEqual(stats.repositories, [
    { name: 'a/one', commits: 5, pullRequests: 0 },
    { name: 'a/two', commits: 2, pullRequests: 1 },
    { name: 'b/pr-only', commits: 0, pullRequests: 2 }
  ])
})

test('GitHub marks the project count as truncated at the API cap', () => {
  const collection = (commits, pulls) => ({
    totalCommitContributions: commits.length,
    totalPullRequestContributions: pulls.length,
    restrictedContributionsCount: 0,
    commitContributionsByRepository: commits,
    pullRequestContributionsByRepository: pulls
  })
  const many = Array.from({ length: 100 }, (_, index) => repository(`a/${index}`, 1))
  const stats = summarizeGithub([collection(many, [])])
  assert.equal(stats.truncated, true)
  assert.match(render(parsePeriod('2026-10'), [{ name: 'GitHub', login: 'me', stats }], {}), /projects {3}100\+/)
  assert.equal(summarizeGithub([collection([], many)]).truncated, true)
  assert.equal(summarizeGithub([collection(Array.from({ length: 101 }, (_, index) => repository(`c/${index}`, 1)), [])]).truncated, true)
  assert.equal(summarizeGithub([collection(Array.from({ length: 99 }, (_, index) => repository(`u/${index}`, 1)), [])]).truncated, false)
})

test('repositories sort by commits, then pull requests, then name', () => {
  const stats = summarizeGithub([{
    totalCommitContributions: 6,
    totalPullRequestContributions: 10,
    restrictedContributionsCount: 0,
    commitContributionsByRepository: [repository('c/high', 2), repository('b/high', 2), repository('a/low', 2)],
    pullRequestContributionsByRepository: [repository('c/high', 5), repository('b/high', 5), repository('a/low', 0)]
  }])
  assert.deepEqual(stats.repositories.map(({ name }) => name), ['b/high', 'c/high', 'a/low'])
})

test('GitHub sums chunks of a long period per repository', () => {
  const chunk = (commits, prs, repos) => ({
    totalCommitContributions: commits,
    totalPullRequestContributions: prs,
    restrictedContributionsCount: 1,
    commitContributionsByRepository: repos,
    pullRequestContributionsByRepository: []
  })
  const stats = summarizeGithub([chunk(5, 1, [repository('a/one', 5)]), chunk(4, 2, [repository('a/one', 3), repository('a/two', 1)])])
  assert.equal(stats.commits, 9)
  assert.equal(stats.pullRequests, 3)
  assert.equal(stats.privateContributions, 2)
  assert.deepEqual(stats.repositories.map(({ name, commits }) => [name, commits]), [['a/one', 8], ['a/two', 1]])
})

test('splitRange covers a period with contiguous, non-overlapping chunks', () => {
  const range = parsePeriod('2023-01-01..2024-12-31')
  const chunks = splitRange(range, 365)
  assert.equal(chunks.length, 3)
  assert.equal(chunks[0].from.getTime(), range.from.getTime())
  assert.equal(chunks.at(-1).to.getTime(), range.to.getTime())
  for (let index = 1; index < chunks.length; index++) {
    assert.equal(chunks[index].from.getTime() - chunks[index - 1].to.getTime(), 1)
  }
  assert.equal(splitRange(parsePeriod('2024'), 365).length, 2)
  assert.equal(splitRange(parsePeriod('2026-10'), 365).length, 1)
  const at = new Date(Date.UTC(2026, 9, 1))
  const same = splitRange({ from: at, to: at }, 365)
  assert.equal(same.length, 1)
  assert.equal(same[0].to.getTime(), at.getTime())
})

test('GitLab counts own non-merge default-branch commits, matching emails case-insensitively', () => {
  const stats = summarizeGitlab({
    projects: [
      { id: 1, path_with_namespace: 'group/api' },
      { id: 2, path_with_namespace: 'group/someone-else' },
      { id: 3, path_with_namespace: 'group/mr-only' }
    ],
    commitsByProject: new Map([
      [1, [
        { author_email: 'Me@Example.com', parent_ids: ['a'] },
        { author_email: 'me@example.com', parent_ids: ['b'] },
        { author_email: 'me@example.com', parent_ids: [] },
        { author_email: null, parent_ids: ['z'] },
        { author_email: 'me@example.com', parent_ids: ['c', 'd'] },
        { author_email: 'bot@noreply.gitlab.com', parent_ids: ['e'] }
      ]],
      [2, [{ author_email: 'other@example.com', parent_ids: ['f'] }]],
      [3, []]
    ]),
    mergeRequests: [{ project_id: 1 }, { project_id: 3 }, { project_id: 3 }],
    emails: ['me@example.com'],
    unreadableProjects: 1
  })
  assert.equal(stats.commits, 3)
  assert.equal(stats.privateContributions, 0)
  assert.equal(stats.truncated, false)
  assert.equal(stats.unreadableProjects, 1)
  assert.match(render(parsePeriod('2026-10'), [{ name: 'GitLab', login: 'me', stats }], {}), /skipped unreadable projects: 1/)
  assert.equal(stats.pullRequests, 3)
  assert.equal(stats.projects, 2)
  assert.deepEqual(stats.repositories, [
    { name: 'group/api', commits: 3, pullRequests: 1 },
    { name: 'group/mr-only', commits: 0, pullRequests: 2 }
  ])
})

test('GitLab candidate projects come from in-range events only', () => {
  const range = parsePeriod('2026-10')
  const events = [
    { project_id: 1, created_at: new Date(Date.UTC(2026, 9, 1, 0, 0, 1)).toISOString() },
    { project_id: 1, created_at: new Date(Date.UTC(2026, 9, 2)).toISOString() },
    { project_id: 2, created_at: new Date(Date.UTC(2026, 8, 30, 23, 59)).toISOString() },
    { project_id: 3, created_at: new Date(Date.UTC(2026, 10, 1)).toISOString() },
    { project_id: null, created_at: new Date(Date.UTC(2026, 9, 5)).toISOString() },
    { project_id: 10, created_at: range.from.toISOString() },
    { project_id: 11, created_at: range.to.toISOString() }
  ]
  assert.deepEqual(candidateProjectIds(events, range), [1, 10, 11])
})

test('GitLab names an MR from its project, then its reference, then its id', () => {
  const stats = summarizeGitlab({
    projects: [{ id: 1, path_with_namespace: 'group/api' }],
    commitsByProject: new Map([[1, [{ author_email: 'me@example.com', parent_ids: ['a'] }]]]),
    mergeRequests: [
      { project_id: 1 },
      { project_id: 4, references: { full: 'group/hidden!8' } },
      { project_id: 6 },
      {},
      { project_id: null }
    ],
    emails: ['me@example.com']
  })
  assert.equal(stats.pullRequests, 5)
  assert.equal(stats.unreadableProjects, 0)
  assert.deepEqual(stats.repositories.map(({ name }) => name).sort(), ['6', 'group/api', 'group/hidden'])
  const text = render(parsePeriod('2026-10'), [{ name: 'GitLab', login: 'me', stats }], { showRepositories: true })
  assert.match(text, /group\/hidden/)
  assert.match(text, /^\s+6\s+0\s+1$/m)
})

test('GitLab pagination reads X-Total-Pages from the response headers', () => {
  const raw = 'HTTP/2.0 200 OK\r\nContent-Type: application/json\r\nX-Total-Pages: 8\r\n\r\n[{"id":1}]'
  assert.deepEqual(parseHttpResponse(raw), { body: [{ id: 1 }], totalPages: 8 })
  assert.deepEqual(parseHttpResponse('HTTP/2.0 200 OK\n\n[]'), { body: [], totalPages: null })
})

const sampleStats = (commits, pullRequests, projects) =>
  ({ commits, pullRequests, projects, privateContributions: 0, truncated: false, repositories: [] })

test('the total sums only the providers that answered', () => {
  const providers = [
    { name: 'GitHub', stats: sampleStats(10, 4, 3) },
    { name: 'GitLab', stats: sampleStats(5, 2, 1) },
    { name: 'Other', error: 'glab is not installed' }
  ]
  assert.deepEqual(totalOf(providers), { commits: 15, pullRequests: 6, projects: 4, truncated: false })
  providers[0].stats.truncated = true
  assert.equal(totalOf(providers).truncated, true)
})

test('render shows skipped providers and a total only when several answered', () => {
  const range = parsePeriod('2026-10')
  const both = render(range, [
    { name: 'GitHub', login: 'me', stats: sampleStats(10, 4, 3) },
    { name: 'GitLab', login: 'me', stats: sampleStats(5, 2, 1) }
  ], {})
  assert.match(both, /^2026-10-01 → 2026-10-31/)
  assert.match(both, /total\n {2}commits {4}15\n {2}PRs {8}6\n {2}projects {3}4/)

  const one = render(range, [
    { name: 'GitHub', login: 'me', stats: sampleStats(10, 4, 3) },
    { name: 'GitLab', error: 'glab is not installed' }
  ], {})
  assert.match(one, /GitLab\n {2}skipped: glab is not installed/)
  assert.doesNotMatch(one, /total/)

  const capped = render(range, [
    { name: 'GitHub', login: 'me', stats: { ...sampleStats(10, 4, 100), truncated: true } },
    { name: 'GitLab', login: 'me', stats: sampleStats(5, 2, 1) }
  ], {})
  assert.match(capped, /total\n {2}commits {4}15\n {2}PRs {8}6\n {2}projects {3}101\+/)
})

test('render separates private contributions from the totals', () => {
  const range = parsePeriod('2026-10')
  const text = render(range, [{
    name: 'GitHub',
    login: 'me',
    stats: { ...sampleStats(1, 0, 1), privateContributions: 4 }
  }], {})
  assert.match(text, /commits {4}1/)
  assert.match(text, /\+ 4 private contributions not broken down/)
  assert.doesNotMatch(render(range, [{ name: 'GitHub', login: 'me', stats: sampleStats(1, 0, 1) }], {}), /private contributions/)
})

test('render lists projects with --repos', () => {
  const stats = { ...sampleStats(3, 1, 1), repositories: [{ name: 'a/one', commits: 3, pullRequests: 1 }] }
  const output = render(parsePeriod('2026-10'), [{ name: 'GitHub', login: 'me', stats }], { showRepositories: true })
  assert.match(output, /a\/one +3 +1$/)
  const hidden = render(parsePeriod('2026-10'), [{ name: 'GitHub', login: 'me', stats }], {})
  assert.doesNotMatch(hidden, /a\/one/)
  const empty = render(parsePeriod('2026-10'), [{
    name: 'GitHub', login: 'me', stats: sampleStats(0, 0, 0)
  }], { showRepositories: true })
  assert.doesNotMatch(empty, /project {2}commits/)
})

test('parseArgs takes one period and known flags only', () => {
  assert.deepEqual(parseArgs(['october', '--repos', '--json']),
    { period: 'october', showRepositories: true, json: true, help: false })
  assert.equal(parseArgs(['-h']).help, true)
  assert.equal(parseArgs(['--help']).help, true)
  assert.throws(() => parseArgs(['--user', 'x']), /unknown option --user/)
  assert.throws(() => parseArgs(['-x']), /unknown option -x/)
  assert.throws(() => parseArgs(['october', 'november']), /unexpected argument november/)
})
