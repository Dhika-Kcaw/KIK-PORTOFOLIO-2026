# Tutorial: Produksi dengan Caddy

Panduan ini memasang **Museum Portofolio NekoNeko** di server sungguhan dengan
**Caddy sebagai satu-satunya web server**: Caddy yang memegang sertifikat HTTPS,
menyajikan bundel statis `dist/`, dan meneruskan `/api` + `/uploads` ke proses Bun.
Tidak ada nginx, tidak ada Apache, tidak ada PM2, dan **Vite tidak dipakai di
produksi**.

---

## 1. Bentuk akhirnya

```
Internet
   │  https://museum.example.com
   ▼
┌───────────────────────────────────────────────┐
│ Caddy  :80 + :443  (TLS otomatis via ACME)    │
│                                               │
│  /api/*      ──proxy──►  127.0.0.1:3001  Bun  │  ← database, login, CRUD
│  /uploads/*  ──proxy──►  127.0.0.1:3001  Bun  │  ← PMX, tekstur, gambar
│  /assets/*    file_server  (immutable cache)  │
│  /models/*    file_server                     │
│  /motions/*   file_server                     │
│  selain itu   try_files → /index.html         │  ← SPA: museum + /admin/*
└───────────────────────────────────────────────┘
                              dist/  (hasil `bun run build`)
```

Yang perlu dipahami: **Caddy tidak menjalankan JavaScript**. Perintah
`bun run start` juga menyajikan `dist/`, tetapi di panduan ini peran itu diambil
alih Caddy; proses Bun hanya perlu hidup untuk `/api` dan `/uploads`. Dua-duanya
tidak bentrok — `HOST=127.0.0.1` memastikan port 3001 tidak terbuka ke internet.

---

## 2. Prasyarat

| Kebutuhan | Catatan |
| --- | --- |
| **Bun 1.4+** | `curl -fsSL https://bun.sh/install \| bash` |
| **Caddy 2.7+** | ikuti dokumentasi resmi paket distro, atau unduh binernya |
| **Domain** | opsional; tanpa domain lihat §3.2 |
| **Port 80 & 443 terbuka** | port 80 wajib sesaat untuk verifikasi ACME |
| **Akses tulis ke `data/`** | SQLite + berkas unggahan admin |

Struktur folder di server (contoh `/srv/museum`):

```
/srv/museum/
├── dist/                 ← hasil `bun run build`, satu-satunya folder publik
├── server/               ← API Bun
├── shared/               ← skema konten bersama
├── node_modules/         ← cukup dependensi yang dipakai API/panel
├── public/               ← sumber model & motion (sudah ikut ke dist/)
├── data/
│   ├── portfolio.sqlite  ← database (dibuat otomatis)
│   └── uploads/          ← berkas unggahan admin (dibuat otomatis)
├── .env                  ← rahasia, chmod 600
└── Caddyfile
```

---

## 3. Caddyfile

### 3.1 Dengan domain (HTTPS otomatis)

Simpan sebagai `/srv/museum/Caddyfile`:

```caddyfile
{
	email admin@example.com
}

museum.example.com {
	root * /srv/museum/dist

	# Unggahan bundel model bisa mencapai 96 MB; beri ruang lebih.
	request_body {
		max_size 120MB
	}

	encode zstd gzip

	header {
		Strict-Transport-Security "max-age=31536000; includeSubDomains"
		X-Content-Type-Options nosniff
		Referrer-Policy strict-origin-when-cross-origin
		-Server
	}

	# API + mungkin unggahan kecil (gambar/PDF)
	@api path /api/* /api
	handle @api {
		reverse_proxy 127.0.0.1:3001 {
			header_up X-Forwarded-Proto {scheme}
			header_up X-Real-IP {remote_host}
		}
	}

	# Berkas unggahan admin (PMX, tekstur, gambar, PDF).
	# Cache panjang sudah dikirim API sendiri; jangan ditimpa di sini.
	@uploads path /uploads/*
	handle @uploads {
		reverse_proxy 127.0.0.1:3001
	}

	# Bundel Vite memakai hash di nama berkas → aman di-cache selamanya.
	handle /assets/* {
		header Cache-Control "public, max-age=31536000, immutable"
		file_server
	}

	# Model & motion bawaan jarang berubah, tapi namanya tanpa hash.
	@statis path /models/* /motions/*
	handle @statis {
		header Cache-Control "public, max-age=604800"
		file_server
	}

	# Sisa rute: SPA. Menangani `/` dan `/admin/projects` yang di-refresh.
	handle {
		header Cache-Control "no-cache"
		try_files {path} /index.html
		file_server
	}
}
```

