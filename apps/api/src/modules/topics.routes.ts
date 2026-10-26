import type { TopicTreeResponse } from '@stand/shared'
import type { FastifyInstance } from 'fastify'
import { requireRole } from '../auth/session.js'

export async function topicsRoutes(app: FastifyInstance) {
  // Плоский список узлов; дерево собирается на фронте по parentId
  app.get('/', { preHandler: requireRole() }, async (): Promise<TopicTreeResponse> => {
    return { nodes: app.standData.nodes }
  })
}
