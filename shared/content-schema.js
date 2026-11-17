/**
 * Definisi konten bersama untuk server dan dashboard admin.
 *
 * Satu sumber kebenaran agar form admin, validasi API, dan kolom database
 * tidak melenceng. Menambah field cukup di sini + kolom di kedua skema SQL.
 */

export const SKILL_CATEGORIES = [
  { value: 'hard', label: 'Hard skill' },
  { value: 'soft', label: 'Soft skill' },
]

export const CERTIFICATE_CATEGORIES = [
  { value: 'certificate', label: 'Sertifikat' },
  { value: 'award', label: 'Prestasi' },
]

export const EXPERIENCE_TYPES = [
  { value: 'plk', label: 'PLK / Praktik Kerja Lapangan' },
  { value: 'organization', label: 'Organisasi / Kepanitiaan' },
  { value: 'competition', label: 'Lomba' },
]

export const TESTIMONIAL_TYPES = [
  { value: 'teacher', label: 'Guru Pembimbing' },
  { value: 'friend', label: 'Teman' },
  { value: 'user', label: 'Pengguna' },
  { value: 'internship', label: 'Tempat PLK' },
]

export const POST_STATUSES = [
  { value: 'draft', label: 'Draf' },
  { value: 'published', label: 'Terbit' },
]

export const PROFILE_FIELDS = [
  { name: 'name', label: 'Nama lengkap', type: 'text', required: true },
  { name: 'headline', label: 'Headline', type: 'text', hint: 'Contoh: Creative Developer' },
  { name: 'class_name', label: 'Kelas', type: 'text', hint: 'Contoh: XII RPL 1' },
  {
    name: 'competence',
    label: 'Kompetensi keahlian',
    type: 'text',
    hint: 'Contoh: Pengembangan Perangkat Lunak dan Gim',
  },
  { name: 'hero_tagline', label: 'Tagline beranda', type: 'textarea', rows: 2 },
  { name: 'bio', label: 'Deskripsi singkat / personal branding', type: 'textarea', rows: 5 },
  { name: 'avatar_url', label: 'Foto profil', type: 'image' },
  { name: 'location', label: 'Lokasi', type: 'text' },
  { name: 'availability', label: 'Status ketersediaan', type: 'text' },
  { name: 'email', label: 'Email', type: 'text' },
  { name: 'github', label: 'GitHub', type: 'text' },
  { name: 'instagram', label: 'Instagram', type: 'text' },
  { name: 'linkedin', label: 'LinkedIn', type: 'text' },
  { name: 'cv_url', label: 'Berkas CV (PDF)', type: 'file' },
  {
    name: 'career_goal',
    label: 'Cita-cita / tujuan karier',
    type: 'textarea',
    rows: 4,
  },
  {
    name: 'education',
    label: 'Riwayat pendidikan',
    type: 'list',
    hint: 'Satu baris per riwayat, urut dari terbaru.',
  },
  {
    name: 'interests',
    label: 'Minat dan bidang teknologi',
    type: 'list',
    hint: 'Satu baris per minat.',
  },
  {
    name: 'organizations',
    label: 'Pengalaman organisasi / kepanitiaan',
    type: 'list',
    hint: 'Ringkasan singkat, satu baris per pengalaman.',
  },
  {
    name: 'plk',
    label: 'Pengalaman PLK',
    type: 'list',
    hint: 'Ringkasan singkat, satu baris per pengalaman.',
  },
]