Tiga hal yang tidak boleh hilang:

1. **`try_files {path} /index.html`** — tanpa ini, menekan F5 di
   `/admin/testimonials` menghasilkan 404 karena berkasnya tidak ada di disk.
2. **`/api/*` dan `/uploads/*` di-proxy** — tanpa ini museum tampil tetapi tanpa
   data, dan pratinjau model hasil unggahan gagal dimuat.
3. **`root * /srv/museum/dist`** — jangan pernah menaruh `root` di folder proyek.
   Kalau `root` menunjuk proyek, `.env`, `server/`, dan `data/portfolio.sqlite`
   ikut bisa diunduh siapa saja.

### 3.2 Tanpa domain (hanya IP / jaringan lokal)

Ganti baris alamat menjadi `:80`:

```caddyfile
:80 {
	root * /srv/museum/dist
	encode zstd gzip
	# ... blok handle yang sama persis ...
}
```

Konsekuensinya:

- tidak ada HTTPS → di `.env` **jangan** set `COOKIE_SECURE=1`, kalau tidak
  cookie sesi admin tidak akan pernah dikirim balik oleh browser;
- akses lewat `http://192.168.1.10/` atau `http://IP-PUBLIK/`.

Untuk uji lokal dengan HTTPS:
`localhost { tls internal ... }` — Caddy memakai CA-nya sendiri; percayai
sertifikatnya sekali lewat `caddy trust`.

### 3.3 Memasang dan menguji Caddyfile

```bash
sudo cp Caddyfile /srv/museum/Caddyfile
sudo caddy validate --config /srv/museum/Caddyfile --adapter caddyfile
sudo systemctl reload caddy      # atau: caddy reload --config /srv/museum/Caddyfile
```

Kalau `caddy validate` lulus, Caddy akan mengambil sertifikat sendiri pada
permintaan pertama. Syaratnya DNS `museum.example.com` sudah mengarah ke server
dan port 80/443 terbuka.

---

## 4. Menyiapkan aplikasi

### 4.1 Pasang dependensi dan bangun

```bash
cd /srv/museum
bun install
bun run build          # menghasilkan dist/
```

`bun run build` membutuhkan `vite` dan `svelte` (devDependencies), jadi jalankan
di server. Alternatif: build di mesin lokal lalu unggah folder `dist/` —
keduanya sama saja, karena `dist/` tidak butuh Node/Bun untuk dilayani.

### 4.2 `.env` produksi

```bash
# /srv/museum/.env
PORT=3001
HOST=127.0.0.1

DB_CLIENT=sqlite
DB_URL=./data/portfolio.sqlite

ADMIN_NAME=Admin Museum
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=ganti-dengan-kata-sandi-panjang

# Hanya bila situs diakses lewat HTTPS (Caddy + domain).
COOKIE_SECURE=1
```

Untuk MySQL/MariaDB cukup ganti dua baris itu:

```bash
DB_CLIENT=mysql
DB_URL=mysql://user:sandi@127.0.0.1:3306/portfolio
```

Lalu kunci hak akses:

```bash
chmod 600 /srv/museum/.env
```

`ADMIN_*` hanya dipakai **sekali**, saat tabel `admin_users` masih kosong —
akun dibuat otomatis pada permulaan pertama. Bila `.env` dikosongkan, server
memakai `admin@nekoneko.local` / `admin12345` dan mencetak peringatan; jangan
biarkan itu terjadi di server publik.

### 4.3 Siapkan database

```bash
bun run db:migrate     # membuat/menyesuaikan tabel, idempoten
bun run db:seed        # OPSIONAL: hanya mengisi bila tabel masih kosong
```

### 4.4 Jalankan API

```bash
bun server/index.js
```

Uji dari server itu sendiri:

```bash
curl -sS http://127.0.0.1:3001/api/portfolio | head -c 200
```

