import assert from 'node:assert/strict'
import test from 'node:test'
import { botControls } from './bot.js'

test('practice opponent keeps moving to turn and only fires when aimed at a nearby grounded target', () => {
  const state = { x: 0, z: 0, heading: 0, speed: 0 }
  const behind = botControls(state, { ...state, z: -10 })
  assert.equal(behind.forward, true)
  assert.equal(behind.fire, false)
  assert.equal(botControls(state, { ...state, z: 12 }).fire, true)
  assert.equal(botControls(state, { ...state, z: 90 }).fire, false)
  assert.equal(botControls(state, { ...state, z: 12, y: 10 }).fire, false)
})
