import * as THREE from 'three'
import type { KartState } from './physics'

type Particle = { mesh: THREE.Mesh; velocity: THREE.Vector3; life: number; duration: number; smoke: boolean }

export class Effects {
  private particles: Particle[] = []
  private exhaustTimers = new Map<string, number>()
  private driftTimer = 0
  private jetpackTimer = 0
  private smokeGeometry = new THREE.SphereGeometry(.42, 7, 5)
  private debrisGeometry = new THREE.BoxGeometry(.35, .18, .7)
  private dropletGeometry = new THREE.SphereGeometry(.2, 7, 5)
  private shockwaveGeometry = new THREE.SphereGeometry(.65, 12, 8)

  constructor(private scene: THREE.Scene) {}

  exhaust(state: KartState, dt: number, color: THREE.ColorRepresentation = '#d9dde2', id = 'local') {
    const timer = (this.exhaustTimers.get(id) ?? 0) - dt
    this.exhaustTimers.set(id, timer)
    if (Math.abs(state.speed) < 2 || timer > 0) return
    this.exhaustTimers.set(id, .055 + Math.random() * .045)
    this.spawn(
      new THREE.Vector3(state.x - Math.sin(state.heading) * 2.4, (state.y ?? 0) + .75, state.z - Math.cos(state.heading) * 2.4),
      new THREE.Vector3((Math.random() - .5) * .7, 1.3 + Math.random(), (Math.random() - .5) * .7),
      true,
      color,
    )
  }

  forgetExhaust(id: string) { this.exhaustTimers.delete(id) }

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

  jetpack(state: KartState, dt: number, thrusting: boolean) {
    this.jetpackTimer -= dt
    if (!thrusting || this.jetpackTimer > 0) return
    this.jetpackTimer = .045
    for (const side of [-.65, .65]) this.spawn(
      new THREE.Vector3(state.x - Math.sin(state.heading) * 1.7 + Math.cos(state.heading) * side, (state.y ?? 0) + .55, state.z - Math.cos(state.heading) * 1.7 - Math.sin(state.heading) * side),
      new THREE.Vector3((Math.random() - .5) * .5, -2.8, (Math.random() - .5) * .5),
      true,
      Math.random() > .5 ? '#ffd447' : '#ff6b3d',
      .45,
      .65,
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
    const shockwave = new THREE.Mesh(
      this.shockwaveGeometry,
      new THREE.MeshBasicMaterial({ color: '#ffb12b', transparent: true, opacity: .75, wireframe: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    )
    shockwave.position.copy(position)
    this.scene.add(shockwave)
    this.particles.push({ mesh: shockwave, velocity: new THREE.Vector3(), life: .45, duration: .45, smoke: true })
    for (let i = 0; i < 4; i++) this.spawn(
      position.clone(),
      new THREE.Vector3((Math.random() - .5) * 2, 1 + Math.random() * 2, (Math.random() - .5) * 2),
      true,
      i % 2 ? '#fff7c4' : '#ff9e2f',
      .35,
      .9,
    )
    for (let i = 0; i < 18; i++) this.spawn(
      position.clone(),
      new THREE.Vector3((Math.random() - .5) * 15, 3 + Math.random() * 10, (Math.random() - .5) * 15),
      false,
      i % 3 ? '#ffd447' : '#ff664f',
      .8,
      .45,
    )
    for (let i = 0; i < 5; i++) this.spawn(
      position.clone(),
      new THREE.Vector3((Math.random() - .5) * 2.5, 2 + Math.random() * 2, (Math.random() - .5) * 2.5),
      true,
      '#505968',
      .85,
      .75,
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

  eliminationBurst(position: THREE.Vector3) {
    const pulse = new THREE.Mesh(
      this.shockwaveGeometry,
      new THREE.MeshBasicMaterial({ color: '#ff1738', transparent: true, opacity: .82, wireframe: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    )
    pulse.position.copy(position)
    this.scene.add(pulse)
    this.particles.push({ mesh: pulse, velocity: new THREE.Vector3(), life: .65, duration: .65, smoke: true })
    for (let i = 0; i < 34; i++) this.spawn(
      position.clone(),
      new THREE.Vector3((Math.random() - .5) * 13, 3 + Math.random() * 10, (Math.random() - .5) * 13),
      false,
      i % 3 ? '#e31b3d' : '#7d1028',
      1.3,
      .6 + Math.random() * 1.35,
      this.dropletGeometry,
    )
    for (let i = 0; i < 7; i++) this.spawn(
      position.clone(),
      new THREE.Vector3((Math.random() - .5) * 3, 2 + Math.random() * 3, (Math.random() - .5) * 3),
      true,
      '#6b1628',
      1.1,
      .7,
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
        ;(particle.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, particle.life / particle.duration) * .65
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

  private spawn(position: THREE.Vector3, velocity: THREE.Vector3, smoke: boolean, color?: THREE.ColorRepresentation, duration = smoke ? 1.15 : 1.8, scale = 1, geometry?: THREE.BufferGeometry) {
    const material = smoke
      ? new THREE.MeshBasicMaterial({ color: color ?? '#d9dde2', transparent: true, opacity: .55, depthWrite: false })
      : new THREE.MeshToonMaterial({ color: color ?? '#c8793d' })
    const particle = new THREE.Mesh(geometry ?? (smoke ? this.smokeGeometry : this.debrisGeometry), material)
    particle.position.copy(position)
    particle.scale.setScalar(scale)
    particle.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3)
    particle.castShadow = !smoke
    this.scene.add(particle)
    this.particles.push({ mesh: particle, velocity, life: duration, duration, smoke })
  }
}
