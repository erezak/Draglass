import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import ts from 'typescript'

function loadWikilinksModule() {
  const sourcePath = path.resolve('src/wikilinks.ts')
  const source = fs.readFileSync(sourcePath, 'utf8')

  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
    fileName: 'wikilinks.ts',
  })

  const dataUrl = `data:text/javascript;base64,${Buffer.from(outputText, 'utf8').toString('base64')}`
  return import(dataUrl)
}

const mod = await loadWikilinksModule()

assert.equal(mod.normalizeWikiTarget('  Note Name  '), 'note name')
assert.equal(mod.normalizeWikiTarget(' Note | Alias '), 'note')
assert.equal(mod.normalizeWikiTarget('Foo.md'), 'foo')
assert.equal(mod.normalizeWikiTarget('Foo.MD'), 'foo')

const links = mod.parseWikilinks('[[Foo]] [[ foo ]] [[FOO|bar]]')
assert.equal(links.length, 1)
assert.equal(links[0].normalized, 'foo')
assert.equal(links[0].target, 'Foo')

console.log('wikilinks: ok')
