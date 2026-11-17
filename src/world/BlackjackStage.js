import {
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
} from 'three'
import {
  createCardBackTexture,
  createCardFaceTexture,
  createDealerMaskTexture,
} from './canvasTextures.js'

const FELT_Y = 0.8
const CARD_W = 0.098
const CARD_H = 0.137
const DRAW_TIME = 0.34
const SHOE = { x: -0.72, y: 0.9, z: -0.36 }

/**
 * Isi meja judi untuk mode duduk (orang pertama).
 *
 * `GameTable` hanya menyediakan perabot; kelas ini yang menggambar kartu,
 * keping taruhan, dan sosok bandar sesuai keadaan mesin `blackjack.js`.
 * Semuanya anak dari grup meja, jadi koordinat di sini lokal terhadap meja.
 *
 * Aturan animasi museum tetap dipakai: tidak ada benda yang berputar terus,
 * tidak ada objek yang bergetar. Yang bergerak hanya kartu yang baru ditarik
 * (sekali jalan) dan napas bandar (periode 6 detik, amplitudo 1,5%).
 */
export class BlackjackStage {
  constructor(table) {
    this.table = table
    this.group = new Group()
    this.group.name = 'blackjack-stage'
    this.textures = []
    this.materials = []
    this.pool = []
    this.faceCache = new Map()
    this.time = 0

    this.backTexture = createCardBackTexture({ accent: table.section?.accent ?? '#b23a30' })
    this.textures.push(this.backTexture)
    this.maskTexture = createDealerMaskTexture()
    this.textures.push(this.maskTexture)

    this.shareMaterials()
    this.buildDealer()
    this.buildBetChips()
    // Satu geometri dipakai semua kartu; kartunya dibuat saat benar-benar perlu
    // (`ensureCard`), bukan dua lusin sekaligus ketika pemain baru duduk.
    this.cardGeometry = new PlaneGeometry(CARD_W, CARD_H)

    table.group.add(this.group)
    table.showLooseCards(false)
  }

  shareMaterials() {
    this.clothMat = new MeshStandardMaterial({ color: 0x241d1a, roughness: 0.94, metalness: 0.02 })
    this.paperMat = new MeshStandardMaterial({ color: 0xe6d6b6, roughness: 0.96, metalness: 0 })
    this.bronzeMat = new MeshStandardMaterial({ color: 0x8a6a3c, roughness: 0.45, metalness: 0.55 })
    this.vermilionMat = new MeshStandardMaterial({
      color: 0xa8382d,
      roughness: 0.8,
      metalness: 0.04,
    })
    this.materials.push(this.clothMat, this.paperMat, this.bronzeMat, this.vermilionMat)

    this.maskMat = new MeshStandardMaterial({
      map: this.maskTexture,
      transparent: true,
      alphaTest: 0.35,
      roughness: 0.92,
      side: DoubleSide,
    })
    this.materials.push(this.maskMat)
  }

  /**
   * Bandar arsip: sosok duduk dari primitif (jubah tinta, wajah kertas,
   * topi lebar). Tidak ada model baru yang perlu diunduh, dan siluetnya
   * tetap terbaca dari kursi pemain.
   */
  buildDealer() {
    const figure = new Group()
    figure.position.set(0, 0, -1.15)
    this.figure = figure

    const robe = new Mesh(new CylinderGeometry(0.36, 0.56, 0.98, 14), this.clothMat)
    robe.position.y = 0.5
    robe.castShadow = true
    figure.add(robe)
    this.torso = robe

    const shoulders = new Mesh(new SphereGeometry(0.3, 16, 10), this.clothMat)
    shoulders.scale.set(1.24, 0.6, 0.88)
    shoulders.position.y = 0.96
    shoulders.castShadow = true
    figure.add(shoulders)

    const neck = new Mesh(new CylinderGeometry(0.068, 0.08, 0.12, 8), this.paperMat)
    neck.position.y = 1.14
    figure.add(neck)

    const head = new Mesh(new SphereGeometry(0.145, 16, 12), this.paperMat)
    head.position.y = 1.27
    head.castShadow = true
    figure.add(head)

    const mask = new Mesh(new PlaneGeometry(0.23, 0.29), this.maskMat)
    mask.position.set(0, 1.27, 0.135)
    figure.add(mask)

    const brim = new Mesh(new CylinderGeometry(0.42, 0.42, 0.018, 20), this.clothMat)
    brim.position.y = 1.4
    brim.castShadow = true
    figure.add(brim)

    const crown = new Mesh(new CylinderGeometry(0.17, 0.21, 0.17, 14), this.clothMat)
    crown.position.y = 1.49
    crown.castShadow = true
    figure.add(crown)

    const knot = new Mesh(new SphereGeometry(0.035, 8, 6), this.vermilionMat)
    knot.position.set(0, 1.58, 0)
    figure.add(knot)

    // Lengan berjubah yang berhenti di tepi meja.
    for (const side of [-1, 1]) {
      const sleeve = new Mesh(new CylinderGeometry(0.055, 0.075, 0.52, 8), this.clothMat)
      sleeve.position.set(side * 0.27, 0.86, -0.16)
      sleeve.rotation.x = Math.PI * 0.43
      sleeve.rotation.z = side * 0.12
      sleeve.castShadow = true
      figure.add(sleeve)

      const hand = new Mesh(new SphereGeometry(0.045, 8, 6), this.paperMat)
      hand.position.set(side * 0.21, 0.83, 0.06)
      figure.add(hand)
    }

    this.group.add(figure)
  }

