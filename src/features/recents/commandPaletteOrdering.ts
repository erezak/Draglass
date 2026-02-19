type CommandLike = {
  id: string
  label: string
}

export function orderCommandsByMru<T extends CommandLike>(
  commands: T[],
  recentCommandIds: string[],
  mruEnabled: boolean,
): T[] {
  const alphabetical = [...commands].sort((a, b) => a.label.localeCompare(b.label))
  if (!mruEnabled) return alphabetical

  const byId = new Map(alphabetical.map((cmd) => [cmd.id, cmd] as const))
  const recent: T[] = []
  for (const commandId of recentCommandIds) {
    const cmd = byId.get(commandId)
    if (!cmd) continue
    recent.push(cmd)
    byId.delete(commandId)
  }

  return [...recent, ...alphabetical.filter((cmd) => byId.has(cmd.id))]
}
