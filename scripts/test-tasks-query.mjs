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

const taskQuery = await loadTsModule('src/features/tasks/tasksQuery.ts')

const queryFilter = taskQuery.parseTasksCodeBlockFilter(
  [
    'not done',
    'path does not include templates',
    'path does not include {{query.file.path}}',
  ],
  'Projects/Today.md',
)
assert.equal(queryFilter.requireNotDone, true)
assert.deepEqual(queryFilter.excludedPathSnippets, ['templates', 'projects/today.md'])

const queryTasks = [
  { relPath: 'Projects/Today.md', lineNumber: 3, text: 'Same note', state: ' ' },
  { relPath: 'Templates/Base.md', lineNumber: 4, text: 'Template task', state: ' ' },
  { relPath: 'Inbox.md', lineNumber: 1, text: 'Open task', state: ' ' },
  { relPath: 'Done.md', lineNumber: 2, text: 'Done task', state: 'x' },
]
const filteredQueryTasks = taskQuery.applyTasksCodeBlockFilter(queryTasks, queryFilter)
assert.equal(filteredQueryTasks.length, 1)
assert.equal(filteredQueryTasks[0].relPath, 'Inbox.md')

console.log('tasks-query: ok')
