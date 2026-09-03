import * as THREE from 'three'

const toon = (color: THREE.ColorRepresentation) => new THREE.MeshToonMaterial({ color })
const part = (geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) => {
  const item = new THREE.Mesh(geometry, material)
  item.position.set(x, y, z)
  item.castShadow = item.receiveShadow = true
  return item
}

export function createKart(color: THREE.ColorRepresentation) {
  const kart = new THREE.Group()
  const paint = toon(color)
  const dark = toon('#202638')
  const metal = toon('#9aa7b8')
  const yellow = toon('#ffd447')
  kart.userData.paintMaterial = paint
  kart.userData.accentMaterial = yellow

  const body = part(new THREE.CapsuleGeometry(.95, 2.15, 4, 10), paint, 0, 1.05)
  body.rotation.x = Math.PI / 2
  const nose = part(new THREE.BoxGeometry(2.25, .58, 1.25), paint, 0, .9, 2.05)
  nose.rotation.x = -.12
  const seat = part(new THREE.BoxGeometry(1.3, 1.35, .65), dark, 0, 1.55, -.55)
  seat.rotation.x = -.18
  kart.add(
    part(new THREE.BoxGeometry(2.9, .42, 4.15), dark, 0, .62), body, nose,
    part(new THREE.BoxGeometry(3.3, .25, .35), yellow, 0, .57, 2.58),
    part(new THREE.BoxGeometry(3.2, .24, .3), metal, 0, .62, -2.3), seat,
  )

  const helmet = part(new THREE.SphereGeometry(.72, 12, 8, 0, Math.PI * 2, 0, Math.PI * .58), paint, 0, 2.46, -.15)
  const visor = part(new THREE.BoxGeometry(1.03, .34, .12), toon('#263f61'), 0, 2.38, .48)
  visor.rotation.x = -.15
  const steering = part(new THREE.TorusGeometry(.4, .08, 6, 12), dark, 0, 1.55, .65)
  steering.rotation.x = Math.PI / 2
  steering.rotation.z = -.18
  kart.add(part(new THREE.SphereGeometry(.62, 12, 8), toon('#f2ae75'), 0, 2.35, -.15), helmet, visor, steering)

  for (const x of [-1.55, 1.55]) for (const z of [-1.35, 1.35]) {
    const wheel = part(new THREE.CylinderGeometry(.66, .66, .52, 12), dark, x, .65, z)
    const hub = part(new THREE.CylinderGeometry(.25, .25, .56, 12), yellow, x, .65, z)
    wheel.rotation.z = hub.rotation.z = Math.PI / 2
    kart.add(wheel, hub)
  }

  for (const x of [-.7, .7]) {
    kart.add(part(new THREE.SphereGeometry(.19, 8, 6), toon('#fff6c8'), x, 1.08, 2.66))
    const exhaust = part(new THREE.CylinderGeometry(.1, .14, .75, 8), metal, x, .65, -2.4)
    exhaust.rotation.x = Math.PI / 2
    kart.add(exhaust)
  }
  return kart
}

export function styleKart(kart: THREE.Group, paint: THREE.ColorRepresentation, accent: THREE.ColorRepresentation) {
  ;(kart.userData.paintMaterial as THREE.MeshToonMaterial).color.set(paint)
  ;(kart.userData.accentMaterial as THREE.MeshToonMaterial).color.set(accent)
}
