export function copySummaryText(auditData, scoreResults, moduleConfig) {
  const lines = [
    'TechSEO Inspector Report',
    '========================',
    `URL: ${auditData.pageUrl}`,
    `Date: ${new Date(auditData.timestamp).toLocaleString()}`,
    `Overall Score: ${scoreResults.totalScore}/100`,
    ''
  ];

  moduleConfig.forEach(({ key, name }) => {
    const mod = scoreResults.modules[key];
    if (!mod) return;
    lines.push(`${name}: ${mod.score}/${mod.maxScore} (${mod.passCount} pass, ${mod.warnCount} warn, ${mod.failCount} fail)`);
  });

  lines.push('');
  lines.push('Key Issues:');

  let hasIssues = false;

  moduleConfig.forEach(({ key }) => {
    const mod = scoreResults.modules[key];
    if (!mod) return;
    mod.checks.forEach(check => {
      if (check.status === 'fail') {
        lines.push(`- [FAIL] ${check.name}: ${check.detail || ''}`);
        hasIssues = true;
      }
    });
  });

  moduleConfig.forEach(({ key }) => {
    const mod = scoreResults.modules[key];
    if (!mod) return;
    mod.checks.forEach(check => {
      if (check.status === 'warn') {
        lines.push(`- [WARN] ${check.name}: ${check.detail || ''}`);
        hasIssues = true;
      }
    });
  });

  if (!hasIssues) {
    lines.push('No issues found.');
  }

  lines.push('');
  lines.push('Powered by iviG Technical SEO — https://ivig.dev');

  return lines.join('\n');
}
