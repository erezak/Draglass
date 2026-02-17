import type { SimulationNode } from './graphTypes'

const DEGREE_SCALE_OFFSET = 2
const DEGREE_SCALE_MULTIPLIER = 0.5
const DEGREE_RADIUS_MULTIPLIER = 2
const NODE_HIT_PADDING = 2

export const NODE_DRAG_THRESHOLD = 4

export function pickNodeAtWorldPoint(nodes: SimulationNode[], worldX: number, worldY: number, nodeSize: number): SimulationNode | null {
  for (let i = nodes.length - 1; i >= 0; i -= 1) {
    const node = nodes[i]
    const degreeScale = Math.log2(node.degreeIn + DEGREE_SCALE_OFFSET) * DEGREE_SCALE_MULTIPLIER
    const radius = nodeSize + degreeScale * DEGREE_RADIUS_MULTIPLIER + NODE_HIT_PADDING
    const dx = worldX - node.x
    const dy = worldY - node.y
    if (dx * dx + dy * dy <= radius * radius) return node
  }
  return null
}

export function movedBeyondThreshold(startX: number, startY: number, currentX: number, currentY: number): boolean {
  return Math.abs(currentX - startX) >= NODE_DRAG_THRESHOLD || Math.abs(currentY - startY) >= NODE_DRAG_THRESHOLD
}
