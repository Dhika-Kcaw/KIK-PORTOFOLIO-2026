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
  SphereGeometry,
} from 'three'
import {
  createCourtyardTexture,
  createPaperLanternTexture,
} from './canvasTextures.js'

/**
 * Halaman NekoNeko: diorama batu tempat portofolio berlangsung.
 * Tidak ada grid neon atau penanda debug — hanya lempeng batu, lumut,
 * lentera batu, pohon plum, dupa, dan untaian lentera kertas.
 */
export class Courtyard {
  constructor(config) {
    this.config = config
    this.group = new Group()
    this.group.name = 'courtyard'
    this.colliders = []
    this.textures = []
    this.materials = []
    this.stoneLanterns = []
    this.blossomGroups = []

    this.half = config.world?.platformHalf ?? 17

    this.buildGround()
    this.buildCorners()
    this.buildPlumTree()
    this.buildIncenseBurner()
    this.buildLanternString()
  }

  buildGround() {
    const half = this.half
    const floorTexture = createCourtyardTexture()
    floorTexture.wrapS = RepeatWrapping
    floorTexture.wrapT = RepeatWrapping
    floorTexture.repeat.set(3, 3)
    // Tekstur batu dilihat dari sudut miring; tanpa anisotropi, butiran halus
    // berkilau seperti lantai berkedip saat kamera bergerak.
    floorTexture.anisotropy = 8
    this.textures.push(floorTexture)

    this.floorMat = new MeshStandardMaterial({
      map: floorTexture,
      color: 0xffffff,
      roughness: 0.92,
      metalness: 0.02,
    })
    this.materials.push(this.floorMat)

    const floor = new Mesh(new PlaneGeometry(half * 2, half * 2), this.floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    this.group.add(floor)

    // Pelat batu gelap sebagai alas diorama.
    this.slabMat = new MeshStandardMaterial({
      color: 0x211a14,
      roughness: 0.9,
      metalness: 0.04,
    })
    this.materials.push(this.slabMat)

    const slab = new Mesh(new BoxGeometry(half * 2, 1.1, half * 2), this.slabMat)
    // Permukaan atas pelat sengaja diturunkan 2 cm dari plane lantai (y=0).
    // Jika keduanya tepat di y=0, keduanya berebut kedalaman dan lantai berkedip.
    slab.position.y = -0.57
    slab.receiveShadow = true
    slab.castShadow = true
    this.group.add(slab)

    // Tepi kayu rendah dengan garis vermilion tipis.
    this.curbMat = new MeshStandardMaterial({
      color: 0x2c211a,
      roughness: 0.75,
      metalness: 0.05,
    })
    this.trimMat = new MeshBasicMaterial({ color: 0x8d322a })
    this.materials.push(this.curbMat, this.trimMat)

    const curbHeight = 0.16
    const curbDepth = 0.3
    const edge = half - curbDepth / 2
    const sides = [
      { position: [0, curbHeight / 2, edge], size: [half * 2, curbHeight, curbDepth] },
      { position: [0, curbHeight / 2, -edge], size: [half * 2, curbHeight, curbDepth] },
      { position: [edge, curbHeight / 2, 0], size: [curbDepth, curbHeight, half * 2] },
      { position: [-edge, curbHeight / 2, 0], size: [curbDepth, curbHeight, half * 2] },
    ]

    for (const side of sides) {
      const curb = new Mesh(new BoxGeometry(...side.size), this.curbMat)
      curb.position.set(...side.position)
      curb.receiveShadow = true
      curb.castShadow = true
      this.group.add(curb)

      const trim = new Mesh(
        new BoxGeometry(
          side.size[0] * 0.98,
          0.018,
          side.size[2] * 0.98,
        ),
        this.trimMat,
      )
      trim.position.set(
        side.position[0],
        curbHeight + 0.009,
        side.position[2],
      )
      this.group.add(trim)
    }
  }

  buildCorners() {
    const offset = this.half - 2.4
    const corners = [
      [-offset, -offset],
      [offset, -offset],
      [-offset, offset],
      [offset, offset],
    ]

    const stoneMat = new MeshStandardMaterial({
      color: 0x4f463b,
      roughness: 0.86,
      metalness: 0.04,
    })
    this.materials.push(stoneMat)
    this.stoneMat = stoneMat

    const paperTexture = createPaperLanternTexture()
    this.textures.push(paperTexture)
    this.lanternPaperMat = new MeshStandardMaterial({
      map: paperTexture,
      emissive: 0xffa45c,
      emissiveMap: paperTexture,
      emissiveIntensity: 0.55,
      roughness: 0.9,
      metalness: 0,
    })
    this.materials.push(this.lanternPaperMat)

    for (let index = 0; index < corners.length; index += 1) {
      const [x, z] = corners[index]
      const lantern = new Group()
      lantern.position.set(x, 0, z)

      const base = new Mesh(new CylinderGeometry(0.58, 0.7, 0.26, 6), stoneMat)
      base.position.y = 0.13
      base.castShadow = true
      base.receiveShadow = true
      lantern.add(base)

      const pillar = new Mesh(new CylinderGeometry(0.18, 0.24, 1.05, 6), stoneMat)
      pillar.position.y = 0.78
      pillar.castShadow = true
      lantern.add(pillar)

      const housing = new Mesh(new CylinderGeometry(0.36, 0.36, 0.44, 6), this.lanternPaperMat)
      housing.position.y = 1.5
      housing.castShadow = true
      lantern.add(housing)

      const roof = new Mesh(new ConeGeometry(0.62, 0.32, 6), stoneMat)
      roof.position.y = 1.86
      roof.castShadow = true
      lantern.add(roof)

      const cap = new Mesh(new SphereGeometry(0.09, 8, 6), stoneMat)
      cap.position.y = 2.05
      lantern.add(cap)

      // Hanya dua lentera depan yang memberi cahaya; sisanya cukup memancar.
      if (z > 0) {
        const light = new PointLight(0xffb168, 5.5, 7, 2)
        light.position.y = 1.5
        lantern.add(light)
        this.stoneLanterns.push({ light, seed: index * 1.7 })
      }

      this.group.add(lantern)
      this.colliders.push({ x, z, radius: 0.62 })
    }
  }

  buildPlumTree() {
    const tree = new Group()
    tree.position.set(0, 0, 0)
    this.plumTree = tree

    this.woodMat = new MeshStandardMaterial({
      color: 0x3a2a21,
      roughness: 0.95,
      metalness: 0,
    })
    this.materials.push(this.woodMat)

    const branches = [
      { position: [0, 1.0, 0], rotation: [0.05, 0, 0.1], length: 2.1, top: 0.3, bottom: 0.44 },
      { position: [0.28, 2.5, 0.06], rotation: [-0.08, 0.4, 0.34], length: 1.7, top: 0.2, bottom: 0.3 },
      { position: [0.8, 3.6, 0.16], rotation: [0.1, 0.8, 0.58], length: 1.5, top: 0.13, bottom: 0.2 },
      { position: [1.55, 3.9, 0.3], rotation: [0.05, 0.3, 1.05], length: 1.5, top: 0.09, bottom: 0.14 },
      { position: [-0.35, 3.15, -0.2], rotation: [0.2, -0.6, -0.72], length: 1.4, top: 0.09, bottom: 0.15 },
      { position: [0.5, 3.9, 0.75], rotation: [0.95, 0.2, 0.28], length: 1.2, top: 0.08, bottom: 0.13 },
      { position: [0.95, 3.05, -0.8], rotation: [-0.9, 0.4, 0.36], length: 1.1, top: 0.07, bottom: 0.12 },
    ]

    for (const branch of branches) {
      const mesh = new Mesh(
        new CylinderGeometry(branch.top, branch.bottom, branch.length, 6),
        this.woodMat,
      )
      mesh.position.set(...branch.position)
      mesh.rotation.set(...branch.rotation)
      mesh.castShadow = true
      mesh.receiveShadow = true
      tree.add(mesh)
    }

    this.blossomMats = [
      new MeshStandardMaterial({ color: 0xd795a4, roughness: 0.85 }),
      new MeshStandardMaterial({ color: 0xe9bcc3, roughness: 0.85 }),
      new MeshStandardMaterial({ color: 0xf1ddc6, roughness: 0.9 }),
    ]
    this.materials.push(...this.blossomMats)

    const blossomGeometry = new SphereGeometry(0.1, 6, 5)
    const clusters = [
      [2.2, 4.55, 0.5],
      [1.65, 4.9, 0.1],
      [-1.0, 4.0, -0.55],
      [-0.4, 4.5, 0.2],
      [0.45, 4.55, 1.5],
      [0.9, 3.5, -1.65],
      [1.0, 3.15, 1.2],
      [-0.9, 3.5, 0.8],
      [0.2, 2.7, -0.9],
      [1.9, 4.2, -0.4],
    ]

    for (let c = 0; c < clusters.length; c += 1) {
      const cluster = new Group()
      cluster.position.set(...clusters[c])
      const material = this.blossomMats[c % this.blossomMats.length]
      for (let i = 0; i < 7; i += 1) {
        const angle = (i / 7) * Math.PI * 2 + c
        const radius = 0.16 + (i % 3) * 0.08
        const blossom = new Mesh(blossomGeometry, material)
        blossom.position.set(
          Math.cos(angle) * radius,
          Math.sin(angle * 1.7) * 0.12,
          Math.sin(angle) * radius,
        )
        blossom.castShadow = true
        cluster.add(blossom)
      }
      tree.add(cluster)
      this.blossomGroups.push({ group: cluster, seed: c * 0.8 })
    }

    // Kertas doa yang tergantung di ranting.
    const charmMat = new MeshStandardMaterial({
      color: 0xe8dbc1,
      roughness: 0.9,
      side: DoubleSide,
    })
    const charmMarkMat = new MeshBasicMaterial({ color: 0x9a362e })
    this.materials.push(charmMat, charmMarkMat)

    const charm = new Group()
    charm.position.set(1.25, 2.55, 0.75)
    const strip = new Mesh(new PlaneGeometry(0.16, 0.55), charmMat)
    strip.castShadow = true
    charm.add(strip)
    const mark = new Mesh(new PlaneGeometry(0.1, 0.03), charmMarkMat)
    mark.position.set(0, -0.02, 0.002)
    charm.add(mark)
    tree.add(charm)
    this.charm = charm

    this.group.add(tree)
    this.colliders.push({ x: 0, z: 0, radius: 1.05 })
  }

  buildIncenseBurner() {
    const burner = new Group()
    burner.position.set(-3.3, 0, 2.3)

    const bronzeMat = new MeshStandardMaterial({
      color: 0x4a3b2c,
      roughness: 0.55,
      metalness: 0.55,
    })
    const ashMat = new MeshStandardMaterial({
      color: 0x2a231d,
      roughness: 1,
    })
    this.materials.push(bronzeMat, ashMat)

    const bowl = new Mesh(new CylinderGeometry(0.5, 0.38, 0.32, 16), bronzeMat)
    bowl.position.y = 0.48
    bowl.castShadow = true
    burner.add(bowl)

    const rim = new Mesh(new CylinderGeometry(0.53, 0.53, 0.05, 16), bronzeMat)
    rim.position.y = 0.65
    burner.add(rim)

    const ash = new Mesh(new CircleGeometry(0.44, 16), ashMat)
    ash.rotation.x = -Math.PI / 2
    ash.position.y = 0.66
    burner.add(ash)

    for (let i = 0; i < 3; i += 1) {
      const angle = (i / 3) * Math.PI * 2
      const leg = new Mesh(new CylinderGeometry(0.05, 0.06, 0.34, 6), bronzeMat)
      leg.position.set(Math.cos(angle) * 0.28, 0.2, Math.sin(angle) * 0.28)
      leg.rotation.z = Math.cos(angle) * 0.18
      leg.rotation.x = Math.sin(angle) * 0.18
      burner.add(leg)
    }

    const emberMat = new MeshBasicMaterial({ color: 0xff8a4a })
    this.materials.push(emberMat)
    for (let i = 0; i < 3; i += 1) {
      const angle = i * 1.4
      const stick = new Mesh(new CylinderGeometry(0.01, 0.012, 0.42, 4), bronzeMat)
      stick.position.set(Math.cos(angle) * 0.08, 0.84, Math.sin(angle) * 0.08)
      stick.rotation.z = Math.cos(angle) * 0.12
      stick.rotation.x = Math.sin(angle) * 0.12
      burner.add(stick)

      const ember = new Mesh(new SphereGeometry(0.018, 6, 4), emberMat)
      ember.position.copy(stick.position)
      ember.position.y += 0.22
      burner.add(ember)
    }

    this.group.add(burner)
    this.colliders.push({ x: burner.position.x, z: burner.position.z, radius: 0.62 })
  }

  buildLanternString() {
    const poleMat = new MeshStandardMaterial({
      color: 0x32251c,
      roughness: 0.9,
    })
    this.materials.push(poleMat)

    const polePositions = [
      [this.half - 2.2, -10.5],
      [this.half - 2.2, 10.5],
    ]
    for (const [x, z] of polePositions) {
      const pole = new Mesh(new CylinderGeometry(0.07, 0.09, 3.6, 6), poleMat)
      pole.position.set(x, 1.8, z)
      pole.castShadow = true
      this.group.add(pole)
      this.colliders.push({ x, z, radius: 0.22 })
    }

    const wire = new Mesh(new CylinderGeometry(0.015, 0.015, 21, 4), poleMat)
    wire.position.set(this.half - 2.2, 3.45, 0)
    wire.rotation.x = Math.PI / 2
    this.group.add(wire)

    const smallLanternMat = this.lanternPaperMat
    const tasselMat = new MeshBasicMaterial({ color: 0x8e2f28 })
    this.materials.push(tasselMat)

    this.hangingLanterns = []
    for (let i = 0; i < 5; i += 1) {
      const z = -8.4 + i * 4.2
      const x = this.half - 2.2
      const group = new Group()
      group.position.set(x, 3.2, z)

      const cord = new Mesh(new CylinderGeometry(0.012, 0.012, 0.28, 4), poleMat)
      cord.position.y = 0.14
      group.add(cord)

      const lantern = new Mesh(new SphereGeometry(0.26, 12, 10), smallLanternMat)
      lantern.scale.set(1, 1.25, 1)
      lantern.castShadow = true
      group.add(lantern)

      const tassel = new Mesh(new CylinderGeometry(0.03, 0.01, 0.2, 6), tasselMat)
      tassel.position.y = -0.42
      group.add(tassel)

      this.group.add(group)
      this.hangingLanterns.push({ group, seed: i * 0.7 })
    }
  }

  update(delta, elapsed) {
    // Nyala lentera batu depan.
    for (const { light, seed } of this.stoneLanterns) {
      light.intensity = 5.2 + Math.sin(elapsed * 0.9 + seed) * 0.16
    }

    if (this.lanternPaperMat) {
      this.lanternPaperMat.emissiveIntensity = 0.54 + Math.sin(elapsed * 0.8) * 0.02
    }

    // Untaian lentera bergoyang sangat pelan.
    for (const { group, seed } of this.hangingLanterns ?? []) {
      group.rotation.z = Math.sin(elapsed * 0.9 + seed) * 0.035
      group.rotation.x = Math.cos(elapsed * 0.7 + seed) * 0.025
    }

    // Kelopak bergoyang lembut di ranting.
    if (this.charm) {
      this.charm.rotation.z = Math.sin(elapsed * 1.1) * 0.08
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
