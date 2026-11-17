/**
 * ============================================================
 *  EDIT KONTEN PORTOFOLIO DI FILE INI
 * ============================================================
 * Semua teks yang tampil di aplikasi berasal dari file ini.
 *
 * - `halls`    : roh pemandu di setiap pendopo halaman.
 * - `artworks` : lentera proyek (menampilkan gulungan karya).
 * - `exhibits` : gabungan keduanya, dipakai oleh dunia 3D.
 *
 * `position` memakai koordinat [x, z] di atas halaman batu.
 * `rotationY` menentukan arah lentera dan titik berdirinya:
 *   0 = menghadap +Z, Math.PI / 2 = +X, -Math.PI / 2 = -X, Math.PI = -Z.
 * `boundary` membatasi area jelajah roh pemandu.
 *
 * Gulungan proyek digambar otomatis dari metadata proyek (judul, tahun,
 * warna aksen, tag). Untuk memakai tangkapan layar asli, tambahkan `image`
 * pada objek `project`.
 */

export const profile = {
  name: 'Wangsheng',
  role: 'Creative Developer',
  tagline: 'Diorama portofolio isometrik',
  location: 'Indonesia',
  availability: 'Terbuka untuk kolaborasi',
}

/* ------------------------------------------------------------------ */
/*  ROH PEMANDU                                                        */
/* ------------------------------------------------------------------ */

export const halls = [
  {
    id: 'about',
    kind: 'guide',
    index: '01',
    title: 'Pendopo Perkenalan',
    subtitle: 'Tentang & Cerita',
    accent: '#c15a45',
    position: [-8, 0],
    heading: Math.PI / 2,
    boundary: { minX: -11.5, maxX: -4.5, minZ: -3.5, maxZ: 3.5 },
    prompt: 'Bicara dengan Mira',
    guide: {
      name: 'Mira',
      role: 'Juru Penerang',
      accent: '#c15a45',
    },
    dialog: [
      {
        speaker: 'Mira',
        text: 'Selamat datang di halaman Wangsheng. Aku Mira, roh kertas yang menjaga pendopo ini.',
      },
      {
        speaker: 'Mira',
        text: 'Klik tanah untuk berjalan. Klik dua kali, atau tahan Shift saat mengklik, untuk berlari. Tekan Tab bila kamu lebih suka memakai W A S D, dan Space untuk melompat.',
      },
      {
        speaker: 'Mira',
        text: 'Setiap lentera di halaman ini menyimpan satu karya. Dekati lentera, lalu tekan E atau klik lentera itu untuk membuka uji web langsung tanpa meninggalkan halaman.',
        tags: ['Svelte 5', 'Three.js', 'MMD', 'WebAudio'],
      },
    ],
  },

  {
    id: 'skills',
    kind: 'guide',
    index: '02',
    title: 'Pendopo Keahlian',
    subtitle: 'Tumpukan Teknologi',
    accent: '#c9a05c',
    position: [8, 0],
    heading: -Math.PI / 2,
    boundary: { minX: 4.5, maxX: 11.5, minZ: -3.5, maxZ: 3.5 },
    prompt: 'Bicara dengan Bima',
    guide: {
      name: 'Bima',
      role: 'Juru Teknis',
      accent: '#c9a05c',
    },
    dialog: [
      {
        speaker: 'Bima',
        text: 'Halo, aku Bima. Aku mencatat perkakas yang biasa dipakai untuk membangun aplikasi di sini.',
      },
      {
        speaker: 'Bima',
        text: 'Frontend: JavaScript, TypeScript, Svelte 5, React, Three.js, arsitektur CSS, dan WebGL. Fokusnya performa, aksesibilitas, dan interaksi yang terasa jelas.',
        tags: ['JavaScript', 'TypeScript', 'Svelte 5', 'React', 'Three.js', 'WebGL'],
      },
      {
        speaker: 'Bima',
        text: 'Backend: Node.js, Bun, PostgreSQL, REST API, Prisma, dan Redis. Fondasi data yang rapi dan terukur.',
        tags: ['Node.js', 'Bun', 'PostgreSQL', 'REST API', 'Redis'],
      },
      {
        speaker: 'Bima',
        text: 'Coba tekan G untuk melambai dan V untuk bersorak. Dua gerakan kecil itu cukup untuk menguji animasi karakter.',
      },
    ],
  },

  {
    id: 'projects',
    kind: 'guide',
    index: '03',
    title: 'Pendopo Karya',
    subtitle: 'Katalog Portofolio',
    accent: '#a98bb8',
    position: [0, -6],
    heading: 0,
    boundary: { minX: -3.5, maxX: 3.5, minZ: -9.5, maxZ: -4.5 },
    prompt: 'Bicara dengan Sari',
    guide: {
      name: 'Sari',
      role: 'Juru Arsip',
      accent: '#a98bb8',
    },
    dialog: [
      {
        speaker: 'Sari',
        text: 'Aku Sari, penjaga arsip. Lentera-lentera di sekeliling halaman memproyeksikan gulungan karya yang pernah dibuat.',
      },
      {
        speaker: 'Sari',
        text: 'Klik lentera dari jauh dan karakter akan berjalan ke sana sendiri, lalu uji webnya terbuka. Kalau sudah dekat, cukup tekan E.',
      },
      {
        speaker: 'Sari',
        text: 'Cobalah lentera di sisi utara dan timur halaman. Di dalamnya ada pratinjau langsung yang bisa kamu jelajahi.',
        tags: ['Uji Langsung', 'Web Embed', 'Diorama 3D'],
      },
    ],
  },

  {
    id: 'contact',
    kind: 'guide',
    index: '04',
    title: 'Pendopo Kontak',
    subtitle: 'Kolaborasi',
    accent: '#7f9b86',
    position: [0, 8],
    heading: Math.PI,
    boundary: { minX: -3.5, maxX: 3.5, minZ: 5.5, maxZ: 10.5 },
    prompt: 'Bicara dengan Damar',
    guide: {
      name: 'Damar',
      role: 'Juru Sambut',
      accent: '#7f9b86',
    },
    dialog: [
      {
        speaker: 'Damar',
        text: 'Aku Damar. Kalau ada pertanyaan, ide proyek, atau rencana kolaborasi, pintu pendopo ini selalu terbuka.',
      },
      {
        speaker: 'Damar',
        text: 'Kamu bisa menghubungi lewat tautan berikut:',
        links: [
          { label: 'Email', value: 'kamu@email.com', href: 'mailto:kamu@email.com' },
          { label: 'GitHub', value: 'github.com/username', href: 'https://github.com/username' },
          {
            label: 'LinkedIn',
            value: 'linkedin.com/in/username',
            href: 'https://linkedin.com/in/username',
          },
        ],
      },
      {
        speaker: 'Damar',
        text: 'Tekan P untuk fisika rambut dan kain, M untuk suara, dan R untuk mengembalikan kamera ke bingkai awal. Selamat berjalan-jalan.',
      },
    ],
  },
]

