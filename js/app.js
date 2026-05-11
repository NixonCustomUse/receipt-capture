import {
  openDB,
  getAllReceipts,
  addReceipt,
  updateReceipt,
  deleteReceipt,
  getAllCategories,
  addCategory,
  deleteCategory
} from './db.js';
import {
  renderDashboard,
  renderReceiptList,
  populateCategoryDropdown,
  renderCategoryList,
  renderDetailModal,
  closeModal
} from './ui.js';

const state = {
  db: null,
  receipts: [],
  categories: [],
  currentScreen: 'dashboard',
  editingId: null,
  searchQuery: ''
};

document.addEventListener('DOMContentLoaded', async () => {
  state.db = await openDB();
  await reloadData();
  setupNav();
  setupEvents();
  navigate('dashboard');
});

async function reloadData() {
  state.receipts = await getAllReceipts(state.db);
  state.categories = await getAllCategories(state.db);
}

function setupNav() {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => {
      const screen = el.dataset.screen;
      if (state.editingId && screen !== 'add') {
        state.editingId = null;
      }
      navigate(screen);
    });
  });
}

function navigate(screen) {
  state.currentScreen = screen;

  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  const target = document.getElementById(`screen-${screen}`);
  if (target) target.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const navItem = document.querySelector(`.nav-item[data-screen="${screen}"]`);
  if (navItem) navItem.classList.add('active');

  if (screen === 'add') {
    const editing = state.editingId ? state.receipts.find(r => r.id === state.editingId) : null;
    document.getElementById('add-title').textContent = editing ? 'Edit Receipt' : 'Add Receipt';

    if (editing) {
      document.getElementById('field-vendor').value = editing.vendorName || '';
      document.getElementById('field-date').value = editing.date ? editing.date.split('T')[0] : '';
      document.getElementById('field-amount').value = editing.amount || '';
      document.getElementById('field-notes').value = editing.notes || '';
      document.querySelector('#receipt-form button').textContent = 'Update Receipt';
    } else {
      document.getElementById('field-vendor').value = '';
      document.getElementById('field-date').value = new Date().toISOString().split('T')[0];
      document.getElementById('field-amount').value = '';
      document.getElementById('field-notes').value = '';
      document.querySelector('#receipt-form button').textContent = 'Save Receipt';
    }

    populateCategoryDropdown(state.categories, editing ? editing.categoryId : state.categories[0]?.id);
  }

  renderCurrentScreen();
}

function renderCurrentScreen() {
  switch (state.currentScreen) {
    case 'dashboard': renderDashboard(state); break;
    case 'receipts': renderReceiptList(state); break;
    case 'categories': renderCategoryList(state); break;
  }
}

function setupEvents() {
  // Receipt form submit
  document.getElementById('receipt-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      vendorName: document.getElementById('field-vendor').value.trim(),
      date: document.getElementById('field-date').value,
      amount: parseFloat(document.getElementById('field-amount').value) || 0,
      categoryId: parseInt(document.getElementById('field-category').value),
      notes: document.getElementById('field-notes').value.trim()
    };
    if (!data.vendorName || !data.date || data.amount <= 0) return;

    if (state.editingId) {
      await updateReceipt(state.db, state.editingId, data);
      state.editingId = null;
    } else {
      await addReceipt(state.db, data);
    }

    document.getElementById('receipt-form').reset();
    document.getElementById('field-date').value = new Date().toISOString().split('T')[0];
    await reloadData();
    navigate('receipts');
  });

  // Receipt list click (open detail)
  document.getElementById('receipt-list').addEventListener('click', (e) => {
    const card = e.target.closest('.receipt-card');
    if (card) {
      const id = parseInt(card.dataset.id);
      renderDetailModal(state, id);
    }
  });

  // Recent receipts click (dashboard)
  document.getElementById('recent-receipts').addEventListener('click', (e) => {
    const row = e.target.closest('.receipt-row');
    if (row) {
      const id = parseInt(row.dataset.id);
      renderDetailModal(state, id);
    }
  });

  // Modal close
  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
  document.getElementById('receipt-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  // Detail actions (edit / delete)
  document.getElementById('receipt-detail').addEventListener('click', async (e) => {
    const editBtn = e.target.closest('.edit-receipt');
    const delBtn = e.target.closest('.del-receipt');

    if (editBtn) {
      const id = parseInt(editBtn.dataset.id);
      closeModal();
      state.editingId = id;
      navigate('add');
    }

    if (delBtn) {
      if (!confirm('Delete this receipt?')) return;
      const id = parseInt(delBtn.dataset.id);
      await deleteReceipt(state.db, id);
      closeModal();
      await reloadData();
      renderCurrentScreen();
    }
  });

  // Search
  document.getElementById('search-input').addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderReceiptList(state);
  });

  // Add category
  document.getElementById('add-cat-btn').addEventListener('click', async () => {
    const nameInput = document.getElementById('new-cat-name');
    const colorInput = document.getElementById('new-cat-color');
    const name = nameInput.value.trim();
    if (!name) return;
    await addCategory(state.db, { name, color: colorInput.value });
    nameInput.value = '';
    colorInput.value = '#4ECDC4';
    await reloadData();
    renderCategoryList(state);
  });

  // Delete category
  document.getElementById('category-list').addEventListener('click', async (e) => {
    const delBtn = e.target.closest('.del-cat');
    if (!delBtn) return;
    if (!confirm('Delete this category?')) return;
    const id = parseInt(delBtn.dataset.id);
    await deleteCategory(state.db, id);
    await reloadData();
    renderCategoryList(state);
  });
}
