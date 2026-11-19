import { Plane, Raycaster, Vector2, Vector3 } from 'three'
import { CameraRig } from '../core/CameraRig.js'
import { Engine } from '../core/Engine.js'
import { InputManager } from '../core/InputManager.js'
import { Character } from '../character/Character.js'
import { AnimationController } from '../character/AnimationController.js'
import { CharacterController } from '../character/CharacterController.js'
import { World } from '../world/World.js'
import { BlackjackStage } from '../world/BlackjackStage.js'
import { SoundManager } from '../audio/SoundManager.js'
import { GAME_TABLE, TESTIMONIAL_BOARD } from '../content/museum.js'
import { isTouchDevice } from '../core/device.js'
import { CONFIG } from '../config.js'

/**
 * Museum tidak bisa dijalankan tanpa karakter 3D.
 *
 * Pesan ini sengaja menyebut penyebab sekaligus jalan keluarnya: `public/models/`
 * tidak ikut repositori (berkas PMX berhak cipta), jadi pada salinan baru folder
 * itu kosong dan layar pemuatan tidak boleh berhenti tanpa penjelasan.
 */
const NO_MODEL_MESSAGE =
  'Museum tidak bisa dijalankan karena tidak ada model karakter (PMX). ' +
  'Unggah model lewat dashboard admin → Model Karakter, lalu tekan “Pakai”. ' +
  'Alternatif lokal: letakkan berkas di public/models/karakter/karakter.pmx, ' +
  'atau ubah CONFIG.assets.model di src/config.js.'

const MODEL_FAILED_MESSAGE =
  'Museum tidak bisa dijalankan karena model karakter gagal dimuat. ' +
  'Pastikan berkas PMX beserta seluruh teksturnya ikut terunggah, ' +
  'lalu pilih model lain di dashboard admin → Model Karakter.'

/**
 * Orkestrator museum: memuat data dari API, membangun dunia, dan menjembatani
 * interaksi 3D ke panel 2D.
 */
export class PortfolioApp {
  constructor(container, callbacks = {}) {
    this.container = container
    this.callbacks = callbacks

    this.engine = null
    this.world = null
    this.character = null
    this.animation = null
    this.controller = null
    this.rig = null
    this.input = null
    this.sound = new SoundManager(CONFIG.audio)

    this.data = null
    this.ready = false
    this.destroyed = false
    this.paused = false
    this.helpVisible = false
    this.activeView = null
    this.activeTestimonial = null
    this.activeStationId = null
    this.nearestId = null
    this.pendingStationId = null
    this.pendingRetries = 0
    // Mode duduk di meja judi: kamera orang pertama, karakter disembunyikan,
    // dan kartu di meja digambar oleh `BlackjackStage`.
    this.seated = false
    this.seatStation = null
    this.stage = null
    this.controlMode = CONFIG.controls.defaultMode
    // Ponsel/tablet: hanya mode klik. Tidak ada tombol untuk pindah ke WASD.
    this.touch = isTouchDevice()
    if (this.touch) this.controlMode = 'point'
    this.physicsEnabled = CONFIG.physics.enabled
    this.muted = false
    this.stepTimer = 0
    this.markerHold = 0
    this.lastClickAt = 0
    this.airDuration =
      (2 * CONFIG.character.jumpSpeed) / Math.max(0.001, CONFIG.character.gravity)

    this.raycaster = new Raycaster()
    this.pointer = new Vector2()
    this.focus = new Vector3()
    this.clickPoint = new Vector3()
    this.dialogFocus = new Vector3()
    this.groundPlane = new Plane(new Vector3(0, 1, 0), 0)
    // Vektor kerja untuk peta 2D (arah pandang kamera), dipakai ulang tiap potret.
    this.mapViewVector = new Vector3()

    this.handleKeyDown = this.handleKeyDown.bind(this)
    this.unlockAudio = this.unlockAudio.bind(this)
  }

  async loadPortfolio() {
    const response = await fetch('/api/portfolio', {
      headers: { accept: 'application/json' },
      cache: 'no-store',
    })
    if (!response.ok) {
      throw new Error(
        `Data museum tidak bisa dimuat (${response.status}). Pastikan server API berjalan.`,
      )
    }
    return response.json()
  }