export const RESOURCES = {
  projects: {
    table: 'projects',
    label: 'Proyek',
    singular: 'Proyek',
    seal: '作',
    order: 'sort_order ASC, id DESC',
    description: 'Karya yang tampil sebagai bingkai di Galeri Karya museum.',
    fields: [
      { name: 'title', label: 'Nama proyek', type: 'text', required: true },
      { name: 'slug', label: 'Slug', type: 'text', hint: 'Huruf kecil, tanpa spasi.' },
      { name: 'year', label: 'Tahun', type: 'text', width: 'half' },
      { name: 'category', label: 'Kategori', type: 'text', width: 'half' },
      { name: 'summary', label: 'Ringkasan singkat', type: 'textarea', rows: 3 },
      { name: 'description', label: 'Deskripsi proyek', type: 'textarea', rows: 4 },
      {
        name: 'problem',
        label: 'Permasalahan yang ingin diselesaikan',
        type: 'textarea',
        rows: 4,
      },
      { name: 'goal', label: 'Tujuan proyek', type: 'textarea', rows: 3 },
      { name: 'tech', label: 'Teknologi yang digunakan', type: 'list' },
      { name: 'role', label: 'Peran dalam proyek', type: 'textarea', rows: 3 },
      { name: 'features', label: 'Fitur-fitur proyek', type: 'list' },
      { name: 'demo_url', label: 'Link demo', type: 'text' },
      { name: 'repo_url', label: 'Link source code GitHub', type: 'text' },
      {
        name: 'documentation',
        label: 'Dokumentasi proses pekerjaan',
        type: 'textarea',
        rows: 5,
        hint: 'Boleh berupa catatan proses, tautan, atau keduanya.',
      },
      { name: 'details', label: 'Detail proyek', type: 'textarea', rows: 6 },
      { name: 'image_url', label: 'Gambar / screenshot utama', type: 'image' },
      {
        name: 'gallery',
        label: 'Galeri gambar tambahan',
        type: 'list',
        hint: 'Tempel URL gambar, satu per baris.',
      },
      { name: 'featured', label: 'Tampilkan sebagai karya unggulan', type: 'boolean' },
      { name: 'published', label: 'Tampilkan di museum', type: 'boolean', default: true },
      { name: 'sort_order', label: 'Urutan', type: 'number', default: 0 },
    ],
    listFields: ['title', 'year', 'category', 'published'],
  },

  skills: {
    table: 'skills',
    label: 'Keahlian',
    singular: 'Keahlian',
    seal: '技',
    order: 'sort_order ASC, id ASC',
    description: 'Daftar hard skill dan soft skill dengan persentase.',
    fields: [
      { name: 'name', label: 'Nama keahlian', type: 'text', required: true },
      {
        name: 'category',
        label: 'Kategori',
        type: 'select',
        options: SKILL_CATEGORIES,
        default: 'hard',
      },
      {
        name: 'level',
        label: 'Persentase penguasaan',
        type: 'number',
        min: 0,
        max: 100,
        default: 70,
      },
      { name: 'note', label: 'Catatan', type: 'text' },
      { name: 'sort_order', label: 'Urutan', type: 'number', default: 0 },
    ],
    listFields: ['name', 'category', 'level'],
  },

  certificates: {
    table: 'certificates',
    label: 'Sertifikat & Prestasi',
    singular: 'Sertifikat',
    seal: '證',
    order: 'sort_order ASC, year DESC, id DESC',
    description: 'Sertifikat, piagam, dan prestasi yang dipajang di dinding museum.',
    fields: [
      { name: 'title', label: 'Nama sertifikat / prestasi', type: 'text', required: true },
      { name: 'issuer', label: 'Penerbit / penyelenggara', type: 'text' },
      { name: 'year', label: 'Tahun', type: 'text', width: 'half' },
      {
        name: 'category',
        label: 'Kategori',
        type: 'select',
        options: CERTIFICATE_CATEGORIES,
        default: 'certificate',
      },
      { name: 'description', label: 'Keterangan', type: 'textarea', rows: 3 },
      { name: 'image_url', label: 'Dokumentasi gambar', type: 'image' },
      {
        name: 'documentation',
        label: 'Tautan dokumentasi',
        type: 'text',
        hint: 'URL berkas atau folder dokumentasi.',
      },
      { name: 'sort_order', label: 'Urutan', type: 'number', default: 0 },
    ],
    listFields: ['title', 'issuer', 'year', 'category'],
  },

  experiences: {
    table: 'experiences',
    label: 'Pengalaman',
    singular: 'Pengalaman',
    seal: '歷',
    order: 'sort_order ASC, id DESC',
    description: 'PLK, organisasi, kepanitiaan, dan lomba.',
    fields: [
      {
        name: 'type',
        label: 'Jenis pengalaman',
        type: 'select',
        options: EXPERIENCE_TYPES,
        default: 'plk',
      },
      { name: 'title', label: 'Posisi / kegiatan', type: 'text', required: true },
      { name: 'organization', label: 'Tempat / organisasi', type: 'text' },
      { name: 'period', label: 'Periode', type: 'text', hint: 'Contoh: Juli – Desember 2026' },
      { name: 'description', label: 'Deskripsi', type: 'textarea', rows: 4 },
      { name: 'highlights', label: 'Poin penting', type: 'list' },
      { name: 'sort_order', label: 'Urutan', type: 'number', default: 0 },
    ],
    listFields: ['title', 'type', 'organization', 'period'],
  },

  testimonials: {
    table: 'testimonials',
    label: 'Testimoni',
    singular: 'Testimoni',
    seal: '言',
    order: 'sort_order ASC, id DESC',
    description: 'Setiap testimoni yang disetujui menjadi NPC pengunjung di museum.',
    fields: [
      { name: 'name', label: 'Nama', type: 'text', required: true },
      { name: 'role', label: 'Peran / jabatan', type: 'text' },
      {
        name: 'type',
        label: 'Kategori',
        type: 'select',
        options: TESTIMONIAL_TYPES,
        default: 'friend',
      },
      { name: 'organization', label: 'Asal / instansi', type: 'text' },
      { name: 'quote', label: 'Isi testimoni', type: 'textarea', rows: 5, required: true },
      { name: 'avatar_url', label: 'Foto', type: 'image' },
      {
        name: 'project_id',
        label: 'Terkait proyek (ID)',
        type: 'number',
        hint: 'Opsional. Isi ID proyek bila testimoni ini untuk proyek tertentu.',
      },
      { name: 'approved', label: 'Tampilkan sebagai NPC pengunjung', type: 'boolean', default: true },
      { name: 'sort_order', label: 'Urutan', type: 'number', default: 0 },
    ],
    listFields: ['name', 'type', 'role', 'approved'],
  },

  posts: {
    table: 'posts',
    label: 'Catatan Ngoding',
    singular: 'Artikel',
    seal: '記',
    order: 'sort_order ASC, published_at DESC, id DESC',
    description: 'Blog pengembang, catatan proses, dan dokumentasi masalah.',
    fields: [
      { name: 'title', label: 'Judul', type: 'text', required: true },
      { name: 'slug', label: 'Slug', type: 'text' },
      { name: 'excerpt', label: 'Ringkasan', type: 'textarea', rows: 3 },
      { name: 'content', label: 'Isi artikel', type: 'textarea', rows: 12 },
      { name: 'cover_url', label: 'Gambar sampul', type: 'image' },
      { name: 'tags', label: 'Tag', type: 'list' },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        options: POST_STATUSES,
        default: 'draft',
      },
      {
        name: 'published_at',
        label: 'Tanggal terbit',
        type: 'text',
        hint: 'Contoh: 2026-11-16',
      },
      { name: 'sort_order', label: 'Urutan', type: 'number', default: 0 },
    ],
    listFields: ['title', 'status', 'published_at'],
  },

  /**
   * Model karakter (PMX). Bukan konten teks: tiap baris menunjuk satu bundel
   * unggahan di `/uploads/models/<slug>/`, dan hanya satu baris yang `active`.
   * Museum memakai model aktif; bila tidak ada, museum kembali ke model bawaan
   * di `CONFIG.assets.model`.
   */
  models: {
    table: 'models',
    label: 'Model Karakter',
    singular: 'Model',
    seal: '形',
    order: 'active DESC, id DESC',
    description:
      'Model PMX yang dipakai sebagai karakter museum. Unggah berkasnya, lalu tekan Pakai pada satu model. Museum tidak bisa dijalankan tanpa satu pun model aktif — tanpa model, halaman menampilkan pesan bahwa tidak ada model karakter.',
    fields: [
      { name: 'name', label: 'Nama model', type: 'text', required: true },
      {
        name: 'slug',
        label: 'Folder unggahan',
        type: 'text',
        hint: 'Diisi otomatis oleh pengunggah; dipakai sebagai nama folder berkas.',
      },
      {
        name: 'pmx_url',
        label: 'Berkas PMX',
        type: 'text',
        hint: 'Contoh: /uploads/models/contoh-a1b2c3/contoh.pmx',
        required: true,
      },
      { name: 'preview_url', label: 'Gambar pratinjau', type: 'image' },
      {
        name: 'scale',
        label: 'Skala render',
        type: 'number',
        default: 0.08,
        hint: 'Model PMX standar memakai 0,08. Perbesar bila model tampak kerdil.',
      },
      { name: 'note', label: 'Catatan', type: 'textarea', rows: 3 },
      {
        name: 'active',
        label: 'Pakai di museum',
        type: 'boolean',
        default: false,
        hint: 'Hanya satu model boleh aktif; mengaktifkan satu model mematikan yang lain.',
      },
    ],
    listFields: ['name', 'pmx_url', 'scale', 'active'],
  },
  /**
   * Umpan balik pengunjung untuk satu proyek (nilai 1–5 + catatan). Bukan
   * testimoni: umpan balik tidak menjadi NPC di museum, hanya tampil di kartu
   * detail proyek setelah disetujui admin.
   */
  feedback: {
    table: 'project_feedback',
    label: 'Umpan Balik Proyek',
    singular: 'Umpan balik',
    seal: '評',
    order: 'approved ASC, created_at DESC, id DESC',
    description:
      'Kiriman pengunjung untuk satu proyek. Hanya yang disetujui tampil di detail proyek museum.',
    fields: [
      {
        name: 'project_id',
        label: 'Proyek',
        type: 'number',
        required: true,
        hint: 'Angka ID proyek yang dinilai — lihat kolom ID di bagian Proyek.',
      },
      { name: 'name', label: 'Nama pengunjung', type: 'text', required: true },
      {
        name: 'rating',
        label: 'Nilai (1–5)',
        type: 'number',
        default: 5,
        hint: 'Dipangkas otomatis ke rentang 1–5.',
      },
      { name: 'email', label: 'Email', type: 'text', hint: 'Tidak pernah ditampilkan di museum.' },
      {
        name: 'message',
        label: 'Isi umpan balik',
        type: 'textarea',
        rows: 5,
        required: true,
      },
      {
        name: 'approved',
        label: 'Tampilkan di detail proyek',
        type: 'boolean',
        default: false,
      },
    ],
    listFields: ['name', 'project_id', 'rating', 'approved'],
  },
}

