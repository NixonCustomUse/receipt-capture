let TesseractModule = null;
let ocrWorker = null;

function loadTesseractScript() {
  return new Promise((resolve, reject) => {
    if (window.Tesseract) { TesseractModule = window.Tesseract; resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    s.onload = () => { TesseractModule = window.Tesseract; resolve(); };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export async function ensureOCRReady(onProgress) {
  if (ocrWorker) return true;
  try {
    onProgress && onProgress({ status: 'loading', progress: 0, message: 'Loading OCR engine...' });
    await loadTesseractScript();
    onProgress && onProgress({ status: 'loading', progress: 0.3, message: 'Initialising...' });
    ocrWorker = await TesseractModule.createWorker('eng+msa', 1, {
      logger: m => {
        if (onProgress) {
          if (m.status === 'loading tesseract core') onProgress({ status: 'loading', progress: 0.1, message: 'Loading OCR engine...' });
          else if (m.status === 'initializing tesseract') onProgress({ status: 'loading', progress: 0.3, message: 'Initialising...' });
          else if (m.status === 'loading language traineddata') onProgress({ status: 'loading', progress: 0.5, message: 'Loading language data...' });
          else if (m.status === 'initializing api') onProgress({ status: 'loading', progress: 0.7, message: 'Preparing...' });
          else if (m.status === 'recognizing text') onProgress({ status: 'ocr', progress: 0.7 + (m.progress || 0) * 0.3, message: 'Reading receipt...' });
        }
      }
    });
    onProgress && onProgress({ status: 'done', progress: 1, message: 'Ready' });
    return true;
  } catch (e) {
    console.error('OCR init failed:', e);
    onProgress && onProgress({ status: 'error', progress: 0, message: 'Failed to load OCR' });
    return false;
  }
}

export async function runOCR(imageData, onProgress) {
  const ready = await ensureOCRReady(onProgress);
  if (!ready) return null;
  try {
    const { data } = await ocrWorker.recognize(imageData);
    return data;
  } catch (e) {
    console.error('OCR failed:', e);
    return null;
  }
}

export function terminateOCR() {
  if (ocrWorker) { ocrWorker.terminate(); ocrWorker = null; }
}

export function extractReceiptData(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return { vendorName: '', date: '', total: 0, items: [], rawText: text };

  let vendorName = '';
  let date = '';
  let total = 0;
  const items = [];

  const datePatterns = [
    /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/,
    /\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/,
    /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{2,4})\b/i,
  ];

  const totalPatterns = [
    /(?:total|jumlah|amount|due|sum|grand total)[:\s]*RM?\s*([\d,]+\.?\d*)/i,
    /RM?\s*([\d,]+\.\d{2})\s*$/im,
    /(?:total|jumlah|amount)[:\s]*([\d,]+\.\d{2})/i,
    /^([\d,]+\.\d{2})\s*$/m,
  ];

  let vendorFound = false;
  let dateFound = false;
  let totalFound = false;

  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i];
    if (!line || line.length < 2) continue;
    if (/^\d/.test(line)) continue;
    if (line.length > 50) continue;
    if (/^(tel|fax|email|www|no\.|receipt|invoice|bill|payment|thank|term|cond|loc)/i.test(line)) continue;
    if (!vendorFound) {
      vendorName = line;
      vendorFound = true;
    }
  }

  if (!vendorName && lines.length > 0) {
    vendorName = lines[0];
  }

  for (const line of lines) {
    for (const pat of datePatterns) {
      const m = line.match(pat);
      if (m) {
        const d = m[0];
        if (d.length >= 8) {
          try {
            const parsed = new Date(d);
            if (!isNaN(parsed.getTime())) {
              date = parsed.toISOString().split('T')[0];
              dateFound = true;
              break;
            }
          } catch(e) {}
        }
      }
    }
    if (dateFound) break;
  }

  for (const line of lines) {
    for (const pat of totalPatterns) {
      const m = line.match(pat);
      if (m) {
        const val = parseFloat(m[1].replace(/,/g, ''));
        if (!isNaN(val) && val > 0) {
          if (!totalFound || val > total) {
            total = val;
            totalFound = true;
          }
        }
      }
    }
  }

  let inItems = false;
  for (const line of lines) {
    if (/^(qty|item|desc|product|barang|kuantiti)/i.test(line)) { inItems = true; continue; }
    if (/^(total|jumlah|amount|subtotal|cash|change)/i.test(line)) { inItems = false; continue; }
    if (inItems && line.length > 3) {
      const itemMatch = line.match(/^(.+?)\s+([\d,]+\.?\d*)\s*$/);
      if (itemMatch) {
        items.push({ description: itemMatch[1].trim(), total: parseFloat(itemMatch[2].replace(/,/g, '')) || 0 });
      } else {
        const multiMatch = line.match(/^(.+?)\s+([\d.]+)\s*x\s*([\d.]+)\s*=\s*([\d.]+)$/i);
        if (multiMatch) {
          items.push({ description: multiMatch[1].trim(), quantity: parseFloat(multiMatch[2]), unitPrice: parseFloat(multiMatch[3]), total: parseFloat(multiMatch[4]) });
        }
      }
    }
  }

  return { vendorName, date, total, items, rawText: text };
}
