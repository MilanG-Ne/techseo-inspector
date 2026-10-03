import { formatBytes } from '../../shared/utils.js';
import { renderCheckRows, renderSummaryCards } from './renderer.js';

const SECTION_STYLE =
  'font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin:16px 0 8px;';

const NOTE_STYLE =
  'font-size:11px;color:var(--text-muted);line-height:1.5;margin-bottom:12px;';

function fmtMs(v) {
  if (v == null) return 'N/A';
  return v >= 1000 ? `${(v / 1000).toFixed(2)} s` : `${Math.round(v)} ms`;
}

export function renderPerformanceModule(container, data, scoreResult) {
  const d = data || {};

  renderSummaryCards(container, [
    { value: fmtMs(d.ttfb), label: 'TTFB' },
    { value: fmtMs(d.fcp), label: 'FCP' },
    { value: fmtMs(d.lcp), label: 'LCP' },
    { value: d.cls == null ? 'N/A' : d.cls.toFixed(3), label: 'CLS' },
    { value: d.pageWeight == null ? 'N/A' : formatBytes(d.pageWeight), label: 'Weight' },
    { value: d.requestCount == null ? 'N/A' : d.requestCount, label: 'Requests' },
  ]);

  container.insertAdjacentHTML('beforeend',
    `<div style="${NOTE_STYLE}">Measured from the live page at audit time. Cached repeat visits can look faster than a first visit — for lab-grade numbers use PageSpeed Insights.</div>`
  );

  if (d.loadTime != null || d.domContentLoaded != null) {
    container.insertAdjacentHTML('beforeend', `<h4 style="${SECTION_STYLE}">Load Timeline</h4>`);
    const rows = [];
    if (d.ttfb != null) rows.push(['First byte (TTFB)', fmtMs(d.ttfb)]);
    if (d.fcp != null) rows.push(['First Contentful Paint', fmtMs(d.fcp)]);
    if (d.lcp != null) rows.push(['Largest Contentful Paint', fmtMs(d.lcp)]);
    if (d.domContentLoaded != null) rows.push(['DOM Content Loaded', fmtMs(d.domContentLoaded)]);
    if (d.loadTime != null) rows.push(['Full page load', fmtMs(d.loadTime)]);
    container.insertAdjacentHTML('beforeend', rows.map(([k, v]) =>
      `<div class="kv-row"><span class="kv-key">${k}</span><span class="kv-value">${v}</span></div>`
    ).join(''));
  }

  container.insertAdjacentHTML('beforeend', `<h4 style="${SECTION_STYLE}">Checks</h4>`);
  renderCheckRows(container, scoreResult?.checks);
}
