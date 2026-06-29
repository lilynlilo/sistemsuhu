// ─── API Service: Frontend ↔ Backend ──────────────────────────
const API_BASE = '/api';

export async function fetchLatest() {
  const res = await fetch(`${API_BASE}/latest`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchRecent(count = 50) {
  const res = await fetch(`${API_BASE}/recent?count=${count}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchHistory(startDate, endDate) {
  let url = `${API_BASE}/history?start=${startDate}`;
  if (endDate) url += `&end=${endDate}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchStats(startDate, endDate) {
  let url = `${API_BASE}/stats?start=${startDate}`;
  if (endDate) url += `&end=${endDate}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function sendControl(command) {
  const res = await fetch(`${API_BASE}/control`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ command }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
