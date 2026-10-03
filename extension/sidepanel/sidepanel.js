import { iconSearch, iconRefresh, iconCopy, iconDownload, iconFileText, iconHeading, iconImage, iconLink, iconCode, iconShield, iconZap, iconAlertTriangle } from '../shared/icons.js';
import { getActiveTab, showToast, getScoreClass, formatDate, escapeHtml } from '../shared/utils.js';
import { calculateScore } from '../shared/scoring.js';
import { renderModuleSection } from './modules/renderer.js';
import { renderMetaModule } from './modules/meta-tags.js';
import { renderHeadingsModule } from './modules/headings.js';
import { renderImagesModule } from './modules/images.js';
import { renderLinksModule } from './modules/links.js';
import { renderSchemaModule } from './modules/schema.js';
import { renderIndexabilityModule } from './modules/indexability.js';
import { renderPerformanceModule } from './modules/performance.js';
import { compareSnapshots, getSnapshotsForUrl } from '../features/snapshot.js';
import { copySummaryText } from '../features/clipboard.js';
import { generatePdf } from '../features/pdf-report.js';

const MODULE_CONFIG = [
  { key: 'meta', name: 'Meta Tags', iconClass: 'meta', icon: iconFileText, render: renderMetaModule },
  { key: 'headings', name: 'Heading Structure', iconClass: 'headings', icon: iconHeading, render: renderHeadingsModule },
  { key: 'images', name: 'Image Audit', iconClass: 'images', icon: iconImage, render: renderImagesModule },
  { key: 'links', name: 'Link Analysis', iconClass: 'links', icon: iconLink, render: renderLinksModule },
  { key: 'schema', name: 'Schema / JSON-LD', iconClass: 'schema', icon: iconCode, render: renderSchemaModule },
  { key: 'indexability', name: 'Indexability', iconClass: 'indexability', icon: iconShield, render: renderIndexabilityModule },
  { key: 'performance', name: 'Page Speed', iconClass: 'performance', icon: iconZap, render: renderPerformanceModule },
];

let currentAuditData = null;
let currentScoreResults = null;
let comparisonSnapshot = null;
let pendingFocus = null;

document.getElementById('initial-icon').innerHTML = iconSearch(48);
document.getElementById('btn-rerun').innerHTML = iconRefresh(16);
document.getElementById('btn-copy').innerHTML = iconCopy(16);
document.getElementById('btn-pdf').innerHTML = iconDownload(16);

document.getElementById('btn-run').addEventListener('click', runAudit);
document.getElementById('btn-retry').addEventListener('click', runAudit);
document.getElementById('btn-rerun').addEventListener('click', runAudit);
document.getElementById('btn-copy').addEventListener('click', handleCopy);
document.getElementById('btn-pdf').addEventListener('click', handlePdf);

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'auditDataReady' && msg.data && msg.scoreResults) {
    currentAuditData = msg.data;
    currentScoreResults = msg.scoreResults;
    renderFullReport();
  }
  if ((msg.action === 'auditComplete' || msg.action === 'auditUpdated') && msg.data) {
    currentAuditData = msg.data;
    currentScoreResults = calculateScore(msg.data);
    rerenderPreservingState();
  }
  if (msg.action === 'focusModule' && msg.module) {
    pendingFocus = msg.module;
    chrome.runtime.sendMessage({ action: 'getFocusModule', tabId: msg.tabId }).catch(() => {});
    applyPendingFocus();
  }
  if (msg.action === 'triggerAudit') {
    runAudit();
  }
  if (msg.action === 'generatePdf') {
    if (msg.data && msg.scoreResults) {
      currentAuditData = msg.data;
      currentScoreResults = msg.scoreResults;
      renderFullReport();
    }
    handlePdf();
  }
});

init();

