/**
 * Jalankan API Bun dan Vite dalam satu perintah.
 *
 * Kedua proses dijalankan terpisah dan **tidak saling mematikan**: kalau API
 * mati (mis. port 3001 sudah dipakai proses lama), Vite tetap hidup sehingga
 * halaman museum masih terbuka dan menampilkan pesan error yang sebenarnya —
 * bukan halaman kosong tanpa penjelasan.
 *
 * Argumen tambahan diteruskan ke Vite, jadi `bun run dev --host` membuka dev
 * server ke seluruh jaringan lokal (untuk menguji dari ponsel). API tetap
 * listen di 127.0.0.1 karena permintaan `/api` dari ponsel sampai lewat proxy
 * Vite di mesin yang sama — tidak perlu membuka port database ke jaringan.
 */
import { networkInterfaces } from 'node:os'
import { resolve } from 'node:path'

const root = resolve(import.meta.dir, '..')
const bun = process.execPath

// `bun run dev --host` → process.argv = [bun, scripts/dev.js, '--host']
const forwardArgs = process.argv.slice(2)
const wantsHost = forwardArgs.some(
  (arg) => arg === '--host' || arg.startsWith('--host=') || arg === '-H',
)

const spawn = (args, label) => {
  const child = Bun.spawn(args, {
    cwd: root,
    stdout: 'inherit',
    stderr: 'inherit',
    env: Bun.env,
  })
  console.log(`[${label}] pid ${child.pid}`)
  return child
}

/** IPv4 non-internal, untuk alamat yang bisa dibuka dari ponsel. */
function lanAddresses() {
  const found = []
  const interfaces = networkInterfaces()
  for (const [name, entries] of Object.entries(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.family !== 'IPv4' || entry.internal) continue
      found.push({ name, address: entry.address })
    }
  }
  return found
}

const api = spawn([bun, '--watch', 'server/index.js'], 'API')
const web = spawn([bun, 'node_modules/vite/bin/vite.js', ...forwardArgs], 'Vite')

const webPort = (forwardArgs.find((arg) => arg.startsWith('--port'))?.split('=')[1]) || '5173'

console.log('')
console.log(`Museum  http://localhost:${webPort}`)
console.log(`Admin   http://localhost:${webPort}/admin`)
console.log('API     http://127.0.0.1:3001/api/portfolio')

if (wantsHost) {
  const addresses = lanAddresses()
  if (addresses.length === 0) {
    console.log('')
    console.log('Tidak ada alamat jaringan lokal yang terdeteksi. Sambungkan Wi-Fi/LAN dulu.')
  } else {
    console.log('')
    console.log('Dari perangkat lain di jaringan yang sama:')
    for (const { name, address } of addresses) {
      console.log(`  http://${address}:${webPort}   (${name})`)
    }
    console.log('  Admin: /admin · pastikan firewall Windows mengizinkan bun.exe di jaringan privat.')
  }
} else {
  console.log('')
  console.log('Untuk membuka dari ponsel: bun run dev --host')
}
console.log('')

let stopping = false
const exited = new Set()

const noteExit = (label, code) => {
  exited.add(label)
  if (stopping) return

  if (code !== 0) {
    console.error(`\n${label} berhenti dengan kode ${code}.`)
    console.error('Penyebab paling sering: port sudah dipakai proses lama, atau database gagal dibuka.')
    console.error('Tutup proses lama lalu ulangi:')
    console.error('  taskkill /IM bun.exe /F')
    console.error('  bun run dev')
    console.error('Proses lain dibiarkan hidup; error sebenarnya muncul di halaman/terminal.\n')
  }

  if (exited.size === 2) process.exit(code ?? 0)
}

api.exited.then((code) => noteExit('API', code))
web.exited.then((code) => noteExit('Vite', code))

const shutdown = (code = 0) => {
  if (stopping) return
  stopping = true
  try {
    api.kill()
    web.kill()
  } catch {
    // Proses mungkin sudah berhenti.
  }
  process.exit(code)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
