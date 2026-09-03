import assert from 'node:assert/strict'
import test from 'node:test'
import { COSMETICS, cosmeticAt } from './cosmetics.js'

test('garage offers ten unique cosmetic loadouts', () => {
  assert.equal(COSMETICS.length, 10)
  assert.equal(new Set(COSMETICS.map(cosmetic => cosmetic.id)).size, 10)
  assert.equal(new Set(COSMETICS.map(cosmetic => cosmetic.name)).size, 10)
})

test('unknown cosmetic ids use the default loadout', () => {
  assert.equal(cosmeticAt(404), COSMETICS[0])
})
