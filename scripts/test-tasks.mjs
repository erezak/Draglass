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

const scanner = await loadTsModule('src/features/tasks/taskScanner.ts')
const ignore = await loadTsModule('src/ignore.ts')

assert.equal(
  scanner.replaceTaskState('  - [ ] Task', 'x'),
  '  - [x] Task',
)
assert.equal(
  scanner.replaceTaskState('\t+ [x] Done', ' '),
  '\t+ [ ] Done',
)
assert.equal(
  scanner.replaceTaskState('* [-] Maybe', 'x'),
  '* [x] Maybe',
)
assert.equal(
  scanner.replaceTaskState('* [/] In progress', '-'),
  '* [-] In progress',
)
assert.equal(
  scanner.updateTaskDoneDateField('- [x] Ship release', ' ', 'x', '2026-02-19'),
  '- [x] Ship release ✅ 2026-02-19',
)
assert.equal(
  scanner.updateTaskDoneDateField('- [x] Ship release ✅ 2026-02-19', ' ', 'x', '2026-02-20'),
  '- [x] Ship release ✅ 2026-02-19',
)
assert.equal(
  scanner.updateTaskDoneDateField('- [ ] Ship release ✅ 2026-02-19', 'x', ' ', '2026-02-20'),
  '- [ ] Ship release ~~✅ 2026-02-19~~',
)
assert.equal(
  scanner.updateTaskDoneDateField('- [-] Ship release ✅ 2026-02-19', 'x', '-', '2026-02-20'),
  '- [-] Ship release ~~✅ 2026-02-19~~',
)
assert.equal(
  scanner.updateTaskDoneDateField('- [ ] Ship release ~~✅ 2026-02-19~~', 'x', ' ', '2026-02-20'),
  '- [ ] Ship release ~~✅ 2026-02-19~~',
)

const sample = [
  'Intro',
  '- [ ] First task',
  '> - [ ] Quoted task',
  '```',
  '- [ ] Fenced task',
  '```',
  '+ [x] Done task',
].join('\n')

const tasks = scanner.extractTasksFromText(sample)
assert.equal(tasks.length, 2)
assert.equal(tasks[0].lineNumber, 2)
assert.equal(tasks[0].text, 'First task')
assert.equal(tasks[1].lineNumber, 7)
assert.equal(tasks[1].text, 'Done task')

const customStatus = scanner.parseTaskLine('- [/] In progress', 1)
assert.equal(customStatus?.state, ' ')
assert.equal(customStatus?.text, 'In progress')

const files = [
  { rel_path: 'Notes/One.md', display_name: 'One' },
  { rel_path: '.obsidian/config.md', display_name: 'config' },
]

const filteredHidden = scanner.filterTaskEntries(
  files,
  false,
  (relPath) => ignore.isVisibleNoteForNavigation(relPath, false),
)
assert.equal(filteredHidden.length, 1)
assert.equal(filteredHidden[0].rel_path, 'Notes/One.md')

const filteredAll = scanner.filterTaskEntries(
  files,
  true,
  (relPath) => ignore.isVisibleNoteForNavigation(relPath, false),
)
assert.equal(filteredAll.length, 2)

const tasksQuery = await loadTsModule('src/features/tasks/tasksQuery.ts')
assert.equal(tasksQuery.extractTaskDueDate('Plan launch 📅 2026-03-10'), '2026-03-10')
assert.equal(tasksQuery.extractTaskDueDate('No date here'), null)

console.log('tasks: ok')