  async init() {
    this.setProgress(0.03, 'Menyiapkan museum')
    this.engine = new Engine(this.container, CONFIG)

    this.setProgress(0.08, 'Membaca arsip')
    this.data = await this.loadPortfolio()
    if (this.destroyed) return
    this.callbacks.onData?.(this.data)

    this.setProgress(0.12, 'Memeriksa model karakter')

    /**
     * Model karakter: model yang dipilih admin di dashboard, dengan model
     * bawaan sebagai cadangan. Urutannya penting — unggahan yang rusak (PMX
     * hilang, tekstur tidak lengkap) tidak boleh membuat seluruh museum gagal
     * dibuka, jadi berkas bawaan dicoba setelahnya.
     */
    const chosen = this.data?.character
    const candidates = []
    if (chosen?.model_url) {
      candidates.push({
        model: chosen.model_url,
        scale: Number(chosen.scale) > 0 ? Number(chosen.scale) : CONFIG.character.scale,
        label: chosen.name || 'karakter pilihan',
      })
    }
    if (CONFIG.assets.model) {
      const fallback = {
        model: CONFIG.assets.model,
        scale: CONFIG.character.scale,
        label: 'karakter bawaan',
      }
      if (!candidates.some((candidate) => candidate.model === fallback.model)) {
        candidates.push(fallback)
      }
    }

    // Tanpa satu pun kandidat museum memang tidak bisa dibuka; hentikan sebelum
    // dunia dibangun, dengan pesan yang bisa ditindaklanjuti — bukan halaman kosong.
    if (candidates.length === 0) throw new Error(NO_MODEL_MESSAGE)

    this.setProgress(0.18, 'Menyusun galeri')
    this.world = new World(this.engine.scene, CONFIG, this.data)

    this.setProgress(0.32, 'Menghadirkan karakter')

    let loadError = null
    for (const candidate of candidates) {
      const label = `Menghadirkan ${candidate.label}`
      this.setProgress(0.32, label)
      this.character = new Character({
        model: candidate.model,
        scale: candidate.scale,
        physicsEnabled: this.physicsEnabled,
        physicsEngine: CONFIG.physics.engine,
      })
      try {
        await this.character.load((ratio) => {
          this.setProgress(0.32 + ratio * 0.32, label)
        })
        console.info(`[Museum] Model karakter: ${candidate.model}`)
        break
      } catch (error) {
        loadError = error
        console.warn(
          `[Museum] Model ${candidate.model} gagal dimuat, mencoba model berikutnya.`,
          error,
        )
        this.character.dispose()
        this.character = null
      }
    }

    if (!this.character) {
      const detail = loadError?.message
        ? ` Berkas yang dicoba gagal dibaca: ${loadError.message}`
        : ''
      // Tanpa model aktif di database, kegagalan berarti folder model bawaan
      // kosong — itulah kasus "tidak ada model", bukan sekadar berkas rusak.
      if (!chosen?.model_url) throw new Error(`${NO_MODEL_MESSAGE}${detail}`)
      throw new Error(`${MODEL_FAILED_MESSAGE}${detail}`)
    }

    console.info(
      `[Museum] Fisika aktif: ${this.character.physicsEngine}` +
        (this.character.physicsFallback ? ` (cadangan: ${this.character.physicsFallback})` : ''),
    )
    if (this.destroyed) return
    this.engine.scene.add(this.character.object)

    this.controller = new CharacterController(this.character, CONFIG.character, this.world)
    this.rig = new CameraRig(this.engine.camera, CONFIG.camera)

    this.setProgress(0.68, 'Menyiapkan gerak')
    this.animation = new AnimationController(this.character, {
      ...CONFIG.animation,
      walkSpeed: CONFIG.character.walkSpeed,
      runSpeed: CONFIG.character.runSpeed,
    })
    await this.animation.load(CONFIG.assets.motions, (ratio) => {
      this.setProgress(0.68 + ratio * 0.28, 'Menyiapkan gerak')
    })
    if (this.destroyed) return

    this.input = new InputManager(this.engine.renderer.domElement, {
      onClick: (x, y) => this.handleClick(x, y),
      onZoom: (deltaY) => this.rig.zoom(deltaY),
      onHover: (x, y) => this.handleHover(x, y),
      onRotate: (direction) => {
        // Duduk: seret kanan menoleh. Berdiri: memutar diorama seperti biasa.
        if (this.seated) this.rig.lookAround(direction)
        else this.rig.rotateStep(direction)
      },
    })

    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('pointerdown', this.unlockAudio)
    window.addEventListener('keydown', this.unlockAudio)

    this.engine.addUpdater(this.update)
    this.engine.start()

    this.ready = true
    this.setProgress(1, 'Museum siap')
    this.callbacks.onModeChange?.(this.controlMode)
    this.callbacks.onReady?.()
  }

  update = (delta, elapsed) => {
    // Jaring pengaman: kalau sebuah panel gagal tampil, jangan biarkan museum
    // membeku selamanya. Selama tidak ada panel/dialog yang aktif, permainan
    // dan interaksi harus tetap berjalan.
    if (this.paused && !this.activeView && !this.activeTestimonial && !this.seated) {
      this.paused = false
      this.controller?.setPaused(false)
      this.input?.setEnabled(true)
      this.rig?.setDialogMode(false)
      this.world?.setActiveStation(null)
    }

    if (
      this.controlMode === 'point' &&
      !this.touch &&
      this.input?.hasMoveAxis() &&
      !this.paused
    ) {
      this.setControlMode('keys')
    }

    this.world.update(
      delta,
      elapsed,
      this.controller.position,
      this.engine.camera.position,
    )
    this.controller.update(
      delta,
      this.input,
      this.rig.getMovementYaw(),
      this.controlMode,
    )
    this.rig.update(delta, this.controller.getFocusPoint(this.focus))
    this.animation.update(delta, this.controller.speed, {
      grounded: this.controller.grounded,
      airTime: this.controller.airTime,
      airDuration: this.airDuration,
    })

    this.updateEvents()
    this.updatePendingStation()
    this.updateFootsteps(delta)
    this.trackProximity()
    this.stage?.update(delta)

    if (this.markerHold > 0) this.markerHold = Math.max(0, this.markerHold - delta)
    if (!this.controller.isWalkingToPoint && this.markerHold <= 0) this.world.hideMarker()
  }

  /** Tampilkan riak penanda di depan objek, walau karakter tidak berjalan. */
  pulseMarker(x, z, hold = 0.9) {
    this.world.showMarker(x, z)
    this.markerHold = hold
  }

  updateEvents() {
    for (const event of this.controller.drainEvents()) {
      if (event === 'jump') {
        this.sound.playJump()
      } else if (event === 'land') {
        this.sound.playLand()
        this.animation.playLandImpact()
      } else if (event === 'arrive') {
        this.world.hideMarker()
        if (this.pendingStationId) {
          const station = this.world.getStation(this.pendingStationId)
          const point = this.stationAnchor(station)
          const tooFar =
            !point ||
            this.controller.distanceTo(point.x, point.z) > this.getInteractRadius(station)
          if (tooFar) {
            // Pengunjung bisa berjalan menjauh saat didekati: kejar sekali lagi.
            if (station?.kind === 'visitor' && point && this.pendingRetries < 1) {
              this.pendingRetries += 1
              this.controller.moveTo(point.x, point.z, { run: false })
              this.world.showMarker(point.x, point.z)
            } else {
              this.pendingStationId = null
              this.pendingRetries = 0
            }
          }
        }
      }
    }
  }

