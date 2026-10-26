import { HIERARCHY_EVENT_TYPES, type PathSnapshot } from '@stand/shared'
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

/**
 * Схема БД (PostgreSQL).
 * После изменений: npm run db:generate → проверить SQL в apps/api/drizzle → перезапустить сервер.
 *
 * Рядом с каждой таблицей — во что она превращается в SQL, чтобы было проще сверять.
 */

// ——— Перечисления ———
// CREATE TYPE role AS ENUM ('manager', 'operator');
// База сама не даст записать значение не из списка.
export const roleEnum = pgEnum('role', ['manager', 'operator'])
export const testGroupEnum = pgEnum('test_group', ['manual', 'search'])
export const runStatusEnum = pgEnum('run_status', ['pending', 'open', 'closed'])
export const eventTypeEnum = pgEnum('hierarchy_event_type', HIERARCHY_EVENT_TYPES)

// Время — timestamptz: хранит момент времени с учётом часового пояса.
// mode: 'date' — в коде это обычный Date.
const tstz = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' })

// ——— Учётки ———
// CREATE TABLE accounts (
//   id uuid PRIMARY KEY,
//   login text NOT NULL UNIQUE,
//   ...
// );
export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey(),
  login: text('login').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: roleEnum('role').notNull(),
  displayName: text('display_name').notNull(),
  // null у руководителей
  group: testGroupEnum('test_group'),
  createdAt: tstz('created_at').notNull().defaultNow(),
})

// ——— Сессии входа ———
// account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE
export const sessions = pgTable(
  'sessions',
  {
    // Случайный токен из cookie, не uuid
    id: text('id').primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    createdAt: tstz('created_at').notNull().defaultNow(),
    expiresAt: tstz('expires_at').notNull(),
  },
  (t) => [index('sessions_account_idx').on(t.accountId)],
)

// ——— Прохождения диалогов ———
// Одна строка = один диалог у одного оператора. 5 строк создаются сразу,
// порядок задаёт position (перемешан).
export const chatRuns = pgTable(
  'chat_runs',
  {
    id: uuid('id').primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    // Сценарии живут в JSON-файле, а не в БД, поэтому внешнего ключа тут нет
    scenarioId: text('scenario_id').notNull(),
    position: integer('position').notNull(),
    status: runStatusEnum('status').notNull().default('pending'),
    openedAt: tstz('opened_at'),
    closedAt: tstz('closed_at'),
    finalLeafId: text('final_leaf_id'),
    // jsonb — JSON в бинарном виде, по нему можно делать запросы
    finalPath: jsonb('final_path').$type<PathSnapshot>(),
    archived: boolean('archived').notNull().default(false),
  },
  // Главный запрос: «прохождения учётки, без архивных, по порядку»
  (t) => [index('chat_runs_account_idx').on(t.accountId, t.archived, t.position)],
)

// ——— События выбора тематики ———
export const hierarchyEvents = pgTable(
  'hierarchy_events',
  {
    id: uuid('id').primaryKey(),
    runId: uuid('run_id')
      .notNull()
      .references(() => chatRuns.id, { onDelete: 'cascade' }),
    // Время на устройстве оператора — по нему считаем скорость
    ts: tstz('ts').notNull(),
    // Время прихода на сервер — для отладки, если часы у кого-то врут
    receivedAt: tstz('received_at').notNull().defaultNow(),
    type: eventTypeEnum('type').notNull(),
    nodeId: text('node_id'),
    query: text('query'),
    resultsCount: integer('results_count'),
    resultIndex: integer('result_index'),
    path: jsonb('path').$type<PathSnapshot>(),
  },
  (t) => [index('hierarchy_events_run_idx').on(t.runId, t.ts)],
)

export type AccountRow = typeof accounts.$inferSelect
export type ChatRunRow = typeof chatRuns.$inferSelect
export type HierarchyEventRow = typeof hierarchyEvents.$inferSelect
