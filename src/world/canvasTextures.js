import { CanvasTexture, SRGBColorSpace } from 'three'

const PAPER = '#ece0c4'
const PAPER_DEEP = '#ddcdab'
const INK = '#241c16'
const INK_SOFT = 'rgba(36, 28, 22, 0.62)'
const VERMILION = '#b23a30'
const GOLD = '#a97f45'
const PLUM = '#cf8f9f'

const createCanvas = (width, height) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

const finish = (canvas) => {
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

const seededRandom = (seed) => {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

const hexToRgba = (hex, alpha = 1) => {
  const value = String(hex).replace('#', '')
  const size = value.length === 3 ? 1 : 2
  const parts = value.match(new RegExp(`.{${size}}`, 'g')) ?? ['00', '00', '00']
  const [r, g, b] = parts.map((part) => parseInt(size === 1 ? part + part : part, 16))
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const roundRect = (context, x, y, width, height, radius) => {
  const r = Math.min(radius, width / 2, height / 2)
  context.beginPath()
  context.moveTo(x + r, y)
  context.arcTo(x + width, y, x + width, y + height, r)
  context.arcTo(x + width, y + height, x, y + height, r)
  context.arcTo(x, y + height, x, y, r)
  context.arcTo(x, y, x + width, y, r)
  context.closePath()
}

const wrapLines = (context, text, maxWidth) => {
  const words = String(text ?? '').split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (context.measureText(candidate).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  }
  if (line) lines.push(line)
  return lines
}

const drawLines = (context, lines, x, y, lineHeight, maxLines = Infinity) => {
  const count = Math.min(lines.length, maxLines)
  for (let index = 0; index < count; index += 1) {
    context.fillText(lines[index], x, y + index * lineHeight)
  }
  return y + count * lineHeight
}

const fitFont = (context, text, maxWidth, maxSize, minSize, build) => {
  let size = maxSize
  while (size > minSize) {
    context.font = build(size)
    if (context.measureText(text).width <= maxWidth) break
    size -= 2
  }
  return size
}

/** Lingkaran cahaya lembut untuk lentera dan partikel. */
export function createGlowTexture(
  inner = 'rgba(255, 226, 178, 1)',
  outer = 'rgba(255, 170, 96, 0)',
) {
  const size = 256
  const canvas = createCanvas(size, size)
  const context = canvas.getContext('2d')
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, inner)
  gradient.addColorStop(0.25, inner.replace(/[\d.]+\)$/, '0.7)'))
  gradient.addColorStop(0.62, outer.replace(/[\d.]+\)$/, '0.22)'))
  gradient.addColorStop(1, outer)
  context.fillStyle = gradient
  context.fillRect(0, 0, size, size)
  return finish(canvas)
}

/* ------------------------------------------------------------------ */
/*  HALAMAN WANGSHENG                                                  */
/* ------------------------------------------------------------------ */

/** Batu halaman: lempeng batu hangat, lumut, retak tinta, dan kelopak plum. */
export function createCourtyardTexture() {
  const size = 1024
  const canvas = createCanvas(size, size)
  const context = canvas.getContext('2d')
  const random = seededRandom(20261116)

  const base = context.createLinearGradient(0, 0, size, size)
  base.addColorStop(0, '#6d6356')
  base.addColorStop(0.5, '#635a4e')
  base.addColorStop(1, '#584f44')
  context.fillStyle = base
  context.fillRect(0, 0, size, size)

  // Lempeng batu dengan ukuran tidak seragam (running bond).
  let y = -20
  while (y < size) {
    const rowHeight = 120 + Math.floor(random() * 70)
    let x = -Math.floor(random() * 200)
    while (x < size) {
      const slabWidth = 180 + Math.floor(random() * 160)
      const shade = 0.55 + random() * 0.5
      context.fillStyle = `rgba(${Math.round(96 * shade)}, ${Math.round(86 * shade)}, ${Math.round(74 * shade)}, 0.55)`
      context.fillRect(x + 3, y + 3, slabWidth - 6, rowHeight - 6)

      // Sisi terang & gelap agar batu terasa berukir.
      context.fillStyle = 'rgba(255, 236, 200, 0.05)'
      context.fillRect(x + 4, y + 4, slabWidth - 8, 3)
      context.fillStyle = 'rgba(24, 18, 14, 0.12)'
      context.fillRect(x + 4, y + rowHeight - 8, slabWidth - 8, 3)

      // Retak halus.
      if (random() > 0.55) {
        context.strokeStyle = 'rgba(32, 25, 20, 0.24)'
        context.lineWidth = 1.2
        context.beginPath()
        let cx = x + 20 + random() * (slabWidth - 40)
        let cy = y + 12 + random() * (rowHeight - 30)
        context.moveTo(cx, cy)
        const segments = 2 + Math.floor(random() * 3)
        for (let i = 0; i < segments; i += 1) {
          cx += (random() - 0.5) * 60
          cy += 10 + random() * 18
          context.lineTo(cx, cy)
        }
        context.stroke()
      }

      x += slabWidth
    }
    y += rowHeight
  }

  // Nat gelap antar lempeng.
  context.strokeStyle = 'rgba(26, 20, 16, 0.5)'
  context.lineWidth = 2
  for (let lineY = 0; lineY < size; lineY += 158) {
    const noise = Math.sin(lineY * 0.71) * 2.5
    context.beginPath()
    context.moveTo(0, lineY + noise)
    context.lineTo(size, lineY + noise)
    context.stroke()
  }

  // Lumut di sudut dan sela.
  for (let i = 0; i < 70; i += 1) {
    const cx = random() * size
    const cy = random() * size
    const radius = 10 + random() * 46
    const moss = context.createRadialGradient(cx, cy, 0, cx, cy, radius)
    moss.addColorStop(0, 'rgba(74, 88, 58, 0.24)')
    moss.addColorStop(0.6, 'rgba(74, 88, 58, 0.12)')
    moss.addColorStop(1, 'rgba(74, 88, 58, 0)')
    context.fillStyle = moss
    context.beginPath()
    context.arc(cx, cy, radius, 0, Math.PI * 2)
    context.fill()
  }

  // Kelopak plum yang gugur.
  for (let i = 0; i < 90; i += 1) {
    const cx = random() * size
    const cy = random() * size
    context.save()
    context.translate(cx, cy)
    context.rotate(random() * Math.PI * 2)
    context.fillStyle = `rgba(214, 148, 158, ${0.18 + random() * 0.3})`
    context.beginPath()
    context.ellipse(0, 0, 2.6 + random() * 2.4, 1.4 + random() * 1.2, 0, 0, Math.PI * 2)
    context.fill()
    context.restore()
  }

  // Butir batu & usia.
  for (let i = 0; i < 2600; i += 1) {
    const alpha = 0.015 + random() * 0.035
    context.fillStyle =
      random() > 0.5 ? `rgba(255, 240, 210, ${alpha})` : `rgba(24, 18, 14, ${alpha})`
    context.fillRect(random() * size, random() * size, 1 + random() * 2, 1 + random() * 2)
  }

  return finish(canvas)
}

