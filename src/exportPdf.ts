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
  <script>
    window.addEventListener('load', () => {
      window.print()
      window.addEventListener('afterprint', () => {
        window.close()
      }, { once: true })
    }, { once: true })
  </script>
</body>
</html>`
}

export function exportNoteAsPdf(noteText: string, options: { title: string; includeTitle: boolean }): void {
  const pdfWindow = window.open('', '_blank')
  if (!pdfWindow) {
    throw new Error('Unable to open export window')
  }

  pdfWindow.document.open()
  pdfWindow.document.write(buildPdfDocumentHtml(noteText, options))
  pdfWindow.document.close()
}
