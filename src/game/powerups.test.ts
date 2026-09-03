import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { PowerupSystem } from './powerups.js'

test('jetpack pickup lasts two minutes and applies upward thrust', () => {
  const scene = new THREE.Scene()
  const kart = new THREE.Group()
  const powerups = new PowerupSystem(scene, kart)
  const state = { x: 0, y: 0, z: 55, heading: 0, speed: 0, verticalSpeed: 0 }
  assert.equal(powerups.update(state, .01), 'jetpack')
  assert.equal(powerups.remaining('jetpack'), 120)
  powerups.applyJetpack(state, true, .1)
  assert.ok((state.verticalSpeed ?? 0) > 0)
})
