import {
  CircleGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  Vector3,
} from 'three'
import { GROUND_LAYER } from './groundLayers.js'

/**
 * Penanda tujuan klik: riak tinta vermilion di atas batu.
 * Tetap terlihat selama karakter berjalan, dengan denyut halus.
 */
export class MoveMarker {
  constructor(color = 0xb23a30) {
    this.group = new Group()
    this.group.name = 'move-marker'
    this.group.visible = false
    this.age = 0
    this.target = new Vector3()

    this.ringMat = new MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    })
    this.rippleMat = new MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    })
    this.dotMat = new MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    })

    this.ring = new Mesh(new RingGeometry(0.26, 0.33, 32), this.ringMat)
    this.ring.rotation.x = -Math.PI / 2
    this.group.add(this.ring)

    this.ripple = new Mesh(new RingGeometry(0.26, 0.3, 32), this.rippleMat)
    this.ripple.rotation.x = -Math.PI / 2
    this.group.add(this.ripple)

    this.dot = new Mesh(new CircleGeometry(0.045, 16), this.dotMat)
    this.dot.rotation.x = -Math.PI / 2
    this.group.add(this.dot)
  }

  show(x, z) {
    this.target.set(x, GROUND_LAYER.marker, z)
    this.group.position.copy(this.target)
    this.group.visible = true
    this.age = 0
  }

  hide() {
    this.group.visible = false
  }

  update(delta, elapsed) {
    if (!this.group.visible) return
    this.age += delta

    this.ring.scale.setScalar(1 + Math.sin(elapsed * 4.2) * 0.06)
    this.ringMat.opacity = 0.55 + Math.sin(elapsed * 4.2) * 0.12

    // Riak pertama memudar dalam 0,7 detik.
    const ripple = Math.min(1, this.age / 0.7)
    this.ripple.scale.setScalar(1 + ripple * 1.5)
    this.rippleMat.opacity = (1 - ripple) * 0.45

    this.dot.scale.setScalar(0.9 + Math.sin(elapsed * 3) * 0.1)
  }

  dispose() {
    this.group.traverse((object) => {
      object.geometry?.dispose?.()
    })
    this.ringMat.dispose()
    this.rippleMat.dispose()
    this.dotMat.dispose()
    this.group.clear()
  }
}
