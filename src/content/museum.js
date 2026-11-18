/**
 * Tata letak Museum.
 *
 * Denahnya cincin galeri: lantai plaza (pohon plum) di tengah, lalu
 * - 3 meja di sisi selatan menghadap pintu masuk — Beranda tepat di tengah
 *   sebagai hal pertama yang terlihat,
 * - 3 meja di sisi barat menghadap ke dalam (Keahlian, Sertifikat, Pengalaman),
 * - Galeri Proyek di tengah sumbu x, di utara plaza, menghadap ke selatan,
 * - 3 meja di sisi timur menghadap ke dalam (Kontak, CV, Catatan),
 * - Testimoni di sudut tenggara dekat pintu,
 * - Kedai Kartu di sela antara Kontak dan papan testimoni (sudut timur-selatan),
 * - bingkai proyek berbaris rata di dinding utara (dan memutar ke dinding
 *   barat bila jumlah proyek lebih dari 10),
 * - pengunjung mengitari plaza pada satu cincin berjarak sama.
 * Semua koleksi menghadap ke area yang dilewati pengunjung agar kamera
 * isometrik selalu melihat bagian depannya tanpa saling menutupi.
 */

export const SECTION_ORDER = [
  'home',
  'about',
  'skills',
  'projects',
  'certificates',
  'experience',
  'cv',
  'contact',
  'blog',
  'testimonials',
  'games',
]

export const SECTIONS = {
  home: {
    label: 'Beranda',
    short: 'Profil',
    seal: '迎',
    accent: '#c15a45',
    title: 'Meja Perkenalan',
    subtitle: 'Profil dan personal branding',
    prompt: 'Buka beranda',
    position: [0, 11.8],
    rotationY: 0,
    standDistance: 1.15,
    eyebrow: 'Selamat datang',
    description: 'Pintu masuk museum dan ringkasan tentang pemilik arsip.',
  },
  about: {
    label: 'Tentang Saya',
    short: 'About',
    seal: '我',
    accent: '#b07a4f',
    title: 'Ruang Tentang Saya',
    subtitle: 'Biodata, pendidikan, dan tujuan',
    prompt: 'Buka tentang saya',
    position: [-7.2, 11.8],
    rotationY: 0,
    standDistance: 1.15,
    eyebrow: 'Arsip pribadi',
    description: 'Riwayat pendidikan, minat, organisasi, PLK, dan tujuan karier.',
  },
  skills: {
    label: 'Keahlian',
    short: 'Skills',
    seal: '技',
    accent: '#c9a05c',
    title: 'Dinding Keahlian',
    subtitle: 'Hard skill dan soft skill',
    prompt: 'Buka keahlian',
    position: [-11.8, 7.2],
    rotationY: Math.PI / 2,
    standDistance: 1.15,
    eyebrow: ' Perangkat',
    description: 'Kemampuan teknis dan non-teknis dengan persentase.',
  },
  projects: {
    label: 'Galeri Proyek',
    short: 'Karya',
    seal: '作',
    accent: '#a98bb8',
    title: 'Katalog Karya',
    subtitle: 'Semua proyek dalam satu meja',
    prompt: 'Buka galeri proyek',
    position: [0, -7.2],
    rotationY: 0,
    standDistance: 1.15,
    eyebrow: 'Koleksi utama',
    description: 'Cari, filter, dan baca detail seluruh proyek.',
  },
  certificates: {
    label: 'Sertifikat & Prestasi',
    short: 'Sertifikat',
    seal: '證',
    accent: '#7f9b86',
    title: 'Lemari Sertifikat',
    subtitle: 'Piagam dan pencapaian',
    prompt: 'Buka sertifikat',
    position: [-11.8, 0],
    rotationY: Math.PI / 2,
    standDistance: 1.15,
    eyebrow: 'Bukti belajar',
    description: 'Sertifikat, piagam, dan prestasi beserta dokumentasinya.',
  },
  experience: {
    label: 'Pengalaman',
    short: 'Experience',
    seal: '歷',
    accent: '#8a9a7a',
    title: 'Dinding Pengalaman',
    subtitle: 'PLK, organisasi, dan lomba',
    prompt: 'Buka pengalaman',
    position: [-11.8, -7.2],
    rotationY: Math.PI / 2,
    standDistance: 1.15,
    eyebrow: 'Jejak kerja',
    description: 'Pengalaman PLK, organisasi, kepanitiaan, dan lomba.',
  },
  cv: {
    label: 'CV Digital',
    short: 'CV',
    seal: '卷',
    accent: '#c15a45',
    title: 'Meja CV',
    subtitle: 'Resume yang bisa dibaca dan dicetak',
    prompt: 'Buka CV digital',
    position: [11.8, 0],
    rotationY: -Math.PI / 2,
    standDistance: 1.15,
    eyebrow: 'Resume',
    description: 'Ringkasan pendidikan, keahlian, dan pengalaman dalam satu halaman.',
  },
  contact: {
    label: 'Kontak',
    short: 'Kontak',
    seal: '信',
    accent: '#7f9b86',
    title: 'Meja Kontak',
    subtitle: 'Hubungi dan tinggalkan pesan',
    prompt: 'Buka kontak',
    position: [11.8, 7.2],
    rotationY: -Math.PI / 2,
    standDistance: 1.15,
    eyebrow: 'Pintu terbuka',
    description: 'Email, GitHub, Instagram, LinkedIn, dan formulir pesan.',
  },
  blog: {
    label: 'Catatan Ngoding',
    short: 'Catatan',
    seal: '記',
    accent: '#a98bb8',
    title: 'Meja Baca',
    subtitle: 'Artikel dan proses belajar',
    prompt: 'Buka catatan',
    position: [11.8, -7.2],
    rotationY: -Math.PI / 2,
    standDistance: 1.15,
    eyebrow: 'Jurnal',
    description: 'Catatan pengembangan, tutorial singkat, dan penyelesaian masalah.',
  },
  testimonials: {
    label: 'Papan Pengunjung',
    short: 'Testimoni',
    seal: '簽',
    accent: '#c07a86',
    title: 'Papan Tempel Testimoni',
    subtitle: 'Tulis kesanmu, paku di papan, tunggu persetujuan admin',
    prompt: 'Tulis testimoni',
    eyebrow: 'Kertas dan paku',
    description:
      'Papan tempel di sisi selatan museum: kertas kesan dari pengunjung, ditinjau admin sebelum tampil.',
    // Sengaja tanpa `position`: bagian ini tidak punya meja, melainkan
    // diwakili benda fisik PinBoard (lihat TESTIMONIAL_BOARD).
  },
  games: {
    label: 'Kedai Kartu',
    short: 'Kartu',
    seal: '牌',
    accent: '#b23a30',
    title: 'Meja Judi Kedai Kartu',
    subtitle: 'Blackjack melawan bandar arsip — jimat dan kutukan',
    prompt: 'Duduk bermain',
    eyebrow: 'Ruang sela',
    description:
      'Meja blackjack di sudut tenggara: taruhan keping, jimat penolong, dan kutukan bandar pada tiga tingkat kesulitan.',
    // Tanpa `position`: tidak ada meja informasi di PHYSICAL_SECTIONS. Bagian
    // ini diwakili meja judi fisik sendiri (lihat GAME_TABLE).
  },
}

