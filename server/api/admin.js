import { randomUUID } from 'node:crypto'
import {
  PROFILE_FIELDS,
  RESOURCES,
  normalizeValue,
} from '../../shared/content-schema.js'
import { HttpError, readJson } from '../http.js'
import { requireAdmin } from '../auth.js'
import { insertRow, updateRow } from '../db/index.js'
import { removeModelFolder } from './uploads.js'
import {
  serializeMessage,
  serializeProfile,
  serializeResource,
} from './serialize.js'

const nowIso = () => new Date().toISOString()

const slugify = (value) =>
  String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

const normalizeResourceData = (config, body, { partial = false } = {}) => {
  const data = {}
  for (const field of config.fields) {
    if (partial && !Object.prototype.hasOwnProperty.call(body, field.name)) continue

    const raw = Object.prototype.hasOwnProperty.call(body, field.name)
      ? body[field.name]
      : field.default

    // `project_id` opsional boleh kosong (testimoni umum). Bila field-nya
    // wajib — seperti pada umpan balik proyek — nilai kosong dibiarkan lolos ke
    // pemeriksaan `required` di bawah supaya admin melihat pesan galatnya.
    if (
      field.name === 'project_id' &&
      !field.required &&
      (raw === '' || raw === null || raw === undefined)
    ) {
      data[field.name] = null
      continue
    }

    if (field.required && (raw === null || raw === undefined || String(raw).trim() === '')) {
      throw new HttpError(400, `${field.label} wajib diisi.`)
    }

    data[field.name] = normalizeValue(field, raw)
  }

  if ('slug' in data && !data.slug) {
    const title =
      body.title ??
      (data.title === undefined ? '' : data.title)
    data.slug = slugify(title)
  }

  if (config.table === 'projects') {
    data.updated_at = nowIso()
  }

  if (config.table === 'posts' && data.status === 'published' && !data.published_at) {
    data.published_at = new Date().toISOString().slice(0, 10)
  }

  return data
}

export async function listResource(db, request, resource) {
  await requireAdmin(db, request)
  const config = RESOURCES[resource]
  if (!config) throw new HttpError(404, 'Resource tidak ditemukan.')
  const rows = await db.all(`SELECT * FROM ${config.table} ORDER BY ${config.order}`)
  return rows.map((row) => serializeResource(resource, row))
}

export async function createResource(db, request, resource) {
  await requireAdmin(db, request)
  const config = RESOURCES[resource]
  if (!config) throw new HttpError(404, 'Resource tidak ditemukan.')
  const body = await readJson(request)
  const data = normalizeResourceData(config, body)

  if (config.table === 'projects') data.created_at = nowIso()
  if (config.table === 'models') data.created_at = nowIso()
  // `project_feedback.created_at` NOT NULL dan tidak diedit admin: diisi saat
  // baris dibuat, jadi urutan kiriman tetap masuk akal di tabel.
  if (config.table === 'project_feedback') data.created_at = nowIso()

  const id = await insertRow(db, config.table, data)

  // Model baru yang langsung ditandai aktif harus mematikan model lain, sama
  // seperti saat mengubah model lewat PUT.
  if (config.table === 'models' && Number(data.active) === 1) {
    await db.run('UPDATE models SET active = 0 WHERE id <> ?', [id])
  }

  const row = await db.get(`SELECT * FROM ${config.table} WHERE id = ?`, [id])
  return serializeResource(resource, row)
}

export async function updateResource(db, request, resource, id) {
  await requireAdmin(db, request)
  const config = RESOURCES[resource]
  if (!config) throw new HttpError(404, 'Resource tidak ditemukan.')
  const body = await readJson(request)
  const data = normalizeResourceData(config, body, { partial: true })
  if (Object.keys(data).length === 0) throw new HttpError(400, 'Tidak ada perubahan.')

  // "Pakai model": satu model aktif pada satu waktu. Baris lain dimatikan
  // sebelum baris ini disetel, dan model tanpa berkas PMX tidak boleh dipakai
  // (museum hanya akan gagal memuat karakternya).
  if (config.table === 'models' && Object.prototype.hasOwnProperty.call(data, 'active')) {
    if (Number(data.active) === 1) {
      const current = await db.get('SELECT pmx_url FROM models WHERE id = ?', [id])
      if (!String(data.pmx_url || current?.pmx_url || '').trim()) {
        throw new HttpError(400, 'Model ini belum punya berkas PMX.')
      }
      await db.run('UPDATE models SET active = 0 WHERE id <> ?', [id])
    }
  }

  await updateRow(db, config.table, id, data)
  const row = await db.get(`SELECT * FROM ${config.table} WHERE id = ?`, [id])
  if (!row) throw new HttpError(404, 'Data tidak ditemukan.')
  return serializeResource(resource, row)
}

