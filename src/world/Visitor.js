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
import { applySpriteFade, distanceVisibility } from './floatingText.js'
import { DECAL_TUNING, GROUND_LAYER } from './groundLayers.js'

const TYPE_ACCENT = {
  teacher: '#c9a05c',
  friend: '#cf8f9f',
  user: '#7f9b86',
  internship: '#c15a45',
}

/**
 * Pengunjung museum: roh kertas yang membawa satu testimoni.
 * Mereka berjalan pelan di dalam boundary masing-masing, lalu berhenti dan
 * menghadap pemain ketika diajak bicara.
 */
export class Visitor {
  constructor(testimonial, slot) {
    this.id = `testimonial-${testimonial.id}`
    this.kind = 'visitor'
    this.testimonial = testimonial
    this.accent = TYPE_ACCENT[testimonial.type] || '#b23a30'
    this.boundary = slot.boundary
    this.active = false

    this.group = new Group()
    this.group.name = this.id
    this.group.userData.stationId = this.id

    this.position = new Vector3(slot.x, 0, slot.z)
    this.group.position.copy(this.position)
    this.heading = Math.random() * Math.PI * 2
    this.group.rotation.y = this.heading

    this.interaction = { x: this.position.x, z: this.position.z }
    this.collider = { x: this.position.x, z: this.position.z, radius: 0.5 }
    // Berdiri berdekatan dengan pengunjung agar percakapan terasa dekat.
    this.anchor = { x: this.position.x, z: this.position.z }
    this.interactRadius = 1.15
    this.phase = testimonial.id * 0.71

    this.state = 'idle'
    this.stateTimer = 1.4 + Math.random() * 2.4
    this.targetPos = new Vector3().copy(this.position)
    this.speed = 0.72
    this.stepCycle = 0

    this.textures = []
    this.materials = []

    this.buildMaterials()
    this.body = new Group()
    this.group.add(this.body)
    this.buildFigure()
    this.buildShadow()
    this.buildNameplate()
    this.buildPrompt()
    this.buildHitArea()
  }

  buildMaterials() {
    this.paperMat = new MeshStandardMaterial({
      color: 0xe9ddc2,
      roughness: 0.92,
      metalness: 0,
      side: DoubleSide,
      flatShading: true,
    })
    this.paperWarmMat = new MeshStandardMaterial({
      color: 0xdecaa6,
      roughness: 0.95,
      side: DoubleSide,
      flatShading: true,
    })
    this.inkMat = new MeshStandardMaterial({
      color: 0x281f19,
      roughness: 0.86,
      flatShading: true,
    })
    this.accentMat = new MeshStandardMaterial({
      color: this.accent,
      roughness: 0.72,
      emissive: this.accent,
      emissiveIntensity: 0.05,
    })
    this.shadowMat = new MeshBasicMaterial({
      color: 0x140f0c,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      ...DECAL_TUNING,
    })
    this.materials.push(
      this.paperMat,
      this.paperWarmMat,
      this.inkMat,
      this.accentMat,
      this.shadowMat,
    )
  }

