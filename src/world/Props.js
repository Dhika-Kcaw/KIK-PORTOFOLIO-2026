import {
  BoxGeometry,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PointLight,
  SphereGeometry,
  TorusGeometry,
  Vector2,
} from 'three'
import { createPaperLanternTexture } from './canvasTextures.js'

/**
 * Perabot dan hiasan museum: bukan koleksi dari database, hanya pengisi ruang
 * supaya plaza tidak terasa kosong.
 *
 * Semuanya mengikuti bahasa rupa NekoNeko: batu, kayu gelap, kuningan, kertas
 * lentera, dan bunga plum. Semua prop tanah menambahkan collider sendiri, dan
 * World memasukkannya ke NavGrid sebelum grid dibangun.
 */
export class Props {
  constructor(half = 18) {
    this.half = half
    this.group = new Group()
    this.group.name = 'props'
    this.colliders = []
    this.swinging = []
    this.lanternLights = []
    this.textures = []
    this.materials = []

    this.shareMaterials()

    // Bagian tengah plaza (pohon plum) dibiarkan lapang; hiasan ditempatkan di
    // empat diagonal plaza dan di sepanjang tepi ruangan.
    this.buildCensers()
    this.buildPlazaPlanters()
    this.buildLanternPoles()
    this.buildBenches()
    this.buildUrns()
    this.buildGalleryLanterns()
    this.buildArchiveCrates()
  }

  shareMaterials() {
    this.stoneMat = new MeshStandardMaterial({
      color: 0x6a6055,
      roughness: 0.92,
      metalness: 0.03,
    })
    this.darkStoneMat = new MeshStandardMaterial({
      color: 0x463f37,
      roughness: 0.95,
    })
    this.woodMat = new MeshStandardMaterial({
      color: 0x33251c,
      roughness: 0.9,
      metalness: 0.02,
    })
    this.bambooMat = new MeshStandardMaterial({
      color: 0x6f5a3c,
      roughness: 0.85,
    })
    this.bronzeMat = new MeshStandardMaterial({
      color: 0x5e5334,
      roughness: 0.58,
      metalness: 0.42,
    })
    this.ceramicMat = new MeshStandardMaterial({
      color: 0x3c4550,
      roughness: 0.42,
      metalness: 0.06,
    })
    this.blossomMat = new MeshStandardMaterial({
      color: 0xe9bcc6,
      emissive: 0x3a1e24,
      roughness: 0.82,
      flatShading: true,
    })
    this.ropeMat = new MeshStandardMaterial({ color: 0x8a7250, roughness: 0.95 })
    this.emberMat = new MeshBasicMaterial({
      color: 0xff9a4a,
      transparent: true,
      opacity: 0.9,
    })
    this.materials.push(
      this.stoneMat,
      this.darkStoneMat,
      this.woodMat,
      this.bambooMat,
      this.bronzeMat,
      this.ceramicMat,
      this.blossomMat,
      this.ropeMat,
      this.emberMat,
    )
  }

  addCollider(x, z, radius) {
    this.colliders.push({ x, z, radius })
  }

  /** Mesh standar prop: selalu menerima dan melempar bayangan. */
  mesh(geometry, material, castShadow = true) {
    const mesh = new Mesh(geometry, material)
    mesh.castShadow = castShadow
    mesh.receiveShadow = true
    return mesh
  }

  /** Dupa di atas dudukan kuningan, mengapit jalan masuk plaza. */
  buildCensers() {
    for (const x of [-2.9, 2.9]) {
      const group = new Group()
      group.position.set(x, 0, 7.4)

      for (let index = 0; index < 3; index += 1) {
        const angle = (index / 3) * Math.PI * 2 + 0.5
        const leg = this.mesh(new CylinderGeometry(0.032, 0.048, 0.34, 5), this.bronzeMat)
        leg.position.set(Math.cos(angle) * 0.17, 0.17, Math.sin(angle) * 0.17)
        leg.rotation.z = Math.cos(angle) * 0.16
        leg.rotation.x = -Math.sin(angle) * 0.16
        group.add(leg)
      }

      const bowl = this.mesh(
        new CylinderGeometry(0.3, 0.19, 0.26, 12, 1, true),
        this.bronzeMat,
      )
      bowl.position.y = 0.44
      group.add(bowl)

      const lip = this.mesh(new TorusGeometry(0.3, 0.022, 6, 20), this.bronzeMat)
      lip.rotation.x = Math.PI / 2
      lip.position.y = 0.57
      group.add(lip)

      const ash = this.mesh(new CylinderGeometry(0.27, 0.27, 0.03, 12), this.darkStoneMat, false)
      ash.position.y = 0.55
      group.add(ash)

      for (const [dx, dz, tilt] of [
        [0.07, 0.02, 0.12],
        [-0.05, 0.06, -0.16],
        [-0.02, -0.07, 0.05],
      ]) {
        const stick = this.mesh(
          new CylinderGeometry(0.006, 0.008, 0.44, 4),
          this.bambooMat,
          false,
        )
        stick.position.set(dx, 0.78, dz)
        stick.rotation.z = tilt
        group.add(stick)
        const ember = this.mesh(new SphereGeometry(0.014, 6, 4), this.emberMat, false)
        ember.position.set(dx + tilt * 0.22, 0.99, dz)
        group.add(ember)
      }

      this.group.add(group)
      this.addCollider(x, 7.4, 0.36)
    }
  }

