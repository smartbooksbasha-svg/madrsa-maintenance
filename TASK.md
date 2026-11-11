# TASK — Madrsa Maintenance Register

GOAL: Madrsa ka maintenance kaam (electrical, plumbing, others) ka daily
register app — entry/exit time, headmaster ko PDF report. Live PWA on
GitHub Pages (smartbooksbasha-svg), offline-first (localStorage).

PLAN: see PROJECT_PLAN.md (mini-PRD + stages).

## Steps
- [x] Skills loaded (webdev, survey-dashboard-app, html-jsdom-smoke-test, pwa-static-site)
- [x] Project folder ~/madrsa-maintenance + fonts copied (Sora + Manrope woff2)
- [ ] Icons generated (arctic blue mosque crest, 192/512/maskable/apple)
- [ ] index.html + styles.css + app.js (5 views: Today/Register/Report/Summary/Settings)
- [ ] sw.js + manifest.webmanifest (PWA, cache mmr-v1)
- [ ] jsdom smoke test green (tests/smoke.js, npm test)
- [ ] Deploy: repo smartbooksbasha-svg/madrsa-maintenance, Pages on, live 200
- [ ] Memory updated (AGENTS.md, vault session note, playbook)

## Decisions
- PWA (not APK): PDF/print core feature — browser print is the proven path;
  installs on home screen like an app, works offline. APK wrapper possible later.
- No login: data stays on device (localStorage) — a visitor sees an empty app,
  Shan's data never leaves his phone.
- English UI (report is formal, for headmaster). Arctic blue accent + mosque
  crest = Shan's picked brand family (masjid apps). Day + night toggle.
- Status model: no-exit = "Working (on site)", exit stamped = Completed,
  optional "Follow-up needed". Mark-exit button stamps current time.
- Report = print-to-PDF (@media print) + Web Share summary text. No jsPDF.
- Local-first: no Supabase needed (single-user register).

NOW: writing app files.
