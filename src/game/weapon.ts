import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { ARENA_RADIUS } from './arena.js'
import { PISTOL_DAMAGE } from './combat.js'
import type { Effects } from './effects'
import { breakObstacle, type Obstacle } from './obstacles.js'
import type { KartState } from './physics'

type Bullet = { model: THREE.Group; trail: THREE.Mesh[]; velocity: THREE.Vector3; dead: boolean }
export type WeaponTarget = { id: string; object: THREE.Object3D }

export const stepBullet = (position: THREE.Vector3, velocity: THREE.Vector3, dt: number) => {
  position.addScaledVector(velocity, dt)
}

export const distanceToSegmentSquared = (px: number, py: number, pz: number, start: THREE.Vector3, end: THREE.Vector3) => {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const dz = end.z - start.z
  const lengthSquared = dx * dx + dy * dy + dz * dz
  const amount = lengthSquared ? THREE.MathUtils.clamp(((px - start.x) * dx + (py - start.y) * dy + (pz - start.z) * dz) / lengthSquared, 0, 1) : 0
  const x = start.x + dx * amount - px
  const y = start.y + dy * amount - py
  const z = start.z + dz * amount - pz
  return x * x + y * y + z * z
}

export class WeaponSystem {
  private steelMaterial = new THREE.MeshToonMaterial({ color: '#6f7f94' })
  private accentMaterial = new THREE.MeshToonMaterial({ color: '#ff5a4f' })
  private bulletMaterial = new THREE.MeshToonMaterial({ color: '#c88a35' })
  private bulletTipMaterial = new THREE.MeshToonMaterial({ color: '#e0a46a' })
  private holder = new THREE.Group()
  private slide = new THREE.Mesh()
  private muzzle = new THREE.Object3D()
  private flash = new THREE.Mesh(new THREE.SphereGeometry(.28, 8, 6), new THREE.MeshBasicMaterial({ color: '#fff09a' }))
  private bullets: Bullet[] = []
  private trailGeometry = new THREE.BoxGeometry(.08, .08, .7)
  private trailMaterials = [.2, .12, .06].map(opacity => new THREE.MeshBasicMaterial({ color: '#fff4c7', transparent: true, opacity, depthWrite: false }))
  private bulletTemplate = this.createBulletModel()
  private cooldown = 0
  private recoil = 0

  constructor(private scene: THREE.Scene, kart: THREE.Group, private effects: Effects) {
    this.buildModel()
    kart.add(this.holder)
  }

  get bulletCount() { return this.bullets.length }

  setSkin(primary: THREE.ColorRepresentation, accent: THREE.ColorRepresentation) {
    this.steelMaterial.color.set(primary)
    this.accentMaterial.color.set(accent)
    this.bulletMaterial.color.set(primary)
    this.bulletTipMaterial.color.set(accent)
    for (const material of this.trailMaterials) material.color.set(accent)
  }

  clear() {
    for (const bullet of this.bullets) this.scene.remove(bullet.model, ...bullet.trail)
    this.bullets = []
  }

  update(state: KartState, obstacles: Obstacle[], targets: WeaponTarget[], firing: boolean, dt: number, onHit: (id: string, damage: number) => void, onFire: () => void = () => {}) {
    this.cooldown = Math.max(0, this.cooldown - dt)
    this.recoil = Math.max(0, this.recoil - dt * 7)
    this.slide.position.z = .35 - this.recoil * .28
    this.flash.visible = this.recoil > .62
    this.flash.scale.setScalar(.7 + this.recoil * .7)
    this.holder.rotation.y = Math.sin(performance.now() * .004) * .012
    if (firing && this.shoot(state)) onFire()

    for (const bullet of this.bullets) {
      for (let i = bullet.trail.length - 1; i > 0; i--) bullet.trail[i].position.copy(bullet.trail[i - 1].position)
      bullet.trail[0].position.copy(bullet.model.position)
      const previous = bullet.model.position.clone()
      stepBullet(bullet.model.position, bullet.velocity, dt)
      const target = targets.find(({ object }) => {
        return distanceToSegmentSquared(object.position.x, object.position.y + 1.2, object.position.z, previous, bullet.model.position) < 4.8
      })
      if (target) {
        this.effects.bulletImpact(bullet.model.position)
        onHit(target.id, PISTOL_DAMAGE)
        bullet.dead = true
        continue
      }
      const hit = obstacles.find(obstacle => !obstacle.broken && Math.min(previous.y, bullet.model.position.y) <= obstacle.height && distanceToSegmentSquared(obstacle.x, Math.min(obstacle.height, bullet.model.position.y), obstacle.z, previous, bullet.model.position) <= obstacle.radius * obstacle.radius)
      if (hit) {
        if (hit.breakable) { breakObstacle(hit); this.effects.crateBurst(hit.x, hit.z) }
        this.effects.bulletImpact(bullet.model.position)
        bullet.dead = true
      } else if (Math.hypot(bullet.model.position.x, bullet.model.position.z) > ARENA_RADIUS + 2) {
        this.effects.bulletImpact(bullet.model.position)
        bullet.dead = true
      }
    }
    for (let i = this.bullets.length - 1; i >= 0; i--) if (this.bullets[i].dead) {
      this.scene.remove(this.bullets[i].model)
      for (const ghost of this.bullets[i].trail) this.scene.remove(ghost)
      this.bullets.splice(i, 1)
    }
  }

