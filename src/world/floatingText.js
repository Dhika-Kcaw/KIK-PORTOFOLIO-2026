/**
 * Utilitas label melayang (sprite) di dunia 3D.
 *
 * Label nama hanya terlihat jelas saat pemain mendekat, sehingga museum tidak
 * dipenuhi teks dari kejauhan. Prompt interaksi tetap dikendalikan oleh state
 * aktif masing-masing koleksi.
 */

/** 1 saat dekat, turun halus ke 0 saat jauh. */
export function distanceVisibility(playerPos, x, z, near, far) {
  if (!playerPos) return 1
  const distance = Math.hypot(playerPos.x - x, playerPos.z - z)
  if (distance <= near) return 1
  if (distance >= far) return 0
  const t = 1 - (distance - near) / (far - near)
  return t * t * (3 - 2 * t)
}

/** Terapkan opacity dan sembunyikan sprite saat benar-benar tak terlihat. */
export function applySpriteFade(sprite, opacity) {
  if (!sprite?.material) return
  const value = Math.max(0, Math.min(1, opacity))
  sprite.material.opacity = value
  sprite.visible = value > 0.02
}