async function init() {
  const tab = await getActiveTab();
  if (!tab) return;

  const focusResp = await chrome.runtime.sendMessage({
    action: 'getFocusModule',
    tabId: tab.id
  }).catch(() => null);
  if (focusResp?.module) pendingFocus = focusResp.module;

  const response = await chrome.runtime.sendMessage({
    action: 'getLatestAuditData',
    tabId: tab.id
  });

  if (response && response.success && response.data) {
    currentAuditData = response.data;
    currentScoreResults = calculateScore(response.data);
    renderFullReport();
  } else if (pendingFocus) {
    // Arrived via a module click but no data yet — run a fresh audit;
    // focus applies once the report renders
    runAudit();
  }
}

async function runAudit() {
  showState('loading');

  try {
    const tab = await getActiveTab();
    if (!tab) {
      showError('No active tab found', 'Open a web page and try again.');
      return;
    }

    if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://') || tab.url?.startsWith('about:')) {
      showError('Cannot audit this page', 'Chrome internal pages cannot be analyzed.');
      return;
    }

    const response = await chrome.runtime.sendMessage({
      action: 'getAuditData',
      tabId: tab.id
    });

    if (!response || !response.success) {
      showError('Audit failed', response?.error || 'Could not extract page data.');
      return;
    }

    currentAuditData = response.data;
    currentScoreResults = calculateScore(response.data);
    renderFullReport();

    chrome.runtime.sendMessage({
      action: 'auditDataReady',
      data: currentAuditData,
      scoreResults: currentScoreResults
    });
  } catch (e) {
    showError('Audit failed', e.message);
  }
}

function showState(state) {
  document.getElementById('initial-state').style.display = state === 'initial' ? '' : 'none';
  document.getElementById('loading-state').style.display = state === 'loading' ? '' : 'none';
  document.getElementById('results-state').style.display = state === 'results' ? '' : 'none';
  document.getElementById('error-state').style.display = state === 'error' ? '' : 'none';
}

function showError(title, detail) {
  showState('error');
  document.getElementById('error-icon').innerHTML = iconAlertTriangle(48);
  document.getElementById('error-text').textContent = title;
  document.getElementById('error-detail').textContent = detail;
}

function renderFullReport() {
  showState('results');
  renderScoreOverview();
  renderAuditMeta();
  renderModules();
  applyPendingFocus();
  checkComparison();
}

// Re-render without losing which sections the user has open or their scroll position
function rerenderPreservingState() {
  const hadRender = !!document.querySelector('#modules-container .collapsible');
  if (!hadRender) {
    renderFullReport();
    return;
  }
  const openIds = new Set(
    [...document.querySelectorAll('#modules-container .collapsible.open')].map(s => s.id)
  );
  const panelContent = document.querySelector('.panel-content');
  const scrollTop = panelContent ? panelContent.scrollTop : 0;

  renderFullReport();

  document.querySelectorAll('#modules-container .collapsible').forEach(s => {
    s.classList.toggle('open', openIds.has(s.id));
  });
  if (panelContent) panelContent.scrollTop = scrollTop;
}

function applyPendingFocus() {
  if (!pendingFocus) return;
  const section = document.getElementById(`module-${pendingFocus}`);
  if (!section) return;
  document.querySelectorAll('#modules-container .collapsible.open').forEach(s => {
    if (s !== section) s.classList.remove('open');
  });
  section.classList.add('open', 'focus-flash');
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(() => section.classList.remove('focus-flash'), 1500);
  pendingFocus = null;
}

