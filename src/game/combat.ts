import type { KartState } from './physics'

export const MAX_HEALTH = 100
export const PISTOL_DAMAGE = 25

export type CollisionTarget = { x: number; y?: number; z: number }

export function takeDamage(state: Pick<KartState, 'health'>, damage: number) {
  state.health = Math.max(0, Math.min(MAX_HEALTH, (state.health ?? MAX_HEALTH) - Math.max(0, damage)))
  return state.health === 0
}

export function respawn(state: KartState) {
  Object.assign(state, { x: 0, y: 0, z: 12, heading: 0, speed: 0, verticalSpeed: 0, drift: 0, health: MAX_HEALTH })
}

export function resolveKartCollision(state: KartState, target: CollisionTarget) {
  if (Math.abs((state.y ?? 0) - (target.y ?? 0)) > 2.2) return false
  const dx = state.x - target.x
  const dz = state.z - target.z
  const distance = Math.hypot(dx, dz)
  if (distance >= 3.6) return false
  const nx = distance ? dx / distance : Math.sin(state.heading)
  const nz = distance ? dz / distance : Math.cos(state.heading)
  state.x = target.x + nx * 3.6
  state.z = target.z + nz * 3.6
  state.speed *= -.4
  return true
}
