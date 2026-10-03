const headerCache = new Map();
const auditCache = new Map();
const auditInProgress = new Set();
const focusModuleMap = new Map();

chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (details.type === 'main_frame') {
      const xRobots = details.responseHeaders?.find(
        h => h.name.toLowerCase() === 'x-robots-tag'
      );
      headerCache.set(details.tabId, xRobots ? xRobots.value : null);
    }
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
);

chrome.tabs.onRemoved.addListener((tabId) => {
  headerCache.delete(tabId);
  auditCache.delete(tabId);
  focusModuleMap.delete(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  // Any navigation or reload invalidates cached audit results
  if (changeInfo.url || changeInfo.status === 'loading') {
    auditCache.delete(tabId);
  }
});

async function ensureContentScript(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { action: 'ping' });
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/content-script.js']
    });
  }
}

function parseRobotsRules(robotsTxt, pageUrl) {
  try {
    const url = new URL(pageUrl);
    const path = url.pathname + url.search;
    const lines = robotsTxt.split('\n');
    let isRelevantAgent = false;
    let isBlocked = false;
    let bestAllowLength = -1;
    let bestDisallowLength = -1;

    for (const rawLine of lines) {
      const line = rawLine.split('#')[0].trim();
      if (!line) continue;

      const lower = line.toLowerCase();
      if (lower.startsWith('user-agent:')) {
        const agent = line.slice(11).trim().toLowerCase();
        isRelevantAgent = agent === '*' || agent === 'googlebot';
      } else if (isRelevantAgent) {
        if (lower.startsWith('disallow:')) {
          const rule = line.slice(9).trim();
          if (rule && path.startsWith(rule) && rule.length > bestDisallowLength) {
            bestDisallowLength = rule.length;
          }
        } else if (lower.startsWith('allow:')) {
          const rule = line.slice(6).trim();
          if (rule && path.startsWith(rule) && rule.length > bestAllowLength) {
            bestAllowLength = rule.length;
          }
        }
      }
    }

    if (bestDisallowLength === -1) return false;
    if (bestAllowLength > bestDisallowLength) return false;
    return true;
  } catch {
    return null;
  }
}

async function checkRobotsTxt(pageUrl) {
  try {
    const url = new URL(pageUrl);
    const robotsUrl = `${url.protocol}//${url.host}/robots.txt`;
    const response = await fetch(robotsUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    });
    if (!response.ok) {
      return { accessible: false, status: response.status, blocked: null };
    }
    const text = await response.text();
    return {
      accessible: true,
      content: text.slice(0, 5000),
      blocked: parseRobotsRules(text, pageUrl)
    };
  } catch (e) {
    return { accessible: false, error: e.message, blocked: null };
  }
}

