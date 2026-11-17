export const TYPE_LABEL = {
  teacher: 'Guru Pembimbing',
  friend: 'Teman',
  user: 'Pengguna',
  internship: 'Tempat PLK',
}

export const EXPERIENCE_LABEL = {
  plk: 'PLK',
  organization: 'Organisasi',
  competition: 'Lomba',
}

export const formatDate = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export const isUrl = (value) => /^https?:\/\//i.test(String(value ?? ''))

export const initials = (value = '') =>
  String(value)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '往'

export const safeHref = (value) => {
  const text = String(value ?? '').trim()
  if (!text) return ''
  if (/^(https?:|mailto:|tel:)/i.test(text)) return text
  if (text.startsWith('/')) return text
  return `https://${text.replace(/^\/+/, '')}`
}

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/** Markdown ringan dan aman untuk artikel admin: heading, list, bold, paragraf. */
export function renderMarkdown(value) {
  const lines = escapeHtml(value).split(/\r?\n/)
  const output = []
  let listOpen = false

  const closeList = () => {
    if (listOpen) {
      output.push('</ul>')
      listOpen = false
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      closeList()
      continue
    }

    if (line.startsWith('### ')) {
      closeList()
      output.push(`<h4>${inline(line.slice(4))}</h4>`)
      continue
    }
    if (line.startsWith('## ')) {
      closeList()
      output.push(`<h3>${inline(line.slice(3))}</h3>`)
      continue
    }
    if (line.startsWith('# ')) {
      closeList()
      output.push(`<h2>${inline(line.slice(2))}</h2>`)
      continue
    }
    if (/^[-*]\s+/.test(line)) {
      if (!listOpen) {
        output.push('<ul>')
        listOpen = true
      }
      output.push(`<li>${inline(line.replace(/^[-*]\s+/, ''))}</li>`)
      continue
    }

    closeList()
    output.push(`<p>${inline(line)}</p>`)
  }

  closeList()
  return output.join('')
}

const inline = (value) =>
  value
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
