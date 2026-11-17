import { existsSync } from 'node:fs'
import { basename, extname, join, resolve, sep } from 'node:path'
import { createDatabase } from './db/index.js'
import { runMigrations } from './db/migrate.js'
import { seedDatabase } from './db/seed.js'
import { ensureAdmin, loginAdmin, logoutAdmin, logoutCookie, sessionCookie } from './auth.js'
import { HttpError, json, readJson } from './http.js'
import { getPortfolio, postFeedback, postMessage, postTestimonial } from './api/public.js'
import {
  createResource,
  deleteMessage,
  deleteResource,
  getOverview,
  getProfileAdmin,
  listMessages,
  listResource,
  saveProfileAdmin,
  updateMessage,
  updateResource,
} from './api/admin.js'
import { uploadFile, uploadModelBundle, UPLOAD_DIR } from './api/uploads.js'
import { RESOURCES } from '../shared/content-schema.js'
import { getAdminFromRequest, requireAdmin } from './auth.js'

const ROOT = resolve(import.meta.dir, '..')
const DIST = join(ROOT, 'dist')
const PORT = Number(Bun.env.PORT || 3001)
const HOST = Bun.env.HOST || '127.0.0.1'

const CONTENT_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.tga': 'image/x-tga',
  '.pdf': 'application/pdf',
  '.svg': 'image/svg+xml',
  // Berkas model MMD: PMX/PMD dan tekstur khusus MMD (.spa/.sph).
  '.pmx': 'application/octet-stream',
  '.pmd': 'application/octet-stream',
  '.spa': 'application/octet-stream',
  '.sph': 'application/octet-stream',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
}

const fileResponse = async (path, { cache = 'no-cache' } = {}) => {
  const file = Bun.file(path)
  if (!(await file.exists())) return null
  return new Response(file, {
    headers: {
      'content-type': CONTENT_TYPES[extname(path).toLowerCase()] || 'application/octet-stream',
      'cache-control': cache,
    },
  })
}

/**
 * Sajikan berkas dari `data/uploads/`. Sebelumnya hanya nama berkas datar
 * (`basename`) yang dilayani, sehingga bundel model tidak bisa menyimpan
 * tekstur di subfolder — padahal PMX merujuk teksturnya lewat jalur relatif
 * seperti `tex/face.png`.
 */
const serveUpload = async (pathname) => {
  let relative = ''
  try {
    relative = decodeURIComponent(pathname.replace(/^\/uploads\/?/, ''))
  } catch {
    return new Response('Not found', { status: 404 })
  }

  if (!relative || relative.startsWith('.')) {
    return new Response('Not found', { status: 404 })
  }

  const target = resolve(UPLOAD_DIR, relative)
  if (target !== UPLOAD_DIR && !target.startsWith(UPLOAD_DIR + sep)) {
    return new Response('Not found', { status: 404 })
  }

  const name = basename(target)
  if (!name || name.startsWith('.')) return new Response('Not found', { status: 404 })

  const response = await fileResponse(target, {
    cache: 'public, max-age=31536000, immutable',
  })
  return response || new Response('Not found', { status: 404 })
}

const serveStatic = async (pathname) => {
  if (!existsSync(join(DIST, 'index.html'))) {
    return json({ error: 'Build belum tersedia. Jalankan `bun run build`.' }, 404)
  }
  const decoded = decodeURIComponent(pathname)
  const clean = decoded.replace(/^\/+/, '')
  const candidate = resolve(DIST, clean)
  if (candidate.startsWith(DIST) && clean && !clean.endsWith('/')) {
    const response = await fileResponse(candidate)
    if (response) return response
  }
  return fileResponse(join(DIST, 'index.html')) ?? new Response('Not found', { status: 404 })
}

