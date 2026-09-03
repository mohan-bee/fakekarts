import assert from 'node:assert/strict'
import test from 'node:test'
import { containOnRaceTrack, hasWon, raceProgress } from './match.js'

test('battle ends at five kills and race ends at the finish line', () => {
  assert.equal(hasWon('battle', 4, 999), false)
  assert.equal(hasWon('battle', 5, 0), true)
  assert.equal(hasWon('race', 99, 95), false)
  assert.equal(hasWon('race', 0, 96), true)
  assert.equal(hasWon('race', 0, 96, 20), false)
  assert.equal(raceProgress(-200), 0)
  assert.equal(raceProgress(999), 192)
  const kart = { x: 15, speed: 20 }
  containOnRaceTrack(kart)
  assert.equal(kart.x, 11.2)
  assert.equal(kart.speed, 13)
})
