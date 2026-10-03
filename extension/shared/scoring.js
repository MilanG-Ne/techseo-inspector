// Scoring engine for the TechSEO Inspector extension.
// Takes raw audit data from the six page modules and produces a 0-100 score
// plus per-check pass/warn/fail/na statuses.
//
// Status semantics:
//   pass -> full maxPoints
//   warn -> 50% of maxPoints
//   fail -> 0 points
//   na   -> not applicable; earns 0 and is excluded from the module maxScore

export const MODULE_WEIGHTS = Object.freeze({
  meta: 25,
  headings: 15,
  images: 15,
  links: 10,
  schema: 15,
  indexability: 20,
  performance: 15,
});

export const KNOWN_SCHEMA_TYPES = new Set([
  'Article', 'NewsArticle', 'BlogPosting', 'TechArticle',
  'Product', 'Offer', 'AggregateOffer', 'Review', 'AggregateRating',
  'Organization', 'LocalBusiness', 'Restaurant', 'Store', 'Person',
  'WebPage', 'WebSite', 'SearchAction', 'BreadcrumbList', 'ListItem', 'ItemList',
  'FAQPage', 'Question', 'Answer', 'HowTo', 'HowToStep', 'HowToSection',
  'Event', 'Course', 'Recipe', 'VideoObject', 'ImageObject', 'CreativeWork',
  'SoftwareApplication', 'JobPosting', 'MedicalCondition',
  'CollectionPage', 'AboutPage', 'ContactPage', 'Service', 'FinancialProduct',
  'Dataset', 'Book', 'Movie', 'MusicRecording', 'Podcast',
  'SpeakableSpecification', 'ClaimReview', 'FactCheck',
]);

// --- small helpers -----------------------------------------------------------

const check = (name, status, maxPoints, detail) => ({ name, status, maxPoints, detail });

const has = (v) => typeof v === 'string' ? v.trim().length > 0 : v != null && v !== '';

const pct = (count, total) => total > 0 ? (count / total) * 100 : 0;

function round1(n) {
  return Math.round(n * 10) / 10;
}

function earnedPoints(c) {
  switch (c.status) {
    case 'pass': return c.maxPoints;
    case 'warn': return c.maxPoints * 0.5;
    default: return 0; // fail, na
  }
}

// Normalize a schema type token like "http://schema.org/Article" or
// "schema:Article" down to the bare "Article".
function normalizeType(t) {
  if (typeof t !== 'string') return '';
  let s = t.trim();
  if (s.includes('/')) s = s.split('/').filter(Boolean).pop() || s;
  if (s.includes(':')) s = s.split(':').pop() || s;
  return s;
}

// --- meta --------------------------------------------------------------------

