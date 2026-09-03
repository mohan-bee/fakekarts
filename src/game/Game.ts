import * as THREE from 'three'
import { containInArena, createArena } from './arena'
import { ChaseCamera } from './camera'
import { MAX_HEALTH, respawn, resolveKartCollision, takeDamage } from './combat'
import { cosmeticAt } from './cosmetics'
import { Effects } from './effects'
import { updateHud } from './hud'
import { bindControls } from './input'
import { shortestTurn, smoothingFactor } from './interpolation'
import { createKart, styleKart } from './kart'
import { Multiplayer, type Peer } from './multiplayer'
import { createObstacles, rampHeightAt, rampPitchAt, resolveObstacleCollisions, type Obstacle } from './obstacles'
import { stepGravity, stepKart, type Controls, type KartState } from './physics'
import type { GameSettings } from './settings'
import { WeaponSystem, type WeaponTarget } from './weapon'

export class Game {
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, .1, 250)
  private renderer: THREE.WebGLRenderer
  private chaseCamera = new ChaseCamera(this.camera)
  private effects = new Effects(this.scene)
  private kart = createKart('#ff5a4f')
  private weapon = new WeaponSystem(this.scene, this.kart, this.effects)
  private rival = createKart('#30a9ff')
  private remotes = new Map<string, THREE.Group>()
  private remoteWeapons = new Map<string, WeaponSystem>()
  private multiplayer: Multiplayer
  private obstacles: Obstacle[]
  private state: KartState = { x: 0, y: 0, z: 12, heading: 0, speed: 0, verticalSpeed: 0, health: MAX_HEALTH }
  private controls: Controls = { forward: false, back: false, left: false, right: false, drift: false, fire: false }
  private clock = new THREE.Clock()
  private running = false
  private aiAngle = 0
  private lastSend = 0
  private distanceTravelled = 0
  private groundHeight = 0
  private botHealth = MAX_HEALTH
  private cosmeticId = 0

  constructor(canvas: HTMLCanvasElement, name: () => string, private settings: GameSettings) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    createArena(this.scene)
    this.obstacles = createObstacles(this.scene)
    this.scene.add(this.kart, this.rival)
    new WeaponSystem(this.scene, this.rival, this.effects)
    this.chaseCamera.snap(this.state)
    this.multiplayer = new Multiplayer(name)
    this.setCosmetic(0)
    this.multiplayer.onDamage(damage => this.damagePlayer(damage))
    this.multiplayer.onFire(id => {
      const peer = this.multiplayer.peers.get(id)
      if (peer) this.remoteWeapons.get(id)?.shoot(peer)
    })
    bindControls(this.controls, () => document.querySelector('#rear-view')!.classList.toggle('active', this.chaseCamera.toggleReverse()))
    addEventListener('resize', () => this.resize())
    this.resize()
    this.animate()
  }

  async createRoom() { return this.multiplayer.createRoom() }

  async joinRoom(room: string) { return this.multiplayer.joinRoom(room) }

  onRaceStart(handler: (startAt: number) => void) { this.multiplayer.onRaceStart(handler) }

  onRosterChange(handler: (players: Peer[]) => void) { this.multiplayer.onRosterChange(handler) }

  onPresence(handler: (name: string, action: 'joined' | 'left') => void) { this.multiplayer.onPresence(handler) }

  startRoomRace() { this.multiplayer.startRace() }

  disconnect() { this.multiplayer.disconnect() }

  start() { this.running = true }

  setCosmetic(id: number) {
    const cosmetic = cosmeticAt(id)
    this.cosmeticId = cosmetic.id
    styleKart(this.kart, cosmetic.paint, cosmetic.accent)
    this.weapon.setSkin(cosmetic.gun, cosmetic.accent)
    this.multiplayer?.setCosmetic(cosmetic.id)
  }

  private resize() {
    this.camera.aspect = innerWidth / innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(innerWidth, innerHeight)
  }

  private animate = () => {
    requestAnimationFrame(this.animate)
    const dt = Math.min(this.clock.getDelta(), .05)
    if (this.running) this.update(dt)
    this.renderer.render(this.scene, this.camera)
  }

  private update(dt: number) {
    const previousX = this.state.x
    const previousZ = this.state.z
    this.state = stepKart(this.state, this.controls, dt, this.settings)
    containInArena(this.state)
    for (const obstacle of resolveObstacleCollisions(this.state, this.obstacles)) this.effects.crateBurst(obstacle.x, obstacle.z)
    const groundHeight = rampHeightAt(this.state.x, this.state.z)
    stepGravity(this.state, groundHeight, this.groundHeight, dt)
    this.groundHeight = groundHeight
    this.distanceTravelled += Math.hypot(this.state.x - previousX, this.state.z - previousZ)
    this.aiAngle += dt * .45
    this.rival.position.set(Math.sin(this.aiAngle) * 28, .12, Math.cos(this.aiAngle) * 28)
    this.rival.rotation.y = this.aiAngle + Math.PI / 2
    this.collideWithOpponents()
    this.syncPeers(dt)

    this.kart.position.set(this.state.x, .12 + (this.state.y ?? 0), this.state.z)
    this.kart.rotation.y = this.state.heading
    this.kart.rotation.z = THREE.MathUtils.lerp(this.kart.rotation.z, -(this.state.drift ?? 0) * .12, 1 - Math.exp(-9 * dt))
    const airbornePitch = -(this.state.verticalSpeed ?? 0) * .035
    this.kart.rotation.x = THREE.MathUtils.lerp(this.kart.rotation.x, groundHeight ? rampPitchAt(this.state.x, this.state.z, this.state.heading) : airbornePitch, 1 - Math.exp(-10 * dt))

    this.chaseCamera.update(this.state, dt, this.settings)
    this.effects.exhaust(this.state, dt, cosmeticAt(this.cosmeticId).exhaust)
    this.effects.drift(this.state, dt)
    const targets: WeaponTarget[] = [{ id: 'bot', object: this.rival }, ...[...this.remotes].map(([id, object]) => ({ id, object }))]
    this.weapon.update(this.state, this.obstacles, targets, this.controls.fire, dt, (id, damage) => this.damageOpponent(id, damage), () => this.multiplayer.fire())
    for (const [id, weapon] of this.remoteWeapons) {
      const peer = this.multiplayer.peers.get(id)
      if (peer) weapon.update(peer, [], [], false, dt, () => {})
    }
    this.effects.update(dt)

    this.lastSend += dt
    if (this.lastSend > .08) { this.multiplayer.send(this.state, Math.round(this.distanceTravelled)); this.lastSend = 0 }
    updateHud(this.state.speed, this.state.drift ?? 0, this.state.health ?? MAX_HEALTH, this.botHealth, this.multiplayer.peers.values(), this.multiplayer.id, this.distanceTravelled)
  }

  private collideWithOpponents() {
    resolveKartCollision(this.state, {
      x: this.rival.position.x, y: 0, z: this.rival.position.z,
    })
    for (const peer of this.multiplayer.peers.values()) resolveKartCollision(this.state, peer)
  }

  private damageOpponent(id: string, damage: number) {
    const crosshair = document.querySelector('#hud .crosshair')!
    crosshair.classList.remove('hit')
    requestAnimationFrame(() => crosshair.classList.add('hit'))
    window.setTimeout(() => crosshair.classList.remove('hit'), 160)
    if (id === 'bot') this.damageBot(damage)
    else this.multiplayer.hitOpponent(id, damage)
  }

  private damagePlayer(damage: number) {
    const destroyed = takeDamage(this.state, damage)
    this.effects.combatBurst(this.kart.position.clone().add(new THREE.Vector3(0, 1, 0)), destroyed)
    const flash = document.querySelector('#damage-flash')!
    flash.classList.remove('active')
    requestAnimationFrame(() => flash.classList.add('active'))
    window.setTimeout(() => flash.classList.remove('active'), 130)
    if (destroyed) {
      this.effects.eliminationBurst(this.kart.position.clone().add(new THREE.Vector3(0, 1, 0)))
      respawn(this.state)
      this.groundHeight = 0
      this.chaseCamera.snap(this.state)
    }
  }

  private damageBot(damage: number) {
    const health = { health: this.botHealth }
    const destroyed = takeDamage(health, damage)
    this.botHealth = health.health ?? MAX_HEALTH
    this.effects.combatBurst(this.rival.position.clone().add(new THREE.Vector3(0, 1, 0)), destroyed)
    if (destroyed) {
      this.effects.eliminationBurst(this.rival.position.clone().add(new THREE.Vector3(0, 1, 0)))
      this.botHealth = MAX_HEALTH
      this.aiAngle += Math.PI
    }
  }

  private syncPeers(dt: number) {
    const smoothing = smoothingFactor(dt)
    for (const [id, peer] of this.multiplayer.peers) {
      let kart = this.remotes.get(id)
      if (!kart) {
        const cosmetic = cosmeticAt(peer.cosmetic)
        kart = createKart(cosmetic.paint)
        styleKart(kart, cosmetic.paint, cosmetic.accent)
        kart.position.set(peer.x, .12 + (peer.y ?? 0), peer.z)
        kart.rotation.y = peer.heading
        this.remotes.set(id, kart)
        this.scene.add(kart)
        const weapon = new WeaponSystem(this.scene, kart, this.effects)
        weapon.setSkin(cosmetic.gun, cosmetic.accent)
        this.remoteWeapons.set(id, weapon)
      } else {
        kart.position.x += (peer.x - kart.position.x) * smoothing
        kart.position.z += (peer.z - kart.position.z) * smoothing
        kart.position.y += (.12 + (peer.y ?? 0) - kart.position.y) * smoothing
        const turn = shortestTurn(kart.rotation.y, peer.heading)
        kart.rotation.y += turn * smoothing
      }
      const cosmetic = cosmeticAt(peer.cosmetic)
      styleKart(kart, cosmetic.paint, cosmetic.accent)
      this.remoteWeapons.get(id)?.setSkin(cosmetic.gun, cosmetic.accent)
      this.effects.exhaust(peer, dt, cosmetic.exhaust, id)
    }
    for (const [id, kart] of this.remotes) if (!this.multiplayer.peers.has(id)) {
      this.scene.remove(kart)
      this.remotes.delete(id)
      this.remoteWeapons.get(id)?.clear()
      this.remoteWeapons.delete(id)
      this.effects.forgetExhaust(id)
    }
  }

}
