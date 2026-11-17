import {
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Sprite,
  SpriteMaterial,
  Vector3,
} from 'three'
import {
  createNameplateTexture,
  createPromptBadgeTexture,
  createSpiritFaceTexture,
} from './canvasTextures.js'
import { clamp, shortestAngle } from '../core/math.js'
import { DECAL_TUNING, GROUND_LAYER } from './groundLayers.js'

/**
 * Roh kertas penghuni halaman:
 * - Tubuh kertas terlipat, topi tinta, wajah bergambar tangan, dan kertas doa.
 * - Mengambang pelan, bukan berjalan — cocok untuk diorama isometrik.
 * - AI roaming tetap dibatasi kotak { minX, maxX, minZ, maxZ }.
 */
export class Guide {
  constructor(data) {
    this.data = data
    this.id = data.id
    this.accent = data.accent || '#b23a30'

    this.boundary = data.boundary || {
      minX: data.position[0] - 2.5,
      maxX: data.position[0] + 2.5,
      minZ: data.position[1] - 2.5,
      maxZ: data.position[1] + 2.5,
    }

    this.group = new Group()
    this.group.name = `guide-${data.id}`
    this.position = new Vector3(data.position[0], 0, data.position[1])
    this.group.position.copy(this.position)
    this.heading = data.heading ?? 0
    this.group.rotation.y = this.heading
    this.group.userData.stationId = data.id

    this.active = false
    this.phase = data.position[0] * 0.41 + data.position[1] * 0.29

    this.interaction = { x: this.position.x, z: this.position.z }
    this.collider = { x: this.position.x, z: this.position.z, radius: 0.55 }

    this.state = 'idle'
    this.stateTimer = 1.5 + Math.random() * 2
    this.targetPos = new Vector3().copy(this.position)
    this.moveSpeed = 0.85
    this.stepCycle = 0

    this.buildMaterials()
    this.body = new Group()
    this.group.add(this.body)

    this.buildFigure()
    this.buildShadow()
    this.buildNameplate()
    this.buildPromptBadge()
    this.buildHitArea()
  }

  buildMaterials() {
    this.paperMat = new MeshStandardMaterial({
      color: 0xeadfc5,
      roughness: 0.92,
      metalness: 0,
      side: DoubleSide,
      flatShading: true,
    })
    this.paperWarmMat = new MeshStandardMaterial({
      color: 0xe2cfa9,
      roughness: 0.95,
      metalness: 0,
      side: DoubleSide,
      flatShading: true,
    })
    this.inkMat = new MeshStandardMaterial({
      color: 0x2a211b,
      roughness: 0.85,
      metalness: 0.04,
      flatShading: true,
    })
    this.accentMat = new MeshStandardMaterial({
      color: this.accent,
      roughness: 0.7,
      metalness: 0.05,
      emissive: this.accent,
      emissiveIntensity: 0.06,
    })
    this.shadowMat = new MeshBasicMaterial({
      color: 0x140f0c,
      transparent: true,
      opacity: 0.26,
      depthWrite: false,
      ...DECAL_TUNING,
    })
  }

