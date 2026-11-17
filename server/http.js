export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  })

export async function readJson(request, maxBytes = 2_000_000) {
  const type = request.headers.get('content-type') || ''
  if (!type.includes('application/json')) {
    throw new HttpError(415, 'Body harus JSON.')
  }
  const text = await request.text()
  if (text.length > maxBytes) throw new HttpError(413, 'Body terlalu besar.')
  try {
    return JSON.parse(text)
  } catch {
    throw new HttpError(400, 'JSON tidak valid.')
  }
}

export function parseCookies(request) {
  const header = request.headers.get('cookie') || ''
  const cookies = {}
  for (const part of header.split(';')) {
    const index = part.indexOf('=')
    if (index < 0) continue
    const name = part.slice(0, index).trim()
    const value = part.slice(index + 1).trim()
    if (!name) continue
    cookies[name] = decodeURIComponent(value)
  }
  return cookies
}

export function serializeCookie(name, value, options = {}) {
  const pieces = [`${name}=${encodeURIComponent(value)}`]
  if (options.maxAge !== undefined) pieces.push(`Max-Age=${options.maxAge}`)
  pieces.push(`Path=${options.path || '/'}`)
  pieces.push(`SameSite=${options.sameSite || 'Lax'}`)
  if (options.httpOnly !== false) pieces.push('HttpOnly')
  if (options.secure) pieces.push('Secure')
  return pieces.join('; ')
}

export const isSecureRequest = (request) =>
  request.url.startsWith('https://') || Bun.env.COOKIE_SECURE === '1'
