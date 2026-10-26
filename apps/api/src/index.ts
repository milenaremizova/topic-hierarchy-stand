import { buildApp } from './app.js'
import { config } from './config.js'
import { DataError, loadStandData } from './data/load.js'
import { closeDb, runMigrations } from './db/client.js'

function loadDataOrExit() {
  try {
    return loadStandData()
  } catch (e) {
    if (e instanceof DataError) {
      console.error(`Ошибка в данных стенда:\n${e.message}`)
      process.exit(1)
    }
    throw e
  }
}

const data = loadDataOrExit()

try {
  await runMigrations()
} catch (e) {
  console.error('Не удалось подключиться к базе или применить миграции.')
  console.error('Проверь DATABASE_URL в .env и что Postgres запущен.')
  console.error(e)
  process.exit(1)
}

const app = await buildApp(data)
app.log.info(`Дерево: ${data.sources.topics}`)
app.log.info(`Сценарии: ${data.sources.scenarios}`)

// Аккуратное завершение: дождаться текущих запросов и закрыть соединения с БД
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    await app.close()
    await closeDb()
    process.exit(0)
  })
}

try {
  await app.listen({ port: config.port, host: '0.0.0.0' })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
