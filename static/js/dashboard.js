/** SovereignAI Terminal — local dashboard client */

const STAGES = ['antigravity', 'routing', 'hitl', 'deliverables'];
const STAGE_INDEX = Object.fromEntries(STAGES.map((s, i) => [s, i]));

let currentRunId = null;
let eventSource = null;
let timerInterval = null;
let elapsedSeconds = 0;
let running = false;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function toast(message, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  $('#toast-container').appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

function formatElapsed(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `[${m}m ${String(s).padStart(2, '0')}s elapsed]`;
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  return `${(n / 1024).toFixed(1)} KB`;
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

async function refreshStatus() {
  try {
    const status = await api('/api/status');
    const vault = await api('/api/vault');

    $('#status-agent').textContent = 'ONLINE';
    $('#status-agent-sub').textContent = `${status.antigravity_agent} · ${status.routing_model}`;

    $('#status-vault').textContent = vault.configured ? 'ACTIVE' : 'LOCKED';
    $('#status-vault-sub').textContent = vault.masked_key || 'Configure API key';
    $('#status-credits').textContent = status.credits;
    $('#sidebar-credits').textContent = status.credits;
    $('#status-output').textContent = status.output_dir.replace(/\\/g, '/').split('/').slice(-2).join('/') + '/';

    const pct = Math.min(100, (status.credits / 10) * 100);
    $('#credit-fill').style.width = `${pct}%`;

    if (vault.masked_key) {
      $('#vault-masked').textContent = vault.masked_key;
      $('#vault-masked').classList.remove('hidden');
    }
  } catch (e) {
    toast('Cannot reach local server. Run: python server.py', 'error');
  }
}

function setRunning(isRunning) {
  running = isRunning;
  $('#btn-run').disabled = isRunning;
  $('#prompt-input').disabled = isRunning;
  $('#run-spinner').classList.toggle('hidden', !isRunning);
  $('#btn-cancel').classList.toggle('hidden', !isRunning);
  $('#header-timer').classList.toggle('hidden', !isRunning);
}

function startTimer() {
  elapsedSeconds = 0;
  $('#header-timer').textContent = formatElapsed(0);
  timerInterval = setInterval(() => {
    elapsedSeconds += 0.1;
    const label = formatElapsed(elapsedSeconds);
    $('#header-timer').textContent = label;
    const active = document.querySelector('.stage-row.active [data-timer]');
    if (active) active.textContent = label;
  }, 100);
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}

function updateStages(currentStage) {
  const idx = STAGE_INDEX[currentStage] ?? (currentStage === 'complete' ? 4 : -1);

  $$('.stage-row').forEach((row) => {
    const stage = row.dataset.stage;
    const si = STAGE_INDEX[stage];
    row.classList.remove('active', 'done', 'pending');

    if (currentStage === 'complete' || currentStage === 'denied') {
      row.classList.add(si <= 3 ? 'done' : 'pending');
      if (currentStage === 'complete') row.classList.add('done');
    } else if (si < idx) {
      row.classList.add('done');
      row.querySelector('[data-icon]').textContent = '✓';
    } else if (si === idx) {
      row.classList.add('active');
      row.querySelector('[data-icon]').innerHTML = '<span class="spinner"></span>';
    } else {
      row.classList.add('pending');
      row.querySelector('[data-icon]').textContent = '○';
    }
  });

  if (currentStage === 'complete') {
    $$('.stage-row').forEach((row) => {
      row.classList.add('done');
      row.classList.remove('active', 'pending');
      row.querySelector('[data-icon]').textContent = '✓';
    });
  }
}

function showHitlModal(data) {
  $('#hitl-summary').textContent = data.summary_markdown || '(No summary)';
  const tbody = $('#hitl-files');
  tbody.innerHTML = '';
  (data.proposed_files || []).forEach((f) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="mono">${escapeHtml(f.filename)}</td>
      <td>${escapeHtml(f.description)}</td>
      <td style="text-align:right;color:#71717a">${formatBytes(f.size_bytes)}</td>
    `;
    tbody.appendChild(tr);
  });
  $('#hitl-modal').classList.add('open');
}

function hideHitlModal() {
  $('#hitl-modal').classList.remove('open');
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function renderDeliverables(deliverables, manifest) {
  const section = $('#deliverables-section');
  const list = $('#deliverables-list');
  list.innerHTML = '';

  (deliverables || []).forEach((d) => {
    const item = document.createElement('div');
    item.className = 'deliverable-item';
    item.innerHTML = `
      <div>
        <div class="name">${escapeHtml(d.filename)}</div>
        <div class="desc">${escapeHtml(d.description || '')} · ${formatBytes(d.size_bytes)}</div>
      </div>
      <a class="btn btn-secondary" href="/api/files/${encodeURIComponent(d.filename)}" download>Download</a>
    `;
    list.appendChild(item);
  });

  $('#manifest-preview').textContent = JSON.stringify(manifest || {}, null, 2);
  section.classList.remove('hidden');
}

function connectStream(runId) {
  if (eventSource) eventSource.close();

  eventSource = new EventSource(`/api/pipeline/${runId}/stream`);

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.stage === 'stream_end') return;

    if (data.elapsed_seconds) elapsedSeconds = data.elapsed_seconds;
    updateStages(data.stage);

    if (data.stage === 'hitl') {
      showHitlModal(data);
    }

    if (data.stage === 'deliverables') {
      hideHitlModal();
    }

    if (data.stage === 'complete') {
      hideHitlModal();
      stopTimer();
      setRunning(false);
      renderDeliverables(data.deliverables, data.manifest);
      toast('Pipeline complete — deliverables ready', 'success');
      refreshStatus();
      eventSource.close();
    }

    if (data.stage === 'denied') {
      hideHitlModal();
      stopTimer();
      setRunning(false);
      toast('Writes denied — no files saved to disk', 'info');
      refreshStatus();
      eventSource.close();
    }

    if (data.stage === 'error') {
      hideHitlModal();
      stopTimer();
      setRunning(false);
      toast(data.message || 'Pipeline error', 'error');
      refreshStatus();
      eventSource.close();
    }
  };

  eventSource.onerror = () => {
    eventSource.close();
  };
}

async function startPipeline() {
  const prompt = $('#prompt-input').value.trim();
  if (prompt.length < 10) {
    toast('Enter a task description (min. 10 characters)', 'error');
    return;
  }

  $('#deliverables-section').classList.add('hidden');
  $$('.stage-row').forEach((row) => {
    row.classList.remove('done', 'active');
    row.classList.add('pending');
    row.querySelector('[data-icon]').textContent = '○';
  });

  setRunning(true);
  startTimer();
  updateStages('antigravity');

  try {
    const { run_id } = await api('/api/pipeline/start', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });
    currentRunId = run_id;
    connectStream(run_id);
    toast(`Pipeline started — run ${run_id}`, 'info');
  } catch (e) {
    stopTimer();
    setRunning(false);
    toast(e.message, 'error');
  }
}

async function approveRun(approved) {
  if (!currentRunId) return;
  const path = approved ? 'approve' : 'deny';
  try {
    await api(`/api/pipeline/${currentRunId}/${path}`, { method: 'POST' });
    hideHitlModal();
    if (approved) {
      updateStages('deliverables');
      toast('Approval granted — writing files…', 'success');
    }
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function saveVaultKey() {
  const apiKey = $('#vault-input').value.trim();
  if (apiKey.length < 8) {
    toast('Enter a valid API key', 'error');
    return;
  }
  try {
    const res = await api('/api/vault', {
      method: 'POST',
      body: JSON.stringify({ api_key: apiKey }),
    });
    $('#vault-input').value = '';
    $('#vault-masked').textContent = res.masked_key;
    $('#vault-masked').classList.remove('hidden');
    toast('API key saved to local vault', 'success');
    refreshStatus();
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function topUpCredits() {
  try {
    const res = await api('/api/credits', {
      method: 'POST',
      body: JSON.stringify({ amount: 10 }),
    });
    toast(`+10 credits — balance: ${res.credits}`, 'success');
    refreshStatus();
  } catch (e) {
    toast(e.message, 'error');
  }
}

function cancelRun() {
  if (currentRunId) {
    api(`/api/pipeline/${currentRunId}/deny`, { method: 'POST' }).catch(() => {});
  }
  if (eventSource) eventSource.close();
  hideHitlModal();
  stopTimer();
  setRunning(false);
  toast('Run cancelled', 'info');
}

// Event listeners
$('#btn-run').addEventListener('click', startPipeline);
$('#btn-cancel').addEventListener('click', cancelRun);
$('#btn-save-key').addEventListener('click', saveVaultKey);
$('#btn-topup').addEventListener('click', topUpCredits);
$('#btn-approve').addEventListener('click', () => approveRun(true));
$('#btn-deny').addEventListener('click', () => approveRun(false));

document.addEventListener('keydown', (e) => {
  if (!$('#hitl-modal').classList.contains('open')) return;
  if (e.key === 'y' || e.key === 'Y') approveRun(true);
  if (e.key === 'n' || e.key === 'N') approveRun(false);
});

// Default prompt for demos
$('#prompt-input').value =
  'Voer een compliance- en TCO-migratie-audit uit voor een enterprise-klant die overstapt op sovereign AI met BYOK en HITL-controle.';

refreshStatus();
setInterval(refreshStatus, 15000);
