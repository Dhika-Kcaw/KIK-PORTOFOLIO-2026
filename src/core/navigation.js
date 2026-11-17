/**
 * Navigasi grid + A* untuk karakter di museum datar.
 *
 * Lantai museum adalah bidang datar dengan penghalang berbentuk lingkaran
 * (meja, pilar, pohon, bingkai). Grid kecil 0,4 m dibangun sekali dari collider
 * statis, lalu A* mencari rute terpendek dengan gerak 8 arah. Hasilnya
 * dihaluskan (string pulling) supaya karakter tidak berjalan zig-zag mengikuti
 * kotak-kotak grid.
 */

const SQRT2 = Math.SQRT2

class MinHeap {
  constructor() {
    this.items = []
  }

  get size() {
    return this.items.length
  }

  push(item) {
    const items = this.items
    items.push(item)
    let index = items.length - 1
    while (index > 0) {
      const parent = (index - 1) >> 1
      if (items[parent].f <= items[index].f) break
      const swap = items[parent]
      items[parent] = items[index]
      items[index] = swap
      index = parent
    }
  }

  pop() {
    const items = this.items
    const top = items[0]
    const last = items.pop()
    if (items.length > 0) {
      items[0] = last
      let index = 0
      for (;;) {
        const left = index * 2 + 1
        const right = left + 1
        let smallest = index
        if (left < items.length && items[left].f < items[smallest].f) smallest = left
        if (right < items.length && items[right].f < items[smallest].f) smallest = right
        if (smallest === index) break
        const swap = items[index]
        items[index] = items[smallest]
        items[smallest] = swap
        index = smallest
      }
    }
    return top
  }
}

export class NavGrid {
  constructor({ bounds, cellSize = 0.4, agentRadius = 0.36, clearance = 0.06 }) {
    this.bounds = bounds
    this.cellSize = cellSize
    this.agentRadius = agentRadius
    this.clearance = clearance

    this.cols = Math.max(1, Math.ceil((bounds.maxX - bounds.minX) / cellSize))
    this.rows = Math.max(1, Math.ceil((bounds.maxZ - bounds.minZ) / cellSize))
    this.blocked = new Uint8Array(this.cols * this.rows)
    this.built = false
  }

  /** Bangun ulang peta penghalang dari daftar collider lingkaran. */
  build(colliders = []) {
    this.blocked.fill(0)
    const { minX, minZ } = this.bounds
    const reach = this.agentRadius + this.clearance

    for (const collider of colliders) {
      const radius = (collider.radius ?? 0) + reach
      const minCol = Math.max(0, Math.floor((collider.x - radius - minX) / this.cellSize))
      const maxCol = Math.min(this.cols - 1, Math.ceil((collider.x + radius - minX) / this.cellSize))
      const minRow = Math.max(0, Math.floor((collider.z - radius - minZ) / this.cellSize))
      const maxRow = Math.min(this.rows - 1, Math.ceil((collider.z + radius - minZ) / this.cellSize))
      const radiusSq = radius * radius

      for (let row = minRow; row <= maxRow; row += 1) {
        for (let col = minCol; col <= maxCol; col += 1) {
          const center = this.cellCenter(col, row)
          const dx = center.x - collider.x
          const dz = center.z - collider.z
          if (dx * dx + dz * dz <= radiusSq) this.blocked[row * this.cols + col] = 1
        }
      }
    }

    this.built = true
  }

  cellCenter(col, row) {
    return {
      x: this.bounds.minX + (col + 0.5) * this.cellSize,
      z: this.bounds.minZ + (row + 0.5) * this.cellSize,
    }
  }

  colOf(x) {
    return Math.floor((x - this.bounds.minX) / this.cellSize)
  }

  rowOf(z) {
    return Math.floor((z - this.bounds.minZ) / this.cellSize)
  }

  isWalkable(col, row) {
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return false
    return this.blocked[row * this.cols + col] === 0
  }

  isWalkablePoint(x, z) {
    return this.isWalkable(this.colOf(x), this.rowOf(z))
  }

  /** Sel walkable terdekat; dipakai bila titik awal/tujuan berada di sel terhalang. */
  nearestWalkable(x, z, maxRing = 5) {
    const col = this.colOf(x)
    const row = this.rowOf(z)
    if (this.isWalkable(col, row)) return { col, row }

    let best = null
    let bestDistance = Infinity
    for (let ring = 1; ring <= maxRing; ring += 1) {
      for (let dRow = -ring; dRow <= ring; dRow += 1) {
        for (let dCol = -ring; dCol <= ring; dCol += 1) {
          if (Math.max(Math.abs(dCol), Math.abs(dRow)) !== ring) continue
          const nextCol = col + dCol
          const nextRow = row + dRow
          if (!this.isWalkable(nextCol, nextRow)) continue
          const center = this.cellCenter(nextCol, nextRow)
          const distance = Math.hypot(center.x - x, center.z - z)
          if (distance < bestDistance) {
            bestDistance = distance
            best = { col: nextCol, row: nextRow }
          }
        }
      }
      if (best) return best
    }
    return null
  }

