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
  populateFilterCategories,
  renderCategoryList,
  renderDetailModal,
  closeModal,
  showProcessing,
  hideProcessing,
  showReviewOverlay,
  hideReviewOverlay
} from './ui.js';
import { runOCR, extractReceiptData, terminateOCR } from './ocr.js';

const state = {
  db: null,
  receipts: [],
  categories: [],
  currentScreen: 'dashboard',
  editingId: null,
  searchQuery: '',
  pendingImage: null,
  dateFilter: 'all',
  categoryFilter: 'all',
  sortBy: 'date-desc',
  Chart: null
};

let cameraStream = null;
let facingMode = 'environment';

document.addEventListener('DOMContentLoaded', async () => {
  state.db = await openDB();
  await reloadData();
  setupNav();
  setupEvents();
  navigate('dashboard');
  loadChartJS();
});

async function reloadData() {
  state.receipts = await getAllReceipts(state.db);
  state.categories = await getAllCategories(state.db);
  populateFilterCategories(state.categories);
}

function setupNav() {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => {
      const screen = el.dataset.screen;
      if (screen !== 'add') state.editingId = null;
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
    document.querySelector('#screen-add .page-header h1').textContent = editing ? 'Edit Receipt' : 'Add Receipt';

    if (editing) {
      document.getElementById('field-vendor').value = editing.vendorName || '';
      document.getElementById('field-date').value = editing.date ? editing.date.split('T')[0] : '';
      document.getElementById('field-amount').value = editing.amount || '';
      document.getElementById('field-tags').value = (editing.tags || []).join(', ');
      document.getElementById('field-notes').value = editing.notes || '';
      document.querySelector('#receipt-form button').textContent = 'Update Receipt';
    } else {
      document.getElementById('field-vendor').value = '';
      document.getElementById('field-date').value = new Date().toISOString().split('T')[0];
      document.getElementById('field-amount').value = '';
      document.getElementById('field-tags').value = '';
      document.getElementById('field-notes').value = '';
      document.querySelector('#receipt-form button').textContent = 'Save Receipt';
    }
    populateCategoryDropdown('field-category', state.categories, editing ? editing.categoryId : state.categories[0]?.id);
  }

  if (screen === 'dashboard' || screen === 'receipts') {
    populateFilterCategories(state.categories);
  }

  renderCurrentScreen();
  if (screen === 'dashboard') loadChartJS();
}

function parseTags(str) {
  return str.split(',').map(s => s.trim()).filter(Boolean);
}

function renderCurrentScreen() {
  switch (state.currentScreen) {
    case 'dashboard': renderDashboard(state); break;
    case 'receipts': renderReceiptList(state); break;
    case 'categories': renderCategoryList(state); break;
  }
}

async function loadChartJS() {
  if (state.Chart) return;
  try {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js';
    document.head.appendChild(s);
    await new Promise((resolve, reject) => { s.onload = resolve; s.onerror = reject; });
    state.Chart = window.Chart;
    if (state.currentScreen === 'dashboard') renderDashboard(state);
  } catch (e) {
    console.warn('Chart.js failed to load');
  }
}

