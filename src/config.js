/**
 * Pusat konfigurasi aplikasi.
 * Ubah nilai di sini untuk menyetel rasa (feel) dari diorama isometrik.
 */
export const CONFIG = Object.freeze({
  assets: {
    /**
     * Model karakter bawaan, dipakai sebagai cadangan bila database belum punya
     * model aktif. Berkas PMX tidak ikut repositori (`public/models/` diabaikan
     * git), jadi pada salinan baru jalur ini biasanya kosong.
     *
     * Museum TIDAK berjalan tanpa karakter: bila berkas ini tidak ada dan
     * database juga tidak punya model aktif, layar pemuatan menampilkan pesan
     * bahwa museum tidak bisa dijalankan karena tidak ada model (lihat
     * `PortfolioApp.init()`).
     */
    model: '/models/karakter/karakter.pmx',
    motions: {
      idle: '/motions/idle.vmd',
      walk: '/motions/walk.vmd',
      run: '/motions/run.vmd',
    },
  },

  renderer: {
    maxPixelRatio: 2,
    exposure: 1.12,
    shadowMapSize: 2048,
  },

  /**
   * Kamera diorama: lensa perspektif dengan sudut isometrik tetap.
   * Tidak ada orbit bebas — hanya zoom dan bingkai dialog.
   */
  camera: {
    fov: 32,
    /**
     * Sudut pandang saat duduk di meja judi. Isometrik 32° terlalu sempit untuk
     * pandangan mata: kartu pemain dan sosok bandar tidak akan masuk layar
     * bersama-sama. 60° cukup lebar untuk keduanya tanpa membuat meja melengkung.
     */
    seatFov: 60,
    near: 0.1,
    far: 220,
    yaw: Math.PI / 4,
    /** ~33°, dekat dengan sudut isometrik klasik (35,26°). */
    pitch: 0.58,
    distance: 18,
    minDistance: 10,
    maxDistance: 28,
    height: 0.95,
    zoomSensitivity: 0.014,
    followSmoothing: 7,
    positionSmoothing: 9,
    /** Karakter boleh bergerak sejauh ini dari pusat layar sebelum kamera ikut. */
    deadzone: 1.4,
    /**
     * Rotasi diorama bertahap: seret kanan memutar 15° per langkah, penuh
     * 360°. Tidak ada orbit bebas — kamera hanya berpindah antar-langkah,
     * dengan kemiringan isometrik yang tetap.
     */
    rotationStep: Math.PI / 12,
    rotationSmoothing: 9,
    /** Saat panel terbuka: kamera maju dan bergeser ke titik tengah. */
    dialogDistanceScale: 0.78,
    dialogBias: 0.3,
    bounds: { minX: -28, maxX: 28, minZ: -28, maxZ: 28, maxY: 36 },
  },

  controls: {
    /** 'point' = klik tanah, 'keys' = WASD. Bisa diganti kapan saja. */
    defaultMode: 'point',
  },

  character: {
    scale: 0.08,
    bodyRadius: 0.36,
    walkSpeed: 1.35,
    runSpeed: 3.35,
    acceleration: 14,
    deceleration: 18,
    turnSpeed: 12,
    jumpSpeed: 4.6,
    gravity: 14,
    /** Jarak henti saat mengikuti titik klik. */
    arrivalRadius: 0.24,
    /** Klik sejauh ini otomatis berlari. */
    autoRunDistance: 8,
    // Batas area museum (di dalam kolom dan dinding).
    bounds: { minX: -16, maxX: 16, minZ: -16, maxZ: 16 },
    // Berdiri dekat pintu masuk, menghadap kamera diorama (yaw kamera π/4).
    spawn: { x: 0, z: 14.2, heading: Math.PI / 4 },
  },

  animation: {
    /** Perkiraan kecepatan dunia dari siklus animasi (meter/detik). */
    walkClipSpeed: 1.0,
    runClipSpeed: 2.6,
    weightSmoothing: 10,
    /** Batas atas pemutaran klip lari agar langkah tidak terlihat terlalu cepat. */
    runTimeScaleMax: 1.9,
    jump: {
      /** Kecepatan transisi pose lompat masuk/keluar. */
      blendSpeed: 16,
      /** Durasi pose lompat dalam detik (dipetakan dari waktu di udara). */
      duration: 1,
    },
    idleFlair: {
      after: 5.5,
      duration: 3.4,
    },
  },

  world: {
    /**
     * Jarak interaksi cadangan. Tiap koleksi punya radius sendiri (meja 1.45,
     * bingkai 1.8 — 3.35 untuk bingkai baris atas, pengunjung 1.15) agar harus
     * benar-benar mendekat sebelum panel/dialog terbuka; nilai ini dipakai bila
     * sebuah koleksi tidak menentukan radiusnya.
     */
    interactDistance: 1.8,
    /** Setengah ukuran pelat museum. */
    platformHalf: 18,
  },

  audio: {
    masterVolume: 0.6,
    footstepVolume: 0.3,
    blipVolume: 0.2,
  },

  physics: {
    enabled: true,
    /**
     * Mesin fisika untuk rambut, kain, dan lengan baju:
     *  - 'ammo'   — Bullet/Ammo.js (@moeru/three-mmd-physics-ammo). Rigid body
     *               + constraint, jadi kain dan rambut jatuh serta menabrak
     *               tubuh seperti di MMD.
     *  - 'spring' — spring bone bawaan (@moeru/three-mmd-physics-springbone),
     *               ringan tapi hanya pegas, tanpa tabrakan.
     * Ammo otomatis mundur ke spring bila paketnya belum terpasang.
     */
    engine: 'ammo',
  },
})
