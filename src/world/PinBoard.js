import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RingGeometry,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
} from 'three'
import { SECTIONS, TESTIMONIAL_BOARD } from '../content/museum.js'
import { DECAL_TUNING, GROUND_LAYER } from './groundLayers.js'
import {
  createBoardTagTexture,
  createNameplateTexture,
  createPinBoardTexture,
  createPinNoteTexture,
  createPromptBadgeTexture,
} from './canvasTextures.js'
import { applySpriteFade, distanceVisibility } from './floatingText.js'

/** Warna cap per kategori testimoni; sama dengan warna NPC pengunjung. */
const TYPE_ACCENT = {
  teacher: '#c9a05c',
  friend: '#cf8f9f',
  user: '#7f9b86',
  internship: '#c15a45',
}

const TYPE_SEAL = {
  teacher: '師',
  friend: '友',
  user: '客',
  internship: '職',
}

const NOTE_COLUMNS = 4
const NOTE_ROWS = 2
const NOTE_WIDTH = 0.4
const NOTE_HEIGHT = 0.5

/** Posisi kertas di papan: kisi 4 × 2 dengan sedikit goyang tangan. */
const NOTE_SLOTS = Array.from({ length: NOTE_COLUMNS * NOTE_ROWS }, (_, index) => {
  const column = index % NOTE_COLUMNS
  const row = Math.floor(index / NOTE_COLUMNS)
  const noise = Math.sin(index * 12.9898) * 43758.5453
  const fraction = noise - Math.floor(noise)
  return {
    index,
    x: -0.66 + column * 0.44 + (fraction - 0.5) * 0.03,
    y: 0.17 - row * 0.52 + (0.5 - fraction) * 0.02,
    rotation: (fraction - 0.5) * 0.14,
    depth: index * 0.0016,
  }
})

/**
 * Papan tempel testimoni: kertas-kertas yang dipaku di papan goni bertiang.
 *
 * Bukan panel UI: pengunjung mendatangi papannya, lalu menulis di selembar
 * kertas, dan kertas itu benar-benar muncul di papan setelah dikirim. Kertas
 * dengan cap “待審” adalah kiriman yang belum disetujui admin.
 */
export class PinBoard {
  constructor(testimonials = [], config = TESTIMONIAL_BOARD) {
    this.id = config.id
    this.kind = 'board'
    this.config = config
    this.section = SECTIONS.testimonials
    this.active = false
    this.notes = []
    this.textures = []
    this.materials = []
    this.pinMaterials = new Map()

    this.group = new Group()
    this.group.name = this.id
    this.group.userData.stationId = this.id
    this.group.position.set(config.position[0], 0, config.position[1])
    this.group.rotation.y = config.rotationY

    const forwardX = Math.sin(config.rotationY)
    const forwardZ = Math.cos(config.rotationY)
    this.interaction = {
      x: config.position[0] + forwardX * config.standDistance,
      z: config.position[1] + forwardZ * config.standDistance,
    }
    this.anchor = { x: config.position[0], z: config.position[1] }
    this.collider = {
      x: config.position[0],
      z: config.position[1],
      radius: config.colliderRadius,
    }
    this.interactRadius = config.interactRadius

    this.shareMaterials()
    this.buildFrame()
    this.buildNotes(testimonials)
    this.buildShelf()
    this.buildTags()
    this.buildPrompt()
    this.buildHitArea()
  }

  shareMaterials() {
    this.woodMat = new MeshStandardMaterial({
      color: 0x2f2219,
      roughness: 0.88,
      metalness: 0.02,
    })
    this.railMat = new MeshStandardMaterial({
      color: 0x6f5a3c,
      roughness: 0.82,
      metalness: 0.04,
    })
    this.ironMat = new MeshStandardMaterial({
      color: 0x2a241f,
      roughness: 0.62,
      metalness: 0.35,
    })
    this.paperMat = new MeshStandardMaterial({
      color: 0xe7d9ba,
      roughness: 0.95,
      metalness: 0,
    })
    this.stoneMat = new MeshStandardMaterial({ color: 0x3a342d, roughness: 0.8 })
    this.accentMat = new MeshBasicMaterial({
      color: SECTIONS.testimonials.accent,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      ...DECAL_TUNING,
    })
    this.materials.push(
      this.woodMat,
      this.railMat,
      this.ironMat,
      this.paperMat,
      this.stoneMat,
      this.accentMat,
    )
  }

  pinMaterial(accent) {
    if (this.pinMaterials.has(accent)) return this.pinMaterials.get(accent)
    const material = new MeshStandardMaterial({
      color: accent,
      roughness: 0.46,
      metalness: 0.28,
      emissive: accent,
      emissiveIntensity: 0.08,
    })
    this.pinMaterials.set(accent, material)
    this.materials.push(material)
    return material
  }

