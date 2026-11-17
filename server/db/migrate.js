import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createDatabase } from './index.js'

export async function runMigrations(db) {
  const file = db.dialect === 'mysql' ? 'schema.mysql.sql' : 'schema.sqlite.sql'
  const sql = readFileSync(join(import.meta.dir, file), 'utf8')
  await db.exec(sql)

  // Buku tamu sudah tidak dipakai (lihat AGENTS.md §7 bagian 47). Kesan
  // pengunjung sekarang ditampung `project_feedback` per proyek, jadi baris
  // `messages` bertipe guestbook menjadi data yatim: tidak ada satu pun layar
  // yang membacanya. Dibersihkan supaya isi kotak masuk admin hanya pesan nyata.
  try {
    await db.run("DELETE FROM messages WHERE type = 'guestbook'")
  } catch {
    // Dialek/tabel lama bisa menolak perintah ini; migrasi tabel tetap berhasil.
  }
}

if (import.meta.main) {
  const db = await createDatabase()
  try {
    await runMigrations(db)
    console.log(`Skema siap: ${db.describe}`)
  } finally {
    await db.close()
  }
}
