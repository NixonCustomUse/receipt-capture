function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatMoney(n) {
  return 'RM ' + Number(n || 0).toFixed(2);
}

function getCategory(state, id) {
  return state.categories.find(c => c.id === id) || { name: 'Unknown', color: '#999' };
}

function escHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderTags(tags) {
  if (!tags || tags.length === 0) return '';
  return `<div class="tags-row">${tags.map(t => `<span class="tag">${escHtml(t)}</span>`).join('')}</div>`;
}

function filterByDate(receipts, filter) {
  if (filter === 'all') return receipts;
  const now = new Date();
  const start = new Date(now);
  if (filter === 'month') start.setDate(1);
  else if (filter === '3months') start.setMonth(now.getMonth() - 3);
  else if (filter === 'year') start.setMonth(0); start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return receipts.filter(r => new Date(r.date) >= start);
}

function filterByCategory(receipts, categoryId) {
  if (!categoryId || categoryId === 'all') return receipts;
  return receipts.filter(r => r.categoryId === parseInt(categoryId));
}

function sortReceipts(receipts, sortBy) {
  const sorted = [...receipts];
  switch (sortBy) {
    case 'date-asc': return sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
    case 'amount-desc': return sorted.sort((a, b) => (b.amount || 0) - (a.amount || 0));
    case 'amount-asc': return sorted.sort((a, b) => (a.amount || 0) - (b.amount || 0));
    case 'vendor': return sorted.sort((a, b) => (a.vendorName || '').localeCompare(b.vendorName || ''));
    default: return sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
  }
}

function getFilteredList(state) {
  let list = state.receipts;
  const q = state.searchQuery.toLowerCase().trim();
  if (q) list = list.filter(r => (r.vendorName || '').toLowerCase().includes(q));
  list = filterByDate(list, state.dateFilter);
  list = filterByCategory(list, state.categoryFilter);
  list = sortReceipts(list, state.sortBy);
  return list;
}

export function renderDashboard(state) {
  const total = state.receipts.length;
  const now = new Date();
  const m = now.getMonth();
  const y = now.getFullYear();
  const monthTotal = state.receipts
    .filter(r => { const d = new Date(r.date); return d.getMonth() === m && d.getFullYear() === y; })
    .reduce((sum, r) => sum + (r.amount || 0), 0);
  const avg = total > 0 ? monthTotal / total : 0;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-month').textContent = formatMoney(monthTotal);
  document.getElementById('stat-avg').textContent = formatMoney(avg);

  const container = document.getElementById('recent-receipts');
  const recent = state.receipts.slice(0, 5);
  if (recent.length === 0) {
    container.innerHTML = `<div class="empty-state"><span class="empty-icon">🧾</span>No receipts yet.<br>Tap <strong>Add</strong> to get started!</div>`;
    return;
  }
  container.innerHTML = recent.map(r => {
    const cat = getCategory(state, r.categoryId);
    return `<div class="receipt-row" data-id="${r.id}">
      <span class="cat-dot" style="background:${cat.color}"></span>
      <div class="row-info">
        <strong>${escHtml(r.vendorName || 'Unknown')}</strong>
        <small>${formatDate(r.date)}</small>
      </div>
      <span class="row-amount">${formatMoney(r.amount)}</span>
    </div>`;
  }).join('');

  renderCharts(state);
}

function getMonthlyData(receipts) {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString('en-MY', { month: 'short', year: 'numeric' });
    const total = receipts
      .filter(r => {
        const rd = new Date(r.date);
        return rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear();
      })
      .reduce((s, r) => s + (r.amount || 0), 0);
    months.push({ label, total });
  }
  return months;
}

function getCategoryData(receipts, categories) {
  const map = {};
  receipts.forEach(r => {
    const cat = getCategory({ categories }, r.categoryId);
    const name = cat.name;
    map[name] = (map[name] || 0) + (r.amount || 0);
  });
  const colors = categories.map(c => c.color);
  return { labels: Object.keys(map), data: Object.values(map), colors };
}

let chartMonthlyInstance = null;
let chartCategoryInstance = null;

export function renderCharts(state) {
  const canvasMonthly = document.getElementById('chart-monthly');
  const canvasCategory = document.getElementById('chart-category');
  if (!canvasMonthly || !canvasCategory) return;

  if (!state.Chart) return;

  if (chartMonthlyInstance) { chartMonthlyInstance.destroy(); chartMonthlyInstance = null; }
  if (chartCategoryInstance) { chartCategoryInstance.destroy(); chartCategoryInstance = null; }

  const monthly = getMonthlyData(state.receipts);
  const hasData = monthly.some(m => m.total > 0);

  if (!hasData) {
    canvasMonthly.parentElement.innerHTML = '<div class="empty-chart" style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px">No data yet</div>';
    canvasCategory.parentElement.innerHTML = '<div class="empty-chart" style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px">No data yet</div>';
    return;
  }

  const Chart = state.Chart;
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const textColor = isDark ? '#a0a0a0' : '#7a7a8a';

  chartMonthlyInstance = new Chart(canvasMonthly, {
    type: 'bar',
    data: {
      labels: monthly.map(m => m.label),
      datasets: [{
        label: 'Spending',
        data: monthly.map(m => m.total),
        backgroundColor: '#c9954a',
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 10 } } },
        y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 10 }, callback: v => 'RM' + v } }
      }
    }
  });

  const catData = getCategoryData(state.receipts, state.categories);
  if (catData.labels.length === 0) {
    canvasCategory.parentElement.innerHTML = '<div class="empty-chart" style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px">No data yet</div>';
    return;
  }

  chartCategoryInstance = new Chart(canvasCategory, {
    type: 'doughnut',
    data: {
      labels: catData.labels,
      datasets: [{
        data: catData.data,
        backgroundColor: catData.colors,
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: textColor, font: { size: 10 }, padding: 12 }
        }
      }
    }
  });
}

