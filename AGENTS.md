# ReceiptLens — Agent Instructions

## Project Status (updated 2026-05-13)

**Live app** — a fully functional Malaysia receipt tracking SPA with landing page, camera/OCR, dashboard charts, filters, tags, and e-invoice export. All client-side, no backend, no accounts.

## Current State

- **index.html** — SPA shell (459 lines) + landing page with 7 sections (Hero, Problem, Solution, Showcase, Testimonials, CTA, Footer). Still has emoji in bottom nav icons and scan-option buttons — needs finishing.
- **css/app.css** — All styles (1533 lines). Dark Premium theme (#0a0e17 base, gold #d4a853 accent, glass-morphism, Playfair Display + DM Sans + JetBrains Mono).
- **js/app.js** — App init, navigation, camera, OCR pipeline, chart loader, filter/sort/tag events, landing launch.
- **js/ui.js** — DOM rendering for all screens. Already rewritten — no emoji.
- **js/ocr.js** — Tesseract.js wrapper (dynamic load, worker management, progress), regex extraction for Malaysian receipts.
- **js/db.js** — IndexedDB wrapper (openDB, seedCategories, CRUD for receipts/categories).
- **README.md** — Has features, tech stack, competitor comparison table.

## To Do

### High Priority
- Finish index.html emoji removal (bottom nav 4 items to text-only, scan-option 📷📁 to SVGs)
- Update css/app.css nav/scan-button selectors if needed after markup changes

### Medium Priority
- Phase 4: Malaysia e-Invoice UBL 2.1 XML export (downloadable for MyInvois portal upload)
- Test all functionality after UI changes

### Low Priority
- Add batch scanning
- Add LHDN tax relief tracking
- PWA manifest + service worker for offline install

## Key Conventions

- Pure HTML/CSS/JS ES modules — no build tools
- Serve via `python3 -m http.server 8080`, file:// won't work
- All external libs loaded dynamically from CDN (Tesseract.js, Chart.js)
- No emoji in app UI — use styled accent divs, category-color borders, typographic placeholders
- Dark Premium theme with glass-morphism cards
- Mobile-first responsive, 200px sidebar on desktop
- IndexedDB schema-less — tags and image stored directly on receipt object
- Image compression: 1200px JPEG quality 0.7

## Git

- Remote: `git@github.com:NixonCustomUse/receipt-capture.git`
- User: nixon / kamina11258@gmail.com
