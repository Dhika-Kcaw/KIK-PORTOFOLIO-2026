import {
  BoxGeometry,
  CircleGeometry,
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
  TorusGeometry,
} from 'three'
import { GAME_TABLE, SECTIONS } from '../content/museum.js'
import { DECAL_TUNING, GROUND_LAYER } from './groundLayers.js'
import {
  createNameplateTexture,
  createPromptBadgeTexture,
} from './canvasTextures.js'
import { applySpriteFade, distanceVisibility } from './floatingText.js'

const TABLE_TOP_Y = 0.78
const FELT_Y = 0.792

/**
 * Kedai Kartu: meja judi kecil di sudut tenggara museum.
 *
 * Benda ini bukan panel yang mengambang — pemain mendatangi meja, duduk, lalu
 * bertaruh melawan bandar. Seluruh aturan permainan ada di `src/game/blackjack.js`;
 * kelas ini hanya menyediakan meja fisiknya, titik interaksi, dan penghalang
 * supaya karakter tidak bisa menembus meja.
 *
 * Animasi yang dipakai dibatasi aturan museum: tidak ada benda yang berputar
 * atau bergoyang terus-menerus. Hanya nyala lentera yang bernapas pelan
 * (periode 6 detik, amplitudo 4%) dan lencana prompt yang muncul saat didekati.
 */
export class GameTable {
  constructor(config = GAME_TABLE) {
    this.id = config.id
    this.kind = 'game'
    this.config = config
    this.section = SECTIONS.games
    this.active = false
    this.textures = []
    this.materials = []
    this.colliders = []

    this.group = new Group()
    this.group.name = this.id
    this.group.userData.stationId = this.id
    this.group.position.set(config.position[0], 0, config.position[1])
    this.group.rotation.y = config.rotationY ?? 0

    this.interaction = {
      x: config.position[0] + Math.sin(config.rotationY ?? 0) * config.standDistance,
      z: config.position[1] + Math.cos(config.rotationY ?? 0) * config.standDistance,
    }
    this.anchor = { x: config.position[0], z: config.position[1] }
    this.collider = {
      x: config.position[0],
      z: config.position[1],
      radius: config.colliderRadius ?? 1,
    }
    this.interactRadius = config.interactRadius ?? 1.55

    this.shareMaterials()
    this.buildTop()
    this.buildLegs()
    this.buildCards()
    this.buildChips()
    this.buildStools()
    this.buildLamp()
    this.buildPrompt()
    this.buildHitArea()
  }

  shareMaterials() {
    this.woodMat = new MeshStandardMaterial({ color: 0x33241a, roughness: 0.86, metalness: 0.03 })
    this.railMat = new MeshStandardMaterial({ color: 0x6d5638, roughness: 0.8, metalness: 0.05 })
    this.feltMat = new MeshStandardMaterial({ color: 0x27352c, roughness: 0.97, metalness: 0 })
    this.paperMat = new MeshStandardMaterial({ color: 0xe9dbbb, roughness: 0.95, metalness: 0 })
    this.vermilionMat = new MeshStandardMaterial({
      color: 0xa8382d,
      roughness: 0.78,
      metalness: 0.04,
    })
    this.bronzeMat = new MeshStandardMaterial({ color: 0x8a6a3c, roughness: 0.45, metalness: 0.55 })
    this.inkMat = new MeshStandardMaterial({ color: 0x1d1713, roughness: 0.9, metalness: 0.02 })
    this.accentMat = new MeshBasicMaterial({
      color: SECTIONS.games.accent,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      ...DECAL_TUNING,
    })
    this.materials.push(
      this.woodMat,
      this.railMat,
      this.feltMat,
      this.paperMat,
      this.vermilionMat,
      this.bronzeMat,
      this.inkMat,
      this.accentMat,
    )
  }

