/**
 * Adapter MySQL/MariaDB.
 *
 * Aplikasi hanya memakai all/get/run/exec dan placeholder `?`, sehingga
 * memindahkan database cukup dengan:
 *   DB_CLIENT=mysql
 *   DB_URL=mysql://user:password@host:3306/portfolio
 * tanpa mengubah route, repository, atau kode UI.
 */
export async function createMysqlDatabase(databaseUrl) {
  let mysql
  try {
    mysql = await import('mysql2/promise')
  } catch {
    throw new Error(
      'Driver mysql2 belum terpasang. Jalankan `bun add mysql2` sebelum memakai DB_CLIENT=mysql.',
    )
  }

  const url = new URL(databaseUrl)
  const database = url.pathname.replace(/^\//, '')
  if (!database) throw new Error('DB_URL MySQL harus menyertakan nama database.')

  const pool = mysql.createPool({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    waitForConnections: true,
    connectionLimit: 8,
    charset: 'utf8mb4',
  })

  return {
    dialect: 'mysql',
    describe: `MySQL/MariaDB · ${databaseUrl.replace(/:\/\/[^@]+@/, '://***@')}`,
    async all(sql, params = []) {
      const [rows] = await pool.query(sql, params)
      return rows
    },
    async get(sql, params = []) {
      const [rows] = await pool.query(sql, params)
      return rows[0] ?? null
    },
    async run(sql, params = []) {
      const [result] = await pool.query(sql, params)
      return {
        insertId: Number(result.insertId ?? 0),
        changes: Number(result.affectedRows ?? 0),
      }
    },
    async exec(sql) {
      // mysql2 tidak mengizinkan multi-statement secara default.
      const statements = sql
        .split(';')
        .map((statement) => statement.trim())
        .filter(Boolean)
      for (const statement of statements) await pool.query(statement)
    },
    async close() {
      await pool.end()
    },
  }
}
