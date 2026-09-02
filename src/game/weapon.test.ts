import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { Effects } from './effects.js'
import { stepBullet, WeaponSystem } from './weapon.js'

test('bullets travel forward and fall under gravity', () => {
  const position = new THREE.Vector3(0, 2, 0)
  const velocity = new THREE.Vector3(0, 1, 20)
  stepBullet(position, velocity, .5)
  assert.equal(position.z, 10)
  assert.ok(velocity.y < 0)
})

test('mounted pistol fires a live projectile', () => {
  const scene = new THREE.Scene()
  const kart = new THREE.Group()
  scene.add(kart)
  const weapon = new WeaponSystem(scene, kart, new Effects(scene))
  weapon.update({ x: 0, y: 0, z: 0, heading: 0, speed: 10 }, [], [], true, 1 / 60, () => {})
  assert.equal(weapon.bulletCount, 1)
  const bullet = scene.children.find(object => object.children.some(child => child instanceof THREE.PointLight))!
  assert.ok(bullet instanceof THREE.Mesh)
  assert.equal(scene.children.filter(object => object instanceof THREE.Mesh && object.material instanceof THREE.MeshBasicMaterial && object.material.blending === THREE.AdditiveBlending).length, 5)
})

test('mounted pistol damages an opponent in its firing path', () => {
  const scene = new THREE.Scene()
  const kart = new THREE.Group()
  const target = new THREE.Group()
  target.position.set(0, 0, 5)
  scene.add(kart, target)
  const weapon = new WeaponSystem(scene, kart, new Effects(scene))
  let damage = 0
  weapon.update({ x: 0, y: 0, z: 0, heading: 0, speed: 10 }, [], [{ id: 'opponent', object: target }], true, 1 / 60, (_id, amount) => { damage = amount })
  assert.equal(damage, 25)
  assert.equal(weapon.bulletCount, 0)
})