async function routeApi(db, request, url) {
  const { pathname } = url
  const method = request.method
  const segments = pathname.split('/').filter(Boolean)
  // ['api', ...]
  const rest = segments.slice(1)

  if (pathname === '/api/portfolio' && method === 'GET') {
    return json(await getPortfolio(db))
  }

  if (pathname === '/api/messages' && method === 'POST') {
    return json(await postMessage(db, request), 201)
  }

  if (pathname === '/api/testimonials' && method === 'POST') {
    return json(await postTestimonial(db, request), 201)
  }

  // Umpan balik per proyek. Selalu tersimpan sebagai `approved = 0`.
  if (pathname === '/api/feedback' && method === 'POST') {
    return json(await postFeedback(db, request), 201)
  }

  if (pathname === '/api/auth/login' && method === 'POST') {
    const body = await readJson(request)
    const { token, admin } = await loginAdmin(db, body.email, body.password)
    return json(
      { admin },
      200,
      { 'set-cookie': sessionCookie(request, token) },
    )
  }

  if (pathname === '/api/auth/logout' && method === 'POST') {
    await logoutAdmin(db, request)
    return json({ ok: true }, 200, { 'set-cookie': logoutCookie(request) })
  }

  if (pathname === '/api/auth/me' && method === 'GET') {
    const admin = await getAdminFromRequest(db, request)
    if (!admin) throw new HttpError(401, 'Belum masuk.')
    return json({ admin })
  }

  if (pathname === '/api/admin/overview' && method === 'GET') {
    await requireAdmin(db, request)
    return json(await getOverview(db, request))
  }

  if (pathname === '/api/admin/profile') {
    if (method === 'GET') return json({ profile: await getProfileAdmin(db, request) })
    if (method === 'PUT') return json({ profile: await saveProfileAdmin(db, request) })
  }

  if (pathname === '/api/admin/uploads' && method === 'POST') {
    return json(await uploadFile(db, request), 201)
  }

  // Bundel model: banyak berkas + struktur folder. Harus diperiksa sebelum
  // cabang resource generik, yang akan membaca "upload" sebagai ID.
  if (pathname === '/api/admin/models/upload' && method === 'POST') {
    return json(await uploadModelBundle(db, request), 201)
  }

  if (pathname === '/api/admin/messages' && method === 'GET') {
    return json({ items: await listMessages(db, request) })
  }

  if (rest[0] === 'admin' && rest[1] === 'messages' && rest[2]) {
    const id = Number(rest[2])
    if (!Number.isInteger(id)) throw new HttpError(400, 'ID tidak valid.')
    if (method === 'PUT') return json(await updateMessage(db, request, id))
    if (method === 'DELETE') return json(await deleteMessage(db, request, id))
  }

  if (rest[0] === 'admin' && rest[1] && rest[1] !== 'overview' && rest[1] !== 'profile') {
    const resource = rest[1]
    const config = RESOURCES[resource]
    if (!config) throw new HttpError(404, 'Resource tidak ditemukan.')

    if (!rest[2]) {
      if (method === 'GET') return json({ items: await listResource(db, request, resource) })
      if (method === 'POST') return json(await createResource(db, request, resource), 201)
    }

    const id = Number(rest[2])
    if (!Number.isInteger(id)) throw new HttpError(400, 'ID tidak valid.')
    if (method === 'PUT') return json(await updateResource(db, request, resource, id))
    if (method === 'DELETE') return json(await deleteResource(db, request, resource, id))
  }

  throw new HttpError(404, 'Endpoint tidak ditemukan.')
}

const db = await createDatabase()
await runMigrations(db)
const seeded = await seedDatabase(db)
const createdAdmin = await ensureAdmin(db)

const server = Bun.serve({
  port: PORT,
  hostname: HOST,
  async fetch(request) {
    const url = new URL(request.url)
    try {
      if (url.pathname.startsWith('/api/')) {
        return await routeApi(db, request, url)
      }
      if (url.pathname.startsWith('/uploads/')) {
        return await serveUpload(url.pathname)
      }
      return await serveStatic(url.pathname)
    } catch (error) {
      if (error instanceof HttpError) {
        return json({ error: error.message }, error.status)
      }
      console.error(error)
      return json({ error: 'Kesalahan server.' }, 500)
    }
  },
})

console.log(`API museum berjalan di http://${HOST}:${PORT}`)
console.log(`Database: ${db.describe}`)
if (seeded) console.log('Data contoh museum dimasukkan.')
if (createdAdmin) {
  console.log(`Admin awal: ${createdAdmin.email} / ${createdAdmin.password}`)
  if (createdAdmin.usedFallback) {
    console.log('PERINGATAN: ganti ADMIN_EMAIL dan ADMIN_PASSWORD di .env.')
  }
}

const shutdown = () => {
  server.stop(true)
  db.close()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