export function scoreMeta(metaData = {}) {
  const title = metaData.title;
  const description = metaData.description;
  const titleLen = metaData.titleLength != null
    ? metaData.titleLength
    : (typeof title === 'string' ? title.length : 0);
  const descLen = metaData.descriptionLength != null
    ? metaData.descriptionLength
    : (typeof description === 'string' ? description.length : 0);
  const og = metaData.ogTags || {};
  const tw = metaData.twitterTags || {};

  const checks = [];

  checks.push(check('Title exists', has(title) ? 'pass' : 'fail', 3,
    has(title) ? 'Title tag present' : 'No <title> tag found'));

  let titleStatus;
  if (titleLen >= 30 && titleLen <= 60) titleStatus = 'pass';
  else if ((titleLen >= 20 && titleLen <= 29) || (titleLen >= 61 && titleLen <= 70)) titleStatus = 'warn';
  else titleStatus = 'fail';
  checks.push(check('Title length', titleStatus, 4, `${titleLen} characters (ideal 30-60)`));

  checks.push(check('Description exists', has(description) ? 'pass' : 'fail', 3,
    has(description) ? 'Meta description present' : 'No meta description found'));

  let descStatus;
  if (descLen >= 120 && descLen <= 160) descStatus = 'pass';
  else if ((descLen >= 80 && descLen <= 119) || (descLen >= 161 && descLen <= 200)) descStatus = 'warn';
  else descStatus = 'fail';
  checks.push(check('Description length', descStatus, 4, `${descLen} characters (ideal 120-160)`));

  const ogTitle = has(og['og:title']);
  const ogImage = has(og['og:image']);

  checks.push(check('og:title', ogTitle ? 'pass' : 'fail', 2,
    ogTitle ? 'Present' : 'Missing og:title'));
  checks.push(check('og:description', has(og['og:description']) ? 'pass' : 'fail', 2,
    has(og['og:description']) ? 'Present' : 'Missing og:description'));
  checks.push(check('og:image', ogImage ? 'pass' : 'fail', 2,
    ogImage ? 'Present' : 'Missing og:image'));
  checks.push(check('og:url', has(og['og:url']) ? 'pass' : 'fail', 1,
    has(og['og:url']) ? 'Present' : 'Missing og:url'));
  checks.push(check('og:type', has(og['og:type']) ? 'pass' : 'fail', 1,
    has(og['og:type']) ? 'Present' : 'Missing og:type'));

  checks.push(check('twitter:card', has(tw['twitter:card']) ? 'pass' : 'fail', 1,
    has(tw['twitter:card']) ? 'Present' : 'Missing twitter:card'));

  const twTitleOk = has(tw['twitter:title']) || ogTitle;
  checks.push(check('twitter:title', twTitleOk ? 'pass' : 'fail', 1,
    has(tw['twitter:title']) ? 'Present'
      : ogTitle ? 'Falls back to og:title' : 'Missing twitter:title'));

  const twImageOk = has(tw['twitter:image']) || ogImage;
  checks.push(check('twitter:image', twImageOk ? 'pass' : 'fail', 1,
    has(tw['twitter:image']) ? 'Present'
      : ogImage ? 'Falls back to og:image' : 'Missing twitter:image'));

  return checks;
}

// --- headings ----------------------------------------------------------------

export function scoreHeadings(headingsData = {}) {
  const headings = Array.isArray(headingsData.headings) ? headingsData.headings : [];
  const checks = [];

  const h1Count = headings.filter((h) => h && h.level === 1).length;
  let h1Status;
  if (h1Count === 1) h1Status = 'pass';
  else h1Status = 'fail';
  checks.push(check('H1 exists', h1Status, 5,
    `${h1Count} H1 heading${h1Count === 1 ? '' : 's'} found`));

  let skips = 0;
  for (let i = 1; i < headings.length; i++) {
    const prev = headings[i - 1];
    const cur = headings[i];
    if (!prev || !cur) continue;
    if (cur.level - prev.level > 1) skips++;
  }
  let hierStatus;
  if (skips === 0) hierStatus = 'pass';
  else if (skips === 1) hierStatus = 'warn';
  else hierStatus = 'fail';
  checks.push(check('Heading hierarchy', hierStatus, 4,
    `${skips} skipped level${skips === 1 ? '' : 's'}`));

  const emptyCount = headings.filter((h) => h && h.isEmpty).length;
  checks.push(check('No empty headings', emptyCount === 0 ? 'pass' : 'fail', 3,
    `${emptyCount} empty heading${emptyCount === 1 ? '' : 's'}`));

  const count = headings.length;
  let countStatus;
  if (count >= 2 && count <= 30) countStatus = 'pass';
  else if (count === 1 || (count >= 31 && count <= 50)) countStatus = 'warn';
  else countStatus = 'fail';
  checks.push(check('Reasonable heading count', countStatus, 3, `${count} headings`));

  return checks;
}

// --- images ------------------------------------------------------------------

