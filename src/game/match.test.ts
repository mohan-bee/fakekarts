import assert from 'node:assert/strict'
import test from 'node:test'
import { accuracy, advanceRace, checkpointAt, CHECKPOINT_COUNT, containOnRaceTrack, createRaceState, hasWon, isMatchMode, raceProgress, RACE_LAPS, weaponsEnabled } from './match.js'

const cross = (race: ReturnType<typeof createRaceState>, index: number, reverse = false, y = 0, radialOffset = 0) => {
  const gate = checkpointAt(index)
  const tx = Math.sin(gate.heading), tz = Math.cos(gate.heading)
  const x = gate.x + Math.cos(gate.heading) * radialOffset
  const z = gate.z - Math.sin(gate.heading) * radialOffset
  const direction = reverse ? -1 : 1
  advanceRace(race,
    { x: x - tx * direction, z: z - tz * direction, y, heading: gate.heading, speed: 20 },
    { x: x + tx * direction, z: z + tz * direction, y, heading: gate.heading, speed: 20 }, 1)
}

test('three ordered laps are required and finish crossing records lap times', () => {
  const race = createRaceState()
  for (let i = 1; i <= CHECKPOINT_COUNT * RACE_LAPS; i++) {
    assert.equal(hasWon('race', 100, race.checkpoints), false)
    cross(race, i)
    assert.equal(race.checkpoints, i)
  }
  assert.equal(hasWon('race', 0, race.checkpoints), true)
  assert.equal(hasWon('combat-race', 0, race.checkpoints), true)
  assert.equal(race.bestLap, 11.5)
  const elapsed = race.elapsed
  cross(race, 37)
  assert.equal(race.elapsed, elapsed)
})

test('skipped, reversed, airborne and off-road checkpoints do not count', () => {
  const race = createRaceState()
  cross(race, 5)
  cross(race, 1, true)
  cross(race, 1, false, 8)
  cross(race, 1, false, 0, 20)
  assert.equal(race.checkpoints, 0)
  cross(race, 1)
  cross(race, 1)
  assert.equal(race.checkpoints, 1)
  const progress = raceProgress(race, { ...checkpointAt(2), speed: 0 })
  assert.ok(progress >= 1 && progress < 2)
})

test('race boundaries contain both edges and recover a kart at the center', () => {
  for (const x of [0, 20, 90]) {
    const kart = { x, z: 0, heading: 0, speed: 20 }
    containOnRaceTrack(kart)
    assert.ok(kart.x >= 60 && kart.x <= 80)
    assert.equal(kart.speed, 13)
  }
})

test('mode rules separate racing from combat and count accuracy safely', () => {
  assert.equal(hasWon('battle', 9, 100), false)
  assert.equal(hasWon('battle', 10, 0), true)
  assert.equal(weaponsEnabled('race'), false)
  assert.equal(weaponsEnabled('combat-race'), true)
  assert.equal(isMatchMode('combat-race'), true)
  assert.equal(isMatchMode('ranked'), false)
  assert.equal(accuracy({ shots: 0, hits: 0, kills: 0, deaths: 0 }), 0)
  assert.equal(accuracy({ shots: 8, hits: 3, kills: 0, deaths: 0 }), 38)
})

test('reversing behind the starting line cannot lead a forward-moving driver', () => {
  const race = createRaceState()
  assert.equal(raceProgress(race, { x: 70, z: -1, heading: 0, speed: -5 }), 0)
  assert.ok(raceProgress(race, { x: 70, z: 1, heading: 0, speed: 5 }) > 0)
})

test('a driven kart can complete the circuit through every gate without teleporting', async () => {
  const { stepKart } = await import('./physics.js')
  const race = createRaceState()
  let kart = { x: 70, z: 0, heading: 0, speed: 0 }
  for (let frame = 0; frame < 7200 && !hasWon('race', 0, race.checkpoints); frame++) {
    const ahead = Math.atan2(kart.z, kart.x) + .2
    const desired = Math.atan2(70 * Math.cos(ahead) - kart.x, 70 * Math.sin(ahead) - kart.z)
    const turn = Math.atan2(Math.sin(desired - kart.heading), Math.cos(desired - kart.heading))
    const previous = kart
    kart = stepKart(kart, { forward: true, back: false, left: turn > .015, right: turn < -.015, drift: false, fire: false }, 1 / 60)
    containOnRaceTrack(kart)
    advanceRace(race, previous, kart, 1 / 60)
  }
  assert.equal(race.checkpoints, CHECKPOINT_COUNT * RACE_LAPS)
  assert.ok(race.bestLap !== null && race.bestLap > 10)
})

test('eight-driver grids use separate rows with space between every kart', async () => {
  const { raceSpawn } = await import('./match.js')
  const grid = Array.from({ length: 8 }, (_, index) => raceSpawn(0, index))
  for (let i = 0; i < grid.length; i++) for (let j = i + 1; j < grid.length; j++) {
    assert.ok(Math.hypot(grid[i].x - grid[j].x, grid[i].z - grid[j].z) >= 4)
  }
})
