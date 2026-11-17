import {
  ACESFilmicToneMapping,
  PCFShadowMap,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Timer,
  WebGLRenderer,
} from 'three'
import { clamp } from './math.js'
import { isTouchDevice } from './device.js'

/**
 * Membungkus renderer, scene, camera, dan render loop.
 * Semua sistem lain mendaftarkan callback lewat `addUpdater`.
 */
export class Engine {
  constructor(container, config) {
    this.container = container
    this.config = config
    this.updaters = new Set()
    this.running = false
    this.frameHandle = 0
    this.elapsed = 0
    this.timer = new Timer()
    this.timer.connect(document)

    this.renderer = new WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    })
    this.renderer.outputColorSpace = SRGBColorSpace
    this.renderer.toneMapping = ACESFilmicToneMapping
    this.renderer.toneMappingExposure = config.renderer.exposure
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = PCFShadowMap
    // Ponsel: rasio piksel 3 membuat GPU kelelahan dan baterai cepat habis.
    const pixelCap = isTouchDevice()
      ? Math.min(config.renderer.maxPixelRatio, 1.75)
      : config.renderer.maxPixelRatio
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelCap))
    this.renderer.domElement.classList.add('scene-canvas')
    this.container.appendChild(this.renderer.domElement)

    this.scene = new Scene()

    this.camera = new PerspectiveCamera(
      config.camera.fov,
      1,
      config.camera.near,
      config.camera.far,
    )
    this.camera.position.set(0, 2.2, 8)

    this.onResize = this.resize.bind(this)
    this.onVisibility = this.handleVisibility.bind(this)
    window.addEventListener('resize', this.onResize)
    document.addEventListener('visibilitychange', this.onVisibility)

    this.resize()
  }

  /** Daftarkan fungsi `(delta, elapsed) => void` yang dipanggil tiap frame. */
  addUpdater(updater) {
    this.updaters.add(updater)
    return () => this.updaters.delete(updater)
  }

  start() {
    if (this.running) return
    this.running = true
    this.frameHandle = requestAnimationFrame(this.tick)
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.frameHandle)
  }

  tick = () => {
    if (!this.running) return
    this.frameHandle = requestAnimationFrame(this.tick)

    this.timer.update()

    // Batasi delta agar tab yang lama tidak aktif tidak "melompat".
    const delta = Math.min(this.timer.getDelta(), 1 / 20)
    this.elapsed = this.timer.getElapsed()

    for (const updater of this.updaters) updater(delta, this.elapsed)

    this.renderer.render(this.scene, this.camera)
  }

  handleVisibility() {
    if (document.hidden) {
      this.stop()
    } else {
      this.start()
    }
  }

  resize() {
    const width = this.container.clientWidth || window.innerWidth
    const height = this.container.clientHeight || window.innerHeight
    this.camera.aspect = width / height

    // Layar potret: kalau sudut pandang dibiarkan, diorama 36 m terasa terlalu
    // dekat dan hanya lantai tengah yang terlihat. Lebarkan FOV bertahap
    // (maks 1,35×) supaya meja di kiri-kanan tetap masuk layar.
    const baseFov = this.config.camera.fov
    const portrait = this.camera.aspect < 1
    const boost = portrait ? clamp(1 + (1 - this.camera.aspect) * 0.5, 1, 1.35) : 1
    this.camera.fov = baseFov * boost

    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
  }

  dispose() {
    this.stop()
    window.removeEventListener('resize', this.onResize)
    document.removeEventListener('visibilitychange', this.onVisibility)
    this.timer.disconnect()
    this.updaters.clear()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
