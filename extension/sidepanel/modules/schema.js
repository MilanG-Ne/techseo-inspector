import { escapeHtml } from '../../shared/utils.js';
import { renderCheckRows } from './renderer.js';

const SECTION_STYLE =
  'font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin:16px 0 8px;font-weight:600;';
const BLOCK_STYLE =
  'border:1px solid var(--border);border-radius:var(--radius-xs);padding:12px;margin-bottom:10px;background:var(--bg);';

function section(title) {
  return `<h4 style="${SECTION_STYLE}">${escapeHtml(title)}</h4>`;
}

function typePill(type) {
  return `<span class="status-chip info">${escapeHtml(type)}</span>`;
}

function highlightJson(value) {
  let json;
  try {
    json = JSON.stringify(value, null, 2);
  } catch {
    json = String(value);
  }
  if (json == null) json = 'null';
  // Escape HTML-significant characters before wrapping tokens in spans.
  json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false)\b|\bnull\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let cls = 'json-number';
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? 'json-key' : 'json-string';
      } else if (/^(true|false)$/.test(match)) {
        cls = 'json-boolean';
      } else if (match === 'null') {
        cls = 'json-null';
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}

function renderBlock(block, displayNumber) {
  const types = Array.isArray(block.types) ? block.types.filter(Boolean) : [];
  const typeTags = types.length
    ? types.map(typePill).join('')
    : '<span class="status-chip warn">No @type</span>';

  let bodyHtml;
  if (block.parseError) {
    bodyHtml = `<div style="color:var(--error);font-size:12px;font-family:var(--font-mono);word-break:break-word;">Parse error: ${escapeHtml(
      block.parseError
    )}</div>`;
  } else if (block.parsed != null) {
    bodyHtml = `<div class="json-block">${highlightJson(block.parsed)}</div>`;
  } else {
    bodyHtml = `<div class="json-block">${escapeHtml(block.raw)}</div>`;
  }

  const contextChip = `<span class="status-chip ${block.hasContext ? 'pass' : 'fail'}">${
    block.hasContext ? 'has @context' : 'missing @context'
  }</span>`;
  const typeChip = `<span class="status-chip ${block.hasType ? 'pass' : 'fail'}">${
    block.hasType ? 'has @type' : 'missing @type'
  }</span>`;

  return `
    <div style="${BLOCK_STYLE}">
      <div style="display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:8px;">
        <span style="font-weight:600;font-size:12px;color:var(--text);">Block #${displayNumber}</span>
        ${typeTags}
      </div>
      ${bodyHtml}
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;">
        ${contextChip}${typeChip}
      </div>
    </div>`;
}

function renderMicrodataItem(item) {
  const props = Array.isArray(item.properties) ? item.properties : [];
  const rows = props
    .map(
      (p) =>
        `<div style="color:var(--text-secondary);font-weight:600;">${escapeHtml(
          p.name
        )}</div><div style="color:var(--text);word-break:break-word;">${escapeHtml(p.value)}</div>`
    )
    .join('');
  const propsHtml = rows
    ? `<div style="display:grid;grid-template-columns:auto 1fr;gap:2px 10px;font-size:12px;margin-top:6px;">${rows}</div>`
    : '<div style="font-size:12px;color:var(--text-muted);margin-top:6px;">No properties</div>';

  return `
    <div style="${BLOCK_STYLE}">
      <div style="font-weight:600;font-size:12px;color:var(--text);word-break:break-word;">${escapeHtml(
        item.type || 'Unknown type'
      )}</div>
      ${propsHtml}
    </div>`;
}

export function renderSchemaModule(container, data, scoreResult) {
  const jsonLdBlocks = Array.isArray(data?.jsonLdBlocks) ? data.jsonLdBlocks : [];
  const microdataItems = Array.isArray(data?.microdataItems) ? data.microdataItems : [];

  let html = '';

  if (jsonLdBlocks.length === 0 && microdataItems.length === 0) {
    html += `
      <div class="empty-state">
        <div class="empty-text">No structured data found</div>
        <div class="empty-sub">Adding JSON-LD schema can help search engines understand your content.</div>
      </div>`;
  } else {
    const typeSet = new Set();
    for (const b of jsonLdBlocks) {
      if (Array.isArray(b.types)) b.types.forEach((t) => t && typeSet.add(t));
    }
    for (const m of microdataItems) {
      if (m.type) typeSet.add(m.type);
    }

    const typePills = typeSet.size
      ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">${[...typeSet]
          .map(typePill)
          .join('')}</div>`
      : '';

    html += `
      <div class="summary-cards">
        <div class="summary-card">
          <div class="card-value">${jsonLdBlocks.length}</div>
          <div class="card-label">JSON-LD Blocks</div>
        </div>
        <div class="summary-card">
          <div class="card-value">${microdataItems.length}</div>
          <div class="card-label">Microdata Items</div>
        </div>
      </div>
      ${typePills}`;

    if (jsonLdBlocks.length) {
      html += section('JSON-LD Blocks');
      html += jsonLdBlocks.map((block, i) => renderBlock(block, i + 1)).join('');
    }

    if (microdataItems.length) {
      html += section('Microdata');
      html += microdataItems.map(renderMicrodataItem).join('');
    }
  }

  container.innerHTML = html;

  const checks = scoreResult && Array.isArray(scoreResult.checks) ? scoreResult.checks : [];
  if (checks.length) {
    container.insertAdjacentHTML('beforeend', section('Checks'));
    const checksWrap = document.createElement('div');
    container.appendChild(checksWrap);
    renderCheckRows(checksWrap, checks);
  }
}
