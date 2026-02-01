import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import ts from 'typescript'
import { Text } from '@codemirror/state'

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

const callouts = await loadTsModule('src/editor/calloutBlocks.ts')

const headerNote = callouts.parseCalloutHeader('> [!note] Custom title')
assert.equal(headerNote?.canonicalType, 'note')
assert.equal(headerNote?.title, 'Custom title')
assert.equal(headerNote?.modifier, null)
assert.equal(headerNote?.depth, 1)

const headerAlias = callouts.parseCalloutHeader('> [!tldr]')
assert.equal(headerAlias?.canonicalType, 'abstract')
assert.equal(headerAlias?.title, 'Abstract')

const headerUnknown = callouts.parseCalloutHeader('> [!mystery]')
assert.equal(headerUnknown?.canonicalType, 'note')
assert.equal(headerUnknown?.title, 'mystery')

const headerCollapsed = callouts.parseCalloutHeader('> [!warning]-  Heads up  ')
assert.equal(headerCollapsed?.canonicalType, 'warning')
assert.equal(headerCollapsed?.title, 'Heads up')
assert.equal(headerCollapsed?.modifier, 'collapsed')

const headerNested = callouts.parseCalloutHeader('> > [!note] Inner')
assert.equal(headerNested?.depth, 2)

const doc = Text.of([
  '> [!note] Title',
  '> Body line 1',
  '> > [!info] Nested',
  '> Nested body',
  'Plain text',
])

const header = callouts.parseCalloutHeader(doc.line(1).text)
assert.ok(header)
const block = callouts.collectCalloutBlock(doc, 1, header)
assert.equal(block?.startLine, 1)
assert.equal(block?.endLine, 4)
assert.equal(block?.from, doc.line(1).from)
assert.equal(block?.to, doc.line(4).to + 1)

assert.equal(callouts.findCalloutStartForLine(doc, 3), 1)

const key1 = callouts.generateCollapseKey('notes/a.md', 2, header)
const key2 = callouts.generateCollapseKey('notes/a.md', 2, header)
assert.equal(key1, key2)
assert.ok(key1.startsWith('notes/a.md:2:'))

console.log('callouts: ok')
