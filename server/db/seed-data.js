const now = new Date().toISOString()

export const seedProfile = {
  id: 1,
  name: 'Nama Kamu',
  headline: 'Creative Developer · Siswa RPL',
  class_name: 'XII RPL 1',
  competence: 'Pengembangan Perangkat Lunak dan Gim',
  hero_tagline: 'Portofolio yang bisa dijelajahi, bukan sekadar dibaca.',
  bio: 'Siswa rekayasa perangkat lunak yang senang membangun antarmuka yang jelas, aksesibel, dan terasa hidup. Fokus pada frontend, visualisasi 3D, dan pengalaman pengguna yang tidak membingungkan.',
  avatar_url: '',
  location: 'Indonesia',
  availability: 'Terbuka untuk kolaborasi dan kesempatan belajar',
  email: 'kamu@email.com',
  github: 'https://github.com/username',
  instagram: 'https://instagram.com/username',
  linkedin: 'https://linkedin.com/in/username',
  cv_url: '',
  career_goal:
    'Menjadi frontend engineer yang mampu menghubungkan desain, data, dan teknologi 3D menjadi pengalaman digital yang berguna. Setelah lulus, saya ingin terus belajar sambil membangun produk nyata bersama tim.',
  education: [
    'SMK Negeri 1 — Pengembangan Perangkat Lunak dan Gim (2023–2026)',
    'SMP Negeri 1 — (2020–2023)',
    'SD Negeri 1 — (2014–2020)',
  ],
  interests: [
    'Frontend engineering',
    'Desain antarmuka',
    'Grafika 3D dan WebGL',
    'Aksesibilitas web',
    'Penulisan dokumentasi teknis',
  ],
  organizations: [
    'Ketua Divisi Media dan Publikasi OSIS (2025–2026)',
    'Panitia Pameran Karya Digital sekolah (2025)',
    'Anggota tim dokumentasi kegiatan sekolah (2024–2025)',
  ],
  plk: [
    'Frontend Developer Intern di PT Digital Nusantara (2025) — membangun komponen antarmuka dan dokumentasi komponen.',
  ],
  updated_at: now,
}

export const seedSkills = [
  { name: 'HTML & CSS', category: 'hard', level: 90, note: 'Struktur semantik, layout responsif, dan animasi CSS.', sort_order: 1 },
  { name: 'JavaScript', category: 'hard', level: 85, note: 'DOM, async, modularisasi, dan manipulasi data.', sort_order: 2 },
  { name: 'TypeScript', category: 'hard', level: 74, note: 'Tipe dasar, generics, dan refactor aman.', sort_order: 3 },
  { name: 'Svelte 5', category: 'hard', level: 82, note: 'Runes, komponen, transisi, dan state lokal.', sort_order: 4 },
  { name: 'React', category: 'hard', level: 70, note: 'Komponen, hooks, dan pola state.', sort_order: 5 },
  { name: 'Three.js & WebGL', category: 'hard', level: 68, note: 'Scene graph, material, kamera, dan optimasi render.', sort_order: 6 },
  { name: 'Node.js & Bun', category: 'hard', level: 67, note: 'REST API, middleware, dan pengelolaan data.', sort_order: 7 },
  { name: 'SQL & Database', category: 'hard', level: 74, note: 'Relasi, query, migrasi, dan pemisahan repository.', sort_order: 8 },
  { name: 'Git & GitHub', category: 'hard', level: 80, note: 'Branching, pull request, dan riwayat yang rapi.', sort_order: 9 },
  { name: 'Komunikasi', category: 'soft', level: 85, note: 'Menjelaskan keputusan teknis dengan bahasa sederhana.', sort_order: 1 },
  { name: 'Kolaborasi', category: 'soft', level: 88, note: 'Bekerja dalam tim, review, dan berbagi tanggung jawab.', sort_order: 2 },
  { name: 'Pemecahan masalah', category: 'soft', level: 82, note: 'Memecah masalah besar menjadi langkah yang bisa diuji.', sort_order: 3 },
  { name: 'Manajemen waktu', category: 'soft', level: 78, note: 'Menyusun prioritas dan tenggat secara realistis.', sort_order: 4 },
]

