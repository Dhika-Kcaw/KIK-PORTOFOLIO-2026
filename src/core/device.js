/**
 * Deteksi perangkat untuk museum.
 *
 * Di ponsel/tablet hanya ada satu cara bergerak: **klik/ketuk**. Media query
 * dipakai (bukan `navigator.userAgent`) karena ikut berubah saat layar diputar
 * atau penunjuk diganti, dan laptop layar sentuh tetap terhitung desktop.
 */

const COARSE_POINTER = '(pointer: coarse)'
const NO_HOVER = '(hover: none)'

function matches(query) {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.(query)?.matches ?? false
}

/** True di ponsel/tablet: kontrol dikunci ke mode klik (ketuk). */
export function isTouchDevice() {
  if (typeof window === 'undefined') return false
  return matches(COARSE_POINTER) && matches(NO_HOVER)
}

/** True di layar sempit: HUD, panel, dan panduan memakai tata letak ringkas. */
export function isCompactScreen(maxWidth = 720) {
  return matches(`(max-width: ${maxWidth}px)`)
}
