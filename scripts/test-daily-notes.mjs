import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import ts from 'typescript'

const moduleCache = new Map()

async function compileToDataUrl(modulePath) {
  const sourcePath = path.resolve(modulePath)
  const cached = moduleCache.get(sourcePath)
  if (cached) return cached

  const source = fs.readFileSync(sourcePath, 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
    fileName: path.basename(modulePath),
  })

  const importMatches = Array.from(outputText.matchAll(/from\s+['"](\.[^'"]+)['"]/g))
  let rewritten = outputText

  for (const match of importMatches) {
    const rawSpecifier = match[1]
    const baseDir = path.dirname(sourcePath)
    const resolved = path.resolve(baseDir, `${rawSpecifier}.ts`)
    const specifierDataUrl = await compileToDataUrl(resolved)
    rewritten = rewritten.replace(
      new RegExp(`from\\s+['"]${rawSpecifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g'),
      `from '${specifierDataUrl}'`,
    )
  }

  const dataUrl = `data:text/javascript;base64,${Buffer.from(rewritten, 'utf8').toString('base64')}`
  moduleCache.set(sourcePath, dataUrl)
  return dataUrl
}

async function loadTsModule(modulePath) {
  const dataUrl = await compileToDataUrl(modulePath)
  return import(dataUrl)
}

const dailyNotes = await loadTsModule('src/dailyNotes.ts')

const sampleDate = new Date(2026, 1, 3, 12, 40)
assert.equal(
  dailyNotes.buildDailyNoteRelPath(sampleDate, 'Daily', 'YYYY-MM-DD'),
  'Daily/2026-02-03.md',
)
assert.equal(
  dailyNotes.buildDailyNoteRelPath(sampleDate, 'Journal', 'DD-MM-YYYY'),
  'Journal/03-02-2026.md',
)

const existing = dailyNotes.listExistingDailyNoteDates(
  [
    'Daily/2026-02-03.md',
    'Daily/2026-02-04.md',
    'Daily/not-a-day.md',
    'Daily/nested/2026-02-05.md',
    'Notes/2026-02-03.md',
  ],
  'Daily',
  'YYYY-MM-DD',
)
assert.deepEqual([...existing].sort(), ['2026-02-03', '2026-02-04'])

assert.equal(
  dailyNotes.resolveDailyNoteTemplatePath(
    ['_templates/Daily Note.md', '_templates/other.md'],
    '_templates/other.md',
    '_templates',
  ),
  '_templates/other.md',
)
assert.equal(
  dailyNotes.resolveDailyNoteTemplatePath(
    ['_templates/Daily Note.md', '_templates/other.md'],
    'missing/path.md',
    '_templates',
  ),
  '_templates/Daily Note.md',
)
assert.equal(
  dailyNotes.resolveDailyNoteTemplatePath(['_templates/other.md'], '', '_templates'),
  null,
)

console.log('daily-notes: ok')