  /** Rangka kayu, permukaan goni, dan tiang penyangga. */
  buildFrame() {
    const { width, height } = this.config
    const panelY = 1.42

    this.panel = new Group()
    this.panel.position.set(0, panelY, 0)
    // Papan dimiringkan sedikit ke belakang agar terlihat dari kamera isometrik.
    this.panel.rotation.x = -0.1
    this.group.add(this.panel)

    const back = new Mesh(
      new BoxGeometry(width, height, 0.07),
      this.woodMat,
    )
    back.position.z = -0.055
    back.castShadow = true
    back.receiveShadow = true
    this.panel.add(back)

    const surfaceTexture = createPinBoardTexture()
    this.textures.push(surfaceTexture)
    this.surfaceMat = new MeshStandardMaterial({
      map: surfaceTexture,
      roughness: 0.96,
      metalness: 0,
    })
    this.materials.push(this.surfaceMat)

    const surface = new Mesh(
      new PlaneGeometry(width - 0.2, height - 0.2),
      this.surfaceMat,
    )
    surface.position.z = 0.001
    surface.receiveShadow = true
    this.panel.add(surface)

    // Bingkai: dua balok mendatar, dua balok tegak.
    for (const [w, h, x, y] of [
      [width + 0.14, 0.1, 0, height / 2 - 0.02],
      [width + 0.14, 0.1, 0, -height / 2 + 0.02],
      [0.1, height + 0.14, -width / 2 + 0.02, 0],
      [0.1, height + 0.14, width / 2 - 0.02, 0],
    ]) {
      const beam = new Mesh(new BoxGeometry(w, h, 0.12), this.woodMat)
      beam.position.set(x, y, 0.02)
      beam.castShadow = true
      beam.receiveShadow = true
      this.panel.add(beam)
    }

    // Tiang A: dua kaki per sisi, satu batang penopang di atas.
    for (const x of [-width / 2 + 0.24, width / 2 - 0.24]) {
      this.addLeg(x, 0.58, 0.14, 2.24)
      this.addLeg(x, -0.66, -0.1, 2.24)

      const foot = new Mesh(new BoxGeometry(0.16, 0.07, 0.3), this.ironMat)
      foot.position.set(x, 0.035, 0.56)
      foot.castShadow = true
      this.group.add(foot)

      const backFoot = new Mesh(new BoxGeometry(0.16, 0.07, 0.24), this.ironMat)
      backFoot.position.set(x, 0.035, -0.64)
      backFoot.castShadow = true
      this.group.add(backFoot)
    }

    const rail = new Mesh(new CylinderGeometry(0.035, 0.035, width + 0.5, 8), this.railMat)
    rail.rotation.z = Math.PI / 2
    rail.position.set(0, 2.3, 0.12)
    rail.castShadow = true
    this.group.add(rail)

    for (const x of [-width / 2 - 0.2, width / 2 + 0.2]) {
      const cap = new Mesh(new SphereGeometry(0.045, 8, 6), this.railMat)
      cap.position.set(x, 2.3, 0.12)
      this.group.add(cap)
    }
  }

  /** Satu kaki kayu miring dari lantai ke batang atas. */
  addLeg(x, baseZ, topZ, topY) {
    const length = Math.hypot(topZ - baseZ, topY)
    const leg = new Mesh(new CylinderGeometry(0.042, 0.055, length, 6), this.woodMat)
    leg.position.set(x, topY / 2, (baseZ + topZ) / 2)
    leg.rotation.x = Math.asin((topZ - baseZ) / length)
    leg.castShadow = true
    this.group.add(leg)
  }

  /** Kertas-kertas yang sudah disetujui admin. */
  buildNotes(testimonials) {
    const list = Array.isArray(testimonials) ? testimonials : []
    list.slice(0, NOTE_SLOTS.length).forEach((testimonial) => {
      this.addNote(testimonial, { animate: false })
    })
  }

