import { isIgnoredPath } from './ignore'
import { createDir, createNote } from './tauri'

function normalizeParentPath(parent: string | null): string {
  if (!parent) return ''
  return parent.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '')
}

function joinRelPath(parent: string, name: string): string {
  return parent ? `${parent}/${name}` : name
}

function buildIndexedName(base: string, index: number, ext: string): string {
  if (index === 0) return `${base}${ext}`
  return `${base} ${index + 1}${ext}`
}

async function tryCreateNote(
  vaultPath: string,
  relPath: string,
  contents: string,
): Promise<void> {
  if (isIgnoredPath(relPath)) {
    throw new Error(`Cannot create note in ignored path: ${relPath}`)
  }
  await createNote(vaultPath, relPath, contents)
}

async function tryCreateFolder(vaultPath: string, relPath: string): Promise<void> {
  if (isIgnoredPath(relPath)) {
    throw new Error(`Cannot create folder in ignored path: ${relPath}`)
  }
  await createDir(vaultPath, relPath)
}

function isNameConflictError(error: unknown): boolean {
  const message = String(error)
  return /already exists|not a file|not a directory/i.test(message)
}

export async function createUniqueNote(
  vaultPath: string,
  parentRelPath: string | null,
  baseName: string = 'Untitled',
): Promise<string> {
  const parent = normalizeParentPath(parentRelPath)
  for (let index = 0; index < 500; index += 1) {
    const fileName = buildIndexedName(baseName, index, '.md')
    const relPath = joinRelPath(parent, fileName)
    try {
      await tryCreateNote(vaultPath, relPath, '')
      return relPath
    } catch (error) {
      if (isNameConflictError(error)) continue
      throw error
    }
  }

  throw new Error('Unable to find an available note name')
}

export async function createUniqueFolder(
  vaultPath: string,
  parentRelPath: string | null,
  baseName: string = 'New folder',
): Promise<string> {
  const parent = normalizeParentPath(parentRelPath)
  for (let index = 0; index < 500; index += 1) {
    const folderName = buildIndexedName(baseName, index, '')
    const relPath = joinRelPath(parent, folderName)
    try {
      await tryCreateFolder(vaultPath, relPath)
      return relPath
    } catch (error) {
      if (isNameConflictError(error)) continue
      throw error
    }
  }

  throw new Error('Unable to find an available folder name')
}
