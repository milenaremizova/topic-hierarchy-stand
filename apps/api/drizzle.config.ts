import { defineConfig } from 'drizzle-kit'
import { existsSync } from 'node:fs'

// drizzle-kit запускается из apps/api, а .env лежит в корне
if (existsSync('../../.env')) process.loadEnvFile('../../.env')

// npm run db:generate — создать миграцию по изменениям в схеме
// npx drizzle-kit studio  — посмотреть данные в браузере
// Сами миграции применяются автоматически при старте сервера.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
})
