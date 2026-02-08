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

const mod = await loadTsModule('src/editor/tableHelpers.ts')

const alignment = mod.isTableSeparatorLine('| :--- | ---: | :---: | --- |')
assert.deepEqual(alignment?.alignments, ['left', 'right', 'center', 'default'])

const split = mod.splitTableRowWithRanges('| a |  b|c  |')
assert.deepEqual(split?.cells, ['a', 'b', 'c'])

const formatted = mod.formatTableLines(
  [
    ['Name', 'Value'],
    ['Alpha', '1'],
    ['Beta', '23'],
  ],
  ['default', 'right'],
)

assert.equal(formatted[0], '| Name  | Value |')
assert.equal(formatted[1], '| ----- | -----: |')
assert.equal(formatted[2], '| Alpha |     1 |')
assert.equal(formatted[3], '| Beta  |    23 |')

console.log('tables: ok')
