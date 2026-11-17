import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
  TorusGeometry,
} from 'three'

/**
 * Benda fisik untuk setiap bagian museum.
 *
 * Setiap benda harus menjawab satu pertanyaan: "bagian ini isinya apa?". Karena itu
 * bentuknya mengikuti pekerjaan bagiannya — meja penerima untuk beranda, naskah
 * potret untuk biodata, tangga bilah untuk keahlian, korsel bingkai mini untuk galeri
 * proyek, dinding piagam untuk sertifikat, peta tergelar untuk pengalaman, rak
 * penjemuran naskah untuk CV, tiang pos untuk kontak, dan meja baca untuk catatan.
 *
 * Aturan bentuk: isi tengah ≤ 1,2 m supaya papan label di y 1,5 tetap terbaca,
 * elemen tinggi diletakkan di samping, dan setiap benda mengikuti kosakata rupa
 * Wangsheng (batu, kayu gelap, bambu, kuningan, kertas, tinta, vermilion).
 */

/** Palet material bersama; didaftarkan agar ikut dibuang saat dispose(). */
export function createStationMaterials(track, accent = 0xb23a30) {
  const mats = {
    stone: new MeshStandardMaterial({ color: 0x625a4e, roughness: 0.92, metalness: 0.03 }),
    stoneDark: new MeshStandardMaterial({ color: 0x443c33, roughness: 0.95 }),
    wood: new MeshStandardMaterial({ color: 0x33251c, roughness: 0.9, metalness: 0.02 }),
    woodWarm: new MeshStandardMaterial({ color: 0x4a3527, roughness: 0.88 }),
    bamboo: new MeshStandardMaterial({ color: 0x7a6340, roughness: 0.84 }),
    bronze: new MeshStandardMaterial({ color: 0x6a5c37, roughness: 0.55, metalness: 0.4 }),
    paper: new MeshStandardMaterial({
      color: 0xe9ddc2,
      roughness: 0.95,
      emissive: 0x241a10,
      emissiveIntensity: 0.22,
    }),
    paperWarm: new MeshStandardMaterial({
      color: 0xf0e4c6,
      roughness: 0.9,
      emissive: 0x8a5a26,
      emissiveIntensity: 0.32,
    }),
    ink: new MeshStandardMaterial({ color: 0x241c17, roughness: 0.85 }),
    cloth: new MeshStandardMaterial({ color: 0x8d3a32, roughness: 0.9 }),
    thread: new MeshStandardMaterial({ color: 0x8a7250, roughness: 0.95 }),
    blossom: new MeshStandardMaterial({
      color: 0xe9bcc6,
      emissive: 0x3a1e24,
      roughness: 0.82,
    }),
    // Cap vermilion per bagian: warna aksen stasiun ikut terasa di bendanya.
    seal: new MeshStandardMaterial({ color: accent, roughness: 0.9 }),
  }
  track(...Object.values(mats))
  return mats
}

/** Potongan mesh standar: selalu melempar dan menerima bayangan. */
function part(group, geometry, material, position = [0, 0, 0], rotation = [0, 0, 0], shadow = true) {
  const mesh = new Mesh(geometry, material)
  mesh.position.set(position[0], position[1], position[2])
  mesh.rotation.set(rotation[0], rotation[1], rotation[2])
  mesh.castShadow = shadow
  mesh.receiveShadow = true
  group.add(mesh)
  return mesh
}

/** Kendi kecil: dasar untuk tangkai plum. */
function vase(group, mats, position, scale = 1) {
  part(
    group,
    new CylinderGeometry(0.055 * scale, 0.085 * scale, 0.22 * scale, 8),
    mats.stoneDark,
    position,
  )
  part(
    group,
    new TorusGeometry(0.058 * scale, 0.01 * scale, 5, 12),
    mats.bronze,
    [position[0], position[1] + 0.1 * scale, position[2]],
    [Math.PI / 2, 0, 0],
    false,
  )
}

/** Satu tangkai plum: batang, dua ranting, tiga bunga. */
function plumSprig(group, mats, origin = [-0.45, 0.12, -0.22], scale = 1) {
  const sprig = new Group()
  sprig.position.set(origin[0], origin[1], origin[2])

  part(sprig, new CylinderGeometry(0.018 * scale, 0.026 * scale, 0.3 * scale, 5), mats.wood, [0, 0.15 * scale, 0], [0, 0, 0.1])
  part(sprig, new CylinderGeometry(0.011 * scale, 0.016 * scale, 0.2 * scale, 4), mats.wood, [0.05 * scale, 0.33 * scale, 0.01], [0.2, 0, 0.75])
  part(sprig, new CylinderGeometry(0.01 * scale, 0.014 * scale, 0.17 * scale, 4), mats.wood, [-0.04 * scale, 0.35 * scale, -0.02], [-0.2, 0, -0.7])

  for (const [x, y, z] of [
    [0.12, 0.42, 0.03],
    [-0.09, 0.44, -0.05],
    [0.02, 0.53, 0],
  ]) {
    const blossom = part(
      sprig,
      new SphereGeometry(0.034 * scale, 6, 5),
      mats.blossom,
      [x * scale, y * scale, z * scale],
      [0, 0, 0],
      false,
    )
    blossom.scale.set(1, 0.7, 1)
  }

  group.add(sprig)
  return sprig
}

