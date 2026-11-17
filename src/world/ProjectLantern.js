import {
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  RingGeometry,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
} from 'three'
import { DECAL_TUNING, GROUND_LAYER } from './groundLayers.js'
import {
  createPaperLanternTexture,
  createProjectScrollTexture,
  createPromptBadgeTexture,
} from './canvasTextures.js'

/**
 * Lentera proyek: tiang kayu dengan lentera kertas dan gulungan karya.
 * Gulungan selalu diputar menghadap kamera isometrik agar teks tetap terbaca,
 * sementara struktur lentera mengikuti arah stasiunnya.
 */
export class ProjectLantern {
  constructor(data) {
    this.data = data
    this.id = data.id
    this.accent = data.accent || '#b23a30'
    this.size = data.size ?? [3.2, 2.0]
    this.elevation = data.elevation ?? 1.8
    this.rotationY = data.rotationY ?? 0

    this.group = new Group()
    this.group.name = `project-lantern-${data.id}`
    this.group.position.set(data.position[0], 0, data.position[1])
    this.group.rotation.y = this.rotationY
    this.group.userData.stationId = data.id
    this.active = false

    const forwardX = Math.sin(this.rotationY)
    const forwardZ = Math.cos(this.rotationY)
    const standDistance = data.standDistance ?? 2.6
    this.interaction = {
      x: data.position[0] + forwardX * standDistance,
      z: data.position[1] + forwardZ * standDistance,
    }
    this.collider = { x: data.position[0], z: data.position[1], radius: 0.62 }

    this.materials = []
    this.textures = []

    this.buildStand()
    this.buildLantern()
    this.buildScroll()
    this.buildActiveRing()
    this.buildPromptBadge()
    this.buildHitArea()
  }

  buildStand() {
    this.stoneMat = new MeshStandardMaterial({
      color: 0x544a3e,
      roughness: 0.88,
      metalness: 0.04,
    })
    this.woodMat = new MeshStandardMaterial({
      color: 0x33251c,
      roughness: 0.86,
      metalness: 0.02,
    })
    this.inkMat = new MeshStandardMaterial({
      color: 0x241c17,
      roughness: 0.8,
      metalness: 0.08,
    })
    this.materials.push(this.stoneMat, this.woodMat, this.inkMat)

    const base = new Mesh(new CylinderGeometry(0.62, 0.78, 0.26, 6), this.stoneMat)
    base.position.y = 0.13
    base.castShadow = true
    base.receiveShadow = true
    this.group.add(base)

    const step = new Mesh(new CylinderGeometry(0.44, 0.55, 0.16, 6), this.stoneMat)
    step.position.y = 0.34
    step.castShadow = true
    step.receiveShadow = true
    this.group.add(step)

    const post = new Mesh(new CylinderGeometry(0.075, 0.095, 3.1, 6), this.woodMat)
    post.position.set(0, 1.8, -0.42)
    post.castShadow = true
    this.group.add(post)

    const arm = new Mesh(new CylinderGeometry(0.05, 0.05, 1.4, 6), this.woodMat)
    arm.position.set(0, 3.32, -0.15)
    arm.rotation.z = Math.PI / 2
    arm.rotation.y = Math.PI / 2
    arm.castShadow = true
    this.group.add(arm)

    // Kurung kayu tempat gulungan menggantung.
    for (const side of [-1, 1]) {
      const bracket = new Mesh(new CylinderGeometry(0.03, 0.03, 0.5, 5), this.inkMat)
      bracket.position.set(side * 0.5, 3.06, -0.12)
      this.group.add(bracket)
    }
  }

  buildLantern() {
    const paperTexture = createPaperLanternTexture()
    this.textures.push(paperTexture)

    this.paperMat = new MeshStandardMaterial({
      map: paperTexture,
      emissive: 0xffa45c,
      emissiveMap: paperTexture,
      emissiveIntensity: 0.6,
      roughness: 0.9,
      metalness: 0,
    })
    this.materials.push(this.paperMat)

    this.lantern = new Group()
    this.lantern.position.set(0, 3.0, -0.06)
    this.group.add(this.lantern)

    const cord = new Mesh(new CylinderGeometry(0.012, 0.012, 0.24, 4), this.inkMat)
    cord.position.y = 0.44
    this.lantern.add(cord)

    const body = new Mesh(new SphereGeometry(0.4, 16, 12), this.paperMat)
    body.scale.set(1, 1.18, 1)
    body.castShadow = true
    this.lantern.add(body)

    for (const [y, radius] of [
      [0.47, 0.29],
      [-0.47, 0.29],
    ]) {
      const cap = new Mesh(new CylinderGeometry(radius, radius, 0.08, 8), this.inkMat)
      cap.position.y = y
      this.lantern.add(cap)
    }

    const tassel = new Mesh(new ConeGeometry(0.06, 0.26, 5), this.inkMat)
    tassel.position.y = -0.62
    tassel.rotation.x = Math.PI
    this.lantern.add(tassel)

    this.light = new PointLight(0xffb068, 4.5, 6.5, 2)
    this.light.position.y = -0.1
    this.lantern.add(this.light)
  }