/** Kertas lentera: hangat, berusuk, dengan cap bunga plum. */
export function createPaperLanternTexture() {
  const size = 512
  const canvas = createCanvas(size, size)
  const context = canvas.getContext('2d')

  const body = context.createLinearGradient(0, 0, 0, size)
  body.addColorStop(0, '#c99a62')
  body.addColorStop(0.18, '#f6e3b9')
  body.addColorStop(0.55, '#f3d9a5')
  body.addColorStop(0.85, '#e9c78f')
  body.addColorStop(1, '#c08e58')
  context.fillStyle = body
  context.fillRect(0, 0, size, size)

  // Rusuk kertas.
  context.strokeStyle = 'rgba(120, 80, 46, 0.22)'
  for (let x = 24; x < size; x += 42) {
    context.lineWidth = x % 84 === 0 ? 2 : 1
    context.beginPath()
    context.moveTo(x, 0)
    context.lineTo(x, size)
    context.stroke()
  }

  // Cap plum di tengah.
  context.save()
  context.translate(size / 2, size / 2 - 10)
  context.strokeStyle = 'rgba(150, 52, 46, 0.42)'
  context.fillStyle = 'rgba(166, 60, 52, 0.3)'
  context.lineWidth = 4
  for (let petal = 0; petal < 5; petal += 1) {
    context.rotate((Math.PI * 2) / 5)
    context.beginPath()
    context.ellipse(0, -46, 26, 40, 0, 0, Math.PI * 2)
    context.fill()
    context.stroke()
  }
  context.restore()

  // Noda usia.
  const random = seededRandom(9081)
  for (let i = 0; i < 90; i += 1) {
    context.fillStyle = `rgba(120, 80, 46, ${0.02 + random() * 0.05})`
    context.beginPath()
    context.arc(random() * size, random() * size, 1 + random() * 6, 0, Math.PI * 2)
    context.fill()
  }

  return finish(canvas)
}

