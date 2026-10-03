import { iconSearch, iconRefresh, iconCopy, iconCamera, iconDownload, iconFileText, iconHeading, iconImage, iconLink, iconCode, iconShield, iconZap, iconX, iconAlertTriangle } from '../shared/icons.js';
import { getActiveTab, showToast, getScoreClass } from '../shared/utils.js';
import { calculateScore } from '../shared/scoring.js';

const MODULE_CONFIG = [
  { key: 'meta', name: 'Meta Tags', iconClass: 'meta', icon: iconFileText },
  { key: 'headings', name: 'Headings', iconClass: 'headings', icon: iconHeading },
  { key: 'images', name: 'Images', iconClass: 'images', icon: iconImage },
  { key: 'links', name: 'Links', iconClass: 'links', icon: iconLink },
  { key: 'schema', name: 'Schema', iconClass: 'schema', icon: iconCode },
  { key: 'indexability', name: 'Indexability', iconClass: 'indexability', icon: iconShield },
  { key: 'performance', name: 'Page Speed', iconClass: 'performance', icon: iconZap },
];

let currentAuditData = null;
let currentScoreResults = null;

document.getElementById('initial-icon').innerHTML = iconSearch(48);
document.getElementById('btn-run').addEventListener('click', runAudit);
document.getElementById('btn-retry').addEventListener('click', runAudit);
document.getElementById('btn-rerun').innerHTML = iconRefresh(16);
document.getElementById('btn-rerun').addEventListener('click', runAudit);

document.getElementById('btn-copy').innerHTML = iconCopy(16);
document.getElementById('btn-snapshot').innerHTML = iconCamera(16);
document.getElementById('btn-pdf').innerHTML = iconDownload(16);

document.getElementById('btn-panel').addEventListener('click', openSidePanel);
document.getElementById('btn-copy').addEventListener('click', copySummary);
document.getElementById('btn-snapshot').addEventListener('click', saveSnapshot);
document.getElementById('btn-pdf').addEventListener('click', downloadPdf);

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'auditDataReady' && msg.data && msg.scoreResults) {
    currentAuditData = msg.data;
    currentScoreResults = msg.scoreResults;
    showResults(msg.scoreResults);
  }
});

init();

async function init() {
  const tab = await getActiveTab();
  if (!tab) return;

  const status = await chrome.runtime.sendMessage({
    action: 'getAuditStatus',
    tabId: tab.id
  });

  if (status?.inProgress) {
    showState('loading');
    return;
  }

  if (status?.hasData && status.data) {
    // Cached results from a different URL are stale — re-run automatically
    if (tab.url && status.data.pageUrl && status.data.pageUrl !== tab.url) {
      runAudit();
      return;
    }
    currentAuditData = status.data;
    currentScoreResults = calculateScore(status.data);
    showResults(currentScoreResults);
  }
}

async function runAudit() {
  showState('loading');

  try {
    const tab = await getActiveTab();
    if (!tab) {
      showError('No active tab found', 'Please open a web page and try again.');
      return;
    }

    if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://') || tab.url?.startsWith('about:')) {
      showError('Cannot audit this page', 'Chrome internal pages cannot be analyzed.');
      return;
    }

    chrome.runtime.sendMessage({
      action: 'startAudit',
      tabId: tab.id
    });
  } catch (e) {
    showError('Audit failed', e.message);
  }
}

chrome.runtime.onMessage.addListener((msg) => {
  if ((msg.action === 'auditComplete' || msg.action === 'auditUpdated') && msg.data) {
    currentAuditData = msg.data;
    currentScoreResults = calculateScore(msg.data);
    showResults(currentScoreResults);
  }
  if (msg.action === 'auditFailed') {
    showError('Audit failed', msg.error || 'Could not extract page data.');
  }
});

function showState(state) {
  document.getElementById('initial-state').style.display = state === 'initial' ? '' : 'none';
  document.getElementById('loading-state').style.display = state === 'loading' ? '' : 'none';
  document.getElementById('results-state').style.display = state === 'results' ? '' : 'none';
  document.getElementById('error-state').style.display = state === 'error' ? '' : 'none';
  document.getElementById('btn-rerun').style.display = state === 'results' ? '' : 'none';
}

function showError(title, detail) {
  showState('error');
  document.getElementById('error-icon').innerHTML = iconAlertTriangle(48);
  document.getElementById('error-text').textContent = title;
  document.getElementById('error-detail').textContent = detail;
}

function showResults(scoreResults) {
  showState('results');
  renderScoreGauge(scoreResults.totalScore);
  renderModuleSummaries(scoreResults.modules);
}

