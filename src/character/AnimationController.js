import { AnimationMixer, Euler, LoopRepeat, Quaternion } from 'three'
import { buildAnimation, VMDLoader } from '@moeru/three-mmd'
import { clamp } from '../core/math.js'

/**
 * Klip yang dimuat dari `public/motions/` (VMD hasil Mixamo → rig.reze.one).
 * Semua berulang; tidak ada klip tambahan yang dibangun di runtime.
 */
const BASE_CLIPS = ['idle', 'walk', 'run']

/**
 * Controller animasi karakter.
 *
 * Lapisan dasar memakai klip VMD asli (idle / walk / run) yang dipadukan
 * berdasarkan kecepatan. Di atasnya, pose prosedural (lompat, mendarat,
 * melambai, sorak, dan variasi idle) diterapkan sebagai rotasi lokal tambahan
 * setelah mixer menulis pose. Urutan ini penting: IK dan fisika MMD tetap
 * dihitung dari pose akhir, jadi kaki tidak "menembus" lantai dan rambut/kain
 * tetap mengikuti gerakan.
 */
export class AnimationController {
  constructor(character, config) {
    this.character = character
    this.config = config
    this.mixer = new AnimationMixer(character.mesh)
    this.actions = new Map()
    this.clips = new Map()
    this.weights = { idle: 1, walk: 0, run: 0 }

    this.bones = new Map()
    for (const bone of character.mesh?.skeleton?.bones ?? []) {
      if (bone?.name) this.bones.set(bone.name, bone)
    }

    this.jumpWeight = 0
    this.jumpPhase = 0
    this.landTimer = -1
    this.waveTimer = -1
    this.cheerTimer = -1
    this.flairTimer = -1
    this.idleTimer = 0
    this.time = 0

    this._deltaQuat = new Quaternion()
    this._targetQuat = new Quaternion()
    this._euler = new Euler()

    // Pose animasi murni per tulang sebelum overlay diterapkan. Dipakai sebagai
    // titik tolak pose() dan dipulihkan tiap frame, supaya rotasi prosedural
    // tidak menumpuk dari frame ke frame.
    this._overlayBase = new Map()

    this.ready = false
  }

  async load(definitions, onProgress) {
    const loader = new VMDLoader()
    const names = BASE_CLIPS.filter((name) => definitions?.[name])
    let loaded = 0

    await Promise.all(
      names.map(async (name) => {
        try {
          const vmd = await loader.loadAsync(definitions[name])
          const clip = buildAnimation(vmd, this.character.mesh)
          clip.name = name
          this.clips.set(name, clip)
        } catch (error) {
          console.warn(`Gagal memuat klip animasi ${name}:`, error)
        }
        loaded += 1
        onProgress?.(loaded / Math.max(1, names.length), name)
      }),
    )

    for (const name of BASE_CLIPS) {
      const clip = this.clips.get(name)
      if (!clip) continue
      const action = this.mixer.clipAction(clip)
      action.loop = LoopRepeat
      action.enabled = true
      action.setEffectiveWeight(name === 'idle' ? 1 : 0)
      action.play()
      this.actions.set(name, action)
    }

    this.ready = true
    return this
  }

  setWeight(name, value) {
    const action = this.actions.get(name)
    if (action) action.setEffectiveWeight(value)
  }

  /** Mulai lambaian tangan (emote). */
  playWave() {
    this.waveTimer = 0
  }

  /** Mulai selebrasi singkat. */
  playCheer() {
    this.cheerTimer = 0
  }

  /** Pose benturan saat mendarat. */
  playLandImpact() {
    this.landTimer = 0
  }

  update(delta, speed, state = {}) {
    if (!this.ready) return

    this.time += delta
    const cfg = this.config
    const walkTop = cfg.walkSpeed
    const runTop = cfg.runSpeed

    const walkBlend = clamp(speed / Math.max(0.001, walkTop), 0, 1)
    const runBlend = clamp(
      (speed - walkTop) / Math.max(0.001, runTop - walkTop),
      0,
      1,
    )

    const target = {
      idle: 1 - walkBlend,
      walk: walkBlend * (1 - runBlend),
      run: walkBlend * runBlend,
    }

    const smoothing = 1 - Math.exp(-cfg.weightSmoothing * delta)
    for (const name of ['idle', 'walk', 'run']) {
      this.weights[name] += (target[name] - this.weights[name]) * smoothing
      this.setWeight(name, this.weights[name])
    }

    // Sinkronisasi putaran klip agar langkah tidak terlihat meluncur.
    const walkAction = this.actions.get('walk')
    const runAction = this.actions.get('run')
    if (walkAction) {
      walkAction.timeScale = clamp(speed / (cfg.walkClipSpeed || 1), 0.7, 1.5)
    }
    if (runAction) {
      runAction.timeScale = clamp(
        speed / (cfg.runClipSpeed || 2.6),
        0.75,
        cfg.runTimeScaleMax ?? 1.9,
      )
    }

    this.updateIdleFlair(delta, speed, state)
    this.updateJump(delta, state)

    if (this.landTimer >= 0) {
      this.landTimer += delta
      if (this.landTimer > 0.55) this.landTimer = -1
    }
    if (this.waveTimer >= 0) {
      this.waveTimer += delta
      if (this.waveTimer > 1.9) this.waveTimer = -1
    }
    if (this.cheerTimer >= 0) {
      this.cheerTimer += delta
      if (this.cheerTimer > 1.7) this.cheerTimer = -1
    }

    this.character.updateWithMixer(delta, this.mixer, {
      restore: () => this.restoreOverlayBones(),
      apply: () => this.applyOverlay(),
    })
  }

