import { closeDb, runMigrations } from '../db/client.js'

await runMigrations()
await closeDb()
console.log('Миграции применены')
