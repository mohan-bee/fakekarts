import test from 'node:test'
import assert from 'node:assert/strict'
import { respawn, resolveKartCollision, takeDamage } from './combat.js'

test('kart collisions bounce without damage and bullets can damage and respawn', () => {
  const kart = { x: 0, y: 0, z: 0, heading: 0, speed: 20, health: 100 }
  assert.equal(resolveKartCollision(kart, { x: 0, z: 2 }), true)
  assert.equal(kart.health, 100)
  assert.equal(takeDamage(kart, 25), false)
  assert.equal(kart.health, 75)
  assert.equal(takeDamage(kart, 100), true)
  respawn(kart)
  assert.equal(kart.health, 100)
  assert.equal(kart.speed, 0)
})
