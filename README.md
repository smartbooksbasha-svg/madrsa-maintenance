# Madrsa Maintenance Register

Daily maintenance register for the madrsa — electrical, plumbing, carpentry
and other works, with daily **entry & exit times**, auto duration, a formal
**Headmaster Report** (print → PDF, direct PDF file download), **before/after
work photos** and monthly summaries.

Live: https://smartbooksbasha-svg.github.io/madrsa-maintenance/

## Use
- **Today** — daily entries; "Mark exit" stamps the current time; workers
  still on site show as "On site now".
- **Register** — all entries with filters (dates, category, worker, status,
  search) + CSV export.
- **Report** — pick a period (today / week / month / custom) → headmaster-ready
  document (madrsa name → prepared-by → maintenance details): "Print / Save as
  PDF" opens print, "Save PDF file" downloads the .pdf directly (offline),
  "Share summary" sends the text summary via WhatsApp, and "Include work
  photos" adds a Photo Record (before / after, side by side) to the document.
- **Summary** — month-wise stats by category/worker + daily bar chart.
- **Photos** — add a "before" photo when the work starts and an "after" photo
  when it is done (camera or gallery). Photos are compressed to max 1280px and
  stored privately in IndexedDB on this phone, never in the text data. Tap any
  thumbnail for a full-screen view; the Register has a Photos column.
- **Update app** — a refresh button in the topbar, the sidebar footer and
  Settings → About. It fetches the live version, clears the offline cache,
  removes the old service worker and reloads a fresh copy (a dot appears on
  the button when a new version is already downloaded). Needs internet; it
  refuses to run offline so the offline app never gets wiped.
- **Settings** — language (English / Urdu), auto-fix English toggle, madrsa
  profile (photo/logo, details), my profile (name/phone/role — goes on the
  report as "Prepared by"), workers list, backup/restore JSON (photos
  included, v2), photo storage usage, clear all.

## Facts
- Offline-first PWA — **fully offline after one online load**: every file it
  uses (styles, script, PDF engine, html2canvas, fonts incl. the Urdu report
  font, icons) is precached on the device. No CDN, no external request.
  Settings → About shows "Offline ready" when the copy is complete.
- Data lives in this device's localStorage — no server, no login.
- Vanilla HTML/CSS/JS, zero dependencies, self-hosted fonts.
- v1.1: UI can switch to **Urdu** (topbar + Settings); the printed
  headmaster report always stays English. Notes typed in Hinglish
  ("light kharab hai") are auto-fixed to clean English ("Light faulty.")
  on save — offline rule engine, toggleable in Settings; typed Urdu
  script is never modified.

## Dev
- `npm test` — jsdom smoke test (230 assertions; photo layer tested with a
  stubbed IndexedDB, update flow with stubbed fetch/caches/service worker, plus
  a static offline audit: every precached path exists, zero external hosts).
- `python3 tools/mkicon.py` — regenerate PWA icons.
- After any web change: bump the `CACHE` name in `sw.js`.
