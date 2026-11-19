# Museum Portofolio

Portofolio interaktif berbasis **Svelte 5 + Three.js** yang berwujud **museum 3D**.
Karakter berjalan di dalam museum: meja informasi untuk setiap bagian portofolio,
bingkai proyek di galeri, dan **NPC pengunjung** yang membawa testimoni guru, teman,
pengguna, serta tempat PLK.

Seluruh isi museum (profil, proyek, keahlian, sertifikat, pengalaman, testimoni, artikel)
disimpan di **database** dan diatur lewat **dashboard admin 2D** — tanpa menyentuh kode.
Untuk saat ini memakai **SQLite**, dan bisa dipindah ke **MySQL/MariaDB** hanya dengan
mengubah konfigurasi.

Model MMD dimuat dengan [`@moeru/three-mmd`](https://github.com/moeru-ai/three-mmd),
lengkap dengan fisika **Bullet (Ammo.js)** untuk rambut, kain, dan lengan baju —
rigid body + constraint seperti MMD, bukan pegas sederhana.

---

## Menjalankan

Prasyarat: [Bun](https://bun.sh) 1.4+ dan browser modern dengan WebGL 2.

```bash
bun install        # pasang dependensi
cp .env.example .env   # opsional, atur admin & database
bun run db:seed    # isi data contoh (jika database masih kosong)
bun run dev        # API + Vite sekaligus
```

> **Model karakter tidak ikut repositori.** Folder `public/models/` diabaikan git
> karena berisi berkas PMX besar. Museum **tidak bisa dijalankan tanpa model**:
> unggah satu folder berisi PMX + teksturnya di `/admin/models` lalu tekan **Pakai**,
> atau letakkan berkasnya di `public/models/karakter/karakter.pmx`. Bila keduanya
> tidak ada, layar pemuatan menampilkan pesan yang menyebutkan hal itu beserta
> jalan keluarnya.

- Museum: <http://localhost:5173>
- Dashboard admin: <http://localhost:5173/admin>
- API: <http://localhost:3001/api/portfolio>

### Menguji dari ponsel (jaringan lokal)

```bash
bun run dev --host     # sama dengan: bun run dev:mobile
```

Argumen diteruskan ke Vite, jadi dev server listen di semua antarmuka dan terminal
mencetak alamat jaringan yang bisa dibuka dari ponsel:

```
Dari perangkat lain di jaringan yang sama:
  http://192.168.1.7:5173   (Wi-Fi)
```

Ponsel hanya perlu memuat satu alamat itu — permintaan `/api` dan `/uploads`
diteruskan Vite ke `127.0.0.1:3001` di mesin yang sama, jadi port API tidak perlu
dibuka ke jaringan. Bila halaman tidak terbuka: izinkan `bun.exe` di Windows
Firewall untuk jaringan **privat**, dan pastikan ponsel berada di Wi-Fi yang sama.

Untuk produksi di jaringan lokal:

```bash
HOST=0.0.0.0 bun run start    # API + dist/ melayani seluruh jaringan
```

### Produksi di server dengan Caddy

Untuk situs publik (domain, HTTPS, unggahan besar), gunakan **Caddy** sebagai
satu-satunya web server: Caddy memegang TLS dan menyajikan `dist/`, sementara
`/api` dan `/uploads` diteruskan ke API Bun di `127.0.0.1:3001`. Langkah lengkap,
Caddyfile siap pakai, unit systemd, dan bagian troubleshooting ada di
**[`tutorial.md`](tutorial.md)**.

Kredensial admin awal mengikuti `.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`). Bila tidak
diisi, dipakai `admin@.local` / `admin12345` dan server mencetak peringatan.

```bash
bun run build      # build produksi ke dist/
bun run start      # API + serve dist/ dari satu port (produksi lokal)
```

> Proyek ini memakai **Bun**, bukan npm/pnpm.

---

## Pengalaman Museum

- **Diorama isometrik 3/4** — kamera perspektif dengan sudut tetap, deadzone follow, zoom
  roda mouse, dan bingkai sinematik saat panel dibuka.
- **Gerak klik** — klik lantai untuk berjalan, klik dua kali / `Shift + klik` untuk
  berlari. Klik meja, bingkai proyek, atau pengunjung dari jauh dan karakter akan berjalan
  ke sana lalu membuka panelnya.
- **Mode WASD** — tekan `W A S D` kapan saja (atau `Tab`) untuk mengambil alih gerak.
- **Benda per bagian** — Beranda, Tentang Saya, Keahlian, Galeri Proyek, Sertifikat,
  Pengalaman, CV, Kontak, dan Catatan Ngoding tidak memakai meja yang sama, dan bentuknya
  mengikuti isi bagiannya: beranda meja penerima dengan lonceng dan peta museum, “tentang”
  altar bulat dengan naskah potret terbentang, keahlian tangga bilah bambu (tinggi bilah =
  tingkat), proyek korsel bingkai mini yang berputar, sertifikat dinding piagam, pengalaman
  peta perjalanan dengan pin berflag, CV meja tulis dengan rak penjemuran naskah, kontak
  tiang pos dengan surat bersegel, dan catatan meja baca berlentera. Setiap bagian hanya
  terbuka setelah karakter berjalan dan berhenti di bendanya. Bagian **Testimoni** memakai
  papan tempel, bukan meja.
- **Papan pengunjung** — papan goni bertiang di sisi selatan museum, menggantikan meja
  Testimoni: kertas testimoni yang sudah disetujui dipaku di sana, dan pengunjung bisa
  memaku tulisannya sendiri.
- **Kedai Kartu** — meja judi blackjack **orang pertama** di sela antara meja Kontak dan
  papan pengunjung. Duduk di bangkunya (`E`) dan kamera berpindah ke kursi: kartu bandar
  dan kartumu tergeletak sungguhan di atas kain, keping taruhan bertumpuk di meja, dan
  sosok bandar duduk di seberang. Seret tombol kanan untuk menoleh, `Esc` untuk berdiri.
  Mulai **babak 3** barulah ada **jimat** (Mata Roh, Simpanan, Perisai Kertas, Tarikan
  Takdir) yang dibeli dengan keping dan **kutukan** bandar (Beban Taruhan, Kabut Arsip,
  Tangan Berat, Pajak Bandar) yang menimpamu tergantung tingkat kesulitan — Mudah,
  **Normal** (default), atau Sulit. Dua babak pertama selalu bersih supaya pemain sempat
  belajar aturannya. Saldo dan statistik tersimpan di peramban, jadi bisa dilanjutkan
  kapan saja.
- **Bingkai proyek** — screenshot atau gulungan karya, dengan dokumentasi dan **umpan balik
  pengunjung** di panel detail: nilai 1–5 + catatan, tampil setelah disetujui admin.
- **NPC pengunjung** — setiap testimoni yang disetujui hadir sebagai satu roh kertas
  tersendiri yang berjalan di area museum; ajak bicara dan dialog percakapan khasnya
  muncul dengan kutipan testimoni orang tersebut.
- **Umpan balik proyek dari pengunjung** — di panel detail tiap proyek ada formulir nilai
  1–5 + catatan. Kiriman langsung tampil bertanda “menunggu persetujuan admin” untuk sesi
  itu, dan baru terbit untuk semua orang setelah disetujui admin di `/admin/feedback`.
- **Testimoni dari pengunjung** — di papan pengunjung, kiriman masuk sebagai kertas
  bertanda `待審`: tampil di papan 3D sesi itu, ditandai “menunggu persetujuan admin” di
  panel, dan baru menjadi NPC pengunjung serta kertas permanen setelah disetujui admin di
  dashboard.
- **Uji web langsung** — proyek dengan tautan demo bisa dijalankan di dalam iframe modal.
- **Peta museum** — denah museum yang dibaca langsung dari dunia 3D: posisi karakter,
pengunjung yang berjalan, arah kamera, dan setiap meja/bingkai/papan. Memilih satu
tujuan membuat karakter berjalan ke sana (bukan membuka panel dari jauh). Peta kecil di
sudut layar menampilkan potret yang sama sepanjang penjelajahan; ketuk untuk memperbesar.
- **Panduan kontrol**, animasi pergantian panel, dan tombol kembali ke museum.
- **Animasi berlapis** — klip VMD idle/jalan/lari plus pose lompat, mendarat, lambaian,
  sorakan, dan variasi idle.
- **Suara prosedural** — langkah, lompat, blip UI, buka-tutup panel dari WebAudio.
  Tidak ada backsound yang diputar terus-menerus.
- **Fisika opsional** — `P` menyalakan/mematikan fisika rambut dan kain
  (Bullet/Ammo.js; bila paketnya belum terpasang, otomatis memakai spring bone).

---

## Kontrol

### Ponsel / tablet (sentuh)

Di layar sentuh museum **hanya memakai mode ketuk** — tidak ada mode WASD, dan
papan ketik virtual tidak pernah muncul.

| Gestur | Aksi |
| --- | --- |
| Ketuk lantai | Berjalan ke titik itu |
| Ketuk dua kali | Berlari ke titik itu |
| Ketuk meja / proyek / pengunjung | Berjalan ke sana lalu membuka panel |
| Seret satu jari | Putar diorama 15° per langkah (360°) |
| Cubit dua jari | Zoom masuk / keluar |
| Tombol bawah | Peta, suara, fisika, panduan |
| `×` / Kembali | Tutup panel |

Tombol sistem turun menjadi satu baris di bagian bawah layar; ukurannya 46 px
agar nyaman disentuh ibu jari.

### Desktop

| Input | Aksi |
| --- | --- |
| Klik lantai | Berjalan ke titik |
| Klik dua kali / `Shift + klik` | Berlari ke titik |
| Klik meja / proyek / pengunjung | Berjalan ke sana lalu membuka panel |
| `W A S D` / panah | Mode tombol (aktif otomatis) |
| `Shift` | Berlari di mode tombol |
| `Space` | Lompat (pose prosedural, bukan klip VMD) |
| `Tab` | Ganti mode Klik / WASD |
| Scroll | Zoom kamera |
| `R` | Kembalikan kamera |
| `E` | Buka objek terdekat |
| `I` | Peta museum (denah hidup; mengantar berjalan) |
| `G` / `V` | Melambai / bersorak |
| `P` | Fisika rambut dan kain |
| `M` | Suara |
| `Esc` | Tutup panel, modal, atau panduan |

Audio aktif setelah interaksi pertama (kebijakan autoplay browser).

### Animasi dari Mixamo

Klip gerak dibaca dari `public/motions/` sebagai berkas VMD. Sumber geraknya
Mixamo, di-retarget ke VMD lewat <https://rig.reze.one/> (browser, tanpa akun).

1. Di Mixamo pilih animasi, **Download** → format **FBX Binary**, *Without Skin*
   (dengan skin juga bisa), 30 fps.
2. Buka <https://rig.reze.one/>. **Upload Model** dengan zip berisi
   `karakter.pmx` + teksturnya — retarget memakai kerangka PMX itu, jadi bone dan
   tinggi model ikut benar.
3. **Upload FBX**, cek pratinjau, lalu **Download VMD**.
4. Simpan berkasnya ke `public/motions/` dengan nama yang dibaca aplikasi:

| Berkas | Dipakai untuk |
| --- | --- |
| `idle.vmd` | berdiri diam (berulang) |
| `walk.vmd` | berjalan (berulang) |
| `run.vmd` | berlari (berulang) |

5. Periksa hasilnya: `bun run motions:check` (durasi, jumlah tulang, tulang wajib
   MMD yang hilang, dan pemakaian translasi akar).

Yang perlu diketahui:

- **Hanya tiga klip itu.** Aplikasi tidak membuat klip sendiri dan tidak memuat
  VMD tambahan; lompat dan lompatan pendek memakai pose prosedural di
  `AnimationController` (`updateJump` / `applyJump` / `applyLand`).
- **Langkah meluncur?** Setel `animation.walkClipSpeed` / `runClipSpeed` di
  `src/config.js` agar kecepatan dunia cocok dengan panjang langkah klip baru.
- **Tulang hilang** pada keluaran `motions:check` berarti retarget memakai model
  lain; unggah PMX yang benar di langkah 2.

---

## Dashboard Admin

Buka `/admin` untuk mengatur seluruh isi museum:

- Login / logout dengan sesi cookie.
- CRUD proyek, keahlian, sertifikat & prestasi, pengalaman, testimoni, **umpan balik
  proyek**, catatan, dan model karakter.
- **Model karakter**: unggah satu folder berisi `.pmx` + teksturnya di
  `/admin/models`, tekan **Pratinjau** untuk melihat model berputar 360° (seret untuk
  memutar, gulir untuk memperbesar), lalu tekan **Pakai** pada model yang ingin dipakai
  museum. Hanya satu model aktif; tanpa model aktif museum memakai model bawaan di
  `public/models/karakter/karakter.pmx` (bisa diubah di `CONFIG.assets.model`).
  Folder `public/models/` sengaja tidak ikut repositori, jadi bila berkas itu juga
  tidak ada, museum berhenti dengan pesan **“tidak ada model karakter”** dan cara
  memperbaikinya — bukan halaman kosong tanpa penjelasan.
- Persetujuan testimoni: tab **Menunggu persetujuan**, tombol **Setujui/Sembunyikan**
  langsung di tabel, dan penghitung kiriman baru di navigasi samping.
- Persetujuan **umpan balik proyek**: mekanisme yang sama, ditambah kolom nama proyek
  (bukan ID mentah) supaya jelas karya mana yang dinilai.
- Unggah gambar proyek, foto profil, sertifikat, dan berkas CV.
- Kelola profil: identitas, personal branding, pendidikan, minat, organisasi, PLK,
  tujuan karier, dan tautan sosial.
- Kotak masuk pesan kontak: tandai dibaca dan hapus (privat, tidak tampil di museum).
- Ringkasan jumlah konten dan pesan belum dibaca, plus panel **Perlu tindakan**
  (testimoni & umpan balik tertunda, pesan belum dibaca, proyek draf).
- Alamat tiap bagian punya URL sendiri dan bisa di-refresh atau dibagikan:
  `/admin`, `/admin/profile`, `/admin/projects`, `/admin/skills`, `/admin/certificates`,
  `/admin/experiences`, `/admin/testimonials`, `/admin/feedback`, `/admin/posts`,
  `/admin/models`, `/admin/messages`.
  Back/Forward browser berpindah bagian.
- Tombol hapus membuka **dialog konfirmasi** (bukan dialog bawaan browser) yang
  menyebut nama entri.

Perubahan langsung muncul di museum saat halaman dimuat ulang — tidak perlu mengubah kode.

---

## Database

Default SQLite di `data/portfolio.sqlite`.

Pindah ke MySQL/MariaDB tanpa mengubah kode:

```bash
# .env
DB_CLIENT=mysql
DB_URL=mysql://user:password@127.0.0.1:3306/portfolio
```

```bash
bun run db:migrate   # buat tabel pada database tujuan
bun run db:seed      # opsional: data contoh
```

Skema tersedia di `server/db/schema.sqlite.sql` dan `server/db/schema.mysql.sql`.
Menambah field konten cukup di `shared/content-schema.js` + kolom di kedua skema.

---

## Struktur Singkat

```
src/
├── app/PortfolioApp.js      # Data API, dunia 3D, karakter, input, panel
├── character/               # PMX, kontrol gerak, animasi VMD
├── core/                    # Engine, CameraRig isometrik, InputManager
├── content/museum.js        # Tata letak museum: meja, slot proyek, slot pengunjung
├── world/                   # Museum, Exhibits, InfoStation, ProjectFrame, Visitor
├── ui/                      # HUD, panel + views, peta museum, panduan, loading, embed
├── admin/                   # Dashboard 2D (login, CRUD, upload, pesan)
├── config.js                # Kamera, gerak, animasi, audio, fisika
└── main.js                  # Memilih museum 3D atau dashboard admin
server/                      # API Bun, auth, upload, adapter SQLite/MySQL
shared/content-schema.js     # Skema konten bersama server + admin
```

Baca [AGENTS.md](./AGENTS.md) untuk arsitektur, pedoman modifikasi, **dan** catatan
lengkap proses pembangunan (bab 7) — semuanya ada di satu dokumen.

---

## Kustomisasi Cepat

- **Isi museum:** dashboard `/admin` (profil, proyek, testimoni, umpan balik, artikel, pesan).
- **Tata letak museum:** `src/content/museum.js` — posisi meja, slot proyek, area pengunjung.
- **Rasa gerak & kamera:** `src/config.js`.
- **Warna UI:** token di `src/app.css`.
- **Tekstur 3D:** `src/world/canvasTextures.js`.

### Catatan uji web

Modal demo memakai iframe. Sebagian situs (misalnya GitHub) mengirim `X-Frame-Options`
atau CSP `frame-ancestors` yang menolak ditampilkan di iframe. Gunakan URL proyek yang
memang mengizinkan embedding, atau buka lewat tombol **Buka tab baru**.
