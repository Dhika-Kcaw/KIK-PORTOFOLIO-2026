import {
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RingGeometry,
  Sprite,
  SpriteMaterial,
} from 'three'
import {
  createNameplateTexture,
  createPromptBadgeTexture,
  createSectionPlaqueTexture,
} from './canvasTextures.js'
import { applySpriteFade, distanceVisibility } from './floatingText.js'
import { DECAL_TUNING, GROUND_LAYER } from './groundLayers.js'
import { buildSectionBody, createStationMaterials } from './stationBodies.js'

/**
 * Meja informasi untuk satu bagian museum (beranda, about, skills, dst).
 * Bagian 3D hanya menampilkan ringkasan; detail lengkap dibuka di panel 2D.
 */
export class InfoStation {
  constructor(sectionKey, section, data) {
    this.id = `section-${sectionKey}`
    this.kind = 'section'
    this.sectionKey = sectionKey
    this.section = section
    this.data = data
    this.accent = section.accent || '#b23a30'
    this.active = false

    this.group = new Group()
    this.group.name = this.id
    this.group.position.set(section.position[0], 0, section.position[1])
    this.group.rotation.y = section.rotationY ?? 0
    this.group.userData.stationId = this.id

    const forwardX = Math.sin(section.rotationY ?? 0)
    const forwardZ = Math.cos(section.rotationY ?? 0)
    const standDistance = section.standDistance ?? 1.15
    this.interaction = {
      x: section.position[0] + forwardX * standDistance,
      z: section.position[1] + forwardZ * standDistance,
    }
    this.collider = {
      x: section.position[0],
      z: section.position[1],
      radius: 0.62,
    }
    // Titik ukur interaksi adalah meja itu sendiri, bukan titik berdirinya.
    this.anchor = { x: section.position[0], z: section.position[1] }
    this.interactRadius = 1.45

    this.textures = []
    this.materials = []

    this.buildBody()
    this.buildPlaque()
    this.buildNameplate()
    this.buildPrompt()
    this.buildHitArea()
  }

  /**
   * Benda per bagian: setiap meja punya perabotnya sendiri (lihat stationBodies.js),
   * jadi tidak ada lagi meja kayu seragam untuk semua bagian.
   */
  buildBody() {
    const mats = createStationMaterials((...items) => this.materials.push(...items), this.accent)
    const body = buildSectionBody(this.sectionKey, {
      group: this.group,
      mats,
      section: this.section,
      accent: this.accent,
    })
    this.bodyAnimation = body?.animate ?? null
  }

  /** Papan label melayang: satu-satunya bagian yang seragam di semua stasiun. */
  buildPlaque() {
    const texture = createSectionPlaqueTexture({
      title: this.section.title,
      subtitle: this.section.description,
      seal: this.section.seal,
      accent: this.accent,
      eyebrow: 'NEKONEKO MUSEUM',
    })
    this.textures.push(texture)

    this.plaqueMat = new MeshStandardMaterial({
      map: texture,
      roughness: 0.97,
      metalness: 0,
      side: 2,
    })
    this.materials.push(this.plaqueMat)

    this.plaque = new Mesh(new PlaneGeometry(1.02, 0.7), this.plaqueMat)
    this.plaque.rotation.x = -0.42
    this.plaque.position.set(0, 1.5, 0.1)
    this.plaque.castShadow = true
    this.group.add(this.plaque)
  }

  buildNameplate() {
    // Label ringkas satu baris: subjudul dipindah ke panel 2D agar dunia tidak
    // penuh teks.
    const texture = createNameplateTexture({
      title: this.section.label,
      accent: this.accent,
      compact: true,
    })
    this.textures.push(texture)

    this.nameplate = new Sprite(
      new SpriteMaterial({ map: texture, transparent: true, depthWrite: false }),
    )
    this.nameplate.position.set(0, 2.08, 0)
    this.nameplate.scale.set(2.1, 0.48, 1)
    this.group.add(this.nameplate)
  }

