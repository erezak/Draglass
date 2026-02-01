import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import ts from 'typescript'

function loadTsModule(modulePath) {
  const sourcePath = path.resolve(modulePath)
  const source = fs.readFileSync(sourcePath, 'utf8')

  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
    fileName: path.basename(modulePath),
  })

  const dataUrl = `data:text/javascript;base64,${Buffer.from(outputText, 'utf8').toString('base64')}`
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

console.log('tasks: ok')
