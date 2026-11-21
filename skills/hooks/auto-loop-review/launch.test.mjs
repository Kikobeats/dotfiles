import assert from 'node:assert/strict'
import test from 'node:test'

import { ATTEMPTS, RETRY_MS, launchedReply, pullRequest, runLaunch, safeNotify, skipReason } from './launch.mjs'

const GITLAB = 'https://gitlab.com/group/sub/repo/-/merge_requests/4'
const GITHUB = 'https://github.com/octo/repo/pull/3'

const state = (over = {}) => ({ url: GITHUB, tree: '/repo', calledAtMs: 1_000, ...over })

test('the launcher tries three times, a second apart', () => {
  assert.equal(ATTEMPTS, 3)
  assert.equal(RETRY_MS, 1000)
})

test('an old or closed pull request is skipped, and one this call created is not', () => {
  assert.equal(skipReason({ open: true, createdAtMs: 0, calledAtMs: 120_000 }), 'created before the session printed it')
  assert.equal(skipReason({ open: false, createdAtMs: 120_000, calledAtMs: 120_000 }), 'not open')
  assert.equal(skipReason({ open: true, createdAtMs: 120_000, calledAtMs: 120_000 }), null)
  assert.equal(skipReason({ open: true, createdAtMs: -120_000, calledAtMs: 0 }), null)
})

test('gitlab and github answer with their own open state', () => {
  const calls = []
  const run = (cmd, args) => {
    calls.push([cmd, ...args])
    if (cmd === 'glab') return JSON.stringify({ state: 'opened', created_at: '2026-11-21T00:00:00.000Z' })
    return JSON.stringify({ state: 'OPEN', createdAt: '2026-11-21T00:00:00.000Z' })
  }
  assert.equal(pullRequest(GITLAB, run).open, true)
  assert.equal(calls[0][2], 'projects/group%2Fsub%2Frepo/merge_requests/4')
  assert.equal(pullRequest(GITLAB, () => JSON.stringify({ state: 'merged', created_at: '2026-11-21T00:00:00.000Z' })).open, false)
  const github = pullRequest(GITHUB, run)
  assert.equal(github.open, true)
  assert.equal(calls[1][0], 'gh')
  assert.equal(calls[1].includes(GITHUB), true)
  assert.equal(pullRequest(GITHUB, () => JSON.stringify({ state: 'CLOSED', createdAt: '2026-11-21T00:00:00.000Z' })).open, false)
})

test('a launch that throws is not tried again, and a file deleted during the host check is not launched', async () => {
  let ran = 0
  await assert.rejects(
    launch({
      launch: () => {
        ran++
        throw new Error('launched')
      }
    })
  )
  assert.equal(ran, 1)

  ran = 0
  let reads = 0
  const cancelled = await launch({
    readState: () => {
      reads++
      return reads < 3 ? state() : null
    },
    launch: () => {
      ran++
    }
  })
  assert.equal(ran, 0)
  assert.deepEqual(cancelled.writes, [])

  ran = 0
  reads = 0
  const launchedThenDeleted = await launch({
    readState: () => {
      reads++
      return reads < 4 ? state() : null
    },
    launch: () => {
      ran++
    }
  })
  assert.equal(ran, 1)
  assert.deepEqual(launchedThenDeleted.writes, [])
})

test('a launch reply that is not ok raises its message', () => {
  assert.equal(launchedReply({ ok: true }).ok, true)
  assert.throws(() => launchedReply({ ok: false, error: { message: 'selector_not_found' } }), /selector_not_found/)
  assert.throws(() => launchedReply({ ok: false }), /orca agent launch failed/)
})

test('a notification failure does not stop the launch', () => {
  assert.doesNotThrow(() =>
    safeNotify(() => {
      throw new Error('no ui')
    }, 'hi')
  )
})

const launch = (over = {}) => {
  const writes = []
  const logs = []
  let paused = 0
  const done = runLaunch({
    readState: () => state(),
    writeState: patch => writes.push(patch),
    load: () => ({ open: true, createdAtMs: 1_000 }),
    launch: () => {},
    notify: () => {},
    log: message => logs.push(message),
    sleep: async () => {
      paused++
    },
    ...over
  })
  return done.then(() => ({ writes, logs, paused }))
}

test('a created open pull request is launched without waiting', async () => {
  let ran = 0
  const result = await launch({
    launch: () => {
      ran++
    }
  })
  assert.equal(ran, 1)
  assert.equal(result.paused, 0)
  assert.equal(typeof result.writes[0].launchedAtMs, 'number')
  assert.match(result.logs[0], /launched \/loop-review/)
})

test('a missing state file launches nothing and is not recreated', async () => {
  const writes = []
  await launch({
    readState: () => null,
    writeState: patch => writes.push(patch)
  })
  assert.deepEqual(writes, [])
})

test('a host that fails is asked again, and a deleted file stops the retries', async () => {
  let tries = 0
  const recovered = await launch({
    load: () => {
      tries++
      if (tries < 3) throw new Error('down')
      return { open: true, createdAtMs: 1_000 }
    }
  })
  assert.equal(tries, 3)
  assert.equal(recovered.paused, 2)
  assert.equal(typeof recovered.writes[0].launchedAtMs, 'number')

  const writes = []
  let reads = 0
  let loads = 0
  const stopped = await launch({
    readState: () => {
      reads++
      return reads === 1 ? state() : null
    },
    writeState: patch => writes.push(patch),
    load: () => {
      loads++
      throw new Error('down')
    }
  })
  assert.deepEqual(writes, [])
  assert.equal(stopped.paused, 0)
  assert.equal(loads, 0)

  let late = 0
  const after = await launch({
    readState: () => {
      late++
      return late < 5 ? state() : null
    },
    load: () => {
      throw new Error('down')
    }
  })
  assert.deepEqual(after.writes, [])
})

test('a host that stays down records the failure', async () => {
  const result = await launch({
    load: () => {
      throw new Error('down')
    }
  })
  assert.equal(result.writes[0].error, 'down')
  assert.equal(result.paused, ATTEMPTS - 1)
  assert.match(result.logs.at(-1), /failed: down/)
})