export function scoreImages(imagesData = {}) {
  const images = Array.isArray(imagesData.images) ? imagesData.images : [];
  const total = imagesData.totalCount != null ? imagesData.totalCount : images.length;

  if (total === 0 || images.length === 0) {
    return [
      check('Alt text coverage', 'pass', 5, 'No images found'),
      check('No empty alt on content images', 'pass', 3, 'No images found'),
      check('Dimensions specified', 'pass', 3, 'No images found'),
      check('Modern format usage', 'pass', 2, 'No images found'),
      check('Lazy loading', 'pass', 2, 'No images found'),
    ];
  }

  const n = images.length;
  const checks = [];

  const withAlt = images.filter((i) => i && i.hasAlt).length;
  const altPct = pct(withAlt, n);
  let altStatus;
  if (withAlt === n) altStatus = 'pass';
  else if (altPct >= 80) altStatus = 'warn';
  else altStatus = 'fail';
  checks.push(check('Alt text coverage', altStatus, 5,
    `${withAlt}/${n} images have alt (${Math.round(altPct)}%)`));

  const emptyAlt = images.filter((i) => i && i.altEmpty).length;
  checks.push(check('No empty alt on content images', emptyAlt === 0 ? 'pass' : 'fail', 3,
    `${emptyAlt} image${emptyAlt === 1 ? '' : 's'} with empty alt`));

  const withDim = images.filter((i) => i && i.hasDimensions).length;
  const dimPct = pct(withDim, n);
  let dimStatus;
  if (withDim === n) dimStatus = 'pass';
  else if (dimPct >= 80) dimStatus = 'warn';
  else dimStatus = 'fail';
  checks.push(check('Dimensions specified', dimStatus, 3,
    `${withDim}/${n} images have width/height (${Math.round(dimPct)}%)`));

  const rasterImages = images.filter((i) => {
    const f = i && typeof i.format === 'string' ? i.format.toLowerCase() : '';
    return f !== 'svg';
  });
  const rasterCount = rasterImages.length;
  if (rasterCount === 0) {
    checks.push(check('Modern format usage', 'pass', 2, 'All images are SVG (vector)'));
  } else {
    const modern = rasterImages.filter((i) => {
      const f = i && typeof i.format === 'string' ? i.format.toLowerCase() : '';
      return f === 'webp' || f === 'avif';
    }).length;
    const modernPct = pct(modern, rasterCount);
    let modernStatus;
    if (modernPct > 50) modernStatus = 'pass';
    else if (modernPct >= 20) modernStatus = 'warn';
    else modernStatus = 'fail';
    checks.push(check('Modern format usage', modernStatus, 2,
      `${modern}/${rasterCount} raster images use WebP/AVIF (${Math.round(modernPct)}%)`));
  }

  const nonViewport = images.filter((i) => i && !i.isInViewport);
  let lazyStatus;
  let lazyDetail;
  if (nonViewport.length === 0) {
    lazyStatus = 'pass';
    lazyDetail = 'All images are in the viewport';
  } else {
    const lazy = nonViewport.filter((i) => i.loading === 'lazy').length;
    if (lazy === nonViewport.length) lazyStatus = 'pass';
    else if (lazy > 0) lazyStatus = 'warn';
    else lazyStatus = 'fail';
    lazyDetail = `${lazy}/${nonViewport.length} below-fold images lazy-loaded`;
  }
  checks.push(check('Lazy loading', lazyStatus, 2, lazyDetail));

  return checks;
}

// --- links -------------------------------------------------------------------

export function scoreLinks(linksData = {}) {
  const links = Array.isArray(linksData.links) ? linksData.links : [];
  const checks = [];

  const emptyCount = links.filter((l) => l && l.isEmpty).length;
  checks.push(check('No empty anchor text', emptyCount === 0 ? 'pass' : 'fail', 3,
    `${emptyCount} link${emptyCount === 1 ? '' : 's'} with empty anchor text`));

  const internal = links.filter((l) => l && l.type === 'internal').length;
  let internalStatus;
  if (internal >= 3) internalStatus = 'pass';
  else if (internal >= 1) internalStatus = 'warn';
  else internalStatus = 'fail';
  checks.push(check('Internal links present', internalStatus, 2,
    `${internal} internal link${internal === 1 ? '' : 's'}`));

  if (linksData.brokenCount == null) {
    checks.push(check('Broken links', 'pass', 3, 'Not checked'));
  } else {
    const broken = linksData.brokenCount;
    let brokenStatus;
    if (broken === 0) brokenStatus = 'pass';
    else if (broken <= 2) brokenStatus = 'warn';
    else brokenStatus = 'fail';
    checks.push(check('Broken links', brokenStatus, 3,
      `${broken} broken link${broken === 1 ? '' : 's'}`));
  }

  const external = links.filter((l) => l && l.type === 'external').length;
  let externalStatus;
  if (external < 50) externalStatus = 'pass';
  else if (external <= 100) externalStatus = 'warn';
  else externalStatus = 'fail';
  checks.push(check('Reasonable external links', externalStatus, 2,
    `${external} external link${external === 1 ? '' : 's'}`));

  return checks;
}

