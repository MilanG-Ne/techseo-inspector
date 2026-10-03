// Shared utility functions for the TechSEO Inspector Chrome extension.

export function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function truncate(str, maxLen) {
  if (str == null) return '';
  const s = String(str);
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen) + '...';
}

export function formatBytes(bytes) {
  if (bytes == null || bytes === 0) return 'N/A';
  const KB = 1024;
  const MB = KB * 1024;
  if (bytes >= MB) return (bytes / MB).toFixed(1) + ' MB';
  if (bytes >= KB) return (bytes / KB).toFixed(1) + ' KB';
  return bytes + ' B';
}

export function getHostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function isInternal(linkUrl, pageUrl) {
  try {
    return new URL(linkUrl).origin === new URL(pageUrl).origin;
  } catch {
    return false;
  }
}

export function classifyLinkType(href) {
  if (href == null) return 'external';
  const h = String(href).trim();
  const lower = h.toLowerCase();
  if (lower.startsWith('mailto:')) return 'mailto';
  if (lower.startsWith('tel:')) return 'tel';
  if (lower.startsWith('javascript:')) return 'javascript';
  if (h.startsWith('#')) return 'anchor';
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(h)) return 'external';
  return 'internal';
}

export function debounce(fn, ms) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

export function formatDate(timestamp) {
  return new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function sendMessage(action, data) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action, ...data }, (response) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err.message));
        return;
      }
      resolve(response);
    });
  });
}

export function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0]);
    });
  });
}

export function createElement(tag, attrs, children) {
  const el = document.createElement(tag);

  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (value == null) continue;
      if (key === 'class' || key === 'className') {
        el.className = value;
      } else if (key === 'style') {
        el.style.cssText = value;
      } else if (key === 'dataset' && typeof value === 'object') {
        Object.assign(el.dataset, value);
      } else if (key.startsWith('on') && typeof value === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (key === 'html') {
        el.innerHTML = value;
      } else {
        el.setAttribute(key, value);
      }
    }
  }

  appendChildren(el, children);
  return el;
}

function appendChildren(el, children) {
  if (children == null) return;
  if (Array.isArray(children)) {
    for (const child of children) appendChildren(el, child);
    return;
  }
  if (children instanceof Node) {
    el.appendChild(children);
    return;
  }
  el.appendChild(document.createTextNode(String(children)));
}

export function getScoreClass(score) {
  if (score >= 80) return 'good';
  if (score >= 50) return 'ok';
  return 'bad';
}

export function getStatusIcon(status, size = 16) {
  const common = `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
  switch (status) {
    case 'pass':
      return `<svg ${common} stroke="var(--success)"><polyline points="20 6 9 17 4 12"/></svg>`;
    case 'warn':
      return `<svg ${common} stroke="var(--warning)"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    case 'fail':
      return `<svg ${common} stroke="var(--error)"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    default:
      return '';
  }
}

export function showToast(message, duration = 2000) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('show'));
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