  /** Meja bundar: papan kayu, alas kain, dan dua kotak taruhan. */
  buildTop() {
    const top = new Mesh(new CylinderGeometry(1.02, 1.02, 0.07, 36), this.woodMat)
    top.position.y = TABLE_TOP_Y - 0.035
    top.castShadow = true
    top.receiveShadow = true
    this.group.add(top)

    const rim = new Mesh(new TorusGeometry(1.01, 0.045, 8, 36), this.railMat)
    rim.rotation.x = Math.PI / 2
    rim.position.y = TABLE_TOP_Y
    rim.castShadow = true
    this.group.add(rim)

    const felt = new Mesh(new CircleGeometry(0.965, 44), this.feltMat)
    felt.rotation.x = -Math.PI / 2
    felt.position.y = FELT_Y
    felt.receiveShadow = true
    this.group.add(felt)

    // Dua kotak taruhan: satu untuk bandar, satu untuk pemain.
    for (const [z, opacity] of [
      [-0.46, 0.3],
      [0.44, 0.34],
    ]) {
      const boxMat = new MeshBasicMaterial({
        color: SECTIONS.games.accent,
        transparent: true,
        opacity,
        depthWrite: false,
        ...DECAL_TUNING,
      })
      this.materials.push(boxMat)
      const box = new Mesh(new RingGeometry(0.15, 0.19, 28), boxMat)
      box.rotation.x = -Math.PI / 2
      box.position.set(0, FELT_Y + 0.002, z)
      this.group.add(box)
    }

    // Garis tengah kain, seperti lipatan meja yang jarang dipakai.
    const seamMat = new MeshBasicMaterial({
      color: 0x1b261f,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      ...DECAL_TUNING,
    })
    this.materials.push(seamMat)
    const seam = new Mesh(new PlaneGeometry(1.7, 0.012), seamMat)
    seam.rotation.x = -Math.PI / 2
    seam.position.set(0, FELT_Y + 0.001, -0.01)
    this.group.add(seam)
  }

  buildLegs() {
    for (const [x, z] of [
      [-0.62, 0.62],
      [0.62, 0.62],
      [-0.62, -0.62],
      [0.62, -0.62],
    ]) {
      const leg = new Mesh(new CylinderGeometry(0.048, 0.062, 0.74, 6), this.woodMat)
      leg.position.set(x, 0.37, z)
      leg.castShadow = true
      this.group.add(leg)

      const brace = new Mesh(new BoxGeometry(0.5, 0.04, 0.04), this.woodMat)
      brace.position.set(x * 0.5, 0.34, z)
      brace.castShadow = true
      this.group.add(brace)
    }
  }

  /** Kartu di atas kain: sepatu kartu selalu ada, kartu terbuka bisa disembunyikan. */
  buildCards() {
    // Kartu yang “tertinggal” di meja saat dilihat dari diorama. Saat pemain
    // duduk, kartu ini disembunyikan karena kartu sungguhan digambar oleh
    // `BlackjackStage` sesuai keadaan permainan.
    this.looseCards = new Group()
    this.group.add(this.looseCards)

    const card = (parent, x, z, rotation, faceUp) => {
      const backing = new Mesh(
        new BoxGeometry(0.1, 0.002, 0.14),
        faceUp ? this.paperMat : this.vermilionMat,
      )
      backing.position.set(x, FELT_Y + 0.003, z)
      backing.rotation.y = rotation
      backing.castShadow = true
      backing.receiveShadow = true
      parent.add(backing)

      if (faceUp) {
        const ink = new Mesh(new BoxGeometry(0.03, 0.0022, 0.05), this.vermilionMat)
        ink.position.set(x + 0.012, FELT_Y + 0.0042, z - 0.01)
        ink.rotation.y = rotation
        parent.add(ink)
      }
      return backing
    }

    // Tumpukan sepatu kartu di sisi bandar: bagian dari perabot, bukan kartu babak.
    for (let index = 0; index < 9; index += 1) {
      card(this.group, -0.5 + index * 0.003, -0.62 + index * 0.0035, 0.18 - index * 0.01, false)
    }

    // Kartu bandar dan pemain yang tertinggal di meja (hanya untuk diorama).
    card(this.looseCards, -0.08, -0.5, 0.06, true)
    card(this.looseCards, 0.04, -0.48, -0.12, false)
    card(this.looseCards, -0.06, 0.42, 0.08, true)
    card(this.looseCards, 0.06, 0.44, -0.06, true)

    // Kotak sepatu: kayu dengan mulut miring. Ditaruh lebih ke tengah supaya
    // sudutnya tidak menggantung di luar tepi meja.
    const shoe = new Mesh(new BoxGeometry(0.3, 0.16, 0.2), this.woodMat)
    shoe.position.set(-0.72, TABLE_TOP_Y + 0.08, -0.36)
    shoe.rotation.y = 0.42
    shoe.castShadow = true
    this.group.add(shoe)

    const mouth = new Mesh(new BoxGeometry(0.24, 0.03, 0.16), this.bronzeMat)
    mouth.position.set(-0.72, TABLE_TOP_Y + 0.165, -0.36)
    mouth.rotation.y = 0.42
    this.group.add(mouth)
  }

