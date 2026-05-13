function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatMoney(n) {
  return 'RM ' + Number(n || 0).toFixed(2);
}

function getCategory(state, id) {
  return state.categories.find(c => c.id === id) || { name: 'Unknown', color: '#666' };
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
    container.innerHTML = `<div class="empty-state"><div class="empty-figure"></div><strong>No receipts yet</strong><p>Add your first receipt to get started</p></div>`;
    return;
  }
  container.innerHTML = recent.map(r => {
    const cat = getCategory(state, r.categoryId);
    return `<div class="receipt-row" data-id="${r.id}">
      <span class="row-bar" style="background:${cat.color}"></span>
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
    map[cat.name] = (map[cat.name] || 0) + (r.amount || 0);
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
    canvasMonthly.parentElement.innerHTML = '<div class="empty-chart">No spending data yet</div>';
    canvasCategory.parentElement.innerHTML = '<div class="empty-chart">No spending data yet</div>';
    return;
  }

  const Chart = state.Chart;
  const gridColor = 'rgba(255,255,255,0.05)';
  const textColor = '#8a8a9a';

  chartMonthlyInstance = new Chart(canvasMonthly, {
    type: 'bar',
    data: {
      labels: monthly.map(m => m.label),
      datasets: [{
        label: 'Spending',
        data: monthly.map(m => m.total),
        backgroundColor: '#d4a853',
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 10 } } },
        y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 10 }, callback: v => 'RM' + v } }
      }
    }
  });

  const catData = getCategoryData(state.receipts, state.categories);
  if (catData.labels.length === 0) {
    canvasCategory.parentElement.innerHTML = '<div class="empty-chart">No spending data yet</div>';
    return;
  }

  chartCategoryInstance = new Chart(canvasCategory, {
    type: 'doughnut',
    data: {
      labels: catData.labels,
      datasets: [{ data: catData.data, backgroundColor: catData.colors, borderWidth: 0 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '65%',
      plugins: {
        legend: { position: 'bottom', labels: { color: textColor, font: { size: 10 }, padding: 12 } }
      }
    }
  });
}

export function renderReceiptList(state) {
  const container = document.getElementById('receipt-list');
  const list = getFilteredList(state);

  if (list.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-figure"></div><strong>${state.searchQuery || state.dateFilter !== 'all' ? 'No matching results' : 'No receipts yet'}</strong><p>${state.searchQuery || state.dateFilter !== 'all' ? 'Try adjusting your search or filters' : 'Tap Add to capture your first receipt'}</p></div>`;
    return;
  }
  container.innerHTML = list.map(r => {
    const cat = getCategory(state, r.categoryId);
    return `<div class="receipt-card" data-id="${r.id}">
      <div class="card-accent" style="background:${cat.color}"></div>
      <div class="card-thumb${r.image ? '' : ' card-thumb-empty'}" style="${r.image ? '' : `background:${cat.color}10`}">
        ${r.image ? `<img src="${r.image}" alt="">` : ''}
      </div>
      <div class="card-body">
        <strong>${escHtml(r.vendorName || 'Unknown')}</strong>
        <small>${formatDate(r.date)}</small>
        <span class="cat-tag" style="background:${cat.color}12;color:${cat.color}">${escHtml(cat.name)}</span>
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
    container.innerHTML = '<div class="empty-state"><div class="empty-figure"></div><strong>No categories</strong><p>Create your first category to organise receipts</p></div>';
    return;
  }
  container.innerHTML = state.categories.map(c =>
    `<div class="cat-item" data-id="${c.id}">
      <span class="cat-dot" style="background:${c.color}"></span>
      <span>${escHtml(c.name)}</span>
      <button class="btn-icon del-cat" data-id="${c.id}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>`
  ).join('');
}

export function renderDetailModal(state, id) {
  const r = state.receipts.find(x => x.id === id);
  if (!r) return;
  const cat = getCategory(state, r.categoryId);
  const el = document.getElementById('receipt-detail');
  el.innerHTML = `
    ${r.image ? `<div class="detail-image"><img src="${r.image}" alt=""></div>` : ''}
    <div class="detail-body">
      <div class="detail-head">
        <h2>${escHtml(r.vendorName || 'Unknown')}</h2>
        <span class="cat-tag" style="background:${cat.color}12;color:${cat.color}">${escHtml(cat.name)}</span>
      </div>
      ${renderTags(r.tags)}
      <div class="detail-info">
        <div class="detail-row"><span>Date</span><span>${formatDate(r.date)}</span></div>
        <div class="detail-row"><span>Amount</span><span class="detail-amount">${formatMoney(r.amount)}</span></div>
        ${r.notes ? `<div class="detail-row"><span>Notes</span><span>${escHtml(r.notes)}</span></div>` : ''}
        <div class="detail-row"><span>Added</span><span>${formatDate(r.createdAt)}</span></div>
        ${r.ocrText ? `<div class="detail-row"><span>OCR</span><span style="font-size:12px;color:var(--text-muted)">Processed</span></div>` : ''}
      </div>
      <div class="detail-actions">
        <button class="btn btn-ghost edit-receipt" data-id="${r.id}">Edit</button>
        <button class="btn btn-danger del-receipt" data-id="${r.id}">Delete</button>
      </div>
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
