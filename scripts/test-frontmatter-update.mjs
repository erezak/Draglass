import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import ts from 'typescript'

const moduleCache = new Map()

async function compileToDataUrl(modulePath) {
  const sourcePath = path.resolve(modulePath)
  const cached = moduleCache.get(sourcePath)
  if (cached) return cached

  const source = fs.readFileSync(sourcePath, 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
    fileName: path.basename(modulePath),
  })

  const importMatches = Array.from(outputText.matchAll(/from\s+['"](\.[^'"]+)['"]/g))
  let rewritten = outputText

  for (const match of importMatches) {
    const rawSpecifier = match[1]
    const baseDir = path.dirname(sourcePath)
    const resolved = path.resolve(baseDir, `${rawSpecifier}.ts`)
    const specifierDataUrl = await compileToDataUrl(resolved)
    rewritten = rewritten.replace(
      new RegExp(`from\\s+['"]${rawSpecifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g'),
      `from '${specifierDataUrl}'`,
    )
  }

  const dataUrl = `data:text/javascript;base64,${Buffer.from(rewritten, 'utf8').toString('base64')}`
  moduleCache.set(sourcePath, dataUrl)
  return dataUrl
}

async function loadTsModule(modulePath) {
  const dataUrl = await compileToDataUrl(modulePath)
  return import(dataUrl)
}

const { applyUpdatedTimestamp } = await loadTsModule('src/frontmatter.ts')

const now = new Date(2026, 1, 19, 12, 40)

// 1. No frontmatter → returned unchanged
const noFrontmatter = 'Just a plain note.'
assert.equal(applyUpdatedTimestamp(noFrontmatter, now), noFrontmatter)

// 2. Frontmatter without "updated" → "updated" field is added
const withoutUpdated = '---\ncreated: 2026-01-01 10:00\n---\nBody text.'
const result2 = applyUpdatedTimestamp(withoutUpdated, now)
assert.ok(result2.includes('updated: 2026-02-19 12:40'), `expected updated field, got:\n${result2}`)
assert.ok(result2.includes('created: 2026-01-01 10:00'), `created field should be preserved`)

// 3. Frontmatter with existing "updated" → value is replaced
const withUpdated = '---\ncreated: 2026-01-01 10:00\nupdated: 2025-12-01 08:30\n---\nBody text.'
const result3 = applyUpdatedTimestamp(withUpdated, now)
assert.ok(result3.includes('updated: 2026-02-19 12:40'), `expected updated field, got:\n${result3}`)
assert.ok(!result3.includes('2025-12-01 08:30'), `old updated value should be gone`)

// 4. Body content is preserved unchanged
assert.ok(result3.endsWith('Body text.'), `body should be preserved`)

// 5. Applying twice within the same minute is idempotent
const result5a = applyUpdatedTimestamp(withUpdated, now)
const result5b = applyUpdatedTimestamp(result5a, now)
assert.equal(result5a, result5b)

console.log('test-frontmatter-update: all tests passed')
