import * as THREE from 'three'
import { CHECKPOINT_COUNT, checkpointAt, TRACK_RADIUS, TRACK_HALF_WIDTH } from './match.js'
import type { KartState } from './physics'

export const ARENA_RADIUS = 118
export const PLAYABLE_RADIUS = 111

const material = (color: THREE.ColorRepresentation, map?: THREE.Texture) => new THREE.MeshStandardMaterial({ color, map, roughness: .85 })
const floorMesh = (geometry: THREE.BufferGeometry, color: THREE.ColorRepresentation, y = 0, map?: THREE.Texture) => {
  const item = new THREE.Mesh(geometry, material(color, map))
  item.position.y = y
  item.rotation.x = -Math.PI / 2
  item.receiveShadow = true
  return item
}

const concreteTexture = () => {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 512
  const context = canvas.getContext('2d')!
  context.fillStyle = '#525b64'
  context.fillRect(0, 0, 512, 512)
  context.strokeStyle = 'rgba(83, 69, 126, .22)'
  context.lineWidth = 3
  for (let line = 0; line <= 512; line += 64) {
    context.beginPath(); context.moveTo(line, 0); context.lineTo(line, 512); context.stroke()
    context.beginPath(); context.moveTo(0, line); context.lineTo(512, line); context.stroke()
  }
  let seed = 23
  const random = () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646
  for (let i = 0; i < 750; i++) {
    context.fillStyle = random() > .5 ? 'rgba(255,255,255,.12)' : 'rgba(66,53,105,.1)'
    const size = 1 + random() * 4
    context.fillRect(random() * 512, random() * 512, size, size)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(7, 7)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

const groundPrint = (text: string, width: number, z: number) => {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 256
  const context = canvas.getContext('2d')!
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font = '900 150px Arial Black, sans-serif'
  context.lineWidth = 22
  context.strokeStyle = '#55477f'
  context.strokeText(text, 512, 128)
  context.fillStyle = '#fff2bd'
  context.fillText(text, 512, 128)
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(width, width / 4),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false }),
  )
  label.rotation.x = -Math.PI / 2
  label.position.set(0, .09, z)
  return label
}

export function createArena(scene: THREE.Scene) {
  scene.background = new THREE.Color('#70818d')
  scene.fog = new THREE.Fog('#70818d', 155, 300)
  scene.add(
    floorMesh(new THREE.CircleGeometry(ARENA_RADIUS, 96), '#414951'),
    floorMesh(new THREE.CircleGeometry(113, 96), '#ffffff', .025, concreteTexture()),
  )

  for (const radius of [13, 40, 70, 98]) scene.add(floorMesh(new THREE.RingGeometry(radius - .18, radius + .18, 96), '#69727b', .05))
  scene.add(floorMesh(new THREE.CircleGeometry(3.8, 24), '#ffd447', .06))
  scene.add(groundPrint('FAKE KARTS', 40, -76), groundPrint('MOTORSPORT DIVISION', 44, 77))

  const wall = new THREE.Mesh(new THREE.TorusGeometry(115, 2.4, 8, 96), material('#30363d'))
  wall.position.y = 1.3
  wall.rotation.x = Math.PI / 2
  wall.castShadow = wall.receiveShadow = true
  const rail = new THREE.Mesh(new THREE.TorusGeometry(115, .42, 7, 96), material('#ff695f'))
  rail.position.y = 3.8
  rail.rotation.x = Math.PI / 2
  scene.add(wall, rail)

  const colors = ['#b43d34', '#c6ccd0', '#303b45', '#c6ccd0']
  for (let i = 0; i < 20; i++) {
    const angle = i / 20 * Math.PI * 2
    const banner = new THREE.Mesh(new THREE.BoxGeometry(8, 2.3, .35), material(colors[i % colors.length]))
    banner.position.set(Math.sin(angle) * 115, 6, Math.cos(angle) * 115)
    banner.rotation.y = angle
    banner.castShadow = true
    scene.add(banner)
  }

  scene.add(new THREE.HemisphereLight('#eaf9ff', '#30353c', 2.8))
  const sun = new THREE.DirectionalLight('#fff3cb', 4.5)
  sun.position.set(-40, 62, -28)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.left = sun.shadow.camera.bottom = -130
  sun.shadow.camera.right = sun.shadow.camera.top = 130
  scene.add(sun)
}

export function createRaceTrack(scene: THREE.Scene) {
  const track = new THREE.Group()
  track.add(floorMesh(new THREE.RingGeometry(TRACK_RADIUS - TRACK_HALF_WIDTH, TRACK_RADIUS + TRACK_HALF_WIDTH, 192), '#242a30', .11))
  for (const radius of [58, 82]) {
    track.add(floorMesh(new THREE.RingGeometry(radius - .4, radius + .4, 192), '#e1e4e7', .14))
    const rail = new THREE.Mesh(new THREE.TorusGeometry(radius, .5, 6, 192), material('#75818b'))
    rail.rotation.x = Math.PI / 2
    rail.position.y = .65
    track.add(rail)
  }
  for (let i = 0; i < 96; i++) {
    const angle = i / 96 * Math.PI * 2
    const dash = floorMesh(new THREE.PlaneGeometry(.18, 2), '#929ba3', .14)
    dash.position.set(Math.cos(angle) * TRACK_RADIUS, .14, Math.sin(angle) * TRACK_RADIUS)
    dash.rotation.z = angle
    track.add(dash)
  }
  for (let i = 0; i < CHECKPOINT_COUNT; i++) {
    const gate = checkpointAt(i)
    const group = new THREE.Group()
    group.position.set(gate.x, 0, gate.z)
    group.rotation.y = gate.heading
    for (const x of [-11.5, 11.5]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(.35, 5, .35), material('#e2b44a'))
      post.position.set(x, 2.5, 0)
      group.add(post)
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(23.4, .45, .4), material(i === 0 ? '#e7e9eb' : '#e2b44a'))
    beam.position.y = 5
    group.add(beam)
    group.userData.checkpoint = i
    track.add(group)
  }
  for (let x = 59; x < 82; x += 2) for (let z = -2; z < 2; z += 2) {
    const tile = floorMesh(new THREE.PlaneGeometry(2, 2), ((x + z + 1) / 2 & 1) ? '#ffffff' : '#11161b', .16)
    tile.position.set(x + 1, .16, z + 1)
    track.add(tile)
  }
  track.visible = false
  scene.add(track)
  return track
}

export function containInArena(state: KartState) {
  const distance = Math.hypot(state.x, state.z)
  if (distance <= PLAYABLE_RADIUS) return
  const scale = PLAYABLE_RADIUS / distance
  state.x *= scale
  state.z *= scale
  state.speed *= -.35
}