export const PHYSICAL_SECTIONS = SECTION_ORDER.filter((key) => SECTIONS[key].position)

/**
 * Papan tempel testimoni: benda fisik, bukan menu.
 *
 * Menggantikan meja Testimoni lama — papan inilah tempat bagian Testimoni di
 * museum. Ia memakai id stasiun yang sama (`section-testimonials`) supaya semua
 * navigasi lama tetap menuju ke sini, tetapi `kind`-nya `board` sehingga yang
 * terbuka adalah BoardView, bukan panel meja biasa.
 */
export const TESTIMONIAL_BOARD = {
  id: 'section-testimonials',
  position: [7.2, 11.9],
  rotationY: 0,
  width: 2.2,
  height: 1.55,
  standDistance: 1.5,
  interactRadius: 1.7,
  colliderRadius: 0.8,
}

/**
 * Meja judi “Kedai Kartu”.
 *
 * Ditempatkan di sela antara meja Kontak (11,8; 7,2) dan papan testimoni
 * (7,2; 11,9): satu-satunya diagonal yang masih kosong dan masih dekat pintu
 * masuk, jadi pengunjung menemukannya tanpa harus menyeberangi plaza.
 * Pemain berdiri di sisi selatan meja (`standDistance`), menghadap bandar.
 */
export const GAME_TABLE = {
  id: 'section-games',
  position: [7.2, 7.2],
  rotationY: 0,
  // Titik berdiri harus tetap di luar penghalang meja (1,0 m + badan 0,36 m),
  // jadi 1,45 m masih aman tetapi cukup dekat untuk duduk. Radius interaksi
  // diberi kelonggaran supaya pemain yang berhenti sedikit di depan meja tetap
  // mendapat prompt E.
  standDistance: 1.45,
  interactRadius: 2,
  colliderRadius: 1,
  // Posisi kamera orang pertama saat duduk (koordinat lokal meja): mata di sisi
  // selatan, lebih tinggi daripada duduk wajar supaya seluruh kain terlihat;
  // pandangan diarahkan ke tengah kain sehingga kartu bandar dan kartu pemain
  // sama-sama berada di bagian tengah layar, di atas bilah HUD.
  seat: {
    eye: [0, 1.42, 1.55],
    look: [0, 0.8, 0.15],
  },
}

