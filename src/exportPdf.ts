const PRINT_CLEANUP_TIMEOUT_MS = 15_000
const PRINT_ROOT_ID = 'draglass-pdf-export-root'
const PRINT_STYLE_ID = 'draglass-pdf-export-style'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function buildPdfDocumentHtml(noteText: string, options: { title: string; includeTitle: boolean }): string {
  const heading = options.includeTitle
    ? `<h1 style="margin: 0 0 24px; font-size: 32px; line-height: 1.2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">${escapeHtml(options.title)}</h1>`
    : ''

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(options.title)}</title>
  <style>
    body {
      margin: 32px;
      color: #111827;
      background: #ffffff;
    }
    pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
      font-size: 13px;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  ${heading}
  <pre>${escapeHtml(noteText)}</pre>
</body>
</html>`
}

export function exportNoteAsPdf(noteText: string, options: { title: string; includeTitle: boolean }): void {
  if (!document.body) {
    throw new Error('Unable to start PDF export because the document is not ready.')
  }

  let cleanupTimeout: ReturnType<typeof window.setTimeout> | null = null
  const onAfterPrint = () => cleanup()
  const previousRoot = document.getElementById(PRINT_ROOT_ID)
  const previousStyle = document.getElementById(PRINT_STYLE_ID)
  previousRoot?.remove()
  previousStyle?.remove()

  const printRoot = document.createElement('div')
  printRoot.id = PRINT_ROOT_ID
  if (options.includeTitle) {
    const heading = document.createElement('h1')
    heading.textContent = options.title
    printRoot.appendChild(heading)
  }
  const pre = document.createElement('pre')
  pre.textContent = noteText
  printRoot.appendChild(pre)

  const printStyle = document.createElement('style')
  printStyle.id = PRINT_STYLE_ID
  printStyle.textContent = `
@media print {
  body * { visibility: hidden !important; }
  #${PRINT_ROOT_ID}, #${PRINT_ROOT_ID} * { visibility: visible !important; }
  #${PRINT_ROOT_ID} {
    position: fixed;
    inset: 0;
    padding: 32px;
    background: #fff;
    color: #111827;
  }
  #${PRINT_ROOT_ID} h1 {
    margin: 0 0 24px;
    font-size: 32px;
    line-height: 1.2;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  #${PRINT_ROOT_ID} pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
    font-size: 13px;
    line-height: 1.5;
  }
}`

  const cleanup = () => {
    window.removeEventListener('afterprint', onAfterPrint)
    if (cleanupTimeout !== null) {
      window.clearTimeout(cleanupTimeout)
      cleanupTimeout = null
    }
    printRoot.remove()
    printStyle.remove()
  }

  document.body.appendChild(printStyle)
  document.body.appendChild(printRoot)
  window.addEventListener('afterprint', onAfterPrint, { once: true })
  cleanupTimeout = window.setTimeout(cleanup, PRINT_CLEANUP_TIMEOUT_MS)
  window.print()
}
