# TASK — Madrsa Maintenance Register

GOAL: Madrsa ka maintenance kaam (electrical, plumbing, others) ka daily
register app — entry/exit time, headmaster ko PDF report. Live PWA on
GitHub Pages (smartbooksbasha-svg), offline-first (localStorage).

PLAN: see PROJECT_PLAN.md (mini-PRD + stages).

## Steps
- [x] Skills loaded (webdev, survey-dashboard-app, html-jsdom-smoke-test, pwa-static-site)
- [x] Project folder ~/madrsa-maintenance + fonts copied (Sora + Manrope woff2)
- [x] Icons generated (arctic blue mosque crest, 192/512/maskable/apple)
- [x] index.html + styles.css + app.js (5 views: Today/Register/Report/Summary/Settings)
- [x] sw.js + manifest.webmanifest (PWA, cache mmr-v1)
- [x] jsdom smoke test green (tests/smoke.js, npm test — 83/83)
- [x] Deploy: repo smartbooksbasha-svg/madrsa-maintenance, Pages on, live 200
- [x] Memory updated (AGENTS.md, vault session note, playbook)
- [x] v1.1: Urdu UI (I18N_UR dict + translateTree + MutationObserver, topbar
      #langSel + Settings #langSel2, RTL layout, report zone always English)
- [x] v1.1: auto-fix English (HING rules + autoEnglish + titleCase, save wiring,
      Settings toggle #sAutoFix, mmr_autofix, Urdu script never touched)
- [x] v1.1: sw cache mmr-v2, tests 117/117 green, commit 4d3a555 deployed
- [x] v1.2: Madrsa profile — photo/logo upload (canvas 512px JPEG) → report
      header + sidebar crest + favicon; Settings card renamed
- [x] v1.2: My profile (Shan) — name/phone/role/photo (`mmr_me`), feeds
      report "Prepared by", incharge synced from profile; backup/restore
      includes me; sw mmr-v3, tests 130/130, commit 0bbc32c

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

NOW: DONE — v1.2 live (commit 0bbc32c): Urdu UI + auto-fix English + madrsa
profile (photo/logo) + my profile (Prepared by). Awaiting Shan's next round.
Backup zip v1.0: $ZYVO_SESSION_DIR/madrsa-maintenance-v1.0.zip.