async function checkBrokenLinks(links, pageUrl) {
  // Dedupe first so the per-type caps cover as many distinct URLs as possible
  const seen = new Set();
  const deduped = links.filter(l => {
    if (l.type !== 'internal' && l.type !== 'external') return false;
    if (seen.has(l.href)) return false;
    seen.add(l.href);
    return true;
  });
  const unique = [
    ...deduped.filter(l => l.type === 'internal').slice(0, 30),
    ...deduped.filter(l => l.type === 'external').slice(0, 20)
  ];

  let brokenCount = 0;
  const brokenUrls = [];

  const results = await Promise.allSettled(
    unique.map(async (link) => {
      try {
        const isInternal = link.type === 'internal';
        const response = await fetch(link.href, {
          method: 'HEAD',
          mode: isInternal ? 'same-origin' : 'no-cors',
          signal: AbortSignal.timeout(3000),
          redirect: 'follow'
        });
        if (isInternal && response.status >= 400) {
          return { href: link.href, broken: true, status: response.status };
        }
        return { href: link.href, broken: false };
      } catch {
        return { href: link.href, broken: false, unknown: true };
      }
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.broken) {
      brokenCount++;
      brokenUrls.push(result.value.href);
    }
  }

  return { brokenCount, brokenUrls, checkedCount: unique.length };
}

async function handleAuditRequest(tabId) {
  // Start the robots.txt fetch immediately, in parallel with DOM extraction
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  const robotsPromise = tab?.url && /^https?:/.test(tab.url)
    ? checkRobotsTxt(tab.url)
    : null;

  await ensureContentScript(tabId);

  const contentResponse = await chrome.tabs.sendMessage(tabId, { action: 'runAudit' });
  if (!contentResponse || !contentResponse.success) {
    return { success: false, error: contentResponse?.error || 'Content script failed' };
  }

  const data = contentResponse.data;

  data.indexability.xRobotsTag = headerCache.get(tabId) || null;

  const robotsResult = await (robotsPromise || checkRobotsTxt(data.pageUrl));
  if (robotsResult) {
    data.indexability.robotsTxtAccessible = robotsResult.accessible;
    data.indexability.robotsTxtBlocked = robotsResult.blocked;
    data.indexability.robotsTxtContent = robotsResult.content || null;
  }

  auditCache.set(tabId, data);

  // Broken-link checks hit the network and are slow — run them after results
  // are returned, then push an update to any open popup/panel.
  checkBrokenLinks(data.links.links, data.pageUrl)
    .then((res) => {
      const cached = auditCache.get(tabId);
      if (!cached || cached.timestamp !== data.timestamp) return;
      cached.links.brokenCount = res.brokenCount;
      cached.links.brokenUrls = res.brokenUrls;
      cached.links.checkedCount = res.checkedCount;
      chrome.runtime.sendMessage({ action: 'auditUpdated', tabId, data: cached }).catch(() => {});
    })
    .catch(() => {});

  return { success: true, data };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'getAuditData') {
    handleAuditRequest(msg.tabId)
      .then(result => sendResponse(result))
      .catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  }

  if (msg.action === 'startAudit') {
    const tabId = msg.tabId;
    if (auditInProgress.has(tabId)) {
      sendResponse({ success: true, status: 'already_running' });
      return true;
    }
    auditInProgress.add(tabId);
    auditCache.delete(tabId);
    sendResponse({ success: true, status: 'started' });
    handleAuditRequest(tabId)
      .then(result => {
        auditInProgress.delete(tabId);
        if (result.success) {
          chrome.runtime.sendMessage({
            action: 'auditComplete',
            tabId,
            data: result.data
          }).catch(() => {});
        } else {
          chrome.runtime.sendMessage({
            action: 'auditFailed',
            tabId,
            error: result.error
          }).catch(() => {});
        }
      })
      .catch(e => {
        auditInProgress.delete(tabId);
        chrome.runtime.sendMessage({
          action: 'auditFailed',
          tabId,
          error: e.message
        }).catch(() => {});
      });
    return true;
  }

  if (msg.action === 'setFocusModule') {
    focusModuleMap.set(msg.tabId, msg.module);
    chrome.runtime.sendMessage({
      action: 'focusModule',
      tabId: msg.tabId,
      module: msg.module
    }).catch(() => {});
    sendResponse({ success: true });
    return true;
  }

  if (msg.action === 'getFocusModule') {
    const module = focusModuleMap.get(msg.tabId) || null;
    focusModuleMap.delete(msg.tabId);
    sendResponse({ module });
    return true;
  }

  if (msg.action === 'getAuditStatus') {
    const tabId = msg.tabId;
    const inProgress = auditInProgress.has(tabId);
    const data = auditCache.get(tabId);
    sendResponse({ inProgress, hasData: !!data, data: data || null });
    return true;
  }

  if (msg.action === 'getLatestAuditData') {
    const data = auditCache.get(msg.tabId);
    sendResponse({ success: !!data, data: data || null });
    return true;
  }

  if (msg.action === 'saveSnapshot') {
    chrome.storage.local.get(['snapshots'], (result) => {
      const snapshots = result.snapshots || [];
      snapshots.unshift(msg.snapshot);
      if (snapshots.length > 50) snapshots.length = 50;
      chrome.storage.local.set({ snapshots }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }

  if (msg.action === 'getSnapshots') {
    chrome.storage.local.get(['snapshots'], (result) => {
      const snapshots = result.snapshots || [];
      const filtered = msg.url
        ? snapshots.filter(s => {
            try {
              const sUrl = new URL(s.url);
              const mUrl = new URL(msg.url);
              return sUrl.origin === mUrl.origin && sUrl.pathname === mUrl.pathname;
            } catch { return false; }
          })
        : snapshots;
      sendResponse({ success: true, snapshots: filtered });
    });
    return true;
  }

  if (msg.action === 'deleteSnapshot') {
    chrome.storage.local.get(['snapshots'], (result) => {
      const snapshots = (result.snapshots || []).filter(s => s.id !== msg.id);
      chrome.storage.local.set({ snapshots }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }

  if (msg.action === 'ping') {
    sendResponse({ pong: true });
    return true;
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  if (command === 'run-audit') {
    chrome.runtime.sendMessage({ action: 'triggerAudit', tabId: tab.id });
  }

  if (command === 'toggle-panel') {
    try {
      await chrome.sidePanel.open({ tabId: tab.id });
    } catch {
      // panel may already be open
    }
  }
});

chrome.storage.local.get(['snapshots'], (result) => {
  const snapshots = result.snapshots || [];
  const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
  const pruned = snapshots.filter(s => s.timestamp > ninetyDaysAgo);
  if (pruned.length !== snapshots.length) {
    chrome.storage.local.set({ snapshots: pruned });
  }
});