/** Dupa kecil: mangkuk kuningan berkaki dengan batang menyala. */
function censer(group, mats, position, scale = 1) {
  const bowl = new Group()
  bowl.position.set(position[0], position[1], position[2])
  for (let index = 0; index < 3; index += 1) {
    const angle = (index / 3) * Math.PI * 2 + 0.5
    part(
      bowl,
      new CylinderGeometry(0.014 * scale, 0.02 * scale, 0.08 * scale, 4),
      mats.bronze,
      [Math.cos(angle) * 0.06 * scale, 0.04 * scale, Math.sin(angle) * 0.06 * scale],
    )
  }
  part(bowl, new CylinderGeometry(0.1 * scale, 0.06 * scale, 0.09 * scale, 10, 1, true), mats.bronze, [0, 0.1 * scale, 0])
  part(bowl, new TorusGeometry(0.1 * scale, 0.008 * scale, 5, 14), mats.bronze, [0, 0.145 * scale, 0], [Math.PI / 2, 0, 0], false)
  part(bowl, new CylinderGeometry(0.006, 0.008, 0.16 * scale, 4), mats.bamboo, [0.01, 0.22 * scale, 0], [0, 0, 0.1], false)
  part(bowl, new SphereGeometry(0.012, 5, 4), mats.cloth, [0.02, 0.3 * scale, 0], [0, 0, 0], false)
  group.add(bowl)
  return bowl
}

/* ------------------------------------------------------------------ */
/*  1. Beranda — meja penerima: buku catatan, lonceng, peta gulung         */
/* ------------------------------------------------------------------ */

function home({ group, mats }) {
  const sway = []

  // Badan meja setengah lingkaran, seperti loket penerima museum.
  part(
    group,
    new CylinderGeometry(0.62, 0.62, 0.8, 16, 1, true, -Math.PI / 2, Math.PI),
    mats.woodWarm,
    [0, 0.4, 0],
  )
  part(group, new BoxGeometry(1.24, 0.8, 0.09), mats.wood, [0, 0.4, -0.05])
  part(
    group,
    new CylinderGeometry(0.68, 0.68, 0.07, 18, 1, true, -Math.PI / 2, Math.PI),
    mats.wood,
    [0, 0.84, 0],
  )
  part(group, new BoxGeometry(1.36, 0.05, 0.1), mats.ink, [0, 0.86, 0.6])
  part(group, new BoxGeometry(1.36, 0.05, 0.08), mats.wood, [0, 0.86, -0.03])

  // Buku catatan resepsionis terbuka di tengah meja. Murni benda hias: tidak
  // membaca atau menulis apa pun — buku tamu sebagai fitur sudah dihapus.
  part(group, new PlaneGeometry(0.36, 0.26), mats.paper, [-0.06, 0.885, 0.12], [-Math.PI / 2, 0, 0.04], false)
  part(group, new PlaneGeometry(0.36, 0.26), mats.paper, [0.28, 0.885, 0.12], [-Math.PI / 2, 0, -0.04], false)
  part(group, new BoxGeometry(0.04, 0.03, 0.26), mats.cloth, [0.11, 0.885, 0.12], [0, 0, 0], false)
  for (const x of [-0.12, -0.02, 0.2, 0.3]) {
    part(group, new BoxGeometry(0.14, 0.004, 0.006), mats.ink, [x, 0.89, 0.14], [0, 0, 0], false)
  }

  // Peta museum tergulung siap dipinjamkan.
  part(group, new CylinderGeometry(0.045, 0.045, 0.46, 8), mats.paper, [0.34, 0.9, -0.06], [0, 0, Math.PI / 2])
  part(group, new TorusGeometry(0.05, 0.01, 5, 10), mats.bronze, [0.55, 0.9, -0.06], [0, Math.PI / 2, 0], false)

  // Lonceng meja untuk memanggil pemandu. Lonceng meja diam di tempat: kalau
  // digoyang, porosnya ada di alas dan seluruh lonceng terlihat jungkir, bukan berayun.
  const bell = new Group()
  bell.position.set(-0.34, 0.89, -0.06)
  part(bell, new ConeGeometry(0.075, 0.11, 12, 1, true), mats.bronze, [0, 0.06, 0])
  part(bell, new SphereGeometry(0.018, 6, 5), mats.bronze, [0, 0.0, 0], [0, 0, 0], false)
  part(bell, new CylinderGeometry(0.014, 0.014, 0.05, 6), mats.bronze, [0, 0.13, 0])
  group.add(bell)

  // Tiang lentera kertas di sisi kiri: tanda museum sudah buka.
  part(group, new CylinderGeometry(0.035, 0.045, 1.32, 6), mats.wood, [-0.78, 0.66, -0.16])
  part(group, new BoxGeometry(0.3, 0.05, 0.05), mats.wood, [-0.64, 1.32, -0.16])
  const lamp = new Group()
  lamp.position.set(-0.5, 1.32, -0.16)
  part(lamp, new CylinderGeometry(0.006, 0.006, 0.1, 4), mats.thread, [0, -0.05, 0], [0, 0, 0], false)
  const lampGlow = part(lamp, new CylinderGeometry(0.075, 0.075, 0.16, 10), mats.paperWarm, [0, -0.18, 0], [0, 0, 0], false)
  part(lamp, new CylinderGeometry(0.045, 0.045, 0.02, 8), mats.wood, [0, -0.1, 0], [0, 0, 0], false)
  part(lamp, new CylinderGeometry(0.045, 0.045, 0.02, 8), mats.wood, [0, -0.26, 0], [0, 0, 0], false)
  group.add(lamp)
  sway.push({ object: lamp, seed: 1.7, amount: 0.05, speed: 0.85 })

  vase(group, mats, [0.66, 0.86, -0.18], 0.9)
  plumSprig(group, mats, [0.66, 0.94, -0.18], 0.75)

  // Cap kecil di tepi meja: tanda tangan penerima.
  part(group, new BoxGeometry(0.08, 0.02, 0.08), mats.seal, [0.5, 0.885, 0.3], [0, 0.3, 0], false)

  return {
    animate: (elapsed) => {
      // Nyala lentera bernapas lambat; kedip cepat terbaca sebagai lampu rusak.
      lampGlow.material.emissiveIntensity = 0.3 + Math.sin(elapsed * 0.85 + 0.6) * 0.03
      for (const item of sway) {
        item.object.rotation.z = Math.sin(elapsed * item.speed + item.seed) * item.amount
      }
    },
  }
}

