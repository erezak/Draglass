import { useCallback, useEffect, useRef, useState } from 'react'

import { buildGraph } from '../../tauri'
import type { GraphData, GraphEdge, GraphFilters, GraphNode, GraphScope } from './graphTypes'

type UseGraphArgs = {
  vaultPath: string | null
  showHidden: boolean
  activeRelPath: string | null
  scope: GraphScope
  localDepth: number
  filters: GraphFilters
  onError: (message: string) => void
}

export type UseGraphResult = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  filteredNodes: GraphNode[]
  filteredEdges: GraphEdge[]
  isLoading: boolean
  selectedNodeId: string | null
  hoveredNodeId: string | null
  activeNodeId: string | null
  setSelectedNodeId: (id: string | null) => void
  setHoveredNodeId: (id: string | null) => void
  refresh: () => Promise<void>
}

/** Compute local subgraph centered on a node up to given depth */
function computeLocalGraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
  centerId: string,
  depth: number,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  if (!centerId || depth < 1) {
    return { nodes: [], edges: [] }
  }

  const nodeSet = new Set(nodes.map((n) => n.id))
  if (!nodeSet.has(centerId)) {
    return { nodes: [], edges: [] }
  }

  const includedIds = new Set<string>([centerId])

  // Build adjacency for both directions
  const outgoing = new Map<string, Set<string>>()
  const incoming = new Map<string, Set<string>>()

  for (const edge of edges) {
    if (!outgoing.has(edge.sourceId)) outgoing.set(edge.sourceId, new Set())
    outgoing.get(edge.sourceId)!.add(edge.targetId)

    if (!incoming.has(edge.targetId)) incoming.set(edge.targetId, new Set())
    incoming.get(edge.targetId)!.add(edge.sourceId)
  }

  // BFS to find neighbors up to depth
  let frontier = new Set<string>([centerId])
  for (let d = 0; d < depth; d++) {
    const nextFrontier = new Set<string>()
    for (const id of frontier) {
      // Outgoing neighbors
      const out = outgoing.get(id)
      if (out) {
        for (const neighbor of out) {
          if (!includedIds.has(neighbor)) {
            includedIds.add(neighbor)
            nextFrontier.add(neighbor)
          }
        }
      }
      // Incoming neighbors
      const inc = incoming.get(id)
      if (inc) {
        for (const neighbor of inc) {
          if (!includedIds.has(neighbor)) {
            includedIds.add(neighbor)
            nextFrontier.add(neighbor)
          }
        }
      }
    }
    frontier = nextFrontier
    if (frontier.size === 0) break
  }

  const localNodes = nodes.filter((n) => includedIds.has(n.id))
  const localEdges = edges.filter(
    (e) => includedIds.has(e.sourceId) && includedIds.has(e.targetId),
  )

  return { nodes: localNodes, edges: localEdges }
}

/** Apply search and orphan filters */
function applyFilters(
  nodes: GraphNode[],
  edges: GraphEdge[],
  filters: GraphFilters,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const query = filters.searchQuery.toLowerCase().trim()

  const filteredNodes = nodes.filter((node) => {
    // Search filter
    if (query) {
      const matchesTitle = node.title.toLowerCase().includes(query)
      const matchesPath = node.relPath.toLowerCase().includes(query)
      if (!matchesTitle && !matchesPath) return false
    }

    // Orphan filter
    if (!filters.showOrphans) {
      const totalDegree = node.degreeIn + node.degreeOut
      if (totalDegree === 0) return false
    }

    return true
  })

  const nodeIds = new Set(filteredNodes.map((n) => n.id))
  const filteredEdges = edges.filter(
    (e) => nodeIds.has(e.sourceId) && nodeIds.has(e.targetId),
  )

  return { nodes: filteredNodes, edges: filteredEdges }
}

export function useGraph({
  vaultPath,
  showHidden,
  activeRelPath,
  scope,
  localDepth,
  filters,
  onError,
}: UseGraphArgs): UseGraphResult {
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)

  const requestIdRef = useRef(0)
  // Use ref for onError to avoid causing refresh to change on every render
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  // Compute active node id from activeRelPath
  const activeNodeId = activeRelPath
    ? activeRelPath
        .replace(/\.md$/i, '')
        .replace(/\.markdown$/i, '')
        .toLowerCase()
    : null

  const refresh = useCallback(async () => {
    if (!vaultPath) {
      setNodes([])
      setEdges([])
      setIsLoading(false)
      return
    }

    const requestId = ++requestIdRef.current
    setIsLoading(true)

    try {
      const data: GraphData = await buildGraph(vaultPath, { showHidden })

      if (requestIdRef.current === requestId) {
        setNodes(data.nodes)
        setEdges(data.edges)
      }
    } catch (e) {
      console.error('[Graph] buildGraph error:', e)
      if (requestIdRef.current === requestId) {
        onErrorRef.current(String(e))
        setNodes([])
        setEdges([])
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoading(false)
      }
    }
  }, [vaultPath, showHidden])

  // Refresh when vault or showHidden changes
  useEffect(() => {
    void refresh()
  }, [refresh])

  // Compute filtered nodes and edges based on scope and filters
  let scopedNodes = nodes
  let scopedEdges = edges

  if (scope === 'local' && activeNodeId) {
    const local = computeLocalGraph(nodes, edges, activeNodeId, localDepth)
    scopedNodes = local.nodes
    scopedEdges = local.edges
  }

  const { nodes: filteredNodes, edges: filteredEdges } = applyFilters(
    scopedNodes,
    scopedEdges,
    filters,
  )

  return {
    nodes,
    edges,
    filteredNodes,
    filteredEdges,
    isLoading,
    selectedNodeId,
    hoveredNodeId,
    activeNodeId,
    setSelectedNodeId,
    setHoveredNodeId,
    refresh,
  }
}
