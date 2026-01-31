import {
  forceCenter,
  forceLink,
  forceManyBody,
  forceSimulation,
} from 'd3-force'
import type {
  Simulation,
  SimulationLinkDatum,
} from 'd3-force'
import {
  Application,
  Container,
  Graphics,
  Text,
  TextStyle,
} from 'pixi.js'
import type { ContainerChild } from 'pixi.js'
import { useCallback, useEffect, useRef, useState } from 'react'

import type {
  GraphDisplay,
  GraphEdge,
  GraphForces,
  GraphGroup,
  GraphNode,
  SimulationEdge,
  SimulationNode,
} from './graphTypes'

type GraphCanvasProps = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  groups: GraphGroup[]
  forces: GraphForces
  display: GraphDisplay
  theme: 'dark' | 'light'
  activeNodeId: string | null
  selectedNodeId: string | null
  hoveredNodeId: string | null
  animating: boolean
  animationProgress: number
  onNodeClick: (nodeId: string) => void
  onNodeRightClick: (nodeId: string, x: number, y: number) => void
  onNodeHover: (nodeId: string | null) => void
  onBackgroundClick: () => void
}

// Theme colors
const THEME_COLORS = {
  dark: {
    background: 0x1a1b26,
    node: 0x7aa2ff,
    nodeStroke: 0x5a82df,
    nodeActive: 0xffd700,
    nodeSelected: 0xff7a7a,
    nodeHovered: 0xb8d4ff,
    edge: 0x4a5568,
    edgeHighlight: 0x7aa2ff,
    text: 0xc0caf5,
    textMuted: 0x565f89,
  },
  light: {
    background: 0xf8fafc,
    node: 0x3b4a9f,
    nodeStroke: 0x2a3980,
    nodeActive: 0xd97706,
    nodeSelected: 0xdc2626,
    nodeHovered: 0x5a6ad0,
    edge: 0xcbd5e1,
    edgeHighlight: 0x3b4a9f,
    text: 0x1e293b,
    textMuted: 0x94a3b8,
  },
}

function hexToNumber(hex: string): number {
  return parseInt(hex.replace('#', ''), 16)
}

