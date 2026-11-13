import type { ResultReport } from './resultReports'

// Build DOM nodes rather than HTML strings: result text is untrusted tenant data.
export function printResultReport(report: ResultReport): void {
  const frame = document.createElement('iframe')
  frame.title = 'Printable result report'
  frame.style.cssText = 'position:fixed;width:1px;height:1px;left:-10000px;top:0;border:0'
  document.body.appendChild(frame)
  const doc = frame.contentDocument
  const win = frame.contentWindow
  if (!doc || !win || typeof win.print !== 'function') {
    frame.remove()
    throw new Error('Printing is unavailable in this browser.')
  }
  doc.title = `BrandGuard - ${report.title}`
  const style = doc.createElement('style')
  style.textContent = '@page{margin:18mm}body{font:11pt Arial,sans-serif;color:#172033;line-height:1.45}h1{font-size:20pt;margin:0 0 6px}h2{font-size:13pt;margin:20px 0 8px;border-bottom:1px solid #cbd5e1;padding-bottom:4px}p{white-space:pre-wrap;overflow-wrap:anywhere;margin:7px 0}header{border-bottom:2px solid #334155;padding-bottom:12px}.meta{color:#475569;font-size:9pt}section{break-inside:auto}section p{break-inside:avoid}'
  doc.head.appendChild(style)
  const header = doc.createElement('header')
  const title = doc.createElement('h1'); title.textContent = report.title; header.appendChild(title)
  const meta = doc.createElement('p'); meta.className = 'meta'
  meta.textContent = `BrandGuard | Run ID: ${report.runId} | Exported: ${new Date().toISOString()}\nSnapshot of the result displayed in this session. Export time is not necessarily run time; data may change.`
  header.appendChild(meta); doc.body.appendChild(header)
  for (const section of report.sections) {
    const element = doc.createElement('section')
    const heading = doc.createElement('h2'); heading.textContent = section.heading; element.appendChild(heading)
    for (const text of section.paragraphs) {
      const p = doc.createElement('p'); p.textContent = text; element.appendChild(p)
    }
    doc.body.appendChild(element)
  }
  win.addEventListener('afterprint', () => frame.remove(), { once: true })
  try { win.focus(); win.print() } catch (error) { frame.remove(); throw error }
}

