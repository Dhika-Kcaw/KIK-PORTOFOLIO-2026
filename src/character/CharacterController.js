import { Vector3 } from 'three'
import { clamp, shortestAngle } from '../core/math.js'

/**
 * Menggerakkan karakter di dunia.
 * Dua cara bergerak:
 *  - 'point': klik tanah → karakter berjalan ke titik tujuan.
 *  - 'keys':  W A S D relatif terhadap kamera.
 * Keduanya berbagi akselerasi, rotasi hadap, gravitasi, batas arena, dan
 * tumbukan lingkaran yang sama.
 */
export class CharacterController {
  constructor(character, config, world) {
    this.character = character
    this.config = config
    this.world = world

    this.position = new Vector3(config.spawn.x, 0, config.spawn.z)
    this.velocity = new Vector3()
    this.wish = new Vector3()
    this.destination = null
    this.destinationRun = false
    this.path = []
    this.pathIndex = 0
    this.repathCount = 0
    this.navGrid = world?.navGrid ?? null
    this.facing = null
    this.heading = config.spawn.heading
    this.speed = 0
    this.verticalVelocity = 0
    this.grounded = true
    this.paused = false
    this.airTime = 0
    this.stallTimer = 0
    this.events = []

    this.applyTransform()
  }

  setPaused(paused) {
    this.paused = paused
    if (paused) this.velocity.set(0, 0, 0)
  }

  teleportToSpawn() {
    this.position.set(this.config.spawn.x, 0, this.config.spawn.z)
    this.velocity.set(0, 0, 0)
    this.verticalVelocity = 0
    this.grounded = true
    this.airTime = 0
    this.events.length = 0
    this.destination = null
    this.path = []
    this.pathIndex = 0
    this.repathCount = 0
    this.facing = null
    this.heading = this.config.spawn.heading
    this.applyTransform()
  }

  /** Lompat bila sedang menapak tanah. */
  jump() {
    if (this.paused || !this.grounded) return false
    this.verticalVelocity = this.config.jumpSpeed
    this.grounded = false
    this.airTime = 0
    this.events.push('jump')
    return true
  }

  /** Ambil dan kosongkan antrean kejadian (jump/land/arrive) untuk suara & UI. */
  drainEvents() {
    if (this.events.length === 0) return []
    const events = this.events.slice()
    this.events.length = 0
    return events
  }

  /** Vektor fokus untuk kamera (sedikit di atas lantai). */
  getFocusPoint(target = new Vector3()) {
    return target.set(this.position.x, this.position.y, this.position.z)
  }

  /** Perintahkan karakter berjalan ke titik dunia. */
  moveTo(x, z, { run = false } = {}) {
    if (this.paused) return false
    const point = this.clampDestination(x, z)
    if (this.distanceTo(point.x, point.z) < this.config.arrivalRadius * 0.6) {
      this.destination = null
      this.path = []
      this.pathIndex = 0
      return false
    }
    this.destination = point
    this.destinationRun = Boolean(run)
    this.facing = null
    this.stallTimer = 0
    this.repathCount = 0
    this.buildPath()
    return true
  }

  /** Hitung ulang rute A* dari posisi sekarang ke tujuan. */
  buildPath() {
    if (!this.destination) {
      this.path = []
      this.pathIndex = 0
      return
    }

    const path = this.navGrid?.findPath(
      this.position.x,
      this.position.z,
      this.destination.x,
      this.destination.z,
    )
    // Tanpa rute (mis. tujuan terapit penghalang), kembali ke jalur lurus.
    this.path = path && path.length > 0
      ? path
      : [{ x: this.destination.x, z: this.destination.z }]
    this.pathIndex = 0
  }

  /** Waypoint berikutnya; waypoint yang sudah terlewati dilewati otomatis. */
  currentWaypoint() {
    const path = this.path
    const threshold = Math.max(0.3, this.config.arrivalRadius * 1.2)
    while (
      this.pathIndex < path.length - 1 &&
      Math.hypot(
        path[this.pathIndex].x - this.position.x,
        path[this.pathIndex].z - this.position.z,
      ) < threshold
    ) {
      this.pathIndex += 1
    }
    return path[this.pathIndex] ?? this.destination
  }