/* ------------------------------------------------------------------ */
/*  2. Tentang Saya — naskah potret terbentang di atas altar bulat       */
/* ------------------------------------------------------------------ */

function about({ group, mats }) {
  // Altar bulat seperti vitrin museum: satu-satunya benda yang dibaca mendatar.
  part(group, new CylinderGeometry(0.44, 0.5, 0.5, 12), mats.stone, [0, 0.25, 0])
  part(group, new CylinderGeometry(0.52, 0.52, 0.06, 14), mats.stoneDark, [0, 0.53, 0])
  part(group, new TorusGeometry(0.46, 0.02, 5, 20), mats.bronze, [0, 0.1, 0], [Math.PI / 2, 0, 0], false)

  // Naskah potret terbuka, dibaca dari kamera isometrik yang melihat ke bawah.
  part(group, new PlaneGeometry(0.66, 0.44), mats.paper, [0, 0.568, 0], [-Math.PI / 2, 0, 0], false)
  part(group, new BoxGeometry(0.02, 0.006, 0.44), mats.cloth, [-0.06, 0.571, 0], [0, 0, 0], false)

  // Siluet tinta: kepala dan bahu, bukan foto.
  const head = part(group, new SphereGeometry(0.072, 10, 8), mats.ink, [-0.16, 0.578, -0.02], [0, 0, 0], false)
  head.scale.set(1, 0.3, 1.1)
  part(group, new BoxGeometry(0.16, 0.012, 0.1), mats.ink, [-0.16, 0.575, 0.1], [0, 0, 0], false)
  part(group, new BoxGeometry(0.23, 0.012, 0.05), mats.ink, [-0.16, 0.576, 0.15], [0, 0, 0], false)

  // Baris keterangan dan cap nama di sisi kanan naskah.
  for (const [z, w] of [
    [0.07, 0.2],
    [0.13, 0.17],
    [0.18, 0.19],
  ]) {
    part(group, new BoxGeometry(w, 0.004, 0.007), mats.ink, [0.14, 0.572, z], [0, 0, 0], false)
  }
  part(group, new BoxGeometry(0.06, 0.008, 0.06), mats.seal, [0.24, 0.574, 0.02], [0, 0, 0], false)

  // Rol kayu di kedua tepi naskah.
  for (const x of [-0.35, 0.35]) {
    part(group, new CylinderGeometry(0.021, 0.021, 0.48, 7), mats.wood, [x, 0.57, 0], [Math.PI / 2, 0, 0])
    part(group, new CylinderGeometry(0.025, 0.025, 0.03, 7), mats.bronze, [x, 0.57, 0.23], [Math.PI / 2, 0, 0], false)
  }

  // Dupa di sudut belakang altar dan plum di belakang kiri.
  censer(group, mats, [0.3, 0.56, -0.24], 0.8)
  vase(group, mats, [-0.44, 0.56, -0.26], 0.9)
  plumSprig(group, mats, [-0.44, 0.64, -0.26], 0.85)

  return null
}

/* ------------------------------------------------------------------ */
/*  3. Keahlian — tangga bilah bambu: tinggi bilah = tingkat keahlian    */
/* ------------------------------------------------------------------ */