// --- schema ------------------------------------------------------------------

export function scoreSchema(schemaData = {}) {
  const blocks = Array.isArray(schemaData.jsonLdBlocks) ? schemaData.jsonLdBlocks : [];
  const micro = Array.isArray(schemaData.microdataItems) ? schemaData.microdataItems : [];
  const checks = [];

  const hasStructuredData = blocks.length > 0 || micro.length > 0;
  checks.push(check('JSON-LD present', hasStructuredData ? 'pass' : 'fail', 5,
    hasStructuredData
      ? `${blocks.length} JSON-LD block(s), ${micro.length} microdata item(s)`
      : 'No structured data found'));

  if (blocks.length === 0) {
    checks.push(check('Valid JSON syntax', 'pass', 4, 'No JSON-LD blocks'));
  } else {
    const withError = blocks.filter((b) => b && b.parseError).length;
    checks.push(check('Valid JSON syntax', withError === 0 ? 'pass' : 'fail', 4,
      withError === 0 ? 'All blocks parsed' : `${withError} block(s) failed to parse`));
  }

  if (blocks.length === 0) {
    checks.push(check('Has @context and @type', 'na', 3, 'No JSON-LD blocks'));
  } else {
    const withBoth = blocks.filter((b) => b && b.hasContext && b.hasType).length;
    let ctxStatus;
    if (withBoth === blocks.length) ctxStatus = 'pass';
    else if (withBoth > 0) ctxStatus = 'warn';
    else ctxStatus = 'fail';
    checks.push(check('Has @context and @type', ctxStatus, 3,
      `${withBoth}/${blocks.length} block(s) have @context and @type`));
  }

  if (blocks.length === 0) {
    checks.push(check('Recognized schema.org type', 'na', 3, 'No JSON-LD blocks'));
  } else {
    const allTypes = blocks.flatMap((b) => Array.isArray(b && b.types) ? b.types : []);
    if (allTypes.length === 0) {
      checks.push(check('Recognized schema.org type', 'fail', 3, 'No @type values found'));
    } else {
      const recognized = allTypes.filter((t) => KNOWN_SCHEMA_TYPES.has(normalizeType(t)));
      let typeStatus;
      if (recognized.length === allTypes.length) typeStatus = 'pass';
      else if (recognized.length > 0) typeStatus = 'warn';
      else typeStatus = 'fail';
      checks.push(check('Recognized schema.org type', typeStatus, 3,
        `${recognized.length}/${allTypes.length} type(s) recognized`));
    }
  }

  return checks;
}

// --- indexability ------------------------------------------------------------

