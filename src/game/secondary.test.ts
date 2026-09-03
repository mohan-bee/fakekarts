import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { Effects } from './effects.js'
import { isSecondaryKind, SecondarySystem } from './secondary.js'

test('secondary slot validates choices and deploys with a cooldown', () => {
  assert.equal(isSecondaryKind('grenade'), true)
  assert.equal(isSecondaryKind('rocket'), false)
  const scene = new THREE.Scene()
  const system = new SecondarySystem(scene, new Effects(scene))
  const state = { x: 0, y: 0, z: 0, heading: 0, speed: 0 }
  assert.equal(system.deploy(state, 'landmine'), true)
  assert.equal(system.deploy(state, 'spring'), false)
  assert.equal(system.itemCount, 1)
  const target = new THREE.Group()
  target.position.z = -2.6
  let damage = 0
  system.update(.6, [{ id: 'target', object: target }], (_id, amount) => { damage = amount }, () => {})
  assert.equal(damage, 55)
  assert.equal(system.itemCount, 0)
})

test('spring trap launches its target without damage', () => {
  const scene = new THREE.Scene()
  const system = new SecondarySystem(scene, new Effects(scene))
  const state = { x: 0, y: 0, z: 0, heading: 0, speed: 0 }
  const target = new THREE.Group()
  target.position.z = -2.6
  let damage = 0
  let upwardForce = 0
  system.deploy(state, 'spring')
  system.update(.6, [{ id: 'target', object: target }], (_id, amount) => { damage = amount }, (_id, _x, _z, up) => { upwardForce = up })
  assert.equal(damage, 0)
  assert.equal(upwardForce, 11)
})