  /** Dua tumpukan keping: tembaga dan vermilion. */
  buildChips() {
    const stack = (x, z, colorMat, count) => {
      for (let index = 0; index < count; index += 1) {
        const chip = new Mesh(new CylinderGeometry(0.048, 0.048, 0.014, 14), colorMat)
        chip.position.set(x, FELT_Y + 0.008 + index * 0.015, z)
        chip.rotation.y = index * 0.4
        chip.castShadow = true
        this.group.add(chip)
      }
    }

    stack(-0.44, 0.6, this.vermilionMat, 6)
    stack(-0.28, 0.68, this.bronzeMat, 4)

    // Lonceng kecil untuk memanggil bandar.
    const bell = new Mesh(new CylinderGeometry(0.036, 0.05, 0.05, 10), this.bronzeMat)
    bell.position.set(0.52, TABLE_TOP_Y + 0.026, 0.62)
    bell.castShadow = true
    this.group.add(bell)

    const knob = new Mesh(new SphereGeometry(0.018, 8, 6), this.bronzeMat)
    knob.position.set(0.52, TABLE_TOP_Y + 0.058, 0.62)
    this.group.add(knob)
  }

  /** Dua bangku rendah di sisi pemain. */
  buildStools() {
    for (const [x, z] of [
      [-0.95, 1.34],
      [0.95, 1.34],
    ]) {
      const seat = new Mesh(new CylinderGeometry(0.2, 0.2, 0.06, 14), this.railMat)
      seat.position.set(x, 0.45, z)
      seat.castShadow = true
      seat.receiveShadow = true
      this.group.add(seat)

      for (let index = 0; index < 3; index += 1) {
        const angle = (index / 3) * Math.PI * 2 + 0.4
        const leg = new Mesh(new CylinderGeometry(0.022, 0.028, 0.44, 5), this.woodMat)
        leg.position.set(x + Math.cos(angle) * 0.13, 0.22, z + Math.sin(angle) * 0.13)
        leg.castShadow = true
        this.group.add(leg)
      }
      this.addCollider(x, z, 0.24)
    }
  }

  /** Tiang besi dengan lentera kertas kecil: sumber cahaya meja. */
  buildLamp() {
    const post = new Mesh(new CylinderGeometry(0.034, 0.048, 1.86, 6), this.inkMat)
    post.position.set(-1.24, 0.93, -0.36)
    post.castShadow = true
    this.group.add(post)

    const foot = new Mesh(new CylinderGeometry(0.15, 0.19, 0.06, 8), this.inkMat)
    foot.position.set(-1.24, 0.03, -0.36)
    foot.castShadow = true
    this.group.add(foot)

    const arm = new Mesh(new CylinderGeometry(0.022, 0.022, 0.36, 5), this.inkMat)
    arm.position.set(-1.06, 1.86, -0.36)
    arm.rotation.z = Math.PI / 2
    this.group.add(arm)

    const cord = new Mesh(new CylinderGeometry(0.006, 0.006, 0.1, 4), this.inkMat)
    cord.position.set(-0.88, 1.81, -0.36)
    this.group.add(cord)

    this.lanternMat = new MeshStandardMaterial({
      color: 0xf1dfb8,
      emissive: 0xff9b52,
      emissiveIntensity: 0.55,
      roughness: 0.92,
      side: DoubleSide,
    })
    this.materials.push(this.lanternMat)

    const lantern = new Mesh(new CylinderGeometry(0.115, 0.115, 0.24, 12, 1, true), this.lanternMat)
    lantern.position.set(-0.88, 1.64, -0.36)
    lantern.castShadow = true
    this.group.add(lantern)

    for (const y of [1.76, 1.52]) {
      const cap = new Mesh(new CylinderGeometry(0.07, 0.07, 0.014, 10), this.inkMat)
      cap.position.set(-0.88, y, -0.36)
      this.group.add(cap)
    }

    this.lampLight = new PointLight(0xffab6a, 1.05, 3.4, 2)
    this.lampLight.position.set(-0.88, 1.64, -0.36)
    this.group.add(this.lampLight)

    // Papan kecil bertulis “牌” di tiang: penanda kedai.
    const signTexture = createNameplateTexture({
      title: '牌',
      accent: SECTIONS.games.accent,
      compact: true,
    })
    this.textures.push(signTexture)
    const signMat = new MeshStandardMaterial({
      map: signTexture,
      transparent: true,
      alphaTest: 0.3,
      roughness: 0.95,
      side: DoubleSide,
    })
    this.materials.push(signMat)
    const sign = new Mesh(new PlaneGeometry(0.22, 0.3), signMat)
    sign.position.set(-1.24, 1.44, -0.35)
    this.group.add(sign)

    this.addCollider(-1.24, -0.36, 0.16)
  }

