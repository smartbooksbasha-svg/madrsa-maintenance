# AGENTS.md — Madrsa Maintenance Register

What: offline-first PWA — daily maintenance work register for the madrsa
(electrical/plumbing/carpentry/painting/AC/cleaning/building/other) with
entry-exit times, headmaster PDF report (print), monthly summary, backup.
Owner: Shan (madrsa in-charge). English UI (optional Urdu), Arctic Blue +
mosque crest brand, day/night theme.

## Files
- `index.html` — 5 views (today/register/report/summary/settings) + entry modal
- `app.js` — all logic, vanilla JS, no deps. Globals exposed for tests:
  `rowsToCSV`, `applyBackup`, `filteredEntries`, `durOf`, `go`, photo layer
  (`phOpen/phPut/phGet/phDel/phAll/phClear`, `compressPhoto`, `openViewer`)
- `styles.css` — design tokens + `@media print` (only `#printDoc` prints)
- `sw.js` — network-first SW. **Bump `CACHE` (`mmr-vN`) on every change** (now mmr-v9)
- `vendor/jspdf.umd.min.js` + `vendor/jspdf.plugin.autotable.min.js` +
  `vendor/html2canvas.min.js` (1.4.1) — self-hosted PDF libs, in sw SHELL
- `fonts/jameel-noori-nastaleeq.woff2` (5.5MB) — Urdu report font, lazy
  (downloaded when an Urdu report is first shown; runtime-cached by sw)
- `manifest.webmanifest`, `icons/` (mkicon.py = pure-stdlib generator)
- `tests/smoke.js` — jsdom smoke, run `npm test` (230 asserts, must stay green)

## Conventions
- Form inputs have NO name attributes — read via `$('id')`, never
  `form.elements` (jsdom gotcha).
- User data stored: `mmr_entries`, `mmr_workers`, `mmr_settings`, `mmr_theme`,
  `mmr_lang` ('en'/'ur'), `mmr_autofix` (1/0). `mmr_me` = profile.
- **v1.6 photos:** IndexedDB `mmr_photos` (db) / `photos` (store), key
  `<entryId>_before|<entryId>_after`, value = dataURL JPEG (canvas compress
  1280px q0.7). Entries carry only `hasBefore`/`hasAfter` booleans.
  `PH_MEM`/`PH_CACHE` make reads sync-ish; `photosReady()`/`preloadPhotos()`
  gate the report render so `phPhotoHtml()` can inline images. jsdom has no
  IndexedDB → layer silently falls back to memory (tests stub it).
  Report order: header → prepared-by → title → meta → 1 Summary → 2 Detailed
  register → 3 Photo record (`#repPhotos` toggle, default OFF) → follow-ups
  → signatures. Backup JSON `v:2` includes `photos`; v1 restore still works.
- v1.1 i18n: `I18N_UR` dict keyed by EXACT English strings; `translateTree()`
  (TreeWalker + WeakMap originals) + MutationObserver; `#repPreview`/`#printDoc`
  NEVER translate (report stays English); interpolated toasts use `tStr()`.
- v1.1 auto-fix: `autoEnglish()` offline HING rules on save (work/materials),
  `titleCase()` worker names; typed Urdu script (\u0600-\u06FF) never touched;
  toggle `#sAutoFix`. New UI strings must be added to I18N_UR too.
- Status model: derived — no exit = "working", exit stamped = "completed",
  optional "follow". `statusOf()` is the single source.
- v1.3 PDF: `buildPdf()` direct .pdf download (order: madrsa header →
  Prepared-by box → title/tables). Guards: `window.jspdf` missing OR any
  Urdu script in report data → `printReport()` fallback + toast (jsPDF core
  fonts can't render Arabic; 'Rs.' used, no ₹). New i18n keys added.
- v1.4 Urdu PDF: `pdfHasUrdu()` → `urduPdf(rows)` — jsPDF can't shape
  Arabic, so the browser renders the report into A4 page canvases
  (html2canvas, 794×1123px `.pdfpage` divs, DOM pagination + table
  row-split) and jsPDF wraps them as a real .pdf. Font =
  `fonts/jameel-noori-nastaleeq.woff2` via `@font-face 'Jameel Noori
  Nastaleeq'`, `jnnReady()` waits for `document.fonts.load` (8s cap).
  `sheetClass(rows)` = 'sheet ur' applied to preview/printDoc/pdfR →
  JNN everywhere. Text in Urdu PDFs is raster (not selectable).
- All user-entered strings pass through `esc()` before innerHTML.
- `confirm()`/`window.print()` are stubbed in tests — keep app calls guarded.

- **v1.7 update button:** `hardUpdate(btn)` = `liveVersion()` (fetch
  `app.js?ts=`, no-store, regex `APP_VER`) → `clearAppCaches()` →
  `dropServiceWorkers()` → `location.replace(freshUrl())`; `window.__updateUrl`
  records the target (tests). Offline (`liveVersion()` null) → abort, keep
  caches. `initSw()` owns registration (`updateViaCache:'none'`), badges
  `setUpdateState('ready')` when a worker is waiting, `reg.update()` on
  visibilitychange + 3s after boot, one reload on `controllerchange` (only if
  there was a controller). `[data-update]` = topbar / sidebar / settings
  buttons. `?v=` is stripped with `history.replaceState` after load.
  ⚠️ Never clear caches without a successful network check — that bricks the
  offline app.

- **v1.8 offline rules:** sw `install` adds SHELL **one file at a time**
  (`addAll()` helper) so a single 404 cannot leave the app uncached, then adds
  `OPTIONAL` (the 5.5MB Urdu font) best-effort, then `skipWaiting`. Offline
  fallback: `caches.match(r,{ignoreSearch:true})` → `./index.html` → `./`
  (needed because update reloads carry `?v=`). `offlineStatus()` (Settings →
  About, `#offNote`) checks 9 key files with `caches.match` and prints
  "Offline ready" (`.off-ok` green) or "Saving offline files (n/9)…".
  ⚠️ No external hosts allowed in any app file — the test suite fails if one
  appears. Everything (jspdf, autotable, html2canvas, fonts, icons) is local.

## Deploy
Push to `main` → GitHub Pages (root). Live:
https://smartbooksbasha-svg.github.io/madrsa-maintenance/
Pages CDN lags ~1 min after push — wait before verifying.
