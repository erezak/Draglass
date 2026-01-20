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

const mod = await loadTsModule('src/wikilinks.ts')

assert.equal(mod.normalizeWikiTarget('  Note Name  '), 'note name')
assert.equal(mod.normalizeWikiTarget(' Note | Alias '), 'note')
assert.equal(mod.normalizeWikiTarget('Foo.md'), 'foo')
assert.equal(mod.normalizeWikiTarget('Foo.MD'), 'foo')

const links = mod.parseWikilinks('[[Foo]] [[ foo ]] [[FOO|bar]]')
assert.equal(links.length, 1)
assert.equal(links[0].normalized, 'foo')
assert.equal(links[0].target, 'Foo')

console.log('wikilinks: ok')

const livePreview = await loadTsModule('src/editor/livePreviewHelpers.ts')

assert.equal(livePreview.shouldHideWikilinkBrackets(10, 20, 0, 5), true)
assert.equal(livePreview.shouldHideWikilinkBrackets(10, 20, 10, 10), false)
assert.equal(livePreview.shouldHideWikilinkBrackets(10, 20, 15, 16), false)
assert.equal(livePreview.shouldHideWikilinkBrackets(10, 20, 21, 25), true)

assert.equal(livePreview.shouldHideMarkup(10, 20, 0, 5), true)
assert.equal(livePreview.shouldHideMarkup(10, 20, 12, 18), false)
assert.equal(livePreview.shouldHideMarkup(10, 20, 20, 22), false)
assert.equal(livePreview.shouldHideMarkup(10, 20, 25, 30), true)

console.log('livePreview helpers: ok')

const ignore = await loadTsModule('src/ignore.ts')

assert.equal(ignore.isMarkdownNotePath('a.md'), true)
assert.equal(ignore.isMarkdownNotePath('a.MD'), true)
assert.equal(ignore.isMarkdownNotePath('a.markdown'), true)
assert.equal(ignore.isMarkdownNotePath('a.txt'), false)

assert.equal(ignore.isIgnoredPath('.obsidian/config.md'), true)
assert.equal(ignore.isIgnoredPath('notes/.hidden/n.md'), true)
assert.equal(ignore.isIgnoredPath('node_modules/pkg/readme.md'), true)
assert.equal(ignore.isIgnoredPath('.DS_Store'), true)
assert.equal(ignore.isIgnoredPath('Notes/Project.md'), false)

assert.equal(ignore.isVisibleNoteForNavigation('Notes/Project.md', false), true)
assert.equal(ignore.isVisibleNoteForNavigation('.obsidian/config.md', false), false)
assert.equal(ignore.isVisibleNoteForNavigation('.obsidian/config.md', true), true)

console.log('ignore: ok')
