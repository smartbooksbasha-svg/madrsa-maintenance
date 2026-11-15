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
- **Settings** — language (English / Urdu), auto-fix English toggle, madrsa
  profile (photo/logo, details), my profile (name/phone/role — goes on the
  report as "Prepared by"), workers list, backup/restore JSON (photos
  included, v2), photo storage usage, clear all.

## Facts
- Offline-first PWA (installable, works with no internet).
- Data lives in this device's localStorage — no server, no login.
- Vanilla HTML/CSS/JS, zero dependencies, self-hosted fonts.
- v1.1: UI can switch to **Urdu** (topbar + Settings); the printed
  headmaster report always stays English. Notes typed in Hinglish
  ("light kharab hai") are auto-fixed to clean English ("Light faulty.")
  on save — offline rule engine, toggleable in Settings; typed Urdu
  script is never modified.

## Dev
- `npm test` — jsdom smoke test (183 assertions; photo layer tested with a
  stubbed IndexedDB).
- `python3 tools/mkicon.py` — regenerate PWA icons.
- After any web change: bump the `CACHE` name in `sw.js`.