export const seedProjects = [
  {
    title: 'Ruang Portofolio 3D',
    slug: 'portfolio-3d',
    year: '2026',
    category: 'Web Interaktif',
    summary: 'Museum portofolio isometrik yang menampilkan karya, sertifikat, dan testimoni sebagai pengalaman yang bisa dijelajahi.',
    description:
      'Portofolio interaktif berbasis Svelte 5 dan Three.js. Pengunjung berjalan di museum Wangsheng, membaca gulungan karya, dan membuka detail proyek tanpa meninggalkan halaman.',
    problem:
      'Portofolio berbentuk daftar membuat pengunjung cepat bosan dan sulit memahami konteks setiap karya. Informasi penting seperti peran, masalah, dan dokumentasi proses sering terpisah.',
    goal:
      'Menyatukan seluruh cerita portofolio dalam satu ruang yang bisa dijelajahi, dengan navigasi yang tetap mudah dan data yang bisa diubah lewat dashboard.',
    tech: ['Svelte 5', 'Three.js', 'WebGL', 'Bun', 'SQLite', 'Canvas 2D'],
    role: 'Desain pengalaman, arsitektur frontend, integrasi Three.js, animasi karakter, sistem dialog, dan pengelolaan data museum.',
    features: [
      'Museum isometrik dengan kamera 3/4 tetap',
      'Gerak klik dan mode WASD',
      'Galeri proyek dengan pencarian dan filter',
      'NPC pengunjung untuk testimoni',
      'Dashboard admin dan basis data konten',
    ],
    demo_url: 'https://example.com',
    repo_url: 'https://github.com/username',
    documentation:
      'Proses dimulai dari pemetaan konten, lalu pembuatan skema data, API, dashboard, dan dunia 3D. Setiap tahap diuji dengan build dan pengujian runtime.',
    details:
      'Dunia dibangun dari primitif Three.js agar ringan dan konsisten dengan tema tinta-kertas. Data konten dipisahkan dari kode agar admin dapat menambah proyek tanpa menyentuh source.',
    image_url: '',
    gallery: [],
    featured: 1,
    published: 1,
    sort_order: 1,
  },
  {
    title: 'Dasbor Analitik',
    slug: 'analytics-dashboard',
    year: '2025',
    category: 'Data & Dashboard',
    summary: 'Dasbor real-time untuk memantau metrik operasional dengan filter, grafik interaktif, dan alur data yang ringan.',
    description:
      'Dasbor yang dipakai tim operasional untuk memantau metrik harian, menyaring data, dan menemukan anomali tanpa menunggu laporan manual.',
    problem:
      'Laporan manual memakan waktu dan metrik penting tersebar di beberapa berkas. Tim sulit melihat perubahan secara cepat.',
    goal:
      'Memberi satu tampilan yang cepat dibaca, bisa difilter, dan tetap ringan di perangkat lapangan.',
    tech: ['TypeScript', 'Node.js', 'PostgreSQL', 'Chart.js'],
    role: 'Perancangan arsitektur data, komponen grafik interaktif, dan optimasi query.',
    features: [
      'Grafik metrik real-time',
      'Filter rentang waktu dan kategori',
      'Ringkasan anomali',
      'Ekspor data ke CSV',
    ],
    demo_url: 'https://example.com',
    repo_url: 'https://github.com/username',
    documentation:
      'Dokumentasi mencakup model data, contoh query, dan catatan optimasi indeks untuk metrik yang paling sering dibuka.',
    details:
      'Fokus utama proyek ini adalah kejelasan informasi: setiap grafik punya konteks, satuan, dan waktu pembaruan yang jelas.',
    image_url: '',
    gallery: [],
    featured: 1,
    published: 1,
    sort_order: 2,
  },
  {
    title: 'Pustaka Komponen',
    slug: 'component-library',
    year: '2024',
    category: 'Design System',
    summary: 'Sistem desain internal berisi komponen aksesibel, token warna, dan dokumentasi hidup untuk banyak produk.',
    description:
      'Pustaka komponen yang menyatukan bahasa visual beberapa produk, lengkap dengan contoh penggunaan dan panduan aksesibilitas.',
    problem:
      'Setiap produk memakai tombol, formulir, dan warna yang berbeda. Perubahan desain harus dikerjakan berulang di banyak tempat.',
    goal:
      'Membuat fondasi komponen yang konsisten, mudah dirawat, dan terdokumentasi untuk tim lintas produk.',
    tech: ['Svelte', 'TypeScript', 'Vite', 'Storybook'],
    role: 'Membangun fondasi komponen, menulis panduan aksesibilitas, dan menjaga konsistensi desain-implementasi.',
    features: [
      'Token warna dan tipografi',
      'Komponen formulir aksesibel',
      'Dokumentasi interaktif',
      'Pemeriksaan kontras dan fokus',
    ],
    demo_url: 'https://example.com',
    repo_url: 'https://github.com/username',
    documentation:
      'Setiap komponen memiliki catatan penggunaan, status, dan contoh kode. Dokumentasi diperlakukan sebagai bagian dari produk.',
    details:
      'Proyek ini mengajarkan bahwa design system bukan sekadar kumpulan komponen, tetapi kesepakatan tentang bahasa dan kualitas.',
    image_url: '',
    gallery: [],
    featured: 0,
    published: 1,
    sort_order: 3,
  },
  {
    title: 'Nusa Coffee',
    slug: 'nusa-coffee',
    year: '2025',
    category: 'E-Commerce',
    summary: 'Toko kopi daring dengan katalog biji kopi, cerita petani, dan alur langganan yang sederhana.',
    description:
      'Halaman toko kopi nusantara dengan katalog, cerita asal biji kopi, dan checkout yang dibuat sesingkat mungkin.',
    problem:
      'Cerita produk yang panjang sering hilang di tengah alur belanja. Pengguna bingung memilih kopi yang sesuai.',
    goal:
      'Menjaga cerita petani tetap terasa, sambil membuat pemilihan dan pembelian cepat di ponsel.',
    tech: ['SvelteKit', 'Stripe', 'Sanity', 'E-Commerce'],
    role: 'Desain antarmuka, integrasi pembayaran, pengelolaan konten, dan optimasi gambar produk.',
    features: [
      'Katalog dengan filter rasa',
      'Halaman cerita petani',
      'Langganan bulanan',
      'Checkout responsif',
    ],
    demo_url: 'https://example.com',
    repo_url: 'https://github.com/username',
    documentation:
      'Dokumentasi mencatat struktur konten, alur checkout, dan keputusan optimasi gambar di koneksi lambat.',
    details:
      'Gambar produk dimuat bertahap dan teks cerita ditempatkan dekat dengan keputusan pembelian, bukan di halaman terpisah.',
    image_url: '',
    gallery: [],
    featured: 0,
    published: 1,
    sort_order: 4,
  },
  {
    title: 'Rimba Notes',
    slug: 'rimba-notes',
    year: '2024',
    category: 'Aplikasi Web',
    summary: 'Aplikasi catatan offline-first dengan pencarian instan, tag, dan sinkronisasi yang tahan koneksi buruk.',
    description:
      'Catatan tetap bisa dibuka dan dicari tanpa internet, lalu disinkronkan ketika koneksi kembali.',
    problem:
      'Aplikasi catatan sering berhenti bekerja saat sinyal hilang, padahal justru saat itu catatan paling dibutuhkan.',
    goal:
      'Menyimpan data secara lokal terlebih dahulu, lalu menyinkronkan tanpa mengorbankan kecepatan pencarian.',
    tech: ['React', 'IndexedDB', 'PWA', 'Offline-First'],
    role: 'Arsitektur offline-first, pencarian lokal, desain editor, dan pengujian di jaringan lemah.',
    features: [
      'Penyimpanan lokal',
      'Pencarian instan',
      'Tag dan folder',
      'Sinkronisasi saat online',
    ],
    demo_url: 'https://example.com',
    repo_url: 'https://github.com/username',
    documentation:
      'Dokumentasi berisi strategi konflik, struktur IndexedDB, dan skenario pengujian offline.',
    details:
      'Proyek ini menekankan kejelasan status: pengguna selalu tahu apakah catatan sudah tersimpan lokal atau menunggu sinkronisasi.',
    image_url: '',
    gallery: [],
    featured: 0,
    published: 1,
    sort_order: 5,
  },
  {
    title: 'Lentera',
    slug: 'lentera',
    year: '2023',
    category: 'Microsite',
    summary: 'Microsite bercerita tentang lentera tradisional dengan transisi halus dan ilustrasi WebGL yang ringan.',
    description:
      'Sebuah cerita pendek yang bergerak pelan, memadukan tipografi, ilustrasi, dan animasi WebGL.',
    problem:
      'Konten budaya sering disajikan sebagai teks panjang tanpa pengalaman visual yang membantu memahami suasana.',
    goal:
      'Membuat cerita yang bisa dinikmati pelan tanpa mengorbankan performa di perangkat menengah.',
    tech: ['GSAP', 'WebGL', 'Storytelling', 'Three.js'],
    role: 'Arah seni, animasi cerita, dan implementasi WebGL yang ramah perangkat menengah.',
    features: [
      'Transisi bercerita',
      'Ilustrasi WebGL ringan',
      'Tipografi responsif',
      'Kontrol audio',
    ],
    demo_url: 'https://example.com',
    repo_url: 'https://github.com/username',
    documentation:
      'Dokumentasi mencatat storyboard, batas performa, dan alternatif animasi untuk perangkat lambat.',
    details:
      'Semua animasi dirancang agar bisa dipahami tanpa suara dan tetap nyaman dengan prefers-reduced-motion.',
    image_url: '',
    gallery: [],
    featured: 0,
    published: 1,
    sort_order: 6,
  },
]