export function GraphCanvas({
  nodes,
  edges,
  groups,
  forces,
  display,
  theme,
  activeNodeId,
  selectedNodeId,
  hoveredNodeId: _hoveredNodeId,
  animating,
  animationProgress,
  onNodeClick,
  onNodeRightClick,
  onNodeHover: _onNodeHover,
  onBackgroundClick,
}: GraphCanvasProps) {
  void _hoveredNodeId // reserved for future hover highlighting
  void _onNodeHover // reserved for future hover highlighting
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<Application | null>(null)
  const simulationRef = useRef<Simulation<SimulationNode, SimulationEdge> | null>(null)
  const nodesRef = useRef<SimulationNode[]>([])
  const edgesRef = useRef<SimulationEdge[]>([])
  const nodeSpritesRef = useRef<Map<string, Graphics>>(new Map())
  const labelSpritesRef = useRef<Map<string, Text>>(new Map())
  const edgeGraphicsRef = useRef<Graphics | null>(null)
  const highlightGraphicsRef = useRef<Graphics | null>(null)
  const nodeContainerRef = useRef<Container<ContainerChild> | null>(null)
  const labelContainerRef = useRef<Container<ContainerChild> | null>(null)
  const viewportRef = useRef({ x: 0, y: 0, scale: 1 })
  const dragRef = useRef<{ active: boolean; startX: number; startY: number; viewX: number; viewY: number }>({
    active: false,
    startX: 0,
    startY: 0,
    viewX: 0,
    viewY: 0,
  })
  const renderFnRef = useRef<(() => void) | null>(null)
  const [initialized, setInitialized] = useState(false)

  // Use refs for callbacks to avoid effect re-runs
  const onNodeClickRef = useRef(onNodeClick)
  onNodeClickRef.current = onNodeClick
  const onNodeRightClickRef = useRef(onNodeRightClick)
  onNodeRightClickRef.current = onNodeRightClick

  const colors = THEME_COLORS[theme]

  // Get node color based on groups (first match wins)
  const getNodeColor = useCallback(
    (node: GraphNode): number => {
      for (const group of groups) {
        if (!group.enabled || !group.query.trim()) continue
        const query = group.query.toLowerCase()
        if (
          node.title.toLowerCase().includes(query) ||
          node.relPath.toLowerCase().includes(query)
        ) {
          return hexToNumber(group.color)
        }
      }
      return colors.node
    },
    [groups, colors.node],
  )

  // Initialize PixiJS application
  useEffect(() => {
    if (!containerRef.current || appRef.current) return

    let cancelled = false

    const initApp = async () => {
      // Wait for container to have dimensions
      const container = containerRef.current!
      const rect = container.getBoundingClientRect()
      
      if (rect.width === 0 || rect.height === 0) {
        if (!cancelled) setTimeout(() => initApp(), 100)
        return
      }
      
      const app = new Application()
      
      await app.init({
        background: colors.background,
        width: rect.width,
        height: rect.height,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      })

      // Check if we were cancelled during async init
      if (cancelled) {
        app.destroy(true)
        return
      }
      container.appendChild(app.canvas)

      // Create layers
      const edgeGraphics = new Graphics()
      const highlightGraphics = new Graphics()
      const nodeContainer = new Container()
      const labelContainer = new Container()

      app.stage.addChild(edgeGraphics)
      app.stage.addChild(highlightGraphics)
      app.stage.addChild(nodeContainer)
      app.stage.addChild(labelContainer)

      edgeGraphicsRef.current = edgeGraphics
      highlightGraphicsRef.current = highlightGraphics
      nodeContainerRef.current = nodeContainer
      labelContainerRef.current = labelContainer
      appRef.current = app

      // Center viewport
      viewportRef.current = { x: rect.width / 2, y: rect.height / 2, scale: 1 }

      setInitialized(true)
    }

    initApp().catch(err => console.error('[GraphCanvas] Init error:', err))

    return () => {
      cancelled = true
      if (appRef.current) {
        appRef.current.destroy(true, { children: true })
        appRef.current = null
      }
      // Clear all refs
      edgeGraphicsRef.current = null
      highlightGraphicsRef.current = null
      nodeContainerRef.current = null
      labelContainerRef.current = null
      simulationRef.current?.stop()
      simulationRef.current = null
      setInitialized(false)
    }
  }, [colors.background])

  // Update background color when theme changes
  useEffect(() => {
    if (appRef.current) {
      appRef.current.renderer.background.color = colors.background
    }
  }, [colors.background])

  // Initialize simulation and nodes when data changes
  useEffect(() => {
    if (!initialized) return

    // Create simulation nodes
    const simNodes: SimulationNode[] = nodes.map((node, i) => {
      const angle = (i / nodes.length) * 2 * Math.PI
      const radius = Math.min(200, nodes.length * 5)
      return {
        ...node,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
      }
    })

    // Create node id mapping
    const nodeMap = new Map(simNodes.map((n) => [n.id, n]))

    // Create simulation edges
    const simEdges: SimulationEdge[] = edges
      .filter((e) => nodeMap.has(e.sourceId) && nodeMap.has(e.targetId))
      .map((e) => ({
        source: e.sourceId,
        target: e.targetId,
        count: e.count,
      }))

    nodesRef.current = simNodes
    edgesRef.current = simEdges

    // Stop existing simulation
    simulationRef.current?.stop()

    // Create new simulation
    const simulation = forceSimulation<SimulationNode, SimulationEdge>(simNodes)
      .force('center', forceCenter(0, 0).strength(forces.centerStrength))
      .force('charge', forceManyBody<SimulationNode>().strength(forces.repelStrength))
      .force(
        'link',
        forceLink<SimulationNode, SimulationLinkDatum<SimulationNode>>(simEdges as SimulationLinkDatum<SimulationNode>[])
          .id((d) => d.id)
          .strength(forces.linkStrength)
          .distance(forces.linkDistance),
      )
      .alphaDecay(0.02)

    simulationRef.current = simulation

    // Clear existing sprites
    nodeSpritesRef.current.forEach((sprite) => sprite.destroy())
    nodeSpritesRef.current.clear()
    labelSpritesRef.current.forEach((sprite) => sprite.destroy())
    labelSpritesRef.current.clear()

    const nodeContainer = nodeContainerRef.current!
    const labelContainer = labelContainerRef.current!
    nodeContainer.removeChildren()
    labelContainer.removeChildren()

    // Create node sprites
    const textStyle = new TextStyle({
      fontSize: 11,
      fill: colors.text,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    })

    for (const node of simNodes) {
      const graphics = new Graphics()
      graphics.eventMode = 'static'
      graphics.cursor = 'pointer'

      // Store node reference for hit testing
      ;(graphics as unknown as { nodeId: string }).nodeId = node.id

      graphics.on('pointerdown', (e) => {
        if (e.button === 2) {
          // Right click
          const globalPos = e.global
          onNodeRightClickRef.current(node.id, globalPos.x, globalPos.y)
        }
      })

      graphics.on('click', () => {
        onNodeClickRef.current(node.id)
      })

      nodeContainer.addChild(graphics)
      nodeSpritesRef.current.set(node.id, graphics)

      // Create label
      const label = new Text({ text: node.title, style: textStyle })
      label.anchor.set(0.5, 0)
      labelContainer.addChild(label)
      labelSpritesRef.current.set(node.id, label)
    }

    // Simulation tick handler - we manually trigger renders on tick via requestAnimationFrame
    // The actual render function is defined later and will re-render on each frame
    let animationId: number | null = null
    const scheduleRender = () => {
      if (animationId !== null) return
      animationId = requestAnimationFrame(() => {
        animationId = null
        // Call render function via ref
        renderFnRef.current?.()
      })
    }
    simulation.on('tick', scheduleRender)

    return () => {
      simulation.stop()
      if (animationId !== null) cancelAnimationFrame(animationId)
    }
  }, [
    initialized,
    nodes,
    edges,
    forces.centerStrength,
    forces.repelStrength,
    forces.linkStrength,
    forces.linkDistance,
    colors.text,
  ])

  // Update force parameters without recreating simulation
  // Use refs to track previous values and only restart when actually changed
  const prevForcesRef = useRef(forces)
  useEffect(() => {
    const simulation = simulationRef.current
    if (!simulation) return

    const prev = prevForcesRef.current
    const changed =
      prev.centerStrength !== forces.centerStrength ||
      prev.repelStrength !== forces.repelStrength ||
      prev.linkStrength !== forces.linkStrength ||
      prev.linkDistance !== forces.linkDistance

    if (!changed) return

    prevForcesRef.current = forces

    simulation
      .force('center', forceCenter(0, 0).strength(forces.centerStrength))
      .force('charge', forceManyBody<SimulationNode>().strength(forces.repelStrength))

    const linkForce = simulation.force('link') as ReturnType<typeof forceLink<SimulationNode, SimulationLinkDatum<SimulationNode>>> | undefined
    if (linkForce) {
      linkForce.strength(forces.linkStrength).distance(forces.linkDistance)
    }

    simulation.alpha(0.3).restart()
  }, [forces.centerStrength, forces.repelStrength, forces.linkStrength, forces.linkDistance])

  // Render function
  const renderGraph = useCallback(() => {
    const app = appRef.current
    const edgeGraphics = edgeGraphicsRef.current
    const highlightGraphics = highlightGraphicsRef.current
    const nodeContainer = nodeContainerRef.current
    const labelContainer = labelContainerRef.current
    if (!app || !edgeGraphics || !highlightGraphics || !nodeContainer || !labelContainer) {
      return
    }

    const viewport = viewportRef.current
    const simNodes = nodesRef.current
    const simEdges = edgesRef.current

    // Calculate which nodes are visible in animation
    const visibleNodeIds = new Set<string>()
    if (animating && animationProgress < 1) {
      const sortedNodes = [...simNodes].sort((a, b) => {
        const aTime = a.createdAt ?? a.modifiedAt ?? 0
        const bTime = b.createdAt ?? b.modifiedAt ?? 0
        return aTime - bTime
      })
      const visibleCount = Math.max(1, Math.floor(sortedNodes.length * animationProgress))
      for (let i = 0; i < visibleCount; i++) {
        visibleNodeIds.add(sortedNodes[i].id)
      }
    } else {
      simNodes.forEach((n) => visibleNodeIds.add(n.id))
    }

    // Clear edge graphics
    edgeGraphics.clear()
    highlightGraphics.clear()

    // Draw edges
    for (const edge of simEdges) {
      const source = typeof edge.source === 'string' 
        ? simNodes.find((n) => n.id === edge.source)
        : edge.source
      const target = typeof edge.target === 'string'
        ? simNodes.find((n) => n.id === edge.target)
        : edge.target

      if (!source || !target) continue
      if (!visibleNodeIds.has(source.id) || !visibleNodeIds.has(target.id)) continue

      const sx = source.x * viewport.scale + viewport.x
      const sy = source.y * viewport.scale + viewport.y
      const tx = target.x * viewport.scale + viewport.x
      const ty = target.y * viewport.scale + viewport.y

      const edgeColor = colors.edge
      const edgeAlpha = 0.6

      edgeGraphics.moveTo(sx, sy)
      edgeGraphics.lineTo(tx, ty)
      edgeGraphics.stroke({ width: display.linkThickness, color: edgeColor, alpha: edgeAlpha })

      // Draw arrows if enabled
      if (display.showArrows) {
        const angle = Math.atan2(ty - sy, tx - sx)
        const arrowSize = 6 * viewport.scale
        const arrowX = tx - Math.cos(angle) * (display.nodeSize * viewport.scale + 4)
        const arrowY = ty - Math.sin(angle) * (display.nodeSize * viewport.scale + 4)

        edgeGraphics.moveTo(arrowX, arrowY)
        edgeGraphics.lineTo(
          arrowX - Math.cos(angle - Math.PI / 6) * arrowSize,
          arrowY - Math.sin(angle - Math.PI / 6) * arrowSize,
        )
        edgeGraphics.moveTo(arrowX, arrowY)
        edgeGraphics.lineTo(
          arrowX - Math.cos(angle + Math.PI / 6) * arrowSize,
          arrowY - Math.sin(angle + Math.PI / 6) * arrowSize,
        )
        edgeGraphics.stroke({ width: display.linkThickness, color: edgeColor, alpha: edgeAlpha })
      }
    }

    // Draw nodes and labels
    for (const node of simNodes) {
      const sprite = nodeSpritesRef.current.get(node.id)
      const label = labelSpritesRef.current.get(node.id)
      if (!sprite || !label) continue

      const visible = visibleNodeIds.has(node.id)
      sprite.visible = visible
      label.visible = visible

      if (!visible) continue

      const x = node.x * viewport.scale + viewport.x
      const y = node.y * viewport.scale + viewport.y

      // Calculate node radius based on degree
      const baseRadius = display.nodeSize
      const degreeScale = Math.log2(node.degreeIn + 2) * 0.5
      const radius = (baseRadius + degreeScale * 2) * viewport.scale

      sprite.clear()
      sprite.position.set(x, y)

      // Determine node color and style
      let nodeColor = getNodeColor(node)
      let strokeColor = colors.nodeStroke
      let strokeWidth = 1

      if (node.id === activeNodeId) {
        nodeColor = colors.nodeActive
        strokeWidth = 2
      }
      if (node.id === selectedNodeId) {
        strokeColor = colors.nodeSelected
        strokeWidth = 3
      }

      sprite.circle(0, 0, radius)
      sprite.fill({ color: nodeColor, alpha: 1 })
      sprite.stroke({ width: strokeWidth, color: strokeColor, alpha: 1 })

      // Update label
      label.position.set(x, y + radius + 4)

      // Apply text fade threshold based on zoom
      const labelAlpha = viewport.scale >= display.textFadeThreshold ? 1 : viewport.scale / display.textFadeThreshold
      label.alpha = labelAlpha
      label.visible = visible && labelAlpha > 0.1
    }
  }, [
    selectedNodeId,
    activeNodeId,
    animating,
    animationProgress,
    display,
    colors,
    getNodeColor,
  ])

  // Keep renderFnRef in sync with renderGraph
  useEffect(() => {
    renderFnRef.current = renderGraph
  }, [renderGraph])

  // Re-render when display settings change
  useEffect(() => {
    renderGraph()
  }, [renderGraph])

  // Handle wheel zoom
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()

      const rect = container.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const viewport = viewportRef.current
      const oldScale = viewport.scale
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
      const newScale = Math.max(0.1, Math.min(5, oldScale * zoomFactor))

      // Zoom toward mouse position
      viewport.x = mouseX - ((mouseX - viewport.x) * newScale) / oldScale
      viewport.y = mouseY - ((mouseY - viewport.y) * newScale) / oldScale
      viewport.scale = newScale

      renderGraph()
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [renderGraph])

  // Handle pan
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleMouseDown = (e: MouseEvent) => {
      // Only pan on left click on background
      if (e.button !== 0) return

      // Check if clicking on a node
      const target = e.target as HTMLElement
      if (target !== container.querySelector('canvas')) return

      dragRef.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        viewX: viewportRef.current.x,
        viewY: viewportRef.current.y,
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current.active) return

      const dx = e.clientX - dragRef.current.startX
      const dy = e.clientY - dragRef.current.startY

      viewportRef.current.x = dragRef.current.viewX + dx
      viewportRef.current.y = dragRef.current.viewY + dy

      renderGraph()
    }

    const handleMouseUp = () => {
      if (dragRef.current.active) {
        const dx = Math.abs(viewportRef.current.x - dragRef.current.viewX)
        const dy = Math.abs(viewportRef.current.y - dragRef.current.viewY)

        // Only trigger click if didn't drag
        if (dx < 5 && dy < 5) {
          onBackgroundClick()
        }
      }
      dragRef.current.active = false
    }

    container.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      container.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [renderGraph, onBackgroundClick])

  // Handle keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      const panAmount = e.shiftKey ? 100 : 30
      const viewport = viewportRef.current

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          viewport.x += panAmount
          renderGraph()
          break
        case 'ArrowRight':
          e.preventDefault()
          viewport.x -= panAmount
          renderGraph()
          break
        case 'ArrowUp':
          e.preventDefault()
          viewport.y += panAmount
          renderGraph()
          break
        case 'ArrowDown':
          e.preventDefault()
          viewport.y -= panAmount
          renderGraph()
          break
        case '=':
        case '+':
          e.preventDefault()
          viewport.scale = Math.min(5, viewport.scale * 1.2)
          renderGraph()
          break
        case '-':
          e.preventDefault()
          viewport.scale = Math.max(0.1, viewport.scale / 1.2)
          renderGraph()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [renderGraph])

  // Disable context menu on canvas
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
    }

    container.addEventListener('contextmenu', handleContextMenu)
    return () => container.removeEventListener('contextmenu', handleContextMenu)
  }, [])

  return <div ref={containerRef} className="graphCanvas" />
}
