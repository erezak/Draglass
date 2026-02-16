#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"
import ts from "typescript"

function loadTsModule(modulePath) {
  const sourcePath = path.resolve(modulePath)
  const source = fs.readFileSync(sourcePath, "utf8")

  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
    fileName: path.basename(modulePath),
  })

  const dataUrl = `data:text/javascript;base64,${Buffer.from(outputText, "utf8").toString("base64")}`
  return import(dataUrl)
}

async function main(){
  const args = process.argv.slice(2)
  if(args.length === 0){
    console.error("Usage: convert-wikilinks <file.md>")
    process.exit(2)
  }
  const file = args[0]
  const mod = await loadTsModule("src/wikilinks.ts")
  const input = fs.readFileSync(file, "utf8")
  const out = input.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (m,t,a)=>{
    const target = t.trim()
    const text = (a||t).trim()
    const rel = mod.targetToRelPath ? mod.targetToRelPath(target) : (target + ".md")
    return `[${text}](${rel})`
  })
  fs.writeFileSync(file, out, "utf8")
  console.log("Converted", file)
}

main().catch(e=>{console.error(e); process.exit(1)})