export function scoreIndexability(indexData = {}) {
  const checks = [];
  const xrt = typeof indexData.xRobotsTag === 'string' ? indexData.xRobotsTag.toLowerCase() : '';
  const robots = typeof indexData.robotsContent === 'string' ? indexData.robotsContent.toLowerCase() : null;

  const noindex = Boolean(indexData.hasNoindex) || xrt.includes('noindex');
  checks.push(check('No noindex', noindex ? 'fail' : 'pass', 6,
    noindex ? 'Page is set to noindex' : 'Page is indexable'));

  const canonicalOk = has(indexData.canonical);
  checks.push(check('Canonical present', canonicalOk ? 'pass' : 'fail', 4,
    canonicalOk ? `Canonical: ${indexData.canonical}` : 'No canonical URL'));

  if (!canonicalOk) {
    checks.push(check('Canonical self-referencing', 'na', 3, 'No canonical to evaluate'));
  } else if (indexData.canonicalIsSelfReferencing) {
    checks.push(check('Canonical self-referencing', 'pass', 3, 'Canonical points to this page'));
  } else {
    checks.push(check('Canonical self-referencing', 'warn', 3, 'Canonical points to a different URL'));
  }

  let robotsStatus;
  let robotsDetail;
  if (robots !== null && (robots.includes('noindex') || robots.includes('nofollow'))) {
    robotsStatus = 'fail';
    robotsDetail = `Robots meta: "${indexData.robotsContent}"`;
  } else if (robots === null || robots === '' || robots.includes('index')) {
    robotsStatus = 'pass';
    robotsDetail = robots ? `Robots meta: "${indexData.robotsContent}"` : 'No restrictive robots meta';
  } else {
    robotsStatus = 'warn';
    robotsDetail = `Non-standard directives: "${indexData.robotsContent}"`;
  }
  checks.push(check('Robots meta sensible', robotsStatus, 4, robotsDetail));

  const xrtNoindex = xrt.includes('noindex');
  checks.push(check('X-Robots-Tag clean', xrtNoindex ? 'fail' : 'pass', 3,
    xrtNoindex ? `X-Robots-Tag: "${indexData.xRobotsTag}"`
      : (xrt ? `X-Robots-Tag: "${indexData.xRobotsTag}"` : 'No X-Robots-Tag noindex')));

  return checks;
}

// --- performance -------------------------------------------------------------

export function scorePerformance(perfData = {}) {
  const p = perfData || {};
  const checks = [];

  // Thresholds follow Google's Core Web Vitals good/needs-improvement bands
  const banded = (name, points, value, goodMax, warnMax, fmt) => {
    if (value == null) {
      checks.push(check(name, 'na', points, 'Not measurable on this page'));
      return;
    }
    let status;
    if (value <= goodMax) status = 'pass';
    else if (value <= warnMax) status = 'warn';
    else status = 'fail';
    checks.push(check(name, status, points, fmt(value)));
  };

  const ms = (v) => v >= 1000 ? `${(v / 1000).toFixed(2)} s` : `${Math.round(v)} ms`;

  banded('Server response time (TTFB)', 3, p.ttfb, 800, 1800,
    (v) => `${ms(v)} (good < 800 ms)`);
  banded('First Contentful Paint', 3, p.fcp, 1800, 3000,
    (v) => `${ms(v)} (good < 1.8 s)`);
  banded('Largest Contentful Paint', 4, p.lcp, 2500, 4000,
    (v) => `${ms(v)} (good < 2.5 s)`);
  banded('Cumulative Layout Shift', 3, p.cls, 0.1, 0.25,
    (v) => `${v} (good < 0.1)`);
  banded('Page weight', 2, p.pageWeight, 2 * 1024 * 1024, 4 * 1024 * 1024,
    (v) => `${(v / (1024 * 1024)).toFixed(1)} MB transferred (good < 2 MB)`);

  return checks;
}

// --- aggregate ---------------------------------------------------------------

const SCORERS = {
  meta: scoreMeta,
  headings: scoreHeadings,
  images: scoreImages,
  links: scoreLinks,
  schema: scoreSchema,
  indexability: scoreIndexability,
  performance: scorePerformance,
};

export function calculateScore(auditData = {}) {
  const modules = {};
  let totalEarned = 0;
  let totalMax = 0;

  for (const key of Object.keys(SCORERS)) {
    const scorer = SCORERS[key];
    const data = (auditData && auditData[key]) || {};
    const checks = scorer(data);

    let score = 0;
    let maxScore = 0;
    let passCount = 0;
    let warnCount = 0;
    let failCount = 0;

    for (const c of checks) {
      score += earnedPoints(c);
      if (c.status !== 'na') maxScore += c.maxPoints;
      if (c.status === 'pass') passCount++;
      else if (c.status === 'warn') warnCount++;
      else if (c.status === 'fail') failCount++;
    }

    score = round1(score);
    modules[key] = { score, maxScore, checks, passCount, warnCount, failCount };
    totalEarned += score;
    totalMax += maxScore;
  }

  const totalScore = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;

  return { totalScore, modules };
}

export default calculateScore;