/** Gulungan proyek: kertas, tinta, dan cap vermilion — bukan jendela browser. */
export function createProjectScrollTexture(project = {}) {
  const width = 1024
  const height = 640
  const canvas = createCanvas(width, height)
  const context = canvas.getContext('2d')
  const accent = project.accent || VERMILION
  const random = seededRandom(4207)

  // Kertas dengan tepi yang lebih gelap.
  const paper = context.createRadialGradient(
    width * 0.45,
    height * 0.4,
    width * 0.1,
    width * 0.5,
    height * 0.5,
    width * 0.78,
  )
  paper.addColorStop(0, PAPER)
  paper.addColorStop(0.72, PAPER_DEEP)
  paper.addColorStop(1, '#c9b78f')
  context.fillStyle = paper
  context.fillRect(0, 0, width, height)

  // Serat kertas.
  context.strokeStyle = 'rgba(120, 96, 62, 0.055)'
  context.lineWidth = 1
  for (let i = 0; i < 140; i += 1) {
    const y = random() * height
    context.beginPath()
    context.moveTo(0, y)
    context.lineTo(width, y + (random() - 0.5) * 3)
    context.stroke()
  }

  // Tepi kertas sedikit terkoyak.
  context.strokeStyle = 'rgba(90, 68, 42, 0.35)'
  context.lineWidth = 6
  context.strokeRect(10, 10, width - 20, height - 20)

  // Bingkai tinta ganda.
  context.strokeStyle = 'rgba(36, 28, 22, 0.85)'
  context.lineWidth = 3
  context.strokeRect(38, 38, width - 76, height - 76)
  context.strokeStyle = 'rgba(36, 28, 22, 0.28)'
  context.lineWidth = 1
  context.strokeRect(50, 50, width - 100, height - 100)

  // Label arsip.
  context.fillStyle = INK_SOFT
  context.font = '500 17px "JetBrains Mono", ui-monospace, monospace'
  context.textBaseline = 'alphabetic'
  context.fillText('WANGSHENG  ·  ARSIP KARYA', 76, 102)

  // Cap tahun.
  context.save()
  context.translate(width - 112, 116)
  context.rotate(-0.04)
  context.fillStyle = accent
  roundRect(context, -32, -32, 64, 64, 4)
  context.fill()
  context.fillStyle = 'rgba(250, 242, 224, 0.94)'
  context.font = '600 20px "Noto Serif SC", "Georgia", serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(String(project.year ?? '2026').slice(2), 0, 0)
  context.restore()
  context.textAlign = 'left'
  context.textBaseline = 'alphabetic'

  // Judul.
  const title = project.title || 'Tanpa Judul'
  const titleSize = fitFont(
    context,
    title,
    width - 190,
    62,
    34,
    (size) => `600 ${size}px "Fraunces", "Noto Serif SC", Georgia, serif`,
  )
  context.font = `600 ${titleSize}px "Fraunces", "Noto Serif SC", Georgia, serif`
  context.fillStyle = INK
  const titleLines = wrapLines(context, title, width - 190)
  const titleBottom = drawLines(context, titleLines, 76, 168, titleSize * 1.05, 2)

  // Garis tinta.
  context.strokeStyle = 'rgba(36, 28, 22, 0.5)'
  context.lineWidth = 1.5
  context.beginPath()
  context.moveTo(76, titleBottom + 6)
  context.lineTo(width - 196, titleBottom + 6)
  context.stroke()

  // Deskripsi.
  context.fillStyle = 'rgba(36, 28, 22, 0.8)'
  context.font = '400 21px "Inter", "Segoe UI", sans-serif'
  const descLines = wrapLines(context, project.description ?? '', width - 230)
  const descBottom = drawLines(context, descLines, 76, titleBottom + 44, 32, 3)

  // Tag sebagai cap kecil.
  let tagX = 76
  const tagY = Math.max(descBottom + 22, height - 224)
  context.font = '600 16px "JetBrains Mono", ui-monospace, monospace'
  for (const tag of project.tags ?? []) {
    const textWidth = context.measureText(tag).width
    const pillWidth = textWidth + 30
    if (tagX + pillWidth > width - 200) break
    context.strokeStyle = 'rgba(36, 28, 22, 0.4)'
    context.lineWidth = 1.2
    roundRect(context, tagX, tagY, pillWidth, 34, 3)
    context.stroke()
    context.fillStyle = 'rgba(36, 28, 22, 0.7)'
    context.fillText(tag, tagX + 15, tagY + 23)
    tagX += pillWidth + 10
  }

  // Ajakan interaksi.
  context.fillStyle = VERMILION
  roundRect(context, 76, height - 104, 44, 44, 3)
  context.fill()
  context.fillStyle = '#f8eed7'
  context.font = '700 22px "JetBrains Mono", ui-monospace, monospace'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText('E', 98, height - 81)
  context.textAlign = 'left'
  context.fillStyle = 'rgba(36, 28, 22, 0.85)'
  context.font = '600 19px "Inter", "Segoe UI", sans-serif'
  context.fillText('BUKA UJI WEB LANGSUNG', 136, height - 74)
  context.fillStyle = INK_SOFT
  context.font = '400 16px "Inter", "Segoe UI", sans-serif'
  context.fillText(String(project.href ?? '').replace(/^https?:\/\//, ''), 136, height - 50)

  // Ranting plum di sudut kanan bawah.
  context.save()
  context.translate(width - 160, height - 160)
  context.strokeStyle = 'rgba(58, 42, 32, 0.32)'
  context.lineWidth = 4
  context.beginPath()
  context.moveTo(10, 110)
  context.bezierCurveTo(-30, 40, 30, -20, -6, -90)
  context.stroke()
  context.lineWidth = 2
  context.beginPath()
  context.moveTo(4, 44)
  context.bezierCurveTo(-40, 14, -54, -12, -78, -18)
  context.stroke()
  for (const [px, py, scale] of [
    [-78, -18, 1],
    [-24, -34, 0.8],
    [4, -66, 0.9],
    [-54, 22, 0.7],
    [22, 74, 0.8],
  ]) {
    context.save()
    context.translate(px, py)
    context.scale(scale, scale)
    context.fillStyle = hexToRgba(PLUM, 0.55)
    for (let petal = 0; petal < 5; petal += 1) {
      context.rotate((Math.PI * 2) / 5)
      context.beginPath()
      context.ellipse(0, -9, 4.5, 8, 0, 0, Math.PI * 2)
      context.fill()
    }
    context.restore()
  }
  context.restore()

  return finish(canvas)
}

/** Papan nama pemandu sebagai kertas gantung. */
/** Label ringkas: satu baris nama tanpa peran, untuk mengurangi kepadatan teks. */
function createCompactNameplate({ title, accent }) {
  const width = 560
  const height = 128
  const canvas = createCanvas(width, height)
  const context = canvas.getContext('2d')
  context.clearRect(0, 0, width, height)

  const left = 16
  const right = width - 16
  const top = 6
  const bottom = height - 6

  context.save()
  context.shadowColor = 'rgba(20, 14, 10, 0.35)'
  context.shadowBlur = 9
  context.shadowOffsetY = 3
  context.beginPath()
  context.moveTo(left + 8, top)
  context.lineTo(right - 8, top)
  context.lineTo(right, top + 8)
  context.lineTo(right, bottom - 8)
  context.lineTo(right - 8, bottom)
  context.lineTo(left + 8, bottom)
  context.lineTo(left, bottom - 8)
  context.lineTo(left, top + 8)
  context.closePath()
  const paper = context.createLinearGradient(0, top, 0, bottom)
  paper.addColorStop(0, PAPER)
  paper.addColorStop(1, PAPER_DEEP)
  context.fillStyle = paper
  context.fill()
  context.shadowColor = 'transparent'
  context.strokeStyle = 'rgba(36, 28, 22, 0.48)'
  context.lineWidth = 2
  context.stroke()
  context.restore()

  // Cap kecil di kiri.
  const sealSize = 32
  const sealY = (height - sealSize) / 2
  context.fillStyle = accent
  roundRect(context, left + 12, sealY, sealSize, sealSize, 2)
  context.fill()
  context.fillStyle = '#f8eed7'
  context.font = '600 14px "Noto Serif SC", Georgia, serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText('堂', left + 12 + sealSize / 2, sealY + sealSize / 2 + 1)

  // Judul satu baris, mengecil bila terlalu panjang.
  const text = String(title ?? '')
  const textLeft = left + 58
  const maxWidth = right - textLeft - 28
  let size = 34
  while (size > 17) {
    context.font = `600 ${size}px "Fraunces", "Noto Serif SC", Georgia, serif`
    if (context.measureText(text).width <= maxWidth) break
    size -= 1
  }
  context.fillStyle = INK
  context.textAlign = 'left'
  context.textBaseline = 'middle'
  context.fillText(text, textLeft, height / 2 - 6)

  // Garis aksen tipis di bawah judul.
  context.strokeStyle = hexToRgba(accent, 0.85)
  context.lineWidth = 2
  context.beginPath()
  context.moveTo(textLeft, height / 2 + 20)
  context.lineTo(textLeft + Math.min(120, context.measureText(text).width * 0.4), height / 2 + 20)
  context.stroke()

  return finish(canvas)
}

export function createNameplateTexture({ title, subtitle, accent = VERMILION, compact = false }) {
  if (compact) return createCompactNameplate({ title, accent })

  const width = 640
  const height = 200
  const canvas = createCanvas(width, height)
  const context = canvas.getContext('2d')
  context.clearRect(0, 0, width, height)

  // Tali gantung.
  context.strokeStyle = 'rgba(36, 28, 22, 0.45)'
  context.lineWidth = 2
  for (const x of [width / 2 - 34, width / 2 + 34]) {
    context.beginPath()
    context.moveTo(x, 4)
    context.lineTo(x + (x < width / 2 ? -6 : 6), 34)
    context.stroke()
  }

  context.save()
  context.shadowColor = 'rgba(20, 14, 10, 0.4)'
  context.shadowBlur = 12
  context.shadowOffsetY = 4

  // Kertas dengan sudut terpotong.
  const left = 40
  const right = width - 40
  const top = 30
  const bottom = height - 18
  context.beginPath()
  context.moveTo(left + 10, top)
  context.lineTo(right - 10, top)
  context.lineTo(right, top + 10)
  context.lineTo(right, bottom - 10)
  context.lineTo(right - 10, bottom)
  context.lineTo(left + 10, bottom)
  context.lineTo(left, bottom - 10)
  context.lineTo(left, top + 10)
  context.closePath()
  const paper = context.createLinearGradient(0, top, 0, bottom)
  paper.addColorStop(0, PAPER)
  paper.addColorStop(1, PAPER_DEEP)
  context.fillStyle = paper
  context.fill()
  context.shadowColor = 'transparent'
  context.strokeStyle = 'rgba(36, 28, 22, 0.55)'
  context.lineWidth = 2
  context.stroke()
  context.restore()

  // Cap kecil.
  context.fillStyle = accent
  roundRect(context, left + 20, top + 24, 46, 46, 2)
  context.fill()
  context.strokeStyle = 'rgba(36, 28, 22, 0.35)'
  context.lineWidth = 1
  roundRect(context, left + 24, top + 28, 38, 38, 2)
  context.stroke()
  context.fillStyle = '#f8eed7'
  context.font = '600 18px "Noto Serif SC", "Georgia", serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText('堂', left + 43, top + 48)

  // Nama & peran.
  context.textAlign = 'left'
  context.textBaseline = 'alphabetic'
  context.fillStyle = INK
  context.font = '600 38px "Fraunces", "Noto Serif SC", Georgia, serif'
  context.fillText(String(title ?? ''), left + 86, top + 62)

  context.fillStyle = hexToRgba(accent, 0.95)
  context.font = '600 16px "Inter", "Segoe UI", sans-serif'
  context.fillText(String(subtitle ?? '').toUpperCase(), left + 87, top + 92)

  // Garis hias.
  context.strokeStyle = 'rgba(36, 28, 22, 0.25)'
  context.lineWidth = 1
  context.beginPath()
  context.moveTo(left + 86, top + 104)
  context.lineTo(right - 24, top + 104)
  context.stroke()

  // Bunga plum kecil di kanan.
  context.save()
  context.translate(right - 56, bottom - 30)
  context.fillStyle = hexToRgba(PLUM, 0.7)
  for (let petal = 0; petal < 5; petal += 1) {
    context.rotate((Math.PI * 2) / 5)
    context.beginPath()
    context.ellipse(0, -9, 4, 7, 0, 0, Math.PI * 2)
    context.fill()
  }
  context.restore()

  return finish(canvas)
}

/** Badge interaksi 3D: label kertas dengan cap tombol. */
export function createPromptBadgeTexture({ key = 'E', action = 'Interaksi', accent = VERMILION }) {
  const width = 512
  const height = 140
  const canvas = createCanvas(width, height)
  const context = canvas.getContext('2d')
  context.clearRect(0, 0, width, height)

  // Bayangan kertas.
  context.fillStyle = 'rgba(18, 13, 10, 0.45)'
  roundRect(context, 14, 18, width - 24, height - 28, 8)
  context.fill()

  // Kertas.
  const paper = context.createLinearGradient(0, 8, 0, height - 12)
  paper.addColorStop(0, '#f3e7cd')
  paper.addColorStop(1, '#ddcbab')
  context.fillStyle = paper
  roundRect(context, 8, 8, width - 24, height - 28, 8)
  context.fill()
  context.strokeStyle = 'rgba(36, 28, 22, 0.72)'
  context.lineWidth = 3
  context.stroke()

  // Cap tombol.
  const keySize = 78
  const keyX = 30
  const keyY = (height - 20 - keySize) / 2
  context.fillStyle = accent
  roundRect(context, keyX, keyY, keySize, keySize, 3)
  context.fill()
  context.strokeStyle = 'rgba(255, 244, 222, 0.6)'
  context.lineWidth = 1.5
  roundRect(context, keyX + 6, keyY + 6, keySize - 12, keySize - 12, 2)
  context.stroke()

  context.fillStyle = '#f8eed7'
  context.font = '700 42px "JetBrains Mono", ui-monospace, monospace'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(key, keyX + keySize / 2, keyY + keySize / 2 + 2)

  // Label.
  context.fillStyle = INK
  context.font = '600 38px "Fraunces", "Georgia", serif'
  context.textAlign = 'left'
  context.fillText(action, keyX + keySize + 26, height / 2 - 16)

  context.fillStyle = 'rgba(36, 28, 22, 0.55)'
  context.font = '500 16px "Inter", "Segoe UI", sans-serif'
  context.fillText('TEKAN ATAU KLIK', keyX + keySize + 28, height / 2 + 22)

  return finish(canvas)
}

/** Wajah roh kertas: dua mata tinta dan cap kecil. */
export function createSpiritFaceTexture(accent = VERMILION) {
  const size = 256
  const canvas = createCanvas(size, size)
  const context = canvas.getContext('2d')
  context.clearRect(0, 0, size, size)

  // Mata tinta melengkung.
  context.strokeStyle = 'rgba(30, 22, 17, 0.9)'
  context.lineWidth = 9
  context.lineCap = 'round'
  for (const side of [-1, 1]) {
    context.beginPath()
    context.moveTo(size / 2 + side * 44 - 18, 104)
    context.quadraticCurveTo(size / 2 + side * 44, 88, size / 2 + side * 44 + 18, 104)
    context.stroke()
  }

  // Mulut kecil.
  context.strokeStyle = 'rgba(30, 22, 17, 0.6)'
  context.lineWidth = 5
  context.beginPath()
  context.moveTo(size / 2 - 16, 164)
  context.quadraticCurveTo(size / 2, 174, size / 2 + 16, 164)
  context.stroke()

  // Cap vermilion di dahi.
  context.fillStyle = hexToRgba(accent, 0.9)
  context.beginPath()
  context.arc(size / 2, 62, 9, 0, Math.PI * 2)
  context.fill()

  // Pipi pucat.
  for (const side of [-1, 1]) {
    const blush = context.createRadialGradient(
      size / 2 + side * 62,
      138,
      0,
      size / 2 + side * 62,
      138,
      26,
    )
    blush.addColorStop(0, 'rgba(207, 143, 159, 0.3)')
    blush.addColorStop(1, 'rgba(207, 143, 159, 0)')
    context.fillStyle = blush
    context.fillRect(0, 0, size, size)
  }

  return finish(canvas)
}

/** Kelopak lembut untuk partikel. */
export function createPetalTexture() {
  const size = 64
  const canvas = createCanvas(size, size)
  const context = canvas.getContext('2d')
  const gradient = context.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, 'rgba(255, 240, 235, 1)')
  gradient.addColorStop(0.45, 'rgba(230, 170, 175, 0.9)')
  gradient.addColorStop(1, 'rgba(230, 170, 175, 0)')
  context.fillStyle = gradient
  context.beginPath()
  context.ellipse(size / 2, size / 2, size * 0.32, size * 0.46, 0.4, 0, Math.PI * 2)
  context.fill()
  return finish(canvas)
}

/** Papan nama bagian museum: kertas arsip dengan segel dan judul besar. */
export function createSectionPlaqueTexture({ title, subtitle, seal = '往', accent = VERMILION, eyebrow = 'WANGSHENG MUSEUM' }) {
  const width = 768
  const height = 520
  const canvas = createCanvas(width, height)
  const context = canvas.getContext('2d')
  const random = seededRandom(7113)

  const paper = context.createLinearGradient(0, 0, width, height)
  paper.addColorStop(0, '#f4ead4')
  paper.addColorStop(0.6, '#e8d8b6')
  paper.addColorStop(1, '#d8c49e')
  context.fillStyle = paper
  context.fillRect(0, 0, width, height)

  for (let i = 0; i < 120; i += 1) {
    context.fillStyle = `rgba(120, 92, 54, ${0.015 + random() * 0.03})`
    context.fillRect(random() * width, random() * height, 1 + random() * 2, 1 + random() * 2)
  }

  context.strokeStyle = 'rgba(36, 28, 22, 0.72)'
  context.lineWidth = 4
  context.strokeRect(22, 22, width - 44, height - 44)
  context.strokeStyle = 'rgba(36, 28, 22, 0.22)'
  context.lineWidth = 1
  context.strokeRect(32, 32, width - 64, height - 64)

  context.fillStyle = accent
  roundRect(context, 58, 62, 74, 74, 3)
  context.fill()
  context.fillStyle = '#f8eed7'
  context.font = '600 34px "Noto Serif SC", Georgia, serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(seal, 95, 100)

  context.textAlign = 'left'
  context.textBaseline = 'alphabetic'
  context.fillStyle = INK_SOFT
  context.font = '500 16px "JetBrains Mono", ui-monospace, monospace'
  context.fillText(eyebrow, 160, 92)

  context.fillStyle = INK
  const size = fitFont(
    context,
    title,
    width - 210,
    48,
    28,
    (value) => `600 ${value}px "Fraunces", "Noto Serif SC", Georgia, serif`,
  )
  context.font = `600 ${size}px "Fraunces", "Noto Serif SC", Georgia, serif`
  const titleLines = wrapLines(context, title, width - 210)
  drawLines(context, titleLines, 160, 142, size * 1.02, 2)

  context.strokeStyle = 'rgba(36, 28, 22, 0.36)'
  context.lineWidth = 1.5
  context.beginPath()
  context.moveTo(58, 292)
  context.lineTo(width - 58, 292)
  context.stroke()

  context.fillStyle = 'rgba(36, 28, 22, 0.76)'
  context.font = '400 22px "Inter", "Segoe UI", sans-serif'
  const subtitleLines = wrapLines(context, subtitle, width - 116)
  drawLines(context, subtitleLines, 58, 338, 34, 3)

  context.fillStyle = 'rgba(36, 28, 22, 0.46)'
  context.font = '500 15px "JetBrains Mono", ui-monospace, monospace'
  context.fillText('KLIK ATAU TEKAN E', 58, height - 54)

  return finish(canvas)
}

/** Papan pintu masuk museum. */
export function createMuseumSignTexture() {
  const width = 1024
  const height = 300
  const canvas = createCanvas(width, height)
  const context = canvas.getContext('2d')

  const wood = context.createLinearGradient(0, 0, 0, height)
  wood.addColorStop(0, '#2f241b')
  wood.addColorStop(0.5, '#241b15')
  wood.addColorStop(1, '#1a1310')
  context.fillStyle = wood
  context.fillRect(0, 0, width, height)

  context.strokeStyle = 'rgba(201, 160, 92, 0.55)'
  context.lineWidth = 3
  context.strokeRect(18, 18, width - 36, height - 36)
  context.strokeStyle = 'rgba(201, 160, 92, 0.18)'
  context.lineWidth = 1
  context.strokeRect(28, 28, width - 56, height - 56)

  context.fillStyle = '#e9d7b2'
  context.font = '600 92px "Noto Serif SC", Georgia, serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText('往生堂', width / 2, 122)

  context.fillStyle = 'rgba(233, 215, 178, 0.64)'
  context.font = '500 24px "JetBrains Mono", ui-monospace, monospace'
  context.fillText('W A N G S H E N G   ·   M U S E U M', width / 2, 198)

  context.fillStyle = VERMILION
  roundRect(context, width / 2 - 22, 226, 44, 44, 2)
  context.fill()
  context.fillStyle = '#f8eed7'
  context.font = '600 21px "Noto Serif SC", Georgia, serif'
  context.fillText('館', width / 2, 249)

  return finish(canvas)
}

/** Spanduk vertikal untuk dinding museum. */
export function createBannerTexture(text = '往生堂', accent = VERMILION) {
  const width = 256
  const height = 960
  const canvas = createCanvas(width, height)
  const context = canvas.getContext('2d')

  const paper = context.createLinearGradient(0, 0, 0, height)
  paper.addColorStop(0, '#e8d8b8')
  paper.addColorStop(0.5, '#f2e7ce')
  paper.addColorStop(1, '#d9c5a2')
  context.fillStyle = paper
  context.fillRect(0, 0, width, height)

  context.strokeStyle = 'rgba(36, 28, 22, 0.22)'
  context.lineWidth = 2
  context.strokeRect(16, 16, width - 32, height - 32)

  const characters = [...String(text)]
  context.fillStyle = INK
  context.font = '600 78px "Noto Serif SC", Georgia, serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  characters.forEach((character, index) => {
    context.fillText(character, width / 2, 150 + index * 118)
  })

  context.fillStyle = accent
  roundRect(context, width / 2 - 27, height - 120, 54, 54, 2)
  context.fill()
  context.fillStyle = '#f8eed7'
  context.font = '600 24px "Noto Serif SC", Georgia, serif'
  context.fillText('印', width / 2, height - 92)

  return finish(canvas)
}

