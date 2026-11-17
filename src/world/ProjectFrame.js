import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RingGeometry,
  SRGBColorSpace,
  Sprite,
  SpriteMaterial,
  TextureLoader,
} from 'three'
import { DECAL_TUNING, GROUND_LAYER } from './groundLayers.js'
import {
  createNameplateTexture,
  createProjectScrollTexture,
  createPromptBadgeTexture,
} from './canvasTextures.js'
import { applySpriteFade, distanceVisibility } from './floatingText.js'

/**
 * Bingkai proyek di galeri museum.
 * Menampilkan screenshot/ gambar utama bila tersedia; jika tidak, gulungan
 * karya digambar dari metadata proyek.
 */
export class ProjectFrame {
  constructor(project, slot, index) {
    this.id = `project-${project.id}`
    this.kind = 'project'
    this.project = project
    this.slot = slot
    this.index = index
    this.accent = project.accent || '#b23a30'
    this.active = false
    this.disposed = false

    const [width, height] = slot.size ?? [3.4, 2.2]
    this.width = width
    this.height = height
    this.elevation = slot.elevation ?? 1.55
    // Bingkai baris atas (rank > 0) digantung pada tiang baris bawah, jadi ia
    // tidak punya alas/kaki sendiri.
    this.rank = slot.rank ?? 0
    this.hung = slot.hung ?? this.rank > 0
    this.postHeight = slot.postHeight ?? this.elevation + 0.24
    // Barisan yang panjang memakai bingkai lebih kecil; label ikut mengecil
    // agar tidak menutupi bingkai tetangganya.
    this.labelScale = Math.max(0.72, Math.min(1, width / 3.4))

    this.group = new Group()
    this.group.name = this.id
    this.group.position.set(slot.position[0], 0, slot.position[1])
    this.group.rotation.y = slot.rotationY ?? 0
    this.group.userData.stationId = this.id

    const forwardX = Math.sin(slot.rotationY ?? 0)
    const forwardZ = Math.cos(slot.rotationY ?? 0)
    // Bingkai baris atas punya titik berdiri lebih jauh dari dinding, jadi
    // berdiri dekat dinding memilih bingkai bawah dan melangkah mundur memilih
    // bingkai atas.
    const standDistance = slot.standDistance ?? 1.4
    this.interaction = {
      x: slot.position[0] + forwardX * standDistance,
      z: slot.position[1] + forwardZ * standDistance,
    }
    // Baris atas berbagi tapak dengan tiang di bawahnya, jadi hanya baris
    // bawah yang menjadi penghalang navigasi.
    this.collider = this.hung
      ? null
      : {
          x: slot.position[0],
          z: slot.position[1],
          radius: 0.72,
        }
    this.anchor = { x: slot.position[0], z: slot.position[1] }
    // Bingkai atas dijangkau dari titik berdiri yang lebih jauh, jadi radius
    // interaksinya ikut lebih besar (dan tidak berebut dengan bingkai bawah).
    this.interactRadius = 1.8 + this.rank * 1.55

    this.textures = []
    this.materials = []

    this.buildStand()
    this.buildScreen()
    this.buildNameplate()
    this.buildPrompt()
    this.buildHitArea()
    this.loadImage()
  }