  buildFigure() {
    // Tubuh kertas terlipat (silinder 4 sisi).
    const torso = new Mesh(new CylinderGeometry(0.19, 0.4, 1.0, 4, 1), this.paperMat)
    torso.rotation.y = Math.PI / 4
    torso.scale.z = 0.78
    torso.position.y = 1.12
    torso.castShadow = true
    this.body.add(torso)

    const hem = new Mesh(new CylinderGeometry(0.4, 0.16, 0.5, 4, 1), this.paperWarmMat)
    hem.rotation.y = Math.PI / 4
    hem.scale.z = 0.78
    hem.position.y = 0.45
    hem.castShadow = true
    this.body.add(hem)

    // Ban pinggang vermilion.
    const sash = new Mesh(new CylinderGeometry(0.33, 0.34, 0.1, 4), this.accentMat)
    sash.rotation.y = Math.PI / 4
    sash.scale.z = 0.8
    sash.position.y = 0.9
    this.body.add(sash)

    // Kepala kertas.
    this.head = new Group()
    this.head.position.y = 1.82
    this.body.add(this.head)

    const skull = new Mesh(new IcosahedronGeometry(0.25, 0), this.paperMat)
    skull.castShadow = true
    this.head.add(skull)

    // Wajah bergambar.
    this.faceTexture = createSpiritFaceTexture(this.accent)
    this.faceMat = new MeshBasicMaterial({
      map: this.faceTexture,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
    })
    const face = new Mesh(new PlaneGeometry(0.42, 0.42), this.faceMat)
    face.position.set(0, 0, 0.255)
    this.head.add(face)

    // Topi tinta.
    const hat = new Mesh(new ConeGeometry(0.3, 0.2, 4), this.inkMat)
    hat.rotation.y = Math.PI / 4
    hat.position.y = 0.22
    hat.castShadow = true
    this.head.add(hat)

    // Kertas doa di kedua sisi.
    this.strips = []
    for (const side of [-1, 1]) {
      const stripGroup = new Group()
      stripGroup.position.set(side * 0.34, 1.28, 0.02)
      stripGroup.rotation.z = side * -0.16

      const strip = new Mesh(new PlaneGeometry(0.11, 0.5), this.paperWarmMat)
      strip.position.y = -0.25
      strip.castShadow = true
      stripGroup.add(strip)

      const band = new Mesh(new PlaneGeometry(0.11, 0.08), this.accentMat)
      band.position.set(0, -0.42, 0.002)
      stripGroup.add(band)

      this.body.add(stripGroup)
      this.strips.push(stripGroup)
    }

    // Rumbai di bawah tubuh.
    this.tassel = new Group()
    this.tassel.position.y = 0.22
    const cord = new Mesh(new CylinderGeometry(0.012, 0.012, 0.18, 4), this.inkMat)
    cord.position.y = -0.09
    this.tassel.add(cord)
    const tasselBody = new Mesh(new ConeGeometry(0.05, 0.2, 5), this.accentMat)
    tasselBody.position.y = -0.28
    tasselBody.rotation.x = Math.PI
    this.tassel.add(tasselBody)
    this.body.add(this.tassel)
  }

  buildShadow() {
    this.shadow = new Mesh(new CircleGeometry(0.48, 20), this.shadowMat)
    this.shadow.rotation.x = -Math.PI / 2
    // Sama seperti pengunjung: pemandu sering menyeberangi plaza pohon, jadi
    // bayangannya harus berada di atas pelat plaza agar tidak berkedip.
    this.shadow.position.y = GROUND_LAYER.contactShadow
    this.shadow.renderOrder = 1
    this.group.add(this.shadow)
  }

  buildNameplate() {
    this.nameplateTexture = createNameplateTexture({
      title: this.data.guide?.name ?? this.data.title,
      subtitle: this.data.guide?.role ?? this.data.subtitle,
      accent: this.accent,
    })

    this.nameplate = new Sprite(
      new SpriteMaterial({
        map: this.nameplateTexture,
        transparent: true,
        depthWrite: false,
      }),
    )
    this.nameplate.position.set(0, 2.52, 0)
    this.nameplate.scale.set(1.9, 0.59, 1)
    this.group.add(this.nameplate)
  }

  buildPromptBadge() {
    this.promptTexture = createPromptBadgeTexture({
      key: 'E',
      action: 'Bicara',
      accent: this.accent,
    })

    this.promptBadge = new Sprite(
      new SpriteMaterial({
        map: this.promptTexture,
        transparent: true,
        depthWrite: false,
      }),
    )
    this.promptBadge.position.set(0, 3.05, 0)
    this.promptBadge.scale.set(0, 0, 1)
    this.promptBadge.material.opacity = 0
    this.group.add(this.promptBadge)
  }

  buildHitArea() {
    const hitArea = new Mesh(
      new CylinderGeometry(0.72, 0.72, 2.3, 12),
      new MeshBasicMaterial({ visible: false }),
    )
    hitArea.position.y = 1.15
    hitArea.userData.stationId = this.id
    this.group.add(hitArea)
  }

  setActive(active) {
    this.active = active
    if (active) {
      this.state = 'converse'
    } else if (this.state === 'converse') {
      this.state = 'idle'
      this.stateTimer = 2.0
    }
  }

  pickNewWanderTarget() {
    const b = this.boundary
    const pad = 0.5
    const targetX = b.minX + pad + Math.random() * Math.max(0.2, b.maxX - b.minX - pad * 2)
    const targetZ = b.minZ + pad + Math.random() * Math.max(0.2, b.maxZ - b.minZ - pad * 2)
    this.targetPos.set(targetX, 0, targetZ)
  }