/* ------------------------------------------------------------------ */
/*  LENTERA PROYEK                                                     */
/* ------------------------------------------------------------------ */

const artworkDialog = (project) => [
  {
    speaker: 'Sari',
    text: project.story,
  },
  {
    speaker: 'Sari',
    text: project.role,
    tags: project.tags,
  },
  {
    speaker: 'Sari',
    text: `Tahun ${project.year}. Gulungan ini bisa langsung kamu uji lewat uji web langsung, atau buka tautan aslinya di tab baru.`,
    links: [
      {
        label: 'Buka uji web',
        value: 'Uji langsung di dalam halaman',
        action: 'open-embed',
      },
      {
        label: 'Tautan luar',
        value: project.href.replace(/^https?:\/\//, ''),
        href: project.href,
      },
    ],
  },
]

const makeArtwork = (definition) => {
  const project = definition.project
  return {
    id: `project-${definition.slug}`,
    kind: 'lantern',
    index: definition.index,
    title: project.title,
    subtitle: `${project.year} · ${project.tags[0] ?? 'Proyek'}`,
    accent: definition.accent,
    prompt: `Uji web ${project.title}`,
    position: definition.position,
    rotationY: definition.rotationY,
    size: definition.size ?? [3.3, 2.05],
    elevation: definition.elevation ?? 1.8,
    standDistance: definition.standDistance ?? 2.5,
    project,
    dialog: artworkDialog(project),
  }
}

export const artworks = [
  makeArtwork({
    slug: 'portfolio-3d',
    index: '03.1',
    accent: '#c15a45',
    position: [-8.5, -12.5],
    rotationY: 0,
    project: {
      title: 'Ruang Portofolio 3D',
      year: '2026',
      description:
        'Portofolio interaktif berbasis Svelte 5 dan Three.js, kini berbentuk diorama isometrik yang bisa dijelajahi dengan klik.',
      story:
        'Lentera tengah ini adalah halaman yang sedang kamu buka. Diorama halaman Wangsheng dengan karakter yang bisa dijelajahi, roh kertas, lentera proyek, dialog bergaya permainan klasik, dan pratinjau web langsung.',
      role:
        'Peran: desain pengalaman, arsitektur frontend, integrasi Three.js, animasi karakter, AI jelajah NPC, dan sistem dialog.',
      tags: ['Svelte 5', 'Three.js', 'WebGL', 'MMD', 'Live Embed'],
      href: 'https://github.com/username',
      palette: ['#1b1230', '#ff8a5c', '#ffd9a0'],
      heroSubtitle: 'Sebuah galeri yang bisa dijelajahi, bukan sekadar halaman.',
    },
  }),

  makeArtwork({
    slug: 'analytics-dashboard',
    index: '03.2',
    accent: '#7f9b86',
    position: [0, -12.5],
    rotationY: 0,
    project: {
      title: 'Dasbor Analitik',
      year: '2025',
      description:
        'Dasbor real-time dengan grafik interaktif, filter kompleks, dan alur data yang ringan untuk tim operasional.',
      story:
        'Gulungan ini memuat dasbor analitik real-time. Tim operasional memakainya untuk memantau metrik, menyaring data, dan menemukan anomali tanpa menunggu laporan manual.',
      role:
        'Peran: perancangan arsitektur data, komponen grafik interaktif, dan optimasi query agar tetap ringan di perangkat lapangan.',
      tags: ['TypeScript', 'Node.js', 'PostgreSQL', 'Charts'],
      href: 'https://example.com',
      palette: ['#0b2239', '#38bdf8', '#a7f3d0'],
      heroSubtitle: 'Metrik yang bergerak secepat keputusanmu.',
    },
  }),

  makeArtwork({
    slug: 'component-library',
    index: '03.3',
    accent: '#c9a05c',
    position: [8.5, -12.5],
    rotationY: 0,
    project: {
      title: 'Pustaka Komponen',
      year: '2024',
      description:
        'Sistem desain internal berisi komponen aksesibel, token warna, dan dokumentasi hidup yang dipakai lintas produk.',
      story:
        'Gulungan ini adalah pustaka komponen internal: satu bahasa visual untuk banyak produk. Di dalamnya ada komponen aksesibel, token warna, dan dokumentasi yang terus hidup.',
      role:
        'Peran: membangun fondasi komponen, menulis panduan aksesibilitas, dan menjaga konsistensi antara desain dan implementasi.',
      tags: ['Design System', 'Accessibility', 'Vite', 'Storybook'],
      href: 'https://example.com',
      palette: ['#241a12', '#f59e0b', '#fde68a'],
      heroSubtitle: 'Satu sistem, banyak produk yang tetap konsisten.',
    },
  }),

  makeArtwork({
    slug: 'nusa-coffee',
    index: '03.4',
    accent: '#b07a4f',
    position: [13.5, -4.5],
    rotationY: -Math.PI / 2,
    project: {
      title: 'Nusa Coffee',
      year: '2025',
      description:
        'Toko kopi daring dengan katalog biji kopi, langganan, dan checkout yang ringan untuk pasar lokal.',
      story:
        'Gulungan ini menampilkan halaman utama Nusa Coffee: katalog biji kopi nusantara, cerita petani, dan alur langganan yang dibuat sesederhana mungkin.',
      role:
        'Peran: desain antarmuka, integrasi pembayaran, pengelolaan konten, dan optimasi gambar produk.',
      tags: ['SvelteKit', 'Stripe', 'Sanity', 'E-Commerce'],
      href: 'https://example.com',
      palette: ['#20140d', '#d97706', '#f5e6c8'],
      heroSubtitle: 'Dari kebun ke cangkir, tanpa langkah yang rumit.',
    },
  }),

  makeArtwork({
    slug: 'rimba-notes',
    index: '03.5',
    accent: '#8a9a7a',
    position: [13.5, 4.5],
    rotationY: -Math.PI / 2,
    project: {
      title: 'Rimba Notes',
      year: '2024',
      description:
        'Aplikasi catatan offline-first dengan pencarian instan, tag, dan sinkronisasi yang tahan koneksi buruk.',
      story:
        'Gulungan ini adalah Rimba Notes, aplikasi catatan yang tetap bekerja saat koneksi hilang. Catatan disimpan lokal, dicari secara instan, lalu disinkronkan ketika jaringan kembali.',
      role:
        'Peran: arsitektur offline-first, pencarian lokal, desain editor, dan pengujian di perangkat berjaringan lemah.',
      tags: ['React', 'IndexedDB', 'PWA', 'Offline-First'],
      href: 'https://example.com',
      palette: ['#10241b', '#34d399', '#bbf7d0'],
      heroSubtitle: 'Catatan tetap ada, bahkan saat jaringan pergi.',
    },
  }),

  makeArtwork({
    slug: 'lentera',
    index: '03.6',
    accent: '#c07a86',
    position: [-13.5, -4.5],
    rotationY: Math.PI / 2,
    project: {
      title: 'Lentera',
      year: '2023',
      description:
        'Microsite bercerita tentang lentera tradisional, dengan transisi halus dan ilustrasi WebGL yang ringan.',
      story:
        'Lentera terakhir ini adalah microsite bercerita yang memadukan ilustrasi, tipografi, dan animasi WebGL halus untuk mengangkat cerita lentera tradisional.',
      role:
        'Peran: arah seni, animasi cerita, dan implementasi WebGL yang tetap ramah perangkat menengah.',
      tags: ['GSAP', 'WebGL', 'Storytelling', 'Three.js'],
      href: 'https://example.com',
      palette: ['#2a1220', '#ff6b9a', '#ffd6a5'],
      heroSubtitle: 'Sebuah cerita kecil yang bergerak pelan.',
    },
  }),
]

/* ------------------------------------------------------------------ */
/*  GABUNGAN                                                           */
/* ------------------------------------------------------------------ */

export const exhibits = [...halls, ...artworks]
export const stationMap = Object.fromEntries(exhibits.map((exhibit) => [exhibit.id, exhibit]))

/** Alias lama agar impor yang sudah ada tetap bekerja. */
export const stations = exhibits
