import { Database } from 'bun:sqlite'
import { dirname, resolve } from 'node:path'
import { mkdirSync } from 'node:fs'

const ensureDirectory = (filePath) => {
  if (!filePath || filePath === ':memory:') return
  mkdirSync(dirname(resolve(filePath)), { recursive: true })
}

export async function createSqliteDatabase(databasePath) {
  ensureDirectory(databasePath)
  const db = new Database(databasePath, { create: true })
  db.exec('PRAGMA journal_mode = WAL;')
  db.exec('PRAGMA foreign_keys = ON;')
  db.exec('PRAGMA busy_timeout = 5000;')

  return {
    dialect: 'sqlite',
    describe: `SQLite · ${databasePath}`,
    async all(sql, params = []) {
      return db.query(sql).all(...params)
    },
    async get(sql, params = []) {
      return db.query(sql).get(...params) ?? null
    },
    async run(sql, params = []) {
      const result = db.query(sql).run(...params)
      return {
        insertId: Number(result.lastInsertRowid ?? 0),
        changes: Number(result.changes ?? 0),
      }
    },
    async exec(sql) {
      db.exec(sql)
    },
    close() {
      db.close()
    },
  }
}
