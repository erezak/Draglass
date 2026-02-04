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

const mod = await loadTsModule('src/lockedSections.ts')

// Test stripLockedMarker
{
  const r1 = mod.stripLockedMarker('My Title {locked}')
  assert.equal(r1.title, 'My Title')
  assert.equal(r1.hasLocked, true)

  const r2 = mod.stripLockedMarker('{LOCKED} My Title')
  assert.equal(r2.title, 'My Title')
  assert.equal(r2.hasLocked, true)

  const r3 = mod.stripLockedMarker('No marker here')
  assert.equal(r3.title, 'No marker here')
  assert.equal(r3.hasLocked, false)

  const r4 = mod.stripLockedMarker('{Locked}')
  assert.equal(r4.title, '')
  assert.equal(r4.hasLocked, true)

  console.log('stripLockedMarker: ok')
}

// Test basic section parsing
{
  const text = `# Heading 1

Some content here.

## Heading 2 {locked}

Secret content.
More secret.

## Heading 3

Normal content.
`

  const result = mod.parseLockedSections(text)
  assert.equal(result.sections.length, 3)

  const h1 = result.sections[0]
  assert.equal(h1.level, 1)
  assert.equal(h1.titleText, 'Heading 1')
  assert.equal(h1.isExplicitlyLocked, false)
  assert.equal(h1.isLockedByParent, false)
  assert.equal(h1.fromLine, 1)
  assert.equal(h1.toLineExclusive, 5)

  const h2Locked = result.sections[1]
  assert.equal(h2Locked.level, 2)
  assert.equal(h2Locked.titleText, 'Heading 2')
  assert.equal(h2Locked.rawTitleText, 'Heading 2 {locked}')
  assert.equal(h2Locked.isExplicitlyLocked, true)
  assert.equal(h2Locked.isLockedByParent, false)
  assert.equal(h2Locked.fromLine, 5)
  assert.equal(h2Locked.toLineExclusive, 10)

  const h3 = result.sections[2]
  assert.equal(h3.level, 2)
  assert.equal(h3.titleText, 'Heading 3')
  assert.equal(h3.isExplicitlyLocked, false)
  assert.equal(h3.isLockedByParent, false)

  console.log('basic section parsing: ok')
}

// Test locked body ranges
{
  const text = `# H1

Content before.

## H2 {locked}

This is secret.
Very secret.

## H3

Normal.
`

  const result = mod.parseLockedSections(text)
  assert.equal(result.lockedBodyRanges.length, 1)

  const range = result.lockedBodyRanges[0]
  assert.equal(range.fromLine, 6) // Line after "## H2 {locked}"
  assert.equal(range.toLineExclusive, 10) // Up to "## H3"

  console.log('locked body ranges: ok')
}

// Test nested headings inherit lock
{
  const text = `## Parent {locked}

Parent content.

### Child 1

Child 1 content.

#### Grandchild

Grandchild content.

### Child 2

Child 2 content.

## Sibling

Not locked sibling.
`

  const result = mod.parseLockedSections(text)
  assert.equal(result.sections.length, 5)

  const parent = result.sections[0]
  assert.equal(parent.level, 2)
  assert.equal(parent.isExplicitlyLocked, true)
  assert.equal(parent.isLockedByParent, false)

  const child1 = result.sections[1]
  assert.equal(child1.level, 3)
  assert.equal(child1.titleText, 'Child 1')
  assert.equal(child1.isExplicitlyLocked, false)
  assert.equal(child1.isLockedByParent, true)

  const grandchild = result.sections[2]
  assert.equal(grandchild.level, 4)
  assert.equal(grandchild.titleText, 'Grandchild')
  assert.equal(grandchild.isExplicitlyLocked, false)
  assert.equal(grandchild.isLockedByParent, true)

  const child2 = result.sections[3]
  assert.equal(child2.level, 3)
  assert.equal(child2.isExplicitlyLocked, false)
  assert.equal(child2.isLockedByParent, true)

  const sibling = result.sections[4]
  assert.equal(sibling.level, 2)
  assert.equal(sibling.titleText, 'Sibling')
  assert.equal(sibling.isExplicitlyLocked, false)
  assert.equal(sibling.isLockedByParent, false)

  console.log('nested heading inheritance: ok')
}

// Test H1 lock doesn't persist to next H1
{
  const text = `# First {locked}

Secret.

# Second

Not secret.
`

  const result = mod.parseLockedSections(text)
  assert.equal(result.sections.length, 2)

  const first = result.sections[0]
  assert.equal(first.isExplicitlyLocked, true)
  assert.equal(first.isLockedByParent, false)

  const second = result.sections[1]
  assert.equal(second.isExplicitlyLocked, false)
  assert.equal(second.isLockedByParent, false)

  console.log('H1 lock boundary: ok')
}