export const seedCertificates = [
  {
    title: 'Sertifikat Kompetensi Junior Web Developer',
    issuer: 'BNSP',
    year: '2026',
    category: 'certificate',
    description: 'Uji kompetensi bidang pengembangan web.',
    image_url: '',
    documentation: 'https://example.com/dokumentasi-sertifikat',
    sort_order: 1,
  },
  {
    title: 'Juara 2 Lomba Web Design',
    issuer: 'SMK Negeri 1',
    year: '2025',
    category: 'award',
    description: 'Kompetisi desain dan implementasi halaman web tingkat sekolah.',
    image_url: '',
    documentation: 'https://example.com/dokumentasi-lomba',
    sort_order: 2,
  },
  {
    title: 'Sertifikat Peserta Uji Kompetensi Keahlian',
    issuer: 'SMK Negeri 1',
    year: '2026',
    category: 'certificate',
    description: 'Dokumentasi pelaksanaan UKK RPL.',
    image_url: '',
    documentation: 'https://example.com/dokumentasi-ukk',
    sort_order: 3,
  },
  {
    title: 'Pelatihan Git & GitHub',
    issuer: 'Dicoding',
    year: '2024',
    category: 'certificate',
    description: 'Dasar version control, branching, dan kolaborasi repositori.',
    image_url: '',
    documentation: 'https://example.com/dokumentasi-git',
    sort_order: 4,
  },
]