  /**
   * Empat pot batu berisi plum muda di diagonal plaza.
   *
   * Mahkota memakai **satu** gumpalan daun bersudut (ikosahedron) dengan bunga
   * kecil yang menempel di permukaannya. Versi sebelumnya menumpuk lima bola
   * berukuran sama; karena jarak antar-pusatnya (0,26 m) lebih kecil dari dua
   * kali jari-jarinya (0,30 m), tiap pasangan bola saling menembus dan garis
   * potongnya terlihat sebagai tumpang tindih yang mengganggu. Bunga baru kini
   * juga jauh lebih kecil dari jarak antar-bunga, jadi tidak ada bola yang
   * bertabrakan.
   */
  buildPlazaPlanters() {
    const crownGeometry = new IcosahedronGeometry(0.24, 1)
    const flowerGeometry = new SphereGeometry(0.05, 7, 5)

    for (const x of [-5.6, 5.6]) {
      for (const z of [-5.6, 5.6]) {
        const group = new Group()
        group.position.set(x, 0, z)

        const pot = this.mesh(new CylinderGeometry(0.44, 0.52, 0.34, 8), this.stoneMat)
        pot.position.y = 0.17
        group.add(pot)

        const rim = this.mesh(new TorusGeometry(0.44, 0.028, 6, 18), this.stoneMat)
        rim.rotation.x = Math.PI / 2
        rim.position.y = 0.34
        group.add(rim)

        // Tanah 1 cm di atas penutup pot supaya benar-benar terlihat. Dulu ia
        // berada di bawah penutup sehingga pot tampak bertutup batu.
        const soil = this.mesh(new CircleGeometry(0.41, 14), this.darkStoneMat, false)
        soil.rotation.x = -Math.PI / 2
        soil.position.y = 0.35
        group.add(soil)

        const trunk = this.mesh(new CylinderGeometry(0.045, 0.085, 0.9, 6), this.woodMat)
        trunk.position.y = 0.79
        trunk.rotation.z = 0.07
        group.add(trunk)

        // Ranting berhenti sedikit di bawah mahkota, jadi ujungnya tidak menusuk
        // keluar di antara bunga.
        for (const [bx, by, bz, rx, rz, length] of [
          [0.1, 1.0, 0.05, 0.3, -0.66, 0.3],
          [-0.09, 1.04, -0.05, -0.26, 0.6, 0.28],
          [0.02, 1.08, 0.09, 0.62, 0.12, 0.22],
        ]) {
          const branch = this.mesh(new CylinderGeometry(0.02, 0.034, length, 5), this.woodMat)
          branch.position.set(bx, by, bz)
          branch.rotation.set(rx, 0.4, rz)
          group.add(branch)
        }

        const crown = new Group()
        crown.position.y = 1.42

        const mass = this.mesh(crownGeometry, this.blossomMat, false)
        mass.scale.set(1, 0.82, 1)
        crown.add(mass)

        for (let index = 0; index < 6; index += 1) {
          const angle = (index / 6) * Math.PI * 2 + 0.4
          const flower = this.mesh(flowerGeometry, this.blossomMat, false)
          flower.position.set(
            Math.cos(angle) * 0.26,
            Math.sin(index * 1.7) * 0.09,
            Math.sin(angle) * 0.26,
          )
          flower.scale.set(1, 0.7, 1)
          crown.add(flower)
        }

        group.add(crown)

        this.group.add(group)
        this.addCollider(x, z, 0.52)
      }
    }
  }

  /** Material kertas lentera dipakai tiang lentera dan lentera galeri. */
  createLanternMaterial() {
    if (this.lanternMat) return this.lanternMat
    const paper = createPaperLanternTexture()
    this.textures.push(paper)
    this.lanternMat = new MeshStandardMaterial({
      map: paper,
      emissive: 0xd98a4a,
      emissiveMap: paper,
      emissiveIntensity: 0.55,
      roughness: 0.9,
    })
    this.materials.push(this.lanternMat)
    return this.lanternMat
  }

