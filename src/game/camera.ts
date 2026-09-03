import * as THREE from 'three'
import type { KartState } from './physics'
import type { GameSettings } from './settings'

export const stepReverseView = (current: number, enabled: boolean, dt: number) => {
  const target = enabled ? 1 : 0
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-5 * dt))
}

export class ChaseCamera {
  private lookAt = new THREE.Vector3()
  private reverseView = 0
  private reverseEnabled = false

  constructor(private camera: THREE.PerspectiveCamera) {}

  toggleReverse() { return this.reverseEnabled = !this.reverseEnabled }

  snap(state: KartState) {
    this.camera.position.set(state.x - Math.sin(state.heading) * 13, 8, state.z - Math.cos(state.heading) * 13)
    this.lookAt.set(state.x, 1.4, state.z)
    this.camera.lookAt(this.lookAt)
  }

  update(state: KartState, dt: number, settings: GameSettings) {
    const speed = Math.abs(state.speed)
    const distance = settings.cameraDistance + speed * .06
    this.reverseView = stepReverseView(this.reverseView, this.reverseEnabled, dt)
    const cameraHeading = state.heading + Math.PI * this.reverseView
    const desired = new THREE.Vector3(
      state.x - Math.sin(cameraHeading) * distance,
      (state.y ?? 0) + settings.cameraHeight + speed * .025,
      state.z - Math.cos(cameraHeading) * distance,
    )
    const focusDirection = Math.cos(Math.PI * this.reverseView)
    const focus = new THREE.Vector3(
      state.x + Math.sin(state.heading) * (3 + speed * .1) * focusDirection,
      (state.y ?? 0) + 1.3,
      state.z + Math.cos(state.heading) * (3 + speed * .1) * focusDirection,
    )
    this.camera.position.lerp(desired, 1 - Math.exp(-6 * dt))
    this.lookAt.lerp(focus, 1 - Math.exp(-9 * dt))
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, 58 + Math.min(speed, 30) * .18, 1 - Math.exp(-3 * dt))
    this.camera.updateProjectionMatrix()
    this.camera.lookAt(this.lookAt)
  }
}