export const seedExperiences = [
  {
    type: 'plk',
    title: 'Frontend Developer Intern',
    organization: 'PT Digital Nusantara',
    period: 'Juli – Desember 2025',
    description:
      'Bekerja bersama tim produk untuk membangun komponen antarmuka, memperbaiki tampilan responsif, dan menulis dokumentasi komponen.',
    highlights: [
      'Membangun 12 komponen antarmuka yang dipakai dua produk internal.',
      'Mengurangi waktu perbaikan tampilan dengan dokumentasi penggunaan.',
      'Mengikuti review kode mingguan bersama mentor.',
    ],
    sort_order: 1,
  },
  {
    type: 'organization',
    title: 'Ketua Divisi Media dan Publikasi',
    organization: 'OSIS SMK Negeri 1',
    period: '2025 – 2026',
    description:
      'Mengelola tim kecil untuk publikasi kegiatan sekolah, termasuk desain, foto, dan penulisan caption.',
    highlights: [
      'Mengatur jadwal publikasi lintas divisi.',
      'Menyusun templat visual yang konsisten.',
    ],
    sort_order: 2,
  },
  {
    type: 'organization',
    title: 'Panitia Pameran Karya Digital',
    organization: 'SMK Negeri 1',
    period: '2025',
    description:
      'Membantu menyiapkan pameran karya siswa dan menjadi penghubung antara peserta dan pengunjung.',
    highlights: ['Menyusun denah pameran.', 'Mendampingi peserta saat presentasi karya.'],
    sort_order: 3,
  },
  {
    type: 'competition',
    title: 'Juara 2 Lomba Web Design',
    organization: 'SMK Negeri 1',
    period: '2025',
    description:
      'Membuat halaman web responsif dengan tema kebudayaan dalam waktu terbatas.',
    highlights: ['Fokus pada hierarki informasi.', 'Menyelesaikan implementasi dalam 6 jam.'],
    sort_order: 4,
  },
  {
    type: 'competition',
    title: 'Finalis Hackathon Pelajar',
    organization: 'Komunitas Digital Pelajar',
    period: '2024',
    description:
      'Bekerja dalam tim tiga orang untuk membuat purwarupa aplikasi pencatatan kegiatan sekolah.',
    highlights: ['Menyusun alur pengguna.', 'Membangun purwarupa antarmuka dan presentasi.'],
    sort_order: 5,
  },
]

