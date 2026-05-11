

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

function getMonthTotal(receipts) {
  const now = new Date();
  const m = now.getMonth();
  const y = now.getFullYear();
  return receipts
    .filter(r => {
      const d = new Date(r.date);
      return d.getMonth() === m && d.getFullYear() === y;
    })
    .reduce((sum, r) => sum + (r.amount || 0), 0);
}

export function renderDashboard(state) {
  const total = state.receipts.length;
  const monthTotal = getMonthTotal(state.receipts);
  const avg = total > 0 ? monthTotal / total : 0;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-month').textContent = formatMoney(monthTotal);
  document.getElementById('stat-avg').textContent = formatMoney(avg);

  const container = document.getElementById('recent-receipts');
  const recent = state.receipts.slice(0, 5);
  if (recent.length === 0) {
    container.innerHTML = '<div class="empty-state">No receipts yet. Tap + to add one!</div>';
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
}

export function renderReceiptList(state) {
  const container = document.getElementById('receipt-list');
  let list = state.receipts;
  const q = state.searchQuery.toLowerCase().trim();
  if (q) {
    list = list.filter(r => (r.vendorName || '').toLowerCase().includes(q));
  }
  if (list.length === 0) {
    container.innerHTML = '<div class="empty-state">' + (q ? 'No matching receipts.' : 'No receipts yet.') + '</div>';
    return;
  }
  container.innerHTML = list.map(r => {
    const cat = getCategory(state, r.categoryId);
    return `<div class="receipt-card" data-id="${r.id}">
      <div class="card-thumb">
        ${r.image ? `<img src="${r.image}" alt="">` : '<div class="no-img">📄</div>'}
      </div>
      <div class="card-body">
        <strong>${escHtml(r.vendorName || 'Unknown')}</strong>
        <small>${formatDate(r.date)}</small>
        <span class="cat-tag" style="background:${cat.color}20;color:${cat.color};border:1px solid ${cat.color}40">${escHtml(cat.name)}</span>
      </div>
      <span class="card-amount">${formatMoney(r.amount)}</span>
    </div>`;
  }).join('');
}

export function populateCategoryDropdown(categories, selectedId) {
  const sel = document.getElementById('field-category');
  sel.innerHTML = categories.map(c =>
    `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${escHtml(c.name)}</option>`
  ).join('');
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
    <div class="detail-header">
      <h2>${escHtml(r.vendorName || 'Unknown')}</h2>
      <span class="cat-tag" style="background:${cat.color}20;color:${cat.color}">${escHtml(cat.name)}</span>
    </div>
    <div class="detail-body">
      <div class="detail-row"><strong>Date</strong><span>${formatDate(r.date)}</span></div>
      <div class="detail-row"><strong>Amount</strong><span class="detail-amount">${formatMoney(r.amount)}</span></div>
      ${r.notes ? `<div class="detail-row"><strong>Notes</strong><span>${escHtml(r.notes)}</span></div>` : ''}
      <div class="detail-row"><strong>Added</strong><span>${formatDate(r.createdAt)}</span></div>
    </div>
    <div class="detail-actions">
      <button class="btn btn-secondary edit-receipt" data-id="${r.id}">Edit</button>
      <button class="btn btn-danger del-receipt" data-id="${r.id}">Delete</button>
    </div>
  `;
  document.getElementById('receipt-modal').classList.add('open');
}

export function closeModal() {
  document.getElementById('receipt-modal').classList.remove('open');
}

function escHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
