import cookie from '@fastify/cookie'
import fastifyStatic from '@fastify/static'
import type { ApiError } from '@stand/shared'
import Fastify from 'fastify'
import { existsSync } from 'node:fs'
import { z } from 'zod'
import { registerSession } from './auth/session.js'
import { config } from './config.js'
import type { StandData } from './data/load.js'
import { HttpError } from './lib/errors.js'
import { authRoutes } from './modules/auth.routes.js'
import { managerRoutes } from './modules/manager.routes.js'
import { runsRoutes } from './modules/runs.routes.js'
import { topicsRoutes } from './modules/topics.routes.js'

declare module 'fastify' {
  interface FastifyInstance {
    /** Дерево тематик и сценарии, загруженные при старте */
    standData: StandData
  }
}

export async function buildApp(standData: StandData) {
  const app = Fastify({ logger: { level: 'info' } })

  app.decorate('standData', standData)
  await app.register(cookie, { secret: config.sessionSecret })
  registerSession(app)

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof HttpError) {
      return reply
        .status(err.statusCode)
        .send({ error: err.code, message: err.message } satisfies ApiError)
    }
    if (err instanceof z.ZodError) {
      return reply
        .status(400)
        .send({ error: 'validation_error', message: z.prettifyError(err) } satisfies ApiError)
    }
    req.log.error(err)
    return reply
      .status(500)
      .send({ error: 'internal', message: 'Внутренняя ошибка сервера' } satisfies ApiError)
  })

  app.get('/api/health', async () => ({ ok: true }))
  await app.register(authRoutes, { prefix: '/api/auth' })
  await app.register(topicsRoutes, { prefix: '/api/topics' })
  await app.register(runsRoutes, { prefix: '/api/runs' })
  await app.register(managerRoutes, { prefix: '/api/manager' })

  // В продакшене этот же сервер отдаёт собранный фронт
  if (existsSync(config.webDistDir)) {
    await app.register(fastifyStatic, { root: config.webDistDir, wildcard: false })
  }

  app.setNotFoundHandler((req, reply) => {
    const isApi = req.url.startsWith('/api')
    if (!isApi && req.method === 'GET' && existsSync(config.webDistDir)) {
      // SPA: все неизвестные страницы отдаём index.html, дальше разбирается React Router
      return reply.sendFile('index.html')
    }
    return reply.status(404).send({ error: 'not_found', message: 'Не найдено' } satisfies ApiError)
  })

  return app
}