  buildFigure() {
    const torso = new Mesh(new CylinderGeometry(0.16, 0.34, 0.86, 4), this.paperMat)
    torso.rotation.y = Math.PI / 4
    torso.scale.z = 0.8
    torso.position.y = 1.0
    torso.castShadow = true
    this.body.add(torso)

    const hem = new Mesh(new CylinderGeometry(0.34, 0.14, 0.44, 4), this.paperWarmMat)
    hem.rotation.y = Math.PI / 4
    hem.scale.z = 0.8
    hem.position.y = 0.42
    hem.castShadow = true
    this.body.add(hem)

    const sash = new Mesh(new CylinderGeometry(0.27, 0.28, 0.08, 4), this.accentMat)
    sash.rotation.y = Math.PI / 4
    sash.scale.z = 0.82
    sash.position.y = 0.82
    this.body.add(sash)

    // Label pengunjung di dada.
    const badgeMat = new MeshBasicMaterial({ color: 0xf0e2c4 })
    this.materials.push(badgeMat)
    const badge = new Mesh(new PlaneGeometry(0.22, 0.15), badgeMat)
    badge.position.set(0.16, 1.08, 0.24)
    badge.rotation.z = -0.08
    this.body.add(badge)
    const stripe = new Mesh(
      new PlaneGeometry(0.22, 0.025),
      new MeshBasicMaterial({ color: this.accent }),
    )
    this.materials.push(stripe.material)
    stripe.position.set(0.16, 1.135, 0.245)
    stripe.rotation.z = -0.08
    this.body.add(stripe)

    this.head = new Group()
    this.head.position.y = 1.62
    this.body.add(this.head)

    const skull = new Mesh(new IcosahedronGeometry(0.21, 0), this.paperMat)
    skull.castShadow = true
    this.head.add(skull)

    this.faceTexture = createSpiritFaceTexture(this.accent)
    this.textures.push(this.faceTexture)
    this.faceMat = new MeshBasicMaterial({
      map: this.faceTexture,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
    })
    this.materials.push(this.faceMat)
    const face = new Mesh(new PlaneGeometry(0.34, 0.34), this.faceMat)
    face.position.set(0, 0, 0.215)
    this.head.add(face)

    const hat = new Mesh(new ConeGeometry(0.25, 0.16, 4), this.inkMat)
    hat.rotation.y = Math.PI / 4
    hat.position.y = 0.18
    hat.castShadow = true
    this.head.add(hat)

    // Kertas catatan kecil yang dibawa pengunjung.
    this.note = new Group()
    this.note.position.set(-0.28, 0.98, 0.1)
    this.note.rotation.z = 0.18
    const sheet = new Mesh(new PlaneGeometry(0.18, 0.26), this.paperWarmMat)
    sheet.castShadow = true
    this.note.add(sheet)
    const line = new Mesh(new PlaneGeometry(0.11, 0.015), this.accentMat)
    line.position.set(0, -0.04, 0.002)
    this.note.add(line)
    this.body.add(this.note)

    this.tassel = new Group()
    this.tassel.position.y = 0.2
    const cord = new Mesh(new CylinderGeometry(0.01, 0.01, 0.16, 4), this.inkMat)
    cord.position.y = -0.08
    this.tassel.add(cord)
    const tasselBody = new Mesh(new ConeGeometry(0.045, 0.18, 5), this.accentMat)
    tasselBody.position.y = -0.24
    tasselBody.rotation.x = Math.PI
    this.tassel.add(tasselBody)
    this.body.add(this.tassel)
  }

  buildShadow() {
    this.shadow = new Mesh(new CircleGeometry(0.42, 20), this.shadowMat)
    this.shadow.rotation.x = -Math.PI / 2
    // Di atas pelat plaza (GROUND_LAYER.plaza): kalau sama tinggi, bayangan
    // pengunjung dan plaza berebut kedalaman dan berkedip saat kamera berputar.
    this.shadow.position.y = GROUND_LAYER.contactShadow
    this.shadow.renderOrder = 1
    this.group.add(this.shadow)
  }

  buildNameplate() {
    const texture = createNameplateTexture({
      title: this.testimonial.name,
      subtitle: this.testimonial.role || this.testimonial.organization || 'Pengunjung',
      accent: this.accent,
    })
    this.textures.push(texture)

    this.nameplate = new Sprite(
      new SpriteMaterial({ map: texture, transparent: true, depthWrite: false }),
    )
    this.nameplate.position.set(0, 2.2, 0)
    this.nameplate.scale.set(1.8, 0.563, 1)
    this.group.add(this.nameplate)
  }

  buildPrompt() {
    const texture = createPromptBadgeTexture({
      key: 'E',
      action: 'Bicara',
      accent: this.accent,
    })
    this.textures.push(texture)

    this.promptBadge = new Sprite(
      new SpriteMaterial({ map: texture, transparent: true, depthWrite: false }),
    )
    this.promptBadge.position.set(0, 2.74, 0)
    this.promptBadge.scale.set(0, 0, 1)
    this.promptBadge.material.opacity = 0
    this.group.add(this.promptBadge)
  }

  buildHitArea() {
    const hitArea = new Mesh(
      new CylinderGeometry(0.64, 0.64, 2.1, 12),
      new MeshBasicMaterial({ visible: false }),
    )
    hitArea.position.y = 1.05
    hitArea.userData.stationId = this.id
    this.group.add(hitArea)
  }