  shoot(state: KartState) {
    if (this.cooldown > 0) return false
    this.holder.updateWorldMatrix(true, true)
    const position = this.muzzle.getWorldPosition(new THREE.Vector3())
    const direction = new THREE.Vector3(0, 0, 1).applyQuaternion(this.muzzle.getWorldQuaternion(new THREE.Quaternion())).normalize()
    const bullet = this.bulletTemplate.clone()
    const trail = this.trailMaterials.map((material, index) => {
      const ghost = new THREE.Mesh(this.trailGeometry, material)
      ghost.position.copy(position)
      ghost.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction)
      ghost.scale.setScalar(1 - index * .2)
      ghost.userData.projectileTrail = true
      this.scene.add(ghost)
      return ghost
    })
    bullet.position.copy(position)
    bullet.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction)
    this.scene.add(bullet)
    const velocity = direction.clone().multiplyScalar(38 + Math.max(0, state.speed) * .35)
    this.bullets.push({ model: bullet, trail, velocity, dead: false })
    this.effects.muzzleSmoke(position, direction)
    this.cooldown = .24
    this.recoil = 1
    return true
  }

  private createBulletModel() {
    const bullet = new THREE.Group()
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .85, 10), this.bulletMaterial)
    const tip = new THREE.Mesh(new THREE.ConeGeometry(.16, .35, 10), this.bulletTipMaterial)
    body.rotation.x = tip.rotation.x = Math.PI / 2
    tip.position.z = .6
    bullet.add(body, tip)
    bullet.scale.setScalar(1.5)
    bullet.userData.projectile = true
    return bullet
  }

  private buildModel() {
    const dark = new THREE.MeshToonMaterial({ color: '#222b3d' })
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.48, .62, .28, 10), dark)
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.15, .2, .72, 8), this.steelMaterial)
    post.position.y = .45
    const pistol = new THREE.Group()
    pistol.position.y = 1.02
    this.slide = new THREE.Mesh(new RoundedBoxGeometry(.58, .46, 1.55, 3, .1), this.steelMaterial)
    this.slide.position.z = .35
    const frame = new THREE.Mesh(new RoundedBoxGeometry(.5, .42, .95, 2, .08), dark)
    frame.position.set(0, -.28, .05)
    const grip = new THREE.Mesh(new RoundedBoxGeometry(.42, .9, .48, 2, .08), this.accentMaterial)
    grip.position.set(0, -.72, -.18)
    grip.rotation.x = -.25
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, 1.15, 10), dark)
    barrel.rotation.x = Math.PI / 2
    barrel.position.set(0, .03, 1.05)
    const sight = new THREE.Mesh(new THREE.BoxGeometry(.12, .12, .32), this.accentMaterial)
    sight.position.set(0, .31, .68)
    this.muzzle.position.set(0, .03, 1.68)
    this.flash.position.copy(this.muzzle.position)
    this.flash.visible = false
    pistol.add(this.slide, frame, grip, barrel, sight, this.muzzle, this.flash)
    for (const object of [base, post, this.slide, frame, grip, barrel, sight]) object.castShadow = true
    this.holder.position.set(0, 1.05, 2.15)
    this.holder.add(base, post, pistol)
  }
}