function skills({ group, mats }) {
  const brushes = []

  // Rangka kayu pendek, seperti papan ukur di bengkel tulis.
  for (const x of [-0.74, 0.74]) {
    part(group, new BoxGeometry(0.09, 1.42, 0.09), mats.wood, [x, 0.71, 0], [0, 0, 0])
    part(group, new BoxGeometry(0.17, 0.05, 0.17), mats.woodWarm, [x, 0.03, 0])
  }
  part(group, new BoxGeometry(1.56, 0.07, 0.1), mats.wood, [0, 1.4, 0])
  part(group, new BoxGeometry(1.44, 0.05, 0.3), mats.woodWarm, [0, 0.06, 0])

  // Lima bilah bambu bertingkat; tinggi = persentase keahlian.
  const bars = [0.3, 0.42, 0.54, 0.66, 0.78]
  bars.forEach((height, index) => {
    const x = -0.5 + index * 0.25
    part(group, new BoxGeometry(0.11, height, 0.1), mats.bamboo, [x, 0.09 + height / 2, 0])
    // Tanda tinta di puncak bilah, seperti garis ukur.
    part(group, new BoxGeometry(0.13, 0.02, 0.12), mats.ink, [x, 0.1 + height, 0], [0, 0, 0], false)
    // Butir cap di depan: kategori keahlian.
    part(group, new BoxGeometry(0.05, 0.05, 0.02), index < 3 ? mats.seal : mats.bronze, [x, 0.16, 0.06], [0, 0, 0], false)
  })

  // Kuas menggantung di sisi kanan rangka.
  for (const [x, scale] of [
    [0.6, 0.9],
    [0.7, 1.1],
  ]) {
    const brush = new Group()
    brush.position.set(x, 1.38, 0.02)
    part(brush, new CylinderGeometry(0.01, 0.01, 0.13, 4), mats.thread, [0, -0.07, 0], [0, 0, 0], false)
    part(brush, new CylinderGeometry(0.016 * scale, 0.016 * scale, 0.3 * scale, 6), mats.bamboo, [0, -0.29 * scale, 0])
    part(brush, new ConeGeometry(0.025 * scale, 0.1 * scale, 7), mats.ink, [0, -0.48 * scale, 0], [Math.PI, 0, 0])
    group.add(brush)
    brushes.push({ object: brush, seed: x * 3.1, amount: 0.028 })
  }

  // Batu tinta dan tumpukan kertas latihan di sisi kiri.
  part(group, new BoxGeometry(0.15, 0.04, 0.11), mats.ink, [-0.58, 0.1, 0.16])
  for (let index = 0; index < 3; index += 1) {
    part(
      group,
      new BoxGeometry(0.24, 0.014, 0.18),
      mats.paper,
      [-0.32 + index * 0.02, 0.1 + index * 0.016, 0.14],
      [0, index * 0.06 - 0.06, 0],
      false,
    )
  }

  return {
    animate: (elapsed) => {
      for (const brush of brushes) {
        brush.object.rotation.z = Math.sin(elapsed * 0.65 + brush.seed) * brush.amount
      }
    },
  }
}

/* ------------------------------------------------------------------ */
/*  4. Galeri Proyek — korsel bingkai mini yang berputar                */
/* ------------------------------------------------------------------ */

function projects({ group, mats }) {
  // Alas batu bulat dan poros kayu.
  part(group, new CylinderGeometry(0.52, 0.58, 0.08, 16), mats.stone, [0, 0.04, 0])
  part(group, new CylinderGeometry(0.05, 0.06, 1.02, 8), mats.wood, [0, 0.56, 0])
  part(group, new CylinderGeometry(0.16, 0.2, 0.06, 12), mats.woodWarm, [0, 0.09, 0])
  part(group, new ConeGeometry(0.07, 0.1, 10), mats.bronze, [0, 1.12, 0])

  // Korsel: empat bingkai mini menghadap keluar, berputar pelan.
  const spinner = new Group()
  spinner.position.set(0, 0.66, 0)
  for (let index = 0; index < 4; index += 1) {
    const arm = new Group()
    arm.rotation.y = (index / 4) * Math.PI * 2

    part(arm, new BoxGeometry(0.05, 0.04, 0.3), mats.wood, [0, 0, 0.17])
    part(arm, new BoxGeometry(0.3, 0.24, 0.025), mats.wood, [0, 0.06, 0.4])
    part(arm, new PlaneGeometry(0.24, 0.18), mats.paper, [0, 0.06, 0.415], [0, 0, 0], false)
    // Isi bingkai: garis-garis yang terbaca sebagai tangkapan layar.
    part(arm, new BoxGeometry(0.14, 0.016, 0.004), mats.ink, [0, 0.11, 0.418], [0, 0, 0], false)
    part(arm, new BoxGeometry(0.16, 0.008, 0.004), mats.ink, [0, 0.06, 0.418], [0, 0, 0], false)
    part(arm, new BoxGeometry(0.1, 0.008, 0.004), mats.ink, [0, 0.02, 0.418], [0, 0, 0], false)
    part(arm, new BoxGeometry(0.24, 0.02, 0.026), mats.seal, [0, -0.06, 0.4], [0, 0, 0], false)

    spinner.add(arm)
  }
  group.add(spinner)

  // Katalog tergulung dan lonceng kurator di alas.
  part(group, new CylinderGeometry(0.04, 0.04, 0.3, 8), mats.paper, [0.4, 0.1, -0.3], [0, 0, Math.PI / 2])
  part(group, new ConeGeometry(0.055, 0.08, 10, 1, true), mats.bronze, [-0.4, 0.12, 0.28])
  part(group, new SphereGeometry(0.015, 6, 5), mats.bronze, [-0.4, 0.07, 0.28], [0, 0, 0], false)

  return {
    animate: (elapsed) => {
      // Satu putaran ±40 detik: cukup untuk mengundang, tidak membuat pusing.
      spinner.rotation.y = elapsed * 0.16
    },
  }
}