export const seedTestimonials = [
  {
    name: 'Bu Ratna',
    role: 'Guru Pembimbing',
    type: 'teacher',
    organization: 'SMK Negeri 1',
    quote:
      'Dia tekun saat mengerjakan proyek, bertanya ketika menemukan jalan buntu, dan selalu berusaha memperbaiki hasilnya. Portofolio ini menunjukkan cara berpikirnya, bukan hanya hasil akhirnya.',
    avatar_url: '',
    project_slug: 'portfolio-3d',
    approved: 1,
    sort_order: 1,
  },
  {
    name: 'Bima',
    role: 'Teman Sekelas',
    type: 'friend',
    organization: 'XII RPL 1',
    quote:
      'Kalau ada yang macet di proyek tim, dia biasanya membuka dokumentasi dan mencoba mencari akar masalahnya dulu. Diskusi jadi lebih terarah.',
    avatar_url: '',
    project_slug: '',
    approved: 1,
    sort_order: 2,
  },
  {
    name: 'Nadia',
    role: 'Pengguna Dasbor',
    type: 'user',
    organization: 'Tim Operasional',
    quote:
      'Dasbornya cepat dibuka dan filternya jelas. Kami tidak perlu lagi menunggu laporan manual untuk melihat perubahan metrik.',
    avatar_url: '',
    project_slug: 'analytics-dashboard',
    approved: 1,
    sort_order: 3,
  },
  {
    name: 'Pak Damar',
    role: 'Mentor PLK',
    type: 'internship',
    organization: 'PT Digital Nusantara',
    quote:
      'Selama PLK, dia cepat menyesuaikan diri dengan alur kerja tim. Komponen yang dibuatnya rapi dan dokumentasinya memudahkan anggota lain memakainya.',
    avatar_url: '',
    project_slug: 'component-library',
    approved: 1,
    sort_order: 4,
  },
]

