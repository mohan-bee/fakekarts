import * as THREE from 'three'
import type { KartState } from './physics'

type Particle = { mesh: THREE.Mesh; velocity: THREE.Vector3; life: number; smoke: boolean }

export class Effects {
  private particles: Particle[] = []
  private smokeTimer = 0
  private driftTimer = 0
  private smokeGeometry = new THREE.SphereGeometry(.42, 7, 5)
  private debrisGeometry = new THREE.BoxGeometry(.35, .18, .7)

  constructor(private scene: THREE.Scene) {}

  exhaust(state: KartState, dt: number) {
    this.smokeTimer -= dt
    if (Math.abs(state.speed) < 2 || this.smokeTimer > 0) return
    this.smokeTimer = .055 + Math.random() * .045
    this.spawn(
      new THREE.Vector3(state.x - Math.sin(state.heading) * 2.4, (state.y ?? 0) + .75, state.z - Math.cos(state.heading) * 2.4),
      new THREE.Vector3((Math.random() - .5) * .7, 1.3 + Math.random(), (Math.random() - .5) * .7),
      true,
    )
  }

  drift(state: KartState, dt: number) {
    this.driftTimer -= dt
    if (Math.abs(state.drift ?? 0) < .08 || Math.abs(state.speed) < 8 || this.driftTimer > 0 || (state.y ?? 0) > .3) return
    this.driftTimer = .035
    for (const side of [-1, 1]) this.spawn(
      new THREE.Vector3(
        state.x - Math.sin(state.heading) * 1.35 + Math.cos(state.heading) * side * 1.35,
        .42,
        state.z - Math.cos(state.heading) * 1.35 - Math.sin(state.heading) * side * 1.35,
      ),
      new THREE.Vector3((Math.random() - .5) * .4, .7 + Math.random() * .5, (Math.random() - .5) * .4),
      true,
    )
  }

  crateBurst(x: number, z: number) {
    for (let i = 0; i < 18; i++) this.spawn(
      new THREE.Vector3(x, 1.8, z),
      new THREE.Vector3((Math.random() - .5) * 9, 3 + Math.random() * 7, (Math.random() - .5) * 9),
      i < 7,
    )
  }

  bulletImpact(position: THREE.Vector3) {
    for (let i = 0; i < 9; i++) this.spawn(
      position.clone(),
      new THREE.Vector3((Math.random() - .5) * 7, 2 + Math.random() * 5, (Math.random() - .5) * 7),
      false,
      '#ffd447',
    )
  }

  combatBurst(position: THREE.Vector3, destroyed: boolean) {
    const count = destroyed ? 28 : 12
    for (let i = 0; i < count; i++) this.spawn(
      position.clone(),
      new THREE.Vector3((Math.random() - .5) * 10, 2 + Math.random() * 8, (Math.random() - .5) * 10),
      i < count / 3,
      i % 2 ? '#ff5a4f' : '#ffd447',
    )
  }

  muzzleSmoke(position: THREE.Vector3, direction: THREE.Vector3) {
    for (let i = 0; i < 3; i++) this.spawn(position.clone(), direction.clone().multiplyScalar(2 + Math.random() * 2).add(new THREE.Vector3(0, .7, 0)), true)
  }

  update(dt: number) {
    for (const particle of this.particles) {
      particle.life -= dt
      particle.mesh.position.addScaledVector(particle.velocity, dt)
      if (particle.smoke) {
        particle.velocity.y += .3 * dt
        particle.mesh.scale.addScalar(dt * 1.6)
        ;(particle.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, particle.life / 1.15) * .55
      } else {
        particle.velocity.y -= 18 * dt
        particle.mesh.rotation.x += dt * 8
        particle.mesh.rotation.z += dt * 5
      }
    }
    for (let i = this.particles.length - 1; i >= 0; i--) if (this.particles[i].life <= 0 || this.particles[i].mesh.position.y < 0) {
      ;(this.particles[i].mesh.material as THREE.Material).dispose()
      this.scene.remove(this.particles[i].mesh)
      this.particles.splice(i, 1)
    }
  }

  private spawn(position: THREE.Vector3, velocity: THREE.Vector3, smoke: boolean, color?: THREE.ColorRepresentation) {
    const material = smoke
      ? new THREE.MeshBasicMaterial({ color: color ?? '#d9dde2', transparent: true, opacity: .55, depthWrite: false })
      : new THREE.MeshToonMaterial({ color: color ?? '#c8793d' })
    const particle = new THREE.Mesh(smoke ? this.smokeGeometry : this.debrisGeometry, material)
    particle.position.copy(position)
    particle.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3)
    particle.castShadow = !smoke
    this.scene.add(particle)
    this.particles.push({ mesh: particle, velocity, life: smoke ? 1.15 : 1.8, smoke })
  }
}
