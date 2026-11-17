import { Group } from 'three'
import {
  GAME_TABLE,
  PHYSICAL_SECTIONS,
  SECTIONS,
  TESTIMONIAL_BOARD,
  VISITOR_SLOTS,
  projectSlotsFor,
} from '../content/museum.js'
import { GameTable } from './GameTable.js'
import { InfoStation } from './InfoStation.js'
import { PinBoard } from './PinBoard.js'
import { ProjectFrame } from './ProjectFrame.js'
import { Visitor } from './Visitor.js'

/**
 * Koleksi museum yang dibangun dari data API.
 * Semua proyek mendapat bingkai di dunia 3D: `projectSlotsFor()` selalu
 * menghasilkan satu slot per proyek (bingkai mengecil, dinding barat ikut
 * dipakai, lalu baris kedua) sehingga tidak ada karya yang hanya tampil di
 * panel 2D. Pengunjung tetap memakai slot terbatas karena mereka berjalan di
 * zona sendiri; testimoni selebihnya tersedia di panel Testimoni.
 *
 * Papan tempel (`PinBoard`) ikut menjadi koleksi: ia tampil di museum sebagai
 * benda fisik dengan kertas-kertas yang sudah disetujui admin, dan menjadi
 * tempat pengunjung menulis testimoni baru.
 */
export class Exhibits {
  constructor(data) {
    this.group = new Group()
    this.group.name = 'exhibits'
    this.data = data
    this.items = []
    this.projectFrames = []
    this.visitors = []

    for (const key of PHYSICAL_SECTIONS) {
      const station = new InfoStation(key, SECTIONS[key], data)
      this.items.push(station)
      this.group.add(station.group)
    }

    // Papan tempel testimoni: benda fisik tempat pengunjung menulis testimoni
    // sendiri. Kertas yang dipaku adalah testimoni yang sudah disetujui admin.
    const approvedTestimonials = Array.isArray(data.testimonials) ? data.testimonials : []
    this.pinBoard = new PinBoard(approvedTestimonials, TESTIMONIAL_BOARD)
    this.items.push(this.pinBoard)
    this.group.add(this.pinBoard.group)

    // Meja judi di sela timur-selatan: bagian “Kedai Kartu”.
    this.buildGameTable()

    const projects = Array.isArray(data.projects) ? data.projects : []
    const projectSlots = projectSlotsFor(projects.length)
    projects.forEach((project, index) => {
      const slot = projectSlots[index]
      if (!slot) {
        console.warn(`[museum] tidak ada slot bingkai untuk proyek ${project.id}`)
        return
      }
      const frame = new ProjectFrame(project, slot, index)
      this.items.push(frame)
      this.projectFrames.push(frame)
      this.group.add(frame.group)
    })

    const testimonials = approvedTestimonials
    testimonials.slice(0, VISITOR_SLOTS.length).forEach((testimonial, index) => {
      const visitor = new Visitor(testimonial, VISITOR_SLOTS[index])
      this.items.push(visitor)
      this.visitors.push(visitor)
      this.group.add(visitor.group)
    })
  }

  /** Paku kertas testimoni baru di papan setelah pengunjung mengirimnya. */
  postBoardNote(testimonial) {
    return this.pinBoard?.addNote(testimonial, { pending: true, animate: true }) ?? null
  }

  /** Meja judi “Kedai Kartu”: benda fisik, bukan panel melayang. */
  buildGameTable() {
    if (this.gameTable) return this.gameTable
    this.gameTable = new GameTable(GAME_TABLE)
    this.items.push(this.gameTable)
    this.group.add(this.gameTable.group)
    return this.gameTable
  }

  get colliders() {
    const list = []
    for (const exhibit of this.items) {
      if (exhibit.collider) list.push(exhibit.collider)
      // Beberapa benda (meja judi) menambahkan penghalang tambahan untuk
      // bangku atau tiang lampunya sendiri.
      if (Array.isArray(exhibit.colliders)) list.push(...exhibit.colliders)
    }
    return list
  }

  get targets() {
    return this.items.map((exhibit) => exhibit.group)
  }

  getById(id) {
    return this.items.find((exhibit) => exhibit.id === id) ?? null
  }

  findNearest(x, z, maxDistance) {
    let nearest = null
    let best = maxDistance
    for (const exhibit of this.items) {
      const anchor = exhibit.anchor ?? exhibit.interaction
      const distance = Math.hypot(anchor.x - x, anchor.z - z)
      // Tiap koleksi punya radius interaksinya sendiri: meja harus benar-benar
      // didekati, pengunjung boleh dari jarak percakapan yang wajar, dan bingkai
      // baris atas dijangkau dengan melangkah mundur dari dinding.
      const limit = exhibit.interactRadius ?? maxDistance
      if (distance <= limit && distance < best) {
        best = distance
        nearest = exhibit
      }
    }
    return nearest
  }

  setActive(id) {
    for (const exhibit of this.items) exhibit.setActive(exhibit.id === id)
  }

  update(delta, elapsed, playerPos = null) {
    for (const exhibit of this.items) exhibit.update(delta, elapsed, playerPos)
  }

  dispose() {
    for (const exhibit of this.items) exhibit.dispose()
    this.items = []
    this.projectFrames = []
    this.visitors = []
    this.gameTable = null
    this.group.clear()
  }
}