  update(delta, elapsed, playerPos = null) {
    const time = elapsed + this.phase

    if (this.state === 'converse') {
      if (playerPos) {
        const dx = playerPos.x - this.position.x
        const dz = playerPos.z - this.position.z
        const targetHeading = Math.atan2(dx, dz)
        const diff = shortestAngle(this.heading, targetHeading)
        this.heading += diff * Math.min(1, 7 * delta)
      }
    } else if (this.state === 'idle') {
      this.stateTimer -= delta
      if (this.stateTimer <= 0) {
        this.state = 'wander'
        this.pickNewWanderTarget()
      }
    } else if (this.state === 'wander') {
      const dx = this.targetPos.x - this.position.x
      const dz = this.targetPos.z - this.position.z
      const distance = Math.hypot(dx, dz)

      if (distance < 0.35) {
        this.state = 'idle'
        this.stateTimer = 2.0 + Math.random() * 3.5
      } else {
        const targetHeading = Math.atan2(dx, dz)
        const diff = shortestAngle(this.heading, targetHeading)
        this.heading += diff * Math.min(1, 4.2 * delta)

        const forwardX = Math.sin(this.heading)
        const forwardZ = Math.cos(this.heading)
        this.position.x += forwardX * this.moveSpeed * delta
        this.position.z += forwardZ * this.moveSpeed * delta

        // Batas ketat: roh tidak pernah keluar dari area patrolinya.
        this.position.x = clamp(this.position.x, this.boundary.minX, this.boundary.maxX)
        this.position.z = clamp(this.position.z, this.boundary.minZ, this.boundary.maxZ)

        this.stepCycle += delta * 4.5
      }
    }

    this.group.position.x = this.position.x
    this.group.position.z = this.position.z
    this.group.rotation.y = this.heading

    this.interaction.x = this.position.x
    this.interaction.z = this.position.z
    this.collider.x = this.position.x
    this.collider.z = this.position.z

    const isMoving = this.state === 'wander'
    const bobFreq = isMoving ? 3.2 : 1.5
    const bobAmp = isMoving ? 0.07 : 0.035
    this.body.position.y = 0.2 + Math.sin(time * bobFreq) * bobAmp
    this.body.rotation.x = isMoving ? 0.06 : Math.sin(time * 0.8) * 0.015
    this.body.rotation.z = Math.sin(time * (isMoving ? 2.6 : 1.1)) * 0.035

    // Kertas doa berkibar.
    const flutter = Math.sin(time * (isMoving ? 5.2 : 2.4))
    if (this.strips[0]) this.strips[0].rotation.x = flutter * 0.18
    if (this.strips[1]) this.strips[1].rotation.x = -flutter * 0.16
    this.tassel.rotation.z = Math.sin(time * 1.7) * 0.18

    // Kepala sedikit menoleh saat mengobrol.
    if (this.head) {
      this.head.rotation.y = this.state === 'converse' ? Math.sin(time * 0.9) * 0.08 : 0
      this.head.rotation.z = Math.sin(time * 0.6) * 0.03
    }

    // Bayangan mengecil saat roh naik.
    const hover = this.body.position.y
    this.shadow.scale.setScalar(1 - (hover - 0.2) * 0.9)
    this.shadowMat.opacity = 0.26 - (hover - 0.2) * 0.5

    this.nameplate.position.y = 2.52 + Math.sin(time * 1.2) * 0.03
    this.nameplate.material.opacity = this.active ? 1 : 0.86

    const targetScale = this.active ? 1.72 : 0
    this.promptBadge.scale.x +=
      (targetScale - this.promptBadge.scale.x) * Math.min(1, 14 * delta)
    this.promptBadge.scale.y = this.promptBadge.scale.x * 0.274
    this.promptBadge.material.opacity +=
      ((this.active ? 1 : 0) - this.promptBadge.material.opacity) * Math.min(1, 14 * delta)
    this.promptBadge.position.y = 3.05 + Math.sin(time * 1.5) * 0.02
  }

  dispose() {
    this.nameplateTexture?.dispose?.()
    this.promptTexture?.dispose?.()
    this.faceTexture?.dispose?.()
    this.nameplate.material.dispose()
    this.promptBadge.material.dispose()
    this.faceMat.dispose()
    const geometries = new Set()
    this.group.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry)
    })
    for (const geometry of geometries) geometry.dispose()
    for (const material of [
      this.paperMat,
      this.paperWarmMat,
      this.inkMat,
      this.accentMat,
      this.shadowMat,
    ]) {
      material?.dispose()
    }
    this.group.clear()
  }
}
