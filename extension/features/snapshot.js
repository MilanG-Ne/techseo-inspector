export async function getSnapshotsForUrl(url) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'getSnapshots', url }, (response) => {
      resolve(response?.snapshots || []);
    });
  });
}

export async function saveSnapshot(auditData, scoreResults) {
  const snapshot = {
    id: `snap_${Date.now()}`,
    url: auditData.pageUrl,
    timestamp: auditData.timestamp,
    totalScore: scoreResults.totalScore,
    modules: scoreResults.modules
  };

  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'saveSnapshot', snapshot }, (response) => {
      resolve(response?.success || false);
    });
  });
}

export async function deleteSnapshot(id) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'deleteSnapshot', id }, (response) => {
      resolve(response?.success || false);
    });
  });
}

export function compareSnapshots(currentResults, previousSnapshot) {
  const diff = {
    totalScoreChange: currentResults.totalScore - previousSnapshot.totalScore,
    modules: {}
  };

  for (const key of Object.keys(currentResults.modules)) {
    const cur = currentResults.modules[key];
    const prev = previousSnapshot.modules?.[key];

    if (!prev) {
      diff.modules[key] = {
        scoreChange: cur.score,
        direction: 'new',
        checks: cur.checks.map(c => ({ ...c, change: 'new' }))
      };
      continue;
    }

    const moduleChange = cur.score - prev.score;
    const checkDiffs = [];

    for (const curCheck of cur.checks) {
      const prevCheck = prev.checks?.find(c => c.name === curCheck.name);
      if (!prevCheck) {
        checkDiffs.push({ ...curCheck, change: 'new' });
      } else if (curCheck.status !== prevCheck.status) {
        const improved = statusRank(curCheck.status) > statusRank(prevCheck.status);
        checkDiffs.push({
          ...curCheck,
          previousStatus: prevCheck.status,
          change: improved ? 'improved' : 'regressed'
        });
      } else {
        checkDiffs.push({ ...curCheck, change: 'unchanged' });
      }
    }

    diff.modules[key] = {
      scoreChange: moduleChange,
      direction: moduleChange > 0 ? 'improved' : moduleChange < 0 ? 'regressed' : 'unchanged',
      checks: checkDiffs
    };
  }

  return diff;
}

function statusRank(status) {
  return { fail: 0, warn: 1, pass: 2 }[status] ?? -1;
}
