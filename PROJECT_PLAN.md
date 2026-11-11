# PROJECT_PLAN — Madrsa Maintenance Register

## Mini-PRD
- **Vision**: Shan madrsa me maintenance kaam (electrician, plumber, mistry…)
  ka daily register rakhta hai — kaun aaya, kab aaya, kab gaya, kya kaam hua —
  aur month ke end me headmaster ko saaf PDF report deta hai.
- **Users**: Shan (in-charge, single user, data-entry). Headmaster = report
  receiver (PDF/print), not an app user.
- **Must have**: add entry (date, category, worker, entry time, exit time,
  work done, materials, cost, status) · auto duration · "mark exit = now" ·
  today view · register with filters/search · period report (print→PDF,
  share, CSV) · monthly summary · settings (madrsa name, headmaster,
  workers list) · backup/restore · day/night · offline PWA.
- **Out of scope (v1)**: login, cloud sync, multi-user, photos.
- **Success**: entry 30 sec me ho jaye; PDF report headmaster ko dena layak
  lage; data phone pe hi rahe.

## Stages
- [x] 1-9 compressed into mini-PRD above (small tool app)
- [x] 10 Build plan: 5 views, one app.js, no deps, vanilla JS
- [ ] 11 Implementation (single pass, one screen at a time mentally)
- [ ] 12 Testing: jsdom smoke (npm test)
- [ ] 13 Responsive: mobile-first, drawer sidebar ≤980px, 375px check
- [ ] 14 Security: no secrets, localStorage only, escape HTML
- [ ] 15 Performance: 2 woff2 fonts + vanilla JS, <300KB
- [ ] 16 A11y: labels, focus rings, aria-labels, 44px taps
- [ ] 17 PWA: manifest + sw network-first + icons
- [ ] 18-19b UAT + customization round AFTER deploy (ask Shan)
- [ ] 20 Pre-launch checklist (webdev QA list)
- [ ] 21 Deploy: GitHub Pages smartbooksbasha-svg/madrsa-maintenance
- [ ] 22 Post-launch: memory, vault note, version stamp