  buildStand() {
    this.stoneMat = new MeshStandardMaterial({
      color: 0x51463a,
      roughness: 0.9,
      metalness: 0.02,
    })
    this.woodMat = new MeshStandardMaterial({
      color: 0x30231b,
      roughness: 0.88,
      metalness: 0.02,
    })
    this.inkMat = new MeshStandardMaterial({
      color: 0x211a15,
      roughness: 0.85,
    })
    this.materials.push(this.stoneMat, this.woodMat, this.inkMat)

    // Bingkai baris atas menumpang pada tiang bingkai di bawahnya.
    if (this.hung) return

    const postHeight = this.postHeight

    const base = new Mesh(new CylinderGeometry(0.62, 0.78, 0.24, 6), this.stoneMat)
    base.position.y = 0.12
    base.castShadow = true
    base.receiveShadow = true
    this.group.add(base)

    // Tiang naik sampai bingkai teratas (bukan hanya bingkai ini), sehingga
    // rak dua tingkat punya dua batang kayu yang menopang keduanya.
    for (const x of [-this.width * 0.36, this.width * 0.36]) {
      const leg = new Mesh(
        new CylinderGeometry(0.05, 0.07, postHeight, 5),
        this.woodMat,
      )
      leg.position.set(x, postHeight / 2 + 0.12, -0.06)
      leg.castShadow = true
      this.group.add(leg)
    }

    const rail = new Mesh(
      new CylinderGeometry(0.04, 0.04, this.width * 0.86, 5),
      this.woodMat,
    )
    rail.rotation.z = Math.PI / 2
    rail.position.set(0, 0.38, -0.06)
    this.group.add(rail)
  }

  buildScreen() {
    const texture = createProjectScrollTexture({
      ...this.project,
      accent: this.accent,
      description: this.project.summary || this.project.description,
      href: this.project.demo_url || this.project.repo_url || '',
    })
    this.textures.push(texture)
    this.generatedTexture = texture

    this.screenMat = new MeshBasicMaterial({
      map: texture,
      toneMapped: false,
    })
    this.materials.push(this.screenMat)

    const glowMat = new MeshBasicMaterial({
      color: new Color(this.accent),
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
    })
    this.materials.push(glowMat)

    const glow = new Mesh(
      new PlaneGeometry(this.width + 0.34, this.height + 0.34),
      glowMat,
    )
    glow.position.set(0, this.elevation, 0.005)
    this.group.add(glow)
    this.glow = glow
    this.glowMat = glowMat

    this.screen = new Mesh(new PlaneGeometry(this.width, this.height), this.screenMat)
    this.screen.position.set(0, this.elevation, 0.035)
    this.screen.castShadow = true
    this.group.add(this.screen)

    // Punggung papan: saat kamera diputar 360°, bagian belakang bingkai tetap
    // berupa panel kayu gelap, bukan layar kosong yang tembus pandang.
    const backMat = new MeshStandardMaterial({
      color: 0x2b2119,
      roughness: 0.9,
      metalness: 0.02,
    })
    this.materials.push(backMat)
    const back = new Mesh(new PlaneGeometry(this.width, this.height), backMat)
    back.rotation.y = Math.PI
    back.position.set(0, this.elevation, -0.01)
    back.castShadow = true
    this.group.add(back)

    // Bingkai kayu.
    const border = 0.11
    for (const [w, h, x, y] of [
      [this.width + border * 2, border, 0, this.elevation + this.height / 2 + border / 2],
      [this.width + border * 2, border, 0, this.elevation - this.height / 2 - border / 2],
      [border, this.height, -this.width / 2 - border / 2, this.elevation],
      [border, this.height, this.width / 2 + border / 2, this.elevation],
    ]) {
      const bar = new Mesh(new BoxGeometry(w, h, 0.12), this.woodMat)
      bar.position.set(x, y, 0)
      bar.castShadow = true
      this.group.add(bar)
    }

    const topCap = new Mesh(
      new BoxGeometry(this.width + 0.64, 0.1, 0.36),
      this.woodMat,
    )
    topCap.position.set(0, this.elevation + this.height / 2 + 0.2, 0.03)
    topCap.castShadow = true
    this.group.add(topCap)
  }

  buildNameplate() {
    const texture = createNameplateTexture({
      title: this.project.title,
      accent: this.accent,
      compact: true,
    })
    this.textures.push(texture)

    this.nameplate = new Sprite(
      new SpriteMaterial({ map: texture, transparent: true, depthWrite: false }),
    )
    // Label melayang di atas bingkai, bukan menempel di bawah layar.
    this.nameplate.position.set(0, this.elevation + this.height / 2 + 0.3, 0.6)
    this.nameplate.scale.set(2.2 * this.labelScale, 0.503 * this.labelScale, 1)
    this.group.add(this.nameplate)
  }

