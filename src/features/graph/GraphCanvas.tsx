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
  extensions,
  ResizePlugin,
  TickerPlugin,
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
import { movedBeyondThreshold, pickNodeAtWorldPoint } from './graphInteraction'

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
  onRenderError?: (message: string | null) => void
}

let pixiPluginsRegistered = false

/** Multiplier applied to nodeSize when detecting hover (larger than drag hit area). */
const HOVER_HIT_AREA_MULTIPLIER = 1.5

function ensurePixiPluginsRegistered() {
  if (pixiPluginsRegistered) return
  extensions.remove(ResizePlugin)
  extensions.add(TickerPlugin)
  pixiPluginsRegistered = true
}

// Theme colors – tuned to match Obsidian MD's graph view aesthetic
const THEME_COLORS = {
  dark: {
    background: 0x1a1a1a,
    node: 0x7f6df2,
    nodeStroke: 0x6358d0,
    nodeActive: 0xffba28,
    nodeSelected: 0xe06c75,
    nodeHovered: 0xa78bfa,
    edge: 0x3d3d5c,
    edgeHighlight: 0x9480e2,
    text: 0xdcddde,
    textMuted: 0x555577,
  },
  light: {
    background: 0xfafafa,
    node: 0x7f6df2,
    nodeStroke: 0x6358d0,
    nodeActive: 0xe09020,
    nodeSelected: 0xe06c75,
    nodeHovered: 0x9b87f5,
    edge: 0xc4c4c4,
    edgeHighlight: 0x7f6df2,
    text: 0x333333,
    textMuted: 0x999999,
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
  onRenderError,
}: GraphCanvasProps) {
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
  const nodeDragRef = useRef<{ active: boolean; node: SimulationNode | null; startX: number; startY: number; moved: boolean }>({
    active: false,
    node: null,
    startX: 0,
    startY: 0,
    moved: false,
  })
  const renderFnRef = useRef<(() => void) | null>(null)
  const initialBackgroundRef = useRef<number | null>(null)
  const hoveredNodeIdRef = useRef<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  // Use refs for callbacks to avoid effect re-runs
  const onNodeClickRef = useRef(onNodeClick)
  const onNodeRightClickRef = useRef(onNodeRightClick)
  const onRenderErrorRef = useRef(onRenderError)
  const onNodeHoverRef = useRef(_onNodeHover)

  const animatingRef = useRef(animating)
  const animationProgressRef = useRef(animationProgress)
  const displayRef = useRef(display)

  useEffect(() => {
    onNodeClickRef.current = onNodeClick
    onNodeRightClickRef.current = onNodeRightClick
    onRenderErrorRef.current = onRenderError
    onNodeHoverRef.current = _onNodeHover
    animatingRef.current = animating
    animationProgressRef.current = animationProgress
    displayRef.current = display
    hoveredNodeIdRef.current = _hoveredNodeId
  })

  const colors = THEME_COLORS[theme]

  if (initialBackgroundRef.current === null) {
    initialBackgroundRef.current = colors.background
  }

  const reportRenderError = useCallback((message: string | null) => {
    onRenderErrorRef.current?.(message)
  }, [])

  const isWebglAvailable = (): boolean => {
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      return Boolean(gl)
    } catch {
      return false
    }
  }

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
      ensurePixiPluginsRegistered()
      reportRenderError(null)
      // Wait for container to have dimensions
      const container = containerRef.current!
      const rect = container.getBoundingClientRect()
      
      if (rect.width === 0 || rect.height === 0) {
        if (!cancelled) setTimeout(() => initApp(), 100)
        return
      }
      
      const app = new Application()

      const webglAvailable = isWebglAvailable()
      try {
        await app.init({
          background: initialBackgroundRef.current ?? colors.background,
          width: rect.width,
          height: rect.height,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        const suffix = webglAvailable ? '' : ' (WebGL unavailable)'
        reportRenderError(`Pixi init failed: ${message}${suffix}`)
        return
      }

      // Stop the default ticker; render only on explicit updates.
      if (app.ticker) {
        app.ticker.stop()
        app.ticker.autoStart = false
      }

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

    initApp().catch(err => {
      const message = err instanceof Error ? err.message : String(err)
      reportRenderError(`Pixi init failed: ${message}`)
      console.error('[GraphCanvas] Init error:', err)
    })

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
  }, [])

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
    const startTime = Date.now()
    const maxSimMs = 2000
    const scheduleRender = () => {
      if (animationId !== null) return
      animationId = requestAnimationFrame(() => {
        animationId = null
        // Call render function via ref
        renderFnRef.current?.()
      })
    }
    const stopSimulation = () => {
      simulation.stop()
      simulation.on('tick', null)
      simulation.on('end', null)
      renderFnRef.current?.()
    }
    const handleTick = () => {
      scheduleRender()
      const elapsed = Date.now() - startTime
      if (simulation.alpha() <= 0.01 || elapsed >= maxSimMs) {
        stopSimulation()
      }
    }
    simulation.on('tick', handleTick)
    simulation.on('end', () => {
      stopSimulation()
    })

    return () => {
      simulation.stop()
      if (animationId !== null) cancelAnimationFrame(animationId)
      simulation.on('tick', null)
      simulation.on('end', null)
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
    const currentDisplay = displayRef.current
    const currentAnimating = animatingRef.current
    const currentAnimationProgress = animationProgressRef.current

    // Calculate which nodes are visible in animation
    const visibleNodeIds = new Set<string>()
    if (currentAnimating && currentAnimationProgress < 1) {
      const sortedNodes = [...simNodes].sort((a, b) => {
        const aTime = a.createdAt ?? a.modifiedAt ?? 0
        const bTime = b.createdAt ?? b.modifiedAt ?? 0
        return aTime - bTime
      })
      const visibleCount = Math.max(1, Math.floor(sortedNodes.length * currentAnimationProgress))
      for (let i = 0; i < visibleCount; i++) {
        visibleNodeIds.add(sortedNodes[i].id)
      }
    } else {
      simNodes.forEach((n) => visibleNodeIds.add(n.id))
    }

    // Hover state – build connected-node set for highlight/dim logic
    const currentHoveredId = hoveredNodeIdRef.current
    const hasHover = currentHoveredId !== null
    const connectedIds = new Set<string>()

    if (hasHover) {
      connectedIds.add(currentHoveredId!)
      for (const edge of simEdges) {
        const srcId = typeof edge.source === 'string' ? edge.source : (edge.source as SimulationNode).id
        const tgtId = typeof edge.target === 'string' ? edge.target : (edge.target as SimulationNode).id
        if (srcId === currentHoveredId || tgtId === currentHoveredId) {
          connectedIds.add(srcId)
          connectedIds.add(tgtId)
        }
      }
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

      const isConnectedEdge = !hasHover || connectedIds.has(source.id) || connectedIds.has(target.id)
      const edgeColor = hasHover && isConnectedEdge ? colors.edgeHighlight : colors.edge
      const edgeAlpha = hasHover ? (isConnectedEdge ? 0.85 : 0.06) : 0.6

      edgeGraphics.moveTo(sx, sy)
      edgeGraphics.lineTo(tx, ty)
      edgeGraphics.stroke({ width: currentDisplay.linkThickness, color: edgeColor, alpha: edgeAlpha })

      // Draw arrows if enabled
      if (currentDisplay.showArrows) {
        const angle = Math.atan2(ty - sy, tx - sx)
        const arrowSize = 6 * viewport.scale
        const arrowX = tx - Math.cos(angle) * (currentDisplay.nodeSize * viewport.scale + 4)
        const arrowY = ty - Math.sin(angle) * (currentDisplay.nodeSize * viewport.scale + 4)

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
        edgeGraphics.stroke({ width: currentDisplay.linkThickness, color: edgeColor, alpha: edgeAlpha })
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
      const baseRadius = currentDisplay.nodeSize
      const degreeScale = Math.log2(node.degreeIn + 2) * 0.5
      const radius = (baseRadius + degreeScale * 2) * viewport.scale

      sprite.clear()
      sprite.position.set(x, y)

      // Hover-based dimming: unconnected nodes fade out like Obsidian
      const isConnectedNode = !hasHover || connectedIds.has(node.id)
      sprite.alpha = hasHover ? (isConnectedNode ? 1.0 : 0.15) : 1.0

      // Determine node color and style
      let nodeColor = getNodeColor(node)
      let strokeColor = colors.nodeStroke
      let strokeWidth = 1

      if (node.id === activeNodeId) {
        nodeColor = colors.nodeActive
        strokeWidth = 2
      }
      if (node.id === currentHoveredId) {
        nodeColor = colors.nodeHovered
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

      // Apply text fade threshold based on zoom, then dim if unconnected
      const labelAlpha = viewport.scale >= currentDisplay.textFadeThreshold ? 1 : viewport.scale / currentDisplay.textFadeThreshold
      label.alpha = hasHover ? (isConnectedNode ? labelAlpha : 0.05) : labelAlpha
      label.visible = visible && label.alpha > 0.05
    }

    // Explicit render since the Pixi ticker is stopped.
    app.renderer.render(app.stage)
  }, [
    selectedNodeId,
    activeNodeId,
    colors,
    getNodeColor,
  ])

  // Keep renderFnRef in sync with renderGraph
  useEffect(() => {
    renderFnRef.current = renderGraph
  }, [renderGraph])

  useEffect(() => {
    renderFnRef.current?.()
  }, [
    display.showArrows,
    display.textFadeThreshold,
    display.nodeSize,
    display.linkThickness,
    animating,
    animationProgress,
    selectedNodeId,
    activeNodeId,
    _hoveredNodeId,
    getNodeColor,
  ])

  useEffect(() => {
    if (appRef.current) {
      appRef.current.renderer.background.color = colors.background
    }

    if (labelSpritesRef.current.size > 0) {
      const updatedStyle = new TextStyle({
        fontSize: 11,
        fill: colors.text,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      })
      labelSpritesRef.current.forEach((label) => {
        label.style = updatedStyle
      })
    }

    renderFnRef.current?.()
  }, [colors.background, colors.text])

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

      const rect = container.getBoundingClientRect()
      const viewport = viewportRef.current
      const x = (e.clientX - rect.left - viewport.x) / viewport.scale
      const y = (e.clientY - rect.top - viewport.y) / viewport.scale

      const node = pickNodeAtWorldPoint(nodesRef.current, x, y, displayRef.current.nodeSize)
      if (node) {
        node.fx = node.x
        node.fy = node.y
        nodeDragRef.current = { active: true, node, startX: e.clientX, startY: e.clientY, moved: false }
        return
      }

      dragRef.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        viewX: viewportRef.current.x,
        viewY: viewportRef.current.y,
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (nodeDragRef.current.active && nodeDragRef.current.node) {
        if (!nodeDragRef.current.moved && movedBeyondThreshold(nodeDragRef.current.startX, nodeDragRef.current.startY, e.clientX, e.clientY)) {
          nodeDragRef.current.moved = true
        }

        const rect = container.getBoundingClientRect()
        const viewport = viewportRef.current
        const x = (e.clientX - rect.left - viewport.x) / viewport.scale
        const y = (e.clientY - rect.top - viewport.y) / viewport.scale
        const node = nodeDragRef.current.node
        node.fx = x
        node.fy = y
        node.x = x
        node.y = y
        simulationRef.current?.tick()
        renderGraph()
        return
      }

      if (!dragRef.current.active) return

      const dx = e.clientX - dragRef.current.startX
      const dy = e.clientY - dragRef.current.startY

      viewportRef.current.x = dragRef.current.viewX + dx
      viewportRef.current.y = dragRef.current.viewY + dy

      renderGraph()
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (nodeDragRef.current.active && nodeDragRef.current.node) {
        const draggedNode = nodeDragRef.current.node
        const moved = nodeDragRef.current.moved
          || movedBeyondThreshold(nodeDragRef.current.startX, nodeDragRef.current.startY, e.clientX, e.clientY)

        draggedNode.fx = null
        draggedNode.fy = null
        draggedNode.vx = 0
        draggedNode.vy = 0
        nodeDragRef.current = { active: false, node: null, startX: 0, startY: 0, moved: false }
        simulationRef.current?.tick()
        simulationRef.current?.stop()
        renderGraph()

        if (!moved) {
          const rect = container.getBoundingClientRect()
          const viewport = viewportRef.current
          const x = (e.clientX - rect.left - viewport.x) / viewport.scale
          const y = (e.clientY - rect.top - viewport.y) / viewport.scale
          const releasedNode = pickNodeAtWorldPoint(nodesRef.current, x, y, displayRef.current.nodeSize)
          if (releasedNode?.id === draggedNode.id) {
            onNodeClickRef.current(draggedNode.id)
          }
        }

        return
      }

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

  // Handle hover – detect which node the cursor is over and dim unconnected nodes/edges
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleMouseMove = (e: MouseEvent) => {
      // Skip hover detection while dragging
      if (nodeDragRef.current.active || dragRef.current.active) return

      const rect = container.getBoundingClientRect()
      const viewport = viewportRef.current
      const x = (e.clientX - rect.left - viewport.x) / viewport.scale
      const y = (e.clientY - rect.top - viewport.y) / viewport.scale

      const hovered = pickNodeAtWorldPoint(nodesRef.current, x, y, displayRef.current.nodeSize * HOVER_HIT_AREA_MULTIPLIER)
      const newId = hovered?.id ?? null

      if (newId !== hoveredNodeIdRef.current) {
        hoveredNodeIdRef.current = newId
        onNodeHoverRef.current(newId)
        renderGraph()
      }
    }

    const handleMouseLeave = () => {
      if (hoveredNodeIdRef.current !== null) {
        hoveredNodeIdRef.current = null
        onNodeHoverRef.current(null)
        renderGraph()
      }
    }

    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('mouseleave', handleMouseLeave)
    return () => {
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [renderGraph])

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
