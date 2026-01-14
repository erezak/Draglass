import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const ROOT = process.cwd()

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function safeString(x) {
  return typeof x === 'string' && x.trim() ? x.trim() : null
}

function normalizeLicense(pkg) {
  const lic = pkg.license
  if (typeof lic === 'string') return lic
  if (typeof lic === 'object' && lic && typeof lic.type === 'string') return lic.type
  if (Array.isArray(pkg.licenses)) {
    const parts = pkg.licenses
      .map((l) => (typeof l === 'string' ? l : l && typeof l.type === 'string' ? l.type : null))
      .filter(Boolean)
    if (parts.length) return parts.join(', ')
  }
  return null
}

function normalizeRepository(pkg) {
  const repo = pkg.repository
  if (!repo) return null
  if (typeof repo === 'string') return repo
  if (typeof repo === 'object' && typeof repo.url === 'string') return repo.url
  return null
}

function listNodePackages() {
  const base = path.join(ROOT, 'node_modules', '.pnpm')
  const results = []
  if (!fs.existsSync(base)) return results

  // pnpm stores packages as: .pnpm/<name>@<ver>.../node_modules/<name>/package.json
  for (const entry of fs.readdirSync(base)) {
    const entryPath = path.join(base, entry)
    if (!fs.statSync(entryPath).isDirectory()) continue

    const nm = path.join(entryPath, 'node_modules')
    if (!fs.existsSync(nm)) continue

    // handle scoped + unscoped
    for (const top of fs.readdirSync(nm)) {
      if (top.startsWith('.')) continue
      const topPath = path.join(nm, top)
      if (!fs.statSync(topPath).isDirectory()) continue

      if (top.startsWith('@')) {
        for (const scoped of fs.readdirSync(topPath)) {
          const pkgJson = path.join(topPath, scoped, 'package.json')
          if (fs.existsSync(pkgJson)) results.push(pkgJson)
        }
      } else {
        const pkgJson = path.join(topPath, 'package.json')
        if (fs.existsSync(pkgJson)) results.push(pkgJson)
      }
    }
  }

  const map = new Map()
  for (const pkgJson of results) {
    try {
      const pkg = readJson(pkgJson)
      const name = safeString(pkg.name)
      const version = safeString(pkg.version)
      if (!name || !version) continue

      const key = `${name}@${version}`
      if (map.has(key)) continue

      map.set(key, {
        name,
        version,
        license: normalizeLicense(pkg) ?? 'UNKNOWN',
        repository: normalizeRepository(pkg) ?? null,
      })
    } catch {
      // ignore broken package.json
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    `${a.name}@${a.version}`.toLowerCase().localeCompare(`${b.name}@${b.version}`.toLowerCase()),
  )
}

function listRustPackages() {
  const lockPath = path.join(ROOT, 'src-tauri', 'Cargo.lock')
  if (!fs.existsSync(lockPath)) return []

  const cargoHome = process.env.CARGO_HOME
    ? path.resolve(process.env.CARGO_HOME)
    : path.join(os.homedir(), '.cargo')
  const registrySrc = path.join(cargoHome, 'registry', 'src')

  const lock = fs.readFileSync(lockPath, 'utf8')

  const packages = []
  const blocks = lock.split(/\n\[\[package\]\]\n/)
  for (const block of blocks) {
    const name = /\n?name\s*=\s*"([^"]+)"/.exec(block)?.[1]
    const version = /\nversion\s*=\s*"([^"]+)"/.exec(block)?.[1]
    const source = /\nsource\s*=\s*"([^"]+)"/.exec(block)?.[1]
    if (!name || !version) continue

    // Skip workspace/path packages (no source) and non-registry sources.
    if (!source || !source.startsWith('registry+')) continue

    packages.push({ name, version })
  }

  const seen = new Set()
  const results = []

  function findCrateCargoToml(name, version) {
    if (!fs.existsSync(registrySrc)) return null
    const needle = `${name}-${version}`
    for (const dir of fs.readdirSync(registrySrc)) {
      const hashDir = path.join(registrySrc, dir)
      if (!fs.statSync(hashDir).isDirectory()) continue
      const crateDir = path.join(hashDir, needle)
      const toml = path.join(crateDir, 'Cargo.toml')
      if (fs.existsSync(toml)) return toml
    }
    return null
  }

  function parseCargoToml(filePath) {
    const text = fs.readFileSync(filePath, 'utf8')
    const license =
      /^license\s*=\s*"([^"]+)"/m.exec(text)?.[1] ??
      /^license\s*=\s*'([^']+)'/m.exec(text)?.[1] ??
      null
    const repository =
      /^repository\s*=\s*"([^"]+)"/m.exec(text)?.[1] ??
      /^repository\s*=\s*'([^']+)'/m.exec(text)?.[1] ??
      null
    return { license, repository }
  }

  for (const p of packages) {
    const key = `${p.name}@${p.version}`
    if (seen.has(key)) continue
    seen.add(key)

    let license = 'UNKNOWN'
    let repository = null

    const tomlPath = findCrateCargoToml(p.name, p.version)
    if (tomlPath) {
      try {
        const parsed = parseCargoToml(tomlPath)
        if (parsed.license) license = parsed.license
        if (parsed.repository) repository = parsed.repository
      } catch {
        // ignore
      }
    }

    results.push({ name: p.name, version: p.version, license, repository })
  }

  return results.sort((a, b) =>
    `${a.name}@${a.version}`.toLowerCase().localeCompare(`${b.name}@${b.version}`.toLowerCase()),
  )
}

function mdEscape(text) {
  return String(text).replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

function makeTable(items) {
  return [
    '| Package | Version | License | Repository |',
    '|---|---:|---|---|',
    ...items.map((p) =>
      [
        mdEscape(p.name),
        mdEscape(p.version),
        mdEscape(p.license),
        mdEscape(p.repository ?? ''),
      ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'),
    ),
  ].join('\n')
}

function main() {
  const nodePkgs = listNodePackages()
  const rustPkgs = listRustPackages()

  const outPath = path.join(ROOT, 'THIRD_PARTY_LICENSES.md')
  const now = new Date().toISOString().slice(0, 10)

  const contents = `# Third-Party Licenses\n\nThis document lists third-party dependencies used by Draglass and their declared licenses.\n\nGenerated on ${now}.\n\n> Note: This is best-effort based on dependency metadata. JavaScript licenses come from package.json. Rust licenses are resolved from Cargo.lock and (when available) the local Cargo registry cache. UNKNOWN entries may require manual review.\n\n## JavaScript / TypeScript (pnpm)\n\n${makeTable(nodePkgs)}\n\n## Rust (Cargo / Tauri)\n\n${makeTable(rustPkgs)}\n`

  fs.writeFileSync(outPath, contents, 'utf8')
  console.log(`Wrote ${outPath}`)
  console.log(`JS packages: ${nodePkgs.length}`)
  console.log(`Rust packages: ${rustPkgs.length}`)
}

main()
