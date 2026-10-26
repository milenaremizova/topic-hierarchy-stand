import type { FastifyReply } from 'fastify'

const BOM = '\uFEFF'

function csvCell(value: string | number): string {
  const text = String(value)
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** Заголовок + строки → текст CSV для Excel (разделитель «;», BOM, переносы Windows) */
export function toCsv(header: string[], rows: (string | number)[][]): string {
  const lines = [header, ...rows].map((row) => row.map(csvCell).join(';'))
  return BOM + lines.join('\r\n')
}

/** Отдать текст как скачиваемый файл */
export function sendCsv(reply: FastifyReply, filename: string, csv: string) {
  return reply
    .header('content-type', 'text/csv; charset=utf-8')
    .header('content-disposition', `attachment; filename="${filename}"`)
    .send(csv)
}
