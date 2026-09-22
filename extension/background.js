// AI Usage Monitor - LGPD Safe Version

const CHATGPT_USAGE_ENDPOINT = 'https://chatgpt.com/backend-api/wham/usage';
const CHATGPT_AUTH_ENDPOINT = 'https://chatgpt.com/api/auth/session';
const CLAUDE_ORGANIZATIONS_ENDPOINT = 'https://claude.ai/api/organizations';
const POLL_INTERVAL = 5;
const DATA_RETENTION_DAYS = 30;

async function getAccessToken() {
  const response = await fetch(CHATGPT_AUTH_ENDPOINT, {
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
  console.log('AI Usage Monitor instalado');
  fetchAllUsageData();
  chrome.alarms.create('fetchUsage', { periodInMinutes: POLL_INTERVAL });
  cleanOldData();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'fetchUsage') {
    fetchAllUsageData();
    cleanOldData();
  }
});

async function fetchChatGPTUsageData() {
  try {
    const accessToken = await getAccessToken();

    const response = await fetch(CHATGPT_USAGE_ENDPOINT, {
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
      provider: 'chatgpt',
      last_updated: new Date().toISOString()
    };

    // Preserve the V1.0 storage contract used by the ChatGPT popup.
    await chrome.storage.local.set({
      usageData,
      lastError: null,
      chatgptUsageData: usageData,
      chatgptLastError: null
    });
    const settings = await chrome.storage.local.get({ activeProvider: 'chatgpt' });
    if (settings.activeProvider === 'chatgpt') {
      updateBadge(usageData);
    }
    syncToDashboard(usageData);
  } catch (error) {
    console.error('Erro ao buscar dados do ChatGPT:', error);
    await chrome.storage.local.set({
      chatgptUsageData: null,
      chatgptLastError: error.message
    });
    const settings = await chrome.storage.local.get({ activeProvider: 'chatgpt' });
    if (settings.activeProvider === 'chatgpt') {
      await chrome.storage.local.set({ usageData: null, lastError: error.message });
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#F44336' });
    }
  }
}

async function fetchClaudeUsageData() {
  try {
    const organizationsResponse = await fetch(CLAUDE_ORGANIZATIONS_ENDPOINT, {
      credentials: 'include',
      headers: { 'Accept': 'application/json' }
    });

    if (!organizationsResponse.ok) {
      throw new Error(`Auth failed: HTTP ${organizationsResponse.status}`);
    }

    const organizations = await organizationsResponse.json();
    const organization = Array.isArray(organizations) ? organizations[0] : organizations?.organizations?.[0];
    if (!organization?.uuid) {
      throw new Error('Não autenticado no Claude');
    }

    const usageResponse = await fetch(`${CLAUDE_ORGANIZATIONS_ENDPOINT}/${organization.uuid}/usage`, {
      credentials: 'include',
      headers: { 'Accept': 'application/json' }
    });

    if (!usageResponse.ok) {
      throw new Error(`HTTP ${usageResponse.status}: ${usageResponse.statusText}`);
    }

    const data = await usageResponse.json();
    const usageData = {
      provider: 'claude',
      plan_type: organization.subscription_type || organization.plan_type || 'claude',
      rate_limit: {
        primary_window: normalizeClaudeWindow(data.five_hour),
        secondary_window: normalizeClaudeWindow(data.seven_day)
      },
      last_updated: new Date().toISOString()
    };

    await saveUsageData('claude', usageData);
    syncToDashboard(usageData);
  } catch (error) {
    await saveProviderError('claude', error);
  }
}

function normalizeClaudeWindow(window) {
  if (!window) return null;

  const utilization = Number(window.utilization ?? window.used_percent ?? 0);
  return {
    used_percent: utilization <= 1 ? utilization * 100 : utilization,
    reset_at: window.resets_at || window.reset_at
  };
}

async function fetchAllUsageData() {
  await Promise.all([fetchChatGPTUsageData(), fetchClaudeUsageData()]);
}

async function saveUsageData(provider, usageData) {
  const settings = await chrome.storage.local.get({ activeProvider: 'chatgpt' });
  const updates = {
    [`${provider}UsageData`]: usageData,
    [`${provider}LastError`]: null
  };

  // Maintain the original key for existing ChatGPT users and the active popup view.
  if (settings.activeProvider === provider) {
    updates.usageData = usageData;
    updates.lastError = null;
  }

  await chrome.storage.local.set(updates);
  if (settings.activeProvider === provider) {
    updateBadge(usageData);
  }
}

async function saveProviderError(provider, error) {
  console.error(`Erro ao buscar dados do ${provider}:`, error);
  const settings = await chrome.storage.local.get({ activeProvider: 'chatgpt' });
  const updates = {
    [`${provider}UsageData`]: null,
    [`${provider}LastError`]: error.message
  };

  if (settings.activeProvider === provider) {
    updates.usageData = null;
    updates.lastError = error.message;
  }

  await chrome.storage.local.set(updates);
  if (settings.activeProvider === provider) {
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#F44336' });
  }
}

async function syncToDashboard(data) {
  try {
    await fetch('http://127.0.0.1:3000/api/usage/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: `${data.provider}_extension`, data })
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
  const provider = data.provider === 'claude' ? 'Claude' : 'ChatGPT';
  chrome.action.setTitle({ title: `${provider} Usage - ${percent}%` });
}

function getColorForPercent(percent) {
  if (percent >= 90) return '#F44336';
  if (percent >= 70) return '#FF9800';
  if (percent >= 50) return '#FFC107';
  return '#4CAF50';
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'refresh') {
    refreshProviderData(request.provider).then(sendResponse);
    return true;
  }
  
  if (request.action === 'getData') {
    getProviderData(request.provider).then(sendResponse);
    return true;
  }
  
  if (request.action === 'deleteAllData') {
    deleteAllData().then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'exportData') {
    chrome.storage.local.get(['chatgptUsageData', 'claudeUsageData'], sendResponse);
    return true;
  }
});

async function refreshProviderData(provider) {
  if (provider === 'claude') {
    await fetchClaudeUsageData();
  } else {
    await fetchChatGPTUsageData();
  }
  return getProviderData(provider);
}

async function getProviderData(provider) {
  const activeProvider = provider || 'chatgpt';
  const result = await chrome.storage.local.get([`${activeProvider}UsageData`, `${activeProvider}LastError`]);
  return {
    usageData: result[`${activeProvider}UsageData`] || null,
    lastError: result[`${activeProvider}LastError`] || null
  };
}

fetchAllUsageData();
