// Batas waktu setiap permintaan: kalau API menggantung (server mati, proxy
// setengah jalan), dashboard harus menampilkan galat yang jelas, bukan berputar
// selamanya di layar "Membuka arsip".
const TIMEOUT_MS = 12_000

// Unggah bundel model bisa puluhan MB (PMX + tekstur), jadi diberi waktu jauh
// lebih longgar daripada permintaan JSON biasa.
const UPLOAD_TIMEOUT_MS = 180_000

function timeoutSignal(ms = TIMEOUT_MS) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms)
  }
  return undefined
}

function timeoutError(ms = TIMEOUT_MS) {
  const error = new Error(
    `Server tidak menjawab dalam ${Math.round(ms / 1000)} detik. Pastikan API berjalan (bun run dev) lalu muat ulang.`,
  )
  error.status = 0
  return error
}

async function request(path, options) {
  try {
    return await fetch(path, options)
  } catch (error) {
    if (error?.name === 'AbortError' || error?.name === 'TimeoutError') throw timeoutError()
    throw new Error(
      'Tidak bisa menghubungi server. Periksa koneksi dan terminal `bun run dev`.',
    )
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  const response = await request(path, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: timeoutSignal(),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.error || `Permintaan gagal (${response.status}).`)
    error.status = response.status
    throw error
  }
  return data
}

export async function uploadFile(file) {
  const form = new FormData()
  form.append('file', file)
  const response = await request('/api/admin/uploads', {
    method: 'POST',
    credentials: 'same-origin',
    body: form,
    signal: timeoutSignal(),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.error || 'Upload gagal.')
    error.status = response.status
    throw error
  }
  return data
}

/**
 * Unggah bundel model karakter: PMX + seluruh teksturnya.
 *
 * `paths` berisi jalur relatif dengan urutan yang sama seperti `files`, karena
 * PMX merujuk tekstur lewat jalur relatif (mis. `tex/face.png`) dan server
 * harus menulis berkasnya ke subfolder yang sama.
 */
export async function uploadModel({ name, files, paths }) {
  const form = new FormData()
  form.append('name', name)
  form.append('paths', JSON.stringify(paths))
  for (const file of files) form.append('files', file)

  let response
  try {
    response = await fetch('/api/admin/models/upload', {
      method: 'POST',
      credentials: 'same-origin',
      body: form,
      signal: timeoutSignal(UPLOAD_TIMEOUT_MS),
    })
  } catch (error) {
    if (error?.name === 'AbortError' || error?.name === 'TimeoutError') {
      throw timeoutError(UPLOAD_TIMEOUT_MS)
    }
    throw new Error('Unggahan terputus. Periksa koneksi lalu coba lagi.')
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.error || `Unggah model gagal (${response.status}).`)
    error.status = response.status
    throw error
  }
  return data
}