function renderScoreGauge(score) {
  const container = document.getElementById('score-section');
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const cls = getScoreClass(score);

  container.innerHTML = `
    <div class="score-gauge">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle class="gauge-bg" cx="60" cy="60" r="${radius}"/>
        <circle class="gauge-fill ${cls}" cx="60" cy="60" r="${radius}"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${circumference}"
          style="transition: stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)"/>
      </svg>
      <div class="gauge-label">
        <span class="gauge-value ${cls}">${score}</span>
        <span class="gauge-max">/ 100</span>
      </div>
    </div>
  `;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const fill = container.querySelector('.gauge-fill');
      if (fill) fill.style.strokeDashoffset = offset;
    });
  });
}

function renderModuleSummaries(modules) {
  const container = document.getElementById('module-summaries');
  container.innerHTML = '';

  MODULE_CONFIG.forEach(({ key, name, iconClass, icon }) => {
    const mod = modules[key];
    if (!mod) return;

    const row = document.createElement('div');
    row.className = 'module-row';
    row.title = `Open ${name} in full report`;
    row.innerHTML = `
      <div class="module-icon ${iconClass}">${icon(16)}</div>
      <span class="module-name">${name}</span>
      <div class="module-chips">
        ${mod.passCount > 0 ? `<span class="chip pass-chip">${mod.passCount}</span>` : ''}
        ${mod.warnCount > 0 ? `<span class="chip warn-chip">${mod.warnCount}</span>` : ''}
        ${mod.failCount > 0 ? `<span class="chip fail-chip">${mod.failCount}</span>` : ''}
      </div>
      <span class="module-score">${mod.score}/${mod.maxScore}</span>
    `;
    row.addEventListener('click', () => openModuleInPanel(key));
    container.appendChild(row);
  });
}

async function openSidePanel() {
  const tab = await getActiveTab();
  if (!tab) return;
  try {
    await chrome.sidePanel.open({ tabId: tab.id });
    window.close();
  } catch {
    showToast('Could not open side panel');
  }
}

async function openModuleInPanel(moduleKey) {
  const tab = await getActiveTab();
  if (!tab) return;
  try {
    await chrome.runtime.sendMessage({ action: 'setFocusModule', tabId: tab.id, module: moduleKey });
    await chrome.sidePanel.open({ tabId: tab.id });
    window.close();
  } catch {
    showToast('Could not open side panel');
  }
}

async function copySummary() {
  if (!currentScoreResults || !currentAuditData) return;

  const lines = [
    'TechSEO Inspector Report',
    '========================',
    `URL: ${currentAuditData.pageUrl}`,
    `Date: ${new Date(currentAuditData.timestamp).toLocaleString()}`,
    `Overall Score: ${currentScoreResults.totalScore}/100`,
    ''
  ];

  MODULE_CONFIG.forEach(({ key, name }) => {
    const mod = currentScoreResults.modules[key];
    if (!mod) return;
    lines.push(`${name}: ${mod.score}/${mod.maxScore} (${mod.passCount} pass, ${mod.warnCount} warn, ${mod.failCount} fail)`);
  });

  lines.push('');
  lines.push('Key Issues:');

  MODULE_CONFIG.forEach(({ key }) => {
    const mod = currentScoreResults.modules[key];
    if (!mod) return;
    mod.checks.forEach(check => {
      if (check.status === 'fail') {
        lines.push(`- [FAIL] ${check.name}: ${check.detail}`);
      }
    });
  });

  MODULE_CONFIG.forEach(({ key }) => {
    const mod = currentScoreResults.modules[key];
    if (!mod) return;
    mod.checks.forEach(check => {
      if (check.status === 'warn') {
        lines.push(`- [WARN] ${check.name}: ${check.detail}`);
      }
    });
  });

  lines.push('');
  lines.push('Powered by iviG Technical SEO — https://ivig.dev');

  try {
    await navigator.clipboard.writeText(lines.join('\n'));
    showToast('Copied to clipboard');
  } catch {
    showToast('Failed to copy');
  }
}

async function saveSnapshot() {
  if (!currentAuditData || !currentScoreResults) return;

  const snapshot = {
    id: `snap_${Date.now()}`,
    url: currentAuditData.pageUrl,
    timestamp: currentAuditData.timestamp,
    totalScore: currentScoreResults.totalScore,
    modules: currentScoreResults.modules
  };

  const response = await chrome.runtime.sendMessage({
    action: 'saveSnapshot',
    snapshot
  });

  if (response?.success) {
    showToast('Snapshot saved');
  } else {
    showToast('Failed to save snapshot');
  }
}

async function downloadPdf() {
  if (!currentAuditData || !currentScoreResults) return;

  try {
    await chrome.sidePanel.open({ tabId: (await getActiveTab()).id });
    setTimeout(() => {
      chrome.runtime.sendMessage({
        action: 'generatePdf',
        data: currentAuditData,
        scoreResults: currentScoreResults
      });
    }, 500);
  } catch {
    showToast('Open the full report to generate PDF');
  }
}
