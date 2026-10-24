// Run from the repository root: node check-site.cjs
// Uses only Node built-ins; validates the static GitHub Pages files.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'docs'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,'IDs must be unique');
const pages=new Set([...html.matchAll(/<article[^>]*id="note-([^"]+)"/g)].map(m=>m[1]));assert.equal(pages.size,9);
for(const match of html.matchAll(/(?:href|src)="([^"]+)"/g)){const url=match[1];if(url.startsWith('#'))assert.ok(pages.has(url.slice(1))||ids.includes(url.slice(1)),`Missing page or heading: ${url}`);else if(!/^[a-z]+:/i.test(url))assert.ok(fs.existsSync(path.join(root,url)),`Missing local asset: ${url}`);}
assert.ok(!/contenteditable\s*=\s*["']?(?:true|plaintext-only)/i.test(html));assert.ok(!/<textarea/i.test(html));assert.ok(!/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket/.test(fs.readFileSync(path.join(root,'assets/site.js'),'utf8')),'The tour must not send requests');
for(const file of ['.nojekyll','404.html','robots.txt','sitemap.xml'])assert.ok(fs.existsSync(path.join(root,file)));
assert.ok(html.includes('© 2026 Erez Korn'));
console.log('Site checks passed: nine pages, unique IDs, resolved local links/assets, read-only notes, and GitHub Pages support.');