  setActive(active) {
    this.active = active
    if (active) {
      this.state = 'converse'
    } else if (this.state === 'converse') {
      this.state = 'idle'
      this.stateTimer = 1.8
    }
  }

  pickTarget() {
    const b = this.boundary
    const pad = 0.35
    this.targetPos.set(
      b.minX + pad + Math.random() * Math.max(0.2, b.maxX - b.minX - pad * 2),
      0,
      b.minZ + pad + Math.random() * Math.max(0.2, b.maxZ - b.minZ - pad * 2),
    )
  }

  update(delta, elapsed, playerPos = null) {
    const time = elapsed + this.phase

    if (this.state === 'converse') {
      if (playerPos) {
        const targetHeading = Math.atan2(
          playerPos.x - this.position.x,
          playerPos.z - this.position.z,
        )
        this.heading +=
          shortestAngle(this.heading, targetHeading) * Math.min(1, 7 * delta)
      }
    } else if (this.state === 'idle') {
      this.stateTimer -= delta
      if (this.stateTimer <= 0) {
        this.state = 'wander'
        this.pickTarget()
      }
    } else if (this.state === 'wander') {
      const dx = this.targetPos.x - this.position.x
      const dz = this.targetPos.z - this.position.z
      const distance = Math.hypot(dx, dz)

      if (distance < 0.3) {
        this.state = 'idle'
        this.stateTimer = 1.8 + Math.random() * 3
      } else {
        const targetHeading = Math.atan2(dx, dz)
        this.heading +=
          shortestAngle(this.heading, targetHeading) * Math.min(1, 4 * delta)
        this.position.x += Math.sin(this.heading) * this.speed * delta
        this.position.z += Math.cos(this.heading) * this.speed * delta
        this.position.x = clamp(this.position.x, this.boundary.minX, this.boundary.maxX)
        this.position.z = clamp(this.position.z, this.boundary.minZ, this.boundary.maxZ)
        this.stepCycle += delta * 4
      }
    }

    this.group.position.x = this.position.x
    this.group.position.z = this.position.z
    this.group.rotation.y = this.heading
    this.interaction.x = this.position.x
    this.interaction.z = this.position.z
    this.collider.x = this.position.x
    this.collider.z = this.position.z
    this.anchor.x = this.position.x
    this.anchor.z = this.position.z

    const moving = this.state === 'wander'
    const bob = Math.sin(time * (moving ? 3.1 : 1.4)) * (moving ? 0.055 : 0.03)
    this.body.position.y = 0.18 + bob
    this.body.rotation.x = moving ? 0.05 : Math.sin(time * 0.8) * 0.012
    this.body.rotation.z = Math.sin(time * (moving ? 2.4 : 1.1)) * 0.03

    this.note.rotation.z = 0.18 + Math.sin(time * 2.2) * 0.05
    this.tassel.rotation.z = Math.sin(time * 1.6) * 0.14
    this.head.rotation.y = this.state === 'converse' ? Math.sin(time * 0.9) * 0.07 : 0

    const hover = this.body.position.y
    this.shadow.scale.setScalar(1 - (hover - 0.18) * 0.8)
    this.shadowMat.opacity = 0.22 - (hover - 0.18) * 0.4

    this.nameplate.position.y = 2.2 + Math.sin(time * 1.2) * 0.025
    // Nama pengunjung memudar saat pemain menjauh agar tidak menumpuk dengan
    // label meja dan bingkai.
    const visibility = distanceVisibility(
      playerPos,
      this.position.x,
      this.position.z,
      2.5,
      4.8,
    )
    applySpriteFade(this.nameplate, visibility * (this.active ? 1 : 0.88))

    const targetScale = this.active ? 1.45 : 0
    this.promptBadge.scale.x +=
      (targetScale - this.promptBadge.scale.x) * Math.min(1, 14 * delta)
    this.promptBadge.scale.y = this.promptBadge.scale.x * 0.274
    this.promptBadge.material.opacity +=
      ((this.active ? 1 : 0) - this.promptBadge.material.opacity) * Math.min(1, 14 * delta)
    this.promptBadge.position.y = 2.74 + Math.sin(time * 1.5) * 0.02
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