  getInteractionPoint(id) {
    return this.world?.getStation(id)?.interaction ?? null
  }

  /** Radius interaksi milik stasiun (meja lebih ketat daripada pengunjung). */
  getInteractRadius(station) {
    return station?.interactRadius ?? CONFIG.world.interactDistance
  }

  /** Titik ukur jarak interaksi (pusat objek/NPC, bukan titik berdirinya). */
  stationAnchor(station) {
    return station?.anchor ?? station?.interaction ?? null
  }

  stationIdForView(view) {
    if (!view) return null
    if (view.type === 'project') return `project-${view.id}`
    if (view.type === 'testimonial') return `testimonial-${view.id}`
    if (view.type === 'board') return TESTIMONIAL_BOARD.id
    if (view.type === 'game') return GAME_TABLE.id
    if (view.type === 'section') return `section-${view.key}`
    return null
  }

  updatePendingStation() {
    if (!this.pendingStationId || this.paused) return
    const station = this.world?.getStation(this.pendingStationId)
    const point = this.stationAnchor(station)
    if (!point) {
      this.pendingStationId = null
      return
    }
    if (this.controller.distanceTo(point.x, point.z) <= this.getInteractRadius(station)) {
      this.openStation(this.pendingStationId)
    }
  }

  updateFootsteps(delta) {
    const speed = this.controller.speed
    if (this.controller.grounded && speed > 0.3) {
      const running = speed > CONFIG.character.walkSpeed * 1.15
      const interval = Math.min(0.64, Math.max(0.26, 0.64 - speed * 0.075))
      this.stepTimer += delta
      if (this.stepTimer >= interval) {
        this.stepTimer = 0
        this.sound.playFootstep(running)
      }
    } else {
      this.stepTimer = Math.min(this.stepTimer, 0.24)
    }
  }

  describeStation(station) {
    if (!station) return null
    if (station.kind === 'project') {
      return {
        id: station.id,
        kind: 'project',
        title: station.project.title,
        text: 'Buka proyek',
      }
    }
    if (station.kind === 'visitor') {
      return {
        id: station.id,
        kind: 'testimonial',
        title: station.testimonial.name,
        text: 'Ajak bicara',
      }
    }
    if (station.kind === 'board') {
      return {
        id: station.id,
        kind: 'board',
        title: station.section?.label ?? 'Papan Pengunjung',
        text: station.section?.prompt ?? 'Tulis testimoni',
      }
    }
    if (station.kind === 'game') {
      return {
        id: station.id,
        kind: 'game',
        title: station.section?.label ?? 'Kedai Kartu',
        text: station.section?.prompt ?? 'Duduk bermain',
      }
    }
    return {
      id: station.id,
      kind: 'section',
      title: station.section.label,
      text: station.section.prompt,
    }
  }

  trackProximity() {
    if (this.paused) return
    const nearest = this.world.findNearestStation(
      this.controller.position.x,
      this.controller.position.z,
      CONFIG.world.interactDistance,
    )
    const id = nearest?.id ?? null
    if (id === this.nearestId) return

    this.nearestId = id
    this.world.setActiveStation(id)
    this.callbacks.onPrompt?.(this.describeStation(nearest))
  }

