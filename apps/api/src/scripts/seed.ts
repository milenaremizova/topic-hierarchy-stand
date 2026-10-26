import { eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { config } from '../config.js'
import { closeDb, db, runMigrations } from '../db/client.js'
import { accounts } from '../db/schema.js'
import { hashPassword } from '../lib/password.js'

/**
 * Создаёт первого руководителя из SEED_MANAGER_LOGIN / SEED_MANAGER_PASSWORD.
 * Остальных руководителей и операторов создаёт уже он сам через стенд.
 */
const { login, password } = config.seedManager
if (!password || password === 'change-me') {
  console.error('Задай SEED_MANAGER_PASSWORD в .env (и не оставляй change-me)')
  process.exit(1)
}

await runMigrations()

const [existing] = await db.select().from(accounts).where(eq(accounts.login, login)).limit(1)
if (existing) {
  console.log(`Учётка «${login}» уже есть — ничего не делаю`)
} else {
  await db.insert(accounts).values({
    id: randomUUID(),
    login,
    passwordHash: await hashPassword(password),
    role: 'manager',
    displayName: 'Руководитель',
    group: null,
  })
  console.log(`Руководитель «${login}» создан`)
}

await closeDb()