function setupEvents() {
  document.getElementById('receipt-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      vendorName: document.getElementById('field-vendor').value.trim(),
      date: document.getElementById('field-date').value,
      amount: parseFloat(document.getElementById('field-amount').value) || 0,
      categoryId: parseInt(document.getElementById('field-category').value),
      tags: parseTags(document.getElementById('field-tags').value),
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

  document.getElementById('receipt-list').addEventListener('click', (e) => {
    const card = e.target.closest('.receipt-card');
    if (card) renderDetailModal(state, parseInt(card.dataset.id));
  });

  document.getElementById('recent-receipts').addEventListener('click', (e) => {
    const row = e.target.closest('.receipt-row');
    if (row) renderDetailModal(state, parseInt(row.dataset.id));
  });

  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
  document.getElementById('receipt-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

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
      await deleteReceipt(state.db, parseInt(delBtn.dataset.id));
      closeModal();
      await reloadData();
      renderCurrentScreen();
    }
  });

  document.getElementById('search-input').addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderReceiptList(state);
  });

  document.getElementById('add-cat-btn').addEventListener('click', async () => {
    const name = document.getElementById('new-cat-name').value.trim();
    if (!name) return;
    await addCategory(state.db, { name, color: document.getElementById('new-cat-color').value });
    document.getElementById('new-cat-name').value = '';
    await reloadData();
    renderCategoryList(state);
  });

  document.getElementById('category-list').addEventListener('click', async (e) => {
    const delBtn = e.target.closest('.del-cat');
    if (!delBtn) return;
    if (!confirm('Delete this category?')) return;
    await deleteCategory(state.db, parseInt(delBtn.dataset.id));
    await reloadData();
    renderCategoryList(state);
  });

  // Filter chips
  document.getElementById('filter-chips').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    document.querySelectorAll('#filter-chips .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    state.dateFilter = chip.dataset.filter;
    renderReceiptList(state);
  });

  // Category filter
  document.getElementById('filter-category').addEventListener('change', (e) => {
    state.categoryFilter = e.target.value;
    renderReceiptList(state);
  });

  // Sort
  document.getElementById('sort-by').addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    renderReceiptList(state);
  });

  // Camera
  document.getElementById('btn-camera').addEventListener('click', openCamera);
  document.getElementById('camera-close-btn').addEventListener('click', closeCamera);
  document.getElementById('capture-btn').addEventListener('click', capturePhoto);
  document.getElementById('camera-flip-btn').addEventListener('click', flipCamera);

  document.getElementById('btn-upload').addEventListener('click', () => {
    document.getElementById('file-input').click();
  });
  document.getElementById('file-input').addEventListener('change', handleFileUpload);

  document.getElementById('review-close-btn').addEventListener('click', () => {
    hideReviewOverlay();
    state.pendingImage = null;
  });
  document.getElementById('review-save-btn').addEventListener('click', saveFromReview);
}

async function openCamera() {
  try {
    const video = document.getElementById('camera-video');
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } }
    });
    video.srcObject = cameraStream;
    await video.play();
    document.getElementById('camera-overlay').classList.add('open');
  } catch (e) {
    alert('Camera access denied or not available.');
  }
}

function closeCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }
  document.getElementById('camera-video').srcObject = null;
  document.getElementById('camera-overlay').classList.remove('open');
}

function flipCamera() {
  facingMode = facingMode === 'environment' ? 'user' : 'environment';
  closeCamera();
  setTimeout(openCamera, 300);
}

async function capturePhoto() {
  const video = document.getElementById('camera-video');
  const canvas = document.getElementById('camera-canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
  closeCamera();
  await processImage(dataUrl);
}

async function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = '';
  const reader = new FileReader();
  reader.onload = async (ev) => {
    await processImage(ev.target.result);
  };
  reader.readAsDataURL(file);
}

async function processImage(dataUrl) {
  showProcessing({ status: 'loading', progress: 0, message: 'Starting...' });
  const compressed = await compressImage(dataUrl, 1200, 0.7);
  state.pendingImage = compressed;
  const ocrData = await runOCR(compressed, (status) => showProcessing(status));
  hideProcessing();

  if (ocrData && ocrData.text) {
    const extracted = extractReceiptData(ocrData.text);
    showReviewOverlay(compressed, extracted, state);
  } else {
    showReviewOverlay(compressed, { vendorName: '', date: '', total: 0, items: [], rawText: '' }, state);
  }
}

function compressImage(dataUrl, maxWidth, quality) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (w > maxWidth) { h = (h * maxWidth) / w; w = maxWidth; }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
  });
}

async function saveFromReview() {
  const data = {
    image: state.pendingImage,
    vendorName: document.getElementById('review-vendor').value.trim(),
    date: document.getElementById('review-date').value,
    amount: parseFloat(document.getElementById('review-amount').value) || 0,
    categoryId: parseInt(document.getElementById('review-category').value),
    tags: parseTags(document.getElementById('review-tags').value),
    notes: document.getElementById('review-notes').value.trim(),
    ocrText: document.getElementById('review-ocr-text').value
  };
  if (!data.vendorName || !data.date || data.amount <= 0) return;
  await addReceipt(state.db, data);
  state.pendingImage = null;
  hideReviewOverlay();
  await reloadData();
  navigate('receipts');
}

window.addEventListener('beforeunload', () => {
  if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
});