  buildPrompt() {
    const texture = createPromptBadgeTexture({
      key: 'E',
      action: this.section.prompt,
      accent: this.accent,
    })
    this.textures.push(texture)

    this.promptBadge = new Sprite(
      new SpriteMaterial({ map: texture, transparent: true, depthWrite: false }),
    )
    this.promptBadge.position.set(0, 2.55, 0)
    this.promptBadge.scale.set(0, 0, 1)
    this.promptBadge.material.opacity = 0
    this.group.add(this.promptBadge)

    this.ringMat = new MeshBasicMaterial({
      color: this.accent,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      ...DECAL_TUNING,
    })
    this.materials.push(this.ringMat)
    const ring = new Mesh(new RingGeometry(0.7, 0.78, 40), this.ringMat)
    ring.rotation.x = -Math.PI / 2
    ring.position.y = GROUND_LAYER.stationRing
    this.group.add(ring)
    this.ring = ring

    // Beranda adalah titik pertama tur museum: beri cincin penanda kedua agar
    // menonjol dibanding meja lain sejak pemain masuk.
    if (this.sectionKey === 'home') {
      this.landmarkMat = new MeshBasicMaterial({
        color: this.accent,
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
        ...DECAL_TUNING,
      })
      this.materials.push(this.landmarkMat)
      this.landmarkRing = new Mesh(new RingGeometry(1.0, 1.14, 56), this.landmarkMat)
      this.landmarkRing.rotation.x = -Math.PI / 2
      this.landmarkRing.position.y = GROUND_LAYER.stationRing
      this.group.add(this.landmarkRing)
    }
  }

  buildHitArea() {
    const hitArea = new Mesh(
      new CylinderGeometry(1.05, 1.05, 2.25, 12),
      new MeshBasicMaterial({ visible: false }),
    )
    hitArea.position.y = 1.12
    hitArea.userData.stationId = this.id
    this.group.add(hitArea)
  }

  setActive(active) {
    this.active = active
  }

  update(delta, elapsed, playerPos = null) {
    const time = elapsed + this.section.position[0] * 0.2 + this.section.position[1] * 0.13

    // Papan label bergerak sangat pelan (4 mm, periode ~2,5 s). Sebelumnya
    // papan bergetar 1,1 Hz plus bergulir sedikit, dan teks yang ikut bergoyang
    // membuat stasiun terasa goyah.
    this.plaque.position.y = 1.5 + Math.sin(time * 0.4) * 0.004
    this.bodyAnimation?.(time)
    this.ringMat.opacity = this.active ? 0.46 : 0.15
    this.ring.scale.setScalar(1 + Math.sin(time * 1.4) * 0.025)

    if (this.landmarkRing) {
      this.landmarkMat.opacity = 0.26 + Math.sin(time * 1.1) * 0.07
      this.landmarkRing.scale.setScalar(1 + Math.sin(time * 1.1) * 0.03)
    }

    const targetScale = this.active ? 1.5 : 0
    this.promptBadge.scale.x +=
      (targetScale - this.promptBadge.scale.x) * Math.min(1, 14 * delta)
    this.promptBadge.scale.y = this.promptBadge.scale.x * 0.274
    this.promptBadge.material.opacity +=
      ((this.active ? 1 : 0) - this.promptBadge.material.opacity) * Math.min(1, 14 * delta)
    this.promptBadge.position.y = 2.55 + Math.sin(time * 1.5) * 0.02
    this.nameplate.position.y = 2.08 + Math.sin(time * 1.3) * 0.022

    // Nama meja hanya terbaca saat pengunjung mendekat; label Beranda bertahan
    // lebih jauh supaya langsung terbaca dari pintu masuk.
    const visibility = distanceVisibility(
      playerPos,
      this.group.position.x,
      this.group.position.z,
      2.2,
      this.sectionKey === 'home' ? 6.5 : 4.2,
    )
    applySpriteFade(this.nameplate, visibility * 0.95)
  }

  dispose() {
    this.nameplate.material.dispose()
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
