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

  /** Dibuka dari HUD/indeks atau dari stasiun 3D. */
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