/** Sertifikat / piagam untuk lemari display. */
export function createCertificateTexture(certificate = {}) {
  const width = 900
  const height = 640
  const canvas = createCanvas(width, height)
  const context = canvas.getContext('2d')
  const accent = certificate.accent || VERMILION
  const random = seededRandom(5109)

  const paper = context.createLinearGradient(0, 0, width, height)
  paper.addColorStop(0, '#f7eedb')
  paper.addColorStop(0.55, '#ecddbf')
  paper.addColorStop(1, '#d9c6a2')
  context.fillStyle = paper
  context.fillRect(0, 0, width, height)

  for (let i = 0; i < 80; i += 1) {
    context.fillStyle = `rgba(120, 88, 48, ${0.012 + random() * 0.025})`
    context.fillRect(random() * width, random() * height, 1 + random() * 2, 1 + random() * 2)
  }

  context.strokeStyle = 'rgba(36, 28, 22, 0.76)'
  context.lineWidth = 4
  context.strokeRect(28, 28, width - 56, height - 56)
  context.strokeStyle = hexToRgba(GOLD, 0.5)
  context.lineWidth = 2
  context.strokeRect(42, 42, width - 84, height - 84)

  context.fillStyle = accent
  roundRect(context, width / 2 - 34, 64, 68, 68, 3)
  context.fill()
  context.fillStyle = '#f8eed7'
  context.font = '600 27px "Noto Serif SC", Georgia, serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText('證', width / 2, 99)

  context.fillStyle = INK_SOFT
  context.font = '500 14px "JetBrains Mono", ui-monospace, monospace'
  context.fillText('WANGSHENG · ARSIP PENCAPAIAN', width / 2, 164)

  const title = certificate.title || 'Sertifikat'
  const titleSize = fitFont(
    context,
    title,
    width - 170,
    42,
    24,
    (size) => `600 ${size}px "Fraunces", "Noto Serif SC", Georgia, serif`,
  )
  context.fillStyle = INK
  context.font = `600 ${titleSize}px "Fraunces", "Noto Serif SC", Georgia, serif`
  const titleLines = wrapLines(context, title, width - 170)
  drawLines(context, titleLines, width / 2, 250, titleSize * 1.08, 3)

  context.strokeStyle = 'rgba(36, 28, 22, 0.3)'
  context.lineWidth = 1.5
  context.beginPath()
  context.moveTo(width / 2 - 190, 360)
  context.lineTo(width / 2 + 190, 360)
  context.stroke()

  context.fillStyle = 'rgba(36, 28, 22, 0.74)'
  context.font = '400 21px "Inter", "Segoe UI", sans-serif'
  context.fillText(certificate.issuer || 'Penyelenggara', width / 2, 404)

  context.fillStyle = accent
  context.font = '600 20px "JetBrains Mono", ui-monospace, monospace'
  context.fillText(String(certificate.year || ''), width / 2, 452)

  context.fillStyle = INK_SOFT
  context.font = '500 13px "JetBrains Mono", ui-monospace, monospace'
  context.fillText(
    (certificate.category === 'award' ? 'PRESTASI' : 'SERTIFIKAT').toUpperCase(),
    width / 2,
    height - 74,
  )

  return finish(canvas)
}

