import { randomUUID } from 'node:crypto'
import { mkdirSync, rmSync } from 'node:fs'
import { dirname, extname, join, resolve, sep } from 'node:path'
import { requireAdmin } from '../auth.js'
import { HttpError } from '../http.js'
import { insertRow } from '../db/index.js'

const MAX_BYTES = 6 * 1024 * 1024
const TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
  'application/pdf': '.pdf',
}

export const UPLOAD_DIR = join(import.meta.dir, '..', '..', 'data', 'uploads')

/** Folder bundel model: `data/uploads/models/<slug>/`. */
export const MODEL_DIR = join(UPLOAD_DIR, 'models')

const MODEL_EXTS = new Set(['.pmx', '.pmd'])
const MAX_MODEL_FILES = 320
const MAX_MODEL_BYTES = 96 * 1024 * 1024

const slugify = (value) =>
  String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)

/**
 * Ubah satu jalur relatif kiriman browser menjadi jalur aman di dalam folder
 * model. Mengembalikan `null` untuk jalur yang keluar folder (`..`), kosong,
 * atau tersembunyi (`.DS_Store`).
 */
function safeRelativePath(value) {
  const normalized = String(value || '')
    .replace(/\\/g, '/')
    .replace(/^(\.\/)+/, '')
    .replace(/^\/+/, '')
  if (!normalized.trim()) return null
  const parts = normalized.split('/').filter((part) => part && part !== '.')
  if (parts.length === 0) return null
  if (parts.some((part) => part === '..' || part.startsWith('.'))) return null
  return parts.join('/')
}

/** Hapus folder bundel sebuah model (dipakai saat baris model dihapus). */
export function removeModelFolder(slug) {
  const safe = slugify(slug)
  if (!safe) return
  try {
    rmSync(join(MODEL_DIR, safe), { recursive: true, force: true })
  } catch (error) {
    console.warn(`[Uploads] Folder model ${safe} gagal dihapus.`, error)
  }
}

/**
 * Unggah satu bundel model: berkas `.pmx` beserta seluruh teksturnya.
 *
 * PMX menyimpan jalur tekstur secara **relatif** terhadap berkas PMX-nya, jadi
 * unggahan harus mempertahankan struktur folder (mis. `tex/face.png`). Klien
 * mengirim `paths` berisi jalur relatif dengan urutan sama seperti `files`.
 *
 * Respons sekaligus membuat baris `models` (belum aktif) supaya dashboard bisa
 * langsung menampilkannya dan admin tinggal menekan "Pakai".
 */
export async function uploadModelBundle(db, request) {
  await requireAdmin(db, request)
  const type = request.headers.get('content-type') || ''
  if (!type.includes('multipart/form-data')) {
    throw new HttpError(415, 'Gunakan multipart/form-data.')
  }

  const form = await request.formData()
  const name = String(form.get('name') ?? '').trim()
  if (name.length < 2 || name.length > 120) {
    throw new HttpError(400, 'Nama model harus 2–120 karakter.')
  }

  const files = form.getAll('files').filter((entry) => entry instanceof File)
  if (files.length === 0) throw new HttpError(400, 'Tidak ada berkas model yang dikirim.')
  if (files.length > MAX_MODEL_FILES) {
    throw new HttpError(413, `Maksimal ${MAX_MODEL_FILES} berkas per model.`)
  }

  let paths = []
  try {
    const parsed = JSON.parse(String(form.get('paths') ?? '[]'))
    if (Array.isArray(parsed)) paths = parsed
  } catch {
    // Jalur tidak terbaca: pakai nama berkas dari browser.
  }

  const total = files.reduce((sum, file) => sum + (Number(file.size) || 0), 0)
  if (total > MAX_MODEL_BYTES) {
    throw new HttpError(413, 'Ukuran total model maksimal 96 MB.')
  }

  const slug = `${slugify(name) || 'model'}-${randomUUID().slice(0, 6)}`
  const folder = join(MODEL_DIR, slug)
  const cleanup = () => {
    try {
      rmSync(folder, { recursive: true, force: true })
    } catch {
      // Folder sementara; kegagalan menghapus tidak boleh menutupi galat asli.
    }
  }

  mkdirSync(folder, { recursive: true })

  let entry = null
  let written = 0

  for (const [index, file] of files.entries()) {
    const relative = safeRelativePath(paths[index] ?? file.name)
    if (!relative) continue

    const target = resolve(folder, relative)
    if (!target.startsWith(folder + sep)) continue

    mkdirSync(dirname(target), { recursive: true })
    await Bun.write(target, file)
    written += 1

    const extension = extname(relative).toLowerCase()
    if (!entry && MODEL_EXTS.has(extension)) entry = relative
  }

  if (!entry) {
    cleanup()
    throw new HttpError(400, 'Tidak ada berkas .pmx di dalam unggahan. Pilih folder model, bukan hanya teksturnya.')
  }

  const urlPath = entry.split('/').map((part) => encodeURIComponent(part)).join('/')
  const pmxUrl = `/uploads/models/${slug}/${urlPath}`
  const createdAt = new Date().toISOString()

  const id = await insertRow(db, 'models', {
    name,
    slug,
    pmx_url: pmxUrl,
    preview_url: '',
    scale: 0.08,
    note: '',
    active: 0,
    created_at: createdAt,
  })

  return {
    id,
    name,
    slug,
    pmx_url: pmxUrl,
    files: written,
    skipped: files.length - written,
    size: total,
    created_at: createdAt,
  }
}

export async function uploadFile(db, request) {
  await requireAdmin(db, request)
  const type = request.headers.get('content-type') || ''
  if (!type.includes('multipart/form-data')) {
    throw new HttpError(415, 'Gunakan multipart/form-data.')
  }

  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) throw new HttpError(400, 'Berkas tidak ditemukan.')

  const extension = TYPES[file.type]
  if (!extension) {
    throw new HttpError(415, 'Hanya gambar JPG, PNG, WebP, GIF, AVIF, atau PDF.')
  }
  if (file.size > MAX_BYTES) throw new HttpError(413, 'Ukuran berkas maksimal 6 MB.')

  mkdirSync(UPLOAD_DIR, { recursive: true })
  const filename = `${Date.now()}-${randomUUID().slice(0, 8)}${extension}`
  const path = resolve(UPLOAD_DIR, filename)
  await Bun.write(path, file)

  return {
    url: `/uploads/${filename}`,
    name: file.name,
    size: file.size,
    type: file.type,
  }
}
