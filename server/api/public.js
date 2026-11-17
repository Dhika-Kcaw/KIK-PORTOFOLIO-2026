import { HttpError, json, readJson } from '../http.js'
import { TESTIMONIAL_TYPES } from '../../shared/content-schema.js'
import {
  serializeCertificate,
  serializeExperience,
  serializeFeedback,
  serializePost,
  serializeProfile,
  serializeProject,
  serializeSkill,
  serializeTestimonial,
} from './serialize.js'

// Pembatas laju bersama untuk semua kiriman publik (kontak, testimoni, umpan
// balik proyek). Buku tamu sudah dihapus, jadi namanya tidak lagi menyebut
// guestbook.
const rateWindow = new Map()
const WINDOW_MS = 10 * 60_000
const MAX_PER_WINDOW = 5

const TESTIMONIAL_TYPE_VALUES = new Set(TESTIMONIAL_TYPES.map((item) => item.value))

const rateLimit = (request) => {
  const key =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('cf-connecting-ip') ||
    'local'
  const now = Date.now()
  const entry = rateWindow.get(key) ?? { count: 0, resetAt: now + WINDOW_MS }
  if (now > entry.resetAt) {
    entry.count = 0
    entry.resetAt = now + WINDOW_MS
  }
  entry.count += 1
  rateWindow.set(key, entry)
  if (rateWindow.size > 500) {
    for (const [storedKey, stored] of rateWindow) {
      if (now > stored.resetAt) rateWindow.delete(storedKey)
    }
  }
  if (entry.count > MAX_PER_WINDOW) {
    throw new HttpError(429, 'Terlalu banyak pesan. Coba lagi beberapa menit lagi.')
  }
}

export async function getPortfolio(db) {
  const [
    profile,
    skills,
    projects,
    certificates,
    experiences,
    testimonials,
    feedback,
    posts,
    activeModel,
  ] = await Promise.all([
    db.get('SELECT * FROM profile WHERE id = 1'),
    db.all('SELECT * FROM skills ORDER BY sort_order ASC, id ASC'),
    db.all('SELECT * FROM projects WHERE published = 1 ORDER BY sort_order ASC, id DESC'),
    db.all('SELECT * FROM certificates ORDER BY sort_order ASC, year DESC, id DESC'),
    db.all('SELECT * FROM experiences ORDER BY sort_order ASC, id DESC'),
    db.all(
      `SELECT t.*, p.title AS project_title
       FROM testimonials t
       LEFT JOIN projects p ON p.id = t.project_id
       WHERE t.approved = 1
       ORDER BY t.sort_order ASC, t.id DESC`,
    ),
    db.all(
      `SELECT f.*, p.title AS project_title
       FROM project_feedback f
       LEFT JOIN projects p ON p.id = f.project_id
       WHERE f.approved = 1
       ORDER BY f.created_at DESC, f.id DESC`,
    ),
    db.all(
      `SELECT * FROM posts WHERE status = 'published'
       ORDER BY published_at DESC, sort_order ASC, id DESC`,
    ),
    db.get(
      `SELECT name, pmx_url, scale FROM models
       WHERE active = 1 AND pmx_url <> ''
       ORDER BY id DESC LIMIT 1`,
    ),
  ])

  return {
    profile: serializeProfile(profile),
    /**
     * Model karakter yang dipilih admin. `null` = museum memakai model bawaan
     * di `CONFIG.assets.model`, jadi museum tetap bisa dibuka walau belum ada
     * satu pun model yang diunggah.
     */
    character: activeModel
      ? {
          name: activeModel.name,
          model_url: activeModel.pmx_url,
          scale: Number(activeModel.scale) > 0 ? Number(activeModel.scale) : null,
        }
      : null,
    skills: skills.map(serializeSkill),
    projects: projects.map(serializeProject),
    certificates: certificates.map(serializeCertificate),
    experiences: experiences.map(serializeExperience),
    testimonials: testimonials.map(serializeTestimonial),
    /** Umpan balik per proyek yang sudah disetujui admin. */
    feedback: feedback.map(serializeFeedback),
    posts: posts.map(serializePost),
    generatedAt: new Date().toISOString(),
  }
}

