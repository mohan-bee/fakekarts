import * as THREE from 'three'
import type { KartState } from './physics'

export type PowerupKind = 'rapid' | 'shield' | 'jetpack'

const DURATION: Record<PowerupKind, number> = { rapid: 18, shield: 25, jetpack: 120 }
const COLORS: Record<PowerupKind, string> = { rapid: '#ff5a4f', shield: '#49dcff', jetpack: '#ffd447' }
const SPAWNS: Array<{ kind: PowerupKind; x: number; z: number }> = [
  { kind: 'rapid', x: -42, z: -8 }, { kind: 'shield', x: -4, z: 5 }, { kind: 'jetpack', x: 0, z: 55 },
  { kind: 'rapid', x: 4, z: -48 }, { kind: 'shield', x: -58, z: 34 }, { kind: 'jetpack', x: 62, z: -35 },
]

type Pickup = { kind: PowerupKind; object: THREE.Group; respawn: number }

export class PowerupSystem {
  private timers: Record<PowerupKind, number> = { rapid: 0, shield: 0, jetpack: 0 }
  private pickups: Pickup[]
  private shield: THREE.Mesh
  private time = 0

  constructor(scene: THREE.Scene, kart: THREE.Group) {
    this.pickups = SPAWNS.map(spawn => {
      const object = this.createPickup(spawn.kind)
      object.position.set(spawn.x, 1.7, spawn.z)
      scene.add(object)
      return { kind: spawn.kind, object, respawn: 0 }
    })
    this.shield = new THREE.Mesh(
      new THREE.SphereGeometry(2.65, 16, 10),
      new THREE.MeshBasicMaterial({ color: COLORS.shield, transparent: true, opacity: .16, wireframe: true, depthWrite: false }),
    )
    this.shield.visible = false
    kart.add(this.shield)
  }

  active(kind: PowerupKind) { return this.timers[kind] > 0 }
  remaining(kind: PowerupKind) { return Math.ceil(this.timers[kind]) }

  update(state: KartState, dt: number) {
    this.time += dt
    for (const kind of Object.keys(this.timers) as PowerupKind[]) this.timers[kind] = Math.max(0, this.timers[kind] - dt)
    this.shield.visible = this.active('shield')
    this.shield.rotation.y += dt * 1.8
    let collected: PowerupKind | undefined
    for (const pickup of this.pickups) {
      // ponytail: pickups are per-player; synchronize ownership when contested spawns become part of ranked matches.
      pickup.respawn = Math.max(0, pickup.respawn - dt)
      pickup.object.visible = pickup.respawn === 0
      pickup.object.rotation.y += dt * 1.7
      pickup.object.position.y = 1.7 + Math.sin(this.time * 2.5 + pickup.object.position.x) * .25
      if (pickup.respawn || Math.hypot(state.x - pickup.object.position.x, state.z - pickup.object.position.z) > 3.5) continue
      this.timers[pickup.kind] = DURATION[pickup.kind]
      pickup.respawn = 14
      pickup.object.visible = false
      collected = pickup.kind
    }
    return collected
  }

  applyJetpack(state: KartState, thrusting: boolean, dt: number) {
    if (!thrusting || !this.active('jetpack')) return
    state.y = Math.max(.05, state.y ?? 0)
    state.verticalSpeed = Math.min(11, (state.verticalSpeed ?? 0) + 30 * dt)
  }

  private createPickup(kind: PowerupKind) {
    const group = new THREE.Group()
    const material = new THREE.MeshToonMaterial({ color: COLORS[kind], emissive: COLORS[kind], emissiveIntensity: .25 })
    const core = kind === 'shield'
      ? new THREE.Mesh(new THREE.TorusGeometry(.85, .24, 8, 18), material)
      : new THREE.Mesh(kind === 'jetpack' ? new THREE.CapsuleGeometry(.45, 1, 5, 8) : new THREE.CylinderGeometry(.25, .25, 1.5, 9), material)
    if (kind === 'rapid') core.rotation.z = Math.PI / 2
    core.castShadow = true
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.25, .08, 6, 24), new THREE.MeshBasicMaterial({ color: COLORS[kind] }))
    ring.rotation.x = Math.PI / 2
    group.add(core, ring)
    return group
  }
}
