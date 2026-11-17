/**
 * Ketinggian (y) semua hiasan datar yang menempel di lantai museum.
 *
 * Semua bidang datar yang berimpit harus punya tinggi berbeda. Dua bidang di
 * y yang sama (atau berselisih kurang dari presisi depth buffer) akan saling
 * berebut kedalaman dan berkedip saat kamera berputar — inilah yang dulu
 * terjadi pada bayangan kontak pengunjung (y 0,012) yang berimpit dengan pelat
 * plaza pohon (y 0,012).
 *
 * Urutan dari bawah ke atas:
 *   lantai (0) → pelat plaza → tepi plaza → cincin tinta pohon →
 *   cincin penanda meja/bingkai/papan → bayangan kontak → penanda tujuan.
 *
 * Jarak antar-lapisan ≥ 6 mm, jauh di atas presisi depth buffer pada jarak
 * kamera isometrik (±18 m), jadi tidak ada lagi permukaan yang berkedip.
 */
export const GROUND_LAYER = {
  plaza: 0.006,
  plazaEdge: 0.01,
  inkRing: 0.014,
  stationRing: 0.02,
  contactShadow: 0.028,
  marker: 0.034,
}

/**
 * Opsi material untuk hiasan datar transparan.
 *
 * `polygonOffset` negatif menarik fragmen sedikit ke arah kamera sehingga
 * lapisan atas selalu menang atas lapisan di bawahnya, walau tingginya
 * kebetulan berdekatan.
 */
export const DECAL_TUNING = {
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2,
}
