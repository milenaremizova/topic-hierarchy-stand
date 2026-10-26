import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { z } from 'zod'

/** Корень монорепозитория — ищем вверх package.json с workspaces */
function findRoot(start: string): string {
  let dir = start
  while (true) {
    const pkg = path.join(dir, 'package.json')
    if (existsSync(pkg)) {
      const json = JSON.parse(readFileSync(pkg, 'utf8')) as { workspaces?: unknown }
      if (json.workspaces) return dir
    }
    const parent = path.dirname(dir)
    if (parent === dir) return start
    dir = parent
  }
}

export const ROOT_DIR = findRoot(process.cwd())

const envFile = path.join(ROOT_DIR, '.env')
if (existsSync(envFile)) process.loadEnvFile(envFile)

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z
    .string()
    .regex(/^postgres(ql)?:\/\//, 'DATABASE_URL должен начинаться с postgres://'),
  // Сколько соединений с БД держит сервер. Для 20 операторов хватает с запасом
  DB_POOL_MAX: z.coerce.number().int().min(1).max(50).default(5),
  DATA_DIR: z.string().default('./data'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET должен быть не короче 32 символов'),
  SESSION_TTL_HOURS: z.coerce.number().positive().default(12),
  // На внутреннем сервере по HTTP оставь false, иначе браузер не сохранит cookie
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  SEED_MANAGER_LOGIN: z.string().default('manager'),
  SEED_MANAGER_PASSWORD: z.string().optional(),
})

const parsed = EnvSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('Ошибка в переменных окружения (.env):\n' + z.prettifyError(parsed.error))
  process.exit(1)
}

const env = parsed.data
const dataDir = path.resolve(ROOT_DIR, env.DATA_DIR)

export const config = {
  isProd: env.NODE_ENV === 'production',
  port: env.PORT,
  databaseUrl: env.DATABASE_URL,
  dbPoolMax: env.DB_POOL_MAX,
  dataDir,
  migrationsDir: path.join(ROOT_DIR, 'apps/api/drizzle'),
  webDistDir: path.join(ROOT_DIR, 'apps/web/dist'),
  sessionSecret: env.SESSION_SECRET,
  sessionTtlMs: env.SESSION_TTL_HOURS * 60 * 60 * 1000,
  cookieSecure: env.COOKIE_SECURE,
  seedManager: {
    login: env.SEED_MANAGER_LOGIN,
    password: env.SEED_MANAGER_PASSWORD,
  },
} as const
