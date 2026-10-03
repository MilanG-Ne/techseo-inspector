import { escapeHtml, truncate } from '../../shared/utils.js';
import { renderCheckRows, renderSummaryCards, renderEmptyState } from './renderer.js';

const SECTION_STYLE =
  'font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin:16px 0 8px;';

const TAG_CLASSES = {
  internal: 'internal', external: 'external', mailto: 'mailto', tel: 'tel',
  anchor: 'internal', javascript: 'external', invalid: 'external'
};

function relTags(link) {
  const tags = [];
  if (link.isNofollow) tags.push('<span class="tag nofollow">nofollow</span>');
  if (link.isSponsored) tags.push('<span class="tag sponsored">sponsored</span>');
  if (link.isUgc) tags.push('<span class="tag ugc">ugc</span>');
  return tags.join(' ') || '<span style="color:var(--text-muted);">—</span>';
}

export function renderLinksModule(container, data, scoreResult) {
  const links = Array.isArray(data?.links) ? data.links : [];

  if (links.length === 0) {
    renderEmptyState(container, 'No links found on this page');
    return;
  }

  const internal = links.filter(l => l.type === 'internal').length;
  const external = links.filter(l => l.type === 'external').length;
  const mailTel = links.filter(l => l.type === 'mailto' || l.type === 'tel').length;
  const emptyAnchors = links.filter(l => l.isEmpty).length;

  renderSummaryCards(container, [
    { value: internal, label: 'Internal', color: 'var(--primary)' },
    { value: external, label: 'External', color: 'var(--warning)' },
    { value: mailTel, label: 'Mail/Tel' },
    { value: emptyAnchors, label: 'Empty', color: emptyAnchors > 0 ? 'var(--error)' : 'var(--success)' },
  ]);

  // Broken links
  container.insertAdjacentHTML('beforeend', `<h4 style="${SECTION_STYLE}">Broken Links</h4>`);
  if (data.brokenCount != null) {
    if (data.brokenCount === 0) {
      container.insertAdjacentHTML('beforeend',
        `<div style="color:var(--success);font-size:12px;font-weight:600;">No broken links found (${data.checkedCount || 0} checked)</div>`
      );
    } else {
      container.insertAdjacentHTML('beforeend',
        `<div style="color:var(--error);font-size:12px;font-weight:600;margin-bottom:6px;">${data.brokenCount} broken link${data.brokenCount === 1 ? '' : 's'} found (${data.checkedCount || 0} checked)</div>`
      );
      if (Array.isArray(data.brokenUrls)) {
        data.brokenUrls.forEach(url => {
          container.insertAdjacentHTML('beforeend',
            `<div class="broken-link">${escapeHtml(url)}</div>`
          );
        });
      }
    }
  } else {
    container.insertAdjacentHTML('beforeend',
      `<div style="color:var(--text-muted);font-size:12px;">Link checking not available</div>`
    );
  }

  // Link table
  container.insertAdjacentHTML('beforeend', `<h4 style="${SECTION_STYLE}">All Links (${links.length})</h4>`);

  const tableWrap = document.createElement('div');
  tableWrap.className = 'table-scroll';
  tableWrap.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Anchor Text</th>
          <th style="width:200px;">URL</th>
          <th style="width:70px;">Type</th>
          <th style="width:90px;">Rel</th>
        </tr>
      </thead>
      <tbody>
        ${links.slice(0, 200).map(l => {
          const text = l.isEmpty
            ? '<span style="color:var(--error);font-style:italic;">empty</span>'
            : escapeHtml(truncate(l.text, 40));
          const tagClass = TAG_CLASSES[l.type] || 'external';
          return `
            <tr>
              <td class="truncate" title="${escapeHtml(l.text)}">${text}</td>
              <td class="truncate" title="${escapeHtml(l.href)}">${escapeHtml(truncate(l.href, 50))}</td>
              <td><span class="tag ${tagClass}">${escapeHtml(l.type)}</span></td>
              <td>${relTags(l)}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
  container.appendChild(tableWrap);

  if (links.length > 200) {
    container.insertAdjacentHTML('beforeend',
      `<div style="font-size:11px;color:var(--text-muted);padding:6px 0;">Showing first 200 of ${links.length} links</div>`
    );
  }

  // Anchor text distribution
  container.insertAdjacentHTML('beforeend', `<h4 style="${SECTION_STYLE}">Anchor Text Distribution</h4>`);

  const anchorCounts = {};
  links.forEach(l => {
    if (!l.text || l.isEmpty) return;
    const text = l.text.trim().toLowerCase();
    if (text) anchorCounts[text] = (anchorCounts[text] || 0) + 1;
  });

  const sortedAnchors = Object.entries(anchorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const uniqueCount = Object.keys(anchorCounts).length;
  container.insertAdjacentHTML('beforeend',
    `<div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;">${uniqueCount} unique anchor text${uniqueCount === 1 ? '' : 's'}</div>`
  );

  if (sortedAnchors.length > 0) {
    const listHtml = sortedAnchors.map(([text, count]) =>
      `<li><span class="anchor-text">${escapeHtml(text)}</span><span class="anchor-count">${count}</span></li>`
    ).join('');
    container.insertAdjacentHTML('beforeend', `<ul class="anchor-list">${listHtml}</ul>`);
  }

  // Check results
  container.insertAdjacentHTML('beforeend', `<h4 style="${SECTION_STYLE}">Checks</h4>`);
  renderCheckRows(container, scoreResult?.checks);
}