/**
 * Bingkai proyek tumbuh mengikuti isi database.
 *
 * Tidak ada batas jumlah tetap seperti versi sebelumnya (10 + 10). Tata letak
 * dihitung dari jumlah proyek dengan tiga cara yang dipakai berurutan:
 *
 * 1. bingkai mengecil bertahap (3,4 m → 1,66 m) selagi masih muat satu dinding;
 * 2. dinding utara dipakai lebih dulu, lalu dinding barat bila satu dinding
 *    tidak cukup (dibagi rata supaya tidak ada dinding yang kesepian);
 * 3. bila dua dinding pun tidak cukup, muncul baris kedua di atas baris
 *    pertama — struktur rak bertiang yang tingginya tetap di bawah balok dinding.
 *
 * Selama ada proyek di database, selalu ada slotnya. Untuk koleksi yang sangat
 * besar, kolom ditambah (jarak antar-bingkai menipis) supaya tidak ada proyek
 * yang dibuang diam-diam.
 */
export const PROJECT_WALL_Z = -13.2
const PROJECT_WEST_X = -15
/** Panjang dinding yang boleh dipakai bingkai (dari 33 m, disisakan margin). */
const PROJECT_SPAN = 29
/** Jarak bersih minimum antar-bingkai pada barisan terpadat. */
const PROJECT_MIN_GAP = 0.3
const PROJECT_MAX_SPACING = 6.8
/** Tepi atas bingkai terjauh harus di bawah balok dinding (4,5 m). */
const PROJECT_MAX_TOP = 4.3

/** Ukuran bingkai, dari yang paling lapang ke yang paling rapat. */
const PROJECT_SIZES = [
  { width: 3.4, height: 2.2 },
  { width: 3.0, height: 1.95 },
  { width: 2.5, height: 1.62 },
  { width: 2.2, height: 1.42 },
  { width: 1.9, height: 1.24 },
  { width: 1.66, height: 1.08 },
]

const PROJECT_WALLS = [
  { position: [0, PROJECT_WALL_Z], rotationY: 0 },
  { position: [PROJECT_WEST_X, 0], rotationY: Math.PI / 2 },
]

/** Tinggi pusat bingkai untuk tiap baris; baris atas tidak menyentuh lantai. */
function rankElevations(height, ranks) {
  const half = height / 2
  // Satu baris memakai tinggi yang sudah dipakai museum sejak awal.
  if (ranks <= 1) return [1.55]
  // Pada rak bertiang, baris bawah diturunkan supaya baris atas tetap di bawah
  // balok dinding; jarak ke lantai tetap sama dengan bingkai satu baris (0,45 m).
  const bottom = half + 0.45
  return Array.from({ length: ranks }, (_, index) => bottom + index * (height + 0.46))
}

function columnsThatFit(width) {
  return Math.max(1, 1 + Math.floor((PROJECT_SPAN - width) / (width + PROJECT_MIN_GAP)))
}

function ranksThatFit(height) {
  let ranks = 1
  while (ranks < 4) {
    const elevations = rankElevations(height, ranks + 1)
    const top = elevations[elevations.length - 1] + height / 2
    if (top > PROJECT_MAX_TOP) break
    ranks += 1
  }
  return ranks
}

function columnOffsets(count, width) {
  if (count <= 0) return []
  if (count === 1) return [0]
  const spacing = Math.min(PROJECT_MAX_SPACING, (PROJECT_SPAN - width) / (count - 1))
  return Array.from({ length: count }, (_, index) => (index - (count - 1) / 2) * spacing)
}

function buildSlots(total, size, columns, ranks) {
  const elevations = rankElevations(size.height, ranks)
  const perWall = columns * ranks
  // Satu dinding dipakai lebih dulu; baru setelah itu koleksi dibagi dua sisi.
  const shares =
    total <= perWall ? [total] : [Math.ceil(total / 2), Math.floor(total / 2)]
  const slots = []

  shares.forEach((share, wallIndex) => {
    const count = Math.min(share, perWall)
    if (count <= 0) return
    const wall = PROJECT_WALLS[wallIndex]

    const rows = []
    let rest = count
    for (let rank = 0; rank < ranks && rest > 0; rank += 1) {
      const take = Math.min(columns, rest)
      rows.push(take)
      rest -= take
    }

    // Satu kisi kolom dipakai bersama semua baris, jadi bingkai baris atas
    // selalu sejajar dengan bingkai di bawahnya.
    const gridCount = Math.max(...rows)
    const offsets = columnOffsets(gridCount, size.width)
    const postHeight =
      rows.length > 1 ? elevations[rows.length - 1] + size.height / 2 + 0.28 : null

    rows.forEach((rowCount, rank) => {
      const start = Math.floor((gridCount - rowCount) / 2)
      for (let index = 0; index < rowCount; index += 1) {
        const offset = offsets[start + index]
        slots.push({
          position:
            wallIndex === 0
              ? [offset, wall.position[1]]
              : [wall.position[0], offset],
          rotationY: wall.rotationY,
          size: [size.width, size.height],
          elevation: elevations[rank],
          rank,
          hung: rank > 0,
          // Baris atas dibaca dari agak jauh; titik berdirinya digeser ke depan
          // supaya bingkai bawah dan atas tidak berebut tombol E di titik
          // yang sama.
          standDistance: 1.4 + rank * 1.55,
          postHeight,
        })
      }
    })
  })

  return slots
}