  /**
   * Kembalikan tulang yang dipose overlay ke pose animasi murni.
   *
   * Pustaka MMD menyimpan cache pose **setelah** overlay kita, jadi tanpa
   * pemulihan ini setiap frame menambahkan delta yang sama lagi: tangan naik
   * terus dan kepala berputar penuh. Pemulihan dijalankan tepat sebelum mixer
   * menulis pose, sehingga tulang yang dianimasikan klip tetap segar.
   */
  restoreOverlayBones() {
    if (this._overlayBase.size === 0) return
    for (const [bone, rotation] of this._overlayBase) bone.quaternion.copy(rotation)
    this._overlayBase.clear()
  }

  updateIdleFlair(delta, speed, state) {
    const cfg = this.config.idleFlair ?? { after: 5.5, duration: 3.4 }

    if (speed > 0.1 || !(state.grounded ?? true)) {
      this.idleTimer = 0
      if (this.flairTimer >= 0 && this.flairTimer < cfg.duration * 0.6) {
        this.flairTimer = -1
      }
      return
    }

    if (this.flairTimer >= 0) {
      this.flairTimer += delta
      if (this.flairTimer > cfg.duration) this.flairTimer = -1
      return
    }

    this.idleTimer += delta
    if (this.idleTimer > cfg.after) {
      this.idleTimer = 0
      this.flairTimer = 0
    }
  }

  updateJump(delta, state) {
    const cfg = this.config.jump ?? {}
    const grounded = state.grounded ?? true
    const blendSpeed = cfg.blendSpeed ?? 16
    const blend = 1 - Math.exp(-blendSpeed * delta)

    const targetWeight = grounded ? 0 : 1
    this.jumpWeight += (targetWeight - this.jumpWeight) * blend
    if (this.jumpWeight < 0.001) this.jumpWeight = 0
    if (this.jumpWeight > 0.999) this.jumpWeight = 1

    if (!grounded) {
      this.jumpPhase = clamp(
        (state.airTime ?? 0) / Math.max(0.001, state.airDuration ?? 0.66),
        0,
        1,
      )
    }
  }

  /**
   * Terapkan rotasi lokal tambahan ke tulang, relatif terhadap pose animasi
   * murni frame ini (bukan terhadap hasil overlay frame sebelumnya).
   */
  pose(boneName, x, y, z, weight) {
    const bone = this.bones.get(boneName)
    if (!bone || weight <= 0.001) return

    let base = this._overlayBase.get(bone)
    if (!base) {
      base = bone.quaternion.clone()
      this._overlayBase.set(bone, base)
    }

    this._euler.set(x, y, z, 'XYZ')
    this._deltaQuat.setFromEuler(this._euler)
    this._targetQuat.copy(base).multiply(this._deltaQuat)
    bone.quaternion.slerp(this._targetQuat, Math.min(1, weight))
  }

  applyOverlay() {
    this.applyJump()
    this.applyLand()
    this.applyWave()
    this.applyCheer()
    this.applyIdleFlair()
  }

  applyJump() {
    const weight = this.jumpWeight
    if (weight <= 0.001) return

    const phase = this.jumpPhase
    // Tuck paling dalam di puncak lompatan.
    const tuck = Math.sin(Math.PI * clamp(phase, 0, 1))
    const w = weight

    this.pose('上半身', 0.18 * tuck, 0, 0, w * 0.55)
    this.pose('頭', -0.12 * tuck, 0, 0, w * 0.5)
    this.pose('左腕', -0.5 * tuck, 0, 0.32 * tuck, w * 0.9)
    this.pose('右腕', -0.5 * tuck, 0, -0.32 * tuck, w * 0.9)
    this.pose('左ひじ', 0.45 * tuck, 0, 0, w * 0.7)
    this.pose('右ひじ', 0.45 * tuck, 0, 0, w * 0.7)
    this.pose('左足', 0.42 * tuck, 0, 0.05 * tuck, w * 0.9)
    this.pose('右足', 0.34 * tuck, 0, -0.05 * tuck, w * 0.9)
    this.pose('左ひざ', -0.85 * tuck, 0, 0, w * 0.9)
    this.pose('右ひざ', -0.7 * tuck, 0, 0, w * 0.9)
  }

