import { escapeHtml, truncate, formatBytes } from '../../shared/utils.js';
import { renderCheckRows, renderSummaryCards, renderDataTable, renderEmptyState } from './renderer.js';

const SECTION_STYLE =
  'font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin:16px 0 8px;';

const FORMAT_COLORS = {
  jpg: '#EF4444', jpeg: '#EF4444', png: '#F59E0B', webp: '#22C55E',
  avif: '#2D7FF9', svg: '#8B5CF6', gif: '#EC4899', unknown: '#9CA3AF'
};

export function renderImagesModule(container, data, scoreResult) {
  const images = Array.isArray(data?.images) ? data.images : [];
  const totalCount = data?.totalCount ?? images.length;

  if (totalCount === 0) {
    renderEmptyState(container, 'No images found on this page');
    return;
  }

  const withAlt = images.filter(i => i.hasAlt && !i.altEmpty).length;
  const missingAlt = images.filter(i => !i.hasAlt).length;
  const modernCount = images.filter(i => i.format === 'webp' || i.format === 'avif').length;

  renderSummaryCards(container, [
    { value: totalCount, label: 'Total' },
    { value: withAlt, label: 'With Alt', color: 'var(--success)' },
    { value: missingAlt, label: 'No Alt', color: missingAlt > 0 ? 'var(--error)' : 'var(--success)' },
    { value: modernCount, label: 'Modern', color: 'var(--primary)' },
  ]);

  // Format distribution bar
  const formatCounts = {};
  images.forEach(img => {
    const f = img.format || 'unknown';
    formatCounts[f] = (formatCounts[f] || 0) + 1;
  });

  const formats = Object.entries(formatCounts).sort((a, b) => b[1] - a[1]);
  if (formats.length > 0) {
    container.insertAdjacentHTML('beforeend', `<h4 style="${SECTION_STYLE}">Format Distribution</h4>`);

    const barHtml = formats.map(([fmt, count]) => {
      const pct = ((count / totalCount) * 100).toFixed(1);
      const color = FORMAT_COLORS[fmt] || FORMAT_COLORS.unknown;
      const label = pct > 10 ? `${fmt.toUpperCase()} ${count}` : '';
      return `<div class="format-segment ${escapeHtml(fmt)}" style="width:${pct}%;background:${color};">${label}</div>`;
    }).join('');

    const legendHtml = formats.map(([fmt, count]) => {
      const color = FORMAT_COLORS[fmt] || FORMAT_COLORS.unknown;
      return `<span class="format-legend-item"><span class="format-legend-dot" style="background:${color};"></span>${fmt.toUpperCase()} (${count})</span>`;
    }).join('');

    container.insertAdjacentHTML('beforeend', `
      <div class="format-bar">${barHtml}</div>
      <div class="format-legend">${legendHtml}</div>
    `);
  }

  // Image table
  container.insertAdjacentHTML('beforeend', `<h4 style="${SECTION_STYLE}">Image Details</h4>`);

  const rows = images.map((img, i) => {
    let altDisplay;
    if (!img.hasAlt) {
      altDisplay = '<span style="color:var(--error);font-weight:600;">Missing</span>';
    } else if (img.altEmpty) {
      altDisplay = '<span style="color:var(--warning);font-style:italic;">Empty</span>';
    } else {
      altDisplay = escapeHtml(truncate(img.alt, 40));
    }

    const dims = img.naturalWidth && img.naturalHeight
      ? `${img.naturalWidth}x${img.naturalHeight}`
      : (img.hasDimensions ? 'Set' : '<span style="color:var(--text-muted);">N/A</span>');

    const lazy = img.loading === 'lazy'
      ? '<span style="color:var(--success);">Yes</span>'
      : (img.isInViewport ? '<span style="color:var(--text-muted);">ATF</span>' : '<span style="color:var(--warning);">No</span>');

    return {
      num: i + 1,
      src: img.src,
      alt: altDisplay,
      format: (img.format || 'unknown').toUpperCase(),
      size: formatBytes(img.fileSize),
      dims,
      lazy,
    };
  });

  const tableWrap = document.createElement('div');
  tableWrap.className = 'table-scroll';
  tableWrap.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th style="width:30px;">#</th>
          <th style="width:180px;">Source</th>
          <th>Alt Text</th>
          <th style="width:50px;">Format</th>
          <th style="width:60px;">Size</th>
          <th style="width:70px;">Dims</th>
          <th style="width:36px;">Lazy</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td>${r.num}</td>
            <td class="truncate" title="${escapeHtml(r.src)}">${escapeHtml(truncate(r.src, 40))}</td>
            <td>${r.alt}</td>
            <td>${escapeHtml(r.format)}</td>
            <td>${escapeHtml(r.size)}</td>
            <td>${r.dims}</td>
            <td>${r.lazy}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  container.appendChild(tableWrap);

  // Check results
  container.insertAdjacentHTML('beforeend', `<h4 style="${SECTION_STYLE}">Checks</h4>`);
  renderCheckRows(container, scoreResult?.checks);
}