export function projectSlotsFor(count) {
  const total = Math.max(0, Math.floor(Number(count) || 0))
  if (total === 0) return []
  const plan = planFor(total)
  return buildSlots(total, plan.size, plan.columns, plan.ranks)
}

/**
 * Pilih ukuran bingkai dan jumlah baris untuk `total` proyek.
 *
 * Urutan preferensi sengaja mempertahankan tampilan lama (bingkai besar di dinding
 * utara, memutar ke dinding barat bila perlu) dan baru menambah rak setelah dua
 * dinding penuh.
 */
function planFor(total) {
  // Bingkai lapang selama masih muat satu dinding utara.
  for (const [capacity, size] of [
    [7, PROJECT_SIZES[0]],
    [8, PROJECT_SIZES[1]],
  ]) {
    if (total <= capacity) {
      return { size, columns: columnsThatFit(size.width), ranks: 1 }
    }
  }

  // Ukuran menengah: dinding utara dulu, lalu dibagi dua dinding, lalu rak dua
  // baris. Inilah tampilan yang dipakai museum untuk koleksi biasa.
  const medium = PROJECT_SIZES[2]
  const mediumColumns = columnsThatFit(medium.width)
  const mediumRanks = ranksThatFit(medium.height)
  const mediumCapacity = mediumColumns * PROJECT_WALLS.length * mediumRanks
  if (total <= mediumCapacity) {
    const ranks = total <= mediumColumns * PROJECT_WALLS.length ? 1 : mediumRanks
    return { size: medium, columns: mediumColumns, ranks }
  }

  // Koleksi sangat besar: bingkai lebih kecil, tetap dua baris per dinding.
  for (const size of PROJECT_SIZES.slice(3)) {
    const columns = columnsThatFit(size.width)
    const ranks = ranksThatFit(size.height)
    if (total <= columns * PROJECT_WALLS.length * ranks) {
      return { size, columns, ranks }
    }
  }

  // Terakhir: rapatkan bingkai terkecil dan tambah kolom agar tidak bertumpuk.
  const base = PROJECT_SIZES[PROJECT_SIZES.length - 1]
  const ranks = ranksThatFit(base.height)
  const columns = Math.ceil(total / (ranks * PROJECT_WALLS.length))
  const width = Math.min(
    base.width,
    (PROJECT_SPAN - PROJECT_MIN_GAP * (columns - 1)) / columns,
  )
  return {
    size: { width, height: (base.height * width) / base.width },
    columns,
    ranks,
  }
}

/**
 * Pengunjung berkeliling di cincin tengah, mengitari pohon di pusat plaza.
 * Delapan titik dengan jarak sama supaya tidak ada NPC yang berdempetan.
 */
export const VISITOR_RING = 5.0
const VISITOR_BOUND = 1.35

export const VISITOR_SLOTS = Array.from({ length: 8 }, (_, index) => {
  // Digeser 22,5° supaya tidak ada NPC yang berdiri tepat di depan meja
  // Galeri Proyek (0, -7,2) atau di lorong masuk.
  const angle = (Math.PI / 4) * index + Math.PI / 8
  const x = Math.cos(angle) * VISITOR_RING
  const z = Math.sin(angle) * VISITOR_RING
  return {
    x,
    z,
    boundary: {
      minX: x - VISITOR_BOUND,
      maxX: x + VISITOR_BOUND,
      minZ: z - VISITOR_BOUND,
      maxZ: z + VISITOR_BOUND,
    },
  }
})

export const MUSEUM = {
  half: 18,
  wallHeight: 4.6,
  wallZ: -16.1,
  wallX: -16.1,
  projectWallZ: PROJECT_WALL_Z,
  visitorRing: VISITOR_RING,
  visitorSpeed: 0.72,
  sections: SECTIONS,
  sectionOrder: SECTION_ORDER,
  physicalSections: PHYSICAL_SECTIONS,
  visitorSlots: VISITOR_SLOTS,
}
