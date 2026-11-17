const disposeMaterial = (material) => {
  if (!material) return
  for (const value of Object.values(material)) {
    if (value && value.isTexture) value.dispose()
  }
  material.dispose?.()
}

/** Membersihkan geometry, material, dan tekstur dari sebuah subtree. */
export function disposeObject3D(root) {
  root.traverse((object) => {
    object.geometry?.dispose?.()
    if (Array.isArray(object.material)) object.material.forEach(disposeMaterial)
    else disposeMaterial(object.material)
  })
}

/** Interpolasi eksponensial yang stabil terhadap variasi frame rate. */
export const damp = (current, target, lambda, delta) =>
  current + (target - current) * (1 - Math.exp(-lambda * delta))

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

/** Selisih sudut terpendek antara dua radian. */
export const shortestAngle = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from))
