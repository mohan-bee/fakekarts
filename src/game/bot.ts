import { shortestTurn } from './interpolation.js'
import type { Controls, KartState } from './physics'

export function botControls(state: KartState, target: KartState): Controls {
  const heading = Math.atan2(target.x - state.x, target.z - state.z)
  const turn = shortestTurn(state.heading, heading)
  const distance = Math.hypot(target.x - state.x, target.z - state.z)
  return {
    // Keep rolling while aiming: ground karts cannot turn on the spot.
    forward: distance > 18 || Math.abs(turn) > .12,
    back: false, left: turn > .04, right: turn < -.04, drift: false,
    fire: Math.abs(turn) < .16 && distance < 65 && Math.abs((target.y ?? 0) - (state.y ?? 0)) < 2,
  }
}
