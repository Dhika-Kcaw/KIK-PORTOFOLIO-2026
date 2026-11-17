import {
  BoxGeometry,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  RepeatWrapping,
  RingGeometry,
  SphereGeometry,
  Vector3,
} from 'three'
import {
  createBannerTexture,
  createCourtyardTexture,
  createMuseumSignTexture,
  createPaperLanternTexture,
} from './canvasTextures.js'
import { GROUND_LAYER } from './groundLayers.js'

/**
 * Museum Wangsheng: paviliun terbuka bergaya arsip.
 *
 * Dua dinding nyata (utara & barat) menjadi tempat koleksi. Sisi timur dan
 * selatan dibiarkan terbuka agar kamera isometrik tetap melihat ke dalam.
 */
export class Museum {
  constructor(config) {
    this.config = config
    this.group = new Group()
    this.group.name = 'museum'
    this.half = config.world?.platformHalf ?? 18
    this.colliders = []
    this.textures = []
    this.materials = []
    this.hangingLanterns = []
    this.stoneLanterns = []

    this.buildFloor()
    this.buildWalls()
    this.buildColumns()
    this.buildCeiling()
    this.buildStoneLanterns()
    this.buildTree()
  }

  addCollider(x, z, radius) {
    this.colliders.push({ x, z, radius })
  }