  /** Garis lurus bebas penghalang antar dua titik dunia. */
  hasLineOfSight(ax, az, bx, bz) {
    const distance = Math.hypot(bx - ax, bz - az)
    const steps = Math.max(1, Math.ceil(distance / (this.cellSize * 0.35)))
    for (let step = 0; step <= steps; step += 1) {
      const t = step / steps
      if (!this.isWalkablePoint(ax + (bx - ax) * t, az + (bz - az) * t)) return false
    }
    return true
  }

  /** Rapatkan waypoint: lompat ke titik terjauh yang masih terlihat. */
  smooth(points) {
    if (points.length <= 2) return points
    const result = [points[0]]
    let index = 0
    while (index < points.length - 1) {
      let next = points.length - 1
      while (
        next > index + 1 &&
        !this.hasLineOfSight(points[index].x, points[index].z, points[next].x, points[next].z)
      ) {
        next -= 1
      }
      result.push(points[next])
      index = next
    }
    return result
  }

  /**
   * Cari rute A* dari (startX, startZ) ke (goalX, goalZ).
   * Mengembalikan array {x, z} yang sudah dihaluskan (tanpa titik awal),
   * atau null bila tidak ada rute.
   */
  findPath(startX, startZ, goalX, goalZ, { maxNodes = 12000 } = {}) {
    if (!this.built) return null

    const start = this.nearestWalkable(startX, startZ)
    const goal = this.nearestWalkable(goalX, goalZ)
    if (!start || !goal) return null

    const { cols, rows, cellSize } = this
    const startIndex = start.row * cols + start.col
    const goalIndex = goal.row * cols + goal.col
    if (startIndex === goalIndex) {
      return [{ x: goalX, z: goalZ }]
    }

    const total = cols * rows
    const gScore = new Float32Array(total).fill(Infinity)
    const cameFrom = new Int32Array(total).fill(-1)
    const closed = new Uint8Array(total)
    const open = new MinHeap()

    const heuristic = (col, row) => {
      const dx = Math.abs(col - goal.col)
      const dz = Math.abs(row - goal.row)
      return (dx + dz + (SQRT2 - 2) * Math.min(dx, dz)) * cellSize
    }

    gScore[startIndex] = 0
    open.push({ index: startIndex, f: heuristic(start.col, start.row) })

    let visited = 0
    let found = false

    while (open.size > 0 && visited < maxNodes) {
      const current = open.pop()
      if (closed[current.index]) continue
      if (current.index === goalIndex) {
        found = true
        break
      }
      closed[current.index] = 1
      visited += 1

      const col = current.index % cols
      const row = (current.index - col) / cols
      const baseG = gScore[current.index]

      for (let dRow = -1; dRow <= 1; dRow += 1) {
        for (let dCol = -1; dCol <= 1; dCol += 1) {
          if (dCol === 0 && dRow === 0) continue
          const nextCol = col + dCol
          const nextRow = row + dRow
          if (!this.isWalkable(nextCol, nextRow)) continue
          // Jangan memotong sudut penghalang secara diagonal.
          if (
            dCol !== 0 &&
            dRow !== 0 &&
            (!this.isWalkable(col + dCol, row) || !this.isWalkable(col, row + dRow))
          ) {
            continue
          }

          const nextIndex = nextRow * cols + nextCol
          if (closed[nextIndex]) continue

          const stepCost = (dCol !== 0 && dRow !== 0 ? SQRT2 : 1) * cellSize
          const tentative = baseG + stepCost
          if (tentative >= gScore[nextIndex]) continue

          gScore[nextIndex] = tentative
          cameFrom[nextIndex] = current.index
          open.push({ index: nextIndex, f: tentative + heuristic(nextCol, nextRow) })
        }
      }
    }

    if (!found) return null

    const cells = []
    let cursor = goalIndex
    while (cursor !== -1) {
      const col = cursor % cols
      const row = (cursor - col) / cols
      cells.push(this.cellCenter(col, row))
      cursor = cameFrom[cursor]
    }
    cells.reverse()

    const path = this.smooth(cells)
    // Buang titik awal (karakter sudah di sana) lalu tutup dengan tujuan asli.
    path.shift()
    const last = path[path.length - 1]
    if (!last || Math.hypot(last.x - goalX, last.z - goalZ) > 0.01) {
      path.push({ x: goalX, z: goalZ })
    }
    return path
  }
}
