// ChatGPT Usage Monitor - LGPD Safe Version

const USAGE_ENDPOINT = 'https://chatgpt.com/backend-api/wham/usage';
const AUTH_ENDPOINT = 'https://chatgpt.com/api/auth/session';
const POLL_INTERVAL = 5;
const DATA_RETENTION_DAYS = 30;

async function getAccessToken() {
  const response = await fetch(AUTH_ENDPOINT, {
    credentials: 'include',
    headers: { 'Accept': 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`Auth failed: HTTP ${response.status}`);
  }

  const session = await response.json();
  if (!session.accessToken) {
    throw new Error('Não autenticado');
  }

  return session.accessToken;
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('ChatGPT Usage Monitor instalado');
  fetchUsageData();
  chrome.alarms.create('fetchUsage', { periodInMinutes: POLL_INTERVAL });
  cleanOldData();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'fetchUsage') {
    fetchUsageData();
    cleanOldData();
  }
});

async function fetchUsageData() {
  try {
    const accessToken = await getAccessToken();

    const response = await fetch(USAGE_ENDPOINT, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    const usageData = {
      ...data,
      last_updated: new Date().toISOString()
    };

    await chrome.storage.local.set({ usageData });
    updateBadge(usageData);
    syncToDashboard(usageData);
  } catch (error) {
    console.error('Erro ao buscar dados:', error);
    await chrome.storage.local.set({
      usageData: null,
      lastError: error.message,
      last_updated: new Date().toISOString()
    });
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#F44336' });
  }
}

async function syncToDashboard(data) {
  try {
    await fetch('http://127.0.0.1:3000/api/usage/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'chatgpt_extension', data })
    });
  } catch (e) {}
}

async function cleanOldData() {
  const result = await chrome.storage.local.get(['usageHistory']);
  const history = result.usageHistory || [];

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - DATA_RETENTION_DAYS);

  const filteredHistory = history.filter(item =>
    new Date(item.timestamp) > cutoffDate
  );

  if (filteredHistory.length !== history.length) {
    await chrome.storage.local.set({ usageHistory: filteredHistory });
  }
}

async function deleteAllData() {
  await chrome.storage.local.clear();
  chrome.action.setBadgeText({ text: '' });
}

async function updateBadge(data) {
  const settings = await chrome.storage.local.get({ badgeMetric: 'primary' });
  let percent = 0;

  if (settings.badgeMetric === 'primary' && data.rate_limit?.primary_window) {
    percent = Math.round(data.rate_limit.primary_window.used_percent);
  } else if (settings.badgeMetric === 'secondary' && data.rate_limit?.secondary_window) {
    percent = Math.round(data.rate_limit.secondary_window.used_percent);
  }

  chrome.action.setBadgeText({ text: `${percent}%` });
  chrome.action.setBadgeBackgroundColor({ color: getColorForPercent(percent) });
  chrome.action.setTitle({ title: `ChatGPT Usage - ${percent}%` });
}

function getColorForPercent(percent) {
  if (percent >= 90) return '#F44336';
  if (percent >= 70) return '#FF9800';
  if (percent >= 50) return '#FFC107';
  return '#4CAF50';
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'refresh') {
    fetchUsageData().then(() => {
      chrome.storage.local.get(['usageData'], (result) => sendResponse(result.usageData));
    });
    return true;
  }

  if (request.action === 'getData') {
    chrome.storage.local.get(['usageData'], (result) => sendResponse(result.usageData));
    return true;
  }

  if (request.action === 'deleteAllData') {
    deleteAllData().then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'exportData') {
    chrome.storage.local.get(['usageData'], (result) => sendResponse(result.usageData));
    return true;
  }
});

fetchUsageData();
