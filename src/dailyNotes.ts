import { DEFAULT_TEMPLATES_FOLDER, normalizeTemplatesFolder } from './templates'

export const DEFAULT_DAILY_NOTES_FOLDER = 'Daily'
export const DEFAULT_DAILY_NOTES_DATE_FORMAT = 'YYYY-MM-DD'
export const DEFAULT_DAILY_NOTE_TEMPLATE_NAME = 'Daily Note.md'

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '')
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function escapeRegex(source: string): string {
  return source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function formatTokenDate(date: Date, format: string): string {
  return format
    .replace(/YYYY/g, String(date.getFullYear()))
    .replace(/MM/g, pad2(date.getMonth() + 1))
    .replace(/DD/g, pad2(date.getDate()))
}

function parseTokenDate(fileName: string, format: string): string | null {
  if (!format.includes('YYYY') || !format.includes('MM') || !format.includes('DD')) return null
  const regexSource = escapeRegex(format)
    .replace(/YYYY/g, '(\\d{4})')
    .replace(/MM/g, '(\\d{2})')
    .replace(/DD/g, '(\\d{2})')
  const match = new RegExp(`^${regexSource}$`).exec(fileName)
  if (!match) return null

  const yearIndex = format.indexOf('YYYY')
  const monthIndex = format.indexOf('MM')
  const dayIndex = format.indexOf('DD')
  const tokenOrder = [
    { token: 'YYYY', at: yearIndex },
    { token: 'MM', at: monthIndex },
    { token: 'DD', at: dayIndex },
  ]
    .sort((a, b) => a.at - b.at)
    .map((x) => x.token)

  const groups = new Map<string, string>()
  for (let i = 0; i < tokenOrder.length; i += 1) {
    const token = tokenOrder[i]
    const value = match[i + 1]
    if (!value) return null
    groups.set(token, value)
  }

  const year = Number(groups.get('YYYY'))
  const month = Number(groups.get('MM'))
  const day = Number(groups.get('DD'))
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() + 1 !== month ||
    date.getDate() !== day
  ) {
    return null
  }
  return `${String(year).padStart(4, '0')}-${pad2(month)}-${pad2(day)}`
}

export function normalizeDailyNotesFolder(value: string | null | undefined): string {
  const normalized = normalizePath(value ?? '').trim()
  return normalized.length > 0 ? normalized : DEFAULT_DAILY_NOTES_FOLDER
}

export function normalizeDailyNoteDateFormat(value: string | null | undefined): string {
  const normalized = (value ?? '').trim()
  return normalized.length > 0 ? normalized : DEFAULT_DAILY_NOTES_DATE_FORMAT
}

export function buildDailyNoteRelPath(
  date: Date,
  folder: string,
  dateFormat: string,
): string {
  const dailyFolder = normalizeDailyNotesFolder(folder)
  const format = normalizeDailyNoteDateFormat(dateFormat)
  const fileName = `${formatTokenDate(date, format)}.md`
  return `${dailyFolder}/${fileName}`
}

export function listExistingDailyNoteDates(
  relPaths: string[],
  folder: string,
  dateFormat: string,
): Set<string> {
  const dailyFolder = normalizeDailyNotesFolder(folder).toLowerCase()
  const prefix = `${dailyFolder}/`
  const format = normalizeDailyNoteDateFormat(dateFormat)
  const dates = new Set<string>()

  for (const relPath of relPaths) {
    const normalized = normalizePath(relPath)
    if (!normalized.toLowerCase().startsWith(prefix)) continue
    const fileName = normalized.slice(prefix.length)
    if (!fileName.toLowerCase().endsWith('.md')) continue
    if (fileName.includes('/')) continue
    const stem = fileName.slice(0, -3)
    const isoDate = parseTokenDate(stem, format)
    if (isoDate) dates.add(isoDate)
  }

  return dates
}

export function resolveDailyNoteTemplatePath(
  relPaths: string[],
  configuredTemplatePath: string | null | undefined,
  templatesFolder: string | null | undefined,
): string | null {
  const normalizedRelPaths = new Set(relPaths.map((path) => normalizePath(path)))
  const configured = normalizePath(configuredTemplatePath ?? '').trim()
  if (configured.length > 0 && normalizedRelPaths.has(configured)) {
    return configured
  }

  const normalizedTemplatesFolder = normalizeTemplatesFolder(
    templatesFolder ?? DEFAULT_TEMPLATES_FOLDER,
  )
  const defaultTemplate = `${normalizedTemplatesFolder}/${DEFAULT_DAILY_NOTE_TEMPLATE_NAME}`
  return normalizedRelPaths.has(defaultTemplate) ? defaultTemplate : null
}
