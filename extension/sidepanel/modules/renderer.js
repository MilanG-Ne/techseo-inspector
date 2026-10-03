// Shared rendering utilities for the TechSEO Inspector side panel modules.

import { iconCheck, iconAlertTriangle, iconX, iconMinus, iconChevronDown } from '../../shared/icons.js';
import { escapeHtml, getScoreClass } from '../../shared/utils.js';

// Creates a collapsible module section and fills its body via renderBodyFn.
export function renderModuleSection(container, id, title, iconHtml, iconClass, scoreResult, renderBodyFn, startOpen = false) {
  const score = scoreResult?.score ?? 0;
  const maxScore = scoreResult?.maxScore ?? 0;
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const scoreClass = getScoreClass(pct);

  const section = document.createElement('div');
  section.className = 'collapsible';
  section.id = `module-${id}`;
  section.innerHTML = `
    <div class="collapsible-header">
      <div class="module-icon ${escapeHtml(iconClass)}">${iconHtml}</div>
      <span class="module-name">${escapeHtml(title)}</span>
      <div class="module-stats">
        <span class="score-badge ${scoreClass}">${pct}%</span>
      </div>
      <span class="chevron">${iconChevronDown(16)}</span>
    </div>
    <div class="collapsible-body">
      <div class="collapsible-content"></div>
    </div>
  `;

  const header = section.querySelector('.collapsible-header');
  header.addEventListener('click', () => section.classList.toggle('open'));

  const isFirst = !container.querySelector('.collapsible');
  if (startOpen || id === 'meta' || isFirst) section.classList.add('open');

  const content = section.querySelector('.collapsible-content');
  if (typeof renderBodyFn === 'function') renderBodyFn(content, scoreResult);

  container.appendChild(section);
  return section;
}

// Renders a list of check results as icon + name/detail + status chip rows.
export function renderCheckRows(container, checks) {
  for (const check of checks || []) {
    const status = check.status || 'fail';
    let icon;
    if (status === 'pass') icon = iconCheck(14);
    else if (status === 'warn') icon = iconAlertTriangle(14);
    else if (status === 'na') icon = iconMinus(14);
    else icon = iconX(14);

    const detail = check.detail
      ? `<span class="check-detail">${escapeHtml(check.detail)}</span>`
      : '';

    const row = document.createElement('div');
    row.className = 'check-row';
    row.innerHTML = `
      <span class="check-icon ${escapeHtml(status)}">${icon}</span>
      <div class="check-info">
        <span class="check-name">${escapeHtml(check.name)}</span>
        ${detail}
      </div>
      <span class="status-chip ${escapeHtml(status)}">${escapeHtml(status)}</span>
    `;
    container.appendChild(row);
  }
}

// Renders a horizontal length bar with a fill colored by good/warn/bad ranges.
export function renderLengthBar(container, value, ranges) {
  const v = Number(value) || 0;
  const max = ranges?.warn?.[1] || 1;
  const widthPct = Math.min(100, Math.max(0, (v / max) * 100));

  let fillClass = 'bad';
  if (ranges?.good && v >= ranges.good[0] && v <= ranges.good[1]) {
    fillClass = 'good';
  } else if (ranges?.warn && v >= ranges.warn[0] && v <= ranges.warn[1]) {
    fillClass = 'warn';
  }

  const bar = document.createElement('div');
  bar.className = 'length-bar';
  bar.innerHTML = `
    <div class="bar-track">
      <div class="bar-fill ${fillClass}" style="width: ${widthPct}%"></div>
    </div>
    <span class="bar-count">${escapeHtml(String(v))}</span>
  `;
  container.appendChild(bar);
  return bar;
}

// Renders a scrollable data table from a column spec and row objects.
export function renderDataTable(container, columns, rows) {
  const cols = columns || [];

  const head = cols
    .map((c) => {
      const style = c.width ? ` style="width: ${escapeHtml(String(c.width))}"` : '';
      return `<th${style}>${escapeHtml(c.label)}</th>`;
    })
    .join('');

  const body = (rows || [])
    .map((row) => {
      const cells = cols
        .map((c) => {
          const style = c.width ? ` style="width: ${escapeHtml(String(c.width))}"` : '';

          // Rich cells: column.render(row) returns an array of {text, class?} chips.
          // The renderer escapes both text and class, so callers never emit raw HTML.
          if (typeof c.render === 'function') {
            const inner = (c.render(row) || [])
              .map((chip) => {
                const chipClass = chip.class ? ` class="${escapeHtml(chip.class)}"` : '';
                return `<span${chipClass}>${escapeHtml(chip.text)}</span>`;
              })
              .join(' ');
            return `<td${style}>${inner}</td>`;
          }

          const raw = row[c.key];
          const val = raw == null ? '' : String(raw);
          const cls = c.truncate ? ' class="truncate"' : '';
          const title = c.truncate ? ` title="${escapeHtml(val)}"` : '';
          return `<td${cls}${title}${style}>${escapeHtml(val)}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  const wrap = document.createElement('div');
  wrap.className = 'table-scroll';
  wrap.innerHTML = `
    <table class="data-table">
      <thead><tr>${head}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  `;
  container.appendChild(wrap);
  return wrap;
}

// Renders a grid of value/label summary cards.
export function renderSummaryCards(container, items) {
  const grid = document.createElement('div');
  grid.className = 'summary-cards';
  grid.innerHTML = (items || [])
    .map((item) => {
      const colorStyle = item.color ? ` style="color: ${escapeHtml(String(item.color))}"` : '';
      return `
        <div class="summary-card">
          <div class="card-value"${colorStyle}>${escapeHtml(String(item.value))}</div>
          <div class="card-label">${escapeHtml(String(item.label))}</div>
        </div>
      `;
    })
    .join('');
  container.appendChild(grid);
  return grid;
}

// Renders an empty-state placeholder with a message and optional subtext.
export function renderEmptyState(container, message, sub) {
  const el = document.createElement('div');
  el.className = 'empty-state';
  const subHtml = sub ? `<div class="empty-sub">${escapeHtml(sub)}</div>` : '';
  el.innerHTML = `
    <div class="empty-text">${escapeHtml(message)}</div>
    ${subHtml}
  `;
  container.appendChild(el);
  return el;
}
