(function () {
  'use strict';

  function extractMetaTags() {
    const title = document.title || '';
    const descEl = document.querySelector('meta[name="description"]');
    const description = descEl ? descEl.getAttribute('content') : null;

    const ogTags = {};
    document.querySelectorAll('meta[property^="og:"]').forEach(el => {
      const prop = el.getAttribute('property');
      if (prop) ogTags[prop] = el.getAttribute('content') || '';
    });

    const twitterTags = {};
    document.querySelectorAll('meta[name^="twitter:"]').forEach(el => {
      const name = el.getAttribute('name');
      if (name) twitterTags[name] = el.getAttribute('content') || '';
    });

    const faviconEl = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');

    return {
      title,
      titleLength: title.length,
      description,
      descriptionLength: description ? description.length : 0,
      ogTags,
      twitterTags,
      url: window.location.href,
      favicon: faviconEl ? faviconEl.href : null
    };
  }

  function extractHeadings() {
    const headings = [];
    document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(el => {
      headings.push({
        level: parseInt(el.tagName[1]),
        text: el.textContent.trim(),
        isEmpty: el.textContent.trim() === ''
      });
    });
    return { headings };
  }

  function isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
      rect.top < window.innerHeight &&
      rect.bottom > 0 &&
      rect.left < window.innerWidth &&
      rect.right > 0
    );
  }

  function detectFormat(url) {
    try {
      const pathname = new URL(url, window.location.href).pathname;
      const ext = pathname.split('.').pop().split('?')[0].toLowerCase();
      if (['jpg', 'jpeg', 'png', 'webp', 'svg', 'avif', 'gif', 'bmp', 'ico'].includes(ext)) {
        return ext === 'jpeg' ? 'jpg' : ext;
      }
    } catch (e) { /* invalid URL */ }
    return null;
  }

  function getImageFormat(img) {
    // 1. What the browser actually loaded — only set once the image has loaded
    const loadedFormat = detectFormat(img.currentSrc || '');
    if (loadedFormat) return loadedFormat;

    // 2. Not loaded yet (e.g. lazy) — check <picture> sources Chrome would pick
    const picture = img.closest('picture');
    if (picture) {
      const sources = picture.querySelectorAll('source');
      for (const source of sources) {
        const type = (source.getAttribute('type') || '').toLowerCase();
        if (type === 'image/webp') return 'webp';
        if (type === 'image/avif') return 'avif';
      }
      for (const source of sources) {
        const srcset = source.getAttribute('srcset') || '';
        const srcFormat = detectFormat(srcset.split(/[\s,]/)[0]);
        if (srcFormat) return srcFormat;
      }
    }

    // 3. img's own srcset first candidate
    const srcsetFormat = detectFormat((img.getAttribute('srcset') || '').split(/[\s,]/)[0]);
    if (srcsetFormat) return srcsetFormat;

    // 4. Fallback src
    const fallback = detectFormat(img.src || img.getAttribute('data-src') || '');
    return fallback || 'unknown';
  }

  function extractImages() {
    const images = [];
    document.querySelectorAll('img').forEach(img => {
      const src = img.currentSrc || img.src || img.getAttribute('data-src') || '';
      const format = getImageFormat(img);

      const currentSrc = img.currentSrc || src;

      images.push({
        src,
        currentSrc,
        alt: img.hasAttribute('alt') ? img.alt : null,
        hasAlt: img.hasAttribute('alt'),
        altEmpty: img.hasAttribute('alt') && img.alt.trim() === '',
        width: img.hasAttribute('width') || img.style.width ? img.width : null,
        height: img.hasAttribute('height') || img.style.height ? img.height : null,
        hasDimensions: (img.hasAttribute('width') || img.style.width) && (img.hasAttribute('height') || img.style.height),
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        loading: img.getAttribute('loading'),
        format,
        fileSize: null,
        isInViewport: isElementInViewport(img)
      });
    });

    if (performance && performance.getEntriesByType) {
      const sizeByUrl = new Map();
      for (const r of performance.getEntriesByType('resource')) {
        sizeByUrl.set(r.name, r.transferSize || r.encodedBodySize || null);
      }
      for (const img of images) {
        img.fileSize = sizeByUrl.get(img.currentSrc) ?? sizeByUrl.get(img.src) ?? null;
      }
    }

    return { images, totalCount: images.length };
  }

  function extractPerformance() {
    const result = {
      ttfb: null,
      fcp: null,
      lcp: null,
      cls: null,
      domContentLoaded: null,
      loadTime: null,
      pageWeight: null,
      requestCount: null
    };

    try {
      const nav = performance.getEntriesByType('navigation')[0];
      if (nav) {
        result.ttfb = Math.round(nav.responseStart);
        result.domContentLoaded = Math.round(nav.domContentLoadedEventEnd);
        result.loadTime = nav.loadEventEnd > 0 ? Math.round(nav.loadEventEnd) : null;
      }

      const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
      if (fcpEntry) result.fcp = Math.round(fcpEntry.startTime);

      // Buffered observer entries give us LCP/CLS collected since page load
      try {
        const lcpObserver = new PerformanceObserver(() => {});
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
        const lcpEntries = lcpObserver.takeRecords();
        if (lcpEntries.length > 0) {
          result.lcp = Math.round(lcpEntries[lcpEntries.length - 1].startTime);
        }
        lcpObserver.disconnect();
      } catch (e) { /* not supported */ }

      try {
        const clsObserver = new PerformanceObserver(() => {});
        clsObserver.observe({ type: 'layout-shift', buffered: true });
        let cls = 0;
        for (const entry of clsObserver.takeRecords()) {
          if (!entry.hadRecentInput) cls += entry.value;
        }
        result.cls = Math.round(cls * 1000) / 1000;
        clsObserver.disconnect();
      } catch (e) { /* not supported */ }

      const resources = performance.getEntriesByType('resource');
      result.requestCount = resources.length + 1;
      let weight = nav ? (nav.transferSize || 0) : 0;
      for (const r of resources) {
        weight += r.transferSize || 0;
      }
      result.pageWeight = weight > 0 ? weight : null;
    } catch (e) { /* performance API unavailable */ }

    return result;
  }

  function extractLinks() {
    const pageHostname = window.location.hostname;
    const links = [];

    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href') || '';
      const resolvedHref = a.href;
      const rel = a.getAttribute('rel') || '';
      const text = a.textContent.trim();
      const hasImage = !!a.querySelector('img, svg');

      let type = 'internal';
      try {
        if (href.startsWith('#')) {
          type = 'anchor';
        } else if (href.startsWith('mailto:')) {
          type = 'mailto';
        } else if (href.startsWith('tel:')) {
          type = 'tel';
        } else if (href.startsWith('javascript:')) {
          type = 'javascript';
        } else {
          const linkUrl = new URL(resolvedHref);
          if (linkUrl.hostname !== pageHostname) {
            type = 'external';
          }
        }
      } catch (e) {
        type = 'invalid';
      }

      links.push({
        href: resolvedHref,
        rawHref: href,
        text: text || '',
        isEmpty: text === '' && !hasImage,
        type,
        rel,
        isNofollow: rel.toLowerCase().includes('nofollow'),
        isSponsored: rel.toLowerCase().includes('sponsored'),
        isUgc: rel.toLowerCase().includes('ugc')
      });
    });

    return { links };
  }

  function extractSchemaTypes(obj) {
    const types = [];
    if (!obj || typeof obj !== 'object') return types;
    if (obj['@type']) {
      if (Array.isArray(obj['@type'])) {
        types.push(...obj['@type']);
      } else {
        types.push(obj['@type']);
      }
    }
    if (Array.isArray(obj['@graph'])) {
      obj['@graph'].forEach(item => {
        if (item && item['@type']) {
          if (Array.isArray(item['@type'])) {
            types.push(...item['@type']);
          } else {
            types.push(item['@type']);
          }
        }
      });
    }
    return types;
  }

  function extractSchema() {
    const jsonLdBlocks = [];
    document.querySelectorAll('script[type="application/ld+json"]').forEach((script, i) => {
      const raw = script.textContent.trim();
      let parsed = null;
      let parseError = null;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        parseError = e.message;
      }

      jsonLdBlocks.push({
        index: i,
        raw,
        parsed,
        parseError,
        hasContext: parsed ? !!parsed['@context'] : false,
        hasType: parsed ? (!!parsed['@type'] || !!(parsed['@graph'] && parsed['@graph'].some(g => g['@type']))) : false,
        types: parsed ? extractSchemaTypes(parsed) : []
      });
    });

    const microdataItems = [];
    document.querySelectorAll('[itemscope]').forEach(el => {
      const properties = [];
      el.querySelectorAll('[itemprop]').forEach(p => {
        properties.push({
          name: p.getAttribute('itemprop'),
          value: (p.getAttribute('content') || p.textContent || '').trim().slice(0, 200)
        });
      });
      microdataItems.push({
        type: el.getAttribute('itemtype') || 'none',
        properties
      });
    });

    return { jsonLdBlocks, microdataItems };
  }

  function extractIndexability() {
    const canonicalEl = document.querySelector('link[rel="canonical"]');
    const robotsMeta = document.querySelector('meta[name="robots"]');
    const googlebotMeta = document.querySelector('meta[name="googlebot"]');
    const currentUrl = window.location.href;

    let canonicalHref = null;
    let canonicalIsSelfReferencing = null;
    if (canonicalEl) {
      canonicalHref = canonicalEl.href;
      try {
        const canonUrl = new URL(canonicalHref);
        const pageUrl = new URL(currentUrl);
        canonicalIsSelfReferencing =
          canonUrl.origin === pageUrl.origin &&
          canonUrl.pathname === pageUrl.pathname &&
          canonUrl.search === pageUrl.search;
      } catch (e) {
        canonicalIsSelfReferencing = canonicalHref === currentUrl;
      }
    }

    const robotsContent = robotsMeta ? robotsMeta.getAttribute('content') : null;
    const googlebotContent = googlebotMeta ? googlebotMeta.getAttribute('content') : null;

    return {
      canonical: canonicalHref,
      canonicalIsSelfReferencing,
      robotsContent,
      googlebotContent,
      hasNoindex: robotsContent ? /noindex/i.test(robotsContent) : false,
      hasNofollow: robotsContent ? /nofollow/i.test(robotsContent) : false,
      url: currentUrl
    };
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'runAudit') {
      try {
        const data = {
          meta: extractMetaTags(),
          headings: extractHeadings(),
          images: extractImages(),
          links: extractLinks(),
          schema: extractSchema(),
          indexability: extractIndexability(),
          performance: extractPerformance(),
          pageUrl: window.location.href,
          timestamp: Date.now()
        };
        sendResponse({ success: true, data });
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
    }
    return true;
  });
})();
