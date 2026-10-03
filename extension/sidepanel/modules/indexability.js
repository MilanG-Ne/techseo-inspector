import { escapeHtml } from '../../shared/utils.js';
import { iconCheckCircle, iconX, iconShield } from '../../shared/icons.js';
import { renderCheckRows } from './renderer.js';

const SECTION_STYLE =
  'font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin:16px 0 8px;font-weight:600;';

function section(title) {
  return `<h4 style="${SECTION_STYLE}">${escapeHtml(title)}</h4>`;
}

function valueBox(innerHtml) {
  return `<div style="font-family:var(--font-mono);font-size:12px;word-break:break-all;background:var(--bg-alt);padding:6px 8px;border-radius:var(--radius-xs);color:var(--text);">${innerHtml}</div>`;
}

function noteRed(text) {
  return `<div style="color:var(--error);font-size:12px;font-weight:600;">${escapeHtml(text)}</div>`;
}

function noteGray(text) {
  return `<div style="color:var(--text-muted);font-size:12px;">${escapeHtml(text)}</div>`;
}

function noteGreen(text) {
  return `<div style="color:var(--success);font-size:12px;font-weight:600;">${escapeHtml(text)}</div>`;
}

// escapeHtml first, then wrap directive keywords (letters only, safe) in red.
function highlightDirectives(text, keywords) {
  const escaped = escapeHtml(text);
  const pattern = new RegExp(`\\b(${keywords.join('|')})\\b`, 'gi');
  return escaped.replace(
    pattern,
    '<span style="color:var(--error);font-weight:600;">$1</span>'
  );
}

export function renderIndexabilityModule(container, data, scoreResult) {
  data = data || {};
  const xRobots = data.xRobotsTag || '';
  const xRobotsNoindex = /noindex/i.test(xRobots);

  const notIndexable =
    data.hasNoindex === true || xRobotsNoindex || data.robotsTxtBlocked === true;

  let reason = '';
  if (data.hasNoindex === true) reason = 'Robots meta tag contains "noindex"';
  else if (xRobotsNoindex) reason = 'X-Robots-Tag header contains "noindex"';
  else if (data.robotsTxtBlocked === true) reason = 'Blocked by robots.txt';

  let html = '';

  // 1. Indexability banner
  if (notIndexable) {
    html += `
      <div class="indexable-banner no">
        ${iconShield(20)}
        <span>NOT INDEXABLE${reason ? ' — ' + escapeHtml(reason) : ''}</span>
      </div>`;
  } else {
    html += `
      <div class="indexable-banner yes">
        ${iconCheckCircle(20)}
        <span>INDEXABLE</span>
      </div>`;
  }

  // 2. Canonical URL
  html += section('Canonical URL');
  if (data.canonical) {
    html += valueBox(escapeHtml(data.canonical));
    if (data.canonicalIsSelfReferencing) {
      html += `<div style="display:flex;align-items:center;gap:6px;color:var(--success);font-size:12px;font-weight:600;margin-top:6px;">${iconCheckCircle(
        16
      )}<span>Self-referencing</span></div>`;
    } else {
      html += `<div style="color:var(--warning);font-size:12px;font-weight:600;margin-top:6px;">Points to a different URL</div>`;
      if (data.url) {
        html += `<div style="font-size:11px;color:var(--text-muted);margin-top:6px;">Current page URL:</div>`;
        html += valueBox(escapeHtml(data.url));
      }
    }
  } else {
    html += noteRed('No canonical tag found');
  }

  // 3. Robots Meta Tag
  html += section('Robots Meta Tag');
  if (data.robotsContent) {
    html += valueBox(highlightDirectives(data.robotsContent, ['noindex', 'nofollow']));
  } else {
    html += noteGray('No robots meta tag (defaults to index, follow)');
  }
  if (data.googlebotContent) {
    html += `<div style="font-size:11px;color:var(--text-muted);margin-top:6px;">Googlebot-specific:</div>`;
    html += valueBox(highlightDirectives(data.googlebotContent, ['noindex', 'nofollow']));
  }

  // 4. X-Robots-Tag Header
  html += section('X-Robots-Tag Header');
  if (data.xRobotsTag) {
    html += valueBox(highlightDirectives(data.xRobotsTag, ['noindex']));
  } else {
    html += noteGray('Not detected');
  }

  // 5. Robots.txt
  html += section('Robots.txt');
  if (data.robotsTxtAccessible) {
    if (data.robotsTxtBlocked === true) {
      html += `<div style="display:flex;align-items:center;gap:6px;color:var(--error);font-size:12px;font-weight:600;">${iconX(
        16
      )}<span>Current URL is BLOCKED by robots.txt</span></div>`;
    } else {
      html += `<div style="display:flex;align-items:center;gap:6px;color:var(--success);font-size:12px;font-weight:600;">${iconCheckCircle(
        16
      )}<span>Current URL is allowed</span></div>`;
    }
  } else {
    html += noteGray('Could not fetch robots.txt');
  }

  container.innerHTML = html;

  // 6. Check results
  const checks = scoreResult && Array.isArray(scoreResult.checks) ? scoreResult.checks : [];
  if (checks.length) {
    container.insertAdjacentHTML('beforeend', section('Checks'));
    const checksWrap = document.createElement('div');
    container.appendChild(checksWrap);
    renderCheckRows(checksWrap, checks);
  }
}