Bila keluar JSON, API siap.

---

## 5. Menjalankan API sebagai layanan

### 5.1 Linux (systemd)

```ini
# /etc/systemd/system/museum-api.service
[Unit]
Description=Museum — API Bun
After=network.target

[Service]
Type=simple
User=museum
Group=museum
WorkingDirectory=/srv/museum
ExecStart=/usr/local/bin/bun server/index.js
Restart=always
RestartSec=3

# Bun membaca .env sendiri dari WorkingDirectory; EnvironmentFile hanya penguat.
EnvironmentFile=-/srv/museum/.env

NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
# Satu-satunya folder yang perlu ditulis: database + unggahan.
ReadWritePaths=/srv/museum/data

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now museum-api
sudo systemctl status museum-api --no-pager
```

`ProtectSystem=strict` membuat seluruh sistem berkas hanya-baca kecuali
`data/`. Kalau nanti memakai MySQL, cabut baris itu atau tambahkan jalur socket.

### 5.2 Windows

Caddy dan Bun sama-sama jalan sebagai proses biasa. Buat `start-museum.bat`:

```bat
cd /d F:\Campurran\Portofolio
set HOST=127.0.0.1
bun server\index.js >> data\api.log 2>&1
```

Jalankan lewat **Task Scheduler** dengan pemicu "At startup" dan opsi
"Restart on failure". Caddy dijalankan sebagai service Windows resmi
(`caddy run --config Caddyfile`) atau dengan `caddy start`.

---

## 6. Firewall

Yang boleh terbuka hanya **80** dan **443**:

```bash
sudo ufw allow 80,443/tcp
sudo ufw enable
```

Port **3001 tidak boleh** terbuka. Cek dengan:

```bash
ss -ltnp | grep 3001        # harus 127.0.0.1:3001, bukan 0.0.0.0:3001
```

Kalau `HOST` lupa diisi `127.0.0.1`, Bun mendengarkan di semua antarmuka dan
API bisa dihubungi langsung tanpa HTTPS — termasuk `POST /api/auth/login`.

---

## 7. Verifikasi setelah pasang

```bash
# 1. Caddy melayani museum
curl -I https://museum.example.com/
#    → 200, content-type text/html

# 2. SPA fallback bekerja (jangan 404)
curl -o /dev/null -w '%{http_code}\n' https://museum.example.com/admin/projects
#    → 200

# 3. API terjangkau lewat Caddy
curl -sS https://museum.example.com/api/portfolio | head -c 200

# 4. Cookie sesi memakai atribut Secure
curl -sS -D - -o /dev/null \
  -H 'content-type: application/json' \
  -d '{"email":"admin@example.com","password":"sandi-anda"}' \
  https://museum.example.com/api/auth/login | grep -i set-cookie
#    → wg_admin=…; ... Secure; HttpOnly; SameSite=Lax

# 5. Unggahan berfungsi (setelah login lewat browser)
#    unggah satu gambar kecil dari /admin/projects, lalu buka URL /uploads/...
```

Di browser, periksa lima hal ini:

1. museum termuat, karakter muncul, konsol mencetak `[Museum] Fisika aktif: ammo`;
2. berjalan ke sebuah meja, panel terbuka, dan formulir kontak bisa dikirim;
3. `/admin` bisa login, lalu **F5** di `/admin/profile` tetap di halaman itu;
4. unggah folder model → **Pratinjau** → **Pakai** → muat ulang museum;
5. DevTools → Network: `/api/*` tidak pernah berstatus 502.

---

## 8. Alur deploy berikutnya

```bash
cd /srv/museum
git pull
bun install --frozen-lockfile
bun run db:migrate          # wajib bila skema berubah
bun run build               # dist/ baru langsung dipakai Caddy
sudo systemctl restart museum-api
```

Caddy **tidak perlu** di-reload setelah build: `dist/` dibaca dari disk setiap
permintaan. Reload Caddy hanya bila `Caddyfile` berubah.

Untuk perubahan konten (proyek, sertifikat, testimoni, model) sama sekali tidak
perlu deploy — cukup lewat dashboard admin.

---

## 9. Backup dan pemulihan

Yang perlu disalin hanya dua hal:

