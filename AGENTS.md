# AGENTS.md — Madrsa Maintenance Register

What: offline-first PWA — daily maintenance work register for the madrsa
(electrical/plumbing/carpentry/painting/AC/cleaning/building/other) with
entry-exit times, headmaster PDF report (print), monthly summary, backup.
Owner: Shan (madrsa in-charge). English UI (optional Urdu), Arctic Blue +
mosque crest brand, day/night theme.

## Files
- `index.html` — 5 views (today/register/report/summary/settings) + entry modal
- `app.js` — all logic, vanilla JS, no deps. Globals exposed for tests:
  `rowsToCSV`, `applyBackup`, `filteredEntries`, `durOf`, `go`
- `styles.css` — design tokens + `@media print` (only `#printDoc` prints)
- `sw.js` — network-first SW. **Bump `CACHE` (`mmr-vN`) on every change** (now mmr-v4)
- `vendor/jspdf.umd.min.js` + `vendor/jspdf.plugin.autotable.min.js` — self-hosted
  PDF libs (jsPDF 2.5.2 / autotable 3.8.2), in sw SHELL
- `manifest.webmanifest`, `icons/` (mkicon.py = pure-stdlib generator)
- `tests/smoke.js` — jsdom smoke, run `npm test` (140 asserts, must stay green)

## Conventions
- Form inputs have NO name attributes — read via `$('id')`, never
  `form.elements` (jsdom gotcha).
- User data stored: `mmr_entries`, `mmr_workers`, `mmr_settings`, `mmr_theme`,
  `mmr_lang` ('en'/'ur'), `mmr_autofix` (1/0).
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
- All user-entered strings pass through `esc()` before innerHTML.
- `confirm()`/`window.print()` are stubbed in tests — keep app calls guarded.

## Deploy
Push to `main` → GitHub Pages (root). Live:
https://smartbooksbasha-svg.github.io/madrsa-maintenance/
Pages CDN lags ~1 min after push — wait before verifying.
