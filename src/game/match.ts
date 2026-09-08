import type { KartState } from './physics'

export type MatchMode = 'battle' | 'race' | 'combat-race'
export const BATTLE_KILLS_TO_WIN = 10
export const RACE_LAPS = 3
export const TRACK_RADIUS = 70
export const TRACK_HALF_WIDTH = 12
export const CHECKPOINT_COUNT = 12
export const MODE_LABELS: Record<MatchMode, string> = {
  battle: 'DEATHMATCH · FIRST TO 10', race: 'CIRCUIT · 3 LAPS', 'combat-race': 'COMBAT CIRCUIT · 3 LAPS',
}
export const isMatchMode = (value: unknown): value is MatchMode => value === 'battle' || value === 'race' || value === 'combat-race'
export const weaponsEnabled = (mode: MatchMode) => mode !== 'race'
export type RaceState = { checkpoints: number; elapsed: number; lapStartedAt: number; bestLap: number | null }
export const createRaceState = (): RaceState => ({ checkpoints: 0, elapsed: 0, lapStartedAt: 0, bestLap: null })
export const checkpointAt = (index: number) => {
  const angle = index / CHECKPOINT_COUNT * Math.PI * 2
  return { x: Math.cos(angle) * TRACK_RADIUS, z: Math.sin(angle) * TRACK_RADIUS, heading: -angle }
}

export const raceSpawn = (checkpoints: number, driverIndex: number) => {
  const gate = checkpointAt(checkpoints)
  const lane = (driverIndex % 4 - 1.5) * 4
  const row = Math.floor(driverIndex / 4) * 5
  return { x: gate.x + Math.cos(gate.heading) * lane - Math.sin(gate.heading) * row, z: gate.z - Math.sin(gate.heading) * lane - Math.cos(gate.heading) * row, heading: gate.heading }
}

// Gates must be crossed forwards, in order, at road height. Jumping the infield cannot earn a lap.
export function advanceRace(race: RaceState, previous: KartState, current: KartState, dt: number) {
  if (race.checkpoints >= CHECKPOINT_COUNT * RACE_LAPS) return
  race.elapsed += dt
  const gate = checkpointAt(race.checkpoints + 1)
  const tx = Math.sin(gate.heading), tz = Math.cos(gate.heading)
  const before = (previous.x - gate.x) * tx + (previous.z - gate.z) * tz
  const after = (current.x - gate.x) * tx + (current.z - gate.z) * tz
  if (before > 0 || after <= 0) return
  const fraction = -before / (after - before)
  const x = previous.x + (current.x - previous.x) * fraction
  const z = previous.z + (current.z - previous.z) * fraction
  const y = (previous.y ?? 0) + ((current.y ?? 0) - (previous.y ?? 0)) * fraction
  if (Math.hypot(x - gate.x, z - gate.z) > TRACK_HALF_WIDTH || y > 3) return
  race.checkpoints++
  if (race.checkpoints % CHECKPOINT_COUNT === 0) {
    const crossingTime = race.elapsed - dt * (1 - fraction)
    const lap = crossingTime - race.lapStartedAt
    race.bestLap = Math.min(race.bestLap ?? Infinity, lap)
    race.lapStartedAt = crossingTime
  }
}
export const raceProgress = (race: RaceState, state: KartState) => {
  const angle = (Math.atan2(state.z, state.x) + Math.PI * 2) % (Math.PI * 2)
  const sector = angle / (Math.PI * 2) * CHECKPOINT_COUNT
  const delta = sector - race.checkpoints % CHECKPOINT_COUNT
  const signedDelta = (delta + CHECKPOINT_COUNT * 1.5) % CHECKPOINT_COUNT - CHECKPOINT_COUNT / 2
  const partial = Math.max(0, Math.min(.999, signedDelta))
  return Math.min(RACE_LAPS * CHECKPOINT_COUNT, race.checkpoints + partial)
}
export const hasWon = (mode: MatchMode, kills: number, checkpoints: number) => mode === 'battle'
  ? kills >= BATTLE_KILLS_TO_WIN : checkpoints >= CHECKPOINT_COUNT * RACE_LAPS
export const containOnRaceTrack = (state: KartState) => {
  const radius = Math.hypot(state.x, state.z)
  const limit = Math.max(TRACK_RADIUS - TRACK_HALF_WIDTH + 2, Math.min(TRACK_RADIUS + TRACK_HALF_WIDTH - 2, radius))
  if (radius === limit) return
  state.x = radius ? state.x / radius * limit : limit
  state.z = radius ? state.z / radius * limit : 0
  state.speed *= .65
}
export const formatTime = (seconds: number | null) => seconds === null ? '—' : `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(2).padStart(5, '0')}`
export type MatchStats = { shots: number; hits: number; kills: number; deaths: number }
export const accuracy = (stats: MatchStats) => stats.shots ? Math.round(stats.hits / stats.shots * 100) : 0
