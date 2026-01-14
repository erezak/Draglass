import { execFileSync } from 'node:child_process'

const start = Number(process.env.DRAGLASS_PORT_START ?? 5173)
const end = Number(process.env.DRAGLASS_PORT_END ?? 5190)

function listPids(port) {
  try {
    const out = execFileSync('lsof', ['-ti', `tcp:${port}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    if (!out) return []
    return out
      .split(/\s+/)
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n) && n > 0)
  } catch {
    return []
  }
}

function killPid(pid) {
  try {
    process.kill(pid, 'SIGTERM')
    return true
  } catch {
    return false
  }
}

if (process.platform === 'win32') {
  console.error('dev:kill-ports is currently supported on macOS/Linux only.')
  process.exit(1)
}

let killed = 0
for (let port = start; port <= end; port++) {
  const pids = listPids(port)
  for (const pid of pids) {
    if (killPid(pid)) {
      killed++
      console.log(`killed pid ${pid} (port :${port})`)
    }
  }
}

if (killed === 0) {
  console.log(`No listeners found on ports ${start}-${end}.`)
}
