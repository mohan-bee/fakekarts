import * as THREE from 'three'
import { createKart, styleKart } from './kart'
import type { Cosmetic, KartTrim } from './cosmetics'

export class GaragePreview {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(38, 2, .1, 40)
  private kart = createKart('#ff5a4f')

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.camera.position.set(4.8, 3.1, 5.6)
    this.camera.lookAt(0, .9, 0)
    this.scene.add(this.kart, new THREE.HemisphereLight('#e9f1ff', '#3c4653', 3))
    const light = new THREE.DirectionalLight('#ffffff', 3)
    light.position.set(3, 5, 4)
    this.scene.add(light)
    new ResizeObserver(() => this.render()).observe(canvas)
  }

  update(cosmetic: Cosmetic, trim: KartTrim) {
    styleKart(this.kart, cosmetic.paint, cosmetic.accent, trim)
    this.render()
  }

  private render() {
    const { width, height } = this.canvas.getBoundingClientRect()
    if (!width || !height) return
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.render(this.scene, this.camera)
  }
}
