import { DataError, loadStandData } from '../data/load.js'

/** Проверка дерева и сценариев без запуска сервера: npm run data:check */
try {
  const data = loadStandData()
  const leaves = data.nodes.filter((n) => n.isLeaf)
  const directions = data.nodes.filter((n) => n.level === 1).length
  const leavesByDepth = [2, 3, 4].map((l) => leaves.filter((n) => n.level === l).length)

  // Одинаковые названия тематик — в поиске их нужно различать по пути
  const byName = new Map<string, number>()
  for (const l of leaves) byName.set(l.name, (byName.get(l.name) ?? 0) + 1)
  const dupes = [...byName].filter(([, n]) => n > 1)

  console.log(`Дерево:   ${data.sources.topics}`)
  console.log(
    `  направлений ${directions}, разделов ${data.nodes.length - leaves.length - directions}`,
  )
  console.log(
    `  тематик ${leaves.length}: на 2-м уровне ${leavesByDepth[0]}, на 3-м ${leavesByDepth[1]}, на 4-м ${leavesByDepth[2]}`,
  )
  if (dupes.length > 0) {
    console.log(
      `  повторяющиеся названия: ${dupes.map(([name, n]) => `«${name}» ×${n}`).join(', ')}`,
    )
  }
  console.log(`Сценарии: ${data.sources.scenarios}`)
  for (const s of data.scenarios) {
    console.log(`  ${s.id} «${s.title}» → эталон ${s.expectedLeafId}`)
  }
  console.log('Всё в порядке ✓')
} catch (e) {
  if (e instanceof DataError) {
    console.error(`✗ ${e.message}`)
    process.exit(1)
  }
  throw e
}
