# Panduan Agen AI (AGENTS.md) — Museum Portofolio Wangsheng

Dokumen ini menjelaskan arsitektur, alur data, dan aturan modifikasi proyek
**Museum Portofolio 3D — Wangsheng**. Konten museum tidak ditulis di kode: semuanya
dibaca dari database dan diatur lewat dashboard admin 2D.

---

## 1. Ikhtisar Arsitektur

Proyek ini terdiri dari tiga lapisan yang berbagi satu sumber data.

| Lapisan | Teknologi | Lokasi |
| --- | --- | --- |
| **Museum 3D** (halaman publik) | Svelte 5 Runes + Three.js + MMD (`@moeru/three-mmd`) | `src/` |
| **Dashboard admin 2D** | Svelte 5 Runes (tanpa framework UI tambahan) | `src/admin/` |
| **API + database** | Bun HTTP server + SQLite (bawaan) / MySQL/MariaDB (adapter) | `server/` |

- **Package manager & runtime:** [Bun](https://bun.sh) 1.4+. Jangan gunakan npm/yarn/pnpm.
- **Framework UI:** Svelte 5 dengan **Runes** (`$state`, `$derived`, `$props`, `$effect`).
- **3D:** Three.js r187+, model PMX karakter, fisika Bullet/Ammo.js untuk rambut, kain,
  dan lengan baju (`@moeru/three-mmd-physics-ammo`; spring bone hanya cadangan).
- **Audio:** sintesis WebAudio murni di `src/audio/SoundManager.js` (tanpa file audio).
- **Database:** satu skema logis, dua dialek SQL. Ganti `DB_CLIENT` untuk pindah
  SQLite ⇄ MySQL/MariaDB tanpa mengubah kode aplikasi.

Alur singkat:

```
Browser ── /            → src/main.js → App.svelte (museum 3D)
        ── /admin       → src/main.js → AdminApp.svelte (dashboard 2D)
        ── /api/portfolio GET  ← data museum (publik)
        ── /api/messages  POST ← formulir kontak (privat)
        ── /api/testimonials POST ← testimoni pengunjung (approved = 0)
        ── /api/feedback   POST ← umpan balik per proyek (approved = 0)
        ── /api/admin/*   CRUD + upload (butuh sesi admin)
        ── /uploads/*     file hasil upload admin
```

---

## 2. Struktur Direktori

```
Portofolio/
├── AGENTS.md                  # Panduan agen AI (dokumen ini)
├── README.md                  # Dokumentasi pengguna
├── tutorial.md                # Produksi: Caddy (TLS, dist/, proxy /api + /uploads)
├── PEMBANGUNAN.md             # (dikosongkan) isinya kini di §7 dokumen ini
├── .env.example               # Contoh konfigurasi server & database
├── package.json               # Skrip Bun
├── vite.config.js             # Vite + plugin Svelte
├── shared/
│   └── content-schema.js      # SKEMA KONTEN BERSAMA: field admin, tipe data, list JSON
├── server/
│   ├── index.js               # Server Bun: API, upload, static dist/, routing
│   ├── http.js                # Helper JSON, cookie, HttpError
│   ├── auth.js                # Login admin, sesi cookie, argon2id
│   ├── db/
│   │   ├── index.js           # Memilih adapter berdasarkan DB_CLIENT
│   │   ├── sqlite.js          # Adapter bun:sqlite
│   │   ├── mysql.js           # Adapter mysql2 (MySQL/MariaDB)
│   │   ├── schema.sqlite.sql  # Skema dialek SQLite
│   │   ├── schema.mysql.sql   # Skema dialek MySQL
│   │   ├── migrate.js         # Membuat tabel + index (idempoten)
│   │   ├── seed-data.js       # Data contoh
│   │   └── seed.js            # Seed hanya bila tabel kosong
│   └── api/
│       ├── public.js          # GET /api/portfolio, POST /api/messages
│       ├── admin.js           # CRUD generik, profil, pesan, overview
│       ├── uploads.js         # Simpan gambar/PDF + bundel model PMX ke /uploads
│       └── serialize.js       # Konversi row → JSON (list, boolean, angka)
├── scripts/
│   ├── dev.js                 # Jalankan API + Vite; argumen diteruskan ke Vite (--host)
│   └── mixamo_to_mmd.js       # Pemeriksa VMD hasil Mixamo (rig.reze.one) + peta tulang
├── public/
│   ├── models/karakter/          # Model PMX + tekstur
│   └── motions/               # VMD idle / walk / run
├── data/                      # Berkas SQLite (dibuat otomatis, tidak di-commit)
└── src/
    ├── main.js                # Titik masuk: memilih App.svelte atau AdminApp.svelte
    ├── App.svelte             # Orkestrasi museum 3D: HUD, panel, indeks
    ├── app.css                # Token warna, font, dasar UI
    ├── app/PortfolioApp.js    # Menyambung data API, dunia 3D, karakter, input, panel
    ├── audio/SoundManager.js  # Suara prosedural (blip, langkah, lompat, dialog)
    ├── character/             # PMX, kontrol gerak, animasi VMD + overlay pose
    │   └── ammoPhysics.js     # Jembatan fisika Bullet/Ammo.js (diimpor dinamis, opsional)
    ├── core/                  # Engine, CameraRig isometrik, InputManager, A* nav, device, math
    ├── content/
    │   └── museum.js          # TATA LETAK museum: slot proyek, slot pengunjung, meja, papan
    ├── game/
    │   └── blackjack.js       # Mesin blackjack Kedai Kartu: dek, taruhan, jimat, kutukan
    ├── world/
    │   ├── World.js           # Menyatukan museum, koleksi, hiasan, partikel, marker
    │   ├── Props.js           # Hiasan: dupa, pot plum, tiang lentera, bangku, guci, peti
    │   ├── Museum.js          # Arsitektur: lantai, dinding, pilar, lentera
    │   ├── Exhibits.js        # Membangun koleksi dari data API
    │   ├── InfoStation.js     # Stasiun bagian: papan label, cincin, prompt, hit area
    │   ├── stationBodies.js   # Benda fisik per bagian (prasasti, rak kuas, peti, …)
    │   ├── PinBoard.js        # Papan tempel testimoni: kertas dipaku + rak tulis
    │   ├── GameTable.js       # Meja judi Kedai Kartu: perabot, kursi, lentera meja
    │   ├── BlackjackStage.js  # Kartu, keping, dan sosok bandar di atas meja (mode duduk)
    │   ├── ProjectFrame.js    # Bingkai proyek (screenshot/ gulungan + nametag)
    │   ├── Visitor.js         # NPC pengunjung: mewakili satu testimoni
    │   ├── Lighting.js        # Cahaya terarah, ambient, bayangan
    │   ├── Particles.js       # Kelopak/partikel
    │   ├── MoveMarker.js      # Penanda tujuan klik
    │   ├── groundLayers.js    # Ketinggian lapisan hiasan lantai (anti z-fighting)
    │   └── canvasTextures.js  # Tekstur dinamis: kertas, nama, prompt, wajah roh, kertas papan
    ├── ui/
    │   ├── Hud.svelte         # Identitas, tombol suara/fisika/indeks/panduan, prompt E
    │   ├── MuseumIndex.svelte # Indeks seluruh arsip (bagian, proyek, pengunjung, papan)
    │   ├── MuseumPanel.svelte # Panel 2D di atas museum + navigasi antar bagian
    │   ├── SeatHud.svelte     # Bilah permainan saat duduk di meja judi (orang pertama)
    │   ├── views/             # Isi panel: Home, About, Skills, Projects, Board, dsb.
    │   │   ├── BoardView.svelte        # Papan pengunjung: kertas, tulis, status persetujuan
    │   │   ├── BlackjackView.svelte    # (pensiun) panel Kedai Kartu lama, tidak diimpor
    │   │   ├── TestimonialsView.svelte # Dinding kertas di dalam BoardView
    │   │   └── views.css      # Gaya bersama seluruh view
    │   ├── HelpOverlay.svelte # Panduan kontrol
    │   ├── LoadingScreen.svelte # Gulungan kertas + tinta sebagai meteran progres
    │   └── WebEmbedModal.svelte # Iframe uji demo proyek
    └── admin/
        ├── AdminApp.svelte    # Dashboard: navigasi, tabel, editor, pesan
        ├── AdminLogin.svelte  # Layar masuk
        ├── AdminField.svelte  # Render field form dari skema
        ├── ModelUploader.svelte # Unggah bundel PMX + tekstur, pilih model aktif
        ├── api.js             # Fetch helper + upload
        └── admin.css          # Gaya dashboard
```

---

## 3. Perintah Penting

```bash
bun install            # pasang dependensi
bun run dev            # API (:3001) + Vite (:5173) bersama
bun run dev --host     # idem, dev server terbuka ke jaringan lokal (uji ponsel)
bun run dev:web        # hanya Vite
bun run dev:api        # hanya API (watch)
bun run build          # build produksi ke dist/
bun run start          # jalankan API + serve dist/ (produksi lokal)
bun run db:migrate     # buat/rapikan tabel
bun run db:seed        # isi data contoh bila database kosong
bun run motions:check  # periksa VMD di public/motions (durasi, tulang, akar)
```

Buka `http://localhost:5173` untuk museum dan `http://localhost:5173/admin` untuk
dashboard. Saat produksi, `bun run start` menyajikan `dist/` dan API dari port yang sama.

---

## 4. Database

### 4.1 Ganti SQLite → MySQL/MariaDB

Cukup ubah `.env` (tidak ada perubahan kode):

```bash
# .env
DB_CLIENT=mysql
DB_URL=mysql://user:password@127.0.0.1:3306/portfolio
```

Lalu jalankan `bun run db:migrate` (dan `bun run db:seed` bila ingin data contoh).
`server/db/index.js` memilih adapter dari `DB_CLIENT`; kedua adapter memakai antarmuka
yang sama (`all`, `get`, `run`, `exec`, `describe`). Perbedaan dialek hanya ada di
`server/db/schema.*.sql` dan di adapter masing-masing.

### 4.2 Tabel

`profile` (satu baris, id 1), `skills`, `projects`, `certificates`, `experiences`,
`testimonials`, `project_feedback`, `posts`, `messages`, `models`, `admin_users`,
`admin_sessions`.

`project_feedback` menyimpan umpan balik pengunjung **per proyek**: `project_id`,
`name`, `email`, `rating` (1–5), `message`, `approved`, `created_at`. Baris selalu masuk
dengan `approved = 0` dan hanya admin yang bisa menyetujui (lihat §5.4). Buku tamu sudah
tidak ada: tabel `messages` sekarang hanya berisi pesan kontak privat.

`models` menyimpan model karakter yang bisa dipilih admin: `name`, `slug` (nama folder
di `data/uploads/models/`), `pmx_url`, `preview_url`, `scale`, `note`, dan `active`.
Hanya satu baris boleh `active = 1`; `GET /api/portfolio` mengirimkannya sebagai
`character: { name, model_url, scale }`. Bila `null`, museum memakai
`CONFIG.assets.model`; bila berkas itu juga tidak ada, museum **tidak berjalan** dan
layar pemuatan menampilkan pesan “tidak ada model karakter” beserta cara memperbaikinya.

Kolom bertipe daftar (`education`, `tech`, `features`, `gallery`, `highlights`, `tags`,
`interests`, `organizations`, `plk`) disimpan sebagai `TEXT` berisi JSON array dan
diubah kembali menjadi array oleh `server/api/serialize.js`.

### 4.3 Menambah field konten

1. Tambahkan field ke `shared/content-schema.js` pada resource terkait.
2. Tambahkan kolom di `server/db/schema.sqlite.sql` **dan** `server/db/schema.mysql.sql`.
3. Jalankan `bun run db:migrate`.
4. Form admin dan API otomatis mengikuti skema — tidak perlu mengubah kode CRUD.

### 4.4 Akun admin

Dibuat otomatis saat tabel `admin_users` masih kosong, memakai
`ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` dari `.env`. Bila tidak diisi, dipakai
fallback `admin@wangsheng.local` / `admin12345` dan server mencetak peringatan.
Ganti sebelum produksi.

---

## 5. Fitur Utama

### 5.1 Museum 3D dari Data

- `PortfolioApp.init()` memuat `GET /api/portfolio` lalu membangun `World`.
- `World` = `Museum` (arsitektur statis) + `Exhibits` (koleksi dari database) +
  partikel + penanda tujuan.
- **Denah museum** adalah cincin galeri: plaza batu (pohon plum di pusat) dikelilingi
  meja — Beranda, Tentang, dan Testimoni di sisi selatan menghadap pintu masuk;
  Keahlian, Sertifikat, Pengalaman di barat; Kontak, CV, Catatan di timur; serta
  **Galeri Proyek di tengah sumbu x** (0, −7,2) menghadap ke selatan, tepat di depan
  barisan bingkai proyek di dinding utara. Beranda berada tepat di depan spawn dan
  memakai cincin penanda kedua (`InfoStation.landmarkRing`) sebagai titik mulai.
  Ukuran lantai diatur `world.platformHalf` (18); ruangan 36 × 36 m membuat
  perjalanan antar-meja tetap dekat tanpa terasa sesak.
- **Stasiun bagian** (`InfoStation`) dibangun dari `PHYSICAL_SECTIONS` di
  `src/content/museum.js`; panel hanya terbuka saat karakter tiba di benda bagiannya
  (atau di bingkai proyek / di dekat pengunjung / di papan testimoni). `InfoStation`
  tinggal mengurus hal yang seragam — papan label melayang (1,02 × 0,7 m di y 1,5),
  label nama, prompt `E`, ring penanda, dan hit area — sedangkan **bentuk bendanya
  berbeda per bagian** di `src/world/stationBodies.js`, dan setiap bentuk menjawab
  “bagian ini isinya apa”:

  | Bagian | Benda | Yang dibacanya |
  | --- | --- | --- |
  | Beranda | meja penerima setengah lingkaran | buku catatan terbuka, peta museum tergulung, lonceng panggil, tiang lentera kertas |
  | Tentang | altar bulat dengan naskah potret **terbentang mendatar** | siluet tinta kepala–bahu, baris keterangan, cap nama, dupa |
  | Keahlian | tangga bilah bambu | lima bilah bertingkat (tinggi = tingkat keahlian), kuas menggantung, batu tinta |
  | Proyek | korsel bingkai mini **berputar** | empat bingkai mini menghadap keluar, katalog tergulung, lonceng kurator |
  | Sertifikat | dinding piagam | tiga pigura dengan cap lilin dan pita berayun, nampan gulungan |
  | Pengalaman | peta perjalanan tergelar | jalur tinta, tiga pin lokasi berflag, kompas, buku agenda, tongkat bambu |
  | CV | meja tulis + rak penjemuran naskah | naskah ditahan pemberat batu, tumpukan salinan, tiga lembar bergantung |
  | Kontak | tiang pos | kotak surat bercelah dengan tiga surat, bendera, lonceng bertali, nampan amplop berlak |
  | Catatan | meja baca bersandar | buku terbuka di sandaran, gulungan bertali, lentera kertas berdenyut |

  Semua benda ≤ 1,5 m di tengah, elemen tinggi diletakkan di samping supaya papan
  label tetap terbaca, dan tiap benda punya satu gerak tanda tangan (lonceng berayun,
  lentera berdenyut, korsel berputar, pita/flag bergoyang, kertas berjemur).
- **Bingkai proyek** (`ProjectFrame`) memakai `projectSlotsFor(jumlahProyek)` dan
  **selalu** mendapat satu slot untuk setiap proyek di database — tidak ada lagi
  batas 20. Tata letaknya dipilih berurutan: (1) satu baris saja sambil mengecilkan
  bingkai (3,4 m → 1,66 m); bila dinding utara tidak cukup, koleksi dibagi rata ke
  dinding utara dan barat supaya tidak ada dinding yang kesepian;
  (2) bila dua dinding penuh satu baris (±20 bingkai), muncul **rak bertiang** dua
  baris dengan bingkai atas digantung pada tiang baris bawah; (3) untuk koleksi yang
  benar-benar besar, bingkai terkecil dirapatkan dan lebarnya diperkecil lagi.
  Bingkai baris atas punya titik berdiri lebih jauh (1,4 m + 1,55 m per baris), jadi
  berdiri dekat dinding memilih bingkai bawah dan melangkah mundur memilih bingkai
  atas. Label nama melayang di atas bingkai dan hanya terlihat saat pemain mendekat.
- **Kamera isometrik** (`CameraRig`) mendukung rotasi bertahap penuh 360°: seret
  tombol kanan (atau tengah) memutar 15° per 60 px. Tidak ada orbit bebas — `pitch`
  tetap, jadi diorama selalu isometrik. `R` mengembalikan sudut ke awal. Dinding
  utara/barat otomatis disembunyikan bila kamera berada di belakangnya, punggung
  bingkai proyek diberi panel kayu, dan cahaya pengisi mengikuti sisi kamera
  (`Museum.update`/`Lighting.update` menerima posisi kamera).
- **Label melayang** memakai `src/world/floatingText.js`: label nama terlihat jelas hanya
  saat pemain dekat (meja 2.2–4.2 m, bingkai 3.6–7.2 m, pengunjung 2.5–4.8 m) lalu
  memudar dengan `applySpriteFade()`. Label meja dan bingkai memakai mode `compact`
  (satu baris, tanpa subjudul) dari `createNameplateTexture()`. Prompt `E` hanya tampil
  untuk koleksi yang sedang aktif, sehingga dunia tidak dipenuhi teks.
- **NPC pengunjung** (`Visitor`) mewakili **satu** testimoni yang disetujui — bukan
  daftar gabungan. Testimoni kiriman pengunjung yang masih `approved = 0` tidak ikut
  dimuat `GET /api/portfolio`, jadi tidak pernah menjadi NPC. Mereka berjalan dalam
  boundary masing-masing dan berhenti saat diajak bicara.
- **Papan tempel testimoni** (`src/world/PinBoard.js`) **menggantikan meja Testimoni**: bagian
  Testimoni tidak punya `InfoStation` lagi (entri `SECTIONS.testimonials` sengaja tanpa
  `position`), dan papan inilah stasiunnya. Ia memakai id `section-testimonials` supaya
  seluruh navigasi lama (`MuseumIndex`, `visitView`, fallback pengunjung) tetap menuju ke
  sini, tetapi `kind`-nya `board` sehingga yang terbuka adalah `BoardView`. Papan berdiri di
  (7,2; 11,9) di sisi selatan (tempat meja lama), menghadap pintu masuk: goni berbingkai
  kayu dengan dua tiang A, batang bambu, dua kertas gantung “留言”, dan rak kecil berisi
  tumpukan kertas kosong, batu tinta, serta kuas. Testimoni yang **sudah disetujui** dipaku
  sebagai kertas 0,4 × 0,5 m (kisi 4 × 2, pin vermilion, cap kategori) dengan tekstur
  `createPinNoteTexture()`; namanya bisa dibaca dari jarak 3,4–7 m. Interaksi memakai
  `kind: 'board'` (`interactRadius` 1,7; berdiri 1,5 m; collider 0,8) sehingga
  `PortfolioApp.openStation()` membuka `BoardView`, bukan panel bagian biasa.
  Setelah pengunjung menempelkan tulisannya, `World.postBoardNote()` langsung memaku
  kertas baru **di dunia 3D** dengan cap `待審` (menunggu admin) tanpa memuat ulang.
- **Meja judi “Kedai Kartu”** (`src/world/GameTable.js`) adalah stasiun tambahan, bukan meja
  informasi: entri `SECTIONS.games` sengaja tanpa `position`, dan mejanya berdiri sendiri di
  sela timur-selatan (7,2; 7,2) — diagonal satu-satunya yang masih kosong antara meja Kontak
  dan papan testimoni. Meja bundar kayu dengan alas kain, dua kotak taruhan, sepatu kartu,
  tumpukan keping, dua bangku rendah, dan lentera kertas bertiang besi. `kind`-nya `game`
  sehingga `openStation()` memanggil `enterSeat()`: kamera pindah ke kursi (orang pertama),
  karakter disembunyikan, kartu digambar `BlackjackStage` di atas kain, dan antarmukanya
  hanya `SeatHud` (bilah bawah) — **bukan panel 2D**.
  Collider meja 1,0 m ditambah penghalang bangku/tiang disimpan di `this.colliders` (array)
  yang ikut dibaca `Exhibits.colliders` dan `World.staticColliders`. **Aturan mainnya tidak
  di sini**: seluruh perhitungan ada di `src/game/blackjack.js`.
- **Pathfinding A\*** (`src/core/navigation.js`): `NavGrid` membangun grid 0,4 m
  dari collider statis (`World.staticColliders`; pengunjung yang bergerak tidak
  masuk grid) lalu `findPath()` menjalankan A* 8 arah tanpa memotong sudut.
  Hasilnya dihaluskan dengan string pulling, dan `CharacterController` mengikuti
  waypoint satu per satu. Bila karakter macet, rute dihitung ulang maksimal dua
  kali sebelum menyerah. Tanpa rute, karakter kembali ke jalur lurus.
- Menekan `E` dekat objek, atau mengklik objek dari jauh (karakter berjalan ke sana
  lalu membuka interaksi), memanggil `openStation()`.
- Pengunjung membuka **dialog percakapan sendiri** (`src/ui/VisitorDialog.svelte`) berisi
  nama, peran, kategori, dan kutipan testimoni orang tersebut, dengan efek mesin tik.
  `PortfolioApp.openVisitor()` memanggil callback `onTestimonial`, berbeda dari
  `openView()` yang membuka panel 2D. Klik pengunjung di `MuseumIndex` juga menuju
  dialog yang sama; bila testimoni melebihi jumlah slot NPC (8), karakter berjalan ke papan
  dan `BoardView` menampilkan seluruh kertas yang disetujui.

### 5.2 Panel 2D di Atas Museum

`MuseumPanel.svelte` merender view sesuai `activeView`:

| Bagian | View | Isi |
| --- | --- | --- |
| Beranda | `HomeView` | Avatar, nama, kelas, personal branding, keahlian utama, tombol portfolio/CV/kontak |
| Tentang Saya | `AboutView` | Biodata, pendidikan, minat, organisasi, PLK, tujuan karier |
| Keahlian | `SkillsView` | Hard/soft skill dengan persentase |
| Galeri Proyek | `ProjectsView` + `ProjectDetailView` | Pencarian + filter kategori; detail lengkap, dokumentasi, dan **umpan balik pengunjung** (daftar yang disetujui + formulir nilai 1–5 yang menunggu persetujuan admin) |
| Sertifikat | `CertificatesView` | Sertifikat & prestasi + dokumentasi |
| Pengalaman | `ExperienceView` | PLK, organisasi, lomba (dengan filter) |
| CV Digital | `CvView` | Resume satu halaman, cetak/simpan PDF, unduh berkas CV |
| Kontak | `ContactView` | Email/GitHub/Instagram/LinkedIn + formulir kontak (privat) |
| Catatan Ngoding | `BlogView` | Artikel markdown ringan |
| Testimoni | `BoardView` | **Papan pengunjung**: kertas dipaku (klik untuk membaca, filter kategori) + mekanik ambil kertas, cap kategori, tempel, status persetujuan |
| Kedai Kartu | `SeatHud` (bukan panel) | **Mini-game blackjack orang pertama**: duduk di meja, kartu 3D di atas kain, bilah HUD di bawah. Jimat & kutukan baru terbuka **babak 3**; tiga tingkat kesulitan (default Normal), saldo di `localStorage` |

Navigasi: pemain harus **mendatangi** meja, bingkai, NPC, atau papan. `MuseumIndex`, tombol
navigasi di panel, dan kartu proyek di Galeri semuanya mengantar karakter ke tujuan
(`PortfolioApp.visitView()` / `visitStation()`); panel tidak bisa dibuka langsung dari
daftar, rail bagian dan tombol angka sudah dihapus, dan detail proyek baru terbuka
setelah pemain berdiri di depan bingkai proyeknya.

Jarak interaksi diukur dari **pusat objek/NPC** (`anchor`), bukan dari titik berdiri:
meja `interactRadius 1.45`, bingkai proyek `1.8` (`3.35` untuk bingkai baris atas agar
bisa dijangkau dengan melangkah mundur), pengunjung `1.15`.
`CONFIG.world.interactDistance` hanya dipakai sebagai cadangan bila sebuah koleksi
tidak menentukan radiusnya sendiri. `infoStation`/`ProjectFrame`
menyimpan `interaction` (titik berhenti, 1.15–1.4 dari objek) dan `anchor` (pusat objek).

Prop hiasan di `src/world/Props.js` adalah pengisi ruang: dudukan dupa, pot plum,
tiang lentera kertas, bangku batu, guci keramik, lentera galeri, dan peti arsip.
Semua prop tanah mendaftarkan collider di `Props.colliders`, dan `World`
memasukkannya ke `staticColliders` **sebelum** `NavGrid` dibangun.

### 5.3 Dashboard Admin 2D

- Login sesi cookie (HttpOnly) dengan password argon2id.
- CRUD generik untuk proyek, keahlian, sertifikat, pengalaman, testimoni, catatan,
  dan model karakter.
- Editor profil lengkap (termasuk daftar pendidikan/minat/organisasi/PLK).
- Unggah gambar/PDF ke `/uploads` lewat `AdminField` → `uploadFile`.
- **Model karakter (PMX)**: bagian “Model Karakter” punya pengunggah sendiri
  (`src/admin/ModelUploader.svelte`) yang menerima **satu folder** berisi `.pmx` +
  teksturnya. Browser mengirim `paths` (jalur relatif, urutan sama dengan `files`)
  sehingga server menulis berkas ke `data/uploads/models/<slug>/…` dengan struktur yang
  sama — PMX merujuk tekstur lewat jalur relatif (`tex/face.png`), bukan URL absolut.
  Tiap unggahan membuat baris `models` yang **belum aktif**; tombol **Pakai** di tabel
  menjalankan `PUT /api/admin/models/:id` dengan `{ active: true }`, dan server
  mematikan model lain (`UPDATE models SET active = 0 WHERE id <> ?`). Baris tanpa
  `pmx_url` ditolak saat diaktifkan. Hapus baris model ikut menghapus foldernya.
- **Pratinjau model 360°**: tombol **Pratinjau** di baris tabel membuka
  `src/admin/ModelPreview.svelte` — meja putar three.js dengan latar kertas, cahaya ruang
  pamer, dan alas tinta. Seret memutar **tanpa batas** (yaw bebas), gulir/sentuh
  memperbesar (0,55–2,2×), `Esc` menutup, dan sakelar “Putar otomatis” memutar 0,55 rad/s.
  Komponen ini **diimpor dinamis** saat tombol ditekan supaya three.js ±600 kB tidak ikut
  masuk bundel dashboard; jangan mengimpor statis dari `AdminApp.svelte`. `onMount`
  melepas renderer (`dispose()` + `forceContextLoss()`), membatalkan rAF, melepas
  listener pointer, dan memulihkan `body.overflow`.
- Kotak masuk pesan: tandai dibaca dan hapus (pesan kontak bersifat privat, tidak
  pernah tampil di museum).
- **Umpan balik proyek**: filter **Semua / Menunggu / Ditampilkan**, tombol
  **Setujui / Sembunyikan** per baris, banner jumlah kiriman tertunda, dan kartu
  “Perlu tindakan” di Ringkasan. Kolom `Proyek` menampilkan nama proyek, bukan ID mentah.
- Persetujuan testimoni: filter **Semua / Menunggu persetujuan / Sudah tampil**, tombol
  **Setujui / Sembunyikan** langsung di baris tabel, banner jumlah kiriman tertunda, dan
  badge di navigasi samping (memakai `counts.testimonialsPending`).
- Ringkasan jumlah konten dan pesan belum dibaca.
- **Antrean tindakan di Ringkasan**: panel "Perlu tindakan" hanya berisi hal yang benar-benar
  menunggu (testimoni tertunda, pesan belum dibaca, proyek draf) dan menautkan ke bagiannya.
  Angka di kartu ringkasan memakai catatan faktual (`tampil · draf`, `n menunggu`).
- **Tanpa `confirm()` bawaan browser**: hapus data membuka **dialog konfirmasi**
  (`.confirm-modal`, `role="alertdialog"`, cap 刪) dengan nama entri, peringatan bahwa
  museum ikut berubah, serta tombol Batal / Ya, hapus. `Esc` dan klik latar membatalkan.
  Tidak ada bar bawah dan tidak ada dialog sistem.
- **Editor tidak membuang isian tanpa peringatan**: klik latar dan `Esc` hanya menutup bila
  `dirty` masih `false`; selain itu muncul catatan "Isian belum disimpan" dan editor tetap
  terbuka. `Batal` tetap membuang perubahan secara sadar.
- **Fokus & latar**: saat dialog terbuka, `.modal-backdrop` menutupi seluruh layar
  sehingga latar tidak bisa diklik, dan dialog editor/konfirmasi menerima fokus
  (`modalEl`, `confirmEl`). Laci sidebar (≤900 px) memakai `visibility: hidden` saat
  tertutup, bukan `inert` — tidak bisa diklik dan tidak masuk urutan `Tab`.
- **Navigasi tidak boleh memanggung**: layar “Membuka arsip…” hanya menunggu
  `/api/auth/me`; data bagian dimuat setelah dashboard tampil. Setiap permintaan di
  `src/admin/api.js` memakai `AbortSignal.timeout(12_000)`, dan penjaga 15 detik
  menampilkan pesan + tombol muat ulang bila pemeriksaan sesi tidak selesai.
  `selectSection()` selalu `scrollTo(0, 0)` supaya bagian baru tampil dari atas.
- **Item navigasi adalah `<a href={pathFor(key)}>`**, bukan `<button>`: bisa dibuka di
  tab baru dan tetap bekerja bila handler JS gagal. `handleNav()` hanya mencegah
  perilaku bawaan untuk klik kiri tanpa modifier; klik pada bagian yang aktif cuma
  mengembalikan gulir ke atas.
- **Form hanya dirender setelah datanya ada.** `profileReady`/`messagesReady` mencegah
  form kosong yang tampak “belum terbuka” (dan mencegah isian tertimpa data server);
  selama menunggu tampil “Memuat …” + tombol **Muat ulang** bila gagal. Tombol simpan
  nonaktif sampai data siap. `touch-action: manipulation` dipasang pada kontrol agar
  tidak ada jeda ketuk ~300 ms.
- **URL sungguhan, bukan hash**: `/admin`, `/admin/projects`, `/admin/messages`, …
  `selectSection()` menulis `history.pushState`, tombol Back/Forward ditangani `popstate`,
  dan `onMount` membaca `location.pathname` sehingga F5 membuka bagian yang sama.
  `src/main.js` memilih dashboard lewat regex `/^\/admin(?:\/|$)/`, jadi `/administrator`
  tetap museum. Path seperti itu disajikan `index.html` oleh Vite (SPA fallback) dan
  `serveStatic` di `server/index.js`.
- **Dashboard bisa digulir**: `src/app.css` mengunci `body { overflow: hidden }` untuk
  kanvas museum, jadi `AdminApp` menambahkan class `admin-mode` pada `<html>`/`<body>`
  (dilepas saat unmount) dan `admin.css` mengembalikan `height`, `overflow`, serta
  `#app { height: auto }`. Tanpa ini halaman Profil terpotong satu layar dan kolom di
  bawahnya tidak pernah terjangkau.
- **Pencarian mengikuti skema**: semua field `text`/`textarea`/`select`/`list`/`number` ikut
  dicari, bukan daftar nama field yang di-hardcode (isi testimoni `quote` dulu tidak
  pernah ketemu).
- **Kegagalan server tidak disamarkan jadi layar login**: hanya `401` yang membuka
  `AdminLogin`; error lain menampilkan `bootError` beserta cara memperbaikinya.
- **Ponsel**: tabel berubah menjadi daftar bertumpuk (`data-label` + `td::before`), input
  16 px di `pointer: coarse`, target ketuk ≥44 px, semua tinggi memakai `100dvh` dengan
  fallback `100vh`, dan bar konfirmasi/toast menghormati `env(safe-area-inset-bottom)`.
- Semua perubahan langsung dipakai museum pada pemuatan berikutnya (tanpa mengubah kode).

### 5.4 Formulir Kontak & Umpan Balik Proyek

`POST /api/messages` menerima `{ name, email, subject, message }` dan **hanya** membuat
pesan kontak privat; tidak ada jalur untuk menerbitkan isinya ke museum. Ada rate limit
5 kiriman / 10 menit per IP yang dipakai bersama endpoint publik lain.

`POST /api/feedback` menerima `{ project_id, name, email, rating, message }`:

- proyek harus ada dan `published = 1` (draf tidak punya tempat tampil);
- nama 2–80 karakter, pesan 10–800 karakter, `rating` dipangkas ke 1–5;
- baris **selalu** disimpan dengan `approved = 0`; tidak ada parameter dari klien yang
  bisa mengubahnya;
- hanya baris `approved = 1` yang dikirim `GET /api/portfolio` (`feedback: [...]`), jadi
  umpan balik yang belum ditinjau tidak pernah sampai ke museum.

Admin meninjaunya di **Umpan Balik Proyek** pada dashboard: tombol Setujui/Sembunyikan
per baris, filter Menunggu, dan hitungan antrean di Ringkasan.

### 5.5 Testimoni dari Pengunjung (Papan Tempel + Moderasi Admin)

Alurnya bukan formulir di panel, melainkan benda di dunia:

1. Pemain mendatangi **papan pengunjung** (`PinBoard`, id `section-testimonials`, di
   7,2; 11,9). Papan ini *adalah* bagian Testimoni: tidak ada meja Testimoni lagi, jadi
   indeks museum, panel, dan navigasi lama semuanya berakhir di papan yang sama.
2. `BoardView` menampilkan dinding kertas yang sudah dipaku (klik untuk membaca penuh,
   filter kategori, jumlah kertas) lalu mekanik tiga langkah: **ambil selembar kertas**
   dari tumpukan → tulis nama, pilih satu cap kategori (`師/友/客/職`, bukan dropdown),
   tulis kesan dengan meter tinta → **tempelkan di papan**.
3. Status persetujuan dibuat eksplisit di dua tempat: kertas kiriman sesi ini tampil
   paling depan dengan cap `待審` dan strip “menunggu persetujuan admin”, dan langkah
   terakhir memakai kartu status tiga tahap (ditempel → menunggu admin → tampil).
4. `POST /api/testimonials` menerima `{ name, role?, organization?, type?, quote }`.
   Validasi: nama 2–80 karakter, testimoni 10–800 karakter, `type` dibatasi nilai
   `TESTIMONIAL_TYPES`. Rate limit berbagi dengan formulir pesan (5 / 10 menit / IP).
5. Kertas langsung dipaku di papan 3D lewat `PortfolioApp.postBoardNote()` →
   `World.postBoardNote()` dengan cap `待審`, jadi hasil tindakan terlihat tanpa
   memuat ulang (disertai lambaian karakter dan suara kertas).

Baris **selalu** disimpan dengan `approved = 0` — endpoint publik tidak pernah boleh
menerbitkan testimoni sendiri. Karena `getPortfolio()` hanya membaca
`WHERE t.approved = 1`, kiriman yang belum ditinjau tidak terlihat di mana pun saat
museum dimuat ulang: tidak muncul sebagai kertas di papan, dan `Exhibits` tidak membuat
`Visitor` untuknya.

Admin menyetujui lewat `PUT /api/admin/testimonials/:id` dengan `{ approved: true }`
(tombol cepat di tabel atau field `approved` pada editor). Setelah disetujui, testimoni
langsung dipakai museum pada pemuatan berikutnya — tanpa mengubah kode.

---

## 6. Pedoman Modifikasi

1. **Konten jangan di-hardcode.** Teks, proyek, sertifikat, testimoni, dan tautan berasal
   dari database. Yang tetap di kode hanya tata letak (`src/content/museum.js`) dan gaya.
2. **Pakai Svelte 5 Runes**; jangan menambahkan store Svelte 3/4.
3. **Pembersihan resource Three.js:** sediakan dan panggil `dispose()` untuk geometri,
   material, dan tekstur.
4. **Verifikasi build:** jalankan `bun run build` setelah perubahan kode.
5. **Uji alur nyata:** jalankan `bun run dev`, lalu pastikan museum termuat, meja/panel
   bisa dibuka, dan admin bisa menyimpan perubahan.
6. **Jangan memecah abstraksi database.** Query khusus MySQL/SQLite hanya boleh ada di
   `server/db/` (adapter + skema), bukan di route API atau UI.
7. **Hiasan lantai wajib memakai `GROUND_LAYER`** (`src/world/groundLayers.js`). Cincin
   meja, bayangan kontak karakter, penanda tujuan, dan pelat plaza tidak boleh memakai
   angka `y` yang sama: dua bidang datar di ketinggian sama saling berebut kedalaman
   dan berkedip (z-fighting) saat kamera berputar. Material transparan datar juga
   memakai `DECAL_TUNING` (`polygonOffset` negatif) sebagai jaring pengaman.
8. **Hiasan tidak boleh saling menembus secara tidak sengaja.** Bola-bola dekoratif
   (mahkota pohon, bunga) harus berjarak antar-pusat **≥ jumlah jari-jarinya**. Dulu
   mahkota pohon kecil di plaza memakai lima bola seukuran pada cincin 0,22 m sehingga
   tiap pasangan menembus ±4 cm dan garis potongnya terbaca sebagai tumpang tindih.
   Gumpalan besar boleh memakai satu geometri bersudut (`IcosahedronGeometry` +
   `flatShading`) dengan bunga kecil yang menempel di permukaannya.
9. **Validasi input** tetap di server (`server/api/*`), bukan hanya di form.
10. **Aksesibilitas:** tombol nyata, label form, fokus terlihat, `Esc` menutup panel/modal.
11. **Animasi harus punya poros yang benar.** Aturan yang dipakai di dunia 3D:
   - benda gantung (lentera, kuas, pita, kertas, label bagasi) diayunkan dari **titik
     gantungnya**, jadi poros grup ditaruh di atas dan isinya menjuntai ke bawah;
   - benda yang dipaku, ditanam, atau berdiri di lantai (papan label, kertas di papan,
     tiang, kanopi pohon, lonceng meja) **tidak** bergoyang atau berputar;
   - tidak ada putaran penuh kecuali korsel Proyek (satu putaran ±40 detik);
   - nyala cahaya berdenyut lambat (periode ≥5 detik, amplitudo ≤5% dari nilai dasar);
     kedip cepat membuat dunia terasa seperti lampu rusak;
   - papan label bergerak maksimal 4 mm dan tidak bergulir, supaya teks tetap terbaca;
   - badge prompt `E` memakai irama yang sama di semua objek (1,5 Hz, ±2 cm).
12. **Pose overlay karakter selalu relatif terhadap pose animasi murni.** Jangan pakai
    `bone.quaternion` saat ini sebagai titik tolak: pustaka MMD menyimpan cache pose
    **setelah** overlay kita, jadi delta yang sama akan ditambahkan lagi tiap frame
    (tangan naik terus, kepala berputar penuh). `AnimationController.pose()` menyimpan
    pose dasar per tulang di `_overlayBase`, dan `Character.updateWithMixer()`
    memulihkannya lewat `overlay.restore()` tepat sebelum `mixer.update()`.
13. **Animasi hanya dari berkas VMD di `public/motions/`.** Hanya tiga slot yang
    ada: `idle.vmd`, `walk.vmd`, `run.vmd` (klip Mixamo yang di-retarget lewat
    <https://rig.reze.one/>). Jangan menambah klip yang dibangun di runtime
    (dulu ada `jumpMotions.js` + `vmd.js` untuk klip lepas landas — sudah dicabut
    dan tidak boleh dihidupkan lagi): aplikasi harus bisa dibuka dengan folder
    `public/motions/` apa adanya. Lompat tetap fungsi game, tetapi posenya
    prosedural (`updateJump`/`applyJump`/`applyLand`), bukan klip. Aturan lain:
    - `AnimationController.load()` hanya memuat `BASE_CLIPS`; kunci lain di
      `CONFIG.assets.motions` diabaikan;
    - jangan biarkan klip/animasi yang gagal memuat menggagalkan `init()`:
      tanpa klip, karakter kehilangan gerak; tanpa museum, seluruh halaman mati.
14. **Fisika memakai Ammo.js (Bullet), bukan spring bone.**
    `@moeru/three-mmd-physics-ammo` menyimulasikan rambut, kain, dan lengan baju
    sebagai rigid body + constraint lewat `MMDAmmoPlugin`, didaftarkan ke
    `MMDLoader` **sebelum** `loadAsync` (plugin itu yang menginisialisasi runtime
    Ammo; `initAmmo()` hanya perlu untuk pemakaian `MMDAmmoPhysics` langsung).
    - Satu model = **satu** plugin fisika. Jangan mendaftarkan ammo dan spring
      bone bersamaan: keduanya memasang `mmd.physics` dan hasilnya berkelahi.
    - Ammo diimpor **dinamis** lewat `src/character/ammoPhysics.js`. Jangan
      menaruh `import ... from '@moeru/three-mmd-physics-ammo'` di jalur kritis
      (`main.js`, `App.svelte`, `PortfolioApp.js`): paket yang belum terpasang
      tidak boleh membuat halaman kosong.
    - `Character.load()` mencoba ammo lalu spring bone; mesin yang menang
      dilaporkan di `character.physicsEngine` dan di `getDebugInfo()`.
    - Jangan menambah `optimizeDeps.include` untuk paket ini: kalau paket belum
      terpasang, Vite gagal start sebelum museum sempat memakai cadangan.
15. **Layar sentuh hanya boleh memakai mode klik.** `isTouchDevice()`
    (`src/core/device.js`) membedakan ponsel/tablet (`pointer: coarse` **dan**
    `hover: none`) dari laptop layar sentuh. Bila bernilai true:
    - `PortfolioApp.controlMode` dikunci `'point'` sampai akhir sesi —
      `setControlMode('keys')` harus mengembalikan `'point'`, dan `Tab` tidak
      boleh membuka mode tombol;
    - `InputManager` wajib menangani gestur sentuh: ketuk = klik (diputuskan saat
      `pointerup` dengan toleransi 14 px/800 ms), seret satu jari = putar 48 px
      per langkah, cubit dua jari = zoom. Jangan memakai `pointerdown` sebagai
      klik untuk sentuh, karena setiap seretan akan ikut memindahkan karakter;
    - jangan memanggil `onHover` untuk `pointerType === 'touch'`: tidak ada hover
      di layar sentuh;
    - HUD menyembunyikan sakelar mode dan baris tombol papan ketik, menampilkan
      petunjuk gestur, dan menaruh tombol sistem dalam satu baris di bawah dengan
      tinggi ≥ 44 px serta `env(safe-area-inset-*)`;
    - jangan memakai `100vh` untuk panel baru; pakai `100dvh` agar bilah alamat
      ponsel tidak memotong panel.
    Jangan mendeteksi perangkat lewat `navigator.userAgent`.
16. **Satu tema saja (gelap) dan tanpa backsound berdengung.**
    - Tidak ada tombol gelap/terang dan tidak ada `document.documentElement.dataset.theme`.
      Palet tinggal satu: token di `src/app.css`. Jangan menambah tema kedua tanpa
      diminta.
    - `SoundManager` hanya memainkan efek pendek (langkah, lompat, blip, panel).
      Jangan menambahkan osilator yang berbunyi terus-menerus — pad ambient lama
      sudah dihapus atas permintaan pemilik proyek.
    - Tombol `M`/`Suara` tetap ada untuk membisukan efek tersebut.
17. **Model karakter datang dari database, dengan model bawaan sebagai cadangan.**
    - `GET /api/portfolio` mengirim `character: { name, model_url, scale }` dari baris
      `models` yang `active = 1`; `null` berarti museum memakai `CONFIG.assets.model`.
    - Museum tidak boleh dibuka tanpa karakter: bila database tidak punya model aktif
      **dan** `public/models/` (yang diabaikan git) kosong, `init()` berhenti dengan
      pesan “Museum tidak bisa dijalankan karena tidak ada model karakter (PMX)…”.
      Jangan menggantinya dengan museum kosong tanpa penjelasan.
    - `PortfolioApp.init()` menyusun daftar calon (`character` → `CONFIG.assets.model`)
      dan mencoba satu per satu. Unggahan PMX yang rusak **tidak boleh** membuat museum
      gagal dibuka.
    - Bundel model disimpan dengan struktur folder utuh di
      `data/uploads/models/<slug>/`, karena PMX menyimpan jalur tekstur secara relatif.
      Jangan meratakan unggahan ke satu folder (`basename`) — tekstur di subfolder
      akan hilang.
    - Hanya satu model `active`. Mengaktifkan model WAJIB mematikan yang lain di server,
      bukan hanya di UI.
18. **Mini-game dipisah dari tampilan.** Aturan blackjack Kedai Kartu hidup di
    `src/game/blackjack.js` sebagai fungsi murni atas satu objek `game` biasa:
    - jangan menyentuh DOM, three.js, atau `$state` di dalam mesin. View hanya
      membungkus objeknya dengan `$state` dan memanggil fungsi seperti
      `startRound()`, `playerHit()`, `settle()`;
    - pengungkapan kartu bandar adalah animasi tampilan: mesin sudah menghitung
      kartu bandar saat `playerStand()`, view menaikkan `game.revealed` satu per
      satu lalu memanggil `settle()`. Jangan memakai `setTimeout` di mesin;
    - kutukan dipilih **sebelum** taruhan divalidasi (`startRound`) supaya
      “Beban Taruhan” menaikkan minimum babak yang sedang dimainkan; kalau taruhan
      ternyata ditolak, kutukan **tetap dipasang** dan nomor babak dibatalkan —
      percobaan ulang harus memakai minimum yang sama (bukan mengundi kutukan baru
      sampai “Beban” kebetulan hilang), dan HUD jadi bisa menawarkan talangan;
    - setiap pembatas kutukan harus punya jalan keluar: “Tangan Berat” membuat tangan
      berhenti otomatis saat jatah tarikan habis, dan jimat yang tidak terbayar ditolak
      dengan pesan (`totalJimatCost()`), bukan dibuang diam-diam;
    - saldo, statistik, dan tingkat kesulitan disimpan di `localStorage` kunci
      `wg-blackjack`; kegagalan `localStorage` (mode privat) harus ditelan, bukan
      menghentikan permainan;
    - default tingkat selalu `normal`; jangan mengubah kesulitan otomatis dari
      skor atau streak tanpa diminta;
    - **jimat dan kutukan baru terbuka pada babak 3** (`SKILLS_FROM_ROUND`,
      `skillsUnlocked()`, `upcomingRound()`). Babak 1–2 selalu bersih: jangan memilih
      kutukan dan jangan mengizinkan `toggleJimat()` sebelum babak itu. Aturannya ada
      di mesin, bukan di HUD — HUD hanya menyembunyikan tombolnya;
    - **meja judi dimainkan orang pertama**: `enterSeat()` memindahkan kamera ke kursi
      (`CameraRig.setSeatMode`), menyembunyikan karakter, dan `BlackjackStage`
      menggambar kartu, keping, serta sosok bandar di atas meja. Jangan membuka panel
      2D untuk meja ini; antarmukanya hanya `SeatHud`, dan `Esc`/tombol **✕ Berdiri**
      berarti keluar kursi. Kartu 3D diselaraskan satu arah: `SeatHud` memanggil
      `syncSeat(game)` setiap keadaan berubah, jadi jangan menyimpan salinan `game`
      di dalam stage;
    - HUD meja wajib menyebut **jumlah kartu** bandar (`terbuka dari total`) dan pemain,
      bukan hanya nilainya. Nilai bandar dihitung dari kartu yang sudah terbuka;
    - keluar kursi di tengah tangan tidak boleh menghanguskan taruhan: `leave()`
      menyelesaikan tangan itu dulu (anggap “Lewati” lalu `settle()`), dan tombolnya
      ditahan (`busy`) selama kartu bandar masih dibuka;

    - selama duduk, `renderer.shadowMap.autoUpdate` dimatikan dan hanya disegarkan saat
      keadaan permainan berubah. Peta bayangan 36 m per frame adalah biaya terbesar di
      ponsel; jangan menyalakannya lagi sebelum pemain berdiri. Kartu di `BlackjackStage`
      dibuat sesuai kebutuhan (`ensureCard`) dan berbagi satu geometri — jangan
      mengalokasikan dua lusin kartu di konstruktor.
19. **Interaksi tidak boleh bergantung pada keadaan yang bisa basi.**
    - Tombol `E` menghitung ulang stasiun terdekat saat ditekan
      (`nearestStationId()`); `this.nearestId` hanya petunjuk tampilan prompt.
      Jangan menelan `E` hanya karena kartu panduan masih terbuka — tutup kartunya
      lewat callback `onDismissHelp` lalu buka panelnya.
    - `PortfolioApp.update()` memeriksa jaring pengaman: `paused` tanpa panel/dialog
      aktif berarti museum membeku, jadi status itu dilepas sendiri. Panel yang gagal
      tampil tidak boleh mematikan klik dan `E` untuk seluruh museum.
    - Isi `MuseumPanel` dibungkus `<svelte:boundary>` dengan lembar galat berisi
      pesan aslinya. Satu view yang melempar galat hanya merusak panelnya sendiri,
      bukan seluruh aplikasi Svelte.
    - Setiap `openStation()` yang tidak menemukan stasiun atau jenisnya belum
      didukung menulis `console.warn`; jangan menelan kasus itu tanpa jejak.
20. **Kiriman pengunjung tidak pernah menerbitkan dirinya sendiri.**
    - `POST /api/feedback` dan `POST /api/testimonials` menyimpan baris dengan
      `approved = 0` secara harfiah. Jangan membaca `body.approved` dari klien, dan
      jangan menambah jalur publik yang bisa mengubah kolom itu.
    - `GET /api/portfolio` hanya mengirim baris `approved = 1`; baris yang belum
      ditinjau tidak boleh ikut terkirim lalu disaring di UI.
    - Umpan balik proyek punya tabel sendiri (`project_feedback`), bukan tabel
      `testimonials`: menyetujui umpan balik tidak boleh menciptakan NPC pengunjung
      di museum.
    - Buku tamu (pesan `type: 'guestbook'`) sudah dihapus; jangan menghidupkannya lagi
      lewat `messages`. Pesan di tabel itu selalu privat.
21. **Dialog tidak memakai `stopPropagation` untuk klik.** Pola yang dipakai di semua
    overlay (`AdminApp`, `MuseumPanel`, `MuseumIndex`, `HelpOverlay`, `WebEmbedModal`):
    latar punya `onclick` yang menutup **hanya** bila `event.target === event.currentTarget`,
    dan lembar dialognya tidak punya handler klik sama sekali.
    - Menambahkan `onclick={(event) => event.stopPropagation()}` pada dialog membuat Svelte
      memperingatkan `a11y_click_events_have_key_events` (elemen non-interaktif membawa
      event klik).
    - Handler `onkeydown` yang di-`stopPropagation` di dialog juga mematikan `Esc`, karena
      pintasan `Esc` dipasang di `window` (`<svelte:window>` di admin, `window.addEventListener`
      di `App.svelte`). Pintasan museum di `PortfolioApp.handleKeyDown()` sekarang juga
      berhenti saat panel terbuka (`paused`) dan saat fokus berada di `input`/`textarea`/
      `select`, jadi huruf yang diketik di formulir tidak mereset kamera atau mematikan suara.
22. **Produksi memakai Caddy, bukan Vite.** Lihat `tutorial.md`: `root * dist/`,
    `try_files {path} /index.html` untuk `/admin/*`, dan `reverse_proxy 127.0.0.1:3001`
    untuk `/api/*` + `/uploads/*`. Jangan pernah menaruh `root` di folder proyek —
    `.env`, `server/`, dan `data/portfolio.sqlite` akan ikut terunduh. `COOKIE_SECURE=1`
    hanya boleh dipakai bila situs benar-benar diakses lewat HTTPS.

---

## 7. Catatan pembangunan (dipindahkan dari `PEMBANGUNAN.md`)

> Sejak sekarang **satu dokumen** memuat arsitektur, aturan, dan riwayat: berkas ini.
> Seluruh isi `PEMBANGUNAN.md` dipindahkan ke bab ini apa adanya, jadi tidak ada dua
> dokumen yang bisa saling menyimpang. Nomor bagian di bawah (0–46) adalah nomor asli
> dokumen lama; tingkat judulnya diturunkan satu agar tetap berada di bawah bab 7 —
> `## 29. …` di dokumen lama menjadi `### 29. …` di sini, `### 45.6 …` menjadi
> `#### 45.6 …`.

### Catatan Pembangunan — Diorama Isometrik

**Proyek:** Portofolio 3D / Halaman Wangsheng  
**Perubahan besar:** third-person → diorama isometrik 3/4, kontrol klik + WASD  
**Tanggal:** 16 November 2026  
**Status:** selesai, `bun run build` lolos, alur runtime utama sudah diuji

Dokumen ini mencatat **apa yang dibangun, skill/teknik apa yang dipakai, mengapa keputusannya diambil, dan urutan membangunnya dari nol**. Bisa dipakai sebagai log proyek, spesifikasi, atau prompt panjang untuk agen AI lain.

---

### 0. Ringkasan singkat

Awalnya proyek adalah portofolio third-person dengan kamera orbit, pointer lock, ruangan museum, lukisan, dan hologram neon. Semuanya dirombak menjadi:

- **Diorama isometrik 3/4** dengan kamera perspektif bersudut tetap.
- **Gerak klik-untuk-jalan** sebagai mode utama, **WASD** sebagai mode alternatif yang bisa diganti kapan saja.
- **Halaman Wangsheng** bergaya tinta, kertas, batu, dan vermilion — bukan sci-fi neon.
- **Roh kertas (shikigami)** sebagai NPC, menggantikan NPC hologram.
- **Lentera proyek** dengan gulungan karya, menggantikan proyektor hologram.
- **Animasi berlapis**: VMD sebagai dasar, pose prosedural di atasnya, dihitung sebelum fisika MMD.
- **UI editorial** bergaya kertas dan tinta, tanpa emoji, gradien biru, atau kartu kaca generik.

Yang **tidak** diubah: model PMX karakter, file VMD `idle/walk/run`, dan seluruh dependensi utama. Tidak ada dependensi baru.

---

### 1. Skill / teknik yang dipakai

#### 1.1 Skill agen (alur kerja)

| Skill | Yang dilakukan |
| --- | --- |
| Membaca codebase | Membaca `AGENTS.md`, `package.json`, `config`, seluruh `src/`, aset `public/`, dan dokumentasi library MMD. |
| Menetapkan scope | Bertanya ke pengguna tentang arah visual, jenis kamera, dan kedalaman rombakan sebelum menulis kode. |
| Perencanaan | Memecah pekerjaan menjadi 10 langkah: konfigurasi → kamera/input → gerak → animasi → tekstur/cahaya → dunia → orkestrasi → UI → konten/dokumen → verifikasi. |
| Implementasi langsung | Menulis ulang modul inti dan membuat modul dunia baru; tidak sekadar menambal kode lama. |
| Verifikasi build | Menjalankan `bun run build` setiap tahap besar dan di akhir. |
| Verifikasi runtime | Menjalankan dev server + Chrome headless, mengirim klik/keys lewat Chrome DevTools Protocol, lalu memeriksa state aplikasi dan DOM. |
| Debugging | Memperbaiki masalah ukuran kanvas, posisi kamera, prompt yang tidak muncul, dan penutupan modal/Escape. |
| Pembersihan | Menghapus modul mati (`Museum.js`, `Painting.js`, `TestingPlate.js`, `Hologram.js`) dan memastikan `dispose()` tersedia. |
| Dokumentasi | Memperbarui `AGENTS.md`, `README.md`, dan menulis dokumen ini. |

#### 1.2 Skill teknis

| Skill / teknik | Dipakai untuk |
| --- | --- |
| **Svelte 5 Runes** | `$state`, `$derived`, `$props`, `$effect` di seluruh UI. Tidak ada store Svelte lama. |
| **Three.js scene graph** | Menyusun dunia dari `Group`, mesh primitif, sprite, points, dan lampu. |
| **Kamera isometrik tetap** | Kamera perspektif `fov 32`, `yaw π/4`, `pitch 0.58`, jarak 16, deadzone follow. |
| **Raycasting** | Klik tanah ke bidang `y=0`; hover dan klik lentera/roh lewat hit area silinder tak terlihat. |
| **Point-and-click locomotion** | Tujuan klik, akselerasi/deselerasi eksponensial, perlambatan mendekati tujuan, deteksi macet. |
| **Kamera-relatif WASD** | Vektor `forward/right` dihitung dari `yaw` kamera, sehingga W selalu “ke atas layar”. |
| **Collider lingkaran 2D** | Menolak pemain dari pohon, lentera, dupa, dan roh; juga menggeser titik tujuan agar tidak masuk collider. |
| **MMD / PMX loading** | `MMDLoader` + `MMDSpringBonePlugin` untuk model karakter dan fisika rambut/kain. |
| **Animation layering** | `AnimationMixer` untuk VMD, lalu rotasi lokal prosedural per tulang sebelum `mmd.update()`. |
| **Procedural posing** | Lompat, mendarat, melambai, sorak, dan idle flair memakai kurva sinus/envelope, bukan klip tambahan. |
| **Canvas 2D texture generation** | Batu, kertas lentera, gulungan proyek, papan nama, prompt, wajah roh, dan kelopak — semua digambar saat runtime. |
| **Seeded randomness** | Tekstur batu/kertas stabil antar-refresh, tidak “berkedip” karena noise acak baru. |
| **Low-poly modeling** | Tubuh roh dari silinder 4 sisi, topi kerucut, lentera dari sphere/cylinder/cone, pohon dari cabang silinder. |
| **Billboard sprite** | Papan nama dan prompt `[E]` selalu menghadap kamera. |
| **NPC state machine** | `idle → wander → converse`, dengan boundary box dan hadap pemain saat bicara. |
| **WebAudio synthesis** | Ambient, langkah, lompat, blip dialog, fanfare — tanpa file audio. |
| **UI design system** | Token warna/font, komponen kertas, tipografi editorial, aksesibilitas fokus dan ARIA. |
| **Runtime testing via CDP** | Chrome headless di port debug, evaluasi state `window.__portfolioApp`, simulasi klik, cek DOM modal. |
| **Resource disposal** | Geometri, material, tekstur, mixer, listener, dan renderer dibersihkan saat `dispose()`. |

#### 1.3 Skill eksternal

**Tidak ada paket skill eksternal yang diinstal** (tidak ada `npx skills add`). Semua kemampuan di atas diimplementasikan langsung di repo dengan dependensi yang sudah ada:

- `svelte`
- `three`
- `@moeru/three-mmd`
- `@moeru/three-mmd-physics-ammo` (fisika utama, lihat §35)
- `@moeru/three-mmd-physics-springbone` (cadangan bila ammo tidak tersedia)
- `vite`
- `bun`

---

### 2. Arah visual dan aturan anti-AI-slop

#### 2.1 Referensi

Tema **Wangsheng**: dunia kematian yang hangat dan handmade, bukan lab futuristik.

- Palet: batu hangat, kertas krem, tinta cokelat-hitam, vermilion, emas pudar, plum.
- Material: batu bertekstur, kayu, kertas, tembaga, kain.
- Bentuk: segel persegi, tepi kertas, gulungan, lentera, ranting plum.
- Cahaya: senja rendah, jingga hangat, bayangan panjang, bukan glow neon.

#### 2.2 Aturan yang dipegang

1. **Tidak ada neon biru/ungu, grid sci-fi, atau hologram.**
2. **Tidak ada glassmorphism** dan kartu sudut membulat besar.
3. **Tidak ada emoji** di UI; ikon memakai teks, segel, atau simbol tipografis.
4. **Tidak ada gradien pelangi**; gradien hanya untuk tekstur kertas/batu dan wash gelap di tepi layar.
5. **Tipografi berlapis**: `Fraunces` untuk display, `Inter` untuk body, `Noto Serif SC` untuk segel, `JetBrains Mono` untuk angka/kode.
6. **Semua UI terasa seperti kertas atau papan gantung**, bukan panel dashboard.
7. **Setiap elemen 3D dibuat dari primitif yang bisa digambar tangan**, bukan aset generik.

---

### 3. Keputusan desain penting

| Keputusan | Alasan |
| --- | --- |
| **Perspektif, bukan orthographic murni** | `PerspectiveCamera` dengan `fov 32` memberi kedalaman diorama dan bayangan yang lebih hidup. Sudut `yaw 45°` + `pitch ~33°` memberi rasa isometrik klasik tanpa kehilangan perspektif. |
| **Kamera tidak bisa diorbit** | Klik tanah harus tetap akurat. Orbit bebas membuat pemetaan klik → dunia berubah-ubah dan merusak kontrol point-and-click. |
| **Tanpa pointer lock** | Kursor bebas dibutuhkan untuk mengklik tanah, lentera, dan tombol UI. Pointer lock dihapus total. |
| **Klik sebagai mode default** | Permintaan utama pengguna; terasa seperti diorama yang bisa “disentuh”. |
| **WASD tetap ada** | Sebagian pengguna lebih nyaman dengan tombol; mode bisa diganti tanpa reload. |
| **VMD tetap dipakai** | Aset `idle/walk/run` sudah ada dan kualitasnya baik. Tidak perlu konversi Mixamo baru. |
| **Pose prosedural, bukan additive clip** | Additive clip pada MMD rawan menggandakan rotasi dan bertabrakan dengan IK. Overlay quaternion lokal lebih terkontrol. |
| **Roh kertas menggantikan NPC manusia/hologram** | Cocok dengan tema Wangsheng, lebih murah secara geometri, dan memberi siluet khas diorama. |
| **Lentera proyek menggantikan hologram** | Media “kertas gulung” konsisten dengan UI dan dunia; teks tetap terbaca karena gulungan diputar menghadap kamera. |
| **Tidak menambah dependensi** | Semua tekstur, bentuk, dan suara dibuat prosedural. Build tetap ringan dan tidak ada aset eksternal baru. |
| **Debug state diekspos di dev** | `window.__portfolioApp.getDebugState()` memudahkan pengujian otomatis tanpa mengotori UI. |

---

### 4. Spesifikasi hasil akhir

#### 4.1 Kamera

`src/config.js`:

```js
camera: {
  fov: 32,
  yaw: Math.PI / 4,
  pitch: 0.58,          // ~33°
  distance: 16,
  minDistance: 10,
  maxDistance: 24,
  height: 0.95,
  deadzone: 1.2,
  dialogDistanceScale: 0.74,
  dialogBias: 0.3,
  bounds: { minX: -23, maxX: 23, minZ: -23, maxZ: 23, maxY: 34 },
}
```

Perilaku:

- Fokus kamera mengikuti karakter dengan **deadzone 1.2**; kamera hanya bergerak saat karakter keluar kotak fokus.
- Posisi kamera di-damp (`positionSmoothing 9`), fokus di-damp (`followSmoothing 7`).
- Frame pertama langsung dipasang di sudut isometrik, tanpa swoop.
- Zoom roda mouse mengubah `userDistance` dalam `10–24`; `R` mengembalikan ke 16.
- Saat dialog: jarak menjadi `16 × 0.74 = 11.84`, fokus bergeser 30% ke arah lawan bicara.
- `lookAt` diberi offset `+0.12` agar karakter tidak menempel di tengah bawah layar.

#### 4.2 Kontrol

| Input | Aksi |
| --- | --- |
| Klik tanah | Raycast ke plane `y=0`, jalan ke titik |
| Klik dua kali / `Shift + klik` | Berlari |
| Klik jauh (> 6 unit) | Otomatis berlari |
| Klik roh / lentera | Jalan ke titik interaksi lalu buka dialog/uji web otomatis |
| `W A S D` / panah | Mode tombol, arah relatif layar |
| `Shift` | Berlari di mode tombol |
| `Tab` | Ganti mode klik/WASD |
| `Space` | Lompat |
| `E` | Interaksi dengan target terdekat |
| `R` | Reset kamera |
| `P` | Fisika rambut/kain |
| `M` | Suara |
| `G` / `V` | Melambai / bersorak |
| `Scroll` | Zoom |
| `Esc` | Tutup modal/dialog/panduan |

Detail input:

- Klik diproses langsung pada `pointerdown`, bukan menunggu `pointerup`. Penanda tujuan dan destinasi karakter langsung berubah saat tombol ditekan.
- Kanvas tidak memiliki aksi drag/orbit, jadi tidak ada risiko klik-dan-geser yang tidak disengaja.
- `setPointerCapture` dipakai agar klik tetap terdaftar meski kursor keluar kanvas.
- `contextmenu` dicegah; wheel memakai `{ passive: false }` agar bisa `preventDefault`.
- Saat dialog terbuka, `input.setEnabled(false)` membersihkan semua tombol dan klik.
- Menekan WASD saat mode klik langsung memindahkan mode ke `keys` lewat `update()`.
- Klik tanah saat mode `keys` mengembalikan ke `point`.

#### 4.3 Gerak karakter

`CharacterController`:

- Kecepatan jalan **1.35**, lari **3.35**.
- Akselerasi **14**, deselerasi **18** (lambda eksponensial).
- Rotasi hadap **12 rad/s** memakai selisih sudut terpendek.
- Lompat **4.6**, gravitasi **14**; perkiraan waktu udara dihitung dari `2 × jumpSpeed / gravity`.
- Radius tubuh **0.36**; tabrakan lingkaran dengan pohon, lentera, dupa, tiang, roh.
- Batas arena `±15.8` pada X/Z.
- Arrival radius **0.24**; saat mendekati tujuan kecepatan dibatasi `max(0.5, jarak × 4)` agar tidak overshoot.
- Deteksi macet: jika tujuan masih ada tapi kecepatan `< 0.12` selama **1.1 detik**, tujuan dibatalkan dan event `arrive` dikirim.
- Event `jump`, `land`, `arrive` dikonsumsi oleh `PortfolioApp` untuk suara, efek pendaratan, dan pembersihan marker.
- `clampDestination()` menggeser titik klik keluar dari collider, sehingga pemain tidak pernah “minta” berjalan ke dalam pohon.

#### 4.4 Animasi

Urutan yang benar di `Character.updateWithMixer()`:

```js
this.mmd.beforeUpdate()
mixer.update(delta)
this.mmd.updateAnimation(mixer)
overlay()                              // pose prosedural
this.mmd.update(delta, { physics })    // IK + spring bone
```

Mengapa urutan ini: pose prosedural harus menjadi bagian dari pose akhir sebelum IK dan fisika MMD dihitung. Kalau overlay diterapkan setelah `mmd.update()`, kaki bisa menembus lantai dan rambut/kain tertinggal satu frame.

Lapisan dasar:

- `idle`, `walk`, `run` dimuat dari VMD.
- Bobot dihitung dari kecepatan: `walkBlend = speed / walkSpeed`, `runBlend = (speed - walk) / (run - walk)`.
- Bobot dihaluskan dengan `1 - exp(-10 × delta)`.
- `walkAction.timeScale` dikunci `0.7–1.5`; `runAction.timeScale` `0.75–1.9` agar langkah tidak meluncur.
- Klip root tidak menggerakkan karakter; posisi dunia sepenuhnya milik controller.

Pose prosedural:

| Pose | Tulang yang disentuh | Perilaku |
| --- | --- | --- |
| Lompat | `上半身`, `頭`, `左腕`, `右腕`, `左ひじ`, `右ひじ`, `左足`, `右足`, `左ひざ`, `右ひざ` | Tuck di puncak lompatan (`sin(π × phase)`), memudar saat mendarat. |
| Mendarat | `上半身`, `頭`, `左ひざ`, `右ひざ`, `左足`, `右足`, `左腕`, `右腕` | Envelope 0.55 detik, lutut menekuk lalu memulih. |
| Melambai | `上半身`, `頭`, `右肩`, `右腕`, `右ひじ`, `右手首`, `左腕` | Tangan kanan terangkat, telapak bergoyang `sin(t × 9.5)`. |
| Sorak | `上半身`, `頭`, `右肩`, `右腕`, `右ひじ`, `左肩`, `左腕`, `左ひじ`, `左足`, `左ひざ` | Kedua tangan ke atas, badan membusung, bounce kecil. |
| Idle flair | `頭`, `首`, `上半身`, `左腕`, `右腕` | Setelah 5.5 detik diam, kepala menoleh dan badan bergoyang selama 3.4 detik. |

Nama tulang memakai bahasa Jepang MMD. Jangan mengganti dengan nama Mixamo.

#### 4.5 Dunia

Struktur:

```
World
├── Lighting
├── Courtyard
├── Exhibits
│   ├── Guide × 4
│   └── ProjectLantern × 6
├── PetalField
└── MoveMarker
```

**Courtyard** (`src/world/Courtyard.js`):

- Pelat batu `34 × 34` dengan tekstur 1024 px, repeat 3×3.
- Pelat alas gelap setebal 1.1 dan pagar tepi rendah dengan garis vermilion.
- 4 lentera batu di sudut; hanya 2 yang depan memberi `PointLight`.
- Pohon plum di tengah: 7 cabang silinder, 10 gugus bunga (7 sphere per gugus), kertas doa.
- Dupa tembaga dengan tiga batang dan bara.
- 2 tiang + untaian 5 lentera kertas di sisi timur.
- Animasi kecil: nyala lentera, goyangan untaian, gugus bunga, kertas doa.

**Guide** (`src/world/Guide.js`):

- Tubuh kertas terlipat dari `CylinderGeometry(0.19, 0.4, 1.0, 4)`.
- Kepala `IcosahedronGeometry(0.25, 0)`, topi kerucut, wajah dari canvas texture.
- Dua kertas doa yang berkibar, rumbai, bayangan lingkaran yang mengecil saat naik.
- Melayang: `body.position.y = 0.2 + sin(time × freq) × amp`.
- AI:
  - `idle`: menunggu 2–5.5 detik.
  - `wander`: memilih titik acak di dalam boundary, berbelok halus, bergerak 0.85 unit/detik.
  - `converse`: berhenti, menghadap pemain, kepala sedikit menoleh.
- Posisi dan collider diperbarui setiap frame; `interaction` mengikuti roh.
- Boundary diambil dari `content/portfolio.js`, dengan clamp ganda agar tidak pernah keluar.

**ProjectLantern** (`src/world/ProjectLantern.js`):

- Tiang kayu, lengan, dasar batu, lentera kertas menyala, dan gulungan karya.
- Gulungan `1024 × 640` digambar dari metadata proyek, diputar `π/4 - rotationY` agar menghadap kamera isometrik tetap.
- Batang kayu atas/bawah, tali penggantung, cincin aktif di tanah.
- Sprite prompt `[E] Uji web` muncul hanya saat aktif.
- Hit area silindris tak terlihat untuk raycast.
- Animasi: gulungan mengambang, lentera bergoyang, cahaya berkedip, ring berdenyut.

**MoveMarker**:

- Riak tinta vermilion: ring berdenyut, ripple yang memudar dalam 0.7 detik, titik pusat.
- Tampil saat klik, disembunyikan saat tiba/dialog/mode tombol.

**Petals**:

- 150 titik dengan tekstur kelopak, warna vertex (plum, krem, jingga).
- Jatuh pelan, melayang sinusoidal, berputar, muncul lagi di atas saat menyentuh tanah.

#### 4.6 Cahaya

- Hemisphere `0xf3d3a2 / 0x1b1511`, intensitas 0.58.
- Key directional `0xffd39a`, 2.15, dari barat, bayangan 2048, frustum 44×44.
- Fill dingin `0x9aabc4`, 0.32, dari timur.
- Bounce lentera `0xffb168`, 18, di tengah halaman.
- Getaran intensitas sangat kecil agar scene tidak terasa statis.

#### 4.7 UI

Token di `src/app.css`:

```css
--ink: #1a1512;
--paper: #f2e7cf;
--vermilion: #b23a30;
--gold: #c9a05c;
--plum: #cf8f9f;
--font-display: 'Fraunces', 'Noto Serif SC', Georgia, serif;
--font-body: 'Inter', ...;
--font-mono: 'JetBrains Mono', ...;
```

Komponen:

| Komponen | Ciri |
| --- | --- |
| `LoadingScreen` | Gulungan kertas vertikal bertali, batang kayu, 往生堂 tegak, tinta merah naik sebagai meteran; galat tampil sebagai lembar kertas bercap 封. |
| `HelpOverlay` | Kertas gulung dengan rod atas/bawah, dua kolom kontrol, tombol “Masuk ke halaman”. |
| `Hud` | Segel 往, nama/peran, tombol Suara/Fisika/Panduan, switch Klik/WASD, hint kontekstual, aksen vertikal 往生堂. |
| `DialogBox` | Kertas terang, segel 言, mesin tik 18 ms, tag, tautan, tombol uji web, panah halaman. |
| `WebEmbedModal` | Bingkai tinta, status “Langsung”, host, tab baru, muat ulang, layar penuh, Esc. |

Aksesibilitas:

- `role="dialog"`, `aria-modal`, `aria-labelledby`, `aria-live` pada teks dialog.
- `aria-pressed` pada tombol toggle.
- `:focus-visible` outline emas.
- `prefers-reduced-motion` mematikan animasi/transition CSS.
- Escape ditangani terpusat di `App.svelte`: modal paling atas ditutup lebih dulu, lalu dialog, lalu panduan.
- Klik backdrop menutup panduan/modal; klik di dalam panel tidak menutup.

#### 4.8 Suara

`SoundManager` tetap prosedural:

- Ambient pad A–E–A dengan LFO pelan.
- Langkah: noise bandpass, filter berbeda untuk lari.
- Blip dialog: triangle 440/560 Hz dengan variasi pitch.
- Buka/tutup dialog, page advance, lompat, mendarat, sorak, UI.
- AudioContext baru dibuat setelah gestur pengguna pertama.

---

### 5. Urutan membangun dari nol

Urutan ini penting karena setiap lapisan bergantung pada lapisan sebelumnya.

#### Langkah 1 — Kunci arah dan batasan

- Tentukan tema, kamera, dan kontrol sebelum menyentuh kode.
- Keputusan yang dipakai: Wangsheng, perspektif 3/4 tetap, klik + WASD, rombak total dunia/NPC/UI.
- Jangan menambah dependensi bila aset dan library yang ada sudah cukup.

#### Langkah 2 — Konfigurasi

Edit `src/config.js`:

- Kamera isometrik.
- Kecepatan karakter.
- Mode kontrol default `point`.
- Interaksi 3.1, platform half 17.
- Parameter animasi.
- Batas arena.

#### Langkah 3 — Kamera dan input

1. Tulis ulang `CameraRig`:
   - yaw/pitch tetap,
   - deadzone,
   - damp posisi/fokus,
   - zoom,
   - dialog mode.
2. Tulis ulang `InputManager`:
   - tanpa pointer lock,
   - pointer capture,
   - klik diproses pada pointerdown,
   - wheel zoom,
   - keyboard set,
   - enable/disable saat dialog.

#### Langkah 4 — Gerak karakter

Tulis ulang `CharacterController`:

- dua mode berbagi fisika yang sama,
- raycast target dari `PortfolioApp`,
- clamp tujuan keluar collider,
- tabrakan lingkaran + bounds,
- event jump/land/arrive,
- stall detection.

#### Langkah 5 — Animasi

1. Pastikan `Character.updateWithMixer()` memanggil overlay sebelum `mmd.update()`.
2. Tulis `AnimationController`:
   - muat VMD,
   - bobot idle/walk/run,
   - sinkronisasi timeScale,
   - pose prosedural per tulang,
   - timer emote.
3. Uji bahwa kaki tidak menembus lantai dan rambut tetap mengikuti.

#### Langkah 6 — Tekstur, cahaya, partikel

1. Buat generator canvas:
   - batu halaman,
   - kertas lentera,
   - gulungan proyek,
   - papan nama,
   - prompt badge,
   - wajah roh,
   - kelopak.
2. Gunakan seeded random agar hasil stabil.
3. Set `SRGBColorSpace` pada tekstur warna.
4. Buat `Lighting` senja.
5. Buat `PetalField`.

#### Langkah 7 — Dunia

1. `Courtyard`: tanah, alas, pagar, lentera batu, pohon, dupa, untaian.
2. `Guide`: tubuh roh, nama, prompt, AI, boundary.
3. `ProjectLantern`: tiang, lentera, gulungan, ring, prompt, hit area.
4. `MoveMarker`.
5. `Exhibits`: gabungkan, cari terdekat, set aktif.
6. `World`: scene background/fog, lighting, courtyard, exhibits, petals, marker; sediakan `colliders`, `interactables`, `getStation`, `findNearestStation`.

#### Langkah 8 — Orkestrasi

`PortfolioApp`:

- muat engine → world → karakter → controller → camera → animasi → input,
- raycast klik,
- pending station + auto-open,
- prompt terdekat,
- dialog pause/resume,
- kamera dialog,
- suara langkah,
- mode kontrol,
- debug state,
- dispose lengkap.

Alur klik:

```
pointerdown
→ stationIdAt(x, y)
  → jika kena stasiun:
      dekat? buka
      jauh? moveTo(interaction) + pendingStation
  → jika tanah:
      raycast plane y=0
      clampDestination
      moveTo(target, run)
```

#### Langkah 9 — UI

1. Ganti token CSS dan font.
2. Tulis ulang `Hud`, `HelpOverlay`, `DialogBox`, `LoadingScreen`, `WebEmbedModal`.
3. Sambungkan callback di `App.svelte`.
4. Tangani Escape terpusat.
5. Pastikan HUD tidak menghalangi klik kanvas (`pointer-events`).
6. Sembunyikan HUD saat dialog/modal.

#### Langkah 10 — Konten dan dokumentasi

1. Ubah `src/content/portfolio.js`: profil, 4 roh, 6 lentera proyek, boundary, dialog.
2. Perbarui `AGENTS.md` dan `README.md`.
3. Hapus file lama yang tidak dipakai.
4. Tambahkan dokumen ini.

#### Langkah 11 — Verifikasi

1. `bun run build`.
2. Jalankan dev server.
3. Buka dengan Chrome headless/CDP.
4. Cek:
   - loading selesai,
   - karakter ada di scene,
   - klik tanah menggerakkan karakter,
   - klik lentera dari jauh -> berjalan -> dialog terbuka,
   - dialog bisa dilanjutkan dan ditutup,
   - modal web terbuka,
   - Escape menutup panel paling atas,
   - mode klik/WASD berpindah.
5. Periksa console tidak ada error.

---

### 6. Peta file dan tanggung jawab

```
src/
├── config.js                     # Semua angka rasa: kamera, gerak, animasi, audio
├── App.svelte                    # Menyambungkan PortfolioApp ke UI, Escape terpusat
├── app.css                       # Token warna/font, reset, panggung 3D
├── main.js                       # Mount Svelte
├── app/
│   └── PortfolioApp.js           # Orkestrator: klik, mode, dialog, prompt, audio, debug
├── audio/
│   └── SoundManager.js           # WebAudio prosedural
├── character/
│   ├── Character.js              # PMX + hook overlay sebelum fisika
│   ├── CharacterController.js    # Klik/WASD, collider, gravitasi, event
│   ├── AnimationController.js    # VMD + pose prosedural
├── content/
│   └── portfolio.js              # Profil, 4 roh, 6 lentera, dialog, boundary
├── core/
│   ├── Engine.js                 # Renderer, scene, loop, resize, visibility
│   ├── CameraRig.js              # Isometrik tetap, deadzone, zoom, dialog
│   ├── InputManager.js           # Klik, hover, wheel, keyboard
│   └── math.js                   # damp, clamp, shortestAngle, dispose
├── ui/
│   ├── LoadingScreen.svelte
│   ├── HelpOverlay.svelte
│   ├── Hud.svelte
│   ├── DialogBox.svelte
│   └── WebEmbedModal.svelte
└── world/
    ├── World.js                  # Komposisi dunia
    ├── Courtyard.js              # Halaman batu + dekorasi
    ├── Guide.js                  # Roh kertas + AI
    ├── ProjectLantern.js         # Lentera proyek + gulungan
    ├── Exhibits.js               # Koleksi exhibit + pencarian
    ├── MoveMarker.js             # Riak tujuan klik
    ├── Lighting.js               # Cahaya senja
    ├── Particles.js              # Kelopak
    └── canvasTextures.js         # Semua tekstur canvas
```

File yang dihapus karena sudah tidak relevan:

- `src/world/Museum.js`
- `src/world/Painting.js`
- `src/world/TestingPlate.js`
- `src/world/Hologram.js`

---

### 7. Cara menambah/mengubah konten

#### 7.1 Menambah roh pemandu

Di `src/content/portfolio.js`, tambahkan ke array `halls`:

```js
{
  id: 'guest',
  kind: 'guide',
  index: '05',
  title: 'Pendopo Tamu',
  subtitle: 'Cerita Lain',
  accent: '#7f9b86',
  position: [5, 8],
  heading: Math.PI,
  boundary: { minX: 2, maxX: 8, minZ: 5, maxZ: 11 },
  prompt: 'Bicara dengan Tamu',
  guide: { name: 'Tamu', role: 'Juru Cerita', accent: '#7f9b86' },
  dialog: [
    { speaker: 'Tamu', text: 'Halo.' },
  ],
}
```

Yang perlu dijaga:

- `position` adalah `[x, z]`.
- `boundary` harus di dalam batas arena `±15.8`.
- `collider` roh dibuat otomatis dari `position` dan mengikuti pergerakan.
- Jangan menaruh boundary di dalam collider pohon/lentera besar.

#### 7.2 Menambah lentera proyek

Tambahkan lewat `makeArtwork()` di array `artworks`:

```js
makeArtwork({
  slug: 'proyek-baru',
  index: '03.7',
  accent: '#b23a30',
  position: [8.5, 12.5],
  rotationY: Math.PI,
  size: [3.3, 2.05],
  elevation: 1.8,
  standDistance: 2.5,
  project: {
    title: 'Proyek Baru',
    year: '2026',
    description: 'Ringkasan singkat.',
    story: 'Cerita yang dibacakan Sari.',
    role: 'Peran: ...',
    tags: ['Svelte', 'Three.js'],
    href: 'https://example.com',
  },
})
```

`rotationY` menentukan arah lentera dan titik berdiri:

- `0` = +Z
- `π/2` = +X
- `-π/2` = -X
- `π` = -Z

Gulungan selalu diputar menghadap kamera, jadi teks tetap terbaca.

#### 7.3 Mengubah rasa gerak/kamera

Semua di `src/config.js`:

- `camera.distance` / `minDistance` / `maxDistance`: zoom.
- `camera.deadzone`: seberapa jauh karakter bergerak sebelum kamera mengikuti.
- `character.walkSpeed` / `runSpeed`: kecepatan.
- `character.acceleration` / `deceleration`: rasa berat/ringan.
- `character.autoRunDistance`: jarak klik yang otomatis berlari.
- `animation.weightSmoothing`: kehalusan transisi animasi.
- `world.interactDistance`: jarak prompt/interaksi.

---

### 8. Verifikasi yang sudah dilakukan

#### Build

```bash
bun run build
```

Hasil akhir:

```
✓ 150 modules transformed.
dist/index.html                   1.49 kB │ gzip:   0.78 kB
dist/assets/index-*.css          20.45 kB │ gzip:   4.76 kB
dist/assets/index-*.js          847.36 kB │ gzip: 225.71 kB
✓ built in 1.56s
```

#### Runtime

Pengujian dilakukan dengan:

- `bun run dev -- --port 5180 --host 127.0.0.1`
- Chrome headless dengan remote debugging port 9223
- Chrome DevTools Protocol untuk evaluasi `window.__portfolioApp.getDebugState()` dan simulasi input

Yang diperiksa:

- [x] Loading mencapai `ready: true`.
- [x] Model karakter termuat dan berada di scene.
- [x] Klik tanah mengubah posisi karakter.
- [x] Penanda tujuan dan destinasi langsung berubah pada `pointerdown`, sebelum `pointerup`.
- [x] Klik lentera dari jauh memicu perjalanan dan membuka dialog saat tiba.
- [x] Dialog bisa dilanjutkan dan ditutup.
- [x] Modal uji web bisa dibuka.
- [x] Escape menutup panel paling atas.
- [x] Build produksi lolos tanpa error.

#### Batasan verifikasi

- **Tidak ada test suite otomatis** di repo; pengujian memakai skrip runtime.
- **Pemeriksaan visual akhir via screenshot tidak dilakukan**; yang diverifikasi adalah state runtime, DOM, dan build. Peninjauan estetika akhir tetap perlu dilakukan manusia di browser.
- **WASD tidak diuji terpisah lewat simulasi keyboard otomatis**; logika dan pemetaan arah sudah ditinjau, tetapi pengujian gerak utama berfokus pada alur klik.
- **Performa di perangkat rendah belum diprofilkan.** Dunia memakai banyak mesh kecil; jika perlu, langkah optimasi berikutnya adalah instancing untuk bunga/kelopak dan penggabungan geometri statis.
- **Uji web bergantung pada situs tujuan.** `X-Frame-Options` atau CSP `frame-ancestors` dapat menolak iframe; gunakan tombol “Tab baru”.

---

### 9. Batasan produk yang diketahui

1. **Isometrik terasa, bukan orthographic murni.** Sudut tetap dan komposisi diagonal memberi rasa isometrik, tetapi lensa tetap perspektif.
2. **Tidak ada pinch zoom / kontrol sentuh khusus.** Pointer events mendukung tap, tetapi belum ada UI mobile atau gesture pinch.
3. **Tidak ada collision antar-NPC.** Roh bisa saling melewati; hanya pemain yang bertabrakan dengan collider.
4. **Tidak ada slope/ketinggian.** Semua gerak di bidang datar `y=0`.
5. **Fisika bisa dimatikan** dengan `P`; saat dimatikan, rambut/kain menjadi kaku.
6. **Font dari Google Fonts.** Jika offline, browser memakai fallback Georgia/Inter/Segoe UI.
7. **Audio menunggu gestur pengguna** karena kebijakan autoplay browser.

---

### 10. Checklist “selesai” untuk perubahan berikutnya

Sebelum menyatakan perubahan selesai:

- [ ] `bun run build` lolos.
- [ ] Tidak ada import ke file yang dihapus.
- [ ] `dispose()` untuk geometry/material/texture baru sudah ada.
- [ ] Klik tanah masih akurat (kamera tidak diorbit).
- [ ] Klik stasiun dari jauh masih berjalan lalu membuka interaksi.
- [ ] `E` hanya muncul untuk target terdekat.
- [ ] Dialog tidak membiarkan karakter bergerak di belakangnya.
- [ ] Escape menutup modal paling atas lebih dulu.
- [ ] Pose baru diterapkan sebelum `mmd.update()`.
- [ ] Palet tetap tinta/kertas/vermilion; tidak ada neon atau emoji.
- [ ] UI tetap bisa dipakai dengan keyboard dan fokus terlihat.

---

### 11. Prompt bangun ulang (ringkas untuk agen AI)

Gunakan blok ini jika ingin membangun ulang proyek dari nol:

```text
Bangun portofolio 3D Svelte 5 + Three.js berbentuk diorama isometrik 3/4
bertema Wangsheng (tinta, kertas, batu, vermilion). Model karakter PMX dan VMD
idle/walk/run sudah tersedia di public/; jangan tambah dependensi baru.

Kamera: PerspectiveCamera fov 32, yaw π/4, pitch 0.58, jarak 16 (zoom 10–24),
deadzone 1.2, follow damp, mode dialog maju 0.74 dan bias 0.3. Tidak ada orbit
bebas dan tidak ada pointer lock.

Kontrol: klik tanah = raycast ke plane y=0 lalu jalan; klik dua kali / Shift =
lari; klik roh/lentera dari jauh = jalan ke titik interaksi lalu buka otomatis;
WASD = mode alternatif relatif layar, aktif otomatis saat tombol ditekan; Tab
ganti mode; Space lompat; E interaksi; R reset kamera; P fisika; M suara;
G/V emote; Esc tutup panel.

Karakter: CharacterController dengan akselerasi/deselerasi eksponensial,
collider lingkaran, bounds ±15.8, arrival 0.24, stall detection 1.1 s, event
jump/land/arrive. Animasi: AnimationMixer untuk VMD, lalu overlay pose
prosedural per tulang MMD sebelum mmd.update() agar IK/fisika benar. Pose:
lompat, mendarat, melambai, sorak, idle flair.

Dunia: halaman batu 34×34 dengan tekstur canvas seeded, pohon plum, 4 lentera
batu, dupa, untaian lentera kertas, 150 kelopak jatuh. NPC = roh kertas
(shikigami) dengan AI idle→wander→converse, boundary box, melayang, nama dan
prompt sprite. Proyek = lentera kayu dengan gulungan canvas 1024×640 yang
menghadap kamera, plus hit area raycast. Penanda klik = riak tinta vermilion.

UI: token --ink/--paper/--vermilion/--gold, font Fraunces + Inter +
Noto Serif SC + JetBrains Mono. HUD segel, help kertas gulung, dialog mesin tik
dengan tag/tautan/uji web, loading tinta, modal iframe. Tanpa emoji, neon,
glassmorphism, atau gradien biru.

Konten di src/content/portfolio.js: 4 roh, 6 lentera proyek, dialog, boundary,
posisi [x,z], rotationY. semua teks dan tautan di sana.

Verifikasi: bun run build, lalu uji runtime klik → jalan → dialog → uji web,
mode WASD, Escape, dan tidak ada error console.
```

---

### 12. Ringkasan satu paragraf

Proyek ini dibangun ulang dari third-person menjadi diorama isometrik dengan kamera 3/4 tetap, kontrol klik-untuk-jalan yang bisa diganti WASD, dan dunia Wangsheng yang seluruhnya dibuat dari primitif Three.js serta tekstur Canvas 2D. NPC menjadi roh kertas dengan AI terbatas, hologram menjadi lentera gulungan, dan UI menjadi sistem kertas/tinta yang konsisten. Animasi MMD diperbaiki dengan overlay pose sebelum fisika, sementara kontrol, kamera, dan UI ditulis ulang agar terasa seperti diorama yang bisa disentuh — bukan halaman 3D generik.

---

### 13. Pembaruan besar: museum dari database + dashboard admin

**Permintaan:** ubah dunia menjadi museum yang menampilkan portofolio, sesuaikan
kebutuhan UKK (Update.txt) dengan tema 3D, testimoni menjadi NPC pengunjung, dashboard
tetap 2D, dan seluruh konten memakai database — SQLite sekarang, MySQL/MariaDB nanti
tanpa menulis ulang.

#### 13.1 Keputusan arsitektur

| Keputusan | Alasan |
| --- | --- |
| **Tiga lapisan: museum 3D, admin 2D, API + DB** | Konten harus bisa diubah tanpa menyentuh kode, sementara museum tetap imersif. |
| **Satu server Bun menyajikan API dan `dist/`** | Produksi cukup satu proses; tidak perlu dua layanan terpisah. |
| **Adapter database, bukan ORM** | Antarmuka `all/get/run/exec` kecil dan cukup; pindah SQLite ⇄ MySQL hanya mengganti adapter + skema. |
| **`shared/content-schema.js` sebagai sumber kebenaran** | Field admin, validasi API, kolom SQL, dan serialisasi memakai definisi yang sama. |
| **CRUD generik di admin** | Menambah resource/field cukup dengan skema, bukan route dan form baru. |
| **Panel 2D di atas museum** | Detail panjang (dokumentasi, CV, form) lebih nyaman dibaca di kertas 2D, sementara dunia 3D tetap terlihat di belakang. |
| **Testimoni = NPC pengunjung** | Permintaan pengguna; memberi alasan eksplorasi dan membuat testimoni terasa hidup. |
| **Meja informasi per bagian** | Setiap kebutuhan UKK punya “stasiun” fisik di museum, bukan menu abstrak. |
| **SQLite default, MySQL opsional** | Tidak perlu server database saat pengembangan, tetapi siap untuk hosting UKK. |

#### 13.2 Skema data

Tabel: `profile`, `skills`, `projects`, `certificates`, `experiences`, `testimonials`,
`posts`, `messages`, `admin_users`, `admin_sessions`.

Kolom daftar (`education`, `interests`, `organizations`, `plk`, `tech`, `features`,
`gallery`, `highlights`, `tags`) disimpan sebagai JSON array di kolom `TEXT`, lalu
diubah menjadi array oleh `server/api/serialize.js`.

Dua dialek SQL dijaga sejajar:

- `server/db/schema.sqlite.sql` — `INTEGER PRIMARY KEY AUTOINCREMENT`, `TINYINT`.
- `server/db/schema.mysql.sql` — `INT AUTO_INCREMENT`, `TINYINT(1)`, `ENGINE=InnoDB`.

`server/db/index.js` memilih adapter dari `DB_CLIENT` (`sqlite` default, `mysql` untuk
MySQL/MariaDB). Keduanya mengekspos `all`, `get`, `run`, `exec`, `describe`.

#### 13.3 API

| Endpoint | Fungsi |
| --- | --- |
| `GET /api/portfolio` | Seluruh data publik: profil, keahlian, proyek terbit, sertifikat, pengalaman, testimoni disetujui, artikel terbit, buku tamu. |
| `POST /api/messages` | Formulir kontak / kesan. Rate limit 5 pesan / 10 menit per IP. |
| `POST /api/auth/login`, `/logout`, `GET /api/auth/me` | Sesi admin berbasis cookie HttpOnly. |
| `GET/POST/PUT/DELETE /api/admin/{resource}[/id]` | CRUD proyek, keahlian, sertifikat, pengalaman, testimoni, catatan. |
| `GET/PUT /api/admin/profile` | Profil tunggal. |
| `GET /api/admin/messages`, `PUT/DELETE /api/admin/messages/:id` | Kotak masuk. |
| `GET /api/admin/overview` | Hitungan konten + pesan belum dibaca. |
| `POST /api/admin/uploads` | Unggah gambar/PDF (disajikan dari `/uploads`). |

Password admin di-hash dengan argon2id (`Bun.password`). Bila tabel admin kosong,
akun awal dibuat dari `ADMIN_EMAIL`/`ADMIN_PASSWORD`; bila kosong dipakai fallback dan
server mencetak peringatan.

#### 13.4 Museum 3D

- `PortfolioApp.init()` memuat `/api/portfolio`, lalu membangun `World`.
- `Museum.js` — arsitektur: lantai, dinding utara/barat, pilar, lentera, papan nama.
- `Exhibits.js` — membangun koleksi dari data:
  - `InfoStation` untuk setiap `PHYSICAL_SECTIONS` (9 meja);
  - `ProjectFrame` untuk hingga 6 proyek pertama (`PROJECT_SLOTS`);
  - `Visitor` untuk hingga 6 testimoni pertama (`VISITOR_SLOTS`).
- `src/content/museum.js` menyimpan tata letak: posisi meja, rotasi, jarak berdiri,
  slot proyek, area jelajah pengunjung, dan metadata tiap bagian.
- Interaksi: `E` di dekat objek, atau klik objek dari jauh → karakter berjalan →
  `openStation()` → `openView()` → panel 2D.
- `Visitor` memakai state machine `idle → wander → converse` dengan boundary box.

#### 13.5 Panel 2D dan dashboard

Panel museum: `MuseumPanel.svelte` + `src/ui/views/*` (Home, About, Skills, Projects,
ProjectDetail, Certificates, Experience, CV, Contact, Blog, Testimonials). Gaya bersama
ada di `src/ui/views/views.css`; navigasi memakai rail bagian, indeks museum, dan nomor
`1`–`0`.

Dashboard admin: `src/admin/AdminApp.svelte` + `AdminLogin`, `AdminField`, `api.js`,
`admin.css`. Form dirender dari `RESOURCES[resource].fields`, sehingga field baru
otomatis muncul. Upload memakai `POST /api/admin/uploads`.

`src/main.js` memilih root component berdasarkan path: `/admin` → dashboard, lainnya →
museum 3D.

#### 13.6 Urutan pembangunan

1. Skema konten bersama + dua skema SQL + adapter + seed.
2. Auth admin, API publik, CRUD admin, upload, overview.
3. Dashboard admin (login, navigasi, tabel, editor, pesan).
4. Tata letak museum (`src/content/museum.js`) + arsitektur `Museum.js`.
5. Koleksi: `InfoStation`, `ProjectFrame`, `Visitor`, `Exhibits`.
6. Menyatukan `World` + `PortfolioApp` dengan data API.
7. Panel 2D dan seluruh view.
8. HUD, indeks, tema, formulir pesan.
9. Dokumentasi + `.env.example` + skrip `dev`.
10. Verifikasi build, runtime 3D, dan alur admin.

#### 13.7 Verifikasi yang dilakukan

- `bun run build` lolos (hanya peringatan a11y non-blokir).
- Runtime museum di Chrome headless + CDP: 19 stasiun 3D (9 meja + 6 bingkai proyek +
  4 pengunjung), model karakter termuat, 3 klip animasi, tanpa error console.
- Semua 10 bagian panel dirender dengan data database, detail proyek terbuka, dan
  jalur “tekan E di meja” membuka panel yang benar.
- `POST /api/messages` mengembalikan 201.
- Admin: login berhasil, daftar proyek tampil, dan CRUD proyek (buat → muncul di
  `/api/portfolio` → ubah → hapus) berjalan tanpa error.

---

### 14. Penyempurnaan: bagian harus didatangi + orientasi karakter

**Permintaan:** setiap bagian (profil, about, dan seterusnya) tidak boleh dibuka langsung
sebagai satu daftar — pengunjung harus mendatanginya; lalu perbaiki orientasi model 3D
terhadap kamera.

#### 14.1 Akses panel dibatasi pada kedatangan

| Perubahan | Detail |
| --- | --- |
| **`PortfolioApp.visitStation(id)`** | Menyetel mode klik, menaruh `pendingStationId`, menggerakkan karakter ke titik interaksi stasiun, dan menampilkan penanda tujuan. Panel terbuka hanya ketika jarak masuk `interactDistance` (`updatePendingStation`). |
| **`PortfolioApp.visitView(view)`** | Menerjemahkan bagian/proyek/pengunjung menjadi stasiun. Proyek tanpa bingkai memakai meja Galeri; testimoni tanpa NPC memakai meja Testimoni. |
| **`App.visitView()`** | Satu pintu untuk indeks dan tombol navigasi: menutup overlay yang terbuka, lalu memerintahkan karakter berjalan. |
| **Indeks museum** | Tab Bagian/Proyek/Pengunjung sekarang hanya mengantar (`onVisit`), tidak membuka panel. Teks kaki indeks diperbarui. |
| **Panel museum** | Rail bagian dan tombol angka `1`–`0` dihapus. Tombol “Lihat Portfolio / CV / Hubungi Saya” di Beranda memanggil `visitView`, jadi memindahkan tujuan lewat 3D. |
| **Galeri Proyek** | Detail proyek tetap dibuka di panel yang sama (`localProjectId`) karena pemain sudah berada di meja galeri; tombol kembali cukup menutup detail. |
| **Meja Testimoni** | Bagian Testimoni mendapat meja fisik baru di dekat pintu masuk, sehingga tidak ada bagian yang hanya bisa diakses lewat daftar. |
| **NPC menjauh saat didekati** | `updateEvents('arrive')` mencoba sekali lagi mengejar posisi pengunjung yang berpindah sebelum membatalkan tujuan. |

#### 14.2 Orientasi karakter ke kamera

- `CONFIG.character.spawn.heading` diubah dari `Math.PI` menjadi `Math.PI / 4`, yaitu arah
  kamera diorama (`yaw` kamera juga `π/4`). karakter kini menghadap kamera saat museum
  dimuat, bukan membelakangi.
- `enterOverlay()` juga memutar karakter menghadap kamera (bukan menghadap meja) saat panel
  atau dialog dibuka, sehingga wajahnya tetap terlihat selama pengunjung membaca arsip.

#### 14.3 Verifikasi

- `bun run build` lolos.
- Chrome headless: `heading = 0.785` di spawn; screenshot menunjukkan karakter menghadap kamera.
- Tekan tombol angka tidak lagi membuka panel.
- Indeks → “Tentang Saya” menutup indeks, menyetel `pendingStationId = section-about`,
  karakter berjalan, dan panel baru terbuka setelah tiba (judul “Tentang Saya”).
- Tombol “Lihat CV” di Beranda menutup panel lalu berjalan ke meja CV dan membuka panel CV
  setelah tiba.
- Panel tidak lagi memiliki rail bagian (`section-rail` tidak ada), dan detail proyek dari
  katalog galeri tetap di dalam panel.
- Dialog pengunjung tetap berjalan; tidak ada error console.

---

### 15. Jarak interaksi dan detail proyek lewat bingkai

**Permintaan:** objek dan NPC masih bisa diinteraksi dari terlalu jauh; detail proyek di
Galeri juga terbuka langsung padahal seharusnya harus mendatangi bingkainya.

#### 15.1 Interaksi harus dekat

Sebelumnya jarak diukur dari **titik berdiri** (`interaction`), bukan dari objeknya. Karena
`interactDistance` (3.1) lebih besar daripada `standDistance` (2.1–2.9), panel bisa terbuka
saat karakter masih beberapa meter dari meja.

Perbaikan:

- Setiap koleksi punya `anchor` (pusat objek/NPC) dan `interactRadius` sendiri:
  - meja informasi: `1.45`,
  - bingkai proyek: `1.8`,
  - pengunjung: `1.15`.
- `CONFIG.world.interactDistance` menjadi batas atas (`1.8`), bukan jarak tunggal.
- `interaction` tetap dipakai sebagai titik berhenti: meja `1.15`, bingkai `1.4` dari pusat.
- `PortfolioApp.getInteractRadius()` / `stationAnchor()` dipakai konsisten oleh prompt `E`,
  klik objek, `visitStation()`, `updatePendingStation()`, dan pengecekan saat tiba.
- `Exhibits.findNearest()` memakai `anchor` + radius per koleksi.
- `Visitor.applyTransform()` ikut memperbarui `anchor` karena NPC berjalan.

#### 15.2 Detail proyek hanya di bingkainya

Kartu proyek di katalog Galeri kembali memanggil `onNavigate({ type: 'project', id })`.
`App.visitView()` menutup panel dan mengantar karakter ke bingkai proyek; panel detail baru
terbuka saat ia tiba. Tombol “Kembali ke galeri” mengantar kembali ke meja Galeri Proyek.
`localProjectId` di `MuseumPanel` dihapus.

#### 15.3 Verifikasi

- `bun run build` lolos.
- Meja: pada 2.4 m tidak ada prompt dan `E` tidak membuka apa pun; pada 1.3 m prompt muncul
  dan `E` membuka panel “Keahlian”.
- Pengunjung: pada 1.3 m tidak terdeteksi; pada 1.0 m `E` membuka dialog “Bu Ratna”.
- Galeri: klik kartu proyek menutup panel, menyetel `pendingStationId = project-…`, dan
  karakter berjalan; setelah tiba, panel detail proyek terbuka lengkap dengan cover.
- Tidak ada error console.

---

### 16. Perbaikan blip klik

**Masalah:** suara blip UI hilang saat objek diklik, padahal sebelumnya ada.

**Penyebab:** setelah radius interaksi diperketat, klik objek yang sudah dekat langsung
memanggil `openStation()` dan `return` tanpa `playUi()`. Selain itu `handleClick()` tidak
memastikan AudioContext sudah hidup, sehingga klik pertama (sebelum `unlockAudio` di
`window`) tidak berbunyi.

**Perbaikan di `src/app/PortfolioApp.js`:**

- `handleClick()` memanggil `this.startAudio()` lebih dulu, jadi klik pertama pun punya
  konteks audio.
- Cabang klik dekat memutar `this.sound.playUi()` sebelum membuka panel.
- `visitStation()` juga memanggil `startAudio()` dan `playUi()` saat stasiun sudah dalam
  jangkauan, sehingga navigasi dari indeks/panel tetap berbunyi.

**Verifikasi:** dengan `playUi` distub sebagai penghitung, klik objek dekat, klik objek
jauh, klik tanah, dan `visitView()` dari dekat masing-masing memicu tepat satu blip;
AudioContext dibuat pada klik pertama; tidak ada error console; `bun run build` lolos.

---

### 17. Perbaikan label melayang dan kepadatan teks 3D

**Masalah:** label melayang bingkai proyek berada di bawah layar sehingga tertutup
bingkainya sendiri, dan label meja/bingkai/pengunjung terasa terlalu ramai karena semua
tampil sekaligus dengan subjudul.

#### 17.1 Label bingkai proyek

- `ProjectFrame.nameplate` dipindah dari `y = 0.76` (di bawah layar, tertutup) ke
  **atas bingkai**: `elevation + height / 2 + 0.30`, digeser `z = 0.6` ke arah ruangan agar
  tidak terhalang balok/railing dinding.
- Prompt `E` naik ke `+0.96` di atas puncak bingkai, tetap hanya muncul saat aktif.

#### 17.2 Merombak semua label melayang

- `createNameplateTexture()` mendapat opsi `compact`: satu baris judul dengan cap kecil,
  tanpa subjudul, garis hias, dan bunga plum. Meja dan bingkai memakainya.
- Label meja diperkecil dari `1.95×0.61` menjadi `2.1×0.48` (lebih tipis, satu baris).
- Label bingkai `2.2×0.503`, label pengunjung `1.8×0.563` (tetap nama + peran singkat).
- Prompt interaksi diperkecil (`1.5` untuk meja/bingkai, `1.45` untuk pengunjung).
- Utilitas baru `src/world/floatingText.js`:
  - `distanceVisibility(playerPos, x, z, near, far)` — smoothstep jarak;
  - `applySpriteFade(sprite, opacity)` — opacity + `visible`.
- Setiap `update()` koleksi menerima `playerPos` dan memudarkan labelnya:
  meja `3.5–6.5 m`, bingkai `5–9.5 m`, pengunjung `3.5–7 m`. Dengan begitu hanya label
  di sekitar pemain yang terlihat, bukan seluruh museum.

#### 17.3 Verifikasi

- `bun run build` lolos.
- Chrome headless: label bingkai berada di `y = top + 0.30` (`top = 2.65`), tampil penuh
  (`opacity 0.95`) saat pemain di depan bingkai, dan `visible = false` saat pemain
  menjauh; screenshot menunjukkan label di atas bingkai, tidak tertutup.
- Screenshot luas menunjukkan hanya 2–3 label meja di sekitar pemain, bukan semua bagian.
- Tidak ada error console.

---

### 18. Perbaikan: penanda klik objek hilang

#### 18.1 Penyebab

`enterOverlay()` (dipanggil setiap panel/dialog dibuka) memanggil `world.hideMarker()`
tepat setelah panel dibuka. Akibatnya jalur "klik objek saat sudah dekat" —
yang langsung membuka panel — memunculkan marker lalu menghapusnya di frame yang sama,
sehingga tidak ada riak penanda yang terlihat. Jalur klik jauh masih bekerja.

#### 18.2 Perbaikan (`src/app/PortfolioApp.js`)

- `enterOverlay()` tidak lagi memanggil `world.hideMarker()`; marker dibiarkan
  memudar sendiri lewat `markerHold`.
- Properti baru `markerHold` + helper `pulseMarker(x, z, hold)`:
  marker ditampilkan tanpa syarat karakter sedang berjalan.
- `update()` mengurangi `markerHold` dan hanya memanggil `world.hideMarker()`
  bila karakter tidak berjalan **dan** hold sudah habis.
- Klik objek dari dekat: `pulseMarker(station.interaction, 1.1)` → riak terlihat
  ±1 detik sebelum memudar, lalu panel terbuka.
- Klik objek dari jauh dan `visitStation()`: marker tampil di `station.interaction`
  (titik berdiri di depan objek, bukan titik pusat objek), karakter berjalan ke sana.

#### 18.3 Verifikasi

- `bun run build` lolos.
- Chrome headless, diuji semua 18 stasiun (10 meja bagian, 4 bingkai proyek, 4 pengunjung):
  klik dari dekat → `marker.group.visible = true` di koordinat `station.interaction`,
  1 blip UI, lalu `visible = false` setelah hold habis.
- Klik jauh → marker tampil, `controller.isWalkingToPoint = true`,
  `pendingStationId` terisi.
- Klik tanah biasa tetap menampilkan marker di titik tanah.
- Tidak ada error console.

---

### 19. Penataan ulang denah museum 3D

#### 19.1 Masalah

Lantai 36×36 dengan 10 meja, 6 bingkai, pohon, 2 lentera batu, dan 9 titik NPC
disebar tanpa pola. Meja berdesakan di selatan, pengunjung berjalan menembus
area pohon, balok gantung melintang di tengah layar kamera, dan lentera kertas
melayang memenuhi pandangan — ruangan terasa sempit dan berantakan.

#### 19.2 Denah baru (`src/content/museum.js`)

- Lantai diperbesar ke **44×44** (`world.platformHalf = 22`), dinding di ±20,1.
- **Cincin galeri**: meja menghadap ke dalam di tepi ruangan —
  selatan 4 meja (Beranda, Testimoni, Kontak, CV pada x = −13, −4,3, 4,3, 13),
  timur 3 meja (Keahlian, Sertifikat, Pengalaman pada z = 9, 0, −9),
  barat 3 meja (Tentang, Catatan, Galeri Proyek pada z = 9, 0, −9).
- **Bingkai proyek** seluruhnya di dinding utara, posisinya dihitung
  `projectSlotsFor(n)` dengan jarak 6,8 m dan simetris terhadap sumbu tengah
  (maksimal 6 bingkai).
- **Plaza tengah**: pohon plum pindah ke (0, 0), dikelilingi lempeng batu radius
  5,2 m dan cincin tinta. Lantai plaza sedikit lebih terang dari lantai utama.
- **Pengunjung** mengitari plaza pada satu cincin radius 7,2 m dengan 8 slot
  berjarak sama dan boundary 4,4×4,4 m, sehingga tidak ada NPC yang berdempetan.
- **Lentera batu** mengapit lorong masuk di (±7,2, 20,2); tidak lagi di tengah
  jalur utama.

#### 19.3 Arsitektur (`src/world/Museum.js`)

- Dinding, panel, balok, pilar, spanduk, dan papan nama kini dihitung dari
  `platformHalf` — tidak ada lagi koordinat tetap 16,1/33.
- **Balok gantung dan lentera kertas di langit-langit dihapus** (material kertas
  tetap ada untuk inti lentera batu). Garis gelap besar yang melintang di layar
  dan bola-bola melayang hilang.
- Pilar dibagi rata di sepanjang dua dinding (7 titik per dinding).

#### 19.4 Kamera & cahaya (`src/config.js`, `src/world/Lighting.js`)

- Kamera: jarak 21 (min 12, maks 34), deadzone 1,6, batas 34 — pandangan lebih
  luas untuk ruangan baru; spawn di (0, 19), batas karakter ±20.
- Pencahayaan dinaikkan (hemisphere 0,9; key 2,35; fill 0,5) dan ditambah
  **cahaya depan** dari sisi kamera (0,42) agar meja dan bingkai terbaca.
  Peta bayangan diperlebar ke ±28, fog ditipiskan ke 0,011, exposure 1,12.
- Label meja/bingkai/pengunjung dipersempit jangkauan tampilnya
  (2,2–4,2 / 3,6–7,2 / 2,5–4,8 m) agar tidak menggantung di tengah layar.

#### 19.5 Verifikasi

- `bun run build` lolos.
- Chrome headless: seluruh 18 stasiun (10 meja, 4 bingkai, 4 pengunjung) dapat
  dibuka dengan klik saat berdiri di titik interaksinya; semua titik interaksi
  berada di dalam batas karakter dan tidak tertutup collider.
- Berjalan dari spawn (0, 19) ke meja Sertifikat (±21 m) sampai tiba dan panel
  terbuka.
- Screenshot dari beberapa sudut: meja tidak lagi berdesakan, galeri proyek
  rata di dinding utara, plaza tengah terbuka, tidak ada balok/lentera melayang.
- Tidak ada error console.

---

### 20. Rotasi kamera bertahap (tetap isometrik)

#### 20.1 Perilaku

- Seret **tombol kanan** (atau tombol tengah) di kanvas memutar diorama.
  Setiap 60 px seret = satu langkah **15°**; arah seret menentukan arah putar.
- Rotasi dibatasi **±30°** dari sudut awal (`camera.yaw`, 45°), jadi hanya ada
  rentang 15°–75°. Kamera tidak bisa diputar bebas 360°: komposisi galeri dan
  sudut isometrik tetap terjaga.
- `pitch` tidak berubah — kamera tetap pada kemiringan 33°, hanya berputar
  mengelilingi karakter. `R` mengembalikan sudut ke awal.
- Pergerakan WASD memakai `rig.getMovementYaw()`, sehingga arah gerak ikut
  menyesuaikan kamera yang sudah diputar.

#### 20.2 Implementasi

- `src/core/InputManager.js`: pointer tombol kanan/tengah dicatat terpisah
  (`rotatePointerId`), akumulasi `clientX`, dan memanggil `onRotate(±1)` setiap
  60 px. Klik kiri tetap untuk berjalan; hover dan zoom tidak berubah.
- `src/core/CameraRig.js`: `yawTarget` + `shortestAngle()` untuk animasi halus
  (`rotationSmoothing`), `rotateStep()` meng-clamp offset ke `rotationLimit`,
  `reset()` memulihkan `yaw`.
- `src/config.js`: `camera.rotationStep` (15°), `camera.rotationLimit` (±30°),
  `camera.rotationSmoothing`.
- `src/world/Museum.js`: dinding utara/barat dipisah jadi grup dan
  disembunyikan bila kamera melewati bidang dinding (pertahanan bila batas
  rotasi dilonggarkan nanti).
- Panduan di `HelpOverlay` dan hint HUD menambahkan “Seret kanan putar”.

#### 20.3 Verifikasi

- `bun run build` lolos.
- Chrome headless: seret kanan 300 px = +30° (dua langkah 15°), seret kiri jauh
  mentok di −30°, `R` kembali ke 45°.
- Setelah rotasi: `pitch` tetap 0,58 rad dan tinggi kamera tetap ±12,46 m
  (isometrik), kamera berputar mengelilingi karakter.
- Klik meja Galeri Proyek dari sudut kamera yang sudah diputar tetap membuka
  panel yang benar.
- Tidak ada error console.

---

### 21. Rotasi kamera penuh 360°

#### 21.1 Perubahan

- Batas ±30° dihapus. `CameraRig.rotateStep()` sekarang hanya menambah sudut
  target dan menormalkannya ke −180°…180°, jadi seret kanan bisa memutar
  diorama penuh satu putaran.
- Logika langkah tetap: 60 px seret = 15° (24 posisi per putaran), animasi halus
  `rotationSmoothing`, `pitch` tidak berubah (tetap isometrik), `R` kembali ke
  sudut awal 45°.
- `camera.rotationLimit` dihapus dari `src/config.js`.

#### 21.2 Penyesuaian agar semua sudut tetap rapi

- **Punggung bingkai proyek** (`ProjectFrame`) diberi panel kayu gelap di belakang
  layar, jadi dari belakang terlihat seperti papan display, bukan layar kosong
  yang tembus pandang.
- **Cahaya pengisi mengikuti kamera** (`Lighting.update` menerima `cameraPos`):
  sisi objek yang sedang dilihat selalu mendapat cahaya depan, berapa pun sudut
  putarannya.
- **Dinding utara/barat** tetap otomatis disembunyikan saat kamera melewatinya
  (sudah ada sejak bagian 20).
- **Pohon plum** dirombak menjadi mahkota radial: 6 ranting dengan gugusan bunga
  di ujung dan tengah ranting, plus pucuk tengah — bentuknya tetap terbaca dari
  segala arah, tidak lagi tampak seperti beberapa tongkat dengan bola-bola.

#### 21.3 Verifikasi

- `bun run build` lolos.
- Chrome headless: 24 langkah `rotateStep(1)` menghasilkan 24 sudut unik dan
  kembali tepat ke 45° (satu putaran penuh).
- Screenshot dari 0°, 90°, 180°, 270°: dinding utara hilang saat kamera di
  belakangnya (yaw 180°, kamera z = −23,6), dinding barat tetap tampil; bingkai
  proyek menampilkan punggung panel kayu; tidak ada layar kosong/tembus pandang.
- Klik meja Keahlian dari kamera yang menengok dari utara tetap membuka panel
  “skills” dengan benar.
- Tidak ada error console.

---

### 22. Pathfinding A* menuju penanda klik

#### 22.1 Masalah

Karakter hanya berjalan lurus ke titik klik. Bila meja, pilar, atau pohon berada
di antara posisi dan tujuan, ia menabrak, meluncur di tepinya, lalu tombol
"macet" menghentikannya sebelum sampai — penanda klik tetap di tempat, tetapi
karakter berhenti di jalan.

#### 22.2 Solusi (`src/core/navigation.js`)

- Kelas **`NavGrid`** membangun grid 0,4 m di atas batas karakter (`config.character.bounds`).
  Sel ditandai terhalang bila pusatnya lebih dekat dari `radius collider +
  bodyRadius + 0,06`; penghalang statis diambil dari `World.staticColliders`
  (museum + meja/bingkai; pengunjung yang bergerak tidak masuk grid).
- **A\*** 8 arah dengan biaya 1 / √2, heuristik oktil, `Float32Array` untuk
  `gScore`, dan binary heap. Sudut penghalang tidak boleh dipotong diagonal.
- Rute dihaluskan dengan **string pulling** (`hasLineOfSight` + sampling garis),
  sehingga karakter berjalan lurus antar tikungan, bukan zig-zag per sel.
- Titik awal/tujuan yang jatuh di sel terhalang digeser ke sel walkable terdekat;
  titik tujuan asli tetap ditambahkan di ujung rute agar karakter berhenti tepat
  di penanda.
- Tanpa rute, `findPath()` mengembalikan `null` dan controller kembali ke jalur
  lurus seperti sebelumnya.

#### 22.3 CharacterController

- `moveTo()` sekarang menghitung rute (`buildPath()`) dan mengikuti waypoint
  satu per satu (`currentWaypoint()`), melewati waypoint yang sudah dekat.
- Perlambatan menjelang tiba memakai jarak ke **tujuan akhir**, bukan waypoint,
  jadi kecepatan tidak mendadak turun di tikungan.
- Bila macet (kecepatan < 0,12 m/s selama 1,1 detik), rute dihitung ulang
  maksimal dua kali dari posisi sekarang; setelah itu event `arrive` dikirim
  seperti perilaku lama.
- `cancelDestination()`, `teleportToSpawn()`, dan WASD membersihkan rute.

#### 22.4 Verifikasi

- `bun run build` lolos.
- Rute dari (0; 3,2) ke (0; −3,2) di seberang pohon: 4 waypoint, panjang 8,36 m
  (garis lurus 6,4 m), tidak ada waypoint di dalam radius pohon, A* ±1,2 ms.
- 18 stasiun diuji dari spawn: semuanya menghasilkan rute dan berakhir tepat di
  titik interaksi (error 0,000 m); A* terburuk ±1,1 ms.
- Berjalan nyata dari (0; 19) ke (0; 13) — melewati celah meja — tiba (sisa 0,16 m)
  tanpa re-path; dari sudut pilar (−19; −19) ke (−17; −17) rute memutari pilar
  dan tiba (sisa 0,16 m).
- Klik jauh ke meja Sertifikat: karakter menempuh rute dan panel “certificates”
  terbuka otomatis.
- Tidak ada error console.

---

### 23. Tata letak berbasis kepentingan & Galeri Proyek di tengah

#### 23.1 Galeri Proyek di tengah sumbu x

- Meja Galeri Proyek dipindah dari barat (−16,4; −9) ke **x = 0 dengan z tetap −9**,
  menghadap ke selatan (`rotationY = 0`), jadi titik interaksinya (0; −7,85) berada
  di sisi plaza dan barisan bingkai proyek di dinding utara tetap terlihat di
  belakangnya.

#### 23.2 Urutan meja sesuai kepentingan

- **Selatan (menghadap pintu masuk, z = 15,4):** Beranda (0), Tentang Saya (−9),
  Testimoni (9). Beranda kini tepat di depan spawn (0; 19), sehingga menjadi hal
  pertama yang terlihat dan bisa langsung dituju.
- **Barat (menghadap timur):** Keahlian (z 9) → Sertifikat (0) → Pengalaman (−9).
- **Timur (menghadap barat):** Kontak (z 9) → CV (0) → Catatan (−9).
- Rotasi meja selatan sebelumnya `π` (menghadap ke dalam, membelakangi pintu); kini
  `0` sehingga pengunjung melihat muka meja dan plakatnya sejak masuk.
- **Beranda diberi penanda khusus:** cincin lantai kedua radius 1,0–1,14 m dengan
  denyut halus (`landmarkRing`) dan label nama yang bertahan sampai 6,5 m
  (meja lain 4,2 m).

#### 23.3 Pengunjung

- Cincin pengunjung diubah ke radius **6,8 m** dengan offset sudut 22,5° dan
  boundary 3,4×3,4 m, sehingga tidak ada NPC yang berdiri di depan meja Galeri
  Proyek (0; −9) atau di lorong masuk. Tidak ada boundary yang menabrak collider
  meja (diuji otomatis).

#### 23.4 Verifikasi

- `bun run build` lolos.
- Semua 18 stasiun dapat dibuka dengan klik saat berdiri di titik interaksinya
  (tidak ada yang gagal).
- 18 stasiun punya rute A* dari spawn; berjalan ke Beranda tiba (sisa 0,19 m),
  berjalan dari (0; 3) ke Galeri Proyek memutari pohon lalu panel “projects”
  terbuka otomatis.
- Screenshot: Beranda di tengah depan dengan cincin penanda dan label terbaca,
  Galeri Proyek tepat di sumbu tengah menghadap plaza, meja barat/timur tersusun
  rapi sesuai urutan.
- Tidak ada error console.

---

### 24. Ruangan ringkas & galeri proyek dinamis

#### 24.1 Ruangan diperkecil

- `world.platformHalf` turun dari 22 ke **18** (36 × 36 m), batas karakter `±16`,
  dan kamera dirapatkan: `distance` 18, `minDistance` 10, `maxDistance` 28,
  `bounds ±28`, `deadzone` 1,4. Spawn pindah ke (0; 14,2) tepat di depan meja
  Beranda sehingga titik mulai tetap menjadi hal pertama yang terlihat.
- Semua meja digeser tanpa mengubah urutan kepentingan:
  - selatan z = 11,8: Beranda (0), Tentang Saya (−7,2), Testimoni (7,2);
  - barat x = −11,8: Keahlian (z 7,2), Sertifikat (0), Pengalaman (−7,2);
  - timur x = 11,8: Kontak (7,2), CV (0), Catatan (−7,2);
  - Galeri Proyek tetap di tengah sumbu x, z = −7,2, menghadap selatan.
- Lentera batu masuk ke (±6,5; 15,6), dinding tetap di ±16,1. Panel dinding
  dikurangi dari lima menjadi empat (sepanjang 11 m dari titik tengah) agar panel
  6,1 m tidak saling menumpuk; spanduk dipindah ke ujung dinding.
- Cincin pengunjung mengecil ke radius 5,0 dengan boundary 1,35; tidak ada kotak
  jelajah yang menabrak meja atau planter pohon (diuji otomatis).

#### 24.2 Galeri proyek mengikuti jumlah proyek

- Batas lama 6 bingkai dihapus. `projectSlotsFor(n)` menyusun bingkai dinamis:
  - ≤ 6 proyek: bingkai 3,4 × 2,2 m, jarak hingga 6,8 m;
  - 7–8 proyek: bingkai 3,0 × 1,95 m;
  - 9–20 proyek: bingkai 2,5 × 1,62 m, 10 bingkai memenuhi dinding utara lalu
    sisanya melanjut ke dinding barat (maksimal 20 bingkai).
- Posisi dihitung simetris terhadap pusat dinding; tidak ada bingkai yang
  menumpuk (jarak minimum 0,44 m pada barisan terpanjang). Label nama dan badge
  interaksi ikut mengecil (`labelScale`) agar tidak menutupi bingkai tetangga.
- Bingkai dinding barat berada di x = −15 (0,85 m di depan permukaan dinding)
  dengan titik interaksi x = −13,6, menyisakan koridor ±1,8 m di depan meja barat.

#### 24.3 Verifikasi

- `bun run build` lolos.
- Database berisi 10 proyek → **10 bingkai** tampil di dinding utara (sebelumnya
  terpotong jadi 6); semua 10 punya rute A* dari spawn dan panel proyeknya terbuka.
- Uji data 26 proyek (intercept API): 20 bingkai (10 utara + 10 barat), semua
  rute tersedia, bingkai dinding barat membuka panel proyek yang benar, tanpa
  error console.
- Berjalan ke bingkai terjauh dari (0; 6) tiba di titik interaksi lalu panel
  terbuka otomatis (±8 detik).
- Screenshot: ruangan terasa lebih dekat dan penuh, Beranda tetap paling menonjol,
  barisan 10 bingkai proyek rapi memenuhi dinding utara tanpa tumpang tindih.

---

### 25. Semua proyek dapat bingkai + perabot pengisi ruang

#### 25.1 Masalah

`Exhibits` memotong daftar proyek dengan `projects.slice(0, projectSlots.length)`,
sedangkan `projectSlotsFor` berhenti di 20 slot (10 utara + 10 barat). Proyek ke-21
dan seterusnya hanya muncul di panel Galeri 2D — di dunia 3D seolah tidak ada. Ruang
juga terasa kosong di antara meja dan di tepi timur/selatan yang tak berdinding.

#### 25.2 Galeri yang tidak lagi berbatas (`src/content/museum.js`)

- `projectSlotsFor(n)` kini selalu mengembalikan **n slot** untuk n proyek. Rencana
  tata letak dipilih berurutan:
  1. **bingkai lapang satu baris**: 3,4 × 2,2 m (≤ 7 proyek), lalu 3,0 × 1,95 m
     (≤ 8), lalu 2,5 × 1,62 m. Dinding utara dipakai lebih dulu (≤ 10 bingkai);
     bila tidak cukup, koleksi dibagi rata dua dinding (`ceil(n/2)` +
     `floor(n/2)`) supaya tidak ada bingkai yang menyendiri di dinding barat;
  2. **rak bertiang dua baris** setelah dua dinding penuh satu baris (21–40 untuk
     bingkai 2,5 m): baris atas digantung pada tiang baris bawah (`rank`, `hung`,
     `postHeight`), tepi atas tetap di bawah balok dinding (maks. 4,15 m);
  3. **koleksi luar biasa besar** (41+): bingkai lebih kecil (2,2 → 1,66 m) tetap
     dua baris, dan di atas ±56 proyek bingkai terkecil dirapatkan, jumlah kolom
     ditambah, dan lebarnya diperkecil lagi agar tidak pernah bertumpuk.
- Baris atas memakai titik berdiri yang lebih jauh (`1,4 m + 1,55 m per baris`) dan
  `interactRadius` yang sepadan, jadi berdiri dekat dinding memilih bingkai bawah
  dan melangkah mundur memilih bingkai atas — dua bingkai di kolom yang sama tidak
  berebut tombol `E`.
- `Config.world.interactDistance` berubah peran menjadi cadangan: radius milik tiap
  koleksi yang menentukan (`Exhibits.findNearest` tidak lagi memotongnya).
- Diuji dengan simulasi angka: n = 1…80 selalu menghasilkan tepat n slot, tanpa
  bingkai bertumpuk, tepi terjauh 14,5 m (di dalam dinding 16,1 m), dan baris atas
  tidak menembus balok.

#### 25.3 Perabot dan hiasan (`src/world/Props.js`)

Modul baru berisi hiasan yang tidak bergantung pada database, semuanya mengikuti
bahasa rupa Wangsheng (batu, kayu gelap, kuningan, kertas lentera, bunga plum):

- sepasang **dudukan dupa** kuningan berkaki tiga dengan tiga batang hio membara
  di (±2,9; 7,4), mengapit jalan masuk plaza;
- empat **pot batu berisi plum muda** (batang bengkok + rumpun bunga) di diagonal
  plaza (±5,6; ±5,6), aman dari kotak jelajah pengunjung (radius 7,92 m);
- dua **tiang kayu bergantungan dua lentera kertas** di (±14,4; 15,4) dengan
  lengkung penopang, tali, dan lampu titik hangat; lenteranya bergoyang pelan;
- empat **bangku batu** beralas kain (dua di tepi timur, dua di tepi selatan);
- dua **guci keramik** (`LatheGeometry`) berisi ranting plum kering di sisi Beranda;
- sepasang **lentera batu kecil** mengapit meja Galeri Proyek (±4,4; −10,2);
- tumpukan **peti arsip bertali bambu** (sebagian bertumpuk dua, satu bergulungan
  kertas) di belakang barisan bingkai, z = −15,05.

Semua prop berdiri di lantai mendaftarkan collider di `Props.colliders`; `World`
menggabungkannya ke `colliders`/`staticColliders` **sebelum** `NavGrid` dibangun,
sehingga A* tidak pernah merencanakan rute menembus perabot. `Props.update()`
menggerakkan lentera gantung, bunga plum, dan nyala dupa, serta mengedipkan lampu
lentera; `dispose()` membebaskan tekstur, material, dan geometri.

#### 25.4 Verifikasi

- Penataan slot diverifikasi lewat simulasi angka (n = 1…80, lihat 25.2).
- **Belum diverifikasi secara visual**: shell di mesin ini gagal start
  (`Failed to attach disk '…ext4.vhdx' to WSL2`), jadi `bun run build` dan
  `bun run dev` tidak bisa dijalankan. Langkah berikutnya: jalankan
  `bun run build`, lalu periksa museum dengan 10, 20, dan 30 proyek, serta cek
  bahwa prop baru tidak menutupi meja/bingkai dari sudut kamera default.

---

### 26. Testimoni dari pengunjung + persetujuan admin

#### 26.1 Masalah

Testimoni hanya bisa dibuat dari dashboard admin. Pengunjung museum yang ingin
memberi kesan harus keluar ke formulir kontak dan menulis “kesan”, yang masuk ke
kotak masuk pesan — bukan ke koleksi Testimoni. Di sisi lain, kolom `approved` pada
tabel `testimonials` sudah ada tetapi belum punya jalur kiriman publik maupun alat
persetujuan cepat di dashboard.

#### 26.2 Kiriman publik: `POST /api/testimonials` (`server/api/public.js`)

- Menerima `{ name, role?, organization?, type?, quote }`. `type` dibatasi
  `TESTIMONIAL_TYPES` dari `shared/content-schema.js`; `role` dan `organization`
  dipotong 120 karakter; nama 2–80 karakter; kutipan 10–800 karakter.
- Rate limit berbagi dengan formulir pesan: 5 kiriman / 10 menit / IP.
- Baris **selalu** disimpan `approved = 0` (dan `avatar_url`, `project_id` kosong).
  Endpoint publik tidak punya cara menerbitkan testimoni sendiri — moderasi bukan
  opsional.
- Karena `getPortfolio()` hanya membaca `WHERE t.approved = 1`, kiriman yang belum
ditinjau tidak muncul sebagai kartu di panel Testimoni **dan** tidak pernah menjadi
`Visitor` di museum 3D. Menyetujui satu baris cukup untuk memunculkannya di kedua
tempat sekaligus.

#### 26.3 Formulir di panel museum (digantikan pada §27)

Versi pertama menaruh formulir “Tulis testimoni” di dalam panel Testimoni. Bagian
ini kemudian dipindahkan menjadi benda fisik: lihat **§27 Papan tempel testimoni**.
Panel Testimoni sekarang hanya berisi arsip testimoni yang disetujui, buku tamu, dan
kartu penunjuk “Berjalan ke papan”.

`.field select` sudah diberi gaya di `views.css` (border, latar kertas, fokus
vermilion) saat formulir itu masih ada; gayanya dibiarkan agar select lain di panel
konsisten.

#### 26.4 Persetujuan di dashboard (`src/admin/AdminApp.svelte`)

- `getOverview()` menambah `counts.testimonialsPending` (`approved = 0`).
- Bagian Testimoni punya banner jumlah kiriman tertunda, filter **Semua / Menunggu
  persetujuan / Sudah tampil**, dan tombol **Setujui / Sembunyikan** di setiap baris
  (`PUT /api/admin/testimonials/:id` dengan `{ approved }`), tanpa harus membuka modal.
- Badge navigasi samping memakai jumlah tertunda (gaya `warn`) agar kiriman baru
  terlihat dari bagian lain dashboard.
- Pesan status kosong dibedakan per filter supaya “tidak ada testimoni yang menunggu
  persetujuan” tidak tertukar dengan “belum ada testimoni”.

#### 26.5 Verifikasi

- Berkas yang diubah lolos pemeriksaan sintaks (`new Function` untuk berkas server,
  ekstraksi blok `<script>` untuk komponen Svelte).
- **Belum diuji di browser**: shell di mesin ini masih gagal start, jadi alur
  kirim → setujui → tampil belum dijalankan. Langkah berikutnya: `bun run dev`, buka
  meja Testimoni, kirim satu testimoni, pastikan tidak muncul di panel/museum, lalu
  setujui dari `/admin` dan muat ulang museum.

---

### 27. Papan tempel testimoni (benda, bukan formulir)

#### 27.1 Masalah

Formulir di dalam panel terasa seperti halaman web yang ditempel ke museum. Padahal
museum ini punya aturan sejak awal: bagian hanya terbuka setelah karakter mendatangi
objeknya. Menulis testimoni juga bisa mengikuti aturan itu — dan hasilnya bisa
langsung terlihat di dunia, bukan hanya sebagai pesan status.

#### 27.2 Benda: `src/world/PinBoard.js`

Papan goni berbingkai kayu, dua tiang A, batang bambu, dan dua kertas gantung
“留言” yang bergoyang. Mulai §28 papan ini **menggantikan meja Testimoni**: posisinya
(7,2; 11,9) di tempat meja lama, menghadap pintu masuk (`TESTIMONIAL_BOARD` di
`src/content/museum.js`).

- **Permukaan**: `createPinBoardTexture()` — goni kraft dengan serat, noda air,
  judul tinta “留言” dan cap vermilion, plus ranting plum pucat di sudut.
- **Kertas**: testimoni yang sudah disetujui dipaku sebagai kertas 0,4 × 0,5 m dalam
  kisi 4 × 2 dengan goyang tangan (rotasi ±4°, geser ±1,5 cm). Tiap kertas memakai
  `createPinNoteTexture()`: nama, peran berhuruf kapital, kutipan bergaris buku, cap
  kategori (`師/友/客/職`), dan pin vermilion di tepi atas. Kertas yang masih menunggu
  persetujuan mendapat cap diagonal `待審`.
- **Rak tulis**: tumpukan kertas kosong, batu tinta, dan kuas miring — penanda bahwa
  papan ini tempat menulis, bukan sekadar pajangan.
- **Interaksi**: `kind: 'board'`, `interactRadius` 1,7, titik berdiri 1,5 m (collider
  0,8 — margin 0,34 m terhadap radius badan 0,36 m, sama seperti bingkai proyek),
  plus ring penanda di lantai, label nama `compact`, dan badge prompt `E`.
- **Animasi**: `update()` menggoyang kertas gantung, menumbuhkan kertas baru dari
  skala 0,2 ke 1 dengan sedikit putaran, dan menaikkan `emissiveIntensity` pin saat
  papan aktif.
- Kertas dibatasi 8 supaya papan tidak penuh; kiriman ke-9 melepas kertas tertua
dengan `disposeNote()` (geometri, material, dan teksturnya ikut dibuang).

#### 27.3 Mekanik di panel: `src/ui/views/BoardView.svelte`

Tiga langkah, bukan satu formulir panjang:

1. **Baca** — dinding kertas 2 kolom, tiap kertas punya pin, nama, peran, kutipan
   terbatas tiga baris, dan cap kategori. Klik = kertas membuka selebar panel dan
   kutipan penuh terbaca; klik lagi menutup. Kertas kiriman sesi ini muncul paling
   depan dengan label “Menunggu admin”.
2. **Ambil kertas** — tumpukan kertas bergambar (tiga lembar berselisih rotasi) dan
   tombol “Ambil kertas”; lembar kosong lalu masuk dengan animasi `sheet-in`.
3. **Tulis dan tempel** — nama di garis tinta, kategori sebagai empat cap persegi
   (bukan dropdown), kesan di area bergaris buku dengan meter tinta dan hitungan
   karakter, lalu tombol “Tempelkan di papan” yang memakai titik pin sebagai ikon.
   Setelah berhasil, kertas berubah menjadi keadaan “Sudah dipaku” dengan cap `待審`
   (`stamp-in`), tombol “Tutup dan lihat papannya”, dan “Tulis kertas lain”.

`onPosted` dipanggil **saat kiriman berhasil**, bukan saat panel ditutup, sehingga
`PortfolioApp.postBoardNote()` sudah memaku kertas baru di papan 3D (plus
`playPageAdvance()` dan lambaian karakter) selagi panel masih terbuka.

Panel Testimoni (`TestimonialsView.svelte`) awalnya dipakai sebagai panel arsip dengan
kartu “Berjalan ke papan”; sejak §28 isinya dipindah ke papan dan berkas itu menjadi
komponen dinding kertas di dalam `BoardView`.

Opsi `view.type === 'board'` di `MuseumPanel` sudah ada sejak tahap ini; §28
menggantinya dengan kunci bagian `testimonials` biasa, jadi tidak ada lagi bagian papan
tersendiri di luar `SECTION_ORDER`.

#### 27.4 Verifikasi

- Sintaks semua modul baru/berubah lolos pemeriksaan (`new Function` untuk JS,
  ekstraksi `<script>` dan hitung blok `{#if}`/`{#each}` untuk komponen Svelte).
- Geometri dihitung ulang lewat simulasi: kedelapan slot kertas berada di dalam area
  goni (x ±0,86 dari ±1,0; y −0,60…0,43 dari ±0,675), semua di bawah garis judul
  papan; titik berdiri 1,50 m dari pusat papan, di luar radius collider + badan
  (1,16 m), jadi margin 0,34 m — sama dengan bingkai proyek.
- **Belum dilihat secara visual**: shell di mesin ini masih gagal start, jadi
  `bun run build`/`bun run dev` tidak bisa dijalankan. Yang belum dicek: apakah tekstur
  kertas terbaca pada ukuran 0,4 m dan apakah animasi tempel terasa pas.

---

### 28. Meja Testimoni diganti papan pengunjung

#### 28.1 Masalah

Papan tempel pada §27 berdiri di sebelah meja Testimoni, sehingga ada dua tempat untuk
satu hal: meja membuka panel, papan membuka panel lain, dan pengunjung harus menebak
mana yang harus didatangi. Selain itu status “menunggu persetujuan admin” hanya berupa
satu baris teks di kertas, padahal itu satu-satunya hal yang paling perlu dipahami
pengirim.

#### 28.2 Satu benda, satu identitas

- `SECTIONS.testimonials` **kehilangan `position`/`rotationY`/`standDistance`**, jadi
  `PHYSICAL_SECTIONS` tidak lagi membuat `InfoStation` untuknya — meja Testimoni hilang.
  Metadata bagian itu tetap ada (label, seal, accent, `eyebrow`, `subtitle`,
  `description`) karena dipakai kepala panel dan indeks.
- `TESTIMONIAL_BOARD` pindah ke **(7,2; 11,9) dengan `rotationY: 0`** — persis tempat meja
  lama, di baris selatan antara Beranda dan bangku, dan memakai id
  **`section-testimonials`**.
  Efeknya: `MuseumIndex`, `visitView({type:'board'})`, dan fallback klik pengunjung di
  luar 8 slot NPC semuanya mendarat di papan yang sama; tidak ada lagi id `board-testimonials`
  yang terpisah.
- `BOARD_SECTION` dihapus; `PinBoard` memakai `SECTIONS.testimonials` langsung, jadi hanya
  ada satu sumber label/judul/prompt.

#### 28.3 Komponen: `TestimonialsView.svelte` jadi dinding kertas

Berkas itu dulu panel arsip mandiri; sekarang ia komponen **dinding kertas** yang dipakai
`BoardView` (`testimonials`, `pending`, `onBlip`). Isinya: jumlah kertas, strip
“N kertas menunggu persetujuan admin”, saringan kategori, kisi kertas 2 kolom (klik =
terbuka penuh), dan catatan arti cap `待審`. Semua arsip yang disetujui tampil di sini —
bukan hanya 8 yang muat di papan 3D.

`BoardView` tinggal mengurus meja tulis (ambil kertas → tulis → cap → tempel), buku tamu
yang sudah disetujui admin, dan kartu status. `MuseumPanel` merender `BoardView` untuk
`sectionKey === 'testimonials'`, tanpa cabang “board” khusus.

#### 28.4 Status “menunggu admin” dibuat eksplisit

1. **Di papan (3D & panel)** — kertas pending diberi cap miring `待審` di sudut, latar
   lebih gelap, garis tepi amber, dan label kaki “Menunggu persetujuan admin”, bukan
   “Menunggu admin”.
2. **Strip di atas dinding** — “N kertas menunggu persetujuan admin — belum tampil di
   museum” dengan titik amber berdenyut.
3. **Kartu status setelah menempel** — tiga tahap bernomor: **Ditempel (selesai) →
   Menunggu persetujuan admin (sedang berjalan) → Tampil di museum (otomatis)**, ditambah
   catatan bahwa kertas `待審` hanya bertahan sampai museum dimuat ulang dan kiriman tetap
   tersimpan.

#### 28.5 Verifikasi

- `BoardView`, `TestimonialsView`, `MuseumPanel`, `MuseumIndex`: blok `<script>` lolos
  `new Function`, jumlah `{#if}`/`{#each}` seimbang, tidak ada sisa variabel dinding
  (`notes`, `filter`, `toggle`, `selected`) di `BoardView`.
- Posisi baru diperiksa numerik: titik berdiri (7,2; 13,4) → 1,50 m dari pusat papan,
  margin 0,34 m terhadap collider 0,8 + badan 0,36, dan 4,6 m dari guci terdekat
  (2,7; 12,9) sehingga tidak ada collider yang tumpang tindih.
- **Belum diuji di browser**: shell masih gagal, jadi `bun run build`/`bun run dev` belum
  dijalankan. Yang belum dicek: apakah papan di posisi tengah selatan terlihat bagus
  dari sudut kamera awal, dan apakah tinggi papan menutupi Beranda di belakangnya.

---

### 29. Setiap bagian punya bendanya sendiri

#### 29.1 Masalah

Sembilan bagian museum memakai satu meja kayu yang sama, hanya label, cincin, dan aksen
warnanya berbeda. Dari sudut isometrik semuanya terbaca sebagai satu objek yang di-copy:
plaza terasa seperti deretan meja administratif, bukan museum. Sebaliknya papan testimoni
(§27–§28) terasa hidup karena bentuknya khas dan ada benda kecil di sekitarnya.

#### 29.2 Pembagian tugas

`InfoStation` sekarang hanya mengurus hal yang **memang** harus seragam:

- papan label melayang `createSectionPlaqueTexture()` — diperkecil dari 1,32 × 0,9 ke
  **1,02 × 0,7 m**, dinaikkan ke y 1,5, dan **kedua batang kayu penahannya dihapus** karena
  itulah yang membuat semua meja terlihat sama;
- label nama `compact`, prompt `E`, ring penanda, `landmarkRing` beranda, dan hit area;
- `update()` meneruskan `bodyAnimation(elapsed)` dari bendanya.

Bentuk benda dipindah ke modul baru `src/world/stationBodies.js`:
`createStationMaterials(track, accent)` (palet batu/kayu/bambu/kuningan/kertas/tinta +
cap beraksen) dan `buildSectionBody(sectionKey, { group, mats, section, accent })` yang
mengembalikan `{ animate }` atau `null`.

#### 29.3 Sembilan benda

| Bagian | Benda | Isi |
| --- | --- | --- |
| Beranda | meja penerima setengah lingkaran | buku tamu terbuka, peta museum tergulung, lonceng panggil, tiang lentera kertas, vas plum |
| Tentang Saya | altar bulat + naskah potret | naskah **terbentang mendatar** dengan siluet tinta kepala–bahu, baris keterangan, cap nama, dupa |
| Keahlian | tangga bilah bambu | lima bilah bertingkat (tinggi = tingkat), tanda tinta di puncak, dua kuas menggantung, batu tinta, kertas latihan |
| Galeri Proyek | korsel bingkai mini | empat bingkai mini berputar 0,28 rad/detik, garis isi seperti tangkapan layar, katalog tergulung, lonceng |
| Sertifikat | dinding piagam | tiga pigura berderet, cap lilin, pita merah berayun, nampan gulungan piagam |
| Pengalaman | peta perjalanan | jalur tinta + sungai, tiga pin lokasi berflag, kompas kuningan, buku agenda, tongkat bambu |
| CV Digital | meja tulis + rak penjemuran | naskah ditahan pemberat batu, kuas di tempat, empat salinan bertumpuk, tiga lembar bergantung di rak |
| Kontak | tiang pos | kotak surat bercelah dengan tiga surat bersegel, bendera, lonceng bertali, nampan amplop berlak, batu tinta |
| Catatan | meja baca bersandar | buku terbuka di sandaran miring, tiga gulungan bertali, batu tinta, lentera kertas berdenyut |

Aturan bentuknya: **isi tengah ≤ 1,2 m**, elemen tinggi (tiang, rak, tongkat) diletakkan
di samping kiri/kanan supaya papan label di y 1,5 tetap terbaca; semuanya memakai primitif
(Boks, Silinder, Kerucut, Bola, Torus, Plane) tanpa aset luar.

#### 29.4 Verifikasi

Diuji lewat simulasi: modul dijalankan dengan stub `three`, lalu setiap mesh dihitung AABB
dunia (translasi + rotasi induk, termasuk grup tutup/kuas/tali/korsel):

```
home 0.00..1.36  about 0.00..1.11  skills 0.00..1.43  projects 0.00..1.17
certificates 0.00..1.08  experience 0.00..1.30  cv 0.00..1.22
contact 0.00..1.40  blog 0.00..1.32      x ±0,55..0,94   z ±0,24..0,68
```

Tidak ada bagian yang menembus lantai atau melewati papan label, delapan benda beranimasi,
dan semua `animate()` dipanggil sekali dengan waktu uji untuk memastikan tidak melempar.
Satu-satunya peringatan palsu yang muncul: cincin torus — di three.js torus berada di
bidang XY sehingga ketebalannya di sumbu Z, bukan Y; simulatornya yang perlu dibetulkan,
bukan bendanya.

#### 29.5 Revisi: benda harus mewakili pekerjaannya

Versi pertama sudah berbeda-beda, tetapi masih terbaca sebagai “meja dengan hiasan”:
ambang, prasasti, rak, mimbar, peti. Revisi ini mengganti metaforanya menjadi **fungsi**:

- beranda → **meja penerima** (buku tamu, peta, lonceng): museum menyambut dan mencatat tamu;
- tentang → **altar + naskah potret**: satu-satunya benda yang dibaca **mendatar**, jadi
  mata jatuh ke wajahnya, bukan ke label;
- keahlian → **tangga bilah**: tinggi bilah = tingkat keahlian, jadi persentase di panel
  punya bentuk di dunia;
- proyek → **korsel bingkai yang berputar**: galeri yang bisa ditelusuri, bukan papan pajang;
- sertifikat → **dinding piagam**: deretan pigura + pita = bukti penghargaan;
- pengalaman → **peta + pin**: perjalanan, bukan tumpukan berkas;
- CV → **rak penjemuran naskah**: dokumen yang baru selesai dan siap dibawa;
- kontak → **kotak surat dengan surat bersegel**: benda yang memang menerima pesan;
- catatan → **meja baca menyala**: tempat orang membaca, bukan menumpuk kertas.

Setiap benda juga punya satu **gerak tanda tangan** yang hanya cocok untuk fungsinya:
lonceng berayun (menerima tamu), korsel berputar (menjelajah), pita sertifikat bergoyang,
flag pin di peta berkibar, kertas CV berjemur, lentera catatan berdenyut.

**Belum dilihat secara visual**: shell masih gagal start, jadi `bun run build`/`bun run dev`
belum bisa dijalankan. Yang belum tercek: proporsi tiap benda pada sudut kamera isometrik,
apakah papan label di y 1,5 terasa terlalu melayang di atas altar Tentang (1,11 m), dan
apakah siluet baru tetap terbaca saat sembilan bagian terlihat bersamaan.

---

### 30. Pemeriksaan animasi: mana yang “aneh” dan kenapa

Setelah benda per bagian ditambahkan, dunia punya banyak sekali gerak kecil. Sebagian
dari gerak itu tidak punya poros yang masuk akal, jadi mata membacanya sebagai benda
rusak — bukan sebagai hidup. Semua gerak diperiksa satu per satu dengan tiga pertanyaan:
**diputar dari titik mana, seberapa cepat, seberapa besar**.

#### 30.1 Yang dibetulkan

Catatan angka: frekuensi di bawah ditulis sebagai **periode** (detik), karena di kode
nilainya berupa `Math.sin(t * ω)` — ω = 2π/periode. ω = 1,1 berarti satu ayunan tiap
5,7 detik, bukan 1,1 kali per detik.

| Objek | Masalah | Perbaikan |
| --- | --- | --- |
| Lonceng meja Beranda | poros di alas, jadi lonceng jungkir ke samping | ayunan dihapus — lonceng meja memang diam |
| Papan label semua stasiun | bergeser ±14 mm tiap 5,7 s + bergulir | ±4 mm tiap 15,7 s, tanpa gulir |
| Nyala lentera (Museum, Props, Beranda, Catatan) | berdenyut tiap 1,3–3,3 s | tiap 7,4–9 s, amplitudo 0,02–0,03 |
| Cahaya lentera batu | berdenyut tiap 1,34 s | tiap 7,4 s (dua sinus bertumpuk) |
| Cahaya tiang lentera | berdenyut tiap 1,75 s | tiap 6,0 s |
| Lentera proyek | intensitas berayun tiap 1,0 s | tiap 5,7 s |
| Kanopi plum (Museum, Props) | seluruh kelompok bunga **berputar** pada porosnya | animasi dihapus; gerak hanya lewat partikel |
| Bendera kotak surat | tiang ikut miring karena poros di tengah tiang | tiang ditanam statis, hanya kain berputar pada porosnya |
| Kertas terbaru di papan testimoni | bergoyang terus walau tidak dibuka | bergoyang hanya saat pemain di papan |
| Badge prompt `E` | irama 2,0 s di lima objek, amplitudo 3–3,5 cm | 4,2 s, ±2 cm, sama di semua objek |
| Korsel Proyek | 0,28 rad/s (22 s/putaran) | 0,16 rad/s (±40 s/putaran) |
| Pita sertifikat, pin peta, kuas, kertas CV, lentera catatan | amplitudo 0,06–0,22 rad, periode 2,4–7 s | amplitudo 0,014–0,16 rad, periode 5,5–11 s |

#### 30.2 Aturan yang dipakai sekarang

1. **Poros = titik gantung.** Lentera, kuas, pita, kertas, dan label bagasi dibangun
   menjuntai ke bawah dari posisi grupnya, jadi `rotation.z` grup memang berayun.
2. **Benda terpaku tidak bergerak.** Yang dipaku, ditanam, atau berdiri di lantai tidak
   boleh bergoyang.
3. **Tidak ada putaran penuh** kecuali korsel Proyek.
4. **Cahaya bernapas, tidak berkedip.** Periode ≥5 detik, amplitudo ≤5% dari nilai dasar.
5. **Teks tidak ikut bergoyang.** Papan label hanya boleh bergeser beberapa milimeter.
6. **Satu irama untuk satu jenis gerak** (badge prompt, label nama), supaya dunia terasa
   satu sistem, bukan kumpulan animasi.

Aturan ini juga ditulis di `AGENTS.md` §6 butir 9 agar perubahan berikutnya tidak
mengulang kesalahan yang sama.

#### 30.3 Verifikasi

- `stationBodies.js`, `InfoStation.js`, `ProjectFrame.js`, `PinBoard.js`, `Museum.js`,
  `Props.js`, `Visitor.js`, `Guide.js`: parse OK.
- Modul benda dijalankan ulang dengan stub `three`: sembilan bagian membangun tanpa error
  dan `animate()` menghasilkan perubahan hanya pada node yang memang dimaksud (Beranda 1
  node, Kontak 2, CV 3, Sertifikat 3, Pengalaman 3, Catatan 1).
- `blossomGroups` sudah tidak ada lagi di `Museum.js`/`Props.js` (sisa hanya di
  `Courtyard.js` yang tidak diimpor siapa pun).
- **Belum dilihat secara visual** — shell masih gagal, jadi irama baru belum dicoba di
  browser. Angka di atas dipilih dari perhitungan, bukan dari pengamatan.

---

### 31. Bug pose overlay: tangan naik sendiri dan kepala berputar penuh

#### 31.1 Gejala

Saat karakter diam (idle), setelah beberapa detik tangannya terangkat makin tinggi dan
kepala/body berputar terus sampai lebih dari 360°. Saat berjalan normal: tidak ada masalah.

#### 31.2 Sebab

`AnimationController.pose()` dulu memakai `bone.quaternion` **saat itu** sebagai titik
tolak, lalu menambahkan delta prosedural di atasnya. Itu hanya aman kalau pose tulang
itu dikembalikan ke pose animasi setiap frame.

Ternyata `@moeru/three-mmd` menyimpan cache pose di `beforePhysics()` — yaitu **setelah**
callback overlay kita berjalan:

```
mmd.beforeUpdate()      // pulihkan cache pose (sudah termasuk overlay frame lalu)
mixer.update(delta)     // hanya menulis tulang yang ada di klip
overlay()               // pose() menumpuk di atas sisa overlay frame lalu
mmd.update(delta)       // cache = pose akhir (termasuk overlay)
```

Untuk tulang yang dianimasikan klip (mis. tulang kaki pada klip walk) mixer menimpa nilainya,
jadi aman. Untuk tulang yang **tidak** ada di klip idle, nilai sisa overlay tadi dipulihkan
apa adanya, lalu overlay menambahkan delta yang sama lagi — setiap frame. Integral itulah
yang terlihat sebagai tangan naik dan kepala berputar.

Hitungan untuk varian idle (amplitude kepala 0,34 rad, berat 0–1, window 3,4 detik pada
60 fps):

| Bagian | Kode lama | Kode sekarang |
| --- | --- | --- |
| Kepala (sumbu Y) | **1193°** menumpuk selama satu window | 14°, terbatas oleh delta |
| Lengan | **140°** terangkat (pose `左腕`/`右腕` 0,06–0,08 rad) | 0°, lengan tidak dipose lagi |

#### 31.3 Perbaikan

1. `AnimationController` menyimpan **pose dasar per tulang** di `_overlayBase`. `pose()`
   memakai pose dasar itu, bukan `bone.quaternion` saat ini, sehingga delta tidak pernah
   dijumlahkan lebih dari sekali.
2. `restoreOverlayBones()` memulihkan semua tulang yang dipose ke pose dasar itu, dan
   dipanggil **tepat sebelum `mixer.update()`** — lewat hook baru
   `Character.updateWithMixer(delta, mixer, { restore, apply })`. Setelah mixer menulis
   pose baru, tulang yang dianimasikan klip tetap segar; tulang di luar klip bersih dari
   sisa overlay.
3. Variasi idle dipersempit: hanya `頭`, `首`, dan `上半身` yang menengok (maks 14°),
   lengan tidak lagi disentuh. Overlay di lengan paling mudah terbaca sebagai “tangan
   naik sendiri”, dan gerak lengan sudah cukup dari klip idle.

Perbaikan ini juga menutup masalah yang sama pada emote lain (`playWave`, `playCheer`,
`playLandImpact`) yang memakai jalur `pose()` yang sama.

#### 31.4 Verifikasi

- `AnimationController.js` dan `Character.js`: parse OK.
- Satu-satunya pemanggil `updateWithMixer` sudah memakai bentuk `{ restore, apply }`
  (`src/character/AnimationController.js:162`).
- Simulasi penumpukan (rotasi satu sumbu = penjumlahan sudut, 60 fps, window penuh)
  menghasilkan angka di tabel 31.2: 1193° → 14°, lengan 140° → 0°.
- **Belum dijalankan di browser** — shell masih mati, jadi belum ada konfirmasi visual
  bahwa idle sekarang tenang. Yang bisa dipastikan dari kode: tidak ada lagi jalur yang
  memakai pose hasil overlay sebagai titik tolak.

---

### 32. Transisi lompat sebagai klip VMD (diam / jalan / lari → lompat)

> **Sudah dihapus — lihat §34.** Bagian ini disimpan sebagai catatan sejarah:
> tiga klip lepas landas itu dibangun dari data di kode, bukan berkas VMD, dan
> pemilik proyek meminta fiturnya dicabut. Lompat sekarang murni pose prosedural.

#### 32.1 Permintaan

Lompat tidak boleh cuma “badan naik lalu turun”. Dibutuhkan tiga animasi transisi:

| Dari | Ke | Terlihat sebagai |
| --- | --- | --- |
| diam | lompat | jongkok pendek, dorong dua kaki, tuck di udara |
| jalan | lompat | tapak menapak di tengah langkah, dorong satu kaki, kaki lain memimpin |
| lari | lompat | badan condong, tolakan panjang, ayunan tangan besar |

Syarat tegas dari pemilik proyek: animasinya **berformat VMD**, bukan pose prosedural
baru dan bukan berkas GLTF.

#### 32.2 Kenapa VMD dan bagaimana caranya

`@moeru/three-mmd` memuat gerak lewat `VMDLoader` → `VmdObject` → `buildAnimation()`.
Kalau klip transisi dibuat dengan jalur lain (`AnimationClip` rakitan sendiri, atau pose
prosedural tambahan), gerakannya tidak akan lagi setara dengan `idle.vmd` dan tidak bisa
diperiksa di MMD. Karena itu jalurnya dibuat sama persis:

1. Pose ditulis sebagai keyframe di `src/character/jumpMotions.js` (Euler lokal, 30 fps).
2. `src/character/vmd.js` menulis byte VMD sungguhan dari keyframe itu.
3. Byte tersebut dibungkus `Blob` → `URL.createObjectURL()` → `VMDLoader.loadAsync()`.
4. `buildAnimation(vmd, mesh)` menghasilkan `AnimationClip` yang dipakai `AnimationMixer`.

Berkas tidak perlu ada di disk saat bermain, tapi `bun run motions:build`
(`scripts/build-jump-motions.js`) menulis hasil yang sama ke
`public/motions/jump-idle.vmd`, `jump-walk.vmd`, dan `jump-run.vmd` supaya bisa dibuka
di MMD/MMD Tools. Berkas yang sudah ada tidak ditimpa kecuali dengan `--force` —
lihat §33, karena isi folder itu sekarang milik hasil Mixamo.

> **Skrip dan klip ini sudah dicabut (§34).**

#### 32.3 Tata letak byte yang ditulis

| Bagian | Ukuran | Isi |
| --- | --- | --- |
| Tanda tangan | 30 | `Vocaloid Motion Data 0002` |
| Nama model | 20 | `karakter`, sisanya nol |
| Jumlah keyframe | 4 | uint32 little-endian |
| Keyframe tulang | 111 × n | lihat di bawah |
| Morph, kamera, cahaya, bayangan, properti | 4 × 5 | semuanya 0 |

Satu keyframe tulang: nama 15 byte (Shift-JIS, diisi nol), nomor frame 4 byte (30 = 1
detik), posisi 3 float, kuaternion 4 float, lalu 64 byte interpolasi. Interpolasinya
diisi pola linear MMD — `(x1,y1) = (20,20)` dan `(x2,y2) = (107,107)` untuk keempat
kurva — sehingga gerakan mengikuti waktu apa adanya, tanpa easing yang tidak diminta.

Dua penyesuaian ruang, sama seperti yang dilakukan pembaca pustaka:

| Ruang three.js | Byte VMD |
| --- | --- |
| kuaternion `(x, y, z, w)` | `(-x, -y, z, w)` |
| offset posisi `(x, y, z)` | `(x, y, -z)` |

Posisi tulang tidak dianimasikan sama sekali (semua nol): gerak naik-turun sudah diurus
`CharacterController` (fisika lompat), jadi klip hanya mengurus pose badan. Kalau klip
juga menggeser `センター`, tinggi lompatan jadi dobel.

Nama tulang harus sama persis dengan nama di PMX, dan ditulis dalam Shift-JIS. Encoder
membangun tabel balik satu kali dari `new TextDecoder('shift_jis')` (range 0x81–0x9F,
0xE0–0xFC, ditambah katakana lebar tunggal), lalu menyimpannya per karakter — jadi tidak
ada tabel hardcode yang bisa salah. Tulang yang tidak dikenal model diabaikan pembaca,
tidak menimbulkan error.

#### 32.4 Klip yang dibuat

| Klip | Jumlah key | Frame terakhir | Durasi | Isi |
| --- | --- | --- | --- | --- |
| `jumpIdle` | 65 | 18 | 0,60 s | jongkok (0,13) → dorong (0,27) → tuck (0,43) → tahan (0,60) |
| `jumpWalk` | 65 | 21 | 0,70 s | tengah langkah → tapak → dorong → kaki memimpin → tahan |
| `jumpRun` | 65 | 21 | 0,70 s | lari condong → tapak keras → tolakan panjang → tuck → tahan |

13 tulang per klip: `上半身`, `首`, `頭`, `左肩`, `右肩`, `左腕`, `右腕`, `左ひじ`,
`右ひじ`, `左足`, `右足`, `左ひざ`, `右ひざ`. Semuanya nama yang sudah dipakai
`AnimationController.pose()`, jadi pasti ada di model ini.

Durasi klip sengaja dekat dengan waktu di udara: `jumpSpeed` 4,6 dan `gravity` 14
menghasilkan ±0,66 detik melayang, jadi klip habis hampir tepat saat mendarat.

#### 32.5 Kapan klip dipakai

`AnimationController.updateTakeoff()` memantau perubahan `state.grounded`:

```
grounded true → false   pilih klip dari controller.speed saat menolak tanah
grounded false → true   bobot klip ditarik ke 0 (pendaratan)
```

Ambang (`CONFIG.animation.takeoff`): kecepatan < `idleSpeed` 0,45 → `jumpIdle`;
< `1,45 × walkSpeed` (≈1,96) → `jumpWalk`; selebihnya `jumpRun`. Dengan `walkSpeed`
1,35 dan `runSpeed` 3,35, tiga keadaan itu terpisah jelas.

Pencampuran bobot:

- aksi sekali pakai (`LoopOnce`, `clampWhenFinished`) supaya pose terakhir bertahan
  sampai dipudarkan, bukan melompat balik ke frame nol;
- bobot naik dalam 0,06 detik dan turun 0,18 detik sebelum akhir klip;
- lapisan `idle/walk/run` diredam `1 - 0,85 × takeoffWeight`. Tanpa ini mixer menjumlah
  bobot dasar 1 + klip 1, jadi klip hanya dapat separuh pengaruh dan pose terlihat
  “setengah jongkok”;
- `applyJump()` (tuck prosedural) dikalikan `(1 - takeoffWeight)` agar tidak menumpuk di
  tulang yang sama dengan klip.

Pemulihan pose overlay (§31) tetap berlaku: klip lepas landas hanya menulis lewat
`mixer`, sedang overlay prosedural tetap memakai `_overlayBase`.

#### 32.6 Verifikasi

- `src/character/vmd.js`, `src/character/jumpMotions.js`,
  `src/character/AnimationController.js`, `src/config.js`: parse OK.
- Tata letak byte diuji dengan menulis lalu membaca ulang buffer memakai offset yang
  sama dengan pembaca `@moeru/three-mmd` (`BoneKeyFrame`: nama 15, frame 4, posisi 12,
  kuaternion 16, interpolasi 64 di +47): jumlah keyframe, nomor frame, kuaternion
  identitas, blok interpolasi `20/20/20/20/20/20/20/20/107…`, dan lima hitungan nol di
ekor terbaca benar. Ukuran akhir 7.289 byte per klip.
- Interpolasi dicek terhadap `pushInterpolation` pustaka yang membaca byte
  `index+0` (x1), `index+8` (x2), `index+4` (y1), `index+12` (y2): pola 20/107 memberi
  kurva identitas untuk X, Y, Z, dan rotasi, jadi tidak ada easing yang menyimpang.
- **Belum dijalankan di browser**: shell (bash/WSL) masih gagal di tahap mount disk, jadi
  belum ada konfirmasi visual bahwa tiga transisi itu enak dilihat. Yang bisa dipastikan
  dari kode: klip dimuat lewat jalur VMD yang sama, bobotnya tidak menumpuk dengan tuck
  prosedural, dan tidak ada klip yang diputar berulang.

#### 32.7 Kalau gerakannya terasa salah

Tiga penyetelan yang paling mungkin dibutuhkan setelah dilihat langsung:

1. **Kaki menembus lantai saat jongkok.** Turunkan `ひざ` (mis. −0,66 → −0,48) atau
   besarkan `足` positif di key jongkok.
2. **Tuck terasa terlalu cepat.** Geser key tuck (0,43) lebih lambat, atau naikkan
   `fadeOut` supaya klip bertahan lebih lama di puncak.
3. **Transisi lari terasa “patah”.** Klassen pemilihan klip ada di `startTakeoff()`;
   `runFactor` bisa diturunkan supaya lompat pelan pun memakai klip lari.

---

### 33. Animasi Mixamo → VMD lewat rig.reze.one

> **Berlaku untuk `idle.vmd`, `walk.vmd`, `run.vmd` saja.** Slot klip lepas landas
> (`jump-idle/jump-walk/jump-run.vmd`) dan generator cadangan yang dijelaskan di
> §33.3 sudah dicabut — lihat §34.

#### 33.1 Permintaan

Gerak karakter harus berasal dari **Mixamo**, bukan dari keyframe tulisan tangan,
dan hasil konversinya disimpan di `public/motions/`. Konversi FBX → VMD memakai
alat web <https://rig.reze.one/> (`AmyangXYZ/reze-rig`), bukan skrip lokal.

#### 33.2 Alur kerja

| Langkah | Di mana | Hasil |
| --- | --- | --- |
| 1 | Mixamo → pilih animasi → **Download** | `FBX Binary`, *Without Skin* |
| 2 | rig.reze.one → **Upload Model** | zip `karakter.pmx` + tekstur |
| 3 | rig.reze.one → **Upload FBX** | pratinjau gerak pada model itu |
| 4 | rig.reze.one → **Download VMD** | berkas `.vmd` |
| 5 | proyek | `public/motions/<nama>.vmd` |
| 6 | `bun run motions:check` | laporan durasi/tulang/akar |

Model harus diunggah lebih dulu: reze-rig mengukur posisi tulang dari PMX yang
ada di viewport, lalu menulis rotasi parent-local untuk hierarki MMD
(`センター` / `上半身` / `左腕` / …). Tanpa model, hasilnya memakai proporsi lain
dan bisa jadi klip kosong untuk model ini.

Nama berkas yang dibaca aplikasi:

| Berkas | Slot di `CONFIG.assets.motions` | Dipakai |
| --- | --- | --- |
| `idle.vmd` | `idle` | berdiri diam, berulang |
| `walk.vmd` | `walk` | berjalan, berulang |
| `run.vmd` | `run` | berlari, berulang |
| `jump-idle.vmd` | `jumpIdle` | transisi diam → lompat |
| `jump-walk.vmd` | `jumpWalk` | transisi jalan → lompat |
| `jump-run.vmd` | `jumpRun` | transisi lari → lompat |

#### 33.3 Berkas diutamakan, generator jadi cadangan

§32 membuat klip lepas landas dari data di `jumpMotions.js`. Sekarang urutannya
dibalik supaya Mixamo yang menentukan:

```
loadTakeoffClip(name, url)
  ├─ parseClip(url)            berkas public/motions/*.vmd
  │    ├─ hilang / 404         → lanjut
  │    └─ 0 track              → lanjut (retarget memakai model lain)
  └─ createVmdUrl(TAKEOFF_MOTIONS[name])   cadangan dari jumpMotions.js
```

`parseClip()` menolak klip tanpa satu pun track. Ini penting: `buildAnimation`
diam-diam melewati nama tulang yang tidak ada di PMX, jadi VMD hasil retarget
dengan model lain tidak menimbulkan error — hanya pose yang tidak bergerak.
Dengan pemeriksaan itu, museum tetap berjalan normal walau folder belum diisi.

Karena `load()` dulu memuat **semua** kunci `CONFIG.assets.motions`, daftar itu
sekarang dipisah: `BASE_CLIPS` (idle/walk/run, berulang) dan `TAKEOFF_CLIPS`
(jump*, sekali pakai). Kalau tidak dipisah, klip lompat akan dimuat dua kali dan
mendapat dua aksi di mixer.

#### 33.4 Translasi tulang akar dibuang

Mixamo menganimasikan `Hips` — termasuk naik-turun dan kadang gerak maju. Setelah
retarget, itu menjadi track `.bones[センター].position`. Posisi karakter di museum
sudah diurus `CharacterController` (termasuk fisika lompat), jadi memakai
translasi akar berarti satu lompatan naik **dua kali** dan karakter bisa melayang
keluar dari jalur klik.

`withoutRootTranslation(clip)` membuang track posisi untuk `センター`,
`全ての親`, `グルーブ`, dan `ダミー`; track rotasi tetap dipakai, karena rotasi akar
adalah bagian dari pose (mis. badan menoleh saat melompat). Klip dibangun ulang
dengan `new AnimationClip(nama, durasi, tracks)` supaya durasinya tidak berubah.

#### 33.5 Pemeriksa: `bun run motions:check`

`scripts/mixamo_to_mmd.js` dulu berisi konverter setengah jadi (dan blok
interpolasinya salah untuk cara baca pustaka). Sekarang isinya pemeriksa:

- `readVmd(buffer)` membaca tanda tangan, nama model, dan semua keyframe tulang
  (`nama 15 · frame 4 · posisi 12 · kuaternion 16 · interpolasi 64`) — offset yang
  sama dengan `@moeru/three-mmd`;
- `summarizeMotion(vmd)` melaporkan durasi (`frame/30`), jumlah tulang, tulang
  wajib yang hilang (`REQUIRED_BONES`), dan apakah ada translasi akar;
- CLI-nya memeriksa `public/motions/*.vmd` atau berkas yang disebut di argumen,
  lalu keluar dengan kode 1 bila ada berkas rusak.

Peta `MIXAMO_TO_MMD_BONE_MAP` dipertahankan sebagai rujukan saat memeriksa hasil
retarget secara manual (mis. `mixamorigLeftForeArm` → `左ひじ`).

#### 33.6 Verifikasi

- `src/character/AnimationController.js`, `src/config.js`,
  `scripts/mixamo_to_mmd.js`: parse OK.
- Alur cadangan diuji secara logis: berkas tidak ada → `parseClip` mengembalikan
  `null` → klip dari `jumpMotions.js` dibangun → aksi `LoopOnce` dibuat. Tidak ada
  jalur yang membuat dua aksi untuk satu nama klip.
- **Belum dijalankan di browser maupun Bun**: shell masih mati (WSL gagal mount),
  jadi belum ada klip Mixamo sungguhan yang pernah dimuat. Yang bisa dipastikan:
  pembaca VMD di skrip pemeriksa memakai offset yang sama dengan pustaka, dan
  jalur fallback tidak bergantung pada berkas yang belum ada.

#### 33.7 Setelan yang paling mungkin perlu diubah setelah klip Mixamo dipasang

| Gejala | Setelan |
| --- | --- |
| kaki meluncur saat berjalan | `animation.walkClipSpeed` (panjang langkah / durasi siklus) |
| kaki meluncur saat berlari | `animation.runClipSpeed`, `runTimeScaleMax` |
| lompat terasa terlalu cepat/lambat | `character.jumpSpeed`, `character.gravity` |
| langkah tidak bergerak sama sekali | `bun run motions:check` (tulang hilang = model salah) |

---

### 34. Klip lompat dihapus: animasi hanya dari berkas VMD

#### 34.1 Permintaan

“Hapus animasi jumpnya karena dia gak menggunakan vmd file.” Klip lepas landas di
§32 memang dibuat dari keyframe di dalam kode (`jumpMotions.js` → byte VMD di
memori → `Blob` → `VMDLoader`). Secara format byte-nya VMD, tetapi bukan berkas
di `public/motions/` — jadi ia satu-satunya animasi yang tidak bisa diperiksa
di MMD dan tidak bisa diganti tanpa menyentuh kode. Itu yang diminta hilang.

#### 34.2 Yang dicabut

| Berkas | Keadaan sekarang |
| --- | --- |
| `src/character/AnimationController.js` | `loadTakeoffMotions`, `loadTakeoffClip`, `parseClip`, `updateTakeoff`, `startTakeoff`, `withoutRootTranslation`, field `takeoff*`, dan impor `AnimationClip`/`LoopOnce` **dihapus** |
| `src/character/jumpMotions.js` | tinggal komentar + `export {}`; tidak diimpor siapa pun |
| `src/character/vmd.js` | tinggal komentar + `export {}`; tidak diimpor siapa pun |
| `scripts/build-jump-motions.js` | tinggal pesan “sudah tidak dipakai” |
| `package.json` | skrip `motions:build` dicabut; `motions:check` tetap |
| `src/config.js` | kunci `jumpIdle/jumpWalk/jumpRun` dan blok `animation.takeoff` dihapus |
| `src/app/PortfolioApp.js` | `getDebugInfo()` kembali tanpa `takeoffClip`/`takeoffWeight` |

Berkas yang tidak dipakai tidak bisa dihapus dari sini (shell mati), jadi isinya
dikosongkan. Hapus manual bila mau bersih:

```
del src\character\jumpMotions.js src\character\vmd.js scripts\build-jump-motions.js
del public\motions\jump-idle.vmd public\motions\jump-walk.vmd public\motions\jump-run.vmd
```

(Perintah `del` yang kedua hanya perlu bila `motions:build` pernah dijalankan;
berkas itu tidak dibaca lagi.)

#### 34.3 Keadaan setelah pencabutan

- `AnimationController.load()` hanya memuat `BASE_CLIPS` = `idle`, `walk`, `run`
  dari `CONFIG.assets.motions`, semuanya `LoopRepeat`, dipadukan menurut
  kecepatan seperti sebelumnya.
- Lompat tetap ada: `CharacterController.jump()` mengubah `grounded`, dan
  `applyJump()`/`applyLand()` memberi pose tuck + pendaratan secara prosedural
  (jalur yang sudah dipakai sebelum §32).
- `applyJump()` kembali memakai `this.jumpWeight` tanpa faktor peredam, karena
  tidak ada lagi klip yang bertabrakan di tulang yang sama.
- Tidak ada `await` tambahan di jalur pemuatan setelah klip dasar, jadi layar
  pemuatan tidak bisa tertahan oleh permintaan VMD yang menggantung.

#### 34.4 Verifikasi

- `grep -i "takeoff|jumpMotions|TAKEOFF|createVmdUrl|LoopOnce|AnimationClip"` di
  `src/` → **tidak ada hasil**; `package.json` hanya menyisakan `motions:check`.
- `AnimationController.js` turun dari 467 → 369 baris dan parse OK (nama kelas,
  `load`, `update`, `applyJump`, `dispose` utuh).
- `src/config.js`, `src/app/PortfolioApp.js`: parse OK.
- **Belum dijalankan di browser** — shell masih mati (WSL gagal mount disk), jadi
  belum ada konfirmasi visual bahwa lompat tanpa klip terasa wajar.

---

### 35. Fisika model pindah ke Bullet/Ammo.js

#### 35.1 Masalah dengan spring bone

`@moeru/three-mmd-physics-springbone` adalah pegas murni: tiap tulang fisika
ditarik ke posisi istirahatnya, tanpa benda padat. Akibatnya pada karakter:

- ekor rambut dan ujung lengan baju menembus punggung dan lengan saat berbalik;
- kain tidak punya massa, jadi berhenti seketika saat karakter mendadak berhenti;
- lebar ayunan hanya ditentukan kekakuan pegas, bukan panjang/tabrakan tulang.

`@moeru/three-mmd-physics-ammo` menjalankan **Bullet** (Ammo.js): rigid body +
constraint per tulang fisika, gravitasi, dan collision group — perilaku yang sama
dengan MMD aslinya. Itulah yang dipakai sekarang.

#### 35.2 API yang dipakai

Sesuai README paketnya:

```js
import { MMDAmmoPlugin } from '@moeru/three-mmd-physics-ammo'

const mmd = await new MMDLoader()
  .register(MMDAmmoPlugin)   // harus SEBELUM loadAsync
  .loadAsync('/models/karakter/karakter.pmx')
```

Plugin itu yang menginisialisasi runtime Ammo bersama lalu memasang physics
service pada `MMD`. `initAmmo()` hanya diperlukan kalau memakai `MMDAmmoPhysics`
langsung (`mmd.setPhysics(...)`) — bukan jalur yang dipakai museum.

#### 35.3 Perubahan berkas

| Berkas | Perubahan |
| --- | --- |
| `package.json` | tambah `"@moeru/three-mmd-physics-ammo": "0.2.0-beta.2"` (spring bone tetap, sebagai cadangan) |
| `src/character/ammoPhysics.js` | **baru** — satu-satunya tempat yang mengimpor paket ammo; dipakai sebagai pintu impor dinamis |
| `src/character/Character.js` | `load()` mencoba kandidat fisika berurutan, `loadModel()` per percobaan, `unloadModel()` untuk bersih-bersih, `physicsEngine` + `physicsFallback` dilaporkan |
| `src/config.js` | `physics.engine: 'ammo'` (`'spring'` untuk memaksa pegas) |
| `src/app/PortfolioApp.js` | meneruskan `CONFIG.physics.engine`, mencetak `[Museum] Fisika aktif: …`, `getDebugInfo()` memuat `physicsEngine`/`physicsFallback` |

#### 35.4 Cadangan bertingkat (supaya museum tidak pernah mati)

1. **Paket belum terpasang** → `import('./ammoPhysics.js')` ditolak Vite,
ditangkap `loadAmmoPlugin()`, kembali `null`, kandidat tinggal spring bone.
2. **Ammo gagal inisialisasi** (wasm diblokir, memori habis) → `loadAsync` melempar,
`load()` membersihkan hasil setengah jadi lalu mengulang dengan spring bone.
3. **Semua gagal** → error asli dilempar ke `LoadingScreen` (bukan halaman putih).

Karena itu ammo sengaja **tidak** dimasukkan ke `optimizeDeps.include`: kalau
paketnya belum ada, Vite akan gagal start sebelum cadangan sempat dipakai.

#### 35.5 Yang harus dijalankan sekali

```bash
bun install     # mengambil @moeru/three-mmd-physics-ammo + wasm Ammo
bun run dev
```

Setelah museum terbuka, konsol browser mencetak
`[Museum] Fisika aktif: ammo`. Kalau yang tercetak `spring`, ikuti §35.6.

#### 35.6 Troubleshooting

| Gejala | Sebab & tindakan |
| --- | --- |
| konsol: `Fisika Ammo tidak tersedia …` | paket belum terpasang → `bun install`, lalu restart `bun run dev` |
| konsol: `Failed to resolve import "@moeru/three-mmd-physics-ammo"` | sama, atau `bun.lock` belum diperbarui |
| `Fisika aktif: spring (cadangan: …)` | ammo dimuat tetapi gagal saat `loadAsync`; pesan aslinya ada di baris `Gagal memuat model dengan fisika ammo` |
| rambut/kain bergetar liar lalu meledak | rigid body menumpuk; tekan `P` dua kali (reset fisika) atau kecilkan `character.scale` |
| karakter melayang/amblas | fisika memakai satuan PMX; pastikan `mmd.setScalar` tetap dipanggil sebelum fisika dijalankan |
| `bun run build` gagal resolve paket | jalankan `bun install` dulu — ammo diimpor statis di `ammoPhysics.js`, jadi Rollup butuh paketnya ada |

#### 35.7 Verifikasi

- `src/character/Character.js`, `src/character/ammoPhysics.js`, `src/config.js`,
  `src/app/PortfolioApp.js`: parse OK; tidak ada lagi `import` ammo di jalur kritis.
- `grep SpringBone` → hanya `Character.js` (cadangan) + komentar config.
- **Belum dijalankan di browser** — shell masih mati, jadi belum ada konfirmasi
  bahwa wasm Ammo benar-benar termuat dan rambut jatuh wajar.

---

### 36. Mobile friendly: satu-satunya kontrol di layar sentuh adalah ketuk

#### 36.1 Keputusan

“Mobile hanya menggunakan option klik.” Jadi di ponsel/tablet:

- tidak ada mode WASD, tidak ada `Tab`, dan tidak ada papan ketik virtual;
- bergerak dengan **mengetuk** lantai, objek, atau tujuan di indeks;
- memutar diorama dengan **seret satu jari**, zoom dengan **cubit dua jari**;
- tombol sistem pindah ke satu baris di bawah layar, setinggi ibu jari.

Desktop tidak berubah sama sekali.

#### 36.2 Deteksi perangkat

`src/core/device.js` memakai media query, bukan `navigator.userAgent`:

```js
isTouchDevice()   // (pointer: coarse) && (hover: none)
isCompactScreen() // lebar ≤ 720 px
```

Syaratnya **dua-duanya**: ponsel dan tablet tidak punya hover, sedangkan laptop
layar sentuh tetap melaporkan `hover: hover` untuk tetikusnya — laptop seperti
itu tetap dapat mode WASD. Hasilnya disimpan di `PortfolioApp.touch`.

#### 36.3 Gestur di `InputManager`

Mouse dan sentuh memakai callback yang sama (`onClick`, `onRotate`, `onZoom`),
tetapi jalur sentuh punya aturan sendiri:

| Gestur | Implementasi |
| --- | --- |
| Ketuk | `pointerdown` hanya mencatat kandidat; klik dikirim saat **`pointerup`** bila gerak ≤ 14 px dan tahan ≤ 800 ms |
| Seret satu jari | akumulasi horizontal, 48 px per langkah 15° (mouse 60 px) |
| Cubit dua jari | selisih jarak jari × 2,2 → delta roda mouse (rentangkan = zoom masuk) |
| Jari kedua turun | kandidat ketukan dibatalkan, zoom mengambil alih |
| Jari kedua diangkat | `rotateLastX` di-reset ke jari yang tersisa agar kamera tidak melompat |
| `pointercancel` | ketukan tidak pernah dikirim (hanya `pointerup` yang boleh) |

`onHover` **tidak** dipanggil untuk sentuh: tidak ada hover di layar sentuh, dan
memanggilnya membuat highlight berkedip saat jari lewat.

Klik mouse tetap diproses pada `pointerdown` seperti sebelumnya, supaya penanda
tujuan tidak terasa tertahan.

#### 36.4 Perubahan berkas

| Berkas | Perubahan |
| --- | --- |
| `src/core/device.js` | **baru** — `isTouchDevice()`, `isCompactScreen()` |
| `src/core/InputManager.js` | jalur sentuh penuh: peta pointer, kandidat ketukan, cubitan, `releaseAll()` |
| `src/app/PortfolioApp.js` | `this.touch`; `controlMode` dikunci `'point'`; auto-pindah ke WASD dimatikan di sentuh; `touch` ikut di `getDebugInfo()` |
| `src/core/Engine.js` | batas pixel ratio 1,75 di sentuh; FOV melebar sampai 1,35× di layar potret |
| `src/App.svelte` | meneruskan `touch` ke `Hud` dan `HelpOverlay` |
| `src/ui/Hud.svelte` | sakelar mode + baris tombol papan ketik disembunyikan, petunjuk gestur, bar tombol bawah (min 46 px), prompt `Ketuk` |
| `src/ui/HelpOverlay.svelte` | daftar gestur terpisah untuk sentuh;`max-height` memakai `dvh` |
| `src/ui/MuseumIndex.svelte`, `MuseumPanel.svelte`, `VisitorDialog.svelte` | sasaran ketuk ≥ 40 px, dialog naik dari bawah, `dvh` |
| `src/ui/views/views.css` | tombol ≥ 44 px dan isian 16 px (mencegah auto-zoom iOS) |
| `src/ui/WebEmbedModal.svelte` | tinggi memakai `dvh` |
| `src/app.css` | `height: 100dvh`, `overscroll-behavior: none`, `-webkit-tap-highlight-color: transparent` |
| `index.html` | `viewport` ditambah `viewport-fit=cover` |

#### 36.5 Kenapa 16 px dan `dvh`

- **iOS Safari** memperbesar halaman sendiri bila fokus ke isian berhuruf < 16 px.
  Formulir kontak dan papan kesan memakai 16 px di layar sentuh, jadi mengetik
  tidak membuat museum ter-zoom dan tidak kembali dalam keadaan tergeser.
- **`100vh`** di ponsel mengukur tinggi **tanpa** bilah alamat yang menyusut.
  Panel setinggi itu kehilangan bagian bawahnya, termasuk tombol tutup. Semua
  panel sekarang memakai `100dvh` (dengan `vh` sebagai cadangan untuk browser
  lama).
- **`env(safe-area-inset-*)`** menjaga bar tombol tidak masuk area notch/gesture
  bar iPhone.
- **`touch-action: none`** di kanvas sudah ada; tanpa itu, seret satu jari akan
  menggulir halaman, bukan memutar diorama.

#### 36.6 Kamera dan performa di ponsel

- Di layar potret (`aspect < 1`) FOV melebar bertahap sampai 1,35×. Tanpa itu,
  diorama 36 × 36 m hanya menampilkan lantai tengah dan meja di sisi kiri-kanan
  hilang dari layar.
- Pixel ratio dibatasi 1,75 (dari 2) di perangkat sentuh: layar 3× membuat GPU
  ponsel bekerja tiga kali lebih berat tanpa perbedaan yang terlihat pada diorama.

#### 36.7 Verifikasi

- Parse OK: `src/core/device.js`, `src/core/InputManager.js`,
  `src/core/Engine.js`, `src/app/PortfolioApp.js`. Struktur blok `{#if}`/`{#each}`
  pada lima komponen yang diubah seimbang.
- Simulasi `InputManager` (objek DOM tiruan): ketukan 6 px → 1 klik; seret 70 px →
  1 langkah rotasi tanpa klik; cubit 60 px → `zoom -132` tanpa klik;
  `pointercancel` → tanpa klik; jari kedua diangkat lalu sisa jari digeser 40 px →
  0 rotasi (tidak melompat); `onHover` tidak pernah dipanggil.
- Regresi mouse: klik tetap diproses saat `pointerdown`, seret kanan 160 px →
  2 langkah rotasi, roda → 1 zoom.
- **Belum diuji di perangkat** — tidak ada ponsel/emulator di lingkungan ini.
  Yang perlu dicoba: ketuk lantai, ketuk dua kali (lari), seret (putar), cubit
  (zoom), buka panel lalu tutup, dan mengetik di formulir kontak (tidak boleh
  memicu zoom).

---

### 37. `bun run dev --host` sekarang benar-benar membuka jaringan lokal

#### 37.1 Gejala

```
$ bun run dev --host
$ bun scripts/dev.js --host
[API] pid 10652
[Vite] pid 8116
Museum  http://localhost:5173
```

Ponsel tidak bisa membuka `http://<ip-laptop>:5173` — Vite tetap hanya listen di
`127.0.0.1`.

#### 37.2 Sebab

Bun **sudah** meneruskan argumen ke skrip (baris `$ bun scripts/dev.js --host`
itu buktinya), tetapi `scripts/dev.js` memanggil Vite dengan daftar argumen tetap:

```js
const web = spawn([bun, 'node_modules/vite/bin/vite.js'], 'Vite')  // --host dibuang
```

`--host` diterima skrip lalu tidak dipakai, jadi Vite jatuh ke default
(`localhost` saja).

#### 37.3 Perbaikan

| Berkas | Perubahan |
| --- | --- |
| `scripts/dev.js` | `forwardArgs = process.argv.slice(2)` diteruskan ke Vite; banner mencetak alamat IPv4 non-internal; `--port=` ikut dihormati; petunjuk `bun run dev --host` muncul bila mode jaringan tidak aktif |
| `package.json` | skrip baru `dev:mobile` (`bun scripts/dev.js --host`) |
| `README.md`, `AGENTS.md` | bagian “Menguji dari ponsel”, catatan bahwa argumen harus diteruskan |

```js
const forwardArgs = process.argv.slice(2)
const web = spawn([bun, 'node_modules/vite/bin/vite.js', ...forwardArgs], 'Vite')
```

Banner hanya menampilkan alamat LAN saat `--host` aktif, supaya orang tidak
mencoba membuka URL yang memang belum listen.

#### 37.4 Kenapa API tetap `127.0.0.1`

Ponsel meminta `/api/...` ke **Vite**, lalu proxy Vite di mesin yang sama
meneruskannya ke `127.0.0.1:3001`. Jadi membuka `--host` tidak mengekspos port
database ke jaringan. Untuk produksi tanpa Vite, API harus mau mendengar dari
luar:

```bash
HOST=0.0.0.0 bun run start
```

(`server/index.js` membaca `Bun.env.HOST`, default `127.0.0.1`.)

#### 37.5 Troubleshooting

| Gejala | Sebab |
| --- | --- |
| banner LAN muncul, ponsel tetap gagal | Windows Firewall memblokir `bun.exe`; izinkan di jaringan **privat** |
| hanya `localhost` yang tembus | Wi-Fi tamu / *AP isolation* di router, atau ponsel di SSID berbeda |
| alamat LAN kosong di banner | tidak ada antarmuka IPv4 aktif (VPN/hanya IPv6) |
| `Error: listen EADDRINUSE` | dev server lama masih hidup: `taskkill /IM bun.exe /F` |
| terbuka tetapi API 502 | proses API mati; pesan aslinya ada di baris `[API]` |

#### 37.6 Verifikasi

- `scripts/dev.js`: sintaks OK.
- Potongan logika diuji terpisah dengan `networkInterfaces` tiruan:
  `--host` → `wantsHost true`, `--host=0.0.0.0` → `true`, tanpa argumen → `false`,
  `--port=6000` → `false`; alamat yang dicetak hanya IPv4 non-internal
  (`192.168.1.7`, `10.0.0.5`; `127.0.0.1` dan `fe80::` dilewati).
- **Belum diuji di jaringan nyata** — perlu satu kali `bun run dev --host` lalu buka
  URL LAN dari ponsel.

---

### 38. Tombol tema dihapus, backsound dengung dihentikan

#### 38.1 Permintaan

“Hapus tombol gelap terang, dan juga harus backsound bende gung yang dipakai
sekarang.” Dua hal yang tidak diinginkan: sakelar tema di HUD, dan bunyi latar
rendah yang berdengung terus-menerus (pad ambient 110/164,81/220 Hz — terdengar
seperti bende/gong yang ditahan).

#### 38.2 Tombol gelap/terang dicabut total

Tema tidak sekadar disembunyikan; seluruh jalurnya dihapus supaya tidak ada
state yang menggantung:

| Berkas | Yang hilang |
| --- | --- |
| `src/ui/Hud.svelte` | prop `theme` + `onToggleTheme`, tombol `◐ Terang/Gelap` |
| `src/App.svelte` | state `theme`, `$effect` yang menulis `dataset.theme` + `localStorage 'wg-theme'`, fungsi `toggleTheme()` |
| `src/ui/HelpOverlay.svelte` | baris `T — Ganti tema terang / gelap` dan `Tema` di panduan sentuh |

Palet sekarang satu: token gelap di `src/app.css` (`color-scheme: dark`). Tidak
ada lagi `[data-theme]` maupun pembacaan `localStorage` saat memuat, jadi tidak
ada kedipan tema pada kunjungan berikutnya.

#### 38.3 Backsound dihentikan

`SoundManager.startAmbient()` — tiga osilator (110 Hz triangle, 164,81 Hz
triangle, 220 Hz sine) melewati lowpass 520 Hz dengan LFO 0,06 Hz — dibuang
seluruhnya, termasuk:

- field `this.ambient` dan pemanggilan `startAmbient()` dari `start()`;
- blok pembersihan ambient di `dispose()`;
- `audio.ambientVolume` di `src/config.js`.

Yang **tetap** ada: langkah kaki, lompat/mendarat, blip dialog, halaman panel,
buka-tutup dialog, sorakan, dan blip UI. Tombol `M`/`Suara` masih membisukan
semuanya lewat `masterVolume`.

Akibatnya museum hening saat berdiri diam, dan AudioContext tetap hanya dibuat
setelah interaksi pertama (kebijakan autoplay tidak berubah).

#### 38.4 Bila nanti ingin bunyi gong sungguhan

Tambahkan sebagai **tabuhan pendek**, bukan loop: satu osilator sinus 90–140 Hz
dengan `exponentialRampToValueAtTime` 1,8–2,5 detik dan noise awal 30 ms, dipanggil
saat pemain membuka bagian atau menyentuh meja. Jangan mengembalikan pad yang
berbunyi tanpa henti.

#### 38.5 Verifikasi

- `grep -i "theme|ambient"` di `src/` → hanya satu sisa: komentar di
  `SoundManager.js` yang menjelaskan ambient sudah dihapus.
- `src/App.svelte`, `src/ui/Hud.svelte`, `src/ui/HelpOverlay.svelte`: 0 kemunculan
  `theme`/`toggleTheme`.
- `SoundManager.js`, `config.js`, `PortfolioApp.js`: parse OK.
- **Belum didengar langsung** — perlu `bun run dev`, klik sekali, lalu pastikan
  tidak ada dengung yang tersisa dan blip/langkah masih berbunyi.

---

### 39. Layar pemuatan dibuat ulang: dari “hero generik” ke gulungan tinta

#### 39.1 Kenapa yang lama terasa AI-slop

Versi pertama memakai pola yang sama dengan ribuan landing page buatan model:
lingkaran cahaya (*glow orb*) di tengah, judul besar center, satu kalimat puitis,
progress bar tipis dengan `box-shadow` merah menyala, label miring, lalu footer
“Diorama isometrik · Svelte 5 · Three.js”. Tiga penanda paling khas slop:

1. **stack teknologi dipajang** di layar pemuatan — tidak berguna bagi pengunjung;
2. **cahaya mengambang tanpa sumber** — di museum ini semua cahaya berasal dari
   lentera, jadi glow tanpa benda itu melanggar aturan visual sendiri;
3. **progress bar garis tipis** yang bisa dipakai produk apa pun, tidak menyebut
   museum, kertas, atau tinta.

#### 39.2 Yang dipakai sekarang

Komposisi horizontal (bukan hero center): **gulungan kertas vertikal** di kiri,
blok teks di kanan.

| Bagian | Bahan |
| --- | --- |
| Gulungan | tali 1 px, batang kayu gradasi `#7a5a3c → #241810`, kertas tekstur serat yang sama dengan panel (`#f7eedb → #dcc8a3`) |
| Meteran | **tinta merah naik dari bawah** (`height: persen`), ujung kuas 2 px `--vermilion-deep` |
| Skala | 11 garis tipis `rgba(36,28,22,0.13)` sehingga tinggi tinta terbaca tanpa angka besar |
| Tulisan | 往 / 生 / 堂 tegak di sisi kanan kertas, `--font-seal` |
| Teks | eyebrow mono “Museum Wangsheng”, judul “Membuka pendopo”, satu kalimat isi, `Langkah: <label>`, dan persen mono kecil |

Tidak ada lagi footer teknologi, tidak ada glow tanpa sumber (cahaya bawah sekarang
`rgba(255,168,92,0.1)` dari satu titik, meniru lentera di luar layar).

#### 39.3 Keadaan galat

Kartu galat ikut memakai bahan kertas yang sama: lembar lebar dengan batang kayu,
cap **封** (tersegel) merah, judul, catatan singkat, `<pre class="trace">` berisi
pesan asli (bisa digulir, `overflow-wrap: anywhere`), dan tombol “Muat ulang halaman”.
Tidak ada kartu abu-abu transparan atau ikon silang.

#### 39.4 Verifikasi

- Blok Svelte seimbang (`{#if}` 1/1, `{#each}` 1/1), `<script>`/`<style>`/`<div>`
  tertutup rapi.
- Tidak ada sisa `glow` maupun footer “Svelte 5 · Three.js” di berkas.
- `role="progressbar"` tetap ada dengan `aria-valuenow`, galat memakai
  `role="alert"`.
- Layar sempit (≤620 px) menumpuk vertikal; tombol muat ulang ≥44 px di layar sentuh.
- **Belum dilihat di browser** — perlu `bun run dev` untuk memastikan tinta naik
  mulus dan teks tegak tidak terpotong.

---

### 40. Perbaikan dashboard admin (bug nyata + pembersihan slop)

Audit menyeluruh `src/admin/AdminApp.svelte`, `AdminField.svelte`, `AdminLogin.svelte`,
`admin.css`, dan `api.js`. Yang diperbaiki bukan selera, melainkan hal yang salah.

#### 40.1 Bug yang ditemukan dan diperbaiki

| # | Gejala | Sebab | Perbaikan |
| --- | --- | --- | --- |
| 1 | Textarea daftar di Profil kosong walau database berisi; mengetik satu baris bisa menghapus sisa daftar | `AdminField` menyimpan `listText` sekali saat mount, sedangkan profil baru tiba setelah itu | `$effect` menyinkronkan `listText` dari `value` tanpa mengganggu pengetikan |
| 2 | Pencarian tidak menemukan isi testimoni | haystack di-hardcode ke 7 nama field, `quote` tidak termasuk | `searchFields` diturunkan dari skema (`text`/`textarea`/`select`/`list`/`number`) |
| 3 | Hapus memakai dialog `confirm()` browser | sisa prototipe | dialog konfirmasi `role="alertdialog"` (§41) |
| 4 | Klik latar editor membuang isian setengah jadi | `onclick={closeEditor}` tanpa syarat | `requestClose()` menolak menutup bila `dirty`, menampilkan catatan di footer |
| 5 | Pesan galat muncul dua kali (banner + di dalam modal) | `.alert` dan `.form-error` membaca `error` yang sama | `.alert` hanya dirender saat `!editor` |
| 6 | Server mati/500 tampil sebagai layar login | semua kegagalan `onMount` dianggap “belum masuk” | hanya `401` → `AdminLogin`; selain itu `bootError` dengan instruksi perbaikan |
| 7 | Tombol “Simpan profil” memakai `saving` milik modal | satu flag untuk dua operasi | `savingProfile` terpisah |
| 8 | Angka “Menunggu” di pesan ikut menghitung pesan kontak | `messages.approved` default 0 untuk **semua** tipe | filter `pending` dibatasi `type === 'guestbook'` |
| 9 | Item menu tak terlihat tetap bisa difokus `Tab` saat laci tertutup | sidebar hanya digeser dengan CSS | `inert` pada sidebar (`narrow && !mobileNav`) dan pada shell saat modal terbuka — diganti `visibility: hidden` di §42 |
| 10 | Fokus tidak pindah ke dialog editor | `tabindex="-1"` tidak pernah difokuskan | `bind:this={modalEl}` + `$effect(() => modalEl.focus())` |
| 11 | F5 selalu kembali ke Ringkasan | bagian aktif hanya di state | URL sungguhan `/admin/<bagian>` (§41) |
| 12 | Data bagian sebelumnya sempat dipakai saat pindah bagian | `items` tidak dikosongkan | `items = []` di `selectSection()` + tombol “Muat ulang” |
| 13 | Tabel harus digeser horizontal di ponsel | `min-width: 700px` | ≤720 px tabel jadi daftar bertumpuk (`data-label` + `td::before`) |
| 14 | Dua `<label>` bersarang untuk field boolean (HTML tidak valid) | header field memakai `<label for>` lalu isinya `<label class="toggle">` | header boolean memakai `<span class="field-label">` |
| 15 | Indikator muat meleset dari header saat topbar membungkus | `position: fixed; top: 72px` | bar dipindah ke dalam `.topbar`, `position: absolute; bottom: -1px` |
| 16 | Toast bisa menutupi bar konfirmasi hapus | keduanya `bottom: 22px` | `.toast.lifted` saat `pendingDelete` aktif + `env(safe-area-inset-bottom)` |
| 17 | Field wajib tidak dicegat browser | `required` hanya tampil sebagai tanda `*` | atribut `required` pada input/textarea/select |
| 18 | `divide-y` (properti Tailwind) di CSS | sisa salin-tempel | dihapus |

#### 40.2 Ponsel & sentuh

- `100dvh` dengan fallback `100vh` di shell, sidebar, checking screen, login, modal.
- Input 16 px di `pointer: coarse` (iOS tidak memperbesar halaman saat mengetik),
  target ketuk ≥44 px untuk `.button`, `.row-btn`, filter, `.nav-item`, `.icon-btn`.
- `env(safe-area-inset-bottom)` pada bar konfirmasi, toast, dan layar login.
- `.table-tools` membungkus, kolom pencarian jadi selebar layar.

#### 40.3 Anti-slop

- Ringkasan tidak lagi dibuka dengan “Selamat bekerja” + paragraf pemasaran.
  Eyebrow sekarang berisi tanggal, dan kalimat di bawah judul adalah **hitungan
  faktual**: `N proyek (M tampil), …`.
- Panel “Perlu tindakan” menggantikan dekorasi: hanya berisi testimoni tertunda,
  pesan belum dibaca, dan proyek draf — masing-masing bisa diklik menuju bagiannya,
  dengan keadaan kosong yang jelas.
- Catatan di kartu angka memakai angka nyata (`3 tampil · 2 draf`), bukan label hiasan.
- Warna hijau `#4f6f58` pada label “Tampil di museum” diganti emas tinta `#6b5a37`
  agar palet tetap tinta/kertas/vermilion/emas.
- Footer login tidak lagi membocorkan nama variabel lingkungan; diganti kalimat
  bantuan yang berguna bagi pengguna.

#### 40.4 Verifikasi

- `<script>` ketiga berkas admin lolos `new Function` (setelah impor dilepas).
- Blok markup seimbang: `AdminApp` `{#if}` 27/27, `{#each}` 14/14, `{#key}` 1/1,
  `<header>` 6/6, `<aside>` 1/1; `AdminField` `{#if}` 7/7.
- `100vh` yang tersisa di CSS/login semuanya berpasangan dengan `100dvh`.
- Tidak ada lagi `confirm(`, `noticeTimer`, atau `divide-y` di berkas admin.
- **Belum dijalankan** — `bash` masih gagal (`WSL ERROR_PATH_NOT_FOUND`), jadi
  `bun run dev`, login sungguhan, unggah berkas, dan uji di ponsel belum dilakukan.

---

### 41. Dashboard tidak bisa digulir, URL hash, dan hapus tanpa modal

Laporan pemakaian: alamat muncul sebagai `/admin#testimonials`, halaman Profil tidak
bisa digulir sehingga kolom bawah tidak bisa diedit, dan hapus memakai dialog
sistem/bukan modal. Ketiganya diperbaiki.

#### 41.1 Penyebab halaman tidak bisa digulir

`src/app.css` memang mengunci dokumen karena museum adalah kanvas penuh layar:

```css
html, body, #app { height: 100dvh; }
body { overflow: hidden; }
```

Dashboard di-mount ke `#app` yang sama, jadi tinggi dokumen selalu tepat satu layar.
`.admin-shell` punya `min-height: 100dvh`, isinya (empat panel profil) jauh lebih
panjang, tetapi tidak ada yang bisa menggulir: `body` menolak, dan `#app` setinggi
layar membuat tinggi dokumen tidak bertambah. Akibatnya kolom di bawah layar tidak
pernah bisa difokus — terlihat seperti “tidak bisa edit”.

Perbaikan (dua sisi, keduanya perlu):

1. `AdminApp.onMount` menambahkan `admin-mode` ke `<html>` dan `<body>`, dan
   melepasnya saat unmount (`onDestroy` mengembalikan penguncian museum).
2. `admin.css` mengembalikan perilaku dokumen:

```css
html.admin-mode,
body.admin-mode { height: auto; min-height: 100%; overflow: visible; overscroll-behavior: auto; }
body.admin-mode #app { height: auto; min-height: 100dvh; }
```

`.sidebar` tetap `position: sticky; height: 100dvh` sehingga kolom navigasi tidak ikut
tergulir, dan `.topbar` tetap menempel di atas.

#### 41.2 URL: `/admin/testimonials`, bukan `/admin#testimonials`

- `pathFor('overview')` → `/admin`; bagian lain → `/admin/<key>`.
- `selectSection(key, { push })` memanggil `syncPath()`: `pushState` untuk klik, `replaceState`
  untuk koreksi (mis. `/admin/` atau path tak dikenal) dan untuk hasil `popstate`.
- `pathSection()` membaca `location.pathname`; `SECTION_KEYS` dibangun dari `RESOURCES`
  supaya bagian baru otomatis punya URL.
- `onMount` menyelaraskan URL setelah sesi diperiksa; `popstate` memuat ulang bagian
  yang dituju, jadi Back/Forward bekerja.
- `/admin` tetap dilayani `index.html` baik oleh Vite (SPA fallback, `appType` default)
  maupun `serveStatic` di `server/index.js` (fallback ke `dist/index.html`).
- `src/main.js`: `/^\/admin(?:\/|$)/` agar `/administrator` tidak salah dianggap dashboard.

#### 41.3 Hapus memakai modal konfirmasi

Bar bawah diganti dialog di tengah:

- `.confirm-modal` (lebar `min(460px, 100%)`) memakai bahan kertas yang sama dengan
  editor, cap 刪, judul “Hapus <entitas>?”, nama entri di `aria-describedby`, dan
  peringatan bahwa museum 3D ikut berubah pada pemuatan berikutnya.
- `role="alertdialog"`, `aria-modal`, fokus dipindah ke dialog (`confirmEl`), latar
  dikunci `inert`, `Esc`/klik latar/Batal membatalkan.
- Timer 7 detik pada versi bar dihapus: dialog tidak boleh menutup sendiri.
- Di layar ≤720 px dialog tetap berukuran kartu (`.confirm-modal { min-height: 0 }`).

#### 41.4 Verifikasi

- Script `AdminApp` lolos parse; blok markup seimbang (`{#if}` 27/27, `{#each}` 14/14,
  `<div>` 47/47).
- Sisa `hashSection`, `location.hash`, `confirm-bar`, dan `class:lifted` = 0.
- `admin.css`: `confirm-bar` 0, `confirm-modal` 4, aturan `admin-mode` 5.
- **Belum dijalankan** — perlu `bun run dev` untuk memastikan scroll kembali normal,
  URL berubah tanpa reload, Back/Forward bekerja, dan dialog hapus tampil.

---

### 42. Refresh di /admin/profile berhenti di “Membuka arsip…”, sidebar perlu diklik berkali-kali

#### 42.1 Kenapa layar pemeriksaan bisa bertahan selamanya

`onMount` menunggu **dua** permintaan sebelum melepas layar pemeriksaan:

```js
await loadSection('overview')   // ← menahan `checking`
selectSection(target)           // target = profile / messages / …
checking = false                // baru di sini
```

Saat halaman dibuka langsung di `/admin/profile`, layar “Membuka arsip…” bergantung
pada `/api/admin/overview` **dan** pada `selectSection` yang memicu permintaan lain.
Kalau salah satu permintaan menggantung — proxy setengah jalan, API mati, koneksi
lambat — `checking` tidak pernah menjadi `false`, dan tidak ada galat yang tampil
karena tidak ada batas waktu. Layar itu juga tidak punya jalan keluar sama sekali.

Perbaikan (berlapis):

1. **Layar pemeriksaan hanya menunggu sesi.** `onMount` kini: `/api/auth/me` → set
   `admin`, `section`, URL → `checking = false` → baru `loadSection(section)` tanpa
   `await`. Data bagian dimuat **di dalam** dashboard dengan `loading-bar` sendiri.
2. **Semua permintaan punya batas waktu.** `src/admin/api.js` memakai
   `AbortSignal.timeout(12_000)`; `AbortError`/`TimeoutError` diterjemahkan menjadi
   pesan yang bisa ditindaklanjuti, dan kegagalan jaringan menjadi galat biasa
   (`status = 0`) — bukan promise yang menggantung.
3. **Penjaga 15 detik.** `setTimeout` di komponen menulis `bootError` bila `checking`
   masih `true`; layar pemeriksaan kini menampilkan pesan itu beserta tombol
   **Muat ulang**, jadi tidak ada lagi keadaan diam tanpa penjelasan.
4. **`loadSection` tidak bisa menyisakan `loading = true`.** Early-return saat
   `!admin` ikut mematikan indikator.

#### 42.2 Kenapa sidebar terasa perlu diklik berkali-kali

Dua sebab, keduanya diperbaiki:

- **Posisi gulir tidak direset.** Sejak dokumen dashboard bisa digulir (§41), pindah
  bagian mempertahankan posisi gulir lama. Klik “Proyek” saat berada di bawah halaman
  Profil menampilkan bagian baru dari tengah/bawah, sehingga terlihat seperti klik
  tidak bekerja. `selectSection()` sekarang memanggil `window.scrollTo(0, 0)`.
- **History API bisa melempar.** `syncPath()` membungkus `pushState`/`replaceState`
  dengan `try/catch`; di lingkungan yang membatasi History (iframe sandbox, sebagian
  WebView) navigasi internal tetap berjalan.

Atribut `inert` dihapus dari shell dan sidebar. Laci tertutup sekarang memakai
`visibility: hidden` pada `@media (max-width: 900px)` — tidak bisa diklik dan tidak
masuk urutan `Tab`, tanpa bergantung pada dukungan atribut `inert`. Latar tetap tidak
bisa diklik saat dialog terbuka karena `.modal-backdrop` menutupi seluruh layar.

#### 42.3 Bagian Profil & About terasa lambat / perlu diklik dua kali

Sumber rasa “tidak langsung muncul” ada tiga, dan ketiganya dibereskan:

1. **Form profil dirender sebelum datanya ada.** Dulu `section === 'profile'` langsung
   menggambar 19 `AdminField` berisi nilai kosong, lalu `setObject(profile, …)` mengisi
   nilainya setelah permintaan selesai. Di jaringan lambat itu terlihat seperti halaman
   kosong yang “menyusul”, dan mengetik cepat bisa tertimpa data server. Sekarang ada
   penanda `profileReady` (dan `messagesReady`): form baru dirender **setelah** data tiba,
   tombol “Simpan profil” nonaktif sampai itu terjadi, dan selagi menunggu muncul
   “Memuat isi profil…” beserta tombol **Muat ulang** bila permintaan gagal. Bagian Pesan
   tidak lagi menampilkan “Tidak ada pesan pada filter ini” saat datanya belum dimuat.
2. **Item navigasi bukan tautan.** Sebelumnya `<button onclick>`: tidak bisa dibuka di tab
   baru, dan bila handler JS gagal (galat render, `pushState` ditolak) klik tidak
   menghasilkan apa pun. Sekarang item navigasi adalah `<a href={pathFor(key)}>`;
   `handleNav()` hanya membatalkan perilaku bawaan untuk klik kiri tanpa modifier,
   sehingga Ctrl/Cmd/Shift/klik-tengah tetap membuka tab baru, dan bila JS gagal browser
   tetap menuju URL yang benar.
3. **Tidak ada `touch-action`.** Sebagian browser menahan `click` sekitar 300 ms setelah
   ketukan untuk menunggu ketukan ganda (zoom). `admin.css` kini memberi
   `touch-action: manipulation` pada `button`, `a`, dan `[role='button']`.

Klik pada bagian yang sedang aktif tidak memuat ulang apa pun: `handleNav()` hanya
mengembalikan gulir ke atas.

#### 42.4 Verifikasi

- `AdminApp` lolos parse; blok markup seimbang (`{#if}` 30/30, `{#each}` 14/14,
  `<div>` 48/48, `<a>` 6/6); `inert` = 0, `watchdog` 2, `scrollTo` 1.
- `profileReady` dipakai 5×, `messagesReady` 4×, `handleNav` 2×; `admin.css` memuat
  `touch-action` 2× (aturan sentuhan + komentar).
- `api.js` lolos parse; `signal` dipakai di `api()` maupun `uploadFile()`.
- **Belum dijalankan** — buka `/admin/profile` lalu F5: layar pemeriksaan harus hilang
  segera setelah `/api/auth/me` selesai; bila API mati muncul pesan + tombol muat ulang.
  Di `/admin`, klik menu dari posisi gulir mana pun harus langsung menampilkan bagian
  baru dari atas.

---

### 43. Bayangan pengunjung dan pelat plaza pohon berkedip (z-fighting)

#### 43.1 Sebab

Enam permukaan datar berbeda menempel di lantai dengan **satu ketinggian yang sama
persis, `y = 0,012`**:

| Objek | y lama |
| --- | --- |
| Pelat plaza pohon (`Museum`) | 0,012 |
| Cincin penanda meja (`InfoStation`) | 0,012 |
| Cincin papan testimoni (`PinBoard`) | 0,012 |
| Cincin bingkai proyek (`ProjectFrame`) | 0,012 |
| Bayangan kontak pengunjung (`Visitor`) | 0,012 |
| Bayangan kontak pemandu (`Guide`) | 0,012 |

Pengunjung berdiri di cincin radius 5,0 m dengan batas ±1,35 m, jadi mereka berjalan
**di atas pelat plaza (radius 5,2 m)**. Bayangan kontak punya kedalaman fragmen yang
praktis sama dengan pelat; selisih satu satuan float cukup untuk membuat uji
`LessEqualDepth` berganti-ganti lolos/gagal setiap kali kamera berputar → bayangan
berkedip tepat di tempat ia menumpang tindih dengan pelat plaza. Pemandu yang mengikuti
pemain mengalami hal yang sama saat menyeberangi plaza.

#### 43.2 Perbaikan: tangga ketinggian lapisan

`src/world/groundLayers.js` (baru) menjadi satu-satunya sumber ketinggian hiasan datar:

| `GROUND_LAYER` | y | Dipakai |
| --- | --- | --- |
| `plaza` | 0,006 | pelat plaza pohon |
| `plazaEdge` | 0,010 | cincin tepi plaza |
| `inkRing` | 0,014 | lingkaran tinta di bawah pohon |
| `stationRing` | 0,020 | cincin meja, bingkai proyek, papan testimoni, lentera proyek |
| `contactShadow` | 0,028 | bayangan kontak pengunjung & pemandu |
| `marker` | 0,034 | penanda tujuan klik |

Jarak antar-lapisan ≥ 4 mm dan naik sesuai urutan gambar, jauh di atas presisi depth
buffer pada jarak kamera isometrik (±18 m). `DECAL_TUNING` menambahkan
`polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2` pada material
transparan datar (bayangan kontak, cincin meja/bingkai/papan), sehingga lapisan atas
selalu menang walau suatu saat ada hiasan baru yang ketinggiannya berdekatan.
Jaring pengaman ini tidak dipakai untuk pelat plaza karena pelat itu **penulis depth**
untuk seluruh lantai di atasnya.

Bayangan kontak diberi `renderOrder = 1` supaya digambar setelah lantai dan cincin,
bukan bersaing urutan dengan objek transparan lain di titik yang sama.

#### 43.3 Verifikasi

- Semua file world lolos parse; setiap file yang memakai `GROUND_LAYER` juga
  mengimpor modulnya (`Visitor`, `Guide`, `Museum`, `InfoStation`, `PinBoard`,
  `ProjectFrame`, `ProjectLantern`, `MoveMarker`).
- Sisa ketinggian hiasan lantai dengan angka mentah `0,011–0,016` = **0**; semua
  memakai `GROUND_LAYER`.
- **Belum dijalankan** — putar kamera penuh 360° sambil berdiri di plaza: bayangan
  pengunjung dan pemandu harus tetap utuh di atas pelat plaza, tidak berkedip.

#### 43.4 Pohon kecil di plaza: mahkota tidak lagi lima bola bertabrakan

Empat pot plum di diagonal plaza (`Props.buildPlazaPlanters`) memakai lima bola
`SphereGeometry(0,15)` pada cincin radius 0,22 m. Jarak antar-pusat bola =
2 · 0,22 · sin 36° = **0,258 m**, sedangkan dua kali jari-jarinya 0,30 m — jadi tiap
pasangan bola saling menembus ±4 cm dan garis potongnya terlihat sebagai tumpang
tindih. Tiga ranting juga berakhir **di luar** mahkota sehingga ujungnya menusuk keluar
di antara bunga. Tanah di pot berada di y 0,40, di bawah penutup pot (0,42) sehingga
pot tampak bertutup batu.

Bentuk baru:

| Bagian | Geometri | Catatan |
| --- | --- | --- |
| Pot | `CylinderGeometry(0,44, 0,52, 0,34)` di y 0,17 | tutup pot di y 0,34 |
| Bibir | `TorusGeometry(0,44, 0,028)` di y 0,34 | menutup sambungan tanah |
| Tanah | `CircleGeometry(0,41)` di y 0,35 | 1 cm **di atas** tutup pot, jadi terlihat |
| Batang | `CylinderGeometry(0,045, 0,085, 0,9)` di y 0,79 | pangkal di dalam pot, pucuk di dalam mahkota |
| Ranting | 3 × `CylinderGeometry(0,02, 0,034, 0,24–0,30)` | berakhir **di bawah** mahkota |
| Mahkota | **satu** `IcosahedronGeometry(0,24, 1)` diskala (1; 0,82; 1) di y 1,42 | satu gumpalan bersudut, bukan tumpukan bola |
| Bunga | 6 × `SphereGeometry(0,05)` pada radius 0,26 m | jarak antar-bunga min **0,261 m** ≫ 0,10 m |

`blossomMat` kini memakai `flatShading: true` agar gumpalan mahkota terbaca sebagai
lipatan kertas, bukan bola halus yang melebur. Geometri mahkota dan bunga dibuat sekali
lalu dipakai bersama empat pot, dan `dispose()` tetap menutup semuanya lewat kumpulan
geometri unik.

Verifikasi: `Props.js` lolos parse, semua kelas geometri yang dipakai diimpor
(`CircleGeometry` dan `IcosahedronGeometry` ikut ditambahkan), dan perhitungan jarak
antar-bunga mengembalikan 0,261 m > 0,10 m sehingga tidak ada bunga yang bertabrakan.

---

### 44. Unggah model karakter & pilih model yang dipakai museum

#### 44.1 Masalah

Model karakter bawaan terkunci di `CONFIG.assets.model`
(`/models/karakter/karakter.pmx`). Mengganti karakter berarti menyunting kode, menyalin
berkas PMX + seluruh teksturnya ke `public/models/…`, lalu build ulang — tidak bisa
dilakukan dari dashboard.

#### 44.2 Skema `models`

Tabel baru di kedua dialek (`server/db/schema.sqlite.sql`, `schema.mysql.sql`):

| Kolom | Isi |
| --- | --- |
| `name` | nama tampil di dashboard |
| `slug` | nama folder bundel di `data/uploads/models/` |
| `pmx_url` | URL berkas PMX, mis. `/uploads/models/karakter-a1b2c3/karakter.pmx` |
| `preview_url` | gambar pratinjau (opsional, lewat `uploadFile` biasa) |
| `scale` | skala render, bawaan 0,08 |
| `note` | catatan bebas |
| `active` | penanda model yang dipakai museum |
| `created_at` | waktu unggah |

Sumber kebenaran tetap `shared/content-schema.js` (`RESOURCES.models`), sehingga tabel,
editor, dan pencarian admin mengikuti skema yang sama dengan koleksi lain. `active`
ditulis sebagai `INTEGER`/`TINYINT` dan diserialkan menjadi boolean oleh
`serializeModel`.

#### 44.3 Unggah satu bundel: PMX + tekstur

Masalah sebenarnya bukan “unggah satu berkas”, melainkan **struktur folder**. PMX
menyimpan jalur tekstur di dalam berkasnya secara **relatif** terhadap PMX itu sendiri
(`tex/face.png`). Bila server meratakan unggahan menjadi satu folder (`basename`, seperti
`uploadFile`), semua tekstur hilang.

Karena itu `POST /api/admin/models/upload` menerima multipart berisi:

| Field | Isi |
| --- | --- |
| `name` | nama model (2–120 karakter) |
| `paths` | JSON array jalur relatif, **urutan sama** dengan `files` |
| `files` | seluruh berkas bundel (`.pmx` + tekstur) |

Alur server (`server/api/uploads.js`):

1. `requireAdmin` + cek `multipart/form-data`.
2. Batas: 320 berkas, total 96 MB.
3. Slug = `slugify(name)` + 6 karakter UUID, folder `data/uploads/models/<slug>/`.
4. Setiap jalur dibersihkan `safeRelativePath()`: garis miring dibalik, `..`, jalur
   absolut, dan berkas tersembunyi (`.DS_Store`) dibuang; hasil `resolve()` wajib tetap
   di dalam folder bundel (`startsWith(folder + sep)`) — mencegah tulisan keluar folder.
5. Berkas pertama berekstensi `.pmx`/`.pmd` menjadi entri; bila tidak ada, folder
   dihapus dan permintaan ditolak.
6. Baris `models` dibuat dengan `active = 0`, jadi unggahan tidak langsung mengganti
   karakter yang sedang tampil.

Sisi klien (`src/admin/ModelUploader.svelte`) memakai `<input type="file" webkitdirectory>`
untuk memilih **folder**; jalur diambil dari `file.webkitRelativePath` dengan nama folder
teratas dibuang (`karakter/karakter.pmx` → `karakter.pmx`, `karakter/tex/face.png` → `tex/face.png`)
supaya cocok dengan isi PMX. Ada sakelar “Pertahankan nama folder teratas” untuk PMX yang
menulis jalur lengkap. Nama model ditebak dari nama folder dan tetap bisa diubah manual,
dan ringkasan menampilkan jumlah berkas, ukuran total, serta jalur PMX yang terdeteksi
sebelum tombol unggah aktif.

#### 44.4 Menyajikan berkas bersarang

`serveUpload()` di `server/index.js` dulu hanya melayani `basename(pathname)` — berkas di
subfolder menghasilkan 404. Sekarang jalur relatif di-`decodeURIComponent`, di-`resolve`
terhadap `UPLOAD_DIR`, dan wajib tetap berada di dalamnya. `CONTENT_TYPES` menambah
`.bmp`, `.tga`, `.pmx`, `.pmd`, `.spa`, `.sph` (PMX dikirim `application/octet-stream`).
Vite sudah mem-proxy `/uploads` ke API, jadi model yang diunggah juga tampil di server
development.

#### 44.5 Memilih model (`active`)

- Tombol **Pakai** di baris tabel mengirim `PUT /api/admin/models/:id` dengan
  `{ active: true }` (hanya field itu; `normalizeResourceData(partial)` melewati field
  lain).
- Server mematikan model lain lebih dulu:
  `UPDATE models SET active = 0 WHERE id <> ?`, lalu menyimpan baris yang dipilih.
  Baris tanpa `pmx_url` ditolak dengan 400.
- `POST` dengan `active: true` juga mematikan model lain, sehingga tidak mungkin ada dua
  model aktif walaupun baris dibuat lewat editor generik.
- Menghapus baris model ikut menghapus `data/uploads/models/<slug>/` (`removeModelFolder`),
  jadi PMX dan tekstur tidak menumpuk sebagai sampah. Model bawaan di `public/models/`
  tidak pernah tersentuh karena folder bundel selalu berada di bawah `data/uploads`.

#### 44.6 Museum memakai model aktif

`GET /api/portfolio` menambah satu kunci:

```json
"character": { "name": "Karakter", "model_url": "/uploads/models/…/karakter.pmx", "scale": null }
```

`null` (belum ada model aktif, atau `pmx_url` kosong) berarti museum memakai
`CONFIG.assets.model` (`/models/karakter/karakter.pmx`). `PortfolioApp.init()` menyusun
daftar calon (`character` → `CONFIG.assets.model`) dan mencoba satu per satu; kegagalan
memuat PMX unggahan tidak boleh mematikan museum, jadi model bawaan tetap dicoba. Bila
**tidak satu pun** model bisa dimuat, museum berhenti dengan pesan yang jelas —
“Museum tidak bisa dijalankan karena tidak ada model karakter (PMX)” diikuti jalan
keluarnya — bukan halaman kosong. `public/models/` tidak ikut repositori (`.gitignore`),
jadi pesan itulah yang muncul pada salinan baru sebelum admin mengunggah model. Nama
model dipakai pada label progres (“Menghadirkan …”) dan dicatat di konsol:
`[Museum] Model karakter: <url>`.

Skala dari database dipakai bila > 0; `null`/0 jatuh ke `CONFIG.character.scale`.
Animasi VMD tidak berubah: `AnimationController` mencari tulang berdasarkan nama
(`頭`, `上半身`, …) lewat `Map` dan melewati tulang yang tidak ada, jadi model MMD lain
tetap bisa memakai `idle/walk/run.vmd` selama nama tulangnya standar.

#### 44.7 Verifikasi

- `server/api/admin.js`, `public.js`, `uploads.js`, `serialize.js`,
  `shared/content-schema.js`, `src/admin/api.js`, `src/app/PortfolioApp.js` lolos parse.
- `ModelUploader.svelte` dan `AdminApp.svelte` seimbang bloknya (`{#if}`/`{/if}`,
  `{#each}`/`{/each}`, `<script>`/`<style>`).
- Jalur aman: `safeRelativePath()` menolak `..`, jalur absolut, dan berkas titik;
  `resolve()` ganda (unggah & penyajian) mencegah keluar dari folder.
- **Belum dijalankan** — alur nyata yang perlu dicoba: `bun run migrate` (tabel `models`
  dibuat), unggah folder model dari `/admin/models`, tekan **Pakai**, muat ulang museum,
  lalu pastikan karakter berganti dan animasi tetap berjalan. Kalau PMX-nya rusak,
  museum harus tetap terbuka dengan model bawaan.

#### 44.8 Pratinjau 360° dari tabel model

Sebelum memakai model, admin harus bisa melihatnya. Tombol **Pratinjau** di kolom Aksi
membuka `src/admin/ModelPreview.svelte`:

| Aspek | Keputusan |
| --- | --- |
| Pemuatan | `import('./ModelPreview.svelte')` saat tombol pertama kali ditekan; three.js + MMDLoader tidak ikut bundel dashboard |
| Model | `MMDLoader` + `MMDSpringBonePlugin` (tanpa Ammo: pratinjau tidak perlu rigid body), `mesh.frustumCulled = false` |
| Pose | pose istirahat model + fisika spring bone (`mmd.update(delta, { physics: true })`); tidak memuat VMD karena pratinjau menilai bentuk, bukan gerak |
| Putar | `turntable.rotation.y` dari seret horizontal; **tanpa batas** kanan-kiri (360° penuh), plus “Putar otomatis” 0,55 rad/s |
| Zoom | roda gulir / cubit → `view.zoom` 0,55–2,2 |
| Bingkai | model dipusatkan (`mesh.position = −center`) dengan kaki di y 0, lalu jarak kamera = `radius / sin(fov/2) × 1,12` |
| Latar | kanvas transparan di atas gradasi kertas; lingkaran tinta + cincin vermilion sebagai alas |
| Bersih-bersih | `cancelAnimationFrame`, `ResizeObserver.disconnect`, listener pointer dilepas, `mmd.dispose()`, `disposeObject3D`, `renderer.dispose()` + `forceContextLoss()`, `body.overflow` dipulihkan |

Kamera tidak lagi memakai “radius × 2,35”: model MMD setinggi ±20 unit terpotong di bingkai
karena jarak itu hanya berlaku untuk objek pendek. Rumus `radius / sin(fov/2)` menjamin
seluruh bola pembungkus model masuk bidang pandang pada rasio aspek berapa pun.

Verifikasi: blok `ModelPreview.svelte` seimbang (`{#if}`/`{/if}`, `<div>`/`</div>`,
`<script>`/`<style>`), semua import three dipakai, dan `AdminApp.svelte` tetap seimbang
setelah tombol + komponen dinamis ditambahkan. **Belum dijalankan** — buka `/admin/models`,
tekan **Pratinjau**, lalu putar 360°, perbesar, dan tutup: tidak boleh ada konteks WebGL
yang tertinggal (buka-tutup 5× lalu periksa konsol peringatan “too many active WebGL
contexts”).

---

### 45. Kedai Kartu — mini-game blackjack dengan jimat dan kutukan

Permintaan: **tempat mini-game/meja blackjack yang bukan blackjack biasa — ada debuff dan
buff, lawan bot dengan tingkat kesulitan, default Normal.**

#### 45.1 Keputusan bentuk

| Pertanyaan | Keputusan |
| --- | --- |
| Panel atau meja? | **Meja fisik** di museum, mengikuti pola `PinBoard`: pemain mendatangi, `E`/klik, baru panel terbuka |
| Bagian baru atau stasiun sendiri? | `SECTIONS.games` **tanpa `position`** (seperti Testimoni), jadi tidak menambah meja informasi; benda fisiknya `GameTable` |
| Di mana? | (7,2; 7,2) — diagonal timur-selatan, satu-satunya sela kosong antara meja Kontak dan papan testimoni |
| Aturan main di mana? | `src/game/blackjack.js` — fungsi murni, tanpa DOM/three.js/Svelte |
| Buff/debuff | 4 jimat (dibeli keping) + 4 kutukan (dari bandar, tergantung tingkat) |

Alur interaksi: `PortfolioApp.openStation()` melihat `kind === 'game'` →
`openView({ type: 'game' })` → `MuseumPanel` memetakan `sectionKey === 'games'` →
`BlackjackView`. `MuseumIndex` ikut menampilkan baris “Kedai Kartu” karena
`SECTION_ORDER` bertambah satu entri, dan navigasinya memakai jalur yang sudah ada
(`visitView({ type: 'section', key: 'games' })` → `visitStation('section-games')`).

#### 45.2 Aturan yang dimainkan

- enam dek; dikocok ulang bila sisa < 25%;
- bandar berhenti di 17, kecuali tingkat **Sulit** (memukul soft 17);
- blackjack (21 dari dua kartu) dibayar **3:2**, menang biasa **1:1**, seri mengembalikan taruhan;
- pemain boleh **Tarik**, **Lewati**, dan **Gandakan** (hanya dua kartu pertama).

**Jimat (buff pemain, berlaku satu babak):**

| Jimat | Cap | Harga | Efek |
| --- | --- | --- | --- |
| Mata Roh | 眼 | 8 | membuka kartu tertutup bandar |
| Simpanan | 儲 | 10 | kemenangan dibayar 1,5× |
| Perisai Kertas | 盾 | 12 | satu tarikan yang melewati 21 dibatalkan |
| Tarikan Takdir | 換 | 9 | sekali per babak tukar kartu terakhir |

**Kutukan (debuff bandar):**

| Kutukan | Cap | Efek |
| --- | --- | --- |
| Beban Taruhan | 債 | taruhan minimum +10 |
| Kabut Arsip | 霧 | Mata Roh & Tarikan Takdir mati |
| Tangan Berat | 束 | hanya satu tarikan tambahan |
| Pajak Bandar | 稅 | kemenangan dibayar setengah |

**Tingkat kesulitan** (`DIFFICULTIES`, default `normal`):

| Tingkat | Kutukan | Jimat/babak | Lain |
| --- | --- | --- | --- |
| Mudah | tidak pernah | 2 (pertama gratis) | taruhan 5–60 |
| **Normal** | peluang 45% | 1 | taruhan 10–80 |
| Sulit | setiap babak | 1 (harga 1,5×) | bandar memukul soft 17, taruhan 20–120 |

Saldo awal 120 keping. Bila keping < taruhan minimum, tombol **Minta talangan 60 keping**
muncul supaya pemain tidak terkunci. Saldo, statistik, dan tingkat disimpan di
`localStorage` kunci `wg-blackjack`.

#### 45.3 Berkas yang berubah

| Berkas | Isi |
| --- | --- |
| `src/game/blackjack.js` (baru) | dek, `handValue`, `startRound`, `playerHit/Stand/Double/Swap`, `revealHole`, `settle`, `nextRound`, `loadSave/saveGame` |
| `src/world/GameTable.js` (baru) | meja bundar, dua kotak taruhan, sepatu kartu, keping, bangku, lentera meja (satu `PointLight`), papan label + prompt, cincin lantai |
| `src/ui/views/BlackjackView.svelte` (baru) | kartu kertas, bar saldo/tingkat, panel jimat, tombol aksi, banner kutukan & hasil, catatan babak |
| `src/content/museum.js` | `SECTION_ORDER` + `SECTIONS.games` (tanpa `position`), ekspor `GAME_TABLE` |
| `src/world/Exhibits.js` | `buildGameTable()` dipanggil di konstruktor; `colliders` kini juga membaca array `item.colliders` |
| `src/world/World.js` | `staticColliders` memakai `flatMap` dan ikut memasukkan `item.colliders` |
| `src/app/PortfolioApp.js` | `stationIdForView`, `describeStation`, `openStation`, `visitView` mengenali `game` |
| `src/ui/MuseumPanel.svelte` | `sectionKey` → `games`, render `BlackjackView` |

#### 45.4 Detail yang mudah salah

- **Kutukan dipilih sebelum taruhan divalidasi.** Versi pertama memilih kutukan setelah
  taruhan dikunci, jadi “Beban Taruhan +10” tidak pernah terasa: minimum baru selalu
  datang sesudah keping ditarik. Sekarang `startRound()` memilih kutukan lebih dulu,
  lalu menghitung `minBetFor(game)`.
- **Pengungkapan kartu bandar ada di view, bukan mesin.** `playerStand()` sudah
  menghitung seluruh kartu bandar; view menaikkan `game.revealed` satu per satu (380 ms),
  lalu memanggil `settle()`. Bila panel ditutup di tengah animasi, `onDestroy` menaikkan
  `token` sehingga pembayaran tidak terjadi pada komponen yang sudah hilang.
- **Penghalang bangku & tiang lampu.** `Exhibits.colliders` dan `World.staticColliders`
  dulu hanya membaca `item.collider` (satu). Meja judi butuh beberapa penghalang kecil,
  jadi keduanya sekarang juga membaca `item.colliders`.
- **Tidak ada benda yang berputar/bergoyang** di meja (aturan §6.11): hanya nyala lentera
  (periode ±6 s, amplitudo 4%) dan badge prompt.
- **Tangan Berat tidak boleh menggantungkan babak.** Versi pertama hanya menolak
  `playerHit()` setelah jatah tarikan habis, sehingga tangan bisa tertahan di fase
  `player` selamanya (pemain masih bisa menekan Lewati, tetapi simulasinya macet). Sekarang
  tarikan yang ditolak langsung membuat tangan **berhenti otomatis**, dan tombol Tarik
  dimatikan lewat `canHit`.
- **Jimat tidak boleh hilang diam-diam.** `startRound()` memeriksa
  `totalJimatCost()` + taruhan terhadap saldo **sebelum** keping ditarik; bila kurang,
  babak ditolak dengan pesan yang menyebut angkanya. View juga meng-clamp taruhan setelah
  jimat dipilih dan mematikan tombol “Bagikan kartu”.
- **Kartu tertutup tidak menampilkan nilai.** Total bandar dihitung dari
  `game.dealer.slice(0, game.revealed)` kecuali saat diintai `game.peek`.

#### 45.5 Verifikasi

- Statis: `BlackjackView.svelte` seimbang (`{#if}` 16/16, `{#each}` 7/7, `<div>` 26/26,
  `<section>` 2/2, `<button>` 15/15, `<li>` 2/2, `<p>` 11/11, `<span>` 21/21, `<style>` 1/1),
  kurung blok `<script>` 135/135, dan 23 import mesin semuanya ada serta terpakai.
- Simulasi mesin (dijalankan di luar peramban dengan `Function()` pada sumber yang sudah
  dilepas `export`-nya), 600 babak per tingkat, dengan dan tanpa jimat: pembayaran selalu
  sama dengan `saldo − taruhan + (taruhan + laba)`, tidak ada saldo negatif, tidak ada
  tangan yang tertahan, dan bandar tidak pernah berhenti di bawah 17 kecuali pemain
  bust. Uji terarah: blackjack taruhan 10 → saldo 100 → 115 (3:2); Perisai Kertas
  mengembalikan tangan 20 yang bust; Tangan Berat menolak tarikan kedua; Mata Roh membuka
  kartu tertutup; taruhan di bawah minimum dan saldo kurang untuk jimat sama-sama ditolak
  dengan pesan.
- Pemeriksaan angka: jarak meja (7,2; 7,2) ke pot plum terdekat (5,6; 5,6) = 2,26 m >
  radius pot 0,52 + meja 1,0; titik berdiri (7,2; 8,7) berjarak 0,95 m dari kedua bangku
  (radius 0,24) sehingga masih bebas untuk `agentRadius` 0,25.
- **Belum dijalankan** (shell di mesin ini masih gagal di WSL). Yang perlu dicoba:
  `bun run dev` → berjalan ke Kedai Kartu → `E` → pasang taruhan, beli jimat, bagikan
  kartu → Tarik/Lewati/Gandakan → kartu bandar terbuka satu per satu → hasil & saldo
  berubah; ganti tingkat ke Sulit lalu pastikan kutukan muncul tiap babak; tutup panel di
  tengah pengungkapan kartu lalu buka lagi (saldo tidak berubah dua kali); muat ulang
  halaman museum untuk memastikan saldo tersimpan; di ponsel, semua tombol ≥ 44 px dan
  panel bergulir tanpa memotong meja.

#### 45.6 Laporan “meja diklik dan E ditekan, game tidak terbuka”

Laporan pemilik proyek: meja judi sudah diklik dan `E` sudah ditekan, tetapi Kedai Kartu
tidak pernah terbuka. Karena shell di mesin ini masih gagal (WSL), pemeriksaan dilakukan
dengan membaca seluruh rantai interaksi satu per satu.

Rantai itu sendiri **utuh**: `GAME_TABLE.id = 'section-games'` ada di `Exhibits.items`
dan `group`-nya masuk `targets`; `findNearest()` memakai `anchor` (7,2; 7,2) dengan
`interactRadius` 1,6; `openStation()` punya cabang `kind === 'game'`; `openView()`
memanggil `onOpenView`; `MuseumPanel` memetakan `type: 'game'` → `sectionKey` `games` dan
merender `BlackjackView`; 23 import mesin semuanya ada, dan `createGame()` sudah terbukti
jalan di simulasi. Jadi yang perlu ditutup adalah **celah yang bisa membuat rantai itu
berhenti tanpa pesan**:

| Celah | Perbaikan |
| --- | --- |
| `E` hanya bekerja bila `nearestId` sudah tersegarkan **dan** kartu panduan tertutup | `E` menghitung ulang stasiun terdekat (`nearestStationId()`) dan menutup kartu panduan lewat `onDismissHelp`, lalu membuka panel pada tekanan yang sama |
| `paused` bisa tertinggal `true` bila sebuah panel gagal tampil → museum membeku (klik & `E` mati) | jaring pengaman di `PortfolioApp.update()`: `paused` tanpa panel/dialog aktif dilepas sendiri |
| satu galat render di dalam view mematikan seluruh aplikasi Svelte | isi panel dibungkus `<svelte:boundary>` + lembar “Panel gagal dimuat” berisi pesan asli dan tombol **Coba muat ulang** |
| pemain berhenti sedikit di luar radius (meja 1,0 m + badan 0,36 m) sehingga prompt tak muncul | radius interaksi meja 1,6 → 2,0 m dan titik berdiri 1,5 → 1,45 m |
| kegagalan tidak meninggalkan jejak | `console.info('[museum] interaksi <id> (<kind>)')`, `console.warn` untuk stasiun tak ditemukan / jenis tak didukung |

Cara membaca hasil berikutnya (buka DevTools → Console):

1. tidak ada baris `[museum] interaksi section-games (game)` → klik/`E` tidak pernah
   mencapai stasiun: periksa apakah meja terlihat dan apakah karakter benar-benar tiba;
2. ada baris itu tetapi panel tidak muncul → masalah render; sekarang akan muncul lembar
   “Panel gagal dimuat” berisi nama galatnya;
3. panel terbuka dan menampilkan lembar galat → salin pesan di lembar itu.

Celah-celah di atas berlaku untuk **semua** stasiun (bukan hanya Kedai Kartu), jadi
perbaikannya juga menguatkan meja, bingkai proyek, papan testimoni, dan NPC.

Saat `bun run dev` (mode pengembangan) `App.svelte` menyimpan `window.__portfolioApp`,
jadi dua baris ini bisa langsung ditempel di Console browser:

```js
__portfolioApp.world.getStation('section-games')   // benda 3D-nya ada?
__portfolioApp.openView({ type: 'game' })          // panelnya bisa dirender?
```

Kalau baris kedua membuka panel, bagian 3D dan view sudah benar dan masalahnya hanya
pada perjalanan/klik ke meja. Kalau tidak, lembar galat di panel akan menyebut sebabnya.

---

### 46. Kedai Kartu jadi meja orang pertama; jimat & kutukan mulai babak 3

#### 46.1 Kenapa diubah

Versi §45 memakai panel 2D: pemain menekan `E`, lalu sebuah jendela besar menutupi
museum dan seluruh permainan terjadi di dalam jendela itu. Meja 3D yang sudah dibangun
dengan susah payah — kain, sepatu kartu, tumpukan keping, bandar, lentera — hanya jadi
latar yang disembunyikan. Permintaan pemilik proyek: permainannya harus **orang pertama**,
di meja itu sendiri. Sekaligus jimat dan kutukan terlalu ramai di babak pertama; pemain
belum sempat memahami aturan dasar sudah disodori empat segel dan sebuah kutukan.

#### 46.2 Aturan baru: babak 1–2 bersih

- `src/game/blackjack.js` menambah `SKILLS_FROM_ROUND = 3`, `skillsUnlocked(game)`,
  dan `upcomingRound(game)`. Semuanya fungsi murni, tidak menyentuh tampilan.
- `startRound()` hanya memilih kutukan bandar bila babak yang dimainkan ≥ 3; babak 1–2
  dijamin tanpa kutukan untuk **semua** tingkat kesulitan, termasuk Sulit.
- `toggleJimat()` menolak pembelian sebelum babak 3 (mengembalikan `false`), jadi aturan
  itu tidak bisa dilanggar lewat HUD yang dimodifikasi.
- Perbaikan kecil yang ikut ketemu: `minBetFor()` membandingkan objek kutukan dengan
  string sehingga “Beban Taruhan” tidak pernah menaikkan taruhan minimum. Sekarang dibaca
  dari `game.kutukan.key === 'beban'`.
- HUD menyembunyikan deretan segel jimat selama kunci itu masih tertutup, dan menampilkan
  satu baris keterangan “Jimat & kutukan mulai babak 3” supaya pemain tahu ada yang
  menunggu, bukan mengira fiturnya hilang.

#### 46.3 Duduk: kamera pindah ke kursi

| Berkas | Perubahan |
| --- | --- |
| `src/content/museum.js` | `GAME_TABLE.seat = { eye: [0, 1.42, 1.55], look: [0, 0.8, 0.15] }` — koordinat lokal meja (lihat §46.5) |
| `src/world/GameTable.js` | `seatPose` (eye/look dalam koordinat dunia), `setSeated(on)` menyembunyikan nametag & badge `E`, `showLooseCards(on)` mematikan kartu hiasan diorama supaya tidak bertumpuk dengan kartu asli, `toWorld()`, `update()` ikut menghitung kartu lepas |
| `src/core/CameraRig.js` | `setSeatMode(on, pose)`, `lookAround(dx)`, `updateSeat(delta)` — posisi & arah di-damp; menoleh horizontal dibatasi ±0,55 rad (±31,5°) supaya meja tidak pernah terlihat dari samping kain. `update()` meneruskan ke `updateSeat()` selama duduk dan melewati seluruh logika diorama; `zoom()` diabaikan; FOV duduk dipasang ulang tiap frame (§46.5) dan FOV diorama dipulihkan saat berdiri (`museumFov`) |
| `src/world/BlackjackStage.js` (baru) | Kartu sungguhan: 6 deck, nilai 2–10/J/Q/K/A, setelan ♠♥♦♣, punggung bercap 往. Tangan bandar di z −0,46, tangan pemain di z +0,46, tumpukan keping mengikuti `bet`, sosok bandar (jubah, bahu, kepala bertopi, tangan) di balik meja, animasi kartu meluncur dari sepatu ke posisinya (`update(delta)`), `sync(game)` satu arah dari HUD |
| `src/world/canvasTextures.js` | `createCardFaceTexture()`, `createCardBackTexture()`, `createDealerMaskTexture()` |
| `src/app/PortfolioApp.js` | `enterSeat()` / `syncSeat(game)` / `closeSeat()`; `openStation()` memanggil `enterSeat()` untuk `kind === 'game'`; saat duduk `paused` aktif, karakter disembunyikan, `update()` meneruskan `stage.update()` dan `rig.update()` otomatis memakai `updateSeat()`; seret kanan menoleh, bukan memutar diorama; `handleKeyDown` & `handleClick` diabaikan saat duduk (input tetap hidup agar seret kanan bekerja); jaring pengaman `paused` tidak melepas mode duduk |
| `src/ui/SeatHud.svelte` (baru) | Bilah permainan: keping, nilai & jumlah kartu pemain, jumlah kartu bandar, taruhan −/+, Bagikan, Tarik/Lewati/Gandakan/Tukar/Intai, segel jimat (hanya setelah babak 3), pemilih tingkat, tombol **✕ Berdiri**, hasil 勝/敗/和, tombol talangan bila keping habis. Tata letak satu kolom di layar sentuh (§46.5) |
| `src/App.svelte` | `seated` state, callback `onSeat`, `Esc` berdiri, HUD/indeks/panduan disembunyikan saat duduk, `<SeatHud>` dirender |
| `src/ui/MuseumPanel.svelte` | cabang `games` dan import `BlackjackView` dihapus — meja tidak lagi membuka panel |
| `src/ui/views/BlackjackView.svelte` | dipensiunkan (tinggal catatan); tidak diimpor siapa pun |

Sinkronisasi kartu satu arah: `SeatHud` memegang satu `$state` `game`, dan satu `$effect`
memanggil `onSync(game)` setiap keadaan berubah. `BlackjackStage.sync()` hanya membaca
(`dealer`, `player`, `revealed`, `peek`, `bet`, `phase`), jadi tidak ada salinan keadaan
yang bisa berbeda dengan mesin.

#### 46.4 Verifikasi

- Mesin diuji ulang di luar peramban (20 babak × 3 tingkat): kutukan pertama selalu muncul
di babak 3, `upcomingRound()` benar di fase `betting`, `result`, dan `player`, saldo tetap
konsisten, dan tidak ada fase yang tertahan.
- Statis: `SeatHud.svelte` seimbang (`{#if}` 10/10, `{#each}` 2/2, `<div>` 10/10,
  `<script>`/`<style>` 1/1) dan seluruh 22 importnya ada di mesin; `App.svelte` 8/8,
  `MuseumPanel` 3/3 (cabang `games` benar-benar hilang); kurung kurawal seluruh berkas
yang disentuh bersih (0 selisih).
- Angka kursi: mata di (7,2; 1,42; 8,75) menghadap (7,2; 0,8; 7,35) dengan FOV 60°.
  Kartu pemain berjarak 1,25 m dari mata (−29,6°, yaitu 5,7° di bawah pusat layar), kartu
  bandar 2,1 m (−17,1°), kepala bandar 2,7 m (−3,2°) — semuanya di dalam separuh FOV 30°
  tanpa menoleh. Meja berjari-jari 1,0 m tetap 0,7 m dari mata, di luar `near` 0,1.
- **Belum dijalankan di peramban** (shell mesin ini masih gagal di WSL). Yang perlu dicoba:
  berjalan ke meja → `E` → kamera duduk dan kartu terlihat di kain → Bagikan → Tarik /
  Lewati → kartu bandar terbuka satu per satu → `Esc` kembali ke diorama dengan karakter
  muncul lagi; pastikan babak 1–2 tanpa kutukan dan segel jimat terkunci sampai babak 3.

#### 46.5 Koreksi: kamera lebih tinggi, jumlah kartu, lag awal, dan HUD ponsel

Empat keluhan setelah versi pertama dicoba:

| Keluhan | Perbaikan |
| --- | --- |
| Kamera terlalu rendah, kain tidak terbaca | mata naik 1,16 → **1,42 m** dan mundur ke z 1,55; titik pandang diarahkan ke tengah kain (0; 0,8; 0,15), jadi kedua baris kartu berada ±7° dari pusat layar. FOV duduk 32° (isometrik) mustahil untuk dua baris kartu, jadi `camera.seatFov = 60` |
| Tidak tahu berapa kartu pemain dan bandar | HUD menampilkan `1 dari 2 kartu` untuk bandar (kartu tertutup belum dihitung terbuka) dan `3 dari 3 kartu` untuk pemain; nilai bandar yang terlihat dihitung dari kartu yang sudah terbuka saja |
| Lag saat mulai bermain | tiga sumber dipotong: (1) `BlackjackStage` dulu membuat 22 kartu + 22 material + 22 geometri saat duduk — sekarang satu geometri dipakai bersama dan kartu dibuat sesuai kebutuhan (`ensureCard`); (2) peta bayangan seluruh museum dibekukan selama duduk (`shadowMap.autoUpdate = false`, disegarkan sekali setiap keadaan permainan berubah) — bayangan 36 m per frame itu bagian termahal; (3) `Engine.resize()` menimpa FOV duduk, sekarang `updateSeat()` memasang ulang FOV tiap frame kalau berubah |
| HUD tidak ramah ponsel & tidak ada tombol keluar | tata letak ulang: bilah atas (status + tombol **✕ Berdiri** 44 px), baris nilai bandar di tengah-atas, satu bilah bawah bergrid satu kolom (tangan → aksi → jimat + tingkat). Tombol aksi mengisi lebar (`minmax(76px, 1fr)`), target ≥ 44 px di perangkat sentuh, aman `env(safe-area-inset-*)`, dan pengingat seret hanya muncul di perangkat yang tepat (`pointer: coarse`) |

Catatan perilaku: menekan **Berdiri** di tengah tangan tidak menghanguskan taruhan —
`leave()` menyelesaikan tangan itu dulu (anggap “Lewati”, lalu `settle()`), baru menutup
kursi. `busy` (saat kartu bandar sedang dibuka) menahan tombol keluar supaya animasi tidak
terpotong di tengah.

Perbaikan mesin yang ikut ketemu saat menguji jalur keluar: bila `startRound()` menolak
taruhan (keping kurang atau taruhan + jimat melebihi saldo), kutukan tadinya dibuang lagi
sehingga tolakan berulang bisa mengundi kutukan baru sampai “Beban Taruhan” hilang, dan
`game.round` sudah terlanjur naik. Sekarang nomor babak dibatalkan (`roundBefore`) tetapi
kutukan tetap dipasang: percobaan ulang memakai minimum yang sama, HUD menampilkan tombol
talangan (`keping < minBetFor`), dan penghitung babak tidak melompat.

Verifikasi yang dijalankan: 1,2 ribu babak di tiga tingkat dengan `leave()` di tengah
tangan — saldo tidak pernah negatif, pemotongan taruhan tepat (`chips − bet`), fase selalu
berakhir di `result`, dan tidak ada fase yang tertahan.

#### 46.6 HUD meja dirombak seperti game kartu biasa

Versi sebelumnya menumpuk semua kontrol menjadi satu bilah kertas di bawah layar — benar
secara fungsi, tetapi terasa seperti formulir, bukan meja judi. `SeatHud.svelte` ditulis
ulang dengan zona tetap, hierarki aksi, dan pintasan papan tombol.

| Zona | Isi |
| --- | --- |
| Kiri atas | pelat saldo: label `Keping`, angka besar, baris `Babak N · tingkat · kutukan`, dan pengingat kunci babak 3 |
| Kanan atas | tombol **✕ Berdiri** (`Esc`); label disembunyikan di bawah 460 px |
| Tengah atas | pelat bandar: nama, nilai kartu yang terlihat, `1 dari 2 kartu`; bingkainya menyala lembut saat bandar yang bermain |
| Tengah | pelat hasil babak (cap 勝/敗/和 + catatan + selisih keping) atau pesan galat/talangan — tidak ikut menggeser tata letak |
| Kiri bawah | pelat tangan pemain: nilai, `lembut`, jumlah kartu, taruhan berjalan, dan label giliran (“Giliranmu”, “Bandar membuka kartu”, …) |
| Kanan bawah | dermaga tiga baris: taruhan (stepper ±5, keping 5/10/25/maks, `min … maks …`) → jimat → aksi |
| Baris aksi | satu tombol utama merah (Bagikan/Tarik/Main lagi) + tombol kedua (Lewati, Gandakan, Tukar, Intai) + pemilih tingkat |

Detail yang membuatnya terasa seperti permainan, bukan panel:

- **keping taruhan** berbentuk cakram dengan cincin vermilion/tembaga; menambah taruhan
  dengan satu keping (`addChip`) jauh lebih wajar daripada menekan `+` berkali-kali;
- **jimat tampil sebagai kartu skill** (segel + nama + harga + nomor pintasan), bukan
  kotak 40 px tanpa keterangan; `dipakai` dan harga `gratis` ditulis apa adanya;
- **pintasan papan tombol**: `⏎`/`Spasi` bagikan & main lagi, `←/→` taruhan, `1–4` jimat,
  `H` tarik, `S` lewati, `D` gandakan, `T` tukar, `I` intai. Tombol yang sedang fokus tidak
  dipicu dua kali (Enter/Spasi diabaikan kalau targetnya `button`), dan `kbd` hanya tampil
  di perangkat dengan papan tombol (`pointer: coarse` menyembunyikannya);
- **hasil babak** muncul sebagai pelat tengah dengan animasi masuk 0,28 s — sekali jalan,
  tidak berulang, sesuai aturan animasi museum;
- **ponsel**: satu kolom penuh (tangan → taruhan → jimat → aksi), keping dan segel mengisi
  lebar, target sentuh ≥ 44 px, padding `env(safe-area-inset-*)`, dan tinggi layar < 560 px
  menyembunyikan baris petunjuk supaya meja tetap terlihat;
- pelat memakai tinta gelap `rgba(16,12,9,.84)` dengan garis kertas tipis dan bayangan
  jatuh — bukan kartu kaca, bukan gradien neon.

Bug yang tertangkap saat menulis ulang: kelas `seal` dipakai untuk dua hal (tombol jimat dan
cap hasil). `.seal { min-width: 116px }` membuat cap hasil melebar, jadi cap hasil diganti
`.stamp`. Pelajaran umum: jangan pakai satu nama kelas untuk dua peran yang ukurannya
berbeda jauh.

Verifikasi statis: `SeatHud.svelte` seimbang (`{#if}` 14/14, `{#each}` 3/3, seluruh tag
`div/button/span/p/output/b/em/small/kbd` pasangannya cocok, `<script>`/`<style>` 1/1) dan
kurung kurawal 0 selisih. **Belum dijalankan di peramban** — shell mesin ini masih gagal di
WSL; yang perlu dilihat langsung: tinggi kamera, keterbacaan pelat di atas kain gelap, dan
tata letak ponsel potret.

### 47. Buku tamu dihapus, umpan balik per proyek dengan persetujuan admin

Permintaannya dua: **hapus buku tamu**, dan **setiap proyek bisa diberi umpan balik yang
harus disetujui admin di dashboard**.

#### 47.1 Kenapa buku tamu dibuang, bukan diperbaiki

Buku tamu adalah jalur kedua untuk hal yang sudah punya jalur sendiri, dan ketiganya
bertabrakan:

| Bagian lama | Masalah nyata |
| --- | --- |
| `messages.type = 'guestbook'` lewat tombol “Kesan museum” di formulir kontak | menumpuk di kotak masuk yang sama dengan pesan privat, jadi admin menyaring dua jenis data dengan tombol filter |
| Bagian “Buku tamu” di bawah papan tempel (`BoardView`) | isinya pesan pendek tanpa konteks: tidak terikat karya mana pun, tetapi tampil di panel Testimoni |
| Tombol “Setujui tampil” pada pesan | `messages.approved` berlaku untuk **semua** tipe, jadi pesan kontak terlihat “menunggu” padahal tidak pernah ditampilkan |

Yang dilepas:

- `ContactView` — pilihan “Kontak / Kesan museum” hilang, tinggal satu formulir kontak.
  Formulirnya juga tidak lagi mengirim `type`.
- `BoardView` — bagian buku tamu, gayanya, dan impor `formatDate` dibuang. Papan kini
  murni urusan testimoni (kertas dipaku + mekanik tulis).
- `AdminApp` — filter kotak masuk menyisakan **Semua / Belum dibaca**; kartu pesan tidak
  lagi menampilkan label jenis atau tombol setujui.
- `shared/content-schema.js` — `MESSAGE_TYPES` tinggal `contact`.
- `GET /api/portfolio` — tidak lagi mengirim `guestbook`.
- `runMigrations()` — menghapus baris `messages` bertipe `guestbook` yang sudah ada,
  supaya tidak tersisa data yatim yang tidak dibaca layar mana pun. Pesan kontak tidak
  disentuh.

#### 47.2 Umpan balik per proyek memakai tabel sendiri

Umpan balik **bukan** testimoni, jadi tidak menumpang tabel `testimonials`. Kalau
menumpang, menyetujui umpan balik akan sekaligus menciptakan NPC pengunjung di museum —
dan itu bukan arti “setujui umpan balik”.

```sql
CREATE TABLE project_feedback (
  id, project_id, name, email, rating, message, approved, created_at
);
CREATE INDEX idx_feedback_public ON project_feedback (project_id, approved);
```

- `rating` disimpan sebagai angka 1–5 dan **dipangkas saat serialisasi**
  (`serializeFeedback`), karena panel hanya punya lima pip.
- `approved` default `0` di kedua dialek; tidak ada kolom lain yang bisa mengubahnya.
- Resource admin `feedback` (segel 評) ditambahkan ke `RESOURCES`, jadi tabel, form, dan
  navigasi dashboard mengikuti skema tanpa kode CRUD baru.

Dua hal yang mudah salah di jalur generik:

1. `normalizeResourceData()` punya pengecualian “`project_id` boleh kosong” untuk
testimoni. Pengecualian itu sekarang hanya berlaku untuk field **tidak wajib** — kalau
selalu diterapkan, umpan balik tanpa proyek akan lolos dan menjadi baris yatim.
2. `project_feedback.created_at` bertipe `NOT NULL` dan tidak ada di form, jadi
`createResource()` mengisinya sendiri (seperti `projects.created_at`).

#### 47.3 Jalur kirim

`POST /api/feedback` menerima `{ project_id, name, email, rating, message }`:

- proyek harus ada **dan** `published = 1`; bingkai draf tidak ada di museum, jadi
  umpan baliknya tidak akan pernah punya tempat tampil (`404` bila tidak memenuhi);
- nama 2–80 karakter, pesan 10–800 karakter, email opsional dan divalidasi bila diisi;
- `rating` bukan angka → 5, lalu dipangkas ke 1–5;
- baris disimpan dengan `approved = 0` secara harfiah — parameter `approved` dari klien
  diabaikan sepenuhnya;
- memakai pembatas laju yang sama dengan kontak dan testimoni (5 kiriman / 10 menit /
  IP).

`GET /api/portfolio` mengirim `feedback: [...]` berisi **hanya** baris `approved = 1`,
lengkap dengan `project_title` dari `LEFT JOIN projects`. Baris yang belum ditinjau tidak
pernah meninggalkan server, jadi UI tidak perlu menyaring apa pun.

#### 47.4 Tampilan di museum

`ProjectDetailView` (dibuka saat pemain berdiri di depan bingkai proyek) sekarang punya:

- **ringkasan nilai**: rata-rata satu desimal dari umpan balik yang disetujui + jumlahnya;
- **daftar umpan balik**: nama, lima pip terisi sesuai `rating`, isi pesan. Kiriman sesi
  ini muncul paling atas dengan garis putus-putus dan label “Menunggu persetujuan admin” —
  sama seperti cap `待審` di papan testimoni;
- **formulir** yang tersembunyi sampai tombol **Tulis umpan balik** ditekan: nama, lima
  tombol nilai (`aria-pressed`, 44 px di `pointer: coarse`), pesan dengan penghitung
  karakter, dan catatan bahwa kiriman baru tampil setelah disetujui;
- status kiriman memakai `role="status"`, dan formulir tidak pernah menutup dirinya sendiri
  sebelum server menjawab.

#### 47.5 Dashboard

Bagian **Umpan Balik Proyek** memakai mekanisme moderasi yang sama dengan testimoni,
tetapi tidak lagi di-hardcode ke satu resource:

- `moderatable` dihitung dari skema (`fields.some(f => f.name === 'approved')`), jadi
  penyaring antrean, banner, dan tombol Setujui/Sembunyikan otomatis berlaku untuk
  testimoni **dan** umpan balik;
- `queueFilter` menggantikan `testimonialFilter` dan direset setiap pindah bagian;
- Ringkasan menambah kartu “Umpan balik” dan baris **Perlu tindakan** untuk kiriman yang
  belum ditinjau, plus lencana kuning di navigasi;
- kolom `Proyek` menampilkan **nama** proyek (`projectTitles`, dimuat sekali lewat
  `/api/admin/projects`), bukan ID mentah — kalau daftar proyek gagal dimuat, kolomnya
  kembali ke `#ID` dan tabel tetap jalan.

#### 47.6 Verifikasi

Statis: seluruh berkas yang disentuh seimbang (kurawal dan kurung 0 selisih) —
`AdminApp.svelte`, `ProjectDetailView.svelte`, `ContactView.svelte`, `BoardView.svelte`,
`public.js`, `admin.js`, `content-schema.js`, kedua berkas skema. Sisa kata `guestbook`
hanya ada di `migrate.js` (pembersihan) dan komentar `public.js`.

Satu bug nyata tertangkap saat memeriksa ulang: urutan `Promise.all` di `getPortfolio()`
tidak cocok dengan urutan destrukturisasi setelah kueri buku tamu diganti kueri umpan
balik — `feedback` akan menerima baris **posts** dan sebaliknya, sehingga artikel muncul
di daftar umpan balik. Kuerinya dipindah ke posisi yang benar.

**Belum dijalankan di peramban** (shell mesin ini masih mati di WSL). Yang perlu dicoba:
kirim umpan balik dari detail proyek → muncul bertanda menunggu → setujui di
`/admin/feedback` → muat ulang museum → umpan balik tampil dengan rata-rata nilai.

---

### 48. Nama karakter dilepas, model tidak ikut repositori, museum berhenti bila tidak ada model

#### 48.1 Permintaan

Tiga hal sekaligus: **hapus semua tulisan bernama karakter lama dari proyek**,
**jangan unggah apa pun di dalam `public/models/`**, dan **bila tidak ada model yang bisa
dimuat, tampilkan pesan bahwa museum tidak bisa dijalankan — bukan halaman kosong**.

Alasannya masuk akal: repositori ini publik, sedangkan berkas PMX karakter itu bukan milik
proyek. Selama ini namanya juga menempel di nama paket, jalur aset, judul halaman, komentar,
dan data contoh.

#### 48.2 Yang dihapus/diganti

| Berkas | Sebelum | Sekarang |
| --- | --- | --- |
| `package.json`, `bun.lock` | nama paket memakai nama karakter lama | `museum-wangsheng` |
| `src/config.js` | jalur aset menunjuk folder model karakter lama | `model: '/models/karakter/karakter.pmx'` + komentar bahwa folder itu tidak ikut repo |
| `src/character/Character.js` | `mesh.name` memakai nama karakter lama | `mesh.name = 'character'`, pesan galat generik |
| `src/app/PortfolioApp.js` | label cadangan memakai nama karakter lama | `'karakter bawaan'` |
| `src/admin/ModelUploader.svelte` | contoh jalur & placeholder memakai nama lama | contoh generik (`model/tex/face.png`) |
| `shared/content-schema.js` | contoh jalur unggahan memakai nama karakter lama | contoh `/uploads/models/contoh-…` |
| `index.html` | judul halaman memakai nama karakter lama | `<title>Museum Portofolio · Halaman Wangsheng</title>` |
| `server/db/seed-data.js` | profil contoh memakai nama karakter lama | `Nama Kamu` (placeholder, seperti `kamu@email.com`) |
| `src/ui/*`, `src/content/portfolio.js`, dokumentasi | kalimat “<nama lama> berjalan …” | “karakter berjalan …” |
| `.gitignore` | `public/models/` tanpa keterangan | ditambah komentar: model tidak diunggah karena besar + berhak cipta |

Tidak ada perubahan perilaku dari penggantian nama: `mesh.name`, `package.json`, dan judul
halaman tidak dibaca oleh logika museum.

#### 48.3 Folder model memang tidak pernah ikut repo

`public/models/` sudah ada di `.gitignore` sejak awal, jadi tidak ada PMX yang pernah
terkirim ke GitHub dan tidak ada yang perlu dibersihkan di sana. Yang berubah hanya
penegasannya: komentar di `.gitignore` menyebut alasan dan melarang baris itu dihapus.
Unggahan model lewat dashboard tetap aman: bundelnya masuk `data/uploads/models/<slug>/`,
dan `data/uploads/` juga diabaikan git.

Model lokal yang ada di mesin pengembang **tidak** dihapus oleh kode. Untuk memakai nama
baru, ganti nama foldernya sekali (cmd):

```bat
REM ganti nama folder & berkas model lokal supaya cocok dengan CONFIG.assets.model
ren public\models\<folder-lama> karakter
ren public\models\karakter\<berkas-lama>.pmx karakter.pmx
```

Nama berkas PMX boleh berubah karena teksturnya dirujuk relatif di dalam PMX, bukan lewat
nama berkas model.

#### 48.4 Museum berhenti dengan pesan yang jelas

`PortfolioApp.init()` menyusun daftar kandidat model dari database → `CONFIG.assets.model`.
Sekarang ada dua keadaan yang ditangani eksplisit:

| Keadaan | Yang terjadi |
| --- | --- |
| Database tidak punya model aktif **dan** `CONFIG.assets.model` kosong/`null` | `init()` langsung melempar pesan “Museum tidak bisa dijalankan karena tidak ada model karakter (PMX)…” tanpa mencoba memuat apa pun |
| Kandidat ada tetapi semuanya gagal dimuat | pesan yang sama bila kandidatnya hanya model bawaan (artinya folder model kosong), atau pesan “model karakter gagal dimuat” bila yang gagal adalah model unggahan |

Pesan itu sampai ke pengguna lewat `LoadingScreen` (lembar galat bercap 封). Lembar galat
kini menambah satu baris bantuan yang hanya muncul untuk galat bernada model: tautan ke
`/admin/models` dengan urutan tindakan (unggah folder PMX → tekan **Pakai**).

Aturan turunannya: **jangan** membuat museum “setengah jalan” tanpa karakter hanya supaya
halaman terbuka. Tanpa karakter, kontrol, kamera, dan panel tidak punya subjek; pesan galat
lebih jujur daripada museum kosong.

#### 48.5 Verifikasi

- Statis: `src/config.js`, `src/app/PortfolioApp.js`, `src/character/Character.js`,
  `src/admin/ModelUploader.svelte`, `shared/content-schema.js`, `index.html`,
  `src/ui/LoadingScreen.svelte`, `server/db/seed-data.js` — parse/struktur seimbang.
- Pencarian nama lama (tanpa peduli huruf besar/kecil) pada berkas yang dilacak git →
  **0 hasil**; folder `public/models/` diabaikan, jadi tidak ikut dipindai.
- **Belum dijalankan** (shell mesin ini masih gagal di WSL). Yang perlu dicoba:
  1. `bun run dev` dengan folder model **belum** di-rename → harus muncul lembar galat
     “tidak ada model karakter” beserta tautan ke `/admin/models`;
  2. jalankan dua perintah `ren` di §48.3 → museum terbuka normal;
  3. unggah model lewat `/admin/models` → **Pakai** → muat ulang → karakter berganti.
- Catatan penting: nama karakter lama **masih tersimpan di riwayat commit** yang sudah
  ter-push. Menghapusnya dari riwayat membutuhkan `git filter-repo`/rewrite + force-push,
  dan itu keputusan pemilik repo — bukan sesuatu yang dilakukan otomatis oleh perubahan ini.