/* ------------------------------------------------------------------ */
/*  5. Sertifikat — dinding piagam: tiga pigura dengan pita lilin        */
/* ------------------------------------------------------------------ */

function certificates({ group, mats }) {
  const ribbons = []

  part(group, new BoxGeometry(1.2, 0.16, 0.52), mats.stone, [0, 0.08, 0])
  part(group, new BoxGeometry(1.16, 0.05, 0.46), mats.stoneDark, [0, 0.18, 0])
  part(group, new BoxGeometry(1.1, 0.1, 0.16), mats.woodWarm, [0, 0.24, 0.16])

  // Papan pajang dan rel atas, seperti dinding kecil untuk piagam.
  part(group, new BoxGeometry(1.14, 0.74, 0.05), mats.woodWarm, [0, 0.66, -0.04])
  part(group, new BoxGeometry(1.2, 0.07, 0.1), mats.wood, [0, 1.05, -0.04])
  for (const x of [-0.56, 0.56]) {
    part(group, new BoxGeometry(0.06, 0.34, 0.2), mats.wood, [x, 0.36, 0])
  }

  // Tiga piagam berderet. Masing-masing punya cap lilin dan pita tergantung.
  for (const [index, x] of [-0.36, 0, 0.36].entries()) {
    part(group, new BoxGeometry(0.29, 0.37, 0.03), mats.wood, [x, 0.72, 0.01])
    part(group, new PlaneGeometry(0.23, 0.3), mats.paper, [x, 0.72, 0.028], [0, 0, 0], false)
    for (const y of [0.79, 0.75, 0.71]) {
      part(group, new BoxGeometry(0.15, 0.006, 0.004), mats.ink, [x, y, 0.031], [0, 0, 0], false)
    }
    part(group, new BoxGeometry(0.05, 0.05, 0.012), mats.seal, [x + 0.06, 0.62, 0.032], [0, 0, 0], false)

    const ribbon = new Group()
    ribbon.position.set(x - 0.04, 0.6, 0.03)
    part(ribbon, new BoxGeometry(0.03, 0.14, 0.006), mats.cloth, [0, -0.07, 0], [0, 0, 0], false)
    part(ribbon, new ConeGeometry(0.02, 0.05, 5), mats.cloth, [0, -0.16, 0], [Math.PI, 0, 0], false)
    group.add(ribbon)
    ribbons.push({ object: ribbon, seed: index * 1.4, amount: 0.045 })
  }

  // Gulungan piagam yang menunggu dipajang di nampan kayu.
  for (const [x, tilt] of [
    [-0.2, 0.03],
    [0.05, -0.02],
  ]) {
    part(group, new CylinderGeometry(0.04, 0.04, 0.5, 8), mats.paper, [x, 0.29, 0.16], [0, 0, Math.PI / 2 + tilt])
    part(group, new CylinderGeometry(0.042, 0.042, 0.02, 8), mats.cloth, [x + 0.19, 0.29, 0.16], [0, 0, Math.PI / 2 + tilt], false)
  }
  part(group, new BoxGeometry(0.5, 0.03, 0.2), mats.wood, [0, 0.245, 0.16])

  return {
    animate: (elapsed) => {
      for (const item of ribbons) {
        item.object.rotation.z = Math.sin(elapsed * 0.8 + item.seed) * item.amount
      }
    },
  }
}

/* ------------------------------------------------------------------ */
/*  6. Pengalaman — peta perjalanan tergelar dengan pin lokasi          */
/* ------------------------------------------------------------------ */