/** Permukaan papan tempel: goni kraft, serat, noda, dan judul bertinta. */
export function createPinBoardTexture() {
  const width = 1024
  const height = 768
  const canvas = createCanvas(width, height)
  const context = canvas.getContext('2d')
  const random = seededRandom(3187)

  const base = context.createLinearGradient(0, 0, width * 0.4, height)
  base.addColorStop(0, '#a8804f')
  base.addColorStop(0.5, '#9a7244')
  base.addColorStop(1, '#85603a')
  context.fillStyle = base
  context.fillRect(0, 0, width, height)

  // Serat goni: garis pendek melintang dan membujur.
  for (let i = 0; i < 2600; i += 1) {
    const x = random() * width
    const y = random() * height
    const horizontal = random() > 0.5
    context.strokeStyle =
      random() > 0.5
        ? `rgba(60, 40, 24, ${0.03 + random() * 0.05})`
        : `rgba(230, 202, 160, ${0.02 + random() * 0.04})`
    context.lineWidth = 1
    context.beginPath()
    context.moveTo(x, y)
    context.lineTo(horizontal ? x + 5 + random() * 9 : x, horizontal ? y : y + 5 + random() * 9)
    context.stroke()
  }

  // Noda air dan bekas jemuran lama.
  for (let i = 0; i < 26; i += 1) {
    const cx = random() * width
    const cy = random() * height
    const radius = 18 + random() * 70
    const stain = context.createRadialGradient(cx, cy, 0, cx, cy, radius)
    stain.addColorStop(0, 'rgba(66, 44, 26, 0.13)')
    stain.addColorStop(0.7, 'rgba(66, 44, 26, 0.05)')
    stain.addColorStop(1, 'rgba(66, 44, 26, 0)')
    context.fillStyle = stain
    context.beginPath()
    context.arc(cx, cy, radius, 0, Math.PI * 2)
    context.fill()
  }

  // Judul besar bertinta di bagian atas, seperti papan pengumuman kuil.
  context.fillStyle = 'rgba(28, 21, 16, 0.82)'
  context.font = '600 76px "Noto Serif SC", "Fraunces", Georgia, serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText('留言', width / 2 - 46, 78)

  // Cap vermilion kecil sebagai penanda arsip.
  context.save()
  context.translate(width / 2 + 66, 78)
  context.rotate(-0.05)
  context.fillStyle = hexToRgba(VERMILION, 0.9)
  context.fillRect(-26, -26, 52, 52)
  context.strokeStyle = 'rgba(248, 238, 215, 0.6)'
  context.lineWidth = 2
  context.strokeRect(-21, -21, 42, 42)
  context.fillStyle = '#f8eed7'
  context.font = '600 25px "Noto Serif SC", Georgia, serif'
  context.fillText('堂', 0, 2)
  context.restore()

  context.fillStyle = 'rgba(28, 21, 16, 0.5)'
  context.font = '500 15px "JetBrains Mono", ui-monospace, monospace'
  context.fillText('W A N G S H E N G   ·   P A P A N   P E N G U N J U N G', width / 2, 124)

  // Garis tinta tipis pemisah judul.
  context.strokeStyle = 'rgba(28, 21, 16, 0.26)'
  context.lineWidth = 2
  context.beginPath()
  context.moveTo(90, 148)
  context.lineTo(width - 90, 148)
  context.stroke()

  // Sudut bawah: ranting plum pucat.
  context.save()
  context.translate(96, height - 70)
  context.strokeStyle = 'rgba(40, 28, 20, 0.28)'
  context.lineWidth = 5
  context.beginPath()
  context.moveTo(-10, 30)
  context.bezierCurveTo(50, 6, 96, -34, 168, -46)
  context.stroke()
  context.lineWidth = 3
  context.beginPath()
  context.moveTo(62, 12)
  context.bezierCurveTo(80, -18, 62, -38, 44, -48)
  context.stroke()
  for (const [px, py, scale] of [
    [168, -46, 1],
    [124, -30, 0.85],
    [44, -48, 0.75],
    [96, 2, 0.7],
  ]) {
    context.save()
    context.translate(px, py)
    context.scale(scale, scale)
    context.fillStyle = hexToRgba(PLUM, 0.42)
    for (let petal = 0; petal < 5; petal += 1) {
      context.rotate((Math.PI * 2) / 5)
      context.beginPath()
      context.ellipse(0, -10, 5, 9, 0, 0, Math.PI * 2)
      context.fill()
    }
    context.restore()
  }
  context.restore()

  return finish(canvas)
}

