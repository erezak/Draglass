import { useCallback, useEffect, useRef, useState } from 'react'

import { GraphCanvas } from './GraphCanvas'
import { GraphContextMenu } from './GraphContextMenu'
import { GraphHeader } from './GraphHeader'
import { GraphSettings } from './GraphSettings'
import { useGraph } from './useGraph'
import { useGraphSettings } from './useGraphSettings'

type GraphViewProps = {
  vaultPath: string | null
  activeRelPath: string | null
  showHidden: boolean
  theme: 'dark' | 'light'
  onOpenNote: (relPath: string) => void
}

export function GraphView({
  vaultPath,
  activeRelPath,
  showHidden,
  theme,
  onOpenNote,
}: GraphViewProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [animationProgress, setAnimationProgress] = useState(1)
  const [contextMenu, setContextMenu] = useState<{
    nodeId: string
    x: number
    y: number
  } | null>(null)

  const animationRef = useRef<number | null>(null)

  const {
    settings,
    setScope,
    setLocalDepth,
    setForces,
    setDisplay,
    setFilters,
    addGroup,
    removeGroup,
    updateGroup,
  } = useGraphSettings()

  const {
    filteredNodes,
    filteredEdges,
    isLoading,
    selectedNodeId,
    hoveredNodeId,
    activeNodeId,
    setSelectedNodeId,
    setHoveredNodeId,
    refresh,
  } = useGraph({
    vaultPath,
    showHidden,
    activeRelPath,
    scope: settings.scope,
    localDepth: settings.localDepth,
    filters: settings.filters,
    onError: (msg) => console.error('Graph error:', msg),
  })

  // Handle opening a note from graph
  const handleNodeClick = useCallback(
    (nodeId: string) => {
      // Find the node to get its relPath
      const node = filteredNodes.find((n) => n.id === nodeId)
      if (node) {
        onOpenNote(node.relPath)
      }
      setSelectedNodeId(nodeId)
    },
    [filteredNodes, onOpenNote, setSelectedNodeId],
  )

  const handleNodeRightClick = useCallback(
    (nodeId: string, x: number, y: number) => {
      setContextMenu({ nodeId, x, y })
    },
    [],
  )

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  const handleContextMenuOpen = useCallback(() => {
    if (!contextMenu) return
    const node = filteredNodes.find((n) => n.id === contextMenu.nodeId)
    if (node) {
      onOpenNote(node.relPath)
    }
    setContextMenu(null)
  }, [contextMenu, filteredNodes, onOpenNote])

  const handleContextMenuCopyPath = useCallback(() => {
    // Path is copied in the context menu component
  }, [])

  const handleBackgroundClick = useCallback(() => {
    setSelectedNodeId(null)
    setContextMenu(null)
  }, [setSelectedNodeId])

  const handleToggleSettings = useCallback(() => {
    setSettingsOpen((prev) => !prev)
  }, [])

  const handleSearchChange = useCallback(
    (query: string) => {
      setFilters({ searchQuery: query })
    },
    [setFilters],
  )

  // Animation logic
  const handleToggleAnimation = useCallback(() => {
    if (animating) {
      // Stop animation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      setAnimating(false)
      setAnimationProgress(1)
    } else {
      // Start animation
      setAnimating(true)
      setAnimationProgress(0)

      const startTime = Date.now()
      const duration = 10000 // 10 seconds for full animation

      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(1, elapsed / duration)
        setAnimationProgress(progress)

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate)
        } else {
          setAnimating(false)
          animationRef.current = null
        }
      }

      animationRef.current = requestAnimationFrame(animate)
    }
  }, [animating])

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  // Get context menu node info
  const contextMenuNode = contextMenu
    ? filteredNodes.find((n) => n.id === contextMenu.nodeId)
    : null

  if (!vaultPath) {
    return (
      <div className="graphViewContainer">
        <div className="graphEmptyState">
          <div className="graphEmptyTitle">No vault selected</div>
          <div className="graphEmptyBody">Select a vault to view its graph.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="graphViewContainer">
      <GraphHeader
        scope={settings.scope}
        isLoading={isLoading}
        searchQuery={settings.filters.searchQuery}
        onSearchChange={handleSearchChange}
        onScopeChange={setScope}
        onRefresh={refresh}
        onToggleSettings={handleToggleSettings}
      />

      <div className="graphBody">
        {isLoading && filteredNodes.length === 0 ? (
          <div className="graphLoadingState">
            <div className="graphLoadingSpinner" />
            <div>Building graph…</div>
          </div>
        ) : filteredNodes.length === 0 ? (
          <div className="graphEmptyState">
            <div className="graphEmptyTitle">No nodes to display</div>
            <div className="graphEmptyBody">
              {settings.scope === 'local' && !activeNodeId
                ? 'Open a note to see its local graph.'
                : 'No notes match the current filters.'}
            </div>
          </div>
        ) : (
          <GraphCanvas
            nodes={filteredNodes}
            edges={filteredEdges}
            groups={settings.groups}
            forces={settings.forces}
            display={settings.display}
            theme={theme}
            activeNodeId={activeNodeId}
            selectedNodeId={selectedNodeId}
            hoveredNodeId={hoveredNodeId}
            animating={animating}
            animationProgress={animationProgress}
            onNodeClick={handleNodeClick}
            onNodeRightClick={handleNodeRightClick}
            onNodeHover={setHoveredNodeId}
            onBackgroundClick={handleBackgroundClick}
          />
        )}

        <GraphSettings
          open={settingsOpen}
          scope={settings.scope}
          localDepth={settings.localDepth}
          forces={settings.forces}
          display={settings.display}
          filters={settings.filters}
          groups={settings.groups}
          animating={animating}
          onLocalDepthChange={setLocalDepth}
          onForcesChange={setForces}
          onDisplayChange={setDisplay}
          onFiltersChange={setFilters}
          onAddGroup={addGroup}
          onRemoveGroup={removeGroup}
          onUpdateGroup={updateGroup}
          onToggleAnimation={handleToggleAnimation}
          onClose={() => setSettingsOpen(false)}
        />
      </div>

      {contextMenu && contextMenuNode && (
        <GraphContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeTitle={contextMenuNode.title}
          nodeRelPath={contextMenuNode.relPath}
          onOpen={handleContextMenuOpen}
          onCopyPath={handleContextMenuCopyPath}
          onClose={handleCloseContextMenu}
        />
      )}
    </div>
  )
}
