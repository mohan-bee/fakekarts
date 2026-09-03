import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { KartState } from './physics'

export type Obstacle = { object: THREE.Object3D; x: number; z: number; radius: number; height: number; breakable: boolean; broken: boolean }

const toon = (color: THREE.ColorRepresentation) => new THREE.MeshToonMaterial({ color })
const ramps = [{ x: -24, z: 0, direction: 1 }, { x: 24, z: 0, direction: -1 }]
const KART_RADIUS = 1.8

function addCube(scene: THREE.Scene, x: number, z: number, color: THREE.ColorRepresentation): Obstacle {
  const cube = new THREE.Group()
  const block = new THREE.Mesh(new RoundedBoxGeometry(5, 5, 5, 4, .35), toon(color))
  block.castShadow = block.receiveShadow = true
  cube.add(block)
  for (const y of [-1.75, 1.75]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(5.15, .3, 5.15), toon('#fff2bd'))
    stripe.position.y = y
    cube.add(stripe)
  }
  cube.position.set(x, 2.5, z)
  cube.rotation.y = .18
  scene.add(cube)
  return { object: cube, x, z, radius: 3.8, height: 5, breakable: false, broken: false }
}

function addCrate(scene: THREE.Scene, x: number, z: number): Obstacle {
  const crate = new THREE.Group()
  const wood = toon('#a96232')
  const slat = toon('#d48a4c')
  const box = new THREE.Mesh(new RoundedBoxGeometry(3.6, 3.6, 3.6, 2, .12), wood)
  box.castShadow = box.receiveShadow = true
  crate.add(box)
  for (const y of [-1.35, 0, 1.35]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(3.85, .28, 3.85), slat)
    band.position.y = y
    band.castShadow = true
    crate.add(band)
  }
  for (const side of [-1, 1]) for (const rotation of [-.72, .72]) {
    const brace = new THREE.Mesh(new THREE.BoxGeometry(.3, 3.4, .18), slat)
    brace.position.z = side * 1.86
    brace.rotation.z = rotation
    crate.add(brace)
  }
  crate.position.set(x, 1.8, z)
  crate.rotation.y = .25
  scene.add(crate)
  return { object: crate, x, z, radius: 2.7, height: 3.6, breakable: true, broken: false }
}

function addTireStack(scene: THREE.Scene, x: number, z: number): Obstacle {
  const stack = new THREE.Group()
  const rubber = toon('#252b38')
  const rim = toon('#8fd8eb')
  for (let y = 0; y < 4; y++) {
    const tire = new THREE.Mesh(new THREE.TorusGeometry(1.65, .48, 8, 18), rubber)
    tire.position.y = .48 + y * .72
    tire.rotation.x = Math.PI / 2
    tire.castShadow = tire.receiveShadow = true
    stack.add(tire)
  }
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, 3, 12), rim)
  cap.position.y = 1.55
  stack.add(cap)
  stack.position.set(x, 0, z)
  scene.add(stack)
  return { object: stack, x, z, radius: 2.3, height: 3.4, breakable: false, broken: false }
}

function addBarrier(scene: THREE.Scene, x: number, z: number, rotation = 0): Obstacle {
  const barrier = new THREE.Group()
  const concrete = new THREE.Mesh(new RoundedBoxGeometry(7, 2.5, 1.7, 3, .2), toon('#d8dbe3'))
  concrete.position.y = 1.25
  concrete.castShadow = concrete.receiveShadow = true
  barrier.add(concrete)
  for (const offset of [-2.15, 0, 2.15]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.15, .34, 1.78), toon('#ff6259'))
    stripe.position.set(offset, 1.35, 0)
    stripe.rotation.z = -.48
    barrier.add(stripe)
  }
  barrier.position.set(x, 0, z)
  barrier.rotation.y = rotation
  scene.add(barrier)
  return { object: barrier, x, z, radius: 4.1, height: 2.5, breakable: false, broken: false }
}

