import { Vector3 } from 'three'
import { clamp, damp, shortestAngle } from './math.js'

/**
 * Kamera diorama isometrik:
 * - Sudut dan arah tetap (tidak ada orbit bebas) sehingga klik tanah tetap akurat.
 * - Mengikuti karakter dengan deadzone, jadi layar tidak terus bergoyang.
 * - Zoom roda mouse, serta mode dialog yang maju dan bergeser ke tengah percakapan.
 */
export class CameraRig {
  constructor(camera, config) {
    this.camera = camera
    this.config = config

    this.yaw = config.yaw
    // Sudut tujuan bergerak bertahap (15° per seret); bisa penuh 360°.
    this.yawTarget = config.yaw
    this.pitch = config.pitch
    this.distance = config.distance
    this.targetDistance = config.distance
    this.userDistance = config.distance

    this.focus = new Vector3()
    this.focusHeight = 0
    this.smoothedFocus = new Vector3()
    this.desired = new Vector3()
    this.conversation = new Vector3()
    this.offset = new Vector3()

    this.initialized = false
    this.positioned = false
    this.dialogMode = false

    // Mode duduk (orang pertama) untuk permainan di meja judi. Kamera pindah ke
    // kursi, memakai fov lebih lebar, dan boleh menoleh sedikit ke kiri/kanan.
    this.seatMode = false
    this.seatEye = new Vector3()
    this.seatLook = new Vector3()
    this.seatYaw = 0
    this.seatPitch = 0
    this.baseFov = camera.fov
    this.museumFov = camera.fov
  }

  /**
   * Masuk/keluar mode duduk. `pose` berisi titik mata dan titik pandang dalam
   * koordinat dunia. Tidak ada orbit diorama selama duduk — ini pandangan mata
   * karakter di kursi, bukan kamera pengamat.
   */
  setSeatMode(active, pose = null) {
    const next = Boolean(active)
    if (next === this.seatMode) return
    this.seatMode = next
    this.seatYaw = 0
    this.seatPitch = 0

    if (next && pose) {
      this.seatEye.set(pose.eye.x, pose.eye.y, pose.eye.z)
      this.seatLook.set(pose.look.x, pose.look.y, pose.look.z)
      // Simpan FOV diorama apa adanya (bisa sudah dilebarkan `Engine.resize()`
      // untuk layar potret), supaya berdiri mengembalikan tampilan semula.
      this.museumFov = this.camera.fov
      this.camera.fov = this.config.seatFov ?? 60
      this.camera.updateProjectionMatrix()
      return
    }

    this.camera.fov = this.museumFov ?? this.baseFov
    this.camera.updateProjectionMatrix()
    // Kembali ke diorama tanpa meluncur menembus dinding.
    this.initialized = false
    this.positioned = false
  }

  /** Menoleh sedikit saat duduk (bukan memutar diorama). */
  lookAround(direction = 1) {
    if (!this.seatMode) return
    this.seatYaw = clamp(this.seatYaw + 0.13 * Math.sign(direction || 1), -0.55, 0.55)
  }

  /** Kamera orang pertama: mata di kursi, pandangan ke meja & bandar. */
  updateSeat(delta) {
    // `Engine.resize()` selalu menulis ulang FOV dari `camera.fov` museum, jadi
    // sudut pandang duduk dipasang ulang di sini setiap frame kalau berubah
    // (mis. setelah layar diputar atau jendela diubah ukurannya).
    const seatFov = this.config.seatFov ?? 60
    if (this.camera.fov !== seatFov) {
      this.camera.fov = seatFov
      this.camera.updateProjectionMatrix()
    }

    const eye = this.seatEye
    const smoothing = this.config.positionSmoothing ?? 8
    this.camera.position.x = damp(this.camera.position.x, eye.x, smoothing, delta)
    this.camera.position.y = damp(this.camera.position.y, eye.y, smoothing, delta)
    this.camera.position.z = damp(this.camera.position.z, eye.z, smoothing, delta)

    const dx = this.seatLook.x - eye.x
    const dy = this.seatLook.y - eye.y
    const dz = this.seatLook.z - eye.z
    const baseYaw = Math.atan2(dx, dz)
    const basePitch = Math.atan2(dy, Math.hypot(dx, dz))
    const yaw = baseYaw + this.seatYaw
    const pitch = clamp(basePitch + this.seatPitch, -0.9, 0.5)
    const reach = Math.max(1, Math.hypot(dx, dy, dz))

    this.camera.lookAt(
      this.camera.position.x + Math.sin(yaw) * Math.cos(pitch) * reach,
      this.camera.position.y + Math.sin(pitch) * reach,
      this.camera.position.z + Math.cos(yaw) * Math.cos(pitch) * reach,
    )
  }

  /**
   * Aktifkan bingkai percakapan: kamera maju sedikit dan fokus bergeser
   * ke titik tengah antara pemain dan lawan bicara.
   */
  setDialogMode(active, point = null) {
    this.dialogMode = Boolean(active)
    if (this.dialogMode) {
      if (point) this.conversation.copy(point)
      this.targetDistance = this.config.distance * this.config.dialogDistanceScale
    } else {
      this.targetDistance = this.userDistance
    }
  }

