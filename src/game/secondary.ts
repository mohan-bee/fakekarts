import * as THREE from 'three'
import type { Effects } from './effects'
import type { KartState } from './physics'

export type SecondaryKind = 'grenade' | 'landmine' | 'spring'
export type SecondaryTarget = { id: string; object: THREE.Object3D }

export const isSecondaryKind = (value: unknown): value is SecondaryKind => value === 'grenade' || value === 'landmine' || value === 'spring'

type Item = {
  kind: SecondaryKind
  model: THREE.Group
  velocity: THREE.Vector3
  heading: number
  age: number
  life: number
  dead: boolean
  beacon?: THREE.Mesh
}

export class SecondarySystem {
  private items: Item[] = []
  private cooldown = 0

  constructor(private scene: THREE.Scene, private effects: Effects) {}

  get itemCount() { return this.items.length }

  deploy(state: KartState, kind: SecondaryKind) {
    if (this.cooldown > 0) return false
    const forward = new THREE.Vector3(Math.sin(state.heading), 0, Math.cos(state.heading))
    const model = this.createModel(kind)
    const behind = kind === 'grenade' ? 2.7 : -2.6
    model.position.set(state.x + forward.x * behind, (state.y ?? 0) + (kind === 'grenade' ? 1.6 : .25), state.z + forward.z * behind)
    this.scene.add(model)
    this.items.push({
      kind,
      model,
      velocity: kind === 'grenade' ? forward.multiplyScalar(19).setY(9) : new THREE.Vector3(),
      heading: state.heading,
      age: 0,
      life: kind === 'grenade' ? 2.4 : 45,
      dead: false,
      beacon: model.userData.beacon,
    })
    this.cooldown = kind === 'grenade' ? 4 : 3
    return true
  }

  update(dt: number, targets: SecondaryTarget[], onDamage: (id: string, damage: number) => void, onImpulse: (id: string, x: number, z: number, up: number) => void) {
    this.cooldown = Math.max(0, this.cooldown - dt)
    for (const item of this.items) {
      item.age += dt
      item.life -= dt
      item.model.rotation.y += dt * (item.kind === 'grenade' ? 7 : .7)
      if (item.kind === 'grenade') {
        item.velocity.y -= 18 * dt
        item.model.position.addScaledVector(item.velocity, dt)
      }
      if (item.beacon) (item.beacon.material as THREE.MeshBasicMaterial).opacity = Math.sin(item.age * 9) > 0 ? 1 : .18
      const triggerRadius = item.kind === 'grenade' ? 2.6 : 3.2
      const target = item.age > .55 && targets.find(({ object }) => item.model.position.distanceTo(object.position) < triggerRadius)
      if (!target && item.life > 0 && !(item.kind === 'grenade' && item.model.position.y <= .2)) continue
      if (item.kind === 'spring' && !target) { item.dead = true; continue }
      if (item.kind === 'spring' && target) {
        const side = target.id.charCodeAt(0) % 2 ? 1 : -1
        onImpulse(target.id, Math.cos(item.heading) * 14 * side, -Math.sin(item.heading) * 14 * side, 11)
      } else {
        const radius = item.kind === 'landmine' ? 8 : 9
        const damage = item.kind === 'landmine' ? 55 : 45
        for (const hit of targets) if (item.model.position.distanceTo(hit.object.position) <= radius) onDamage(hit.id, damage)
        this.effects.bulletImpact(item.model.position.clone().setY(Math.max(.7, item.model.position.y)))
      }
      item.dead = true
    }
    for (let index = this.items.length - 1; index >= 0; index--) if (this.items[index].dead) {
      this.scene.remove(this.items[index].model)
      this.items.splice(index, 1)
    }
  }

  clear() {
    for (const item of this.items) this.scene.remove(item.model)
    this.items = []
  }

  private createModel(kind: SecondaryKind) {
    const group = new THREE.Group()
    const dark = new THREE.MeshToonMaterial({ color: '#202638' })
    const red = new THREE.MeshBasicMaterial({ color: '#ff334f', transparent: true })
    if (kind === 'grenade') {
      group.add(new THREE.Mesh(new THREE.SphereGeometry(.55, 10, 7), new THREE.MeshToonMaterial({ color: '#58734b' })))
      const pin = new THREE.Mesh(new THREE.TorusGeometry(.24, .06, 6, 12), dark)
      pin.position.y = .62
      pin.rotation.x = Math.PI / 2
      group.add(pin)
    } else if (kind === 'landmine') {
      group.add(new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.2, .32, 12), dark))
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(.14, 7, 5), red)
      beacon.position.y = .28
      group.add(beacon)
      group.userData.beacon = beacon
    } else {
      const spring = new THREE.Mesh(new THREE.TorusKnotGeometry(.42, .1, 40, 6), new THREE.MeshBasicMaterial({ color: '#8bdfff', transparent: true, opacity: .12 }))
      spring.scale.y = .35
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(.11, 7, 5), red)
      beacon.position.y = .2
      group.add(spring, beacon)
      group.userData.beacon = beacon
    }
    for (const child of group.children) child.castShadow = kind !== 'spring'
    return group
  }
}
