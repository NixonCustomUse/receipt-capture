const DB_NAME = 'receipt-capture';
const DB_VERSION = 1;

const DEFAULT_CATEGORIES = [
  { name: 'Food & Drinks', color: '#FF6B6B' },
  { name: 'Transport', color: '#4ECDC4' },
  { name: 'Shopping', color: '#45B7D1' },
  { name: 'Bills & Utilities', color: '#96CEB4' },
  { name: 'Healthcare', color: '#FFEAA7' },
  { name: 'Entertainment', color: '#DDA0DD' },
  { name: 'Others', color: '#B0B0B0' }
];

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('receipts')) {
        const store = db.createObjectStore('receipts', { keyPath: 'id', autoIncrement: true });
        store.createIndex('date', 'date', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
      if (!db.objectStoreNames.contains('categories')) {
        const store = db.createObjectStore('categories', { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = (e) => {
      const db = e.target.result;
      seedCategories(db).then(() => resolve(db));
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

function seedCategories(db) {
  return new Promise((resolve) => {
    const tx = db.transaction('categories', 'readonly');
    const store = tx.objectStore('categories');
    const countReq = store.count();
    countReq.onsuccess = () => {
      if (countReq.result === 0) {
        const writeTx = db.transaction('categories', 'readwrite');
        const writeStore = writeTx.objectStore('categories');
        DEFAULT_CATEGORIES.forEach(cat => writeStore.add(cat));
        writeTx.oncomplete = () => resolve();
        writeTx.onerror = () => resolve();
      } else {
        resolve();
      }
    };
    countReq.onerror = () => resolve();
  });
}

function getAllReceipts(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('receipts', 'readonly');
    const store = tx.objectStore('receipts');
    const index = store.index('createdAt');
    const req = index.getAll();
    req.onsuccess = () => resolve(req.result.reverse());
    req.onerror = () => reject(req.error);
  });
}

function getReceipt(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('receipts', 'readonly');
    const store = tx.objectStore('receipts');
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function addReceipt(db, receipt) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('receipts', 'readwrite');
    const store = tx.objectStore('receipts');
    const data = { ...receipt, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const req = store.add(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function updateReceipt(db, id, updates) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('receipts', 'readwrite');
    const store = tx.objectStore('receipts');
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const data = { ...getReq.result, ...updates, updatedAt: new Date().toISOString() };
      const putReq = store.put(data);
      putReq.onsuccess = () => resolve(putReq.result);
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

function deleteReceipt(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('receipts', 'readwrite');
    const store = tx.objectStore('receipts');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function getAllCategories(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('categories', 'readonly');
    const store = tx.objectStore('categories');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function addCategory(db, category) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('categories', 'readwrite');
    const store = tx.objectStore('categories');
    const req = store.add(category);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function deleteCategory(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('categories', 'readwrite');
    const store = tx.objectStore('categories');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export {
  openDB,
  getAllReceipts,
  getReceipt,
  addReceipt,
  updateReceipt,
  deleteReceipt,
  getAllCategories,
  addCategory,
  deleteCategory
};