  cancelDestination() {
    this.destination = null
    this.destinationRun = false
    this.path = []
    this.pathIndex = 0
    this.stallTimer = 0
    this.repathCount = 0
  }

  /** Hadapkan karakter ke sebuah titik (dipakai saat mulai berdialog). */
  faceTowards(x, z) {
    this.facing = Math.atan2(x - this.position.x, z - this.position.z)
  }

  get isWalkingToPoint() {
    return this.destination !== null
  }

  clampDestination(x, z) {
    const bounds = this.config.bounds
    let px = clamp(x, bounds.minX, bounds.maxX)
    let pz = clamp(z, bounds.minZ, bounds.maxZ)

    // Jangan pernah menjadikan pusat collider sebagai tujuan.
    for (const collider of this.world?.colliders ?? []) {
      const dx = px - collider.x
      const dz = pz - collider.z
      const minDistance = collider.radius + this.config.bodyRadius + 0.08
      const distanceSq = dx * dx + dz * dz
      if (distanceSq >= minDistance * minDistance) continue
      const distance = Math.max(0.0001, Math.sqrt(distanceSq))
      const nx = distance < 0.001 ? 1 : dx / distance
      const nz = distance < 0.001 ? 0 : dz / distance
      px = collider.x + nx * minDistance
      pz = collider.z + nz * minDistance
    }

    return new Vector3(clamp(px, bounds.minX, bounds.maxX), 0, clamp(pz, bounds.minZ, bounds.maxZ))
  }

  update(delta, input, cameraYaw, mode = 'point') {
    const paused = this.paused
    const axis = paused ? { x: 0, z: 0 } : input.getAxis()
    const hasKeyInput = axis.x !== 0 || axis.z !== 0

    let running = false
    let hasIntent = false
    let destinationDistance = Infinity

    this.wish.set(0, 0, 0)

    if (!paused && hasKeyInput) {
      // WASD selalu memenangkan klik: batalkan tujuan lama.
      this.destination = null
      this.path = []
      this.pathIndex = 0
      this.facing = null

      const forwardX = -Math.sin(cameraYaw)
      const forwardZ = -Math.cos(cameraYaw)
      const rightX = Math.cos(cameraYaw)
      const rightZ = -Math.sin(cameraYaw)

      this.wish.set(
        forwardX * axis.z + rightX * axis.x,
        0,
        forwardZ * axis.z + rightZ * axis.x,
      )
      running = input.isRunning()
      hasIntent = true
    } else if (!paused && mode === 'point' && this.destination) {
      const finalDistance = this.distanceTo(this.destination.x, this.destination.z)

      if (finalDistance <= this.config.arrivalRadius) {
        this.destination = null
        this.path = []
        this.stallTimer = 0
        this.events.push('arrive')
      } else {
        // Maju ke waypoint A* terdekat; lewati waypoint yang sudah dilewati.
        const waypoint = this.currentWaypoint()
        const dx = waypoint.x - this.position.x
        const dz = waypoint.z - this.position.z
        destinationDistance = Math.hypot(dx, dz)

        if (destinationDistance > 0.0001) {
          this.wish.set(dx / destinationDistance, 0, dz / destinationDistance)
        }
        running = this.destinationRun
        hasIntent = true
      }
    }

    if (this.wish.lengthSq() > 1) this.wish.normalize()

    const targetSpeed = running ? this.config.runSpeed : this.config.walkSpeed
    let speedCap = targetSpeed
    if (this.destination) {
      // Perlambat saat mendekati tujuan akhir (bukan waypoint perantara).
      const remaining = this.distanceTo(this.destination.x, this.destination.z)
      speedCap = Math.min(targetSpeed, Math.max(0.5, remaining * 4))
    }

    const wishX = this.wish.x * speedCap
    const wishZ = this.wish.z * speedCap

    const lambda = hasIntent ? this.config.acceleration : this.config.deceleration
    const blend = 1 - Math.exp(-lambda * delta)
    this.velocity.x += (wishX - this.velocity.x) * blend
    this.velocity.z += (wishZ - this.velocity.z) * blend

    this.speed = Math.hypot(this.velocity.x, this.velocity.z)
    if (this.speed < 0.02) {
      this.velocity.set(0, 0, 0)
      this.speed = 0
    }

    this.position.x += this.velocity.x * delta
    this.position.z += this.velocity.z * delta

    this.resolveCollisions()
    this.clampToBounds()
    this.updateVertical(delta)

    // Deteksi macet: coba hitung ulang rute sekali-dua kali sebelum menyerah.
    if (this.destination && mode === 'point' && !hasKeyInput) {
      if (this.speed < 0.12) {
        this.stallTimer += delta
        if (this.stallTimer > 1.1) {
          this.stallTimer = 0
          if (this.navGrid && this.repathCount < 2) {
            this.repathCount += 1
            this.buildPath()
          } else {
            this.destination = null
            this.path = []
            this.events.push('arrive')
          }
        }
      } else {
        this.stallTimer = 0
      }
    }

    if (this.speed > 0.06) {
      const targetHeading = Math.atan2(this.velocity.x, this.velocity.z)
      this.turnTowards(targetHeading, delta)
    } else if (this.facing !== null) {
      this.turnTowards(this.facing, delta)
    }

    this.applyTransform()
  }