function experience({ group, mats }) {
  const flags = []

  // Meja lipat rendah untuk membaca peta.
  part(group, new BoxGeometry(1.3, 0.07, 0.66), mats.woodWarm, [0, 0.62, 0])
  part(group, new BoxGeometry(1.3, 0.05, 0.08), mats.wood, [0, 0.57, -0.29])
  for (const x of [-0.56, 0.56]) {
    for (const z of [-0.26, 0.26]) {
      part(group, new BoxGeometry(0.07, 0.6, 0.07), mats.wood, [x, 0.3, z])
    }
  }
  part(group, new BoxGeometry(1.06, 0.04, 0.08), mats.wood, [0, 0.18, 0], [0, 0, 0], false)

  // Peta: kertas lebar dengan jalur tinta dan dua aliran sungai.
  part(group, new PlaneGeometry(1.0, 0.52), mats.paper, [0, 0.662, 0], [-Math.PI / 2, 0, 0], false)
  part(group, new BoxGeometry(1.0, 0.006, 0.02), mats.ink, [0, 0.668, 0.16], [0, 0, 0.06], false)
  part(group, new BoxGeometry(0.8, 0.006, 0.02), mats.ink, [-0.03, 0.668, -0.06], [0, 0, -0.22], false)
  part(group, new BoxGeometry(0.5, 0.006, 0.014), mats.ink, [0.2, 0.668, 0.02], [0, 0, 0.55], false)
  part(group, new BoxGeometry(0.62, 0.006, 0.03), mats.bamboo, [-0.12, 0.667, -0.18], [0, 0, 0.14], false)

  // Tiga pin lokasi: tempat PLK, organisasi, dan lomba.
  for (const [index, x, z] of [
    [0, -0.3, 0.12],
    [1, 0.06, -0.1],
    [2, 0.34, 0.1],
  ]) {
    part(group, new CylinderGeometry(0.008, 0.008, 0.12, 4), mats.bronze, [x, 0.72, z], [0, 0, 0], false)
    part(group, new SphereGeometry(0.022, 6, 5), mats.seal, [x, 0.785, z], [0, 0, 0], false)

    const flag = new Group()
    flag.position.set(x, 0.78, z)
    part(flag, new PlaneGeometry(0.09, 0.05), mats.cloth, [0.045, 0, 0], [0, 0.25, 0], false)
    group.add(flag)
    flags.push({ object: flag, seed: index * 2.1 })
  }

  // Kompas kuningan di sudut peta.
  part(group, new TorusGeometry(0.07, 0.012, 5, 16), mats.bronze, [0.38, 0.672, -0.16], [-Math.PI / 2, 0, 0], false)
  part(group, new BoxGeometry(0.1, 0.004, 0.012), mats.seal, [0.38, 0.676, -0.16], [0, 0.5, 0], false)

  // Buku agenda perjalanan di samping peta.
  part(group, new BoxGeometry(0.3, 0.05, 0.22), mats.paper, [-0.5, 0.685, -0.14], [0, 0.2, 0])
  part(group, new BoxGeometry(0.31, 0.012, 0.04), mats.cloth, [-0.5, 0.71, -0.14], [0, 0.2, 0])

  // Tongkat bambu bersandar di kaki meja: tanda perjalanan.
  part(group, new CylinderGeometry(0.022, 0.03, 1.3, 6), mats.bamboo, [0.66, 0.65, 0.16], [0.08, 0, 0.14])

  return {
    animate: (elapsed) => {
      for (const item of flags) {
        item.object.rotation.y = 0.18 + Math.sin(elapsed * 1.15 + item.seed) * 0.14
      }
    },
  }
}

/* ------------------------------------------------------------------ */
/*  7. CV Digital — meja tulis dengan rak penjemuran naskah             */
/* ------------------------------------------------------------------ */

function cv({ group, mats }) {
  const sheets = []

  part(group, new BoxGeometry(1.3, 0.07, 0.6), mats.woodWarm, [0, 0.6, 0])
  part(group, new BoxGeometry(1.3, 0.05, 0.08), mats.wood, [0, 0.55, -0.26])
  for (const x of [-0.56, 0.56]) {
    for (const z of [-0.22, 0.22]) {
      part(group, new BoxGeometry(0.07, 0.58, 0.07), mats.wood, [x, 0.29, z])
    }
  }
  part(group, new BoxGeometry(1.04, 0.04, 0.08), mats.wood, [0, 0.17, 0], [0, 0, 0], false)

  // Naskah yang sedang ditulis, ditahan pemberat batu.
  part(group, new BoxGeometry(0.44, 0.008, 0.3), mats.paper, [-0.2, 0.64, 0.08], [0, 0.05, 0], false)
  for (const y of [0.646, 0.652, 0.658]) {
    part(group, new BoxGeometry(0.3, 0.004, 0.005), mats.ink, [-0.2, y, 0.02], [0, 0.05, 0], false)
  }
  part(group, new BoxGeometry(0.07, 0.05, 0.07), mats.stoneDark, [-0.2, 0.67, 0.19], [0, 0.2, 0])
  part(group, new BoxGeometry(0.15, 0.04, 0.11), mats.ink, [0.18, 0.65, 0.12])
  part(group, new CylinderGeometry(0.015, 0.015, 0.28, 6), mats.bamboo, [0.3, 0.67, 0.12], [0, 0, Math.PI / 2 - 0.1])
  part(group, new ConeGeometry(0.022, 0.09, 6), mats.ink, [0.45, 0.67, 0.12], [0, 0, -Math.PI / 2 + 0.1])

  // Tumpukan salinan siap dibawa pulang.
  for (let index = 0; index < 4; index += 1) {
    part(
      group,
      new BoxGeometry(0.3, 0.008, 0.21),
      mats.paper,
      [0.42, 0.64 + index * 0.01, -0.16],
      [0, 0.12 + index * 0.02, 0],
      false,
    )
  }

  // Rak penjemuran: naskah yang baru selesai digantung agar tintanya kering.
  for (const x of [-0.5, 0.5]) {
    part(group, new CylinderGeometry(0.02, 0.025, 0.6, 5), mats.bamboo, [x, 0.92, -0.22])
  }
  part(group, new CylinderGeometry(0.016, 0.016, 1.06, 5), mats.bamboo, [0, 1.2, -0.22], [0, 0, Math.PI / 2])
  for (const [index, x] of [-0.24, 0.02, 0.28].entries()) {
    const sheet = new Group()
    sheet.position.set(x, 1.18, -0.22)
    part(sheet, new PlaneGeometry(0.2, 0.3), mats.paper, [0, -0.16, 0], [0, 0, 0], false)
    part(sheet, new BoxGeometry(0.03, 0.03, 0.02), mats.bronze, [0, -0.01, 0], [0, 0, 0], false)
    for (const y of [-0.1, -0.16, -0.22]) {
      part(sheet, new BoxGeometry(0.12, 0.004, 0.004), mats.ink, [0, y, 0.002], [0, 0, 0], false)
    }
    group.add(sheet)
    sheets.push({ object: sheet, seed: index * 1.1 })
  }

  return {
    animate: (elapsed) => {
      for (const item of sheets) {
        item.object.rotation.z = Math.sin(elapsed * 0.55 + item.seed) * 0.02
      }
    },
  }
}