/**
 * Satu lembar kertas testimoni yang dipaku di papan.
 * Latar transparan + tepi kertas tidak rapi supaya siluetnya terbaca sebagai
 * kertas sungguhan, bukan kartu UI.
 */
export function createPinNoteTexture({
  name = 'Pengunjung',
  role = '',
  quote = '',
  accent = VERMILION,
  seal = '言',
  pending = false,
  seed = 1,
} = {}) {
  const width = 420
  const height = 520
  const canvas = createCanvas(width, height)
  const context = canvas.getContext('2d')
  const random = seededRandom(1000 + seed * 37)
  const inset = 16

  // Tepi kertas yang tidak lurus: sedikit bergelombang di tiap sisi.
  const edge = (from, to, wobble) => from + (random() - 0.5) * wobble
  const topLeft = { x: edge(inset, inset + 20, 10), y: edge(inset, inset + 16, 10) }
  const topRight = { x: edge(width - inset - 20, width - inset, 10), y: edge(inset, inset + 16, 10) }
  const bottomRight = {
    x: edge(width - inset - 20, width - inset, 12),
    y: edge(height - inset - 18, height - inset, 12),
  }
  const bottomLeft = { x: edge(inset, inset + 20, 12), y: edge(height - inset - 18, height - inset, 12) }

  context.save()
  context.beginPath()
  context.moveTo(topLeft.x, topLeft.y)
  context.lineTo(topRight.x, topRight.y)
  context.lineTo(bottomRight.x, bottomRight.y)
  context.lineTo(bottomLeft.x, bottomLeft.y)
  context.closePath()
  // Bayangan tipis di dalam tepi: kesan kertas menempel papan.
  context.shadowColor = 'rgba(24, 16, 10, 0.5)'
  context.shadowBlur = 14
  context.shadowOffsetY = 5
  const paper = context.createLinearGradient(0, 0, width * 0.2, height)
  paper.addColorStop(0, '#f6ecd6')
  paper.addColorStop(0.55, '#ecdcbc')
  paper.addColorStop(1, '#dfcaa4')
  context.fillStyle = paper
  context.fill()
  context.restore()

  context.save()
  context.beginPath()
  context.moveTo(topLeft.x, topLeft.y)
  context.lineTo(topRight.x, topRight.y)
  context.lineTo(bottomRight.x, bottomRight.y)
  context.lineTo(bottomLeft.x, bottomLeft.y)
  context.closePath()
  context.clip()

  // Serat kertas.
  for (let i = 0; i < 90; i += 1) {
    context.strokeStyle = `rgba(120, 92, 58, ${0.02 + random() * 0.04})`
    context.lineWidth = 1
    const y = random() * height
    context.beginPath()
    context.moveTo(0, y)
    context.lineTo(width, y + (random() - 0.5) * 4)
    context.stroke()
  }

  // Garis buku (samar) agar terasa seperti lembar catatan.
  context.strokeStyle = 'rgba(120, 96, 62, 0.09)'
  for (let y = 168; y < height - 70; y += 42) {
    context.beginPath()
    context.moveTo(38, y)
    context.lineTo(width - 38, y)
    context.stroke()
  }

  // Nama dengan tinta.
  context.fillStyle = INK
  context.textAlign = 'left'
  context.textBaseline = 'alphabetic'
  const nameSize = fitFont(
    context,
    name,
    width - 130,
    34,
    20,
    (size) => `600 ${size}px "Fraunces", "Noto Serif SC", Georgia, serif`,
  )
  context.font = `600 ${nameSize}px "Fraunces", "Noto Serif SC", Georgia, serif`
  context.fillText(name, 38, 74)

  if (role) {
    context.fillStyle = hexToRgba(accent, 0.95)
    context.font = '600 15px "JetBrains Mono", ui-monospace, monospace'
    const upper = String(role).toUpperCase()
    context.fillText(upper.length > 30 ? `${upper.slice(0, 29)}…` : upper, 39, 102)
  }

  context.strokeStyle = 'rgba(36, 28, 22, 0.3)'
  context.lineWidth = 1.5
  context.beginPath()
  context.moveTo(38, 118)
  context.lineTo(width - 38, 118)
  context.stroke()

  // Kutipan.
  context.fillStyle = 'rgba(36, 28, 22, 0.84)'
  context.font = '400 24px "Fraunces", "Noto Serif SC", Georgia, serif'
  const lines = wrapLines(context, `“${quote}”`, width - 80)
  drawLines(context, lines, 38, 168, 40, 7)

  // Cap jenis di sudut bawah.
  context.save()
  context.translate(width - 66, height - 96)
  context.rotate(-0.06)
  context.fillStyle = hexToRgba(accent, 0.88)
  roundRect(context, -26, -26, 52, 52, 2)
  context.fill()
  context.strokeStyle = 'rgba(248, 238, 215, 0.55)'
  context.lineWidth = 1.5
  roundRect(context, -21, -21, 42, 42, 1)
  context.stroke()
  context.fillStyle = '#f8eed7'
  context.font = '600 24px "Noto Serif SC", Georgia, serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(seal, 0, 1)
  context.restore()

  if (pending) {
    // Stamp “menunggu” diagonal: kiriman pengunjung belum tampil di museum.
    context.save()
    context.translate(width / 2, height / 2 + 40)
    context.rotate(-0.28)
    context.strokeStyle = 'rgba(150, 48, 42, 0.62)'
    context.lineWidth = 6
    roundRect(context, -128, -46, 256, 92, 4)
    context.stroke()
    context.fillStyle = 'rgba(150, 48, 42, 0.72)'
    context.font = '700 40px "Noto Serif SC", Georgia, serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText('待 審', 0, 2)
    context.restore()
  }

  context.restore()
  return finish(canvas)
}