  mesh(geometry, material) {
    const mesh = new Mesh(geometry, material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    return mesh
  }

  buildFloor() {
    const half = this.half

    const floorTexture = createCourtyardTexture()
    floorTexture.wrapS = RepeatWrapping
    floorTexture.wrapT = RepeatWrapping
    floorTexture.repeat.set(3, 3)
    floorTexture.anisotropy = 8
    this.textures.push(floorTexture)

    this.floorMat = new MeshStandardMaterial({
      map: floorTexture,
      color: 0xffffff,
      roughness: 0.92,
      metalness: 0.02,
    })
    this.floorMat.map.colorSpace = floorTexture.colorSpace
    this.materials.push(this.floorMat)

    const floor = new Mesh(new PlaneGeometry(half * 2, half * 2), this.floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    this.group.add(floor)

    this.slabMat = new MeshStandardMaterial({
      color: 0x1c1712,
      roughness: 0.94,
      metalness: 0.03,
    })
    this.materials.push(this.slabMat)

    const slab = new Mesh(new BoxGeometry(half * 2, 1.2, half * 2), this.slabMat)
    slab.position.y = -0.62
    slab.receiveShadow = true
    slab.castShadow = true
    this.group.add(slab)

    this.trimMat = new MeshBasicMaterial({ color: 0x8d322a })
    this.woodMat = new MeshStandardMaterial({
      color: 0x35271d,
      roughness: 0.88,
      metalness: 0.02,
    })
    this.materials.push(this.trimMat, this.woodMat)

    const edge = half - 0.22
    for (const [x, z, width, depth] of [
      [0, edge, half * 2, 0.26],
      [0, -edge, half * 2, 0.26],
      [edge, 0, 0.26, half * 2],
      [-edge, 0, 0.26, half * 2],
    ]) {
      const border = new Mesh(new BoxGeometry(width, 0.16, depth), this.woodMat)
      border.position.set(x, 0.08, z)
      border.receiveShadow = true
      this.group.add(border)

      const line = new Mesh(new BoxGeometry(width * 0.98, 0.02, 0.06), this.trimMat)
      line.position.set(x, 0.17, z)
      this.group.add(line)
    }

    // Plaza tengah: lempeng batu yang lebih terang dengan garis tepi tipis,
    // jadi ruang tengah punya bentuk yang jelas dan tidak terasa kosong.
    const plazaMat = new MeshStandardMaterial({
      color: 0x6f6351,
      roughness: 0.94,
      metalness: 0.02,
    })
    const plazaEdgeMat = new MeshStandardMaterial({
      color: 0x7e7159,
      roughness: 0.9,
      metalness: 0.02,
    })
    this.materials.push(plazaMat, plazaEdgeMat)

    const plaza = new Mesh(new CircleGeometry(5.2, 64), plazaMat)
    plaza.rotation.x = -Math.PI / 2
    plaza.position.y = GROUND_LAYER.plaza
    plaza.receiveShadow = true
    this.group.add(plaza)

    const plazaEdge = new Mesh(new RingGeometry(5.2, 5.34, 64), plazaEdgeMat)
    plazaEdge.rotation.x = -Math.PI / 2
    plazaEdge.position.y = GROUND_LAYER.plazaEdge
    this.group.add(plazaEdge)

    // Lingkaran tinta di bawah pohon, seperti cap besar di lantai plaza.
    const ring = new Mesh(new RingGeometry(2.1, 2.22, 64), this.trimMat)
    ring.rotation.x = -Math.PI / 2
    ring.position.set(0, GROUND_LAYER.inkRing, 0)
    this.group.add(ring)
  }

  buildWalls() {
    const half = this.half
    const wallHeight = 4.6
    const wallLength = half * 2 - 3
    const wallZ = -(half - 1.9)
    const wallX = -(half - 1.9)
    // Empat panel kertas yang dibagi rata di sepanjang dinding; jumlahnya
    // dikurangi dari lima agar panel 6,1 m tidak saling menumpuk di ruangan
    // yang lebih ringkas.
    const panelSpan = half - 7
    const panelPositions = [-1, -1 / 3, 1 / 3, 1].map((factor) => factor * panelSpan)
    const wallMat = new MeshStandardMaterial({
      color: 0x81735f,
      roughness: 0.96,
      metalness: 0,
    })
    const panelMat = new MeshStandardMaterial({
      color: 0x96836a,
      roughness: 0.98,
      metalness: 0,
    })
    this.materials.push(wallMat, panelMat)

    // Dua dinding dipisah sebagai grup agar bisa disembunyikan saat kamera
    // berputar ke belakangnya (diorama tetap terlihat utuh dari sisi mana pun).
    this.wallZ = wallZ
    this.wallX = wallX
    this.northWall = new Group()
    this.westWall = new Group()
    this.group.add(this.northWall, this.westWall)

    const north = this.mesh(new BoxGeometry(wallLength, wallHeight, 0.5), wallMat)
    north.position.set(0, wallHeight / 2, wallZ)
    this.northWall.add(north)

    const west = this.mesh(new BoxGeometry(0.5, wallHeight, wallLength), wallMat)
    west.position.set(wallX, wallHeight / 2, 0)
    this.westWall.add(west)

    // Panel kertas di antara tiang kayu.
    for (const x of panelPositions) {
      const panel = new Mesh(new PlaneGeometry(6.1, 2.7), panelMat)
      panel.position.set(x, 2.7, wallZ + 0.28)
      this.northWall.add(panel)
    }
    for (const z of panelPositions) {
      const panel = new Mesh(new PlaneGeometry(6.1, 2.7), panelMat)
      panel.position.set(wallX + 0.28, 2.7, z)
      panel.rotation.y = Math.PI / 2
      this.westWall.add(panel)
    }

    // Kaki dinding, garis kayu, dan balok atas.
    const baseNorth = this.mesh(new BoxGeometry(wallLength - 1, 1.1, 0.12), this.woodMat)
    baseNorth.position.set(0, 0.56, wallZ + 0.32)
    this.northWall.add(baseNorth)

    const baseWest = this.mesh(new BoxGeometry(0.12, 1.1, wallLength - 1), this.woodMat)
    baseWest.position.set(wallX + 0.32, 0.56, 0)
    this.westWall.add(baseWest)

    const beamNorth = this.mesh(new BoxGeometry(wallLength + 0.4, 0.32, 0.66), this.woodMat)
    beamNorth.position.set(0, 4.5, wallZ + 0.3)
    this.northWall.add(beamNorth)

    const beamWest = this.mesh(new BoxGeometry(0.66, 0.32, wallLength + 0.4), this.woodMat)
    beamWest.position.set(wallX + 0.3, 4.5, 0)
    this.westWall.add(beamWest)

    for (const x of panelPositions) {
      const batten = this.mesh(new BoxGeometry(0.22, 3.1, 0.16), this.woodMat)
      batten.position.set(x, 2.3, wallZ + 0.34)
      this.northWall.add(batten)
    }
    for (const z of panelPositions) {
      const batten = this.mesh(new BoxGeometry(0.16, 3.1, 0.22), this.woodMat)
      batten.position.set(wallX + 0.34, 2.3, z)
      this.westWall.add(batten)
    }

    // Papan nama museum di tengah dinding utara.
    const signTexture = createMuseumSignTexture()
    this.textures.push(signTexture)
    const signMat = new MeshBasicMaterial({ map: signTexture, transparent: true })
    this.materials.push(signMat)
    const sign = new Mesh(new PlaneGeometry(4.5, 1.32), signMat)
    sign.position.set(0, 3.88, wallZ + 0.38)
    this.northWall.add(sign)

    // Spanduk vertikal di ujung dinding.
    for (const [text, x, z, rotationY, accent] of [
      ['往生堂', -(half - 2.8), wallZ + 0.4, 0, '#b23a30'],
      ['美術館', half - 2.8, wallZ + 0.4, 0, '#c9a05c'],
      ['生死', wallX + 0.4, half - 2.8, Math.PI / 2, '#7f9b86'],
    ]) {
      const texture = createBannerTexture(text, accent)
      this.textures.push(texture)
      const material = new MeshBasicMaterial({
        map: texture,
        side: DoubleSide,
        transparent: true,
      })
      this.materials.push(material)
      const banner = new Mesh(new PlaneGeometry(1.05, 3.45), material)
      banner.position.set(x, 2.55, z)
      banner.rotation.y = rotationY
      if (rotationY === 0) this.northWall.add(banner)
      else this.westWall.add(banner)
    }

    this.floorMat.map.needsUpdate = true
  }

  buildColumns() {
    const stoneMat = new MeshStandardMaterial({
      color: 0x5c5144,
      roughness: 0.9,
      metalness: 0.02,
    })
    this.materials.push(stoneMat)

    // Tiang kayu dibagi rata di sepanjang dua dinding, sedikit di depannya.
    const half = this.half
    const wallZ = -(half - 1.9)
    const wallX = -(half - 1.9)
    const span = half - 3
    const positions = []
    for (let index = 0; index <= 6; index += 1) {
      const t = -span + (span * 2 * index) / 6
      positions.push([t, wallZ + 1.5])
      if (index > 0 && index < 6) positions.push([wallX + 1.5, t])
    }

    for (const [x, z] of positions) {
      const base = this.mesh(new CylinderGeometry(0.44, 0.54, 0.34, 8), stoneMat)
      base.position.set(x, 0.17, z)
      this.group.add(base)

      const shaft = this.mesh(new CylinderGeometry(0.21, 0.26, 4.1, 8), this.woodMat)
      shaft.position.set(x, 2.3, z)
      this.group.add(shaft)

      const capital = this.mesh(new BoxGeometry(0.6, 0.22, 0.6), this.woodMat)
      capital.position.set(x, 4.42, z)
      this.group.add(capital)

      this.addCollider(x, z, 0.45)
    }
  }

  buildCeiling() {
    // Plaza dibiarkan terbuka: balok gantung dan lentera kertas dihapus agar
    // kamera tidak terhalang garis-garis gelap di tengah layar. Hanya material
    // lentera kertas yang tetap disiapkan untuk inti lentera batu.
    const lanternTexture = createPaperLanternTexture()
    this.textures.push(lanternTexture)
    this.paperMat = new MeshStandardMaterial({
      map: lanternTexture,
      emissive: 0xffa45c,
      emissiveMap: lanternTexture,
      emissiveIntensity: 0.7,
      roughness: 0.9,
      metalness: 0,
    })
    this.materials.push(this.paperMat)

  }

  buildStoneLanterns() {
    const stoneMat = new MeshStandardMaterial({
      color: 0x5a5043,
      roughness: 0.9,
      metalness: 0.02,
    })
    this.materials.push(stoneMat)

    // Sepasang lentera batu mengapit lorong masuk di sisi selatan.
    for (const x of [-6.5, 6.5]) {
      const group = new Group()
      group.position.set(x, 0, 15.6)

      const base = this.mesh(new CylinderGeometry(0.46, 0.58, 0.24, 6), stoneMat)
      base.position.y = 0.12
      group.add(base)

      const post = this.mesh(new CylinderGeometry(0.15, 0.2, 0.9, 6), stoneMat)
      post.position.y = 0.7
      group.add(post)

      const box = this.mesh(new CylinderGeometry(0.3, 0.3, 0.38, 6), this.paperMat)
      box.position.y = 1.28
      group.add(box)

      const roof = this.mesh(new ConeGeometry(0.52, 0.28, 6), stoneMat)
      roof.position.y = 1.58
      group.add(roof)

      const light = new PointLight(0xffb168, 3.2, 6, 2)
      light.position.y = 1.28
      group.add(light)

      this.group.add(group)
      this.stoneLanterns.push({ light, seed: x })
      this.addCollider(x, 15.6, 0.55)
    }
  }

  buildTree() {
    // Pohon plum menjadi pusat plaza; koleksi mengelilinginya di tepi ruangan.
    const tree = new Group()
    tree.position.set(0, 0, 0)

    const planterMat = new MeshStandardMaterial({
      color: 0x4c4033,
      roughness: 0.92,
    })
    this.materials.push(planterMat)

    const planter = this.mesh(new CylinderGeometry(1.55, 1.7, 0.42, 20), planterMat)
    planter.position.y = 0.21
    tree.add(planter)

    const soil = new Mesh(new CircleGeometry(1.46, 20), new MeshStandardMaterial({
      color: 0x211a15,
      roughness: 1,
    }))
    soil.rotation.x = -Math.PI / 2
    soil.position.y = 0.43
    tree.add(soil)
    this.materials.push(soil.material)

    const trunk = this.mesh(new CylinderGeometry(0.22, 0.36, 2.6, 7), this.woodMat)
    trunk.position.y = 1.7
    tree.add(trunk)

    // Ranting disusun radial supaya mahkota pohon terlihat penuh dari sudut
    // kamera mana pun (rotasi 360°).
    const canopyBase = new Vector3(0, 2.55, 0)
    const up = new Vector3(0, 1, 0)
    const tips = []
    const midTips = []
    for (let index = 0; index < 6; index += 1) {
      const angle = (index / 6) * Math.PI * 2 + 0.4
      const reach = 1.0 + (index % 2) * 0.22
      const tip = new Vector3(
        Math.cos(angle) * reach,
        canopyBase.y + 0.75 + (index % 3) * 0.14,
        Math.sin(angle) * reach,
      )
      const direction = tip.clone().sub(canopyBase)
      const branch = this.mesh(
        new CylinderGeometry(0.05, 0.12, direction.length(), 6),
        this.woodMat,
      )
      branch.position.copy(canopyBase).add(tip).multiplyScalar(0.5)
      branch.quaternion.setFromUnitVectors(up, direction.normalize())
      tree.add(branch)
      tips.push(tip)
      // Gugusan tambahan di tengah ranting agar mahkota tidak berupa bola-bola
      // di ujung tongkat saja.
      midTips.push(canopyBase.clone().add(direction.clone().multiplyScalar(0.62)))
    }
    midTips.forEach((point) => {
      const angle = Math.atan2(point.z, point.x)
      tips.push(new Vector3(point.x + Math.cos(angle) * 0.18, point.y + 0.12, point.z + Math.sin(angle) * 0.18))
    })
    // Pucuk tengah agar mahkota tampak penuh dari semua sudut.
    tips.push(new Vector3(0, 3.95, 0))

    this.blossomMats = [
      new MeshStandardMaterial({ color: 0xd795a4, roughness: 0.86 }),
      new MeshStandardMaterial({ color: 0xe9bcc3, roughness: 0.86 }),
      new MeshStandardMaterial({ color: 0xf1ddc6, roughness: 0.9 }),
    ]
    this.materials.push(...this.blossomMats)

    const blossomGeometry = new SphereGeometry(0.1, 6, 5)
    tips.forEach((tip, index) => {
      const cluster = new Group()
      cluster.position.copy(tip)
      for (let i = 0; i < 7; i += 1) {
        const blossom = new Mesh(blossomGeometry, this.blossomMats[i % this.blossomMats.length])
        const angle = (i / 7) * Math.PI * 2 + index * 0.6
        const radius = 0.12 + (i % 2) * 0.08
        blossom.position.set(
          Math.cos(angle) * radius,
          Math.sin(angle * 1.7) * 0.1,
          Math.sin(angle) * radius,
        )
        blossom.castShadow = true
        cluster.add(blossom)
      }
      tree.add(cluster)
    })

    this.group.add(tree)
    this.addCollider(0, 0, 1.72)
  }

  update(delta, elapsed, cameraPos = null) {
    // Sembunyikan dinding yang berada di antara kamera dan isi museum saat
    // diorama diputar, supaya pandangan tidak tertutup punggung dinding.
    if (cameraPos && this.northWall && this.westWall) {
      this.northWall.visible = cameraPos.z > this.wallZ - 0.5
      this.westWall.visible = cameraPos.x > this.wallX - 0.5
    }

    for (const { group, seed } of this.hangingLanterns) {
      group.rotation.z = Math.sin(elapsed * 0.75 + seed) * 0.045
      group.rotation.x = Math.cos(elapsed * 0.61 + seed) * 0.03
    }

    for (const { light, seed } of this.stoneLanterns) {
      // Nyala api berdenyut pelan; kedip 4 Hz terbaca sebagai lampu berkedip.
      light.intensity =
        3 + Math.sin(elapsed * 0.85 + seed) * 0.1 + Math.sin(elapsed * 1.6 + seed * 2.3) * 0.05
    }

    if (this.paperMat) {
      this.paperMat.emissiveIntensity = 0.68 + Math.sin(elapsed * 0.7 + 1.9) * 0.02
    }

    // Kanopi plum sengaja tidak dianimasikan: memutar kelompok bunga terbaca
    // sebagai bunga yang berputar, bukan sebagai angin.
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
