# ReceiptLens — Malaysia Receipt Tracker

A privacy-first, client-side receipt tracking PWA for Malaysian users. No accounts, no servers, no data leaving your device.

## Features

- **Landing Page** — Dark Editorial funnel (Hero, Problem, Solution, Showcase, Testimonials, CTA, Footer)
- **Dashboard** — Monthly bar chart + category doughnut (Chart.js), date filter chips, category filter, sort controls
- **Receipts** — Searchable list with category-color borders, tags, detail modal with edit/delete
- **Add Receipt** — Camera capture (front/back flip), file upload, Tesseract.js OCR (eng+msa), regex extraction (vendor/date/total/items), review overlay with editable fields, image compression (1200px JPEG q0.7)
- **Categories** — Default set (Food, Transport, Utilities, Shopping, Health, Entertainment, Education, Other) with editable name/color/budget
- **Tags** — Comma-separated on entry, displayed on cards and detail modal, filterable
- **Export** — Malaysia MyInvois UBL 2.1 XML for e-invoice portal upload

## Tech Stack

- Pure HTML/CSS/JS (ES modules, no build tools)
- Tesseract.js (browser OCR, ~8 MB, loaded on demand)
- Chart.js (loaded on demand)
- IndexedDB (local storage, no backend)
- Dark Premium theme (#0a0e17 base, gold #d4a853 accent, glass-morphism)

## Usage

```bash
python3 -m http.server 8080
```

Open http://localhost:8080 in a browser.

## Design

- **Fonts:** Playfair Display (headings), DM Sans (body), JetBrains Mono (amounts)
- **Mobile-first** responsive with 200px sidebar nav on desktop
- **No emoji** in app UI — clean typographic placeholders with accent-colored borders
- **Glass cards** with `backdrop-filter: blur()` and subtle border highlights

## Competitor Comparison

| Feature | ReceiptLens | CheqPls | ReceiptLah | ReceiptKu | Papero |
|---|---|---|---|---|---|
| **Price** | Free | Free | Free (IAP) | Free (IAP) | Free (IAP) |
| **Platform** | Web PWA | Web PWA | Android | iOS | iOS |
| **Fully client-side** | ✓ | ✗ | ✓ | ✗ | ✗ |
| **No account required** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Malaysia e-Invoice (UBL 2.1)** | ✓ | ✗ | ✗ | ✗ | ✗ |
| **OCR engine** | Tesseract.js (free) | Proprietary AI | On-device AI | Proprietary AI | Proprietary AI |
| **Camera capture** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Charts & analytics** | ✓ | ✓ | Limited | Limited | ✓ |
| **Tags** | ✓ | ✗ | ✓ | ✗ | ✓ |
| **Offline capable** | ✓ | Partial | ✓ | Partial | Partial |
| **LHDN tax tracking** | ✗ | ✓ | ✓ | ✓ | ✗ |
| **Batch scanning** | ✗ | ✗ | ✗ | ✗ | ✓ |
| **Export formats** | UBL 2.1 XML | CSV | Excel, PDF | Excel | PDF, CSV, JSON |

**Key differentiators:** ReceiptLens is the only fully client-side, free PWA with Malaysia MyInvois UBL 2.1 XML export. No servers, no subscriptions, no data leaving your device.

## License

MIT
