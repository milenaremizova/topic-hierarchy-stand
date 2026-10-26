import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    migrate: 'src/scripts/migrate.ts',
    seed: 'src/scripts/seed.ts',
    'check-data': 'src/scripts/check-data.ts',
  },
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  clean: true,
  sourcemap: true,
  // Общий пакет — это исходники на TS, поэтому вшиваем его в сборку
  noExternal: ['@stand/shared'],
})
