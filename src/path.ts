export function fileStem(path: string): string {
  const fileName = path.split('/').pop() ?? path
  const lastDot = fileName.lastIndexOf('.')
  if (lastDot <= 0) return fileName
  return fileName.slice(0, lastDot)
}
