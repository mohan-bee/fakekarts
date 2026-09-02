import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { PISTOL_DAMAGE } from './combat.js'
import type { Effects } from './effects'
import { breakObstacle, obstacleAt, type Obstacle } from './obstacles.js'
import type { KartState } from './physics'

type Bullet = { mesh: THREE.Mesh; trail: THREE.Mesh[]; velocity: THREE.Vector3; life: number }
export type WeaponTarget = { id: string; object: THREE.Object3D }

export const stepBullet = (position: THREE.Vector3, velocity: THREE.Vector3, dt: number) => {
  position.addScaledVector(velocity, dt)
  velocity.y -= 9.8 * dt
}

export class WeaponSystem {
  private holder = new THREE.Group()
  private slide = new THREE.Mesh()
  private muzzle = new THREE.Object3D()
  private flash = new THREE.Mesh(new THREE.SphereGeometry(.28, 8, 6), new THREE.MeshBasicMaterial({ color: '#fff09a' }))
  private bullets: Bullet[] = []
  private bulletGeometry = new THREE.SphereGeometry(.2, 8, 6)
  private bulletMaterial = new THREE.MeshBasicMaterial({ color: '#fff4a3' })
  private trailMaterials = [.4, .3, .2, .12, .06].map(opacity => new THREE.MeshBasicMaterial({ color: '#ffd447', transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }))
  private cooldown = 0
  private recoil = 0

  constructor(private scene: THREE.Scene, kart: THREE.Group, private effects: Effects) {
    this.buildModel()
    kart.add(this.holder)
  }

  get bulletCount() { return this.bullets.length }

  clear() {
    for (const bullet of this.bullets) this.scene.remove(bullet.mesh, ...bullet.trail)
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
      bullet.life -= dt
      for (let i = bullet.trail.length - 1; i > 0; i--) bullet.trail[i].position.copy(bullet.trail[i - 1].position)
      bullet.trail[0].position.copy(bullet.mesh.position)
      stepBullet(bullet.mesh.position, bullet.velocity, dt)
      const target = targets.find(({ object }) => {
        const dx = bullet.mesh.position.x - object.position.x
        const dy = bullet.mesh.position.y - object.position.y - 1.2
        const dz = bullet.mesh.position.z - object.position.z
        return dx * dx + dy * dy + dz * dz < 4.8
      })
      if (target) {
        this.effects.bulletImpact(bullet.mesh.position)
        this.effects.combatBurst(bullet.mesh.position, false)
        onHit(target.id, PISTOL_DAMAGE)
        bullet.life = 0
        continue
      }
      const hit = obstacleAt(bullet.mesh.position.x, bullet.mesh.position.y, bullet.mesh.position.z, obstacles)
      if (hit) {
        if (hit.breakable) { breakObstacle(hit); this.effects.crateBurst(hit.x, hit.z) }
        this.effects.bulletImpact(bullet.mesh.position)
        bullet.life = 0
      } else if (bullet.mesh.position.y <= .1) {
        this.effects.bulletImpact(bullet.mesh.position)
        bullet.life = 0
      }
    }
    for (let i = this.bullets.length - 1; i >= 0; i--) if (this.bullets[i].life <= 0) {
      this.scene.remove(this.bullets[i].mesh)
      for (const ghost of this.bullets[i].trail) this.scene.remove(ghost)
      this.bullets.splice(i, 1)
    }
  }

  shoot(state: KartState) {
    if (this.cooldown > 0) return false
    this.holder.updateWorldMatrix(true, true)
    const position = this.muzzle.getWorldPosition(new THREE.Vector3())
    const direction = new THREE.Vector3(0, 0, 1).applyQuaternion(this.muzzle.getWorldQuaternion(new THREE.Quaternion())).normalize()
    const bullet = new THREE.Mesh(this.bulletGeometry, this.bulletMaterial)
    const trail = this.trailMaterials.map((material, index) => {
      const ghost = new THREE.Mesh(this.bulletGeometry, material)
      ghost.position.copy(position)
      ghost.scale.setScalar(1 - index * .12)
      this.scene.add(ghost)
      return ghost
    })
    bullet.add(new THREE.PointLight('#ffd447', 3, 7, 2))
    bullet.position.copy(position)
    bullet.scale.setScalar(1.35)
    bullet.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction)
    this.scene.add(bullet)
    this.bullets.push({ mesh: bullet, trail, velocity: direction.multiplyScalar(42 + Math.max(0, state.speed) * .5).add(new THREE.Vector3(0, 1.2, 0)), life: 2.2 })
    this.effects.muzzleSmoke(position, direction.normalize())
    this.cooldown = .24
    this.recoil = 1
    return true
  }

  private buildModel() {
    const dark = new THREE.MeshToonMaterial({ color: '#222b3d' })
    const steel = new THREE.MeshToonMaterial({ color: '#6f7f94' })
    const red = new THREE.MeshToonMaterial({ color: '#ff5a4f' })
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.48, .62, .28, 10), dark)
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.15, .2, .72, 8), steel)
    post.position.y = .45
    const pistol = new THREE.Group()
    pistol.position.y = 1.02
    this.slide = new THREE.Mesh(new RoundedBoxGeometry(.58, .46, 1.55, 3, .1), steel)
    this.slide.position.z = .35
    const frame = new THREE.Mesh(new RoundedBoxGeometry(.5, .42, .95, 2, .08), dark)
    frame.position.set(0, -.28, .05)
    const grip = new THREE.Mesh(new RoundedBoxGeometry(.42, .9, .48, 2, .08), red)
    grip.position.set(0, -.72, -.18)
    grip.rotation.x = -.25
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, 1.15, 10), dark)
    barrel.rotation.x = Math.PI / 2
    barrel.position.set(0, .03, 1.05)
    const sight = new THREE.Mesh(new THREE.BoxGeometry(.12, .12, .32), red)
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