/* ------------------------------------------------------------------ */
/*  8. Kontak — tiang pos: kotak surat, tumpukan amplop, lonceng        */
/* ------------------------------------------------------------------ */

function contact({ group, mats }) {
  const swinging = []

  part(group, new CylinderGeometry(0.3, 0.34, 0.08, 8), mats.stone, [-0.6, 0.04, 0])
  part(group, new CylinderGeometry(0.09, 0.12, 1.4, 8), mats.wood, [-0.6, 0.7, 0])
  part(group, new BoxGeometry(0.36, 0.05, 0.06), mats.wood, [-0.6, 1.36, 0])

  // Kotak surat dengan celah di depan; dua kurung menempelkannya ke tiang.
  part(group, new BoxGeometry(0.4, 0.05, 0.05), mats.wood, [-0.3, 1.1, 0.04], [0, 0, 0], false)
  part(group, new BoxGeometry(0.4, 0.06, 0.06), mats.wood, [-0.3, 0.9, 0.04], [0, 0, 0], false)
  part(group, new BoxGeometry(0.42, 0.3, 0.34), mats.woodWarm, [0.02, 1.0, 0.04])
  part(group, new BoxGeometry(0.34, 0.026, 0.1), mats.ink, [0.02, 1.055, 0.19], [0, 0, 0], false)
  part(group, new BoxGeometry(0.44, 0.03, 0.36), mats.bronze, [0.02, 1.16, 0.04], [0, 0, 0], false)

  // Bendera “ada surat baru”. Tiangnya tetap; hanya kainnya yang berkibar, jadi
  // putarannya dipasang pada grup kain, bukan pada tiang.
  part(group, new CylinderGeometry(0.008, 0.008, 0.16, 4), mats.bronze, [0.26, 1.11, 0.04], [0, 0, 0], false)
  const flag = new Group()
  flag.position.set(0.26, 1.17, 0.04)
  part(flag, new PlaneGeometry(0.12, 0.08), mats.cloth, [0.06, 0, 0], [0, 0.3, 0], false)
  group.add(flag)
  swinging.push({ object: flag, seed: 1.1, amount: 0.16, axis: 'y' })

  // Tiga surat menyembul dari celah.
  for (const [x, tilt] of [
    [-0.07, 0.16],
    [0.01, -0.1],
    [0.09, 0.05],
  ]) {
    part(group, new PlaneGeometry(0.11, 0.16), mats.paper, [x, 1.07, 0.21], [-0.5, 0, tilt], false)
    part(group, new BoxGeometry(0.06, 0.026, 0.004), mats.seal, [x, 1.09, 0.222], [-0.5, 0, tilt], false)
  }

  // Lonceng dengan tali tarik di lengan tiang.
  const bell = new Group()
  bell.position.set(-0.6, 1.32, 0.16)
  part(bell, new CylinderGeometry(0.01, 0.01, 0.14, 4), mats.thread, [0, -0.07, 0], [0, 0, 0], false)
  part(bell, new ConeGeometry(0.055, 0.09, 10, 1, true), mats.bronze, [0, -0.17, 0])
  part(bell, new CylinderGeometry(0.006, 0.006, 0.16, 4), mats.cloth, [0, -0.26, 0], [0, 0, 0], false)
  group.add(bell)
  swinging.push({ object: bell, seed: 0.5, amount: 0.05, axis: 'z' })

  // Nampan amplop berlak dan batu tinta untuk membalas surat.
  part(group, new BoxGeometry(0.46, 0.03, 0.3), mats.wood, [0.34, 0.1, 0.26])
  for (const [x, z, rot] of [
    [0.24, 0.24, 0.08],
    [0.34, 0.26, -0.05],
    [0.44, 0.24, 0.14],
  ]) {
    part(group, new BoxGeometry(0.15, 0.006, 0.1), mats.paper, [x, 0.13, z], [0, rot, 0], false)
    part(group, new BoxGeometry(0.05, 0.008, 0.02), mats.seal, [x, 0.135, z + 0.03], [0, rot, 0], false)
  }
  part(group, new BoxGeometry(0.12, 0.05, 0.1), mats.ink, [0.62, 0.13, 0.26])
  part(group, new CylinderGeometry(0.014, 0.014, 0.26, 6), mats.bamboo, [0.62, 0.2, 0.26], [0, 0, 0.4])

  return {
    animate: (elapsed) => {
      for (const item of swinging) {
        item.object.rotation[item.axis] = Math.sin(elapsed * 0.9 + item.seed) * item.amount
      }
    },
  }
}

