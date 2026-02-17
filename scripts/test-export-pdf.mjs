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

const exportPdf = await loadTsModule('src/exportPdf.ts')

const withTitleHtml = exportPdf.buildPdfDocumentHtml('Hello <world>', {
  title: 'My & Note',
  includeTitle: true,
})
assert.equal(withTitleHtml.includes('<h1'), true)
assert.equal(withTitleHtml.includes('My &amp; Note'), true)
assert.equal(withTitleHtml.includes('Hello &lt;world&gt;'), true)

const withoutTitleHtml = exportPdf.buildPdfDocumentHtml('Body', {
  title: 'Ignored',
  includeTitle: false,
})
assert.equal(withoutTitleHtml.includes('<h1'), false)

console.log('export-pdf: ok')