  /**
   * Putar diorama satu langkah (default 15°), bisa penuh 360°. Kamera tetap
   * pada kemiringan isometrik — hanya arah putarnya yang berubah.
   */
  rotateStep(direction = 1) {
    const step = this.config.rotationStep ?? Math.PI / 12
    const next = this.yawTarget + Math.sign(direction || 1) * step
    this.yawTarget = Math.atan2(Math.sin(next), Math.cos(next))
    return this.yawTarget
  }

  /** Roda mouse: perlebar/perdekat diorama. Diabaikan saat duduk. */
  zoom(deltaY) {
    if (this.seatMode) return
    this.userDistance = clamp(
      this.userDistance + deltaY * this.config.zoomSensitivity,
      this.config.minDistance,
      this.config.maxDistance,
    )
    if (!this.dialogMode) this.targetDistance = this.userDistance
  }

  reset() {
    this.userDistance = this.config.distance
    this.targetDistance = this.dialogMode
      ? this.config.distance * this.config.dialogDistanceScale
      : this.config.distance
    this.yaw = this.config.yaw
    this.yawTarget = this.config.yaw
    this.initialized = false
    this.positioned = false
  }

  /** Arah hadap kamera di bidang horizontal, untuk gerak relatif layar. */
  getMovementYaw() {
    return this.yaw
  }

  update(delta, characterPosition) {
    if (this.seatMode) {
      this.updateSeat(delta)
      return
    }

    const cfg = this.config
    const deadzone = cfg.deadzone

    if (!this.initialized) {
      this.focus.set(characterPosition.x, 0, characterPosition.z)
      this.focusHeight = characterPosition.y + cfg.height
      this.smoothedFocus.set(this.focus.x, this.focusHeight, this.focus.z)
      this.initialized = true
    } else {
      // Deadzone: kamera baru bergerak saat karakter mendorong keluar kotak fokus.
      const dx = characterPosition.x - this.focus.x
      if (Math.abs(dx) > deadzone) {
        this.focus.x = characterPosition.x - Math.sign(dx) * deadzone
      }
      const dz = characterPosition.z - this.focus.z
      if (Math.abs(dz) > deadzone) {
        this.focus.z = characterPosition.z - Math.sign(dz) * deadzone
      }
      this.focusHeight = damp(
        this.focusHeight,
        characterPosition.y + cfg.height,
        cfg.followSmoothing,
        delta,
      )
    }

    // Bias dialog: geser fokus sedikit ke arah lawan bicara.
    if (this.dialogMode) {
      this.offset.set(
        (this.conversation.x - characterPosition.x) * cfg.dialogBias,
        0,
        (this.conversation.z - characterPosition.z) * cfg.dialogBias,
      )
    } else {
      this.offset.multiplyScalar(1 - Math.min(1, delta * 6))
      if (this.offset.lengthSq() < 1e-4) this.offset.set(0, 0, 0)
    }

    const targetX = this.focus.x + this.offset.x
    const targetZ = this.focus.z + this.offset.z
    const smoothing = cfg.followSmoothing
    this.smoothedFocus.x = damp(this.smoothedFocus.x, targetX, smoothing, delta)
    this.smoothedFocus.z = damp(this.smoothedFocus.z, targetZ, smoothing, delta)
    this.smoothedFocus.y = damp(this.smoothedFocus.y, this.focusHeight, smoothing, delta)

    this.distance = damp(this.distance, this.targetDistance, 7, delta)

    // Putar halus ke sudut langkah berikutnya (selalu lewat selisih terpendek).
    const yawDifference = shortestAngle(this.yaw, this.yawTarget)
    if (Math.abs(yawDifference) > 0.0004) {
      const rate = 1 - Math.exp(-(cfg.rotationSmoothing ?? 9) * delta)
      this.yaw += yawDifference * rate
    } else {
      this.yaw = this.yawTarget
    }

    const cosPitch = Math.cos(this.pitch)
    this.desired.set(
      this.smoothedFocus.x + Math.sin(this.yaw) * cosPitch * this.distance,
      this.smoothedFocus.y + Math.sin(this.pitch) * this.distance,
      this.smoothedFocus.z + Math.cos(this.yaw) * cosPitch * this.distance,
    )

    const bounds = cfg.bounds
    if (bounds) {
      this.desired.x = clamp(this.desired.x, bounds.minX, bounds.maxX)
      this.desired.z = clamp(this.desired.z, bounds.minZ, bounds.maxZ)
      this.desired.y = clamp(this.desired.y, 1.4, bounds.maxY)
    } else {
      this.desired.y = Math.max(this.desired.y, 1.4)
    }

    // Frame pertama langsung pasang kamera di sudut isometrik, tanpa swoop.
    if (!this.positioned) {
      this.camera.position.copy(this.desired)
      this.positioned = true
    } else {
      const positionSmoothing = cfg.positionSmoothing
      this.camera.position.x = damp(
        this.camera.position.x,
        this.desired.x,
        positionSmoothing,
        delta,
      )
      this.camera.position.y = damp(
        this.camera.position.y,
        this.desired.y,
        positionSmoothing,
        delta,
      )
      this.camera.position.z = damp(
        this.camera.position.z,
        this.desired.z,
        positionSmoothing,
        delta,
      )
    }
    this.camera.lookAt(
      this.smoothedFocus.x,
      this.smoothedFocus.y + 0.12,
      this.smoothedFocus.z,
    )
  }
}