  turnTowards(targetHeading, delta) {
    const difference = shortestAngle(this.heading, targetHeading)
    this.heading += difference * Math.min(1, this.config.turnSpeed * delta)
  }

  /** Gravitasi sederhana: hanya aktif saat karakter sedang di udara. */
  updateVertical(delta) {
    if (this.grounded) return

    this.airTime += delta
    this.verticalVelocity -= this.config.gravity * delta
    this.position.y += this.verticalVelocity * delta

    if (this.position.y <= 0) {
      this.position.y = 0
      this.verticalVelocity = 0
      this.grounded = true
      this.events.push('land')
    }
  }

  resolveCollisions() {
    const colliders = this.world?.colliders ?? []
    for (const collider of colliders) {
      const dx = this.position.x - collider.x
      const dz = this.position.z - collider.z
      const minDistance = collider.radius + this.config.bodyRadius
      const distanceSq = dx * dx + dz * dz
      if (distanceSq >= minDistance * minDistance || distanceSq < 1e-6) continue

      const distance = Math.sqrt(distanceSq)
      this.position.x = collider.x + (dx / distance) * minDistance
      this.position.z = collider.z + (dz / distance) * minDistance

      // Buang komponen kecepatan yang mengarah ke dalam tabrakan.
      const nx = dx / distance
      const nz = dz / distance
      const inward = this.velocity.x * nx + this.velocity.z * nz
      if (inward < 0) {
        this.velocity.x -= inward * nx
        this.velocity.z -= inward * nz
      }
    }
  }

  clampToBounds() {
    const bounds = this.config.bounds
    if (bounds) {
      if (this.position.x < bounds.minX) {
        this.position.x = bounds.minX
        if (this.velocity.x < 0) this.velocity.x = 0
      } else if (this.position.x > bounds.maxX) {
        this.position.x = bounds.maxX
        if (this.velocity.x > 0) this.velocity.x = 0
      }

      if (this.position.z < bounds.minZ) {
        this.position.z = bounds.minZ
        if (this.velocity.z < 0) this.velocity.z = 0
      } else if (this.position.z > bounds.maxZ) {
        this.position.z = bounds.maxZ
        if (this.velocity.z > 0) this.velocity.z = 0
      }
      return
    }

    const radius = this.config.boundsRadius
    const distance = Math.hypot(this.position.x, this.position.z)
    if (distance <= radius) return
    this.position.x = (this.position.x / distance) * radius
    this.position.z = (this.position.z / distance) * radius

    const nx = this.position.x / radius
    const nz = this.position.z / radius
    const outward = this.velocity.x * nx + this.velocity.z * nz
    if (outward > 0) {
      this.velocity.x -= outward * nx
      this.velocity.z -= outward * nz
    }
  }

  applyTransform() {
    this.character.object.position.copy(this.position)
    this.character.object.rotation.y = this.heading
  }

  /** Jarak horizontal ke sebuah titik. */
  distanceTo(x, z) {
    return Math.hypot(this.position.x - x, this.position.z - z)
  }
}
