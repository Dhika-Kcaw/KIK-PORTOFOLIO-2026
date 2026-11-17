import { randomBytes } from 'node:crypto'
import { HttpError, isSecureRequest, parseCookies, serializeCookie } from './http.js'

export const SESSION_COOKIE = 'wg_admin'
const SESSION_DAYS = 7
const FALLBACK_EMAIL = 'admin@wangsheng.local'
const FALLBACK_PASSWORD = 'admin12345'

const createToken = () => randomBytes(32).toString('hex')
const nowIso = () => new Date().toISOString()
const expiryIso = () => new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString()

export async function ensureAdmin(db) {
  const row = await db.get('SELECT COUNT(*) AS count FROM admin_users')
  if (Number(row?.count ?? 0) > 0) return null

  const name = Bun.env.ADMIN_NAME || 'Admin Museum'
  const email = String(Bun.env.ADMIN_EMAIL || FALLBACK_EMAIL).trim().toLowerCase()
  const password = Bun.env.ADMIN_PASSWORD || FALLBACK_PASSWORD

  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD minimal 8 karakter.')
  }

  const passwordHash = await Bun.password.hash(password, { algorithm: 'argon2id' })
  await db.run(
    'INSERT INTO admin_users (name, email, password_hash, created_at) VALUES (?, ?, ?, ?)',
    [name, email, passwordHash, nowIso()],
  )

  return {
    email,
    password,
    usedFallback: !Bun.env.ADMIN_PASSWORD,
  }
}

export async function loginAdmin(db, email, password) {
  const normalized = String(email || '').trim().toLowerCase()
  const admin = await db.get('SELECT * FROM admin_users WHERE email = ?', [normalized])
  if (!admin) throw new HttpError(401, 'Email atau password salah.')

  const valid = await Bun.password.verify(String(password || ''), admin.password_hash)
  if (!valid) throw new HttpError(401, 'Email atau password salah.')

  const token = createToken()
  await db.run(
    'INSERT INTO admin_sessions (token, admin_id, expires_at, created_at) VALUES (?, ?, ?, ?)',
    [token, admin.id, expiryIso(), nowIso()],
  )

  return { token, admin: publicAdmin(admin) }
}

export function sessionCookie(request, token) {
  return serializeCookie(SESSION_COOKIE, token, {
    maxAge: SESSION_DAYS * 86_400,
    secure: isSecureRequest(request),
  })
}

export function logoutCookie(request) {
  return serializeCookie(SESSION_COOKIE, '', {
    maxAge: 0,
    secure: isSecureRequest(request),
  })
}

export async function logoutAdmin(db, request) {
  const token = parseCookies(request)[SESSION_COOKIE]
  if (token) await db.run('DELETE FROM admin_sessions WHERE token = ?', [token])
}

export async function getAdminFromRequest(db, request) {
  const token = parseCookies(request)[SESSION_COOKIE]
  if (!token) return null

  const session = await db.get(
    `SELECT s.token, s.expires_at, u.id, u.name, u.email, u.created_at
     FROM admin_sessions s
     JOIN admin_users u ON u.id = s.admin_id
     WHERE s.token = ?`,
    [token],
  )

  if (!session) return null
  if (session.expires_at <= nowIso()) {
    await db.run('DELETE FROM admin_sessions WHERE token = ?', [token])
    return null
  }

  return publicAdmin(session)
}

export const requireAdmin = async (db, request) => {
  const admin = await getAdminFromRequest(db, request)
  if (!admin) throw new HttpError(401, 'Silakan masuk sebagai admin.')
  return admin
}

const publicAdmin = (row) => ({
  id: Number(row.id),
  name: row.name,
  email: row.email,
  createdAt: row.created_at,
})

export const getDefaultCredentials = () => ({
  email: String(Bun.env.ADMIN_EMAIL || FALLBACK_EMAIL).trim().toLowerCase(),
  password: Bun.env.ADMIN_PASSWORD || FALLBACK_PASSWORD,
  usedFallback: !Bun.env.ADMIN_PASSWORD,
})