function addSkatePark(scene: THREE.Scene) {
  const concrete = toon('#65c8d5')
  const metal = toon('#e7f4f5')
  const angle = Math.atan(4 / 14)
  for (const ramp of ramps) {
    const park = new THREE.Group()
    park.position.set(ramp.x, 2.2, ramp.z)
    park.rotation.x = -ramp.direction * angle
    const deck = new THREE.Mesh(new RoundedBoxGeometry(9, .5, 14, 3, .22), concrete)
    deck.castShadow = deck.receiveShadow = true
    park.add(deck)
    for (const x of [-4.3, 4.3]) {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(.28, .28, 14), metal)
      edge.position.set(x, .35, 0)
      park.add(edge)
    }
    for (const z of [-3, 0, 3]) {
      const grip = new THREE.Mesh(new THREE.BoxGeometry(5.2, .08, .55), toon('#ffe052'))
      grip.position.set(0, .3, z)
      park.add(grip)
    }
    scene.add(park)
  }
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, 12, 8), metal)
  rail.position.set(0, 1.15, -24)
  rail.rotation.x = Math.PI / 2
  rail.castShadow = true
  scene.add(rail)
  for (const z of [-29, -19]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.14, .14, 1.1, 8), metal)
    post.position.set(0, .55, z)
    scene.add(post)
  }
}

export function createObstacles(scene: THREE.Scene) {
  const obstacles = [
    addCube(scene, -10, -31, '#ff6d62'),
    addCube(scene, 16, 27, '#ffd447'),
    addCube(scene, 38, -14, '#6f7de8'),
    addCrate(scene, -4, 34),
    addCrate(scene, 5, 36),
    addCrate(scene, -38, 20),
    addCrate(scene, -33, 25),
    addCube(scene, 67, 43, '#44cfa1'),
    addCube(scene, -72, -35, '#ff8d3b'),
    addCrate(scene, 73, -22),
    addCrate(scene, 67, -27),
    addCrate(scene, -66, 54),
    addCrate(scene, -72, 49),
    addTireStack(scene, 2, -70),
    addTireStack(scene, 72, 13),
    addTireStack(scene, -56, -64),
    addBarrier(scene, 42, 68, .35),
    addBarrier(scene, -44, -73, -.4),
    addBarrier(scene, 82, 48, 1.15),
  ]
  addSkatePark(scene)
  return obstacles
}

export function resolveObstacleCollisions(state: KartState, obstacles: Obstacle[]) {
  const broken: Obstacle[] = []
  for (const obstacle of obstacles) {
    if (obstacle.broken || (state.y ?? 0) > obstacle.height + 1) continue
    const dx = state.x - obstacle.x
    const dz = state.z - obstacle.z
    const distance = Math.hypot(dx, dz)
    const collisionRadius = obstacle.radius + KART_RADIUS
    if (distance >= collisionRadius) continue
    if (obstacle.breakable && Math.abs(state.speed) > 7) {
      // ponytail: crate destruction is client-local, broadcast obstacle events when matches need authoritative shared state.
      breakObstacle(obstacle)
      state.speed *= .82
      broken.push(obstacle)
      continue
    }
    const nx = distance ? dx / distance : Math.sin(state.heading)
    const nz = distance ? dz / distance : Math.cos(state.heading)
    state.x = obstacle.x + nx * collisionRadius
    state.z = obstacle.z + nz * collisionRadius
    state.speed *= -.35
  }
  return broken
}

export function obstacleAt(x: number, y: number, z: number, obstacles: Obstacle[]) {
  return obstacles.find(obstacle => !obstacle.broken && y <= obstacle.height && Math.hypot(x - obstacle.x, z - obstacle.z) <= obstacle.radius)
}

export function breakObstacle(obstacle: Obstacle) {
  obstacle.broken = true
  obstacle.object.visible = false
}

export function rampHeightAt(x: number, z: number) {
  for (const ramp of ramps) {
    const localZ = (z - ramp.z) * ramp.direction
    if (Math.abs(x - ramp.x) <= 4.5 && localZ >= -7 && localZ <= 7) return .25 + (localZ + 7) / 14 * 4
  }
  return 0
}

export function rampPitchAt(x: number, z: number, heading: number) {
  for (const ramp of ramps) {
    if (Math.abs(x - ramp.x) <= 4.5 && Math.abs(z - ramp.z) <= 7) return -ramp.direction * Math.atan(4 / 14) * Math.cos(heading)
  }
  return 0
}
