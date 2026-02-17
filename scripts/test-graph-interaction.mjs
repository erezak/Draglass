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

const mod = await loadTsModule('src/features/graph/graphInteraction.ts')

const nodes = [
  { id: 'a', degreeIn: 0, x: 0, y: 0 },
  { id: 'b', degreeIn: 0, x: 30, y: 0 },
]

assert.equal(mod.pickNodeAtWorldPoint(nodes, 0, 0, 6)?.id, 'a')
assert.equal(mod.pickNodeAtWorldPoint(nodes, 30, 0, 6)?.id, 'b')
assert.equal(mod.pickNodeAtWorldPoint(nodes, 100, 100, 6), null)

console.log('graph interaction: ok')