  /** Tiang kayu dengan dua lentera kertas, mengapit pintu masuk selatan. */
  buildLanternPoles() {
    this.createLanternMaterial()

    for (const [x, z, side] of [
      [-14.4, 15.4, 1],
      [14.4, 15.4, -1],
    ]) {
      const group = new Group()
      group.position.set(x, 0, z)

      const foot = this.mesh(new CylinderGeometry(0.28, 0.34, 0.2, 8), this.stoneMat)
      foot.position.y = 0.1
      group.add(foot)

      const pole = this.mesh(new CylinderGeometry(0.07, 0.095, 3.4, 7), this.woodMat)
      pole.position.y = 1.9
      group.add(pole)

      const arm = this.mesh(new BoxGeometry(1.9, 0.09, 0.09), this.woodMat)
      arm.position.y = 3.58
      group.add(arm)

      const brace = this.mesh(new BoxGeometry(0.6, 0.08, 0.07), this.woodMat)
      brace.position.set(side * 0.3, 3.34, 0)
      brace.rotation.z = side * 0.6
      group.add(brace)

      for (const dx of [-0.78, 0.78]) {
        const hanger = new Group()
        hanger.position.set(dx, 3.54, 0)

        const cord = this.mesh(new CylinderGeometry(0.012, 0.012, 0.26, 4), this.ropeMat, false)
        cord.position.y = -0.13
        hanger.add(cord)

        const cap = this.mesh(new CylinderGeometry(0.12, 0.12, 0.05, 10), this.woodMat)
        cap.position.y = -0.26
        hanger.add(cap)

        const body = this.mesh(
          new CylinderGeometry(0.19, 0.19, 0.34, 12, 1, true),
          this.lanternMat,
          false,
        )
        body.position.y = -0.45
        hanger.add(body)

        const base = this.mesh(new CylinderGeometry(0.12, 0.12, 0.05, 10), this.woodMat)
        base.position.y = -0.64
        hanger.add(base)

        group.add(hanger)
        this.swinging.push({ group: hanger, seed: x * 0.3 + dx * 2.1, side })
      }

      const light = new PointLight(0xffb168, 2.4, 6, 2)
      light.position.set(0, 3.1, 0)
      group.add(light)
      this.lanternLights.push({ light, seed: x, base: 2.4 })

      this.group.add(group)
      this.addCollider(x, z, 0.24)
    }
  }

  /** Bangku batu: dua di tepi timur, dua di tepi selatan. */
  buildBenches() {
    for (const [x, z, rotationY] of [
      [15, 5.4, -Math.PI / 2],
      [15, -5.4, -Math.PI / 2],
      [-11.8, 14.9, 0],
      [11.8, 14.9, 0],
    ]) {
      const group = new Group()
      group.position.set(x, 0, z)
      group.rotation.y = rotationY

      const seat = this.mesh(new BoxGeometry(1.5, 0.14, 0.44), this.stoneMat)
      seat.position.y = 0.42
      group.add(seat)

      for (const dx of [-0.56, 0.56]) {
        const leg = this.mesh(new BoxGeometry(0.18, 0.42, 0.34), this.darkStoneMat)
        leg.position.set(dx, 0.21, 0)
        group.add(leg)
      }

      // Cushion tipis beralas kain gelap supaya bangku tidak terlihat seperti
      // balok batu mentah.
      const cushion = this.mesh(new BoxGeometry(1.34, 0.06, 0.36), this.ceramicMat, false)
      cushion.position.y = 0.5
      group.add(cushion)

      this.group.add(group)
      this.addCollider(x, z, 0.62)
    }
  }

  /** Guci keramik tinggi di sisi beranda. */
  buildUrns() {
    const profile = [
      new Vector2(0.06, 0),
      new Vector2(0.2, 0.03),
      new Vector2(0.26, 0.16),
      new Vector2(0.3, 0.42),
      new Vector2(0.26, 0.66),
      new Vector2(0.16, 0.8),
      new Vector2(0.15, 0.86),
      new Vector2(0.2, 0.9),
    ]

    for (const x of [-2.7, 2.7]) {
      const group = new Group()
      group.position.set(x, 0, 12.9)

      const jar = this.mesh(new LatheGeometry(profile, 14), this.ceramicMat)
      group.add(jar)

      const band = this.mesh(new TorusGeometry(0.28, 0.018, 5, 16), this.bronzeMat, false)
      band.rotation.x = Math.PI / 2
      band.position.y = 0.48
      group.add(band)

      // Sebatang plum kering di dalam guci.
      for (const [rx, rz] of [
        [0.35, 0.5],
        [-0.3, -0.4],
        [0.1, 0.85],
      ]) {
        const twig = this.mesh(new CylinderGeometry(0.012, 0.022, 0.52, 4), this.woodMat, false)
        twig.position.y = 1.02
        twig.rotation.set(rx, 0.3, rz)
        group.add(twig)
      }

      this.group.add(group)
      this.addCollider(x, 12.9, 0.32)
    }
  }

