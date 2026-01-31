/**
 * Graph data types for the Graph View feature.
 * Node identity uses normalized relPath for consistency with backlinks and quick switcher.
 */

export type GraphNode = {
  /** Stable identifier - normalized relative path without .md extension */
  id: string
  /** Display name (filename without extension) */
  title: string
  /** Relative path including folders */
  relPath: string
  /** Whether this file matches ignore rules (hidden unless showHidden) */
  isHidden: boolean
  /** Number of incoming links (backlinks count) */
  degreeIn: number
  /** Number of outgoing links */
  degreeOut: number
  /** File creation timestamp in milliseconds (best effort) */
  createdAt: number | null
  /** File modification timestamp in milliseconds */
  modifiedAt: number | null
}

export type GraphEdge = {
  /** Source node id (normalized relPath) */
  sourceId: string
  /** Target node id (normalized relPath) */
  targetId: string
  /** Number of times source links to target */
  count: number
}

export type GraphData = {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export type GraphOptions = {
  showHidden: boolean
}

/** Group for coloring nodes by query match */
export type GraphGroup = {
  id: string
  query: string
  color: string
  enabled: boolean
}

/** Force simulation parameters */
export type GraphForces = {
  centerStrength: number
  repelStrength: number
  linkStrength: number
  linkDistance: number
}

/** Display settings */
export type GraphDisplay = {
  showArrows: boolean
  textFadeThreshold: number
  nodeSize: number
  linkThickness: number
}

/** Filter settings */
export type GraphFilters = {
  searchQuery: string
  showOrphans: boolean
}

/** Graph view scope */
export type GraphScope = 'global' | 'local'

/** Complete graph settings */
export type GraphSettings = {
  scope: GraphScope
  localDepth: number
  forces: GraphForces
  display: GraphDisplay
  filters: GraphFilters
  groups: GraphGroup[]
}

export const DEFAULT_GRAPH_FORCES: GraphForces = {
  centerStrength: 0.3,
  repelStrength: -150,
  linkStrength: 0.3,
  linkDistance: 80,
}

export const DEFAULT_GRAPH_DISPLAY: GraphDisplay = {
  showArrows: false,
  textFadeThreshold: 0.5,
  nodeSize: 6,
  linkThickness: 1,
}

export const DEFAULT_GRAPH_FILTERS: GraphFilters = {
  searchQuery: '',
  showOrphans: true,
}

export const DEFAULT_GRAPH_SETTINGS: GraphSettings = {
  scope: 'global',
  localDepth: 1,
  forces: DEFAULT_GRAPH_FORCES,
  display: DEFAULT_GRAPH_DISPLAY,
  filters: DEFAULT_GRAPH_FILTERS,
  groups: [],
}

/** Runtime node with simulation position */
export type SimulationNode = GraphNode & {
  x: number
  y: number
  vx: number
  vy: number
  fx?: number | null
  fy?: number | null
}

/** Runtime edge for d3-force linking */
export type SimulationEdge = {
  source: SimulationNode | string
  target: SimulationNode | string
  count: number
}
