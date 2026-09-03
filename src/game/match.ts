export type MatchMode = 'battle' | 'race'

export const BATTLE_KILLS_TO_WIN = 5
export const RACE_START_Z = -96
export const RACE_FINISH_Z = 96

export const isMatchMode = (value: unknown): value is MatchMode => value === 'battle' || value === 'race'
export const raceProgress = (z: number) => Math.max(0, Math.min(RACE_FINISH_Z - RACE_START_Z, z - RACE_START_Z))
export const hasWon = (mode: MatchMode, kills: number, z: number, x = 0) => mode === 'battle' ? kills >= BATTLE_KILLS_TO_WIN : z >= RACE_FINISH_Z && Math.abs(x) <= 12
export const containOnRaceTrack = (state: { x: number; speed: number }) => {
  if (Math.abs(state.x) <= 11.2) return
  state.x = Math.sign(state.x) * 11.2
  state.speed *= .65
}