export function renderReceiptList(state) {
  const container = document.getElementById('receipt-list');
  const list = getFilteredList(state);

  if (list.length === 0) {
    container.innerHTML = `<div class="empty-state"><span class="empty-icon">📋</span>${state.searchQuery || state.dateFilter !== 'all' ? 'No matching receipts.' : 'No receipts yet.'}</div>`;
    return;
  }
  container.innerHTML = list.map(r => {
    const cat = getCategory(state, r.categoryId);
    return `<div class="receipt-card" data-id="${r.id}">
      <div class="card-thumb">${r.image ? `<img src="${r.image}" alt="">` : '<span>🧾</span>'}</div>
      <div class="card-body">
        <strong>${escHtml(r.vendorName || 'Unknown')}</strong>
        <small>${formatDate(r.date)}</small>
        <span class="cat-tag" style="background:${cat.color}15;color:${cat.color}">${escHtml(cat.name)}</span>
        ${renderTags(r.tags)}
      </div>
      <span class="card-amount">${formatMoney(r.amount)}</span>
    </div>`;
  }).join('');
}

export function populateCategoryDropdown(selectId, categories, selectedId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = categories.map(c =>
    `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${escHtml(c.name)}</option>`
  ).join('');
}

export function populateFilterCategories(categories) {
  const sel = document.getElementById('filter-category');
  if (!sel) return;
  sel.innerHTML = '<option value="all">All Categories</option>' +
    categories.map(c => `<option value="${c.id}">${escHtml(c.name)}</option>`).join('');
}

export function renderCategoryList(state) {
  const container = document.getElementById('category-list');
  if (state.categories.length === 0) {
    container.innerHTML = '<div class="empty-state">No categories.</div>';
    return;
  }
  container.innerHTML = state.categories.map(c =>
    `<div class="cat-item" data-id="${c.id}">
      <span class="cat-dot" style="background:${c.color}"></span>
      <span>${escHtml(c.name)}</span>
      <button class="btn-icon del-cat" data-id="${c.id}">✕</button>
    </div>`
  ).join('');
}

export function renderDetailModal(state, id) {
  const r = state.receipts.find(x => x.id === id);
  if (!r) return;
  const cat = getCategory(state, r.categoryId);
  const el = document.getElementById('receipt-detail');
  el.innerHTML = `
    ${r.image ? `<div style="margin-bottom:12px;border-radius:12px;overflow:hidden;max-height:200px;background:var(--input-bg)">
      <img src="${r.image}" style="width:100%;height:200px;object-fit:cover" alt="">
    </div>` : ''}
    <div class="detail-body">
      <h2 style="font-family:var(--font-heading);font-size:20px;margin-bottom:4px">${escHtml(r.vendorName || 'Unknown')}</h2>
      <span class="cat-tag" style="background:${cat.color}15;color:${cat.color};margin-bottom:12px;display:inline-block">${escHtml(cat.name)}</span>
      ${renderTags(r.tags)}
      <div class="detail-row"><strong>Date</strong><span>${formatDate(r.date)}</span></div>
      <div class="detail-row"><strong>Amount</strong><span class="detail-amount">${formatMoney(r.amount)}</span></div>
      ${r.notes ? `<div class="detail-row"><strong>Notes</strong><span>${escHtml(r.notes)}</span></div>` : ''}
      <div class="detail-row"><strong>Added</strong><span>${formatDate(r.createdAt)}</span></div>
    </div>
    <div class="detail-actions">
      <button class="btn btn-ghost edit-receipt" data-id="${r.id}">Edit</button>
      <button class="btn btn-danger del-receipt" data-id="${r.id}">Delete</button>
    </div>
  `;
  document.getElementById('receipt-modal').classList.add('open');
}

export function closeModal() {
  document.getElementById('receipt-modal').classList.remove('open');
}

export function showProcessing(status) {
  const overlay = document.getElementById('processing-overlay');
  const statusEl = document.getElementById('processing-status');
  const fill = document.getElementById('processing-progress-fill');
  overlay.classList.add('open');
  if (status) {
    statusEl.textContent = status.message || 'Processing...';
    fill.style.width = ((status.progress || 0) * 100) + '%';
    if (status.status === 'done' || status.status === 'error') {
      setTimeout(() => overlay.classList.remove('open'), status.status === 'done' ? 300 : 2000);
    }
  }
}

export function hideProcessing() {
  document.getElementById('processing-overlay').classList.remove('open');
}

export function showReviewOverlay(imageData, extracted, state) {
  document.getElementById('review-image').src = imageData;
  document.getElementById('review-vendor').value = extracted.vendorName || '';
  document.getElementById('review-date').value = extracted.date || new Date().toISOString().split('T')[0];
  document.getElementById('review-amount').value = extracted.total || '';
  document.getElementById('review-tags').value = '';
  document.getElementById('review-notes').value = '';
  document.getElementById('review-ocr-text').value = extracted.rawText || '';
  populateCategoryDropdown('review-category', state.categories, state.categories[0]?.id);
  document.getElementById('review-overlay').classList.add('open');
}

export function hideReviewOverlay() {
  document.getElementById('review-overlay').classList.remove('open');
}
