// ChatGPT Usage Monitor - LGPD Safe Popup

let currentTheme = 'auto';

document.addEventListener('DOMContentLoaded', () => {
  initializeTheme();
  loadSettings();
  loadUsageData();

  document.getElementById('settings-toggle').addEventListener('click', toggleSettings);
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
  document.getElementById('refresh').addEventListener('click', refreshData);
  document.getElementById('save-settings').addEventListener('click', saveSettings);
  
  // LGPD: Botões de privacidade
  document.getElementById('delete-data')?.addEventListener('click', deleteAllData);
  document.getElementById('export-data')?.addEventListener('click', exportData);
});

// ── Theme ──────────────────────────────────────────────────

function initializeTheme() {
  chrome.storage.local.get(['theme'], (result) => {
    currentTheme = result.theme || 'auto';
    applyTheme();
  });
}

function toggleTheme() {
  currentTheme = currentTheme === 'auto' ? 'light' : 
                 currentTheme === 'light' ? 'dark' : 'auto';
  chrome.storage.local.set({ theme: currentTheme });
  applyTheme();
}

function applyTheme() {
  const body = document.body;
  const themeBtn = document.getElementById('theme-toggle');
  
  body.classList.remove('light-theme', 'dark-theme');
  
  if (currentTheme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    body.classList.add(prefersDark ? 'dark-theme' : 'light-theme');
    themeBtn.textContent = 'Auto';
  } else if (currentTheme === 'light') {
    body.classList.add('light-theme');
    themeBtn.textContent = '☀️';
  } else {
    body.classList.add('dark-theme');
    themeBtn.textContent = 'Dark';
  }
}

// ── Settings ───────────────────────────────────────────────

function toggleSettings() {
  document.getElementById('settings-panel').classList.toggle('hidden');
}

function loadSettings() {
  chrome.storage.local.get({ badgeMetric: 'primary' }, (settings) => {
    document.querySelectorAll('input[name="badge-metric"]').forEach(radio => {
      radio.checked = (radio.value === settings.badgeMetric);
    });
  });
}

function saveSettings() {
  const selected = document.querySelector('input[name="badge-metric"]:checked');
  chrome.storage.local.set({ badgeMetric: selected.value }, () => {
    chrome.runtime.sendMessage({ action: 'refresh' });
    
    const btn = document.getElementById('save-settings');
    btn.textContent = '✓ Salvo!';
    btn.style.background = '#4CAF50';
    
    setTimeout(() => {
      btn.textContent = 'Salvar';
      btn.style.background = '';
      toggleSettings();
    }, 1000);
  });
}

// ── Data Loading ───────────────────────────────────────────

function refreshData() {
  const btn = document.getElementById('refresh');
  btn.disabled = true;
  btn.textContent = '⟳';

  chrome.runtime.sendMessage({ action: 'refresh' }, () => {
    loadUsageData();
    btn.disabled = false;
    btn.textContent = '↻';
  });
}

function loadUsageData() {
  chrome.storage.local.get(['usageData', 'lastError'], (result) => {
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const content = document.getElementById('content');
    
    loading.classList.add('hidden');
    
    if (result.lastError && !result.usageData) {
      error.textContent = `Erro: ${result.lastError}`;
      error.classList.remove('hidden');
      content.classList.add('hidden');
      return;
    }
    
    if (!result.usageData) {
      error.textContent = 'Sem dados. Acesse chatgpt.com primeiro.';
      error.classList.remove('hidden');
      content.classList.add('hidden');
      return;
    }
    
    error.classList.add('hidden');
    content.classList.remove('hidden');
    displayUsageData(result.usageData);
  });
}

function displayUsageData(data) {
  // Tipo de plano
  if (data.plan_type) {
    const planBadge = document.getElementById('plan-type');
    planBadge.textContent = `Plano: ${data.plan_type.toUpperCase()}`;
    planBadge.className = 'plan-badge ' + data.plan_type;
  }
  
  // 5-Hour Rate Limit
  if (data.rate_limit?.primary_window) {
    updateUsageSection(
      'primary',
      data.rate_limit.primary_window.used_percent,
      data.rate_limit.primary_window.reset_at
    );
  }
  
  // 7-Day Rate Limit
  if (data.rate_limit?.secondary_window) {
    updateUsageSection(
      'secondary',
      data.rate_limit.secondary_window.used_percent,
      data.rate_limit.secondary_window.reset_at
    );
  }
  
  // Créditos
  if (data.credits && data.credits.balance !== '0') {
    document.getElementById('credits-section')?.classList.remove('hidden');
    document.getElementById('credit-balance').textContent = data.credits.balance;
  }
  
  // Última atualização
  if (data.last_updated) {
    const date = new Date(data.last_updated);
    document.getElementById('last-updated').textContent = 
      `Atualizado: ${formatTime(date)}`;
  }
  
  // LGPD: Mostrar política de retenção
  document.getElementById('retention-info').textContent = 
    `Dados mantidos por 30 dias (LGPD)`;
}

function updateUsageSection(prefix, utilization, resetAt) {
  const percent = Math.round(utilization);
  const bar = document.getElementById(`${prefix}-bar`);
  const percentSpan = document.getElementById(`${prefix}-percent`);
  const resetSpan = document.getElementById(`${prefix}-reset`);
  
  if (bar) {
    bar.style.width = `${percent}%`;
    bar.className = 'usage-bar ' + getUsageClass(percent);
  }
  
  if (percentSpan) {
    percentSpan.textContent = `${percent}%`;
    percentSpan.className = 'usage-percent ' + getUsageClass(percent);
  }
  
  if (resetSpan && resetAt) {
    const resetDate = new Date(resetAt * 1000);
    resetSpan.textContent = `Reset: ${getTimeUntil(resetDate)}`;
  }
}

function getUsageClass(percent) {
  if (percent >= 90) return 'critical';
  if (percent >= 70) return 'warning';
  if (percent >= 50) return 'caution';
  return 'good';
}

function getTimeUntil(date) {
  const diff = date - new Date();
  if (diff < 0) return 'agora';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function formatTime(date) {
  const diff = new Date() - date;
  if (diff < 60000) return 'agora';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min atrás`;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ── LGPD: Deletar Dados ────────────────────────────────────

function deleteAllData() {
  if (!confirm('Tem certeza? Todos os dados serão deletados permanentemente.')) {
    return;
  }
  
  chrome.runtime.sendMessage({ action: 'deleteAllData' }, (response) => {
    if (response?.success) {
      alert('Todos os dados foram deletados.');
      loadUsageData();
    }
  });
}

// ── LGPD: Exportar Dados ───────────────────────────────────

function exportData() {
  chrome.runtime.sendMessage({ action: 'exportData' }, (data) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Criar download manualmente (sem permissão downloads)
    const a = document.createElement('a');
    a.href = url;
    a.download = `chatgpt-usage-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

// Auto-refresh a cada 30 segundos
setInterval(loadUsageData, 30000);