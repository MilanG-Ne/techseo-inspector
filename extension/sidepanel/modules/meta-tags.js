// Meta Tags module renderer for the side panel.
// Renders title/description analysis, a Google SERP preview, Open Graph and
// Twitter card tags, a social share preview, and the scored check results.

import { escapeHtml, truncate, getHostname } from '../../shared/utils.js';
import { renderCheckRows, renderLengthBar } from './renderer.js';

const HEADING_STYLE =
  'font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;' +
  'color:var(--text-muted);margin-top:16px;margin-bottom:8px;';

const VALUE_BOX_STYLE =
  'background:var(--bg-alt);border:1px solid var(--border);border-radius:var(--radius-xs);' +
  'padding:10px 12px;font-size:13px;color:var(--text);line-height:1.4;word-break:break-word;';

const EMPTY_STYLE = 'color:var(--error);font-size:13px;font-weight:600;padding:8px 0;';

const KV_ROW_STYLE =
  'display:flex;gap:10px;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px;';
const KV_KEY_STYLE =
  'flex-shrink:0;min-width:120px;color:var(--text-muted);font-weight:600;font-family:var(--font-mono);';
const KV_VAL_STYLE = 'color:var(--text);word-break:break-all;line-height:1.4;';
const KV_MISSING_STYLE = 'color:var(--error);font-weight:600;';

const OG_KEYS = ['og:title', 'og:description', 'og:image', 'og:url', 'og:type'];
const TWITTER_KEYS = ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image'];

function has(v) {
  return typeof v === 'string' ? v.trim().length > 0 : v != null && v !== '';
}

function heading(text) {
  return `<h4 style="${HEADING_STYLE}">${escapeHtml(text)}</h4>`;
}

function appendHtml(container, htmlChunk) {
  container.insertAdjacentHTML('beforeend', htmlChunk);
}

function kvRow(key, value) {
  const valueHtml = has(value)
    ? `<span style="${KV_VAL_STYLE}">${escapeHtml(value)}</span>`
    : `<span style="${KV_MISSING_STYLE}">Missing</span>`;
  return (
    `<div style="${KV_ROW_STYLE}">` +
    `<span style="${KV_KEY_STYLE}">${escapeHtml(key)}</span>` +
    valueHtml +
    `</div>`
  );
}

function pathSegments(url) {
  try {
    return new URL(url).pathname.split('/').filter(Boolean);
  } catch {
    return [];
  }
}

export function renderMetaModule(container, data, scoreResult) {
  const d = data || {};
  const title = d.title;
  const description = d.description;
  const url = d.url || '';
  const hostname = getHostname(url);
  const og = d.ogTags || {};
  const tw = d.twitterTags || {};

  const titleLen =
    d.titleLength != null ? d.titleLength : typeof title === 'string' ? title.length : 0;
  const descLen =
    d.descriptionLength != null
      ? d.descriptionLength
      : typeof description === 'string'
        ? description.length
        : 0;

  // 1. Title
  appendHtml(container, heading('Title Tag'));
  if (has(title)) {
    appendHtml(container, `<div style="${VALUE_BOX_STYLE}">${escapeHtml(title)}</div>`);
    renderLengthBar(container, titleLen, { good: [30, 60], warn: [20, 70] });
  } else {
    appendHtml(container, `<div style="${EMPTY_STYLE}">No title tag found</div>`);
  }

  // 2. Description
  appendHtml(container, heading('Meta Description'));
  if (has(description)) {
    appendHtml(container, `<div style="${VALUE_BOX_STYLE}">${escapeHtml(description)}</div>`);
    renderLengthBar(container, descLen, { good: [120, 160], warn: [80, 200] });
  } else {
    appendHtml(container, `<div style="${EMPTY_STYLE}">No meta description found</div>`);
  }

  // 3. Google SERP Preview
  appendHtml(container, heading('Google SERP Preview'));
  const breadcrumb = [hostname, ...pathSegments(url)].join(' > ');
  const favicon = d.favicon;
  const faviconHtml = has(favicon)
    ? `<img class="serp-favicon" src="${escapeHtml(favicon)}" width="18" height="18" alt="">`
    : `<div class="serp-favicon-placeholder"></div>`;
  appendHtml(
    container,
    `<div class="serp-preview">` +
      `<div class="serp-url-row">${faviconHtml}` +
      `<span class="serp-breadcrumb">${escapeHtml(breadcrumb)}</span></div>` +
      `<div class="serp-title">${escapeHtml(truncate(title || '', 60))}</div>` +
      `<div class="serp-description">${escapeHtml(truncate(description || '', 160))}</div>` +
      `</div>`,
  );

  // 4. Open Graph Tags
  appendHtml(container, heading('Open Graph Tags'));
  let ogHtml = '<div>';
  for (const key of OG_KEYS) {
    const value = og[key];
    ogHtml += kvRow(key, value);
    if (key === 'og:image' && has(value)) {
      ogHtml +=
        `<div style="padding:8px 0;">` +
        `<img src="${escapeHtml(value)}" alt="" ` +
        `style="height:50px;max-width:100%;border-radius:var(--radius-xs);border:1px solid var(--border);"></div>`;
    }
  }
  ogHtml += '</div>';
  appendHtml(container, ogHtml);

  // 5. Social Share Preview
  appendHtml(container, heading('Social Share Preview'));
  const ogImage = og['og:image'];
  const socialImageHtml = has(ogImage)
    ? `<img src="${escapeHtml(ogImage)}" alt="">`
    : 'No image';
  const socialTitle = has(og['og:title']) ? og['og:title'] : title || '';
  const socialDesc = has(og['og:description']) ? og['og:description'] : description || '';
  appendHtml(
    container,
    `<div class="social-preview">` +
      `<div class="social-preview-image">${socialImageHtml}</div>` +
      `<div class="social-preview-body">` +
      `<div class="social-preview-domain">${escapeHtml(hostname.toUpperCase())}</div>` +
      `<div class="social-preview-title">${escapeHtml(socialTitle)}</div>` +
      `<div class="social-preview-desc">${escapeHtml(socialDesc)}</div>` +
      `</div></div>`,
  );

  // 6. Twitter Card Tags
  appendHtml(container, heading('Twitter Card Tags'));
  let twHtml = '<div>';
  for (const key of TWITTER_KEYS) {
    twHtml += kvRow(key, tw[key]);
  }
  twHtml += '</div>';
  appendHtml(container, twHtml);

  // 7. Check Results
  appendHtml(container, heading('Check Results'));
  renderCheckRows(container, (scoreResult && scoreResult.checks) || []);
}