  buildPrompt() {
    const texture = createPromptBadgeTexture({
      key: 'E',
      action: 'Buka proyek',
      accent: this.accent,
    })
    this.textures.push(texture)

    this.promptBadge = new Sprite(
      new SpriteMaterial({ map: texture, transparent: true, depthWrite: false }),
    )
    this.promptBadge.position.set(0, this.elevation + this.height / 2 + 0.96, 0.6)
    this.promptBadge.scale.set(0, 0, 1)
    this.promptBadge.material.opacity = 0
    this.group.add(this.promptBadge)

    this.ringMat = new MeshBasicMaterial({
      color: new Color(this.accent),
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      ...DECAL_TUNING,
    })
    this.materials.push(this.ringMat)

    // Cincin penanda hanya untuk bingkai yang berdiri di lantai.
    if (!this.hung) {
      this.ring = new Mesh(new RingGeometry(0.9, 0.98, 40), this.ringMat)
      this.ring.rotation.x = -Math.PI / 2
      this.ring.position.y = GROUND_LAYER.stationRing
      this.ring.renderOrder = 1
      this.group.add(this.ring)
    }
  }

  buildHitArea() {
    // Area klik bingkai baris atas dibuat pas di badannya agar tidak menutupi
    // area klik bingkai di bawahnya.
    const hitHeight = this.hung ? this.height + 0.6 : this.height + 1.3
    const hitArea = new Mesh(
      new BoxGeometry(this.width + 0.6, hitHeight, 0.7),
      new MeshBasicMaterial({ visible: false }),
    )
    hitArea.position.set(0, this.hung ? this.elevation : this.elevation + 0.2, 0)
    hitArea.userData.stationId = this.id
    this.group.add(hitArea)
    this.hitArea = hitArea
  }

  async loadImage() {
    if (!this.project.image_url) return
    try {
      const loader = new TextureLoader()
      const texture = await loader.loadAsync(this.project.image_url)
      if (this.disposed) {
        texture.dispose()
        return
      }
      texture.colorSpace = SRGBColorSpace
      texture.anisotropy = 4
      this.textures.push(texture)
      const previous = this.screenMat.map
      this.screenMat.map = texture
      this.screenMat.needsUpdate = true
      if (previous && previous !== texture) previous.dispose()
      this.generatedTexture = texture
    } catch {
      // Gambar gagal dimuat; gulungan hasil gambar tetap dipakai.
    }
  }

  setActive(active) {
    this.active = active
  }

  update(delta, elapsed, playerPos = null) {
    const time = elapsed + this.index * 0.9
    this.glowMat.opacity = (this.active ? 0.3 : 0.12) + Math.sin(time * 1.7) * 0.025
    if (this.ring) {
      this.ringMat.opacity = this.active ? 0.5 : 0.15
      this.ring.scale.setScalar(1 + Math.sin(time * 1.4) * 0.025)
    }

    const targetScale = this.active ? 1.5 * this.labelScale : 0
    this.promptBadge.scale.x +=
      (targetScale - this.promptBadge.scale.x) * Math.min(1, 14 * delta)
    this.promptBadge.scale.y = this.promptBadge.scale.x * 0.274
    this.promptBadge.material.opacity +=
      ((this.active ? 1 : 0) - this.promptBadge.material.opacity) * Math.min(1, 14 * delta)
    this.promptBadge.position.y =
      this.elevation + this.height / 2 + 0.96 + Math.sin(time * 1.5) * 0.02

    // Nama bingkai hanya muncul saat pemain berada dekat galeri.
    const visibility = distanceVisibility(
      playerPos,
      this.group.position.x,
      this.group.position.z,
      3.6,
      7.2,
    )
    applySpriteFade(this.nameplate, visibility * 0.95)
  }

  dispose() {
    this.disposed = true
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
