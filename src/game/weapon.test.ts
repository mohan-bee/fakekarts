import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { Effects } from './effects.js'
import { distanceToSegmentSquared, stepBullet, WeaponSystem } from './weapon.js'

test('bullets travel in a straight line', () => {
  const position = new THREE.Vector3(0, 2, 0)
  const velocity = new THREE.Vector3(0, 1, 20)
  stepBullet(position, velocity, .5)
  assert.equal(position.z, 10)
  assert.equal(position.y, 2.5)
  assert.equal(velocity.y, 1)
  assert.equal(distanceToSegmentSquared(0, 0, 5, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 10)), 0)
})

test('mounted pistol fires a live projectile', () => {
  const scene = new THREE.Scene()
  const kart = new THREE.Group()
  scene.add(kart)
  const weapon = new WeaponSystem(scene, kart, new Effects(scene))
  weapon.update({ x: 0, y: 0, z: 0, heading: 0, speed: 10 }, [], [], true, 1 / 60, () => {})
  assert.equal(weapon.bulletCount, 1)
  const bullet = scene.children.find(object => object.userData.projectile)!
  assert.ok(bullet instanceof THREE.Group)
  assert.equal(bullet.children.filter(object => object instanceof THREE.Mesh).length, 2)
  assert.equal(scene.children.filter(object => object.userData.projectileTrail).length, 3)
  const start = bullet.position.z
  weapon.update({ x: 0, y: 0, z: 0, heading: 0, speed: 10 }, [], [], false, .1, () => {})
  assert.ok(bullet.position.z > start + 3)
  weapon.update({ x: 0, y: 0, z: 0, heading: 0, speed: 10 }, [], [], false, .15, () => {})
  weapon.update({ x: 0, y: 0, z: 0, heading: 0, speed: 10 }, [], [], true, 1 / 60, () => {})
  assert.equal(scene.children.filter(object => object.userData.projectile).length, 2)
})

test('projectiles remain alive until they leave the arena', () => {
  const scene = new THREE.Scene()
  const kart = new THREE.Group()
  scene.add(kart)
  const weapon = new WeaponSystem(scene, kart, new Effects(scene))
  const state = { x: 0, y: 0, z: 0, heading: 0, speed: 0 }
  weapon.update(state, [], [], true, 1 / 60, () => {})
  weapon.update(state, [], [], false, 1, () => {})
  assert.equal(weapon.bulletCount, 1)
  weapon.update(state, [], [], false, 4, () => {})
  assert.equal(weapon.bulletCount, 0)
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

test('a magazine counts actual shots and cannot fire during an automatic or manual reload', () => {
  const scene = new THREE.Scene()
  const kart = new THREE.Group()
  scene.add(kart)
  const weapon = new WeaponSystem(scene, kart, new Effects(scene))
  const state = { x: 0, z: 0, heading: 0, speed: 0 }
  let shots = 0
  for (let i = 0; i < 12; i++) weapon.update(state, [], [], true, .25, () => {}, () => shots++)
  assert.equal(shots, 12)
  assert.equal(weapon.ammo, 0)
  assert.equal(weapon.reloadRemaining, 1.4)
  weapon.update(state, [], [], true, 1, () => {}, () => shots++)
  assert.equal(shots, 12)
  weapon.update(state, [], [], true, .5, () => {}, () => shots++)
  assert.equal(shots, 13)
  assert.equal(weapon.ammo, 11)
  weapon.reload()
  assert.equal(weapon.shoot(state), false)
})
