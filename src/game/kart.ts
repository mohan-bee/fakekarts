import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { normalizeTrim, type KartTrim } from './cosmetics.js'

const material = (color: THREE.ColorRepresentation, metalness = 0, roughness = .7) => new THREE.MeshStandardMaterial({ color, metalness, roughness })
const part = (geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) => {
  const item = new THREE.Mesh(geometry, material)
  item.position.set(x, y, z)
  item.castShadow = item.receiveShadow = true
  return item
}

export function createKart(color: THREE.ColorRepresentation) {
  const kart = new THREE.Group()
  const paint = material(color, .65, .3)
  const dark = material('#14191d')
  const metal = material('#94a1ac', .85, .3)
  const accent = material('#d7dce0', .5, .35)
  kart.userData.paintMaterial = paint
  kart.userData.accentMaterial = accent
  const box = (w: number, h: number, d: number) => new RoundedBoxGeometry(w, h, d, 2, .08)
  kart.add(part(box(2.55, .2, 4.15), dark, 0, .43))
  for (const x of [-1.05, 1.05]) {
    kart.add(part(box(.55, .48, 2.7), paint, x, .75, -.15))
    kart.add(part(box(.14, .04, 2.4), accent, x, 1, -.15))
    for (const z of [-1.3, 1.35]) {
      const axle = part(new THREE.CylinderGeometry(.09, .09, .7, 12), metal, x * 1.2, .56, z)
      axle.rotation.z = Math.PI / 2
      kart.add(axle)
    }
  }
  const nose = part(box(1.25, .43, 1.8), paint, 0, .73, 1.4)
  nose.rotation.x = -.1
  kart.add(nose, part(box(2.95, .14, .48), dark, 0, .47, 2.28))
  const seat = part(box(1.03, 1.1, .35), dark, 0, 1.1, -.7)
  seat.rotation.x = -.17
  kart.add(seat, part(box(.88, .22, .9), dark, 0, .78, -.25))
  // Compact suited driver and full-face helmet, with no oversized cartoon head.
  kart.add(part(box(.7, .75, .5), dark, 0, 1.25, -.35))
  kart.add(part(new THREE.SphereGeometry(.43, 24, 16), paint, 0, 1.94, -.24))
  kart.add(part(box(.65, .2, .16), material('#152431', .8, .12), 0, 1.98, .12))
  const steering = part(new THREE.TorusGeometry(.3, .045, 8, 24), dark, 0, 1.24, .48)
  steering.rotation.x = -.7
  kart.add(steering)
  const wheels: THREE.Group[] = []
  const rims = material('#a8b3bc', .85, .25)
  kart.userData.rimMaterial = rims
  for (const x of [-1.5, 1.5]) for (const z of [-1.3, 1.35]) {
    const assembly = new THREE.Group()
    assembly.position.set(x, .58, z)
    assembly.userData.front = z > 0
    const rolling = new THREE.Group()
    const tire = part(new THREE.CylinderGeometry(.57, .57, .52, 32), dark)
    const hub = part(new THREE.CylinderGeometry(.32, .32, .54, 24), rims)
    tire.rotation.z = hub.rotation.z = Math.PI / 2
    rolling.add(tire, hub)
    for (let i = 0; i < 6; i++) {
      const spoke = part(new THREE.BoxGeometry(.56, .055, .52), metal)
      spoke.rotation.x = i * Math.PI / 3
      rolling.add(spoke)
    }
    assembly.add(rolling)
    wheels.push(assembly)
    kart.add(assembly)
  }
  kart.userData.wheels = wheels
  const wing = new THREE.Group()
  for (const x of [-.75, .75]) wing.add(part(box(.1, .55, .15), metal, x, 1.05, -1.85))
  wing.add(part(box(2.85, .12, .6), dark, 0, 1.35, -1.85))
  for (const x of [-1.4, 1.4]) wing.add(part(box(.07, .34, .65), accent, x, 1.4, -1.85))
  kart.userData.wing = wing
  kart.add(wing)
  // Exposed rear engine and twin exhausts.
  kart.add(part(box(.9, .5, .65), metal, 0, .83, -1.58))
  for (let i = 0; i < 5; i++) kart.add(part(new THREE.BoxGeometry(1, .04, .6), dark, 0, .66 + i * .09, -1.58))
  for (const x of [-.65, .65]) {
    const exhaust = part(new THREE.CylinderGeometry(.1, .13, .65, 16), metal, x, .6, -2.05)
    exhaust.rotation.x = Math.PI / 2
    kart.add(exhaust)
  }
  return kart
}

export function styleKart(kart: THREE.Group, paint: THREE.ColorRepresentation, accent: THREE.ColorRepresentation, trim?: KartTrim) {
  const options = normalizeTrim(trim)
  const body = kart.userData.paintMaterial as THREE.MeshStandardMaterial
  body.color.set(paint)
  body.roughness = options.finish === 'matte' ? .85 : .3
  body.metalness = options.finish === 'matte' ? .15 : .65
  ;(kart.userData.accentMaterial as THREE.MeshStandardMaterial).color.set(accent)
  ;(kart.userData.rimMaterial as THREE.MeshStandardMaterial).color.set(options.wheels === 'bronze' ? '#a98049' : options.wheels === 'black' ? '#22282e' : '#a8b3bc')
  ;(kart.userData.wing as THREE.Group).visible = options.aero === 'wing'
}

export function animateKart(kart: THREE.Group, speed: number, steering: number, dt: number) {
  for (const wheel of kart.userData.wheels as THREE.Group[]) {
    wheel.rotation.y = wheel.userData.front ? steering * .35 : 0
    wheel.children[0].rotation.x += speed * dt / .57
  }
}
