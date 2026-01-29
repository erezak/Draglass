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

const linkText = 'Start [[Note Name|Alias]] end'
const match = livePreview.extractWikilinkAt(linkText, 10)
assert.equal(match?.rawTarget, 'Note Name|Alias')
assert.equal(match?.from, 6)
assert.equal(match?.to, 25)
assert.equal(livePreview.extractWikilinkAt(linkText, 2), null)

console.log('livePreview helpers: ok')

const imageHelpers = await loadTsModule('src/editor/imagePreviewHelpers.ts')

assert.equal(imageHelpers.isRemoteImageTarget('https://example.com/a.png'), true)
assert.equal(imageHelpers.isRemoteImageTarget('data:image/png;base64,aaa'), true)
assert.equal(imageHelpers.isRemoteImageTarget('javascript:alert(1)'), true)
assert.equal(imageHelpers.isRemoteImageTarget('//example.com/a.png'), true)
assert.equal(imageHelpers.isRemoteImageTarget('images/photo.png'), false)

assert.equal(
  imageHelpers.resolveImageTarget('notes/idea.md', './images/photo.png'),
  'notes/images/photo.png',
)
assert.equal(
  imageHelpers.resolveImageTarget('notes/idea.md', 'images\\photo.png'),
  'notes/images/photo.png',
)
assert.equal(
  imageHelpers.resolveImageTarget('notes/idea.md', '/assets/shared.png'),
  'assets/shared.png',
)
assert.equal(imageHelpers.resolveImageTarget('notes/idea.md', '../oops.png'), null)

const imageTargets = imageHelpers.extractImageMarkups(
  '![Alt](images/a.png "Title") ![[assets/b.png|Wiki Alt]]',
)
assert.equal(imageTargets.length, 2)
assert.equal(imageTargets[0].target, 'images/a.png')
assert.equal(imageTargets[0].alt, 'Alt')
assert.equal(imageTargets[1].target, 'assets/b.png')
assert.equal(imageTargets[1].alt, 'Wiki Alt')

console.log('image helpers: ok')

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

const noteTargets = await loadTsModule('src/features/notes/noteTargets.ts')

assert.equal(noteTargets.stripWikilinkTarget(' Note | Alias '), 'Note')
assert.equal(noteTargets.stripWikilinkTarget('  Foo  '), 'Foo')
assert.equal(noteTargets.targetToRelPath('Foo'), 'Foo.md')
assert.equal(noteTargets.targetToRelPath('Bar.md'), 'Bar.md')
assert.equal(noteTargets.targetToRelPath(''), null)

console.log('note targets: ok')