  applyLand() {
    if (this.landTimer < 0) return
    const t = this.landTimer
    const duration = 0.55
    // Envelope cepat naik lalu mereda.
    const weight = Math.max(0, 1 - t / duration) ** 1.5
    if (weight <= 0.001) return

    // Cekungan kecil di awal pendaratan.
    const dip = Math.sin(Math.min(1, t / duration) * Math.PI) * 0.5 + 0.5
    this.pose('上半身', 0.14 * dip, 0, 0, weight * 0.7)
    this.pose('頭', -0.06 * dip, 0, 0, weight * 0.5)
    this.pose('左ひざ', -0.55 * dip, 0, 0, weight * 0.8)
    this.pose('右ひざ', -0.55 * dip, 0, 0, weight * 0.8)
    this.pose('左足', 0.22 * dip, 0, 0, weight * 0.6)
    this.pose('右足', 0.22 * dip, 0, 0, weight * 0.6)
    this.pose('左腕', -0.2, 0, 0.16, weight * 0.5)
    this.pose('右腕', -0.2, 0, -0.16, weight * 0.5)
  }

  applyWave() {
    if (this.waveTimer < 0) return
    const t = this.waveTimer
    const fadeIn = clamp(t * 6, 0, 1)
    const fadeOut = clamp((1.9 - t) * 3, 0, 1)
    const weight = fadeIn * fadeOut
    if (weight <= 0.001) return

    const wave = Math.sin(t * 9.5)
    this.pose('上半身', -0.02, 0.1, -0.05, weight * 0.5)
    this.pose('頭', 0.02, 0.15, 0.06, weight * 0.6)
    this.pose('右肩', 0.08, 0, -0.18, weight * 0.7)
    this.pose('右腕', -1.5 + wave * 0.1, 0.18, -0.42, weight)
    this.pose('右ひじ', 1.15, 0, -0.1, weight)
    this.pose('右手首', 0, wave * 0.4, -0.2, weight)
    this.pose('左腕', -0.08, 0, 0.06, weight * 0.4)
  }

  applyCheer() {
    if (this.cheerTimer < 0) return
    const t = this.cheerTimer
    const fadeIn = clamp(t * 7, 0, 1)
    const fadeOut = clamp((1.7 - t) * 3, 0, 1)
    const weight = fadeIn * fadeOut
    if (weight <= 0.001) return

    const bounce = Math.sin(t * 11) * 0.06
    this.pose('上半身', -0.2, 0, 0, weight * 0.7)
    this.pose('頭', -0.24, 0, 0, weight * 0.6)
    this.pose('右肩', 0.16, 0, -0.24, weight * 0.6)
    this.pose('右腕', -2.25 + bounce, 0, -0.32, weight)
    this.pose('右ひじ', 0.35, 0, 0, weight * 0.8)
    this.pose('左肩', 0.16, 0, 0.24, weight * 0.6)
    this.pose('左腕', -2.25 + bounce, 0, 0.32, weight)
    this.pose('左ひじ', 0.35, 0, 0, weight * 0.8)
    this.pose('左足', 0.12, 0, 0.05, weight * 0.4)
    this.pose('左ひざ', -0.2, 0, 0, weight * 0.4)
  }

  /**
   * Variasi idle: hanya kepala dan bahu yang menengok pelan.
   * Lengan sengaja tidak dipose — overlay di lengan paling mudah terlihat
   * sebagai tangan yang naik sendiri.
   */
  applyIdleFlair() {
    if (this.flairTimer < 0) return
    const cfg = this.config.idleFlair ?? { after: 5.5, duration: 3.4 }
    const t = this.flairTimer
    const fadeIn = clamp(t * 2.2, 0, 1)
    const fadeOut = clamp((cfg.duration - t) * 2.2, 0, 1)
    const weight = fadeIn * fadeOut
    if (weight <= 0.001) return

    const swing = Math.sin((t / cfg.duration) * Math.PI * 2)
    const tilt = Math.sin((t / cfg.duration) * Math.PI * 3)
    this.pose('頭', -0.02 + tilt * 0.02, swing * 0.24, tilt * 0.05, weight)
    this.pose('首', 0, swing * 0.1, tilt * 0.02, weight)
    this.pose('上半身', 0, swing * 0.035, 0, weight * 0.5)
  }

  dispose() {
    this.mixer.stopAllAction()
    this.mixer.uncacheRoot(this.character.mesh)
    this.actions.clear()
    this.clips.clear()
    this.bones.clear()
  }
}