/**
 * Pesan masuk hanya satu jenis: pesan kontak yang bersifat privat. Buku tamu
 * dihapus; kesan pengunjung sekarang menjadi umpan balik per proyek.
 */
export const MESSAGE_TYPES = [{ value: 'contact', label: 'Pesan kontak' }]

/** Field yang disimpan sebagai JSON array di kolom TEXT. */
export const LIST_FIELDS = new Set([
  'education',
  'interests',
  'organizations',
  'plk',
  'tech',
  'features',
  'gallery',
  'highlights',
  'tags',
])

export const getResource = (name) => RESOURCES[name] ?? null

export function parseList(value, fallback = []) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean)
  if (typeof value !== 'string' || value.trim() === '') return fallback
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean)
    }
  } catch {
    // Bukan JSON: perlakukan sebagai teks baris baru.
  }
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function normalizeValue(field, value) {
  if (field.type === 'list') return JSON.stringify(parseList(value))
  if (field.type === 'boolean') return value === true || value === 1 || value === '1' ? 1 : 0
  if (field.type === 'number') {
    if (value === '' || value === null || value === undefined) return field.default ?? 0
    const number = Number(value)
    return Number.isFinite(number) ? number : field.default ?? 0
  }
  if (field.type === 'select') {
    const allowed = field.options?.some((option) => option.value === value)
    return allowed ? value : field.default ?? field.options?.[0]?.value ?? ''
  }
  return value === null || value === undefined ? '' : String(value)
}

export function serializeRow(row, fields) {
  if (!row) return null
  const output = { ...row }
  for (const field of fields) {
    if (field.type === 'list') output[field.name] = parseList(row[field.name])
    if (field.type === 'boolean') output[field.name] = Boolean(row[field.name])
    if (field.type === 'number' && output[field.name] !== null) {
      output[field.name] = Number(output[field.name])
    }
  }
  return output
}
