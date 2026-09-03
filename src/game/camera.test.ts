import test from 'node:test'
import assert from 'node:assert/strict'
import { stepReverseView } from './camera.js'

test('reverse camera follows its explicit toggle', () => {
  assert.equal(stepReverseView(0, false, .1), 0)
  assert.ok(stepReverseView(0, true, .1) > 0)
})

test('reverse camera smoothly returns to the chase view', () => {
  const returning = stepReverseView(1, false, .1)
  assert.ok(returning > 0)
  assert.ok(returning < 1)
})
