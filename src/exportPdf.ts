const PRINT_CLEANUP_TIMEOUT_MS = 15_000

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

  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.visibility = 'hidden'
  iframe.setAttribute('sandbox', 'allow-modals allow-same-origin')
  iframe.srcdoc = buildPdfDocumentHtml(noteText, options)

  let cleanupTimeout: ReturnType<typeof window.setTimeout> | null = null
  let printWindow: Window | null = null
  const onAfterPrint = () => cleanup()
  const cleanup = () => {
    if (printWindow) {
      printWindow.removeEventListener('afterprint', onAfterPrint)
      printWindow = null
    }
    if (cleanupTimeout !== null) {
      window.clearTimeout(cleanupTimeout)
      cleanupTimeout = null
    }
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe)
    }
  }

  iframe.addEventListener('load', () => {
    printWindow = iframe.contentWindow
    if (!printWindow) {
      cleanup()
      console.error('Unable to open PDF print context.')
      return
    }

    printWindow.addEventListener('afterprint', onAfterPrint, { once: true })
    cleanupTimeout = window.setTimeout(cleanup, PRINT_CLEANUP_TIMEOUT_MS)
    printWindow.focus()
    printWindow.print()
  }, { once: true })

  document.body.appendChild(iframe)
}
