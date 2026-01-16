import { useEffect, useMemo, useState } from 'react'

import type { NoteEntry } from '../types'
import { fileStem } from '../path'

type FileTreeProps = {
  files: NoteEntry[]
  activeRelPath: string | null
  rememberExpanded: boolean
  onOpenFile: (relPath: string) => void
}

const STORAGE_KEY = 'draglass.fileTree.expanded.v1'

function loadExpandedFromStorage(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set([''])
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set([''])
    const next = new Set<string>([''])
    for (const v of parsed) {
      if (typeof v === 'string') next.add(v)
    }
    return next
  } catch {
    return new Set([''])
  }
}

function saveExpandedToStorage(expanded: Set<string>) {
  const payload = Array.from(expanded).filter((p) => p !== '')
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

type FolderNode = {
  type: 'folder'
  name: string
  path: string
  children: TreeNode[]
}

type FileNode = {
  type: 'file'
  name: string
  relPath: string
}

type TreeNode = FolderNode | FileNode

type FolderBuilder = {
  name: string
  path: string
  folders: Map<string, FolderBuilder>
  files: Map<string, FileNode>
}

function isMarkdownPath(relPath: string): boolean {
  const lower = relPath.toLowerCase()
  return lower.endsWith('.md') || lower.endsWith('.markdown')
}

function displayLabelForFile(relPath: string): string {
  return isMarkdownPath(relPath) ? fileStem(relPath) : relPath.split('/').pop() ?? relPath
}

function buildTree(files: NoteEntry[]): FolderNode {
  const root: FolderBuilder = {
    name: '',
    path: '',
    folders: new Map(),
    files: new Map(),
  }

  for (const f of files) {
    const parts = f.rel_path.split('/').filter(Boolean)
    if (parts.length === 0) continue

    let cursor = root
    for (let i = 0; i < parts.length - 1; i++) {
      const seg = parts[i]
      const nextPath = cursor.path ? `${cursor.path}/${seg}` : seg
      let next = cursor.folders.get(seg)
      if (!next) {
        next = { name: seg, path: nextPath, folders: new Map(), files: new Map() }
        cursor.folders.set(seg, next)
      }
      cursor = next
    }

    const fileName = parts[parts.length - 1]
    const relPath = parts.join('/')
    cursor.files.set(relPath, {
      type: 'file',
      name: displayLabelForFile(relPath) || fileName,
      relPath,
    })
  }

  const toNode = (folder: FolderBuilder): FolderNode => {
    const children: TreeNode[] = []

    const folderNodes = Array.from(folder.folders.values())
      .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
      .map(toNode)

    const fileNodes = Array.from(folder.files.values()).sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
    )

    children.push(...folderNodes)
    children.push(...fileNodes)

    return { type: 'folder', name: folder.name, path: folder.path, children }
  }

  return toNode(root)
}

export function FileTree({ files, activeRelPath, rememberExpanded, onOpenFile }: FileTreeProps) {
  const tree = useMemo(() => buildTree(files), [files])
  const [expanded, setExpanded] = useState<Set<string>>(() =>
    rememberExpanded ? loadExpandedFromStorage() : new Set(['']),
  )

  useEffect(() => {
    if (!rememberExpanded) return
    saveExpandedToStorage(expanded)
  }, [expanded, rememberExpanded])

  useEffect(() => {
    if (rememberExpanded) {
      setExpanded(loadExpandedFromStorage())
      return
    }

    setExpanded(new Set(['']))
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }, [rememberExpanded])

  const toggleFolder = (folderPath: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.add('')
      if (next.has(folderPath)) next.delete(folderPath)
      else next.add(folderPath)
      return next
    })
  }

  const renderNode = (node: TreeNode, depth: number): React.ReactNode => {
    if (node.type === 'folder') {
      if (node.path !== '' && node.children.length === 0) return null

      const isOpen = node.path === '' ? true : expanded.has(node.path)
      const caret = node.path === '' ? '' : isOpen ? '▾' : '▸'

      return (
        <div key={node.path || '__root'} className="fileTreeNode">
          {node.path !== '' ? (
            <button
              type="button"
              className="folderItem"
              style={{ paddingLeft: 10 + depth * 14 }}
              onClick={() => toggleFolder(node.path)}
              aria-expanded={isOpen}
            >
              <span className="caret">{caret}</span>
              <span className="label">{node.name}</span>
            </button>
          ) : null}

          {isOpen ? (
            <div className="fileTreeChildren">
              {node.children.map((c) => renderNode(c, node.path === '' ? depth : depth + 1))}
            </div>
          ) : null}
        </div>
      )
    }

    const isActive = node.relPath === activeRelPath
    return (
      <div key={node.relPath} className="fileTreeNode">
        <button
          type="button"
          className={isActive ? 'fileItem active' : 'fileItem'}
          style={{ paddingLeft: 10 + depth * 14 }}
          onClick={() => onOpenFile(node.relPath)}
        >
          {node.name}
        </button>
      </div>
    )
  }

  const rootChildren = tree.children
  return <div className="fileTree">{rootChildren.map((c) => renderNode(c, 0))}</div>
}

export default FileTree
