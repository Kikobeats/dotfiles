import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { SKILLS } from './linked-skills.mjs'

test('the review skill is linked from this repo and runs its script through the link', () => {
  const review = SKILLS.find(skill => skill.name === 'review')
  assert.equal(review.source, join(import.meta.dirname, 'review'))
  const skill = readFileSync(join(review.source, 'SKILL.md'), 'utf8')
  assert.match(skill, /^name: review$/m)
  assert.match(skill, /^disable-model-invocation: true$/m)
  const script = skill.match(/\$HOME\/\.claude\/skills\/review\/(\S+?)"/)[1]
  assert.ok(existsSync(join(review.source, script)), script)
})