  /**
   * Paku satu lembar kertas baru.
   * Dipakai saat museum dibangun (testimoni dari database) dan saat pengunjung
   * baru saja menempelkan tulisannya sendiri (`pending = true`).
   */
  addNote(testimonial, { pending = false, animate = true } = {}) {
    const used = new Set(this.notes.map((record) => record.slotIndex))
    let slotIndex = NOTE_SLOTS.findIndex((slot) => !used.has(slot.index))
    if (slotIndex < 0) {
      // Papan penuh: kertas tertua dilepas supaya kiriman terbaru tetap terlihat.
      const oldest = this.notes.shift()
      slotIndex = oldest.slotIndex
      this.disposeNote(oldest)
    }

    const slot = NOTE_SLOTS[slotIndex]
    const accent = TYPE_ACCENT[testimonial.type] ?? '#b23a30'
    const texture = createPinNoteTexture({
      name: testimonial.name,
      role: testimonial.role || testimonial.organization || '',
      quote: testimonial.quote,
      accent,
      seal: TYPE_SEAL[testimonial.type] ?? '言',
      pending,
      seed: (Number(testimonial.id) || 1) % 997,
    })
    this.textures.push(texture)

    const material = new MeshStandardMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.28,
      roughness: 0.94,
      metalness: 0,
      side: DoubleSide,
    })
    this.materials.push(material)

    const note = new Mesh(new PlaneGeometry(NOTE_WIDTH, NOTE_HEIGHT), material)
    note.position.set(slot.x, slot.y, 0.05 + slot.depth)
    note.rotation.z = slot.rotation
    note.castShadow = true
    this.panel.add(note)

    const pin = new Mesh(new SphereGeometry(0.022, 8, 6), this.pinMaterial(accent))
    pin.position.set(0, NOTE_HEIGHT / 2 - 0.035, 0.012)
    note.add(pin)

    const record = {
      slotIndex,
      note,
      pin,
      texture,
      material,
      accent,
      pending,
      appear: animate ? 0 : 1,
      baseRotation: slot.rotation,
    }
    this.notes.push(record)

    if (animate) {
      note.scale.setScalar(0.2)
      note.rotation.z = slot.rotation + 0.3
    }

    return record
  }

  disposeNote(record) {
    if (!record) return
    this.panel.remove(record.note)
    record.note.geometry.dispose()
    record.material.dispose()
    record.texture.dispose()
  }

  /** Rak kecil di depan papan: tumpukan kertas kosong, batu tinta, kuas. */
  buildShelf() {
    const shelf = new Mesh(new BoxGeometry(0.78, 0.05, 0.3), this.woodMat)
    shelf.position.set(-0.46, 0.95, 0.34)
    shelf.castShadow = true
    shelf.receiveShadow = true
    this.group.add(shelf)

    // Penopang miring dari papan ke rak, supaya rak terlihat menempel.
    for (const x of [-0.74, -0.18]) {
      const bracket = new Mesh(new BoxGeometry(0.045, 0.3, 0.05), this.woodMat)
      bracket.position.set(x, 0.84, 0.2)
      bracket.rotation.x = 0.68
      this.group.add(bracket)
    }

    // Tumpukan kertas kosong: beberapa lembar yang sedikit bergeser.
    for (let index = 0; index < 4; index += 1) {
      const slip = new Mesh(new PlaneGeometry(0.26, 0.34), this.paperMat)
      slip.rotation.x = -Math.PI / 2
      slip.rotation.z = 0.06 + index * 0.035
      slip.position.set(-0.56 + index * 0.008, 0.978 + index * 0.004, 0.34)
      slip.receiveShadow = true
      this.group.add(slip)
    }

    // Batu tinta dan kuas yang bersandar.
    const inkstone = new Mesh(new CylinderGeometry(0.11, 0.13, 0.05, 9), this.stoneMat)
    inkstone.position.set(-0.2, 1.0, 0.35)
    inkstone.castShadow = true
    this.group.add(inkstone)

    const brush = new Mesh(new CylinderGeometry(0.008, 0.013, 0.32, 5), this.railMat)
    brush.position.set(-0.08, 1.12, 0.38)
    brush.rotation.z = 0.55
    brush.castShadow = true
    this.group.add(brush)

    const tip = new Mesh(new ConeGeometry(0.016, 0.06, 5), this.ironMat)
    tip.position.set(0.055, 0.975, 0.38)
    tip.rotation.z = -2.4
    this.group.add(tip)
  }

  /** Dua kertas gantung di batang atas: “留言”. */
  buildTags() {
    const texture = createBoardTagTexture()
    this.textures.push(texture)
    this.tagMat = new MeshStandardMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.3,
      roughness: 0.95,
      side: DoubleSide,
    })
    this.materials.push(this.tagMat)

    this.tagPivots = []
    for (const [x, scale] of [
      [-1.18, 1],
      [1.18, 0.82],
    ]) {
      const pivot = new Group()
      pivot.position.set(x, 2.3, 0.12)

      const cord = new Mesh(new CylinderGeometry(0.006, 0.006, 0.14, 4), this.railMat)
      cord.position.y = -0.07
      pivot.add(cord)

      const tag = new Mesh(new PlaneGeometry(0.24 * scale, 0.52 * scale), this.tagMat)
      tag.position.y = -0.14 - (0.52 * scale) / 2
      pivot.add(tag)

      pivot.userData.seed = x * 1.7
      this.group.add(pivot)
      this.tagPivots.push(pivot)
    }
  }

  buildPrompt() {
    const nameTexture = createNameplateTexture({
      title: SECTIONS.testimonials.label,
      accent: SECTIONS.testimonials.accent,
      compact: true,
    })
    this.textures.push(nameTexture)
    this.nameplate = new Sprite(
      new SpriteMaterial({ map: nameTexture, transparent: true, depthWrite: false }),
    )
    this.nameplate.position.set(0, 2.68, 0.2)
    this.nameplate.scale.set(2, 0.457, 1)
    this.group.add(this.nameplate)

    const promptTexture = createPromptBadgeTexture({
      key: 'E',
      action: 'Tulis testimoni',
      accent: SECTIONS.testimonials.accent,
    })
    this.textures.push(promptTexture)
    this.promptBadge = new Sprite(
      new SpriteMaterial({ map: promptTexture, transparent: true, depthWrite: false }),
    )
    this.promptBadge.position.set(0, 3.08, 0.2)
    this.promptBadge.scale.set(0, 0, 1)
    this.promptBadge.material.opacity = 0
    this.group.add(this.promptBadge)

    const ring = new Mesh(new RingGeometry(1.02, 1.11, 44), this.accentMat)
    ring.rotation.x = -Math.PI / 2
    ring.position.y = GROUND_LAYER.stationRing
    this.ring = ring
    this.group.add(ring)
  }

  buildHitArea() {
    const hitArea = new Mesh(
      new BoxGeometry(this.config.width + 0.3, 2.5, 0.5),
      new MeshBasicMaterial({ visible: false }),
    )
    hitArea.position.set(0, 1.3, 0.05)
    hitArea.userData.stationId = this.id
    this.group.add(hitArea)
  }

  setActive(active) {
    this.active = Boolean(active)
  }

  update(delta, elapsed, playerPos = null) {
    const time = elapsed + this.config.position[0] * 0.3

    for (const pivot of this.tagPivots) {
      pivot.rotation.z = Math.sin(time * 0.8 + pivot.userData.seed) * 0.06
      pivot.rotation.x = Math.cos(time * 0.62 + pivot.userData.seed) * 0.03
    }

    for (const record of this.notes) {
      if (record.appear < 1) {
        record.appear = Math.min(1, record.appear + delta * 2.2)
        const eased = 1 - Math.pow(1 - record.appear, 3)
        record.note.scale.setScalar(0.2 + eased * 0.8)
        record.note.rotation.z =
          record.baseRotation + (1 - eased) * 0.3 + Math.sin(eased * Math.PI) * 0.04
      }
    }

    // Kertas terbaru bergoyang paling jelas; pin bersorot saat papan aktif.
    const newest = this.notes[this.notes.length - 1]
    // Kertas terbaru hanya bergoyang saat pemain berdiri di papan. Kertas yang
    // dipaku dan terus bergetar sendiri terlihat seperti kertas lepas.
    if (newest && this.active) {
      newest.note.rotation.z = newest.baseRotation + Math.sin(time * 1.1) * 0.014
    }
    for (const record of this.notes) {
      const material = record.pin.material
      const target = this.active ? 0.34 : 0.08
      material.emissiveIntensity += (target - material.emissiveIntensity) * Math.min(1, 8 * delta)
    }

    this.accentMat.opacity = this.active ? 0.42 : 0.14
    this.ring.scale.setScalar(1 + Math.sin(time * 1.4) * 0.02)

    const targetScale = this.active ? 1.45 : 0
    this.promptBadge.scale.x +=
      (targetScale - this.promptBadge.scale.x) * Math.min(1, 14 * delta)
    this.promptBadge.scale.y = this.promptBadge.scale.x * 0.274
    this.promptBadge.material.opacity +=
      ((this.active ? 1 : 0) - this.promptBadge.material.opacity) * Math.min(1, 14 * delta)
    this.promptBadge.position.y = 3.08 + Math.sin(time * 1.5) * 0.02

    this.nameplate.position.y = 2.68 + Math.sin(time * 1.2) * 0.02
    const visibility = distanceVisibility(
      playerPos,
      this.config.position[0],
      this.config.position[1],
      3.4,
      7,
    )
    applySpriteFade(this.nameplate, visibility * 0.95)
  }

  dispose() {
    this.nameplate.material.dispose()
    this.promptBadge.material.dispose()
    for (const record of this.notes) {
      record.note.geometry.dispose()
      record.material.dispose()
      record.texture.dispose()
    }
    this.notes = []
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
