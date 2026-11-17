import { DirectionalLight, Group, HemisphereLight, PointLight } from 'three'

/**
 * Cahaya senja halaman Wangsheng:
 * matahari rendah berwarna jingga, langit kertas hangat, dan pantulan lentera.
 */
export class Lighting {
  constructor(config) {
    this.config = config
    this.group = new Group()
    this.group.name = 'lighting'

    const hemisphere = new HemisphereLight(0xf3d3a2, 0x2a2119, 0.9)
    this.group.add(hemisphere)

    // Cahaya utama dari sisi barat, memberi bayangan panjang ke timur.
    const key = new DirectionalLight(0xffd39a, 2.35)
    key.position.set(-14, 22, 10)
    key.castShadow = true
    key.shadow.mapSize.set(config.renderer.shadowMapSize, config.renderer.shadowMapSize)
    key.shadow.camera.near = 1
    key.shadow.camera.far = 70
    key.shadow.camera.left = -28
    key.shadow.camera.right = 28
    key.shadow.camera.top = 28
    key.shadow.camera.bottom = -28
    key.shadow.bias = -0.0006
    key.shadow.normalBias = 0.035
    this.group.add(key)
    this.key = key

    // Isi dingin tipis dari langit agar bayangan tidak mati.
    const fill = new DirectionalLight(0x9aabc4, 0.5)
    fill.position.set(12, 8, -10)
    this.group.add(fill)
    this.fill = fill

    // Cahaya depan dari sisi kamera agar meja dan bingkai tetap terbaca.
    const front = new DirectionalLight(0xffdcb0, 0.42)
    front.position.set(16, 9, 20)
    this.group.add(front)
    this.front = front

    // Pantulan hangat dari lentera di tengah halaman.
    const lanternBounce = new PointLight(0xffb168, 18, 16, 2)
    lanternBounce.position.set(0, 3.2, 0)
    this.group.add(lanternBounce)
    this.lanternBounce = lanternBounce
  }

  update(delta, elapsed, cameraPos = null) {
    // Cahaya pengisi mengikuti sisi kamera, jadi objek yang sedang dilihat
    // tetap terbaca dari sudut putaran mana pun.
    if (cameraPos && this.front) {
      this.front.position.set(cameraPos.x, cameraPos.y + 4, cameraPos.z)
    }

    this.key.intensity = 2.35 + Math.sin(elapsed * 0.27) * 0.04
    this.fill.intensity = 0.5 + Math.sin(elapsed * 0.19 + 2) * 0.02
    this.lanternBounce.intensity = 18 + Math.sin(elapsed * 1.3) * 1.1
  }
}
