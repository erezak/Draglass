function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function sanitizeFileName(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return 'note'
  return trimmed.replace(/[\\/:*?"<>|]/g, '-').slice(0, 120) || 'note'
}

export function buildHtmlDocument(noteText: string, options: { title: string; includeTitle: boolean }): string {
  const heading = options.includeTitle
    ? `<h1 style="margin: 0 0 24px; font-size: 32px; line-height: 1.2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">${escapeHtml(options.title)}</h1>`
    : ''

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
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

export function exportNoteAsHtmlFile(
  noteText: string,
  options: { title: string; includeTitle: boolean },
): void {
  const html = buildHtmlDocument(noteText, options)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${sanitizeFileName(options.title)}.html`
  anchor.rel = 'noopener'
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
