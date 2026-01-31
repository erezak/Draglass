import { useCallback, useEffect, useRef } from 'react'

type GraphContextMenuProps = {
  x: number
  y: number
  nodeTitle: string
  nodeRelPath: string
  onOpen: () => void
  onCopyPath: () => void
  onClose: () => void
}

export function GraphContextMenu({
  x,
  y,
  nodeTitle,
  nodeRelPath,
  onOpen,
  onCopyPath,
  onClose,
}: GraphContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const handleOpen = useCallback(() => {
    onOpen()
    onClose()
  }, [onOpen, onClose])

  const handleCopyPath = useCallback(() => {
    navigator.clipboard.writeText(nodeRelPath).catch(() => {
      // Ignore clipboard errors
    })
    onCopyPath()
    onClose()
  }, [nodeRelPath, onCopyPath, onClose])

  return (
    <div
      ref={menuRef}
      className="graphContextMenu"
      style={{
        left: x,
        top: y,
      }}
    >
      <div className="graphContextMenuHeader">{nodeTitle}</div>
      <button type="button" className="graphContextMenuItem" onClick={handleOpen}>
        Open
      </button>
      <button type="button" className="graphContextMenuItem" onClick={handleCopyPath}>
        Copy path
      </button>
    </div>
  )
}