```bash
# SQLite: salinan aman tanpa menghentikan layanan
sqlite3 /srv/museum/data/portfolio.sqlite ".backup '/backup/portfolio-$(date +%F).sqlite'"

# Berkas unggahan (gambar, PDF, bundel model PMX)
tar -czf /backup/uploads-$(date +%F).tar.gz -C /srv/museum data/uploads
```

MySQL: `mysqldump portfolio > /backup/portfolio-$(date +%F).sql`.

Memulihkan: hentikan `museum-api`, taruh kembali berkasnya, jalankan
`bun run db:migrate`, lalu mulai lagi layanannya.

---

## 10. Troubleshooting

| Gejala | Sebab dan tindakan |
| --- | --- |
| **502 Bad Gateway** di `/api/*` | Proses Bun mati atau port salah. `systemctl status museum-api`, lalu `ss -ltnp \| grep 3001`. |
| Halaman museum kosong, konsol 404 `/assets/index-*.js` | `dist/` tidak lengkap atau `root` salah. Jalankan `bun run build`, pastikan `root * /srv/museum/dist`. |
| F5 di `/admin/projects` → 404 | Blok `handle` terakhir kehilangan `try_files {path} /index.html`. |
| Login "berhasil" tapi langsung kembali ke form | Cookie `Secure` dikirim lewat `http://`. Hapus `COOKIE_SECURE=1` (§3.2) atau pasang HTTPS. |
| Login selalu 401 | Kata sandi salah, atau database lain dari yang dipakai saat seed (`DB_URL`). |
| Unggah model → **413** | Batas `request_body max_size 120MB` di Caddy; naikkan bila bundel memang besar. |
| Unggah sukses tetapi PMX 404 | `/uploads/*` belum di-proxy, atau folder `data/uploads/models/` tidak bisa ditulis user `museum`. |
| Model tidak berubah setelah diunggah | Baris model harus **Pakai** dulu (hanya satu yang `active`), lalu muat ulang museum (Ctrl+F5). |
| Pratinjau model kosong | Berkas tekstur tidak terunggah satu folder. Pilih **folder** model, bukan berkas PMX saja. |
| `database is locked` | Ada dua proses Bun memakai SQLite yang sama. Matikan yang ganda. |
| Rate limit memblokir semua pengunjung sekaligus | `X-Forwarded-For` hilang, jadi semua dihitung sebagai satu IP. Pastikan `reverse_proxy` dipakai (default Caddy mengirim header itu). |
| Caddy 403 saat membaca `dist/` | Izin berkas. `chmod -R o+rX /srv/museum/dist`, atau jalankan Caddy dengan grup yang sama. |
| Muat pertama terasa berat (chunk `ammoPhysics` ±1,9 MB) | Normal: modul fisika diimpor dinamis dan hanya untuk karakter. `encode` + HTTP/2 sudah aktif, dan `/assets/*` memakai cache `immutable` sehingga kunjungan berikutnya tidak mengunduh ulang. |
| Iframe "Uji demo" kosong | Situs tujuan mengirim `X-Frame-Options`/CSP. Pakai tombol **Tab baru** di modal. |
| Caddy gagal ambil sertifikat | DNS belum mengarah ke server, atau port 80 tertutup. Cek `journalctl -u caddy -n 50`. |

---

## 11. Checklist produksi

- [ ] `bun run build` sukses tanpa galat.
- [ ] `bun run db:migrate` dijalankan pada database produksi.
- [ ] `.env` berisi `ADMIN_PASSWORD` baru dan `chmod 600`.
- [ ] `HOST=127.0.0.1`, port 3001 tidak terbuka ke internet.
- [ ] `COOKIE_SECURE=1` **hanya** bila situs memakai HTTPS.
- [ ] `root *` menunjuk `dist/`, bukan folder proyek.
- [ ] `/api/*` dan `/uploads/*` di-proxy ke `127.0.0.1:3001`.
- [ ] `try_files {path} /index.html` ada di blok terakhir.
- [ ] `data/uploads` dapat ditulis user layanan.
- [ ] Backup `data/portfolio.sqlite` + `data/uploads` terjadwal.
- [ ] Login admin, unggah model, dan formulir kontak diuji dari luar server.
