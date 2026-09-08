import test from 'node:test'
import assert from 'node:assert/strict'
import { KPH_PER_UNIT, MAX_REVERSE_SPEED, MAX_SPEED, stepGravity, stepKart, type KartState } from './physics.js'

test('kart accelerates, turns, and respects top speed', () => {
  let kart = { x: 0, z: 0, heading: 0, speed: 0 }
  for (let i = 0; i < 180; i++) kart = stepKart(kart, { forward: true, back: false, left: true, right: false, drift: false, fire: false }, 1 / 60)
  assert.ok(kart.speed <= MAX_SPEED && kart.speed > 25)
  assert.equal(Math.round(kart.speed * KPH_PER_UNIT), 150)
  assert.notEqual(kart.heading, 0)
  assert.notEqual(kart.x, 0)
})

test('drift creates slip and reverse brakes before backing up', () => {
  const controls = { forward: true, back: false, left: true, right: false, drift: true, fire: false }
  let kart: KartState = { x: 0, z: 0, heading: 0, speed: 20, drift: 0 }
  let gripKart: KartState = { ...kart }
  for (let i = 0; i < 30; i++) kart = stepKart(kart, controls, 1 / 60)
  for (let i = 0; i < 30; i++) gripKart = stepKart(gripKart, { ...controls, drift: false }, 1 / 60)
  assert.ok(Math.abs(kart.drift ?? 0) > .2)
  assert.ok(Math.hypot(kart.x - gripKart.x, kart.z - gripKart.z) > 1)

  controls.forward = false
  controls.back = true
  controls.left = controls.drift = false
  for (let i = 0; i < 90; i++) kart = stepKart(kart, controls, 1 / 60)
  assert.ok(kart.speed < -5)
})

test('kart reverse speed is capped at 70 km/h', () => {
  let kart: KartState = { x: 0, z: 0, heading: 0, speed: 0 }
  const controls = { forward: false, back: true, left: false, right: false, drift: false, fire: false }
  for (let i = 0; i < 180; i++) kart = stepKart(kart, controls, 1 / 60)
  assert.equal(kart.speed, -MAX_REVERSE_SPEED)
  assert.equal(Math.round(Math.abs(kart.speed) * KPH_PER_UNIT), 70)
})

test('kart launches from a ramp and gravity lands it', () => {
  const kart = { x: 0, z: 0, heading: 0, speed: 25, y: 4, verticalSpeed: 0 }
  stepGravity(kart, 0, 4, 1 / 60)
  assert.ok(kart.verticalSpeed > 0)
  for (let i = 0; i < 120; i++) stepGravity(kart, 0, 0, 1 / 60)
  assert.equal(kart.y, 0)
  assert.equal(kart.verticalSpeed, 0)
})

test('air steering works at zero speed, is consistent in reverse, and air brake slows travel', () => {
  const input = { forward: false, back: false, left: true, right: false, drift: false, fire: false }
  for (const speed of [0, -10, 20]) {
    const initial = { x: 0, z: 0, y: 10, heading: 0, speed, drift: .4, airborne: true }
    const turned = stepKart(initial, input, .1)
    assert.ok(turned.heading > 0)
    assert.equal(turned.heading, .19)
    const braked = stepKart(initial, { ...input, drift: true }, .1)
    assert.ok(Math.abs(braked.speed) <= Math.abs(turned.speed))
    const sensitive = stepKart(initial, input, .1, { steeringSensitivity: 1, driftStrength: 1, airSteeringSensitivity: 1.7 })
    assert.ok(sensitive.heading > turned.heading)
  }
})

test('ramp contact keeps ground steering and landing clears airborne state', () => {
  const kart = { x: 0, z: 0, y: 4, verticalSpeed: 0, heading: 0, speed: 0, airborne: false }
  const input = { forward: false, back: false, left: true, right: false, drift: false, fire: false }
  stepGravity(kart, 4, 4, 1 / 60)
  assert.equal(stepKart(kart, input, .1).heading, 0)
  stepGravity(kart, 0, 4, .1)
  assert.equal(kart.airborne, true)
  for (let i = 0; i < 120; i++) stepGravity(kart, 0, 0, 1 / 60)
  assert.equal(kart.airborne, false)
})
