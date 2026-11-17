/**
 * Input untuk diorama isometrik: klik, hover, zoom, dan keyboard.
 * Tidak ada pointer lock atau mouse-look; kamera dikendalikan oleh CameraRig.
 * InputManager tidak tahu apa pun tentang kamera atau karakter — ia hanya
 * memancarkan niat pengguna lewat callback.
 *
 * Dua jalur input, keduanya berakhir di callback yang sama:
 * - **Mouse/pen**: klik kiri langsung memindahkan tujuan, seret tombol kanan
 *   memutar, roda memutar zoom.
 * - **Sentuh (ponsel/tablet)**: ketuk = klik (diputuskan saat jari diangkat,
 *   supaya geseran kecil tidak dianggap ketukan), seret satu jari = putar,
 *   cubit dua jari = zoom. Tidak ada hover di layar sentuh.
 */

// Toleransi gerak jari agar tetap dihitung "ketuk", bukan "seret".
const TAP_SLOP_PX = 14
const TAP_HOLD_MS = 800
// Layar sentuh butuh langkah lebih panjang daripada tetikus agar tidak terlalu liar.
const TOUCH_ROTATE_STEP_PX = 48
// Cubitan: 1 px jarak jari ≈ 2.2 px roda mouse.
const PINCH_ZOOM_GAIN = 2.2

export class InputManager {
  constructor(element, { onClick, onZoom, onHover, onRotate } = {}) {
    this.element = element
    this.onClick = onClick
    this.onZoom = onZoom
    this.onHover = onHover
    this.onRotate = onRotate

    this.keys = new Set()
    this.enabled = true
    this.pointerId = null

    // Seret kanan untuk memutar diorama. Setiap 60 px = satu langkah 45°.
    this.rotatePointerId = null
    this.rotateLastX = 0
    this.rotateAccum = 0
    this.rotateStepPx = 60

    // Gestur sentuh: pointer aktif, kandidat ketukan, dan jarak cubitan.
    this.touchPointers = new Map()
    this.tapCandidate = null
    this.pinchDistance = 0

    this.handleKeyDown = this.handleKeyDown.bind(this)
    this.handleKeyUp = this.handleKeyUp.bind(this)
    this.handleBlur = this.handleBlur.bind(this)
    this.handlePointerDown = this.handlePointerDown.bind(this)
    this.handlePointerMove = this.handlePointerMove.bind(this)
    this.handlePointerUp = this.handlePointerUp.bind(this)
    this.handlePointerLeave = this.handlePointerLeave.bind(this)
    this.handleWheel = this.handleWheel.bind(this)
    this.handleContextMenu = (event) => event.preventDefault()

    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('keyup', this.handleKeyUp)
    window.addEventListener('blur', this.handleBlur)
    element.addEventListener('pointerdown', this.handlePointerDown)
    element.addEventListener('pointermove', this.handlePointerMove)
    element.addEventListener('pointerup', this.handlePointerUp)
    element.addEventListener('pointercancel', this.handlePointerUp)
    element.addEventListener('pointerleave', this.handlePointerLeave)
    element.addEventListener('wheel', this.handleWheel, { passive: false })
    element.addEventListener('contextmenu', this.handleContextMenu)
  }

  setEnabled(enabled) {
    this.enabled = enabled
    if (!enabled) this.releaseAll()
  }

  releaseAll() {
    this.keys.clear()
    this.pointerId = null
    this.rotatePointerId = null
    this.rotateAccum = 0
    this.touchPointers.clear()
    this.tapCandidate = null
    this.pinchDistance = 0
  }

  isDown(...codes) {
    if (!this.enabled) return false
    return codes.some((code) => this.keys.has(code))
  }