export async function deleteResource(db, request, resource, id) {
  await requireAdmin(db, request)
  const config = RESOURCES[resource]
  if (!config) throw new HttpError(404, 'Resource tidak ditemukan.')

  // Bundel model ikut dihapus dari disk supaya berkas PMX + tekstur tidak
  // menumpuk sebagai sampah di `data/uploads/models/`.
  if (config.table === 'models') {
    const row = await db.get('SELECT slug FROM models WHERE id = ?', [id])
    await db.run('DELETE FROM models WHERE id = ?', [id])
    if (row?.slug) removeModelFolder(row.slug)
    return { ok: true }
  }

  await db.run(`DELETE FROM ${config.table} WHERE id = ?`, [id])
  return { ok: true }
}

export async function getProfileAdmin(db, request) {
  await requireAdmin(db, request)
  const row = await db.get('SELECT * FROM profile WHERE id = 1')
  return serializeProfile(row)
}

export async function saveProfileAdmin(db, request) {
  await requireAdmin(db, request)
  const body = await readJson(request)
  const data = {}

  for (const field of PROFILE_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(body, field.name)) continue
    if (field.required && String(body[field.name] ?? '').trim() === '') {
      throw new HttpError(400, `${field.label} wajib diisi.`)
    }
    data[field.name] = normalizeValue(field, body[field.name])
  }

  if (Object.keys(data).length === 0) throw new HttpError(400, 'Tidak ada perubahan.')
  data.updated_at = nowIso()
  await updateRow(db, 'profile', 1, data)
  const row = await db.get('SELECT * FROM profile WHERE id = 1')
  return serializeProfile(row)
}

export async function listMessages(db, request) {
  await requireAdmin(db, request)
  const rows = await db.all('SELECT * FROM messages ORDER BY created_at DESC, id DESC')
  return rows.map(serializeMessage)
}

export async function updateMessage(db, request, id) {
  await requireAdmin(db, request)
  const body = await readJson(request)
  const data = {}
  if (typeof body.approved === 'boolean') data.approved = body.approved ? 1 : 0
  if (typeof body.read === 'boolean') data.read_at = body.read ? nowIso() : null
  if (Object.keys(data).length === 0) throw new HttpError(400, 'Tidak ada perubahan.')

  await updateRow(db, 'messages', id, data)
  const row = await db.get('SELECT * FROM messages WHERE id = ?', [id])
  if (!row) throw new HttpError(404, 'Pesan tidak ditemukan.')
  return serializeMessage(row)
}

export async function deleteMessage(db, request, id) {
  await requireAdmin(db, request)
  await db.run('DELETE FROM messages WHERE id = ?', [id])
  return { ok: true }
}

export async function getOverview(db, request) {
  await requireAdmin(db, request)
  const count = async (table, where = '') => {
    const row = await db.get(`SELECT COUNT(*) AS count FROM ${table} ${where}`)
    return Number(row?.count ?? 0)
  }

  const [
    projects,
    projectsPublished,
    certificates,
    testimonials,
    testimonialsPending,
    feedback,
    feedbackPending,
    posts,
    messages,
    messagesUnread,
    models,
  ] = await Promise.all([
    count('projects'),
    count('projects', 'WHERE published = 1'),
    count('certificates'),
    count('testimonials', 'WHERE approved = 1'),
    count('testimonials', 'WHERE approved = 0'),
    count('project_feedback'),
    count('project_feedback', 'WHERE approved = 0'),
    count('posts'),
    count('messages'),
    count('messages', 'WHERE read_at IS NULL'),
    count('models'),
  ])

  const activeModel = await db.get(
    'SELECT name, pmx_url FROM models WHERE active = 1 ORDER BY id DESC LIMIT 1',
  )

  const recent = await db.all(
    'SELECT * FROM messages ORDER BY created_at DESC, id DESC LIMIT 5',
  )

  return {
    counts: {
      projects,
      projectsPublished,
      certificates,
      testimonials,
      testimonialsPending,
      feedback,
      feedbackPending,
      posts,
      messages,
      messagesUnread,
      models,
    },
    activeModel: activeModel
      ? { name: activeModel.name, pmx_url: activeModel.pmx_url }
      : null,
    recent: recent.map(serializeMessage),
    admin: null,
  }
}

export const createUploadName = (extension) => `${Date.now()}-${randomUUID().slice(0, 8)}${extension}`