  buildScroll() {
    this.screenGroup = new Group()
    this.screenGroup.position.set(0, this.elevation, 0.5)
    // Hadapkan gulungan ke kamera isometrik tetap (yaw 45°).
    this.screenGroup.rotation.y = Math.PI / 4 - this.rotationY
    this.group.add(this.screenGroup)

    const [width, height] = this.size
    const texture = createProjectScrollTexture({
      ...this.data.project,
      accent: this.accent,
    })
    this.textures.push(texture)

    this.scrollMat = new MeshStandardMaterial({
      map: texture,
      roughness: 0.98,
      metalness: 0,
      side: DoubleSide,
    })
    this.materials.push(this.scrollMat)

    const scroll = new Mesh(new PlaneGeometry(width, height), this.scrollMat)
    scroll.userData.stationId = this.id
    scroll.castShadow = true
    this.screenGroup.add(scroll)
    this.scroll = scroll

    // Batang kayu di atas & bawah gulungan.
    for (const y of [height / 2 + 0.045, -height / 2 - 0.045]) {
      const rod = new Mesh(new CylinderGeometry(0.035, 0.035, width + 0.22, 6), this.woodMat)
      rod.rotation.z = Math.PI / 2
      rod.position.set(0, y, 0)
      this.screenGroup.add(rod)
    }

    // Tali penggantung ke lengan tiang.
    for (const side of [-1, 1]) {
      const string = new Mesh(new CylinderGeometry(0.008, 0.008, 0.95, 4), this.inkMat)
      string.position.set(side * (width / 2 - 0.16), height / 2 + 0.52, 0)
      this.screenGroup.add(string)
    }
  }

  buildActiveRing() {
    this.ringMat = new MeshBasicMaterial({
      color: this.accent,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      ...DECAL_TUNING,
    })
    this.materials.push(this.ringMat)

    const ring = new Mesh(new RingGeometry(0.82, 0.9, 40), this.ringMat)
    ring.rotation.x = -Math.PI / 2
    ring.position.y = GROUND_LAYER.stationRing
    this.group.add(ring)
    this.ring = ring
  }

  buildPromptBadge() {
    this.promptTexture = createPromptBadgeTexture({
      key: 'E',
      action: 'Uji web',
      accent: this.accent,
    })

    this.promptBadge = new Sprite(
      new SpriteMaterial({
        map: this.promptTexture,
        transparent: true,
        depthWrite: false,
      }),
    )
    this.promptBadge.position.set(0, this.elevation + this.size[1] * 0.58 + 0.3, 0.5)
    this.promptBadge.scale.set(0, 0, 1)
    this.promptBadge.material.opacity = 0
    this.group.add(this.promptBadge)
  }

  buildHitArea() {
    const hitArea = new Mesh(
      new CylinderGeometry(1.5, 1.5, 2.9, 12),
      new MeshBasicMaterial({ visible: false }),
    )
    hitArea.position.y = 1.45
    hitArea.userData.stationId = this.id
    this.group.add(hitArea)
  }

  setActive(active) {
    this.active = active
  }

  update(delta, elapsed) {
    const time = elapsed + this.group.position.x * 0.23 + this.group.position.z * 0.17

    // Gulungan mengambang lembut.
    this.screenGroup.position.y = this.elevation + Math.sin(time * 1.2) * 0.035
    const targetScale = this.active ? 1.025 : 1
    this.screenGroup.scale.x += (targetScale - this.screenGroup.scale.x) * Math.min(1, 8 * delta)
    this.screenGroup.scale.y = this.screenGroup.scale.x
    this.screenGroup.scale.z = this.screenGroup.scale.x

    // Lentera bergoyang & berkedip hangat.
    this.lantern.rotation.z = Math.sin(time * 0.9) * 0.045
    this.lantern.rotation.x = Math.cos(time * 0.7) * 0.03
    this.light.intensity = (this.active ? 6.2 : 4.4) + Math.sin(time * 1.1) * 0.14
    this.paperMat.emissiveIntensity = (this.active ? 0.72 : 0.58) + Math.sin(time * 0.8) * 0.02
    this.ringMat.opacity = this.active ? 0.42 : 0.16
    this.ring.scale.setScalar(1 + Math.sin(time * 1.5) * 0.02)

    const targetPromptScale = this.active ? 1.74 : 0
    this.promptBadge.scale.x +=
      (targetPromptScale - this.promptBadge.scale.x) * Math.min(1, 14 * delta)
    this.promptBadge.scale.y = this.promptBadge.scale.x * 0.274
    this.promptBadge.material.opacity +=
      ((this.active ? 1 : 0) - this.promptBadge.material.opacity) * Math.min(1, 14 * delta)
    this.promptBadge.position.y =
      this.elevation + this.size[1] * 0.58 + 0.3 + Math.sin(time * 1.5) * 0.02
  }

  dispose() {
    this.promptTexture?.dispose?.()
    this.promptBadge.material.dispose()
    for (const texture of this.textures) texture.dispose()
    for (const material of this.materials) material.dispose()
    const geometries = new Set()
    this.group.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry)
    })
    for (const geometry of geometries) geometry.dispose()
    this.group.clear()
  }
}
