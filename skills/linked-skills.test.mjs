import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, symlinkSync, rmSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { linkSkill, SKILLS } from './linked-skills.mjs'

test('the review skill is linked from this repo and runs its script through the link', () => {
  const review = SKILLS.find(skill => skill.name === 'review')
  assert.equal(review.source, join(import.meta.dirname, 'review'))
  const skill = readFileSync(join(review.source, 'SKILL.md'), 'utf8')
  assert.match(skill, /^name: review$/m)
  assert.match(skill, /^disable-model-invocation: true$/m)
  assert.match(skill, /\|\| true/)
  const script = skill.match(/\$HOME\/\.claude\/skills\/review\/(\S+?)"/)[1]
  assert.ok(existsSync(join(review.source, script)), script)
})

test('a cursor skill with no claude equivalent stays linked', () => {
  const autopilot = SKILLS.find(skill => skill.name === 'autopilot')
  assert.equal(autopilot.source, join(homedir(), '.cursor', 'skills-cursor', 'autopilot'))
})

test('a missing skill is skipped, a directory is backed up, and a symlink is replaced', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'linked-skills-'))
  const source = join(import.meta.dirname, 'review')
  assert.equal(await linkSkill({ name: 'review', source: join(dir, 'missing') }, dir), null)
  mkdirSync(join(dir, 'review'))
  const backed = await linkSkill({ name: 'review', source }, dir)
  assert.equal(backed.backedUp, true)
  assert.equal(lstatSync(join(dir, 'review.bak')).isDirectory(), true)
  assert.equal(readlinkSync(join(dir, 'review')), source)
  symlinkSync(source, join(dir, 'other'))
  const replaced = await linkSkill({ name: 'other', source }, dir)
  assert.equal(replaced.backedUp, false)
  assert.equal(readlinkSync(join(dir, 'other')), source)
  rmSync(dir, { recursive: true })
})
