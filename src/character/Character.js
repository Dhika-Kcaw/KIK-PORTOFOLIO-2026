import { Group } from 'three'
import { MMDLoader } from '@moeru/three-mmd'
import { MMDSpringBonePlugin } from '@moeru/three-mmd-physics-springbone'
import { disposeObject3D } from '../core/math.js'

/**
 * Muat plugin fisika Ammo.js secara dinamis.
 *
 * `ammoPhysics.js` diimpor di dalam `try/catch` supaya paket yang belum
 * terpasang (`bun install`) atau modul yang gagal di-resolve Vite hanya
 * menurunkan kualitas fisika, bukan menggagalkan seluruh museum.
 */
async function loadAmmoPlugin() {
  try {
    const module = await import('./ammoPhysics.js')
    return typeof module.MMDAmmoPlugin === 'function' ? module.MMDAmmoPlugin : null
  } catch (error) {
    console.warn(
      '[Character] Fisika Ammo tidak tersedia (jalankan `bun install`), memakai spring bone.',
      error,
    )
    return null
  }
}

/**
 * Memuat model PMX karakter museum dan menyiapkan mesh untuk dirender.
 * Karakter tidak tahu tentang input atau kamera.
 *
 * Fisika (rambut, kain, lengan baju) memakai Bullet lewat
 * `@moeru/three-mmd-physics-ammo`; spring bone hanya jadi cadangan.
 */
export class Character {
  constructor(config) {
    this.config = config
    this.root = new Group()
    this.root.name = 'character'
    this.mmd = null
    this.mesh = null
    this.physicsEnabled = config.physicsEnabled ?? true
    /** 'ammo' | 'spring' — mesin yang benar-benar dipakai setelah model dimuat. */
    this.physicsEngine = config.physicsEngine ?? 'ammo'
    /** Alasan mundur ke spring bone, bila ada. */
    this.physicsFallback = null
  }

  async load(onProgress) {
    const candidates = await this.physicsCandidates()
    let lastError = null

    for (const candidate of candidates) {
      try {
        await this.loadModel(candidate.plugin, onProgress)
        this.physicsEngine = candidate.engine
        return this
      } catch (error) {
        lastError = error
        this.physicsFallback = error?.message ?? String(error)
        console.warn(
          `[Character] Gagal memuat model dengan fisika ${candidate.engine}, mencoba cadangan.`,
          error,
        )
        this.unloadModel()
      }
    }

    throw lastError ?? new Error('Model karakter gagal dimuat.')
  }

  /**
   * Urutan percobaan fisika. Ammo didahulukan (kain & rambut disimulasikan
   * sebagai rigid body + constraint), spring bone tetap disiapkan sebagai
   * cadangan supaya model tidak pernah gagal tampil.
   */
  async physicsCandidates() {
    const engine = this.config.physicsEngine ?? 'ammo'
    const candidates = []

    if (engine === 'ammo') {
      const plugin = await loadAmmoPlugin()
      if (plugin) candidates.push({ engine: 'ammo', plugin })
    }

    candidates.push({ engine: 'spring', plugin: MMDSpringBonePlugin })
    return candidates
  }

  /** Satu percobaan pemuatan dengan satu plugin fisika. */
  async loadModel(plugin, onProgress) {
    const loader = new MMDLoader()
    loader.register(plugin)

    const mmd = await loader.loadAsync(this.config.model, (event) => {
      if (!event?.lengthComputable || !event.total) return
      onProgress?.(event.loaded / event.total)
    })

    mmd.setScalar(this.config.scale)
    this.mmd = mmd
    this.mesh = mmd.mesh
    this.mesh.name = 'character'
    this.mesh.castShadow = true
    this.mesh.receiveShadow = true
    // Model MMD punya banyak tulang; culling otomatis bisa salah saat animasi.
    this.mesh.frustumCulled = false
    this.root.add(this.mesh)
  }

  /** Bersihkan hasil percobaan yang gagal sebelum mencoba plugin lain. */
  unloadModel() {
    if (this.mesh) this.root.remove(this.mesh)
    this.mmd?.dispose?.()
    this.mmd = null
    this.mesh = null
  }

  /**
   * Dipanggil AnimationController setiap frame.
   * Pose overlay dijalankan setelah mixer menulis pose dan sebelum IK/fisika MMD,
   * sehingga gerakan prosedural (lompat, lambaian) ikut terhitung dengan benar.
   *
   * `overlay` boleh berupa fungsi biasa, atau objek `{ restore, apply }` bila
   * pemanggil perlu memulihkan pose bersih lebih dulu (lihat AnimationController).
   */
  updateWithMixer(delta, mixer, overlay = null) {
    if (!this.mmd || !mixer) return
    if (!overlay) {
      this.mmd.updateWithMixer(delta, mixer, { physics: this.physicsEnabled })
      return
    }

    const restore = typeof overlay === 'function' ? null : overlay.restore
    const apply = typeof overlay === 'function' ? overlay : overlay.apply

    this.mmd.beforeUpdate()
    // Pemulihan harus sebelum mixer: tulang yang dianimasikan klip langsung
    // ditimpa nilai baru, sedangkan tulang di luar klip kembali ke pose bersih.
    restore?.()
    mixer.update(delta)
    this.mmd.updateAnimation(mixer)
    apply?.()
    this.mmd.update(delta, { physics: this.physicsEnabled })
  }

  /** Nyalakan/matikan fisika (rambut & kain). */
  setPhysicsEnabled(enabled) {
    const next = Boolean(enabled)
    if (next === this.physicsEnabled) return this.physicsEnabled
    this.physicsEnabled = next
    // Kedua mesin menyediakan reset: setelah fisika dimatikan lama, rambut bisa
    // "meledak" tanpa reset karena constraint mengejar pose yang sudah jauh.
    if (next) this.mmd?.physics?.reset?.()
    return this.physicsEnabled
  }

  get physicsAvailable() {
    return Boolean(this.mmd?.physics)
  }

  get object() {
    return this.root
  }

  dispose() {
    this.unloadModel()
    disposeObject3D(this.root)
    this.root.clear()
  }
}
