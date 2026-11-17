import { Color, FogExp2, Group } from 'three'
import { NavGrid } from '../core/navigation.js'
import { Exhibits } from './Exhibits.js'
import { Lighting } from './Lighting.js'
import { Museum } from './Museum.js'
import { MoveMarker } from './MoveMarker.js'
import { PetalField } from './Particles.js'
import { Props } from './Props.js'

/**
 * Dunia museum Wangsheng.
 * Bangunan dan dekorasi statis ada di Museum, perabot dan hiasan pengisi ruang
 * ada di Props, sedangkan koleksi yang bergantung pada database ada di Exhibits.
 */
export class World {
  constructor(scene, config, data) {
    this.scene = scene
    this.config = config
    this.data = data
    this.group = new Group()
    this.group.name = 'world'
    scene.add(this.group)

    scene.background = new Color(0x15100c)
    scene.fog = new FogExp2(0x1a130f, 0.011)

    this.lighting = new Lighting(config)
    this.group.add(this.lighting.group)

    this.museum = new Museum(config)
    this.group.add(this.museum.group)

    this.props = new Props(config.world?.platformHalf ?? 18)
    this.group.add(this.props.group)

    this.exhibits = new Exhibits(data)
    this.group.add(this.exhibits.group)

    this.petals = new PetalField({ count: 150, halfX: 19, halfZ: 19, height: 8 })
    this.group.add(this.petals.object)

    this.marker = new MoveMarker()
    this.group.add(this.marker.group)

    // Peta navigasi hanya memakai penghalang statis; pengunjung yang berjalan
    // ditangani oleh tumbukan lingkaran saat karakter melewatinya.
    this.navGrid = new NavGrid({
      bounds: config.character.bounds,
      cellSize: 0.4,
      agentRadius: config.character.bodyRadius,
    })
    this.navGrid.build(this.staticColliders)
  }

  get colliders() {
    return [...this.museum.colliders, ...this.props.colliders, ...this.exhibits.colliders]
  }

  get staticColliders() {
    return [
      ...this.museum.colliders,
      ...this.props.colliders,
      ...this.exhibits.items.flatMap((item) => {
        // Pengunjung berjalan, jadi penghalangnya tidak masuk peta statis.
        if (item.kind === 'visitor') return []
        const list = item.collider ? [item.collider] : []
        if (Array.isArray(item.colliders)) list.push(...item.colliders)
        return list
      }),
    ]
  }

  get interactables() {
    return this.exhibits.targets
  }

  getStation(id) {
    return this.exhibits.getById(id)
  }

  /** Paku kertas testimoni baru di papan tempel (umpan balik langsung di 3D). */
  postBoardNote(testimonial) {
    return this.exhibits.postBoardNote(testimonial)
  }

  findNearestStation(x, z, maxDistance) {
    return this.exhibits.findNearest(x, z, maxDistance)
  }

  setActiveStation(id) {
    this.exhibits.setActive(id)
  }

  showMarker(x, z) {
    this.marker.show(x, z)
  }

  hideMarker() {
    this.marker.hide()
  }

  update(delta, elapsed, playerPos = null, cameraPos = null) {
    this.lighting.update(delta, elapsed, cameraPos)
    this.museum.update(delta, elapsed, cameraPos)
    this.props.update(delta, elapsed)
    this.exhibits.update(delta, elapsed, playerPos)
    this.petals.update(delta, elapsed)
    this.marker.update(delta, elapsed)
  }

  dispose() {
    this.exhibits.dispose()
    this.museum.dispose()
    this.props.dispose()
    this.petals.dispose()
    this.marker.dispose()
    this.lighting.group.clear()
    this.group.clear()
    this.scene.remove(this.group)
    this.scene.fog = null
    this.scene.background = null
  }
}