export const seedFeedback = [
  {
    project_slug: 'portfolio-3d',
    name: 'Bagas',
    rating: 5,
    message:
      'Pembagian perannya jelas — saya langsung paham bagian mana yang dikerjakan sendiri dan mana yang memakai pustaka orang lain.',
    approved: 1,
    created_at: '2026-11-14T11:20:00.000Z',
  },
  {
    project_slug: 'analytics-dashboard',
    name: 'Nadia',
    rating: 4,
    message:
      'Struktur datanya rapi dan mudah diikuti. Akan lebih enak kalau bagian filter diberi contoh angka keluaran.',
    approved: 1,
    created_at: '2026-11-15T09:40:00.000Z',
  },
  {
    project_slug: 'nusa-coffee',
    name: 'Pak Yusuf',
    rating: 5,
    message:
      'Halaman menu gampang dibaca di ponsel. Tolong tambahkan keterangan jam buka di bagian kontak.',
    approved: 0,
    created_at: '2026-11-16T07:05:00.000Z',
  },
]

export const seedPosts = [
  {
    title: 'Membangun Diorama Isometrik dengan Three.js',
    slug: 'diorama-isometrik-threejs',
    excerpt:
      'Catatan tentang kamera 3/4 tetap, gerak klik, dan cara menjaga dunia 3D tetap mudah dinavigasi.',
    content:
      '## Kenapa kamera tetap\n\nKamera yang bisa diorbit terlihat menarik, tetapi membuat klik tanah sulit diprediksi. Untuk diorama, saya memilih sudut 3/4 tetap agar titik yang diklik selalu terasa dekat dengan kursor.\n\n## Klik dan tombol\n\nMode klik cocok untuk pengunjung baru. Mode WASD tetap disediakan untuk yang ingin bergerak lebih cepat. Keduanya memakai controller, collider, dan animasi yang sama.\n\n## Pelajaran\n\nInteraksi yang terasa alami lebih penting daripada fitur kamera yang banyak. Batasan yang jelas justru membuat pengalaman lebih nyaman.',
    cover_url: '',
    tags: ['Three.js', '3D', 'Interaksi'],
    status: 'published',
    published_at: '2026-11-10',
    sort_order: 1,
  },
  {
    title: 'SQLite Sekarang, MySQL Nanti',
    slug: 'sqlite-sekarang-mysql-nanti',
    excerpt:
      'Cara memisahkan query dari UI agar database bisa diganti lewat environment variable, bukan menulis ulang aplikasi.',
    content:
      '## Masalahnya\n\nDatabase sering tercampur dengan kode tampilan. Saat data harus pindah dari SQLite ke MySQL, perubahan menyebar ke banyak berkas.\n\n## Lapisan adapter\n\nSaya membuat dua adapter dengan antarmuka yang sama: all, get, run, dan exec. Route hanya memanggil antarmuka itu. Perbedaan sintaks DDL disimpan di berkas skema masing-masing.\n\n## Hasil\n\nMengganti database cukup dengan DB_CLIENT dan DB_URL. Kode API, dashboard, dan museum tidak perlu diubah.',
    cover_url: '',
    tags: ['Database', 'SQLite', 'MySQL', 'Arsitektur'],
    status: 'published',
    published_at: '2026-11-12',
    sort_order: 2,
  },
]

export const seedMessages = [
  {
    name: 'Panitia UKK',
    email: 'panitia@example.com',
    subject: 'Undangan presentasi',
    message:
      'Kami ingin mengundang untuk presentasi singkat mengenai proses pembuatan portofolio ini.',
    type: 'contact',
    approved: 0,
    created_at: '2026-11-15T08:05:00.000Z',
    read_at: null,
  },
]
