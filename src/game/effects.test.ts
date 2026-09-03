import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { Effects } from './effects.js'

test('bullet impacts create and clean up a layered explosion', () => {
  const scene = new THREE.Scene()
  const effects = new Effects(scene)
  effects.bulletImpact(new THREE.Vector3(0, 2, 0))
  assert.equal(scene.children.length, 28)
  assert.ok(scene.children.some(object => object instanceof THREE.Mesh && object.material instanceof THREE.MeshBasicMaterial && object.material.wireframe))
  effects.update(2)
  assert.equal(scene.children.length, 0)
})