  /** Keping taruhan yang benar-benar mengikuti `game.bet`. */
  buildBetChips() {
    this.betChips = new Group()
    this.betChips.position.set(0.36, FELT_Y, 0.44)
    this.chipMeshes = []
    for (let index = 0; index < 12; index += 1) {
      const chip = new Mesh(new CylinderGeometry(0.046, 0.046, 0.013, 14), this.vermilionMat)
      chip.position.set(0, 0.008 + index * 0.014, 0)
      chip.rotation.y = index * 0.35
      chip.castShadow = true
      chip.visible = false
      this.chipMeshes.push(chip)
      this.betChips.add(chip)
    }
    this.group.add(this.betChips)
  }

  makeCard() {
    const material = new MeshStandardMaterial({
      roughness: 0.92,
      metalness: 0,
      transparent: false,
      side: DoubleSide,
    })
    this.materials.push(material)
    const mesh = new Mesh(this.cardGeometry, material)
    mesh.rotation.x = -Math.PI / 2
    mesh.visible = false
    mesh.userData = {
      key: null,
      t: 1,
      from: { x: SHOE.x, y: SHOE.y, z: SHOE.z },
      fromAngle: 0,
      target: { x: 0, y: FELT_Y, z: 0, angle: 0 },
    }
    this.group.add(mesh)
    return mesh
  }

  /** Kartu ke-`index` di meja, dibuat sekali lalu dipakai ulang. */
  ensureCard(index) {
    while (this.pool.length <= index) this.pool.push(this.makeCard())
    return this.pool[index]
  }

  faceTexture(card) {
    const key = `${card?.rank ?? 'A'}${card?.suit ?? '♠'}`
    const cached = this.faceCache.get(key)
    if (cached) return cached
    const red = card?.suit === '♥' || card?.suit === '♦'
    const texture = createCardFaceTexture({
      rank: card?.rank ?? 'A',
      suit: card?.suit ?? '♠',
      red,
    })
    this.textures.push(texture)
    this.faceCache.set(key, texture)
    return texture
  }

  /** Selaraskan kartu & keping di meja dengan keadaan mesin. */
  sync(game) {
    if (!game) return
    const dealer = Array.isArray(game.dealer) ? game.dealer : []
    const player = Array.isArray(game.player) ? game.player : []
    const revealed = Number(game.revealed) || 0
    const peek = Boolean(game.peek)

    const entries = []
    dealer.forEach((card, index) => {
      entries.push({
        key: `d${index}-${card?.rank ?? '?'}${card?.suit ?? '?'}`,
        card,
        faceUp: index < revealed || peek,
        x: -0.12 + index * 0.088,
        z: -0.46,
        angle: 0.09 - index * 0.055,
      })
    })
    player.forEach((card, index) => {
      entries.push({
        key: `p${index}-${card?.rank ?? '?'}${card?.suit ?? '?'}`,
        card,
        faceUp: true,
        x: -0.12 + index * 0.09,
        z: 0.46,
        angle: -0.07 + index * 0.05,
      })
    })

    this.pool.forEach((mesh, index) => {
      if (index >= entries.length) {
        mesh.visible = false
        mesh.userData.key = null
      }
    })

    entries.forEach((entry, index) => {
      const mesh = this.ensureCard(index)
      const data = mesh.userData
      const isNew = data.key !== entry.key
      const texture = entry.faceUp ? this.faceTexture(entry.card) : this.backTexture
      if (mesh.material.map !== texture) {
        mesh.material.map = texture
        mesh.material.needsUpdate = true
      }

      data.target = {
        x: entry.x,
        y: FELT_Y + 0.004 + index * 0.0015,
        z: entry.z,
        angle: entry.angle,
      }

      if (isNew) {
        data.key = entry.key
        data.t = 0
        data.from = { x: SHOE.x, y: SHOE.y, z: SHOE.z }
        data.fromAngle = 0.4
        mesh.position.set(SHOE.x, SHOE.y, SHOE.z)
        mesh.rotation.z = 0.4
      }
      mesh.visible = true
    })

    const betChips = Math.max(0, Math.min(12, Math.round((Number(game.bet) || 0) / 5)))
    this.chipMeshes.forEach((chip, index) => {
      chip.visible = index < betChips
    })
  }

  update(delta) {
    const step = Math.max(0, Math.min(0.1, delta || 0))
    this.time += step

    for (const mesh of this.pool) {
      if (!mesh.visible) continue
      const data = mesh.userData
      if (data.t >= 1) continue
      data.t = Math.min(1, data.t + step / DRAW_TIME)
      const ease = 1 - (1 - data.t) ** 3
      const target = data.target
      mesh.position.x = data.from.x + (target.x - data.from.x) * ease
      mesh.position.z = data.from.z + (target.z - data.from.z) * ease
      mesh.position.y =
        data.from.y + (target.y - data.from.y) * ease + Math.sin(Math.PI * data.t) * 0.045
      mesh.rotation.z = data.fromAngle + (target.angle - data.fromAngle) * ease
    }

    // Napas bandar: 6 detik per tarikan, 1,5% — batas aman aturan museum.
    if (this.torso) {
      this.torso.scale.y = 1 + Math.sin(this.time * (Math.PI * 2) / 6) * 0.015
    }
  }

  dispose() {
    for (const texture of this.textures) texture.dispose()
    for (const material of this.materials) material.dispose()
    const geometries = new Set()
    this.group.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry)
    })
    if (this.cardGeometry) geometries.add(this.cardGeometry)
    for (const geometry of geometries) geometry.dispose()
    this.cardGeometry = null
    this.group.clear()
    this.table.group.remove(this.group)
    this.pool = []
    this.chipMeshes = []
    this.faceCache.clear()
    this.textures = []
    this.materials = []
  }
}