function renderScoreOverview() {
  const container = document.getElementById('score-overview');
  const score = currentScoreResults.totalScore;
  const cls = getScoreClass(score);
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  let barsHtml = '';
  MODULE_CONFIG.forEach(({ key, name }) => {
    const mod = currentScoreResults.modules[key];
    if (!mod) return;
    const pct = mod.maxScore > 0 ? Math.round((mod.score / mod.maxScore) * 100) : 0;
    const barCls = getScoreClass(pct);
    barsHtml += `
      <div class="module-bar-row">
        <span class="module-bar-label">${name.split(' ')[0]}</span>
        <div class="module-bar-track">
          <div class="module-bar-fill ${barCls}" style="width:0%;" data-width="${pct}%"></div>
        </div>
        <span class="module-bar-value">${mod.score}/${mod.maxScore}</span>
      </div>
    `;
  });

  container.innerHTML = `
    <div class="score-gauge">
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle class="gauge-bg" cx="40" cy="40" r="${radius}"/>
        <circle class="gauge-fill ${cls}" cx="40" cy="40" r="${radius}"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${circumference}"
          style="transition: stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)"/>
      </svg>
      <div class="gauge-label">
        <span class="gauge-value ${cls}" style="font-size:22px;">${score}</span>
        <span class="gauge-max" style="font-size:10px;">/ 100</span>
      </div>
    </div>
    <div class="module-bars">${barsHtml}</div>
  `;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const fill = container.querySelector('.gauge-fill');
      if (fill) fill.style.strokeDashoffset = offset;
      container.querySelectorAll('.module-bar-fill').forEach(bar => {
        bar.style.width = bar.dataset.width;
      });
    });
  });
}

function renderAuditMeta() {
  const container = document.getElementById('audit-meta');
  const url = currentAuditData.pageUrl;
  const time = formatDate(currentAuditData.timestamp);
  container.innerHTML = `
    <span class="url" title="${escapeHtml(url)}">${escapeHtml(url)}</span>
    <span class="timestamp">${time}</span>
  `;
}

function renderModules() {
  const container = document.getElementById('modules-container');
  container.innerHTML = '';

  MODULE_CONFIG.forEach(({ key, name, iconClass, icon, render }, index) => {
    const mod = currentScoreResults.modules[key];
    const data = currentAuditData[key];
    if (!mod || !data) return;

    renderModuleSection(
      container,
      key,
      name,
      icon(18),
      iconClass,
      mod,
      (contentDiv) => render(contentDiv, data, mod),
      index === 0
    );
  });
}

async function checkComparison() {
  if (!currentAuditData) return;

  const snapshots = await getSnapshotsForUrl(currentAuditData.pageUrl);
  if (!snapshots || snapshots.length === 0) {
    document.getElementById('comparison-banner').style.display = 'none';
    comparisonSnapshot = null;
    return;
  }

  comparisonSnapshot = snapshots[0];
  const diff = compareSnapshots(currentScoreResults, comparisonSnapshot);
  const banner = document.getElementById('comparison-banner');

  const changeText = diff.totalScoreChange > 0
    ? `+${diff.totalScoreChange}`
    : `${diff.totalScoreChange}`;
  const changeCls = diff.totalScoreChange > 0 ? 'up' : diff.totalScoreChange < 0 ? 'down' : 'same';

  banner.innerHTML = `
    <span class="compare-text">Compared to snapshot from ${formatDate(comparisonSnapshot.timestamp)}</span>
    <span class="score-change ${changeCls}">${changeText}</span>
    <button class="btn-clear-compare" id="btn-clear-compare">Clear</button>
  `;
  banner.style.display = '';

  document.getElementById('btn-clear-compare').addEventListener('click', () => {
    banner.style.display = 'none';
    comparisonSnapshot = null;
  });
}

async function handleCopy() {
  if (!currentAuditData || !currentScoreResults) return;
  const text = copySummaryText(currentAuditData, currentScoreResults, MODULE_CONFIG);
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard');
  } catch {
    showToast('Failed to copy');
  }
}

function handlePdf() {
  if (!currentAuditData || !currentScoreResults) return;
  try {
    generatePdf(currentAuditData, currentScoreResults, MODULE_CONFIG);
    showToast('PDF downloaded');
  } catch (e) {
    showToast('PDF generation failed: ' + e.message);
  }
}