/** Kertas gantung di atas papan: “tulis testimoni”. */
export function createBoardTagTexture(accent = VERMILION) {
  const width = 256
  const height = 560
  const canvas = createCanvas(width, height)
  const context = canvas.getContext('2d')

  // Tali di atas kertas.
  context.strokeStyle = 'rgba(232, 214, 180, 0.5)'
  context.lineWidth = 4
  context.beginPath()
  context.moveTo(width / 2, 0)
  context.lineTo(width / 2, 34)
  context.stroke()

  const paper = context.createLinearGradient(0, 30, 0, height)
  paper.addColorStop(0, '#f2e6cd')
  paper.addColorStop(1, '#d9c49d')
  context.fillStyle = paper
  context.fillRect(30, 30, width - 60, height - 60)
  context.strokeStyle = 'rgba(36, 28, 22, 0.4)'
  context.lineWidth = 2
  context.strokeRect(30, 30, width - 60, height - 60)

  context.fillStyle = INK
  context.font = '600 82px "Noto Serif SC", Georgia, serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  ;[...'留言'].forEach((character, index) => {
    context.fillText(character, width / 2, 132 + index * 96)
  })

  context.fillStyle = accent
  context.fillRect(width / 2 - 26, height - 132, 52, 52)
  context.fillStyle = '#f8eed7'
  context.font = '600 24px "Noto Serif SC", Georgia, serif'
  context.fillText('寫', width / 2, height - 105)

  return finish(canvas)
}