export async function postMessage(db, request) {
  rateLimit(request)
  const body = await readJson(request)
  const name = String(body.name ?? '').trim()
  const message = String(body.message ?? '').trim()
  const email = String(body.email ?? '').trim()
  const subject = String(body.subject ?? '').trim()

  if (name.length < 2 || name.length > 80) {
    throw new HttpError(400, 'Nama harus 2–80 karakter.')
  }
  if (message.length < 5 || message.length > 2000) {
    throw new HttpError(400, 'Pesan harus 5–2000 karakter.')
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, 'Format email tidak valid.')
  }

  await db.run(
    `INSERT INTO messages (name, email, subject, message, type, approved, created_at, read_at)
     VALUES (?, ?, ?, ?, ?, 0, ?, NULL)`,
    [name, email, subject.slice(0, 160), message, 'contact', new Date().toISOString()],
  )

  return {
    ok: true,
    message: 'Pesan terkirim. Terima kasih sudah menghubungi.',
  }
}

/**
 * Testimoni dari pengunjung museum.
 *
 * Selalu masuk dengan `approved = 0`: pengunjung boleh menulis, tetapi yang
 * menentukan tampil atau tidak adalah admin lewat dashboard. Baris yang belum
 * disetujui tidak pernah ikut `GET /api/portfolio`, jadi tidak muncul di panel
 * Testimoni maupun sebagai NPC pengunjung di museum 3D.
 */
export async function postTestimonial(db, request) {
  rateLimit(request)
  const body = await readJson(request)
  const name = String(body.name ?? '').trim()
  const quote = String(body.quote ?? '').trim()
  const role = String(body.role ?? '').trim().slice(0, 120)
  const organization = String(body.organization ?? '').trim().slice(0, 120)
  const type = TESTIMONIAL_TYPE_VALUES.has(body.type) ? body.type : 'friend'

  if (name.length < 2 || name.length > 80) {
    throw new HttpError(400, 'Nama harus 2–80 karakter.')
  }
  if (quote.length < 10 || quote.length > 800) {
    throw new HttpError(400, 'Testimoni harus 10–800 karakter.')
  }

  await db.run(
    `INSERT INTO testimonials
       (name, role, type, organization, quote, avatar_url, project_id, approved, sort_order)
     VALUES (?, ?, ?, ?, ?, '', NULL, 0, 0)`,
    [name, role, type, organization, quote],
  )

  return {
    ok: true,
    message: 'Testimoni terkirim. Testimoni akan tampil setelah disetujui admin.',
  }
}

/**
 * Umpan balik pengunjung untuk satu proyek.
 *
 * Aturannya sama dengan testimoni: baris selalu masuk dengan `approved = 0`,
 * sehingga tidak ada cara bagi pengunjung untuk menerbitkan kirimannya
 * sendiri. Hanya admin yang bisa menyetujui, dan hanya baris `approved = 1`
 * yang dikirim lewat `GET /api/portfolio` ke detail proyek di museum.
 */
export async function postFeedback(db, request) {
  rateLimit(request)
  const body = await readJson(request)
  const projectId = Number(body.project_id)
  const name = String(body.name ?? '').trim()
  const message = String(body.message ?? '').trim()
  const email = String(body.email ?? '').trim()
  const ratingRaw = Number(body.rating)
  const rating = Number.isFinite(ratingRaw)
    ? Math.min(5, Math.max(1, Math.round(ratingRaw)))
    : 5

  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new HttpError(400, 'Proyek tidak dikenal.')
  }
  if (name.length < 2 || name.length > 80) {
    throw new HttpError(400, 'Nama harus 2–80 karakter.')
  }
  if (message.length < 10 || message.length > 800) {
    throw new HttpError(400, 'Umpan balik harus 10–800 karakter.')
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, 'Format email tidak valid.')
  }

  // Hanya proyek yang terbit yang boleh dinilai: bingkai draf tidak ada di
  // museum, jadi umpan baliknya tidak akan pernah punya tempat tampil.
  const project = await db.get('SELECT id FROM projects WHERE id = ? AND published = 1', [
    projectId,
  ])
  if (!project) throw new HttpError(404, 'Proyek tidak ditemukan atau belum terbit.')

  await db.run(
    `INSERT INTO project_feedback (project_id, name, email, rating, message, approved, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?)`,
    [projectId, name, email, rating, message, new Date().toISOString()],
  )

  return {
    ok: true,
    message: 'Umpan balik terkirim. Tampil di detail proyek setelah disetujui admin.',
  }
}
