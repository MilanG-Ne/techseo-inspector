// Headings module renderer for the TechSEO Inspector side panel.

import { escapeHtml } from '../../shared/utils.js';
import { renderCheckRows, renderSummaryCards, renderEmptyState } from './renderer.js';

export function renderHeadingsModule(container, data, scoreResult) {
  const headings = Array.isArray(data?.headings) ? data.headings : [];

  if (headings.length === 0) {
    renderEmptyState(container, 'No headings found', 'This page has no <h1>-<h6> elements');
    return;
  }

  const h1Count = headings.filter((h) => h && h.level === 1).length;
  const uniqueLevels = new Set(
    headings.filter((h) => h && h.level != null).map((h) => h.level)
  ).size;

  renderSummaryCards(container, [
    { value: headings.length, label: 'Headings' },
    { value: h1Count, label: 'H1', color: h1Count === 1 ? undefined : 'var(--error)' },
    { value: uniqueLevels, label: 'Levels' },
  ]);

  const tree = document.createElement('div');
  tree.className = 'heading-tree';
  tree.innerHTML = headings
    .map((h) => {
      const level = Math.min(6, Math.max(1, Number(h?.level) || 1));
      const indent = (level - 1) * 20;
      const isEmpty = Boolean(h?.isEmpty);
      const textHtml = isEmpty
        ? '<span class="heading-text empty">&lt;empty&gt;</span>'
        : `<span class="heading-text">${escapeHtml(h?.text)}</span>`;
      return `
        <div class="tree-node" style="padding-left: ${indent}px">
          <span class="level-badge h${level}">H${level}</span>
          ${textHtml}
        </div>
      `;
    })
    .join('');
  container.appendChild(tree);

  renderCheckRows(container, scoreResult?.checks);
}
