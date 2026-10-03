function svg(size, inner) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}

// Status icons
export function iconCheck(size = 20) {
  return svg(size, `<polyline points="20 6 9 17 4 12"/>`);
}

export function iconX(size = 20) {
  return svg(size, `<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`);
}

export function iconAlertTriangle(size = 20) {
  return svg(size, `<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>`);
}

export function iconInfo(size = 20) {
  return svg(size, `<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>`);
}

export function iconCheckCircle(size = 20) {
  return svg(size, `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>`);
}

// Navigation
export function iconChevronDown(size = 20) {
  return svg(size, `<polyline points="6 9 12 15 18 9"/>`);
}

export function iconChevronRight(size = 20) {
  return svg(size, `<polyline points="9 18 15 12 9 6"/>`);
}

// Module icons
export function iconFileText(size = 20) {
  return svg(size, `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>`);
}

export function iconHeading(size = 20) {
  return svg(size, `<line x1="4" y1="6" x2="4" y2="18"/><line x1="20" y1="6" x2="20" y2="18"/><line x1="4" y1="12" x2="20" y2="12"/>`);
}

export function iconImage(size = 20) {
  return svg(size, `<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>`);
}

export function iconLink(size = 20) {
  return svg(size, `<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>`);
}

export function iconCode(size = 20) {
  return svg(size, `<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>`);
}

export function iconShield(size = 20) {
  return svg(size, `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>`);
}

export function iconSearch(size = 20) {
  return svg(size, `<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>`);
}

export function iconZap(size = 20) {
  return svg(size, `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>`);
}

// Action icons
export function iconCopy(size = 20) {
  return svg(size, `<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>`);
}

export function iconDownload(size = 20) {
  return svg(size, `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>`);
}

export function iconCamera(size = 20) {
  return svg(size, `<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>`);
}

export function iconRefresh(size = 20) {
  return svg(size, `<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>`);
}

// Link type icons
export function iconExternalLink(size = 20) {
  return svg(size, `<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>`);
}

export function iconMail(size = 20) {
  return svg(size, `<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22 6 12 13 2 6"/>`);
}

export function iconPhone(size = 20) {
  return svg(size, `<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>`);
}

// Comparison icons
export function iconTrendingUp(size = 20) {
  return svg(size, `<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>`);
}

export function iconTrendingDown(size = 20) {
  return svg(size, `<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>`);
}

export function iconMinus(size = 20) {
  return svg(size, `<line x1="5" y1="12" x2="19" y2="12"/>`);
}

// Misc
export function iconGlobe(size = 20) {
  return svg(size, `<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>`);
}

export function iconEye(size = 20) {
  return svg(size, `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`);
}

export function iconEyeOff(size = 20) {
  return svg(size, `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`);
}
