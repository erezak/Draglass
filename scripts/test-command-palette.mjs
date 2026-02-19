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

const ordering = await loadTsModule('src/features/recents/commandPaletteOrdering.ts')

const commands = [
  { id: 'zeta', label: 'Zeta' },
  { id: 'alpha', label: 'Alpha' },
  { id: 'beta', label: 'Beta' },
]

assert.deepEqual(
  ordering.orderCommandsByMru(commands, [], true).map((cmd) => cmd.id),
  ['alpha', 'beta', 'zeta'],
)
assert.deepEqual(
  ordering.orderCommandsByMru(commands, ['beta'], true).map((cmd) => cmd.id),
  ['beta', 'alpha', 'zeta'],
)
assert.deepEqual(
  ordering.orderCommandsByMru(commands, ['missing', 'zeta'], true).map((cmd) => cmd.id),
  ['zeta', 'alpha', 'beta'],
)
assert.deepEqual(
  ordering.orderCommandsByMru(commands, ['beta'], false).map((cmd) => cmd.id),
  ['alpha', 'beta', 'zeta'],
)

console.log('command palette: ok')
