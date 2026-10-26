import type { PublicAccount, Role } from '@stand/shared'
import { and, eq, gt, lt } from 'drizzle-orm'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { randomBytes } from 'node:crypto'
import { config } from '../config.js'
import { db } from '../db/client.js'
import { accounts, sessions, type AccountRow } from '../db/schema.js'
import { forbidden, unauthorized } from '../lib/errors.js'

export const SESSION_COOKIE = 'sid'

declare module 'fastify' {
  interface FastifyRequest {
    /** Текущая учётка или null, если не вошли */
    account: PublicAccount | null
    sessionId: string | null
  }
}

export function toPublicAccount(
  row: Pick<AccountRow, 'id' | 'login' | 'role' | 'displayName' | 'group'>,
): PublicAccount {
  return {
    id: row.id,
    login: row.login,
    role: row.role,
    displayName: row.displayName,
    group: row.group,
  }
}

/** Вешает на каждый запрос определение текущей учётки по cookie */
export function registerSession(app: FastifyInstance) {
  app.decorateRequest('account', null)
  app.decorateRequest('sessionId', null)

  app.addHook('onRequest', async (req) => {
    const raw = req.cookies[SESSION_COOKIE]
    if (!raw) return
    const unsigned = req.unsignCookie(raw)
    if (!unsigned.valid || !unsigned.value) return

    // SELECT accounts.* FROM sessions
    // JOIN accounts ON accounts.id = sessions.account_id
    // WHERE sessions.id = $1 AND sessions.expires_at > now()
    const [row] = await db
      .select({ account: accounts })
      .from(sessions)
      .innerJoin(accounts, eq(accounts.id, sessions.accountId))
      .where(and(eq(sessions.id, unsigned.value), gt(sessions.expiresAt, new Date())))
      .limit(1)

    if (row) {
      req.account = toPublicAccount(row.account)
      req.sessionId = unsigned.value
    }
  })
}

export async function createSession(reply: FastifyReply, accountId: string) {
  const now = new Date()
  // Заодно подчищаем протухшие сессии
  await db.delete(sessions).where(lt(sessions.expiresAt, now))

  const id = randomBytes(32).toString('hex')
  await db.insert(sessions).values({
    id,
    accountId,
    expiresAt: new Date(now.getTime() + config.sessionTtlMs),
  })

  reply.setCookie(SESSION_COOKIE, id, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
    signed: true,
    maxAge: Math.floor(config.sessionTtlMs / 1000),
  })
}

export async function destroySession(req: FastifyRequest, reply: FastifyReply) {
  if (req.sessionId) await db.delete(sessions).where(eq(sessions.id, req.sessionId))
  reply.clearCookie(SESSION_COOKIE, { path: '/' })
}

/**
 * preHandler для маршрутов: пускает только вошедших и, если указаны, только с нужной ролью.
 * Пример: app.get('/x', { preHandler: requireRole('manager') }, handler)
 */
export function requireRole(...roles: Role[]) {
  return async (req: FastifyRequest) => {
    if (!req.account) throw unauthorized()
    if (roles.length > 0 && !roles.includes(req.account.role)) throw forbidden()
  }
}

/** Внутри защищённого маршрута: учётка точно есть */
export function currentAccount(req: FastifyRequest): PublicAccount {
  if (!req.account) throw unauthorized()
  return req.account
}