  /** -1..1 untuk tiap sumbu, siap dipakai sebagai arah gerak. */
  getAxis() {
    if (!this.enabled) return { x: 0, z: 0 }
    const x =
      (this.isDown('KeyD', 'ArrowRight') ? 1 : 0) - (this.isDown('KeyA', 'ArrowLeft') ? 1 : 0)
    const z =
      (this.isDown('KeyW', 'ArrowUp') ? 1 : 0) - (this.isDown('KeyS', 'ArrowDown') ? 1 : 0)
    return { x, z }
  }

  hasMoveAxis() {
    const axis = this.getAxis()
    return axis.x !== 0 || axis.z !== 0
  }

  isRunning() {
    return this.isDown('ShiftLeft', 'ShiftRight')
  }

  handleKeyDown(event) {
    if (!this.enabled) return
    if (event.code === 'Space' || event.code.startsWith('Arrow')) event.preventDefault()
    this.keys.add(event.code)
  }

  handleKeyUp(event) {
    this.keys.delete(event.code)
  }

  handleBlur() {
    this.releaseAll()
  }

  /** Jarak antara dua jari pertama yang aktif (0 bila kurang dari dua). */
  pinchSpread() {
    const [first, second] = [...this.touchPointers.values()]
    if (!first || !second) return 0
    return Math.hypot(first.x - second.x, first.y - second.y)
  }

  handlePointerDown(event) {
    if (!this.enabled) return

    if (event.pointerType === 'touch') {
      this.startTouch(event)
      return
    }

    // Tombol kanan (atau tengah) memutar diorama, bukan menggerakkan karakter.
    if (event.button === 2 || event.button === 1) {
      if (this.rotatePointerId !== null) return
      // Cegah autoscroll tombol tengah / perilaku bawaan tombol kanan.
      event.preventDefault?.()
      this.rotatePointerId = event.pointerId
      this.rotateLastX = event.clientX
      this.rotateAccum = 0
      this.element.setPointerCapture?.(event.pointerId)
      return
    }

    if (event.button !== 0) return
    if (this.pointerId !== null) return

    this.pointerId = event.pointerId
    this.element.setPointerCapture?.(event.pointerId)

    // Klik diproses saat tombol ditekan, bukan saat dilepas. Penanda tujuan
    // jadi langsung pindah dan tidak terasa tertahan menunggu pointerup.
    const rect = this.element.getBoundingClientRect()
    this.onClick?.(event.clientX - rect.left, event.clientY - rect.top)
  }

  startTouch(event) {
    this.touchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    this.element.setPointerCapture?.(event.pointerId)

    if (this.touchPointers.size === 1) {
      // Satu jari bisa berarti ketuk atau seret-putar; diputuskan saat bergerak.
      this.tapCandidate = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        time: performance.now(),
      }
      this.rotateLastX = event.clientX
      this.rotateAccum = 0
      return
    }