// Test multiple locked sections
{
  const text = `# Intro

Normal intro.

## Therapy {locked}

Private therapy notes.

## Work

Normal work stuff.

## Secrets {locked}

More secrets.
`

  const result = mod.parseLockedSections(text)
  assert.equal(result.sections.length, 4)
  assert.equal(result.lockedBodyRanges.length, 2)

  const therapy = result.sections[1]
  assert.equal(therapy.titleText, 'Therapy')
  assert.equal(therapy.isExplicitlyLocked, true)

  const secrets = result.sections[3]
  assert.equal(secrets.titleText, 'Secrets')
  assert.equal(secrets.isExplicitlyLocked, true)

  console.log('multiple locked sections: ok')
}

// Test isInLockedRange
{
  const ranges = [
    { from: 10, to: 50, fromLine: 2, toLineExclusive: 5 },
    { from: 100, to: 150, fromLine: 10, toLineExclusive: 15 },
  ]

  assert.equal(mod.isInLockedRange(5, ranges), false)
  assert.equal(mod.isInLockedRange(10, ranges), true)
  assert.equal(mod.isInLockedRange(25, ranges), true)
  assert.equal(mod.isInLockedRange(49, ranges), true)
  assert.equal(mod.isInLockedRange(50, ranges), false)
  assert.equal(mod.isInLockedRange(75, ranges), false)
  assert.equal(mod.isInLockedRange(100, ranges), true)
  assert.equal(mod.isInLockedRange(149, ranges), true)
  assert.equal(mod.isInLockedRange(150, ranges), false)

  console.log('isInLockedRange: ok')
}

// Test isLineInLockedRange
{
  const ranges = [
    { from: 0, to: 100, fromLine: 2, toLineExclusive: 5 },
  ]

  assert.equal(mod.isLineInLockedRange(1, ranges), false)
  assert.equal(mod.isLineInLockedRange(2, ranges), true)
  assert.equal(mod.isLineInLockedRange(4, ranges), true)
  assert.equal(mod.isLineInLockedRange(5, ranges), false)

  console.log('isLineInLockedRange: ok')
}

// Test filterLockedContent
{
  const text = `Line 1
Line 2
Line 3
Line 4
Line 5`

  const ranges = [
    { from: 0, to: 100, fromLine: 2, toLineExclusive: 4 },
  ]

  const filtered = mod.filterLockedContent(text, ranges)
  const lines = filtered.split('\n')
  assert.equal(lines[0], 'Line 1')
  assert.equal(lines[1], '')
  assert.equal(lines[2], '')
  assert.equal(lines[3], 'Line 4')
  assert.equal(lines[4], 'Line 5')

  console.log('filterLockedContent: ok')
}

// Test getSectionAtLine
{
  const text = `# H1

Content.

## H2

More.
`

  const result = mod.parseLockedSections(text)

  const s1 = mod.getSectionAtLine(1, result.sections)
  assert.equal(s1?.titleText, 'H1')

  const s2 = mod.getSectionAtLine(3, result.sections)
  assert.equal(s2?.titleText, 'H1')

  const s3 = mod.getSectionAtLine(5, result.sections)
  assert.equal(s3?.titleText, 'H2')

  const s4 = mod.getSectionAtLine(7, result.sections)
  assert.equal(s4?.titleText, 'H2')

  console.log('getSectionAtLine: ok')
}

// Test generateLockFoldKey
{
  const section = {
    level: 2,
    fromLine: 5,
    toLineExclusive: 10,
    headerFrom: 20,
    headerTo: 40,
    titleText: 'Therapy',
    rawTitleText: 'Therapy {locked}',
    isExplicitlyLocked: true,
    isLockedByParent: false,
  }

  const key = mod.generateLockFoldKey('notes/private.md', section)
  assert.ok(key.startsWith('notes/private.md:5:'))
  assert.ok(key.length > 'notes/private.md:5:'.length)

  console.log('generateLockFoldKey: ok')
}

// Test edge case: no headings
{
  const text = 'Just plain text without headings.'
  const result = mod.parseLockedSections(text)
  assert.equal(result.sections.length, 0)
  assert.equal(result.lockedBodyRanges.length, 0)

  console.log('no headings edge case: ok')
}

// Test edge case: header only section (no body)
{
  const text = `## Header 1 {locked}
## Header 2`

  const result = mod.parseLockedSections(text)
  assert.equal(result.sections.length, 2)
  // The first section has no body content (next line is another heading)
  // So there should be no locked body range for it
  assert.equal(result.lockedBodyRanges.length, 0)

  console.log('header-only section: ok')
}

console.log('\nAll locked sections tests passed!')