  /** Sepasang lentera batu kecil mengapit meja galeri proyek. */
  buildGalleryLanterns() {
    this.createLanternMaterial()
    for (const x of [-4.4, 4.4]) {
      const group = new Group()
      group.position.set(x, 0, -10.2)

      const base = this.mesh(new CylinderGeometry(0.3, 0.38, 0.18, 6), this.stoneMat)
      base.position.y = 0.09
      group.add(base)

      const post = this.mesh(new CylinderGeometry(0.1, 0.13, 0.72, 6), this.stoneMat)
      post.position.y = 0.54
      group.add(post)

      const box = this.mesh(new CylinderGeometry(0.22, 0.22, 0.3, 6), this.lanternMat, false)
      box.position.y = 1.03
      group.add(box)

      const roof = this.mesh(new ConeGeometry(0.38, 0.22, 6), this.stoneMat)
      roof.position.y = 1.28
      group.add(roof)

      const light = new PointLight(0xffb168, 1.8, 4.5, 2)
      light.position.y = 1.03
      group.add(light)
      this.lanternLights.push({ light, seed: x * 1.4, base: 1.8 })

      this.group.add(group)
      this.addCollider(x, -10.2, 0.42)
    }
  }

  /** Peti arsip bertali bambu, ditumpuk rapi di belakang barisan bingkai. */
  buildArchiveCrates() {
    for (const [x, z, scale, rotationY] of [
      [-7.6, -15.05, 1, 0],
      [-2.6, -15.05, 0.86, 0.18],
      [2.6, -15.05, 1.08, -0.14],
      [7.6, -15.05, 0.92, 0.09],
    ]) {
      const group = new Group()
      group.position.set(x, 0, z)
      group.rotation.y = rotationY

      const width = 0.9 * scale
      const depth = 0.68 * scale
      const height = 0.6 * scale

      const box = this.mesh(new BoxGeometry(width, height, depth), this.woodMat)
      box.position.y = height / 2
      group.add(box)

      for (const y of [height * 0.3, height * 0.74]) {
        const band = this.mesh(
          new BoxGeometry(width + 0.03, 0.05, depth + 0.03),
          this.bambooMat,
          false,
        )
        band.position.y = y
        group.add(band)
      }

      if (scale > 0.95) {
        const upper = this.mesh(
          new BoxGeometry(width * 0.78, height * 0.68, depth * 0.84),
          this.woodMat,
        )
        upper.position.set(0.03, height + height * 0.34, -0.02)
        upper.rotation.y = 0.12
        group.add(upper)
      }

      // Gulungan kertas di atas peti paling rendah.
      if (scale < 0.95) {
        const roll = this.mesh(
          new CylinderGeometry(0.07, 0.07, 0.62, 8),
          this.ropeMat,
          false,
        )
        roll.rotation.z = Math.PI / 2
        roll.position.set(0, height + 0.08, 0.1)
        group.add(roll)
      }

      this.group.add(group)
      // Peti berada di belakang bingkai, tapi tetap diberi penghalang supaya
      // karakter tidak menembusnya bila menyusur dinding.
      this.addCollider(x, z, 0.55)
    }
  }

  update(delta, elapsed) {
    for (const { group, seed, side } of this.swinging) {
      group.rotation.z = Math.sin(elapsed * 0.72 + seed) * 0.055 * side
      group.rotation.x = Math.cos(elapsed * 0.54 + seed * 1.7) * 0.035
    }

    // Kanopi plum tidak diputar: bunga yang berputar pada porosnya terbaca aneh,
    // bukan seperti tertiup angin.

    this.emberMat.opacity = 0.72 + Math.sin(elapsed * 1.15 + 0.4) * 0.07

    if (this.lanternMat) {
      this.lanternMat.emissiveIntensity = 0.52 + Math.sin(elapsed * 0.8 + 0.9) * 0.03
    }

    for (const { light, seed, base } of this.lanternLights) {
      light.intensity = base + Math.sin(elapsed * 1.05 + seed) * 0.09
    }
  }

  dispose() {
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
