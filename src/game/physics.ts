export type KartState = { x: number; z: number; heading: number; speed: number; y?: number; verticalSpeed?: number; drift?: number; health?: number }
export type Controls = { forward: boolean; back: boolean; left: boolean; right: boolean; drift: boolean; fire: boolean }
export type Handling = { steeringSensitivity: number; driftStrength: number }
export const KPH_PER_UNIT = 5.1
export const MAX_SPEED = 150 / KPH_PER_UNIT
export const MAX_REVERSE_SPEED = 70 / KPH_PER_UNIT

export const stepKart = (state: KartState, input: Controls, dt: number, handling: Handling = { steeringSensitivity: 1, driftStrength: 1.15 }): KartState => {
  let speed = state.speed
  if (input.forward) speed += (speed < 0 ? 38 : 24) * dt
  else if (input.back) speed -= (speed > 0 ? 42 : 18) * dt
  else speed -= Math.sign(speed) * Math.min(Math.abs(speed), 3.2 * dt)
  speed = Math.max(-MAX_REVERSE_SPEED, Math.min(MAX_SPEED, speed))

  const steering = Number(input.left) - Number(input.right)
  const drifting = input.drift && speed > 4 && steering !== 0
  const driftTarget = drifting ? -steering * (.35 + speed / MAX_SPEED * .25) * handling.driftStrength : 0
  const drift = (state.drift ?? 0) + (driftTarget - (state.drift ?? 0)) * Math.min(1, dt * (drifting ? 8 : 5))
  const turn = steering * Math.min(1, Math.abs(speed) / 7) * Math.sign(speed || 1)
  const heading = state.heading + turn * (drifting ? 3.1 : 2.15) * handling.steeringSensitivity * dt
  const travelHeading = heading + drift
  return {
    ...state,
    x: state.x + Math.sin(travelHeading) * speed * dt,
    z: state.z + Math.cos(travelHeading) * speed * dt,
    heading,
    speed,
    drift,
  }
}

export const stepGravity = (state: KartState, groundHeight: number, previousGroundHeight: number, dt: number) => {
  let y = state.y ?? 0
  let verticalSpeed = state.verticalSpeed ?? 0
  if (previousGroundHeight > .5 && groundHeight === 0 && y >= previousGroundHeight - .2) verticalSpeed = Math.max(verticalSpeed, Math.abs(state.speed) * .18)
  if (y > groundHeight || verticalSpeed > 0) {
    verticalSpeed -= 22 * dt
    y += verticalSpeed * dt
  }
  if (y <= groundHeight) { y = groundHeight; verticalSpeed = 0 }
  state.y = y
  state.verticalSpeed = verticalSpeed
}