  buildPrompt() {
    const nameTexture = createNameplateTexture({
      title: SECTIONS.games.label,
      accent: SECTIONS.games.accent,
      compact: true,
    })
    this.textures.push(nameTexture)
    this.nameplate = new Sprite(
      new SpriteMaterial({ map: nameTexture, transparent: true, depthWrite: false }),
    )
    this.nameplate.position.set(0, 1.98, 0.15)
    this.nameplate.scale.set(2, 0.457, 1)
    this.group.add(this.nameplate)

    const promptTexture = createPromptBadgeTexture({
      key: 'E',
      action: 'Duduk bermain',
      accent: SECTIONS.games.accent,
    })
    this.textures.push(promptTexture)
    this.promptBadge = new Sprite(
      new SpriteMaterial({ map: promptTexture, transparent: true, depthWrite: false }),
    )
    this.promptBadge.position.set(0, 2.36, 0.15)
    this.promptBadge.scale.set(0, 0, 1)
    this.promptBadge.material.opacity = 0
    this.group.add(this.promptBadge)

    const ring = new Mesh(new RingGeometry(1.24, 1.33, 44), this.accentMat)
    ring.rotation.x = -Math.PI / 2
    ring.position.y = GROUND_LAYER.stationRing
    this.ring = ring
    this.group.add(ring)
  }

  buildHitArea() {
    const hitArea = new Mesh(
      new BoxGeometry(2.3, 1.5, 2.3),
      new MeshBasicMaterial({ visible: false }),
    )
    hitArea.position.y = 0.75
    hitArea.userData.stationId = this.id
    this.group.add(hitArea)
  }

  /** Tambahkan penghalang dalam koordinat dunia (meja bisa diputar). */
  addCollider(localX, localZ, radius) {
    const angle = this.config.rotationY ?? 0
    const x = this.config.position[0] + localX * Math.cos(angle) + localZ * Math.sin(angle)
    const z = this.config.position[1] - localX * Math.sin(angle) + localZ * Math.cos(angle)
    this.colliders.push({ x, z, radius })
  }

  setActive(active) {
    this.active = Boolean(active)
  }

  /** Sembunyikan kartu perabot selama pemain duduk (kartu sungguhan dari stage). */
  showLooseCards(visible) {
    if (this.looseCards) this.looseCards.visible = Boolean(visible)
  }

  /**
   * Mode duduk: papan nama dan badge prompt menghilang karena kamera berada
   * tepat di depan meja, dan kartu perabot diganti kartu sungguhan.
   */
  setSeated(active) {
    this.seated = Boolean(active)
    this.showLooseCards(!this.seated)
    if (this.nameplate) this.nameplate.visible = !this.seated
    if (this.promptBadge) this.promptBadge.visible = !this.seated
  }

  /** Ubah titik lokal meja menjadi koordinat dunia. */
  toWorld(x, y, z) {
    const angle = this.config.rotationY ?? 0
    return {
      x: this.config.position[0] + x * Math.cos(angle) + z * Math.sin(angle),
      y,
      z: this.config.position[1] - x * Math.sin(angle) + z * Math.cos(angle),
    }
  }

  /** Posisi mata & titik pandang saat duduk (koordinat dunia). */
  get seatPose() {
    const eye = this.config.seat?.eye ?? [0, 1.16, 1.45]
    const look = this.config.seat?.look ?? [0, 0.94, -0.5]
    return {
      eye: this.toWorld(eye[0], eye[1], eye[2]),
      look: this.toWorld(look[0], look[1], look[2]),
    }
  }

  update(delta, elapsed, playerPos = null) {
    const time = elapsed + 7.3

    // Nyala lentera bernapas sangat pelan (periode ±6 s, amplitudo 4%).
    const breath = 0.96 + Math.sin(time * 1.05) * 0.04
    this.lampLight.intensity = 1.05 * breath
    this.lanternMat.emissiveIntensity = 0.55 * breath

    this.accentMat.opacity = this.active ? 0.44 : 0.14
    this.ring.scale.setScalar(1 + Math.sin(time * 0.9) * 0.015)

    const targetScale = this.active ? 1.55 : 0
    this.promptBadge.scale.x +=
      (targetScale - this.promptBadge.scale.x) * Math.min(1, 14 * delta)
    this.promptBadge.scale.y = this.promptBadge.scale.x * 0.274
    this.promptBadge.material.opacity +=
      ((this.active ? 1 : 0) - this.promptBadge.material.opacity) * Math.min(1, 14 * delta)
    this.promptBadge.position.y = 2.36 + Math.sin(time * 1.1) * 0.02

    this.nameplate.position.y = 1.98 + Math.sin(time * 1.2) * 0.02
    const visibility = distanceVisibility(
      playerPos,
      this.config.position[0],
      this.config.position[1],
      3.2,
      6.6,
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
