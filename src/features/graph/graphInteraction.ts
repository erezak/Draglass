import type { SimulationNode } from './graphTypes'

export function pickNodeAtWorldPoint(nodes: SimulationNode[], worldX: number, worldY: number, nodeSize: number): SimulationNode | null {
  for (let i = nodes.length - 1; i >= 0; i -= 1) {
    const node = nodes[i]
    const degreeScale = Math.log2(node.degreeIn + 2) * 0.5
    const radius = nodeSize + degreeScale * 2
    const dx = worldX - node.x
    const dy = worldY - node.y
    if (dx * dx + dy * dy <= radius * radius) return node
  }
  return null
}
