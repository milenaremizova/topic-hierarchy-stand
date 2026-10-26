import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import pg from 'pg'
import { config } from '../config.js'
import * as schema from './schema.js'

/**
 * Пул соединений: держит несколько открытых подключений к Postgres
 * и раздаёт их запросам, чтобы не подключаться заново на каждый запрос.
 */
export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: config.dbPoolMax,
})

export const db = drizzle(pool, { schema })
export type Db = typeof db

export async function runMigrations() {
  await migrate(db, { migrationsFolder: config.migrationsDir })
}

/** Закрыть пул — иначе скрипты (seed, migrate) не завершатся сами */
export async function closeDb() {
  await pool.end()
}