/* ------------------------------------------------------------------ */
/*  9. Catatan Ngoding — meja baca dengan lentera kertas                */
/* ------------------------------------------------------------------ */

function blog({ group, mats }) {
  const swinging = []

  part(group, new BoxGeometry(1.16, 0.06, 0.52), mats.woodWarm, [0, 0.44, 0])
  for (const x of [-0.5, 0.5]) {
    for (const z of [-0.18, 0.18]) {
      part(group, new BoxGeometry(0.06, 0.44, 0.06), mats.wood, [x, 0.22, z])
    }
  }
  part(group, new BoxGeometry(1.08, 0.04, 0.08), mats.wood, [0, 0.12, 0], [0, 0, 0], false)

  // Sandaran baca miring dengan buku catatan terbuka.
  part(group, new BoxGeometry(1.0, 0.05, 0.46), mats.wood, [0, 0.78, -0.06], [-0.62, 0, 0])
  part(group, new BoxGeometry(1.0, 0.05, 0.06), mats.bamboo, [0, 0.6, 0.2], [-0.62, 0, 0], false)
  part(group, new PlaneGeometry(0.34, 0.4), mats.paper, [-0.18, 0.84, -0.02], [-0.62, 0.08, 0], false)
  part(group, new PlaneGeometry(0.34, 0.4), mats.paper, [0.18, 0.84, -0.02], [-0.62, -0.08, 0], false)
  part(group, new BoxGeometry(0.7, 0.02, 0.02), mats.cloth, [0, 0.86, 0], [-0.62, 0, 0], false)
  for (const y of [0.8, 0.86]) {
    part(group, new BoxGeometry(0.52, 0.006, 0.004), mats.ink, [0, y, 0.05], [-0.62, 0, 0], false)
  }

  // Tiga gulungan catatan bertali, ditumpuk di rak samping.
  for (const [index, x] of [-0.42, -0.28, -0.14].entries()) {
    part(group, new CylinderGeometry(0.045, 0.045, 0.44, 8), mats.paper, [x, 0.5 + index * 0.02, 0.08], [0, 0, Math.PI / 2 + index * 0.02 - 0.02])
    part(group, new CylinderGeometry(0.047, 0.047, 0.02, 8), mats.thread, [x + 0.15, 0.5 + index * 0.02, 0.08], [0, 0, Math.PI / 2], false)
  }
  part(group, new BoxGeometry(0.2, 0.06, 0.1), mats.ink, [-0.36, 0.5, 0.02])

  // Lengan bambu dengan lentera kertas: tanda meja baca masih menyala.
  part(group, new CylinderGeometry(0.03, 0.035, 1.32, 6), mats.bamboo, [0.72, 0.66, -0.14])
  part(group, new CylinderGeometry(0.022, 0.022, 0.34, 5), mats.bamboo, [0.56, 1.3, -0.14], [0, 0, Math.PI / 2])
  const lantern = new Group()
  lantern.position.set(0.42, 1.3, -0.14)
  part(lantern, new CylinderGeometry(0.006, 0.006, 0.1, 4), mats.thread, [0, -0.05, 0], [0, 0, 0], false)
  const glow = part(lantern, new CylinderGeometry(0.1, 0.1, 0.17, 10), mats.paperWarm, [0, -0.18, 0], [0, 0, 0], false)
  part(lantern, new CylinderGeometry(0.06, 0.06, 0.02, 8), mats.wood, [0, -0.1, 0], [0, 0, 0], false)
  part(lantern, new CylinderGeometry(0.06, 0.06, 0.02, 8), mats.wood, [0, -0.26, 0], [0, 0, 0], false)
  group.add(lantern)
  swinging.push({ object: lantern, seed: 1.4, amount: 0.045, axis: 'z' })

  return {
    animate: (elapsed) => {
      for (const item of swinging) {
        item.object.rotation[item.axis] = Math.sin(elapsed * 0.6 + item.seed) * item.amount
      }
      glow.material.emissiveIntensity = 0.3 + Math.sin(elapsed * 0.75 + 1.1) * 0.03
    },
  }
}

/* ------------------------------------------------------------------ */
/*  Pemilih benda per bagian                                             */
/* ------------------------------------------------------------------ */

const BODIES = { home, about, skills, projects, certificates, experience, cv, contact, blog }

/**
 * Bangun benda untuk satu bagian. Mengembalikan `{ animate }` bila bendanya
 * bergerak, atau `null` untuk benda diam.
 */
export function buildSectionBody(sectionKey, context) {
  const builder = BODIES[sectionKey] ?? cv
  return builder(context)
}