/* ------------------------------------------------------------- kartu judi */

/**
 * Muka kartu untuk meja judi 3D.
 *
 * Kartu hanya selebar ±10 cm dan dilihat dari jarak duduk, jadi 220×300 px
 * sudah tajam. Merah memakai vermilion Wangsheng, bukan merah kartu remi biasa.
 */
export function createCardFaceTexture({ rank = 'A', suit = '♠', red = false } = {}) {
  const width = 220
  const height = 300
  const canvas = createCanvas(width, height)
  const context = canvas.getContext('2d')
  const ink = red ? VERMILION : INK

  context.fillStyle = '#f4e9d2'
  roundRect(context, 2, 2, width - 4, height - 4, 12)
  context.fill()
  context.strokeStyle = 'rgba(36, 28, 22, 0.26)'
  context.lineWidth = 3
  roundRect(context, 6, 6, width - 12, height - 12, 10)
  context.stroke()

  context.fillStyle = ink
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font = '700 92px Georgia, "Times New Roman", serif'
  context.fillText(String(rank), width / 2, height * 0.35)
  context.font = '76px Georgia, "Times New Roman", serif'
  context.fillText(String(suit), width / 2, height * 0.66)

  context.font = '700 28px Georgia, serif'
  context.fillText(String(rank), 26, 32)
  context.save()
  context.translate(width - 26, height - 32)
  context.rotate(Math.PI)
  context.fillText(String(rank), 0, 0)
  context.restore()

  return finish(canvas)
}

/** Punggung kartu: bidang vermilion dengan cap 牌, tanpa pola ramai. */
export function createCardBackTexture({ accent = VERMILION } = {}) {
  const width = 220
  const height = 300
  const canvas = createCanvas(width, height)
  const context = canvas.getContext('2d')

  context.fillStyle = accent
  roundRect(context, 2, 2, width - 4, height - 4, 12)
  context.fill()
  context.strokeStyle = 'rgba(20, 13, 10, 0.55)'
  context.lineWidth = 6
  roundRect(context, 12, 12, width - 24, height - 24, 8)
  context.stroke()

  context.fillStyle = 'rgba(244, 233, 210, 0.16)'
  context.beginPath()
  context.arc(width / 2, height / 2, 54, 0, Math.PI * 2)
  context.fill()

  context.fillStyle = '#f4e9d2'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font = '600 62px "Noto Serif SC", Georgia, serif'
  context.fillText('牌', width / 2, height / 2 + 4)

  return finish(canvas)
}

/**
 * Topeng kertas bandar arsip: kertas putih, dua celah tinta, dan cap kecil.
 * Dipakai sebagai wajah sosok di seberang meja agar “bot” punya tubuh, bukan
 * sekadar angka di layar.
 */
export function createDealerMaskTexture() {
  const width = 256
  const height = 320
  const canvas = createCanvas(width, height)
  const context = canvas.getContext('2d')

  context.clearRect(0, 0, width, height)
  context.fillStyle = '#efe4cb'
  context.beginPath()
  context.ellipse(width / 2, height / 2, width * 0.42, height * 0.46, 0, 0, Math.PI * 2)
  context.fill()
  context.strokeStyle = 'rgba(36, 28, 22, 0.35)'
  context.lineWidth = 3
  context.stroke()

  // Dua celah mata: tinta pekat, sedikit miring seperti kuas.
  context.fillStyle = 'rgba(24, 18, 14, 0.86)'
  for (const side of [-1, 1]) {
    context.save()
    context.translate(width / 2 + side * 34, height * 0.44)
    context.rotate(side * 0.12)
    context.beginPath()
    context.ellipse(0, 0, 20, 7, 0, 0, Math.PI * 2)
    context.fill()
    context.restore()
  }

  // Garis mulut tipis dan cap 印 di dahi.
  context.strokeStyle = 'rgba(24, 18, 14, 0.5)'
  context.lineWidth = 3
  context.beginPath()
  context.moveTo(width / 2 - 16, height * 0.66)
  context.lineTo(width / 2 + 16, height * 0.66)
  context.stroke()

  context.fillStyle = VERMILION
  context.fillRect(width / 2 - 15, height * 0.2, 30, 30)
  context.fillStyle = '#f8eed7'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font = '600 20px "Noto Serif SC", Georgia, serif'
  context.fillText('印', width / 2, height * 0.2 + 16)

  return finish(canvas)
}

export const PALETTE = Object.freeze({
  paper: PAPER,
  ink: INK,
  vermilion: VERMILION,
  gold: GOLD,
  plum: PLUM,
})
