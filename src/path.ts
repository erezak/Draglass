export function fileStem(path: string): string {
  const fileName = path.split('/').pop() ?? path
  // Handle compound extensions like .excalidraw.md
  const compoundMatch = fileName.match(/^(.+)\.excalidraw\.md$/i)
  if (compoundMatch) return compoundMatch[1]
  const lastDot = fileName.lastIndexOf('.')
  if (lastDot <= 0) return fileName
  return fileName.slice(0, lastDot)
}