  handleKeyDown(event) {
    if (!this.ready || this.destroyed || event.repeat) return
    // Duduk di meja judi: papan tombol museum tidak berlaku. `Esc` ditangani
    // App untuk berdiri dari kursi.
    if (this.seated) return

    // Mengetik di formulir panel (kontak, umpan balik proyek, papan testimoni)
    // tidak boleh memicu pintasan museum: huruf "r", "p", "m" akan mereset
    // kamera, mematikan fisika, atau membisukan suara di tengah menulis.
    const target = event.target
    if (
      target instanceof HTMLElement &&
      (target.isContentEditable ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT')
    ) {
      return
    }

    // Tombol yang sedang fokus (mis. penanda di peta museum) menangani
    // Space/Enter sendiri; karakter tidak boleh ikut melompat di belakangnya.
    if (
      target instanceof HTMLElement &&
      target.tagName === 'BUTTON' &&
      (event.code === 'Space' || event.code === 'Enter')
    ) {
      return
    }

    if (event.code === 'Tab') {
      if (this.paused || this.helpVisible) return
      event.preventDefault()
      this.toggleControlMode()
      return
    }

    // Panel/dialog terbuka: seluruh pintasan museum berhenti. `Esc` tetap
    // ditangani App, jadi panel selalu bisa ditutup dari dalam dialog.
    if (this.paused) return

    if (event.code === 'Space') {
      if (!this.paused && !this.helpVisible) this.controller.jump()
      return
    }

    if (event.code === 'KeyI') {
      // Peta museum: bisa dibuka dan ditutup dari papan tombol.
      this.callbacks.onToggleMap?.()
      return
    }
    if (event.code === 'KeyR') {
      this.resetCamera()
      return
    }
    if (event.code === 'KeyP') {
      this.togglePhysics()
      return
    }
    if (event.code === 'KeyM') {
      this.toggleMute()
      return
    }
    if (event.code === 'KeyG' && !this.paused && !this.helpVisible) {
      this.animation.playWave()
      return
    }
    if (event.code === 'KeyV' && !this.paused && !this.helpVisible) {
      this.animation.playCheer()
      this.sound.playCheer()
      return
    }

    if (event.code === 'KeyE' && !this.paused) {
      // Jangan bergantung pada prompt yang mungkin belum tersegarkan: hitung
      // ulang stasiun terdekat saat tombol ditekan, supaya E selalu bekerja
      // ketika karakter berdiri di depan meja, bingkai, atau pengunjung.
      const id = this.nearestId ?? this.nearestStationId()
      if (!id) return
      // Kartu panduan tidak boleh menelan tombol E: tutup lalu buka panelnya.
      if (this.helpVisible) {
        this.helpVisible = false
        this.callbacks.onDismissHelp?.()
      }
      this.openStation(id)
      return
    }
  }

  /** Stasiun terdekat menurut posisi karakter saat ini (bukan prompt lama). */
  nearestStationId() {
    if (!this.world || !this.controller) return null
    const nearest = this.world.findNearestStation(
      this.controller.position.x,
      this.controller.position.z,
      CONFIG.world.interactDistance,
    )
    return nearest?.id ?? null
  }

  /**
   * Label, cap, dan tujuan navigasi satu koleksi — dipakai peta 2D.
   * Semuanya dibaca dari objek dunia, jadi peta tidak punya daftar sendiri yang
   * bisa tertinggal saat proyek/pengunjung bertambah.
   */
  mapStationInfo(item) {
    if (!item) return null
    if (item.kind === 'project') {
      return {
        label: item.project?.title ?? 'Proyek',
        seal: '作',
        accent: '#a98bb8',
        view: { type: 'project', id: item.project?.id },
      }
    }
    if (item.kind === 'visitor') {
      const name = String(item.testimonial?.name ?? 'Pengunjung').trim()
      return {
        label: name || 'Pengunjung',
        seal: name.slice(0, 1) || '客',
        accent: item.accent ?? '#c07a86',
        view: { type: 'testimonial', id: item.testimonial?.id },
      }
    }
    if (item.kind === 'board') {
      return {
        label: item.section?.label ?? 'Papan Pengunjung',
        seal: item.section?.seal ?? '簽',
        accent: item.section?.accent ?? '#c07a86',
        view: { type: 'board' },
      }
    }
    if (item.kind === 'game') {
      return {
        label: item.section?.label ?? 'Kedai Kartu',
        seal: item.section?.seal ?? '牌',
        accent: item.section?.accent ?? '#b23a30',
        view: { type: 'game' },
      }
    }
    return {
      label: item.section?.label ?? item.id,
      seal: item.section?.seal ?? '往',
      accent: item.section?.accent ?? '#b23a30',
      view: { type: 'section', key: item.sectionKey },
    }
  }

  /**
   * Titik gambar satu koleksi di peta.
   *
   * Bingkai proyek baris atas (`hung`) berbagi tapak dengan bingkai di bawahnya —
   * di dunia 3D bedanya hanya ketinggian, jadi kalau peta memakai `anchor` apa
   * adanya dua penanda akan menumpuk tepat dan hanya satu yang terlihat. Baris
   * atas digeser ke arah ruangan mengikuti titik berdiri untuk membacanya,
   * sehingga kedua baris tetap tampil dan bisa dipilih.
   */
  mapPinPosition(item, anchor) {
    const rank = item.rank ?? 0
    if (item.kind !== 'project' || rank <= 0) return { x: anchor.x, z: anchor.z }
    const dx = (item.interaction?.x ?? anchor.x) - anchor.x
    const dz = (item.interaction?.z ?? anchor.z) - anchor.z
    const length = Math.hypot(dx, dz)
    if (!length) return { x: anchor.x, z: anchor.z }
    // 1,55 m = selisih titik berdiri antar-baris di museum 3D, jadi penanda
    // baris atas jatuh tepat di tempat pemain memang harus berdiri.
    const step = rank * 1.55
    return { x: anchor.x + (dx / length) * step, z: anchor.z + (dz / length) * step }
  }

  /**
   * Arah pandang kamera di bidang lantai, dibaca dari kamera yang benar-benar
   * merender layar.
   *
   * Peta lama menebak arah ini dari `rig.yaw` dengan rumus `-sin/-cos`. Nilai
   * `yaw` adalah sudut *posisi* kamera mengelilingi fokus, bukan arah pandang,
   * dan kamera bisa berhenti di tengah animasi rotasi (yaw belum mencapai
   * target), berada di mode duduk, atau tertahan `bounds`. Satu salah tanda
   * membuat kerucut pandang di peta menghadap ke arah lain daripada layar.
   * Mengambil vektor pandang langsung dari matriks kamera menutup semua celah
   * itu: apa pun yang terjadi pada kamera, peta tahu persis ke mana ia menoleh.
   * Arah yang **digambar** peta adalah kebalikan dari nilai ini — lihat
   * `cameraPovVector()`.
   */
  cameraViewVector() {
    const fallbackYaw = this.rig?.yaw ?? 0
    const fallback = { x: -Math.sin(fallbackYaw), z: -Math.cos(fallbackYaw) }
    const camera = this.engine?.camera
    if (!camera?.getWorldDirection) return fallback

    if (!this.mapViewVector) this.mapViewVector = new Vector3()
    camera.getWorldDirection(this.mapViewVector)

    const length = Math.hypot(this.mapViewVector.x, this.mapViewVector.z)
    // Kamera yang menunjuk lurus ke bawah tidak punya arah datar yang berarti.
    if (!Number.isFinite(length) || length < 1e-4) return fallback
    return { x: this.mapViewVector.x / length, z: this.mapViewVector.z / length }
  }

  /**
   * Arah yang digambar peta untuk kerucut pandang.
   *
   * Nilainya kebalikan dari `cameraViewVector()`: vektor pandang kamera menunjuk
   * dari kamera menuju fokus, jadi di denah ia menunjuk ke sisi belakang karakter
   * (menjauhi pemain). Di diorama, sisi yang terbaca sebagai “depan” adalah sisi
   * yang menghadap kamera — tempat karakter berdiri menghadap layar. Pembalikan
   * tanda dikerjakan **sekali** di sini, bukan di dua komponen gambar, supaya peta
   * besar dan peta kecil tidak mungkin berbeda arah.
   */
  cameraPovVector() {
    const view = this.cameraViewVector()
    return { x: -view.x, z: -view.z }
  }

  /**
   * Jangkauan pandang kamera di lantai, dalam meter.
   *
   * Setengah tinggi layar yang jatuh di lantai = jarak kamera × tan(fov/2),
   * dibagi sin(pitch) karena kamera melihat lantai secara miring. Karena itu
   * nilainya ikut berubah saat roda mouse memperbesar/memperkecil diorama:
   * kerucut pandang di peta memendek ketika kamera didekatkan, dan memanjang
   * ketika kamera ditarik mundur.
   */
  cameraPovReach() {
    const camera = this.engine?.camera
    const distance = this.rig?.distance ?? CONFIG.camera.distance
    const pitch = this.rig?.pitch ?? CONFIG.camera.pitch
    const vertical = ((camera?.fov ?? CONFIG.camera.fov) * Math.PI) / 360
    const ground = (distance * Math.tan(vertical)) / Math.max(0.2, Math.sin(pitch))
    return Math.min(15, Math.max(3.5, ground))
  }

  /**
   * Setengah sudut pandang horizontal kamera (radian), dipakai peta untuk
   * menggambar kerucut pandang selebar layar yang sesungguhnya — bukan angka
   * hiasan. FOV vertikal dan rasio aspek sudah cukup untuk menentukannya.
   */
  cameraHalfAngle() {
    const camera = this.engine?.camera
    if (!camera) return 0.46
    const vertical = ((camera.fov ?? 32) * Math.PI) / 360
    const horizontal = Math.atan(Math.tan(vertical) * (camera.aspect || 1))
    return Math.min(0.95, Math.max(0.28, horizontal))
  }

  /**
   * Bentuk tapak satu koleksi di peta.
   *
   * Peta tidak menggambar semua koleksi sebagai titik: meja, bingkai, papan,
   * dan meja judi punya tapak nyata di dunia, jadi denahnya terbaca sebagai
   * ruangan — bukan sekumpulan titik. Ukuran diambil dari benda aslinya.
   */
  mapFootprint(item) {
    if (item.kind === 'project') return { shape: 'rect', w: item.width ?? 3.4, d: 0.72 }
    if (item.kind === 'board') return { shape: 'rect', w: item.config?.width ?? 2.2, d: 0.52 }
    if (item.kind === 'game') return { shape: 'circle', r: item.collider?.radius ?? 1 }
    if (item.kind === 'visitor') return { shape: 'person' }
    return { shape: 'rect', w: 1.62, d: 1.08 }
  }

  /**
   * Potret dunia untuk peta 2D.
   *
   * Peta membaca keadaan yang sama dengan museum 3D: daftar koleksi diambil
   * dari `world.exhibits.items`, posisi pengunjung dari `anchor` yang diperbarui
   * tiap frame, posisi karakter dari controller, dan arah pandang langsung dari
   * kamera yang merender (`cameraViewVector()`).
   * Karena itu tidak ada salinan denah yang bisa basi: menambah proyek,
   * menyetujui testimoni, atau memindahkan meja langsung ikut tergambar.
   * Metode ini dipanggil berulang selama peta terbuka (bukan sekali saat buka).
   */
  getMapState() {
    if (!this.ready || this.destroyed || !this.world || !this.controller) return null

    const museum = this.world.museum
    const worldConfig = this.world.config?.world ?? CONFIG.world
    const half = museum?.half ?? worldConfig.platformHalf ?? 18
    const stations = []

    for (const item of this.world.exhibits?.items ?? []) {
      const anchor = item.anchor ?? item.interaction ?? item.position
      if (!anchor) continue
      const info = this.mapStationInfo(item)
      if (!info?.view) continue
      const pin = this.mapPinPosition(item, anchor)
      const footprint = this.mapFootprint(item)
      stations.push({
        id: item.id,
        kind: item.kind,
        x: pin.x,
        z: pin.z,
        // Tapak perabot digambar dari pusat benda, bukan dari titik penanda:
        // bingkai baris atas memakai tapak yang sama dengan bingkai bawahnya.
        ax: anchor.x,
        az: anchor.z,
        rotation: item.group?.rotation?.y ?? 0,
        shape: footprint.shape,
        footprint,
        // Baris bingkai proyek (0 = bawah, 1 = atas) dipakai peta untuk
        // membedakan dua bingkai yang bertumpuk di satu kolom.
        rank: item.rank ?? 0,
        label: info.label,
        seal: info.seal,
        accent: info.accent,
        view: info.view,
        radius: item.interactRadius ?? CONFIG.world.interactDistance,
        active: item.id === this.nearestId,
        pending: item.id === this.pendingStationId,
      })
    }

    const destination = this.pendingStationId
      ? this.world.getStation(this.pendingStationId)?.interaction ?? null
      : null
    const marker = this.world.marker

    return {
      half,
      walls: { z: museum?.wallZ ?? null, x: museum?.wallX ?? null },
      plaza: { radius: museum?.plazaRadius ?? 5.2 },
      player: {
        x: this.controller.position.x,
        z: this.controller.position.z,
        heading: this.controller.heading,
        walking: this.controller.isWalkingToPoint,
        speed: this.controller.speed,
      },
      camera: {
        yaw: this.rig?.yaw ?? 0,
        // Arah pandang kamera yang sebenarnya (untuk rujukan), arah yang digambar
        // peta (`pov`), lebar pandang, dan jangkauannya di lantai. Semuanya
        // diturunkan dari kamera yang merender, jadi kerucut pandang di peta
        // tidak pernah menyimpang dari layar 3D.
        view: this.cameraViewVector(),
        pov: this.cameraPovVector(),
        halfAngle: this.cameraHalfAngle(),
        reach: this.cameraPovReach(),
        distance: this.rig?.distance ?? CONFIG.camera.distance,
      },
      destination: destination ? { x: destination.x, z: destination.z } : null,
      marker:
        marker?.group?.visible
          ? { x: marker.group.position.x, z: marker.group.position.z }
          : null,
      stations,
    }
  }

  /** Buka stasiun fisik: proyek, visitor, atau meja bagian. */
  openStation(id) {
    if (!this.ready || this.destroyed || this.paused) return
    const station = this.world?.getStation(id)
    if (!station) {
      console.warn(`[museum] stasiun tidak ditemukan: ${id}`)
      return
    }

    console.info(`[museum] interaksi ${id} (${station.kind})`)

    if (station.kind === 'project') {
      this.openView({ type: 'project', id: station.project.id }, station)
      return
    }
    if (station.kind === 'visitor') {
      this.openVisitor(station)
      return
    }
    if (station.kind === 'board') {
      this.openView({ type: 'board' }, station)
      return
    }
    if (station.kind === 'game') {
      this.enterSeat(station)
      return
    }
    if (station.kind === 'section') {
      this.openView({ type: 'section', key: station.sectionKey }, station)
      return
    }
    console.warn(`[museum] jenis stasiun belum didukung: ${station.kind} (${id})`)
  }

  /**
   * Duduk di meja judi: kamera pindah ke kursi (orang pertama), karakter
   * disembunyikan, dan permainan dimainkan lewat HUD meja + kartu 3D.
   */
  enterSeat(station) {
    if (!this.ready || this.destroyed || !station?.seatPose) return
    if (this.seated) return

    this.seated = true
    this.seatStation = station
    this.paused = true
    this.activeView = null
    this.activeTestimonial = null
    this.pendingStationId = null
    this.pendingRetries = 0
    this.nearestId = null

    this.controller.cancelDestination()
    this.controller.setPaused(true)
    // Input tetap hidup: seret kanan dipakai untuk menoleh. Klik di kanvas mati
    // sendiri karena `handleClick()` menolak saat `paused`.
    this.input?.releaseAll()
    this.world.setActiveStation(station.id)
    station.setSeated?.(true)
    this.rig.setSeatMode(true, station.seatPose)
    if (this.character?.root) this.character.root.visible = false
    // Saat mata menempel ke meja, bayangan seluruh museum tidak perlu dihitung
    // ulang tiap frame. Peta bayangan dibekukan lalu disegarkan sekali setiap
    // keadaan permainan berubah — di ponsel ini yang paling terasa.
    if (this.engine?.renderer) {
      this.engine.renderer.shadowMap.autoUpdate = false
      this.engine.renderer.shadowMap.needsUpdate = true
    }
    this.callbacks.onPrompt?.(null)
    this.sound.playDialogOpen()
    this.callbacks.onSeat?.({ open: true, id: station.id })
  }

  /** Kartu 3D mengikuti keadaan mesin setiap kali HUD berubah. */
  syncSeat(game) {
    if (!this.seated || !this.seatStation) return
    if (!this.stage) this.stage = new BlackjackStage(this.seatStation)
    this.stage.sync(game)
    // Kartu baru butuh satu peta bayangan baru; autoUpdate tetap mati.
    if (this.engine?.renderer) this.engine.renderer.shadowMap.needsUpdate = true
  }

  /** Berdiri dari meja: kamera kembali ke diorama, karakter muncul lagi. */
  closeSeat() {
    if (!this.seated) return
    this.seated = false
    this.stage?.dispose()
    this.stage = null
    this.seatStation?.setSeated?.(false)
    this.seatStation = null
    if (this.character?.root) this.character.root.visible = true
    this.rig.setSeatMode(false)
    if (this.engine?.renderer) {
      this.engine.renderer.shadowMap.autoUpdate = true
      this.engine.renderer.shadowMap.needsUpdate = true
    }
    this.paused = false
    this.controller.setPaused(false)
    this.input?.releaseAll()
    this.world.setActiveStation(null)
    this.nearestId = null
    this.sound.playDialogClose()
    this.callbacks.onSeat?.({ open: false })
  }

  /** Datangi stasiun: berjalan ke titik interaksinya, lalu buka saat tiba. */
  visitStation(id) {
    if (!this.ready || this.destroyed || this.paused) return false
    const station = this.world?.getStation(id)
    if (!station) return false

    this.startAudio()
    const anchor = this.stationAnchor(station)
    const point = station.interaction
    const distance = this.controller.distanceTo(anchor.x, anchor.z)
    this.sound.playUi()
    if (distance <= this.getInteractRadius(station)) {
      this.pulseMarker(point.x, point.z, 1.1)
      this.openStation(id)
      return true
    }

    this.setControlMode('point')
    this.pendingStationId = id
    this.pendingRetries = 0
    this.controller.moveTo(point.x, point.z, { run: distance > 4 })
    this.pulseMarker(point.x, point.z, 0)
    return true
  }

  /**
   * Datangi lokasi sebuah view (bagian, proyek, atau pengunjung).
   * Tidak ada overlay yang dibuka dari jauh — pemain harus berjalan ke sana.
   */
  visitView(view) {
    if (!view) return false
    const id = this.stationIdForView(view)
    if (id && this.visitStation(id)) return true
    if (view.type === 'project') return this.visitStation('section-projects')
    if (view.type === 'board') return this.visitStation('section-testimonials')
    if (view.type === 'game') return this.visitStation(GAME_TABLE.id)
    if (view.type === 'testimonial') return this.visitStation('section-testimonials')
    return false
  }

  /**
   * Buka percakapan satu pengunjung.
   * Tiap NPC membawa testimoni miliknya sendiri, bukan daftar gabungan.
   */
  openVisitor(station) {
    if (!this.ready || this.destroyed || this.paused) return
    const testimonial = station?.testimonial
    if (!testimonial) return

    this.activeView = null
    this.activeTestimonial = testimonial
    this.enterOverlay(station, station.interaction)
    this.callbacks.onTestimonial?.(testimonial)
  }

  /** Dibuka dari peta museum atau dari stasiun 3D. */
  openView(view, station = null) {
    if (!this.ready || this.destroyed || this.paused) return
    const targetStation = station ?? this.world?.getStation(this.stationIdForView(view)) ?? null

    if (view?.type === 'testimonial') {
      if (targetStation?.testimonial) this.openVisitor(targetStation)
      return
    }

    const point = targetStation?.interaction ?? {
      x: this.controller.position.x,
      z: this.controller.position.z,
    }

    this.activeTestimonial = null
    this.activeView = view
    this.enterOverlay(targetStation, point)
    this.callbacks.onOpenView?.(view)
  }

  /** Hentikan permainan, arahkan kamera, dan sembunyikan prompt untuk overlay. */
  enterOverlay(station, point) {
    this.startAudio()
    this.sound.playDialogOpen()
    this.activeStationId = station?.id ?? null
    this.paused = true
    this.pendingStationId = null
    this.pendingRetries = 0
    this.controller.setPaused(true)
    this.controller.cancelDestination()
    // Hadapkan karakter ke kamera agar wajahnya terlihat saat membaca panel/dialog.
    this.controller.faceTowards(
      this.controller.position.x + Math.sin(this.rig.yaw),
      this.controller.position.z + Math.cos(this.rig.yaw),
    )
    this.input.setEnabled(false)
    this.world.setActiveStation(this.activeStationId)
    // Penanda klik dibiarkan memudar sendiri (markerHold) agar riak di depan
    // objek tetap terlihat sesaat setelah panel dibuka.

    this.dialogFocus.set(point.x, 0, point.z)
    this.rig.setDialogMode(true, this.dialogFocus)
    this.callbacks.onPrompt?.(null)
  }

  /**
   * Pengunjung baru saja memaku tulisannya di papan.
   * Kertasnya langsung muncul di dunia 3D (dengan cap menunggu persetujuan),
   * jadi hasil tindakan terlihat tanpa harus memuat ulang museum.
   */
  postBoardNote(testimonial) {
    if (!this.ready || this.destroyed || !testimonial) return null
    const record = this.world?.postBoardNote({
      ...testimonial,
      id: testimonial.id ?? Date.now(),
    })
    this.sound.playPageAdvance()
    this.animation?.playWave?.()
    return record ?? null
  }

  closePanel() {
    if (!this.activeView && !this.activeTestimonial) return
    this.activeView = null
    this.activeTestimonial = null
    this.activeStationId = null
    this.paused = false
    this.controller.setPaused(false)
    this.input.setEnabled(true)
    this.world.setActiveStation(null)
    this.rig.setDialogMode(false)
    this.nearestId = null
    this.sound.playDialogClose()
    this.callbacks.onCloseView?.()
  }

  playPageAdvance() {
    this.sound.playPageAdvance()
  }

  playBlip() {
    this.sound.playBlip()
  }

  playCheer() {
    this.animation.playCheer()
    this.sound.playCheer()
  }

  playWave() {
    this.animation.playWave()
  }

  setControlMode(mode) {
    // Di layar sentuh mode WASD tidak masuk akal: tidak ada tombol fisik, dan
    // keyboard virtual akan menutupi diorama.
    const next = mode === 'keys' && !this.touch ? 'keys' : 'point'
    if (next === this.controlMode) return this.controlMode
    this.controlMode = next

    if (next === 'keys') {
      this.pendingStationId = null
      this.controller?.cancelDestination()
      this.world?.hideMarker()
    }

    this.callbacks.onModeChange?.(next)
    return this.controlMode
  }

  toggleControlMode() {
    return this.setControlMode(this.controlMode === 'point' ? 'keys' : 'point')
  }

  setHelpVisible(visible) {
    this.helpVisible = Boolean(visible)
  }

  resetCamera() {
    this.rig?.reset()
  }

  /**
   * Putar diorama dari dalam peta.
   *
   * Selama peta terbuka, kanvas museum tertutup lembar peta, jadi seret kanan
   * tidak bisa dipakai. Tanpa pintu masuk ini arah pandang terkunci dan kerucut
   * pandang di peta terlihat “tidak mengikuti”.
   */
  rotateCamera(direction = 1) {
    if (!this.ready || this.destroyed || this.seated || this.paused) return
    this.rig?.rotateStep(direction)
    this.sound.playUi()
  }

  startAudio() {
    if (this.destroyed) return
    this.sound.start()
  }

  unlockAudio() {
    this.startAudio()
    window.removeEventListener('pointerdown', this.unlockAudio)
    window.removeEventListener('keydown', this.unlockAudio)
  }

  togglePhysics() {
    if (!this.ready || this.destroyed) return this.physicsEnabled
    this.setPhysicsEnabled(!this.physicsEnabled)
    return this.physicsEnabled
  }

  setPhysicsEnabled(enabled) {
    const next = Boolean(enabled)
    const applied = this.character?.setPhysicsEnabled(next) ?? next
    this.physicsEnabled = applied
    this.callbacks.onPhysicsChange?.(applied)
    return applied
  }

  toggleMute() {
    if (!this.ready || this.destroyed) return this.muted
    this.startAudio()
    this.muted = this.sound.toggleMute()
    this.callbacks.onMuteChange?.(this.muted)
    return this.muted
  }

  setMuted(muted) {
    const next = Boolean(muted)
    this.muted = this.sound.setMuted(next)
    this.callbacks.onMuteChange?.(this.muted)
    return this.muted
  }

  pointFromEvent(x, y) {
    const rect = this.engine.renderer.domElement.getBoundingClientRect()
    this.pointer.set((x / rect.width) * 2 - 1, -(y / rect.height) * 2 + 1)
    this.raycaster.setFromCamera(this.pointer, this.engine.camera)
  }

  stationIdAt(x, y) {
    this.pointFromEvent(x, y)
    const hits = this.raycaster.intersectObjects(this.world.interactables, true)
    return hits.length > 0 ? this.findStationId(hits[0].object) : null
  }

  handleClick(x, y) {
    if (!this.ready || this.destroyed || this.paused) return

    // Pastikan konteks audio sudah hidup pada klik pertama, sehingga blip UI
    // terdengar untuk semua klik (termasuk klik pertama sebelum unlockAudio).
    this.startAudio()

    const stationId = this.stationIdAt(x, y)
    const station = stationId ? this.world.getStation(stationId) : null

    if (station) {
      const anchor = this.stationAnchor(station)
      const stand = station.interaction
      const distance = this.controller.distanceTo(anchor.x, anchor.z)
      this.sound.playUi()

      if (distance <= this.getInteractRadius(station)) {
        // Cukup dekat: beri riak penanda di depan objek lalu buka panelnya.
        this.pulseMarker(stand.x, stand.z, 1.1)
        this.openStation(stationId)
        return
      }

      this.setControlMode('point')
      this.pendingStationId = stationId
      this.controller.moveTo(stand.x, stand.z, { run: distance > 4 })
      this.pulseMarker(stand.x, stand.z, 0)
      return
    }

    this.pointFromEvent(x, y)
    if (!this.raycaster.ray.intersectPlane(this.groundPlane, this.clickPoint)) return

    const target = this.controller.clampDestination(this.clickPoint.x, this.clickPoint.z)
    const distance = this.controller.distanceTo(target.x, target.z)
    if (distance < CONFIG.character.arrivalRadius * 0.8) return

    const now = performance.now()
    const doubleClick = now - this.lastClickAt < 320
    this.lastClickAt = now

    this.setControlMode('point')
    this.pendingStationId = null
    this.controller.moveTo(target.x, target.z, {
      run:
        this.input.isRunning() ||
        doubleClick ||
        distance > CONFIG.character.autoRunDistance,
    })
    this.world.showMarker(target.x, target.z)
    this.sound.playUi()
  }

  handleHover(x, y) {
    if (!this.ready || this.destroyed || this.paused || x < 0) {
      if (this.engine) this.engine.renderer.domElement.style.cursor = 'default'
      return
    }

    const id = this.stationIdAt(x, y)
    this.engine.renderer.domElement.style.cursor = id ? 'pointer' : 'default'
  }

  findStationId(object) {
    let node = object
    while (node) {
      if (node.userData?.stationId) return node.userData.stationId
      node = node.parent
    }
    return null
  }

  setProgress(value, label) {
    this.callbacks.onProgress?.(Math.min(1, Math.max(0, value)), label)
  }

  getDebugState() {
    const position = this.controller?.position
    return {
      ready: this.ready,
      paused: this.paused,
      activeView: this.activeView,
      activeStationId: this.activeStationId,
      nearestId: this.nearestId,
      pendingStationId: this.pendingStationId,
      controlMode: this.controlMode,
      touch: this.touch,
      walkingToPoint: this.controller?.isWalkingToPoint ?? false,
      physicsEnabled: this.physicsEnabled,
      physicsAvailable: this.character?.physicsAvailable ?? false,
      physicsEngine: this.character?.physicsEngine ?? null,
      physicsFallback: this.character?.physicsFallback ?? null,
      muted: this.muted,
      audioStarted: this.sound.started,
      speed: this.controller?.speed ?? 0,
      grounded: this.controller?.grounded ?? true,
      jumpWeight: this.animation?.jumpWeight ?? 0,
      exhibits: this.world?.exhibits.items.length ?? 0,
      projects: this.data?.projects?.length ?? 0,
      testimonials: this.data?.testimonials?.length ?? 0,
      cameraDistance: this.rig?.distance ?? 0,
      position: position
        ? { x: position.x, y: position.y, z: position.z }
        : null,
    }
  }

  dispose() {
    if (this.destroyed) return
    // Lepas mode duduk lebih dulu supaya kartu 3D dan teksturnya ikut dibuang.
    this.stage?.dispose()
    this.stage = null
    this.seated = false
    this.destroyed = true
    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('pointerdown', this.unlockAudio)
    window.removeEventListener('keydown', this.unlockAudio)
    this.input?.dispose()
    this.engine?.stop()
    this.sound?.dispose()
    this.animation?.dispose()
    this.character?.dispose()
    this.world?.dispose()
    this.engine?.dispose()

    this.input = null
    this.animation = null
    this.character = null
    this.world = null
    this.engine = null
  }
}