    // Jari kedua: batalkan ketukan, gesturnya jadi cubit (zoom).
    const [first] = [...this.touchPointers.values()]
    this.tapCandidate = null
    this.rotateAccum = 0
    this.rotateLastX = first?.x ?? this.rotateLastX
    this.pinchDistance = this.pinchSpread()
  }

  handlePointerMove(event) {
    if (!this.enabled) return

    if (event.pointerType === 'touch') {
      this.moveTouch(event)
      return
    }

    if (this.rotatePointerId !== null && event.pointerId === this.rotatePointerId) {
      this.rotateAccum += event.clientX - this.rotateLastX
      this.rotateLastX = event.clientX
      this.rotateByDrag(this.rotateStepPx)
      return
    }

    // Saat tombol masih ditekan, jangan mengubah hover.
    if (this.pointerId !== null) return
    const rect = this.element.getBoundingClientRect()
    this.onHover?.(event.clientX - rect.left, event.clientY - rect.top)
  }

  moveTouch(event) {
    if (!this.touchPointers.has(event.pointerId)) return
    this.touchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (this.touchPointers.size > 1) {
      const spread = this.pinchSpread()
      if (this.pinchDistance > 0 && spread > 0) {
        // Rentangkan jari = perbesar (roda mouse ke atas = deltaY negatif).
        this.onZoom?.(-(spread - this.pinchDistance) * PINCH_ZOOM_GAIN)
      }
      this.pinchDistance = spread
      return
    }

    const tap = this.tapCandidate
    if (tap && tap.id === event.pointerId) {
      const moved = Math.hypot(event.clientX - tap.x, event.clientY - tap.y)
      // Geseran kecil masih boleh jadi ketukan; lebih dari itu jelas seretan.
      if (moved > TAP_SLOP_PX) this.tapCandidate = null
    }

    this.rotateAccum += event.clientX - this.rotateLastX
    this.rotateLastX = event.clientX
    this.rotateByDrag(TOUCH_ROTATE_STEP_PX)
  }

  /** Ubah akumulasi seret horizontal menjadi langkah rotasi kamera. */
  rotateByDrag(stepPx) {
    while (Math.abs(this.rotateAccum) >= stepPx) {
      const direction = Math.sign(this.rotateAccum)
      this.rotateAccum -= direction * stepPx
      this.onRotate?.(direction)
    }
  }

  handlePointerUp(event) {
    if (event.pointerType === 'touch') {
      this.endTouch(event)
      return
    }

    if (this.rotatePointerId !== null && event.pointerId === this.rotatePointerId) {
      this.rotatePointerId = null
      this.rotateAccum = 0
      this.element.releasePointerCapture?.(event.pointerId)
      return
    }

    if (this.pointerId === null || event.pointerId !== this.pointerId) return
    this.pointerId = null
    this.element.releasePointerCapture?.(event.pointerId)
  }

  endTouch(event) {
    const tap = this.tapCandidate
    const isTap =
      event.type === 'pointerup' &&
      Boolean(tap) &&
      tap.id === event.pointerId &&
      Math.hypot(event.clientX - tap.x, event.clientY - tap.y) <= TAP_SLOP_PX &&
      performance.now() - tap.time <= TAP_HOLD_MS

    this.touchPointers.delete(event.pointerId)
    this.element.releasePointerCapture?.(event.pointerId)

    if (this.touchPointers.size < 2) this.pinchDistance = 0
    if (this.touchPointers.size === 1) {
      // Sisa satu jari: mulai seret dari posisinya sekarang, jangan dari posisi
      // jari yang baru diangkat (kalau tidak, kamera melompat satu langkah).
      const [remaining] = [...this.touchPointers.values()]
      this.rotateAccum = 0
      this.rotateLastX = remaining.x
    }
    if (this.touchPointers.size === 0) {
      this.tapCandidate = null
      this.rotateAccum = 0
    }

    if (!isTap) return
    this.tapCandidate = null
    const rect = this.element.getBoundingClientRect()
    this.onClick?.(event.clientX - rect.left, event.clientY - rect.top)
  }

  handlePointerLeave() {
    if (this.pointerId !== null || this.rotatePointerId !== null) return
    if (this.touchPointers.size > 0) return
    this.onHover?.(-1, -1)
  }

  handleWheel(event) {
    if (!this.enabled) return
    event.preventDefault()
    this.onZoom?.(event.deltaY)
  }

  dispose() {
    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('keyup', this.handleKeyUp)
    window.removeEventListener('blur', this.handleBlur)
    this.element.removeEventListener('pointerdown', this.handlePointerDown)
    this.element.removeEventListener('pointermove', this.handlePointerMove)
    this.element.removeEventListener('pointerup', this.handlePointerUp)
    this.element.removeEventListener('pointercancel', this.handlePointerUp)
    this.element.removeEventListener('pointerleave', this.handlePointerLeave)
    this.element.removeEventListener('wheel', this.handleWheel)
    this.element.removeEventListener('contextmenu', this.handleContextMenu)
    this.releaseAll()
  }
}
