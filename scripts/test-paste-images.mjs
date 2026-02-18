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

const pastedImage = await loadTsModule('src/editor/pastedImage.ts')
const pastedImagesSettings = await loadTsModule('src/pastedImagesSettings.ts')

assert.equal(pastedImagesSettings.normalizePastedImagesFolder('assets/'), 'assets')
assert.equal(pastedImagesSettings.normalizePastedImagesFolder('..\\..\\assets\\img'), 'assets/img')
assert.equal(
  pastedImagesSettings.normalizePastedImagesFolder(''),
  pastedImagesSettings.DEFAULT_PASTED_IMAGES_FOLDER,
)

assert.equal(
  pastedImage.buildPastedImageRelPath('assets', 'Notes/My Note.md', 'image/png', 1700000000000, 'abc123'),
  'assets/my-note-1700000000000-abc123.png',
)
assert.equal(
  pastedImage.imageEmbedWikilinkForPath('assets/my-note-1700000000000-abc123.png'),
  '![[assets/my-note-1700000000000-abc123.png]]',
)
assert.equal(pastedImage.isImageMimeType('image/png'), true)
assert.equal(pastedImage.isImageMimeType('IMAGE/JPEG'), true)
assert.equal(pastedImage.isImageMimeType('text/plain'), false)
assert.equal(pastedImage.hasImageFileExtension('screenshot.PNG'), true)
assert.equal(pastedImage.hasImageFileExtension('clipboard-image'), false)
assert.equal(pastedImage.isLikelyClipboardImageFileMeta('image/png', '', 0), true)
assert.equal(pastedImage.isLikelyClipboardImageFileMeta('', 'screenshot.jpeg', 1), true)
assert.equal(pastedImage.isLikelyClipboardImageFileMeta('', '', 512), true)
assert.equal(pastedImage.isLikelyClipboardImageFileMeta('text/plain', '', 512), false)
assert.equal(pastedImage.isLikelyImageClipboardType('image/png'), true)
assert.equal(pastedImage.isLikelyImageClipboardType('Files'), true)
assert.equal(pastedImage.isLikelyImageClipboardType('public.tiff'), true)
assert.equal(pastedImage.isLikelyImageClipboardType('text/plain'), false)
{
  const decoded = pastedImage.decodeImageDataUrl('data:image/png;base64,aGVsbG8=')
  assert.equal(decoded?.mimeType, 'image/png')
  assert.equal(Buffer.from(decoded?.bytes ?? []).toString('utf8'), 'hello')
}
assert.equal(pastedImage.decodeImageDataUrl('data:text/plain;base64,aGVsbG8='), null)

console.log('paste-images: ok')
