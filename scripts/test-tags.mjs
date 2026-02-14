import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

import ts from 'typescript'

const nodeRequire = createRequire(import.meta.url)
const moduleCache = new Map()

function resolveTsPath(modulePath) {
  const abs = path.resolve(modulePath)
  if (fs.existsSync(abs)) return abs
  if (fs.existsSync(`${abs}.ts`)) return `${abs}.ts`
  if (fs.existsSync(path.join(abs, 'index.ts'))) return path.join(abs, 'index.ts')
  throw new Error(`Cannot resolve TS module: ${modulePath}`)
}

function loadTsCommonJs(modulePath) {
  const sourcePath = resolveTsPath(modulePath)
  if (moduleCache.has(sourcePath)) return moduleCache.get(sourcePath)

  const source = fs.readFileSync(sourcePath, 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
    },
    fileName: path.basename(sourcePath),
  })

  const module = { exports: {} }
  moduleCache.set(sourcePath, module.exports)

  const localRequire = (specifier) => {
    if (specifier.startsWith('./') || specifier.startsWith('../')) {
      return loadTsCommonJs(path.resolve(path.dirname(sourcePath), specifier))
    }
    return nodeRequire(specifier)
  }

  const wrapped = new Function(
    'require',
    'module',
    'exports',
    '__filename',
    '__dirname',
    outputText,
  )
  wrapped(localRequire, module, module.exports, sourcePath, path.dirname(sourcePath))
  moduleCache.set(sourcePath, module.exports)
  return module.exports
}

const tags = loadTsCommonJs('src/tags.ts')

assert.equal(tags.normalizeTag('#Tag/Sub'), 'tag/sub')
assert.equal(tags.normalizeTag('  MixedCase  '), 'mixedcase')

const sample = [
  '---',
  'tags: [frontmatter_one, "frontmatter/two"]',
  '---',
  'Intro #alpha and #beta/child',
  '`#inline` should not count',
  '```',
  '#fenced should not count',
  '```',
  '# Locked Section {locked}',
  'Hidden #secret',
  '# Open Section',
  'Visible #public',
].join('\n')

const extracted = tags.extractTagsFromText(sample)
assert.equal(extracted.includes('alpha'), true)
assert.equal(extracted.includes('beta/child'), true)
assert.equal(extracted.includes('frontmatter_one'), true)
assert.equal(extracted.includes('frontmatter/two'), true)
assert.equal(extracted.includes('inline'), false)
assert.equal(extracted.includes('fenced'), false)

const lockedFiltered = tags.extractTagsFromTextWithLockFilter(sample, true)
assert.equal(lockedFiltered.includes('secret'), false)
assert.equal(lockedFiltered.includes('public'), true)

const lineTags = tags.extractTagsFromLine('See #one and #two/three')
assert.equal(lineTags.length, 2)
assert.equal(lineTags[0].tag, 'one')
assert.equal(lineTags[1].tag, 'two/three')

assert.equal(tags.findFirstInlineTagLine(sample, 'alpha', false), 4)
assert.equal(tags.findFirstInlineTagLine(sample, 'public', true), 12)
assert.equal(tags.findFirstInlineTagLine(sample, 'secret', true), null)

console.log('tags: ok')
