import type { MeResponse } from '@stand/shared'
import { eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  createSession,
  currentAccount,
  destroySession,
  requireRole,
  toPublicAccount,
} from '../auth/session.js'
import { db } from '../db/client.js'
import { accounts } from '../db/schema.js'
import { HttpError } from '../lib/errors.js'
import { verifyPassword } from '../lib/password.js'

const LoginBody = z.object({
  login: z.string().trim().min(1),
  password: z.string().min(1),
})

export async function authRoutes(app: FastifyInstance) {
  app.post('/login', async (req, reply): Promise<MeResponse> => {
    const body = LoginBody.parse(req.body)
    const [row] = await db.select().from(accounts).where(eq(accounts.login, body.login)).limit(1)

    // Одинаковый ответ для «нет логина» и «не тот пароль» — не подсказываем, что из этого неверно
    if (!row || !(await verifyPassword(body.password, row.passwordHash))) {
      throw new HttpError(401, 'invalid_credentials', 'Неверный логин или пароль')
    }

    await createSession(reply, row.id)
    return { account: toPublicAccount(row) }
  })

  app.post('/logout', async (req, reply) => {
    await destroySession(req, reply)
    return { ok: true }
  })

  app.get('/me', { preHandler: requireRole() }, async (req): Promise<MeResponse> => {
    return { account: currentAccount(req) }
  })
}
