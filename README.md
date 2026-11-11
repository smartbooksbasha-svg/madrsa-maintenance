# Madrsa Maintenance Register

Daily maintenance register for the madrsa — electrical, plumbing, carpentry
and other works, with daily **entry & exit times**, auto duration, a formal
**Headmaster Report** (print → PDF) and monthly summaries.

Live: https://smartbooksbasha-svg.github.io/madrsa-maintenance/

## Use
- **Today** — daily entries; "Mark exit" stamps the current time; workers
  still on site show as "On site now".
- **Register** — all entries with filters (dates, category, worker, status,
  search) + CSV export.
- **Report** — pick a period (today / week / month / custom) → "Print / Save
  as PDF" gives the headmaster-ready document; "Share summary" sends the
  text summary via WhatsApp.
- **Summary** — month-wise stats by category/worker + daily bar chart.
- **Settings** — language (English / Urdu), auto-fix English toggle, madrsa details (name goes on the report), workers list,
  backup/restore JSON, clear all.

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
- `npm test` — jsdom smoke test (117 assertions).
- `python3 tools/mkicon.py` — regenerate PWA icons.
- After any web change: bump the `CACHE` name in `sw.js`.
