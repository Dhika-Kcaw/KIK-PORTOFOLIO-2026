import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  NormalBlending,
  Points,
  PointsMaterial,
} from 'three'
import { createPetalTexture } from './canvasTextures.js'

const PETAL_COLORS = ['#e2a8b2', '#f2d9c4', '#ffb26b', '#d98e9c']

/** Kelopak plum dan bara lentera yang melayang pelan di halaman. */
export class PetalField {
  constructor({ count = 150, halfX = 14, halfZ = 14, height = 7 } = {}) {
    this.count = count
    this.halfX = halfX
    this.halfZ = halfZ
    this.height = height
    this.seeds = []
    this.texture = createPetalTexture()
    this.object = new Points(this.createGeometry(), this.createMaterial())
    this.object.frustumCulled = false
    this.object.name = 'petals'
  }

  createGeometry() {
    const positions = new Float32Array(this.count * 3)
    const colors = new Float32Array(this.count * 3)
    const color = new Color()

    for (let i = 0; i < this.count; i += 1) {
      positions[i * 3] = (Math.random() * 2 - 1) * this.halfX
      positions[i * 3 + 1] = 0.3 + Math.random() * this.height
      positions[i * 3 + 2] = (Math.random() * 2 - 1) * this.halfZ

      color.set(PETAL_COLORS[i % PETAL_COLORS.length])
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b

      this.seeds.push({
        phase: Math.random() * Math.PI * 2,
        fall: 0.12 + Math.random() * 0.24,
        drift: 0.18 + Math.random() * 0.3,
        spin: 0.4 + Math.random() * 1.1,
      })
    }

    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
    return geometry
  }

  createMaterial() {
    return new PointsMaterial({
      map: this.texture,
      vertexColors: true,
      size: 0.14,
      transparent: true,
      opacity: 0.85,
      alphaTest: 0.05,
      depthWrite: false,
      blending: NormalBlending,
      sizeAttenuation: true,
    })
  }

  update(delta, elapsed) {
    const attribute = this.object.geometry.getAttribute('position')
    const positions = attribute.array

    for (let i = 0; i < this.count; i += 1) {
      const seed = this.seeds[i]
      const index = i * 3

      positions[index] +=
        Math.sin(elapsed * seed.spin + seed.phase) * seed.drift * delta
      positions[index + 1] -= seed.fall * delta
      positions[index + 2] +=
        Math.cos(elapsed * seed.spin * 0.7 + seed.phase) * seed.drift * delta

      if (positions[index + 1] < 0.15) {
        positions[index + 1] = this.height
        positions[index] = (Math.random() * 2 - 1) * this.halfX
        positions[index + 2] = (Math.random() * 2 - 1) * this.halfZ
      }
      if (positions[index] > this.halfX) positions[index] = -this.halfX
      if (positions[index] < -this.halfX) positions[index] = this.halfX
      if (positions[index + 2] > this.halfZ) positions[index + 2] = -this.halfZ
      if (positions[index + 2] < -this.halfZ) positions[index + 2] = this.halfZ
    }

    attribute.needsUpdate = true
  }

  dispose() {
    this.object.geometry.dispose()
    this.object.material.dispose()
    this.texture.dispose()
  }
}
