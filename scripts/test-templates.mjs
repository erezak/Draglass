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

const templates = await loadTsModule('src/templates.ts')
const renderer = await loadTsModule('src/templateRenderer.ts')
const frontmatter = await loadTsModule('src/frontmatter.ts')

assert.equal(templates.isTemplatePath('_templates/note.md', '_templates'), true)
assert.equal(templates.isTemplatePath('_templates/nested/note.md', '_templates'), true)
assert.equal(templates.isTemplatePath('notes/_templates/note.md', '_templates'), false)

const now = new Date(2026, 1, 3, 4, 5)
const rendered = renderer.renderTemplate(
  [
    '---',
    'created: {{date}}',
    'title: {{title}}',
    '---',
    '',
    '# {{title}}',
    '',
    '{{datetime}}',
    '{{cursor}}Body',
    'Unknown {{foo}}',
  ].join('\n'),
  { title: 'My Note', now },
)

assert.deepEqual(
  rendered.frontmatterEntries.map((x) => [x.key, x.value]),
  [
    ['created', '2026-02-03'],
    ['title', 'My Note'],
  ],
)
assert.equal(rendered.bodyText.includes('{{cursor}}'), false)
assert.equal(rendered.cursorOffsetInBody != null, true)
assert.equal(rendered.bodyText.includes('2026-02-03 04:05'), true)
assert.equal(rendered.bodyText.includes('Unknown {{foo}}'), true)

const merged = renderer.mergeFrontmatterForTemplateInsert(
  ['---', 'title: Existing', 'tags: one', '---', '', 'Hello'].join('\n'),
  [
    { key: 'title', value: 'Template', type: 'text' },
    { key: 'created', value: '2026-02-03', type: 'date' },
  ],
)
assert.equal(merged.textWithMergedFrontmatter.includes('title: Existing'), true)
assert.equal(merged.textWithMergedFrontmatter.includes('created: 2026-02-03'), true)
assert.equal(merged.textWithMergedFrontmatter.includes('title: Template'), false)

const defaultsOnEmpty = frontmatter.applyDefaultNoteFrontmatter('', new Date(2026, 1, 3, 4, 5))
const defaultsOnEmptyParsed = frontmatter.parseFrontmatter(defaultsOnEmpty)
assert.equal(defaultsOnEmptyParsed.entries.some((entry) => entry.key === 'created' && entry.value === '2026-02-03 04:05'), true)
assert.equal(defaultsOnEmptyParsed.entries.some((entry) => entry.key === 'updated' && entry.value === '2026-02-03 04:05'), true)

const defaultsWithExistingCreated = frontmatter.applyDefaultNoteFrontmatter(
  ['---', 'created: 2024-01-01 12:34', '---', '', 'Body'].join('\n'),
  new Date(2026, 1, 3, 4, 5),
)
const defaultsWithExistingCreatedParsed = frontmatter.parseFrontmatter(defaultsWithExistingCreated)
assert.equal(
  defaultsWithExistingCreatedParsed.entries.some((entry) => entry.key === 'created' && entry.value === '2024-01-01 12:34'),
  true,
)
assert.equal(
  defaultsWithExistingCreatedParsed.entries.some((entry) => entry.key === 'created' && entry.value === '2026-02-03 04:05'),
  false,
)
assert.equal(
  defaultsWithExistingCreatedParsed.entries.some((entry) => entry.key === 'updated' && entry.value === '2026-02-03 04:05'),
  true,
)

console.log('templates: ok')
