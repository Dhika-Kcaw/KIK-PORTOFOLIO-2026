import { createSqliteDatabase } from './sqlite.js'
import { createMysqlDatabase } from './mysql.js'

/**
 * Pilih database dari env:
 * - DB_CLIENT=sqlite (default), DB_URL=./data/portfolio.sqlite
 * - DB_CLIENT=mysql | mariadb, DB_URL=mysql://user:pass@host:3306/portfolio
 */
export async function createDatabase() {
  const client = String(Bun.env.DB_CLIENT || 'sqlite').toLowerCase()

  if (client === 'mysql' || client === 'mariadb') {
    const url = Bun.env.DB_URL
    if (!url) throw new Error('DB_CLIENT=mysql membutuhkan DB_URL.')
    return createMysqlDatabase(url)
  }

  if (client !== 'sqlite') {
    throw new Error(`DB_CLIENT tidak dikenal: ${client}. Gunakan sqlite, mysql, atau mariadb.`)
  }

  return createSqliteDatabase(Bun.env.DB_URL || './data/portfolio.sqlite')
}

export async function insertRow(db, table, data) {
  const columns = Object.keys(data)
  const placeholders = columns.map(() => '?').join(', ')
  const result = await db.run(
    `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
    columns.map((column) => data[column]),
  )
  return result.insertId
}

export async function updateRow(db, table, id, data) {
  const columns = Object.keys(data)
  if (columns.length === 0) return 0
  const assignments = columns.map((column) => `${column} = ?`).join(', ')
  const result = await db.run(
    `UPDATE ${table} SET ${assignments} WHERE id = ?`,
    [...columns.map((column) => data[column]), id],
  )
  return result.changes
}
