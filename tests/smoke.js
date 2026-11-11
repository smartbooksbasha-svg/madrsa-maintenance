/* Madrsa Maintenance Register — jsdom smoke test
   Boots the real index.html + app.js and drives the main flows.
   Run: npm test (node tests/smoke.js) */
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log('FAIL: ' + msg); } };

function buildHtml() {
  let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const src = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8').split('</script>').join('<\\/script>');
  html = html.split('<script src="app.js" defer></script>').join('<script>\n' + src + '\n</script>');
  return html;
}

const wait = ms => new Promise(r => setTimeout(r, ms || 150));

async function boot(pre) {
  const st = pre || {};
  let printed = 0, blobUrl = 0, shared = null;
  const vc = new VirtualConsole();
  vc.on('jsdomError', () => {});
  const dom = new JSDOM(buildHtml(), {
    url: 'https://smartbooksbasha-svg.github.io/madrsa-maintenance/',
    runScripts: 'dangerously', virtualConsole: vc, pretendToBeVisual: true,
    beforeParse(w) {
      w.confirm = () => true;
      w.print = () => { printed++; };
      w.URL.createObjectURL = () => { blobUrl++; return 'blob:fake'; };
      w.URL.revokeObjectURL = () => {};
      try { Object.defineProperty(w.navigator, 'share', { value: (d) => { shared = d; return Promise.resolve(); }, configurable: true }); } catch (e) {}
      if (st.entries) w.localStorage.setItem('mmr_entries', JSON.stringify(st.entries));
      if (st.workers) w.localStorage.setItem('mmr_workers', JSON.stringify(st.workers));
      if (st.settings) w.localStorage.setItem('mmr_settings', JSON.stringify(st.settings));
      if (st.theme) w.localStorage.setItem('mmr_theme', JSON.stringify(st.theme));
      if (st.lang) w.localStorage.setItem('mmr_lang', JSON.stringify(st.lang));
      if (st.autofix !== undefined) w.localStorage.setItem('mmr_autofix', JSON.stringify(st.autofix));
    }
  });
  await wait(350);
  const win = dom.window, doc = win.document;
  return {
    win, doc, printed: () => printed, blobUrl: () => blobUrl, shared: () => shared,
    $: (id) => doc.getElementById(id),
    q: (s) => doc.querySelector(s),
    qa: (s) => Array.from(doc.querySelectorAll(s)),
    click: (el) => el.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true })),
    submit: (form) => form.dispatchEvent(new win.Event('submit', { bubbles: true, cancelable: true })),
    ls: (k) => JSON.parse(win.localStorage.getItem(k) || 'null')
  };
}

function setVal(t, id, v) { t.$(id).value = v; }
function setSel(t, id, v) { t.$(id).value = v; t.$(id).dispatchEvent(new t.win.Event('change', { bubbles: true })); }

function addEntry(t, o) {
  const d = o || {};
  t.click(t.$('addTodayBtn'));
  ok(!t.$('entryModal').classList.contains('hide'), 'modal opens');
  setVal(t, 'eDate', d.date || winToday());
  setSel(t, 'eCat', d.cat || 'electrical');
  setVal(t, 'eWorker', d.worker || 'Rafiq');
  setVal(t, 'eIn', d.in || '09:00');
  setVal(t, 'eOut', d.out === undefined ? '' : d.out);
  setVal(t, 'eWork', d.work || 'Changed classroom tube light');
  if (d.materials) setVal(t, 'eMaterials', d.materials);
  if (d.cost) setVal(t, 'eCost', String(d.cost));
  if (d.status) setSel(t, 'eStatus', d.status);
  t.submit(t.$('entryForm'));
}
function winToday() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

(async () => {
  /* ---------- 1. boot empty ---------- */
  const t = await boot();
  ok(t.$('v-today') && !t.$('v-today').classList.contains('hide'), 'today view visible on boot');
  ok(!t.$('v-register').classList.contains('hide') === false, 'register hidden');
  ok(/,\s\d{2} \w{3} \d{4}/.test(t.$('todayLabel').textContent), 'today date label rendered');
  ok(t.qa('#todayList .empty').length === 1, 'empty state on boot');
  ok(t.$('pgTitle').textContent === 'Today', 'page title Today');
  ok(t.qa('.navbtn').length === 5, '5 nav buttons');
  ok(t.$('verChip').textContent.indexOf('v1.5') === 0, 'version chip');
  ok(t.$('eCat').options.length === CATS_LEN(), 'category select filled');

  /* ---------- 2. add a completed entry ---------- */
  addEntry(t, { out: '17:00', materials: '2 tube lights', cost: 350 });
  ok(t.$('entryModal').classList.contains('hide'), 'modal closed after save');
  ok(t.qa('#todayList .ecard').length === 1, 'entry card appears');
  ok(t.$('todayList').textContent.indexOf('Rafiq') > -1, 'worker name shown');
  ok(t.$('todayList').textContent.indexOf('8h') > -1, '8h duration computed');
  ok(t.$('todayList').textContent.indexOf('₹350') > -1, 'cost shown');
  const saved = t.ls('mmr_entries');
  ok(saved && saved.length === 1 && saved[0].worker === 'Rafiq' && saved[0].out === '17:00', 'entry persisted');
  const chips = t.$('todayChips').textContent;
  ok(/1/.test(chips.split('Work entries')[0].slice(-4)), 'chip: 1 work entry');
  ok(chips.indexOf('8h') > -1, 'chip: total time 8h');
  ok(t.$('todayList').textContent.indexOf('Completed') > -1, 'status Completed');

  /* ---------- 3. working entry + mark exit ---------- */
  addEntry(t, { cat: 'plumbing', worker: 'Sattar', in: '14:30', out: '', work: 'Tap repair in wudu area' });
  ok(t.qa('#todayList .ecard').length === 2, 'second card appears');
  ok(t.$('todayList').textContent.indexOf('On site now') > -1, 'on-site status');
  const exitBtn = t.qa('[data-act="exit"]')[0];
  ok(!!exitBtn, 'mark-exit button exists');
  const before = new Date();
  t.click(exitBtn);
  await wait(60);
  const e2 = t.ls('mmr_entries').find(x => x.worker === 'Sattar');
  ok(/^\d{2}:\d{2}$/.test(e2.out), 'exit time stamped HH:MM');
  const mins = t.win.durOf(e2);
  ok(mins && mins.min >= 0, 'duration computed after exit');
  ok(t.$('todayList').textContent.indexOf('On site now') === -1, 'no longer on site');

  /* ---------- 4. overnight entry ---------- */
  addEntry(t, { cat: 'other', worker: 'Night Guard', in: '22:00', out: '01:00', work: 'Gate motor fix' });
  ok(t.$('todayList').textContent.indexOf('3h') > -1, 'overnight duration 3h');

  /* ---------- 5. register + filters ---------- */
  t.win.go('register');
  ok(!t.$('v-register').classList.contains('hide'), 'register view opens');
  ok(t.qa('#regBody tr').length === 3, 'register shows 3 rows');
  setSel(t, 'fCat', 'electrical');
  ok(t.qa('#regBody tr').length === 1, 'category filter narrows to 1');
  setSel(t, 'fCat', '');
  setVal(t, 'fSearch', 'Sattar');
  t.$('fSearch').dispatchEvent(new t.win.Event('input', { bubbles: true }));
  ok(t.qa('#regBody tr').length === 1, 'search narrows to Sattar');
  setVal(t, 'fSearch', '');
  t.$('fSearch').dispatchEvent(new t.win.Event('input', { bubbles: true }));
  setSel(t, 'fStatus', 'completed');
  ok(t.qa('#regBody tr').length >= 2, 'status filter completed works');
  setSel(t, 'fStatus', '');
  const csv = t.win.rowsToCSV(t.win.filteredEntries());
  ok(csv.indexOf('Date,Weekday,Category') > 0 && csv.charCodeAt(0) === 0xFEFF, 'CSV header (BOM + header row)');
  ok(csv.indexOf('Rafiq') > -1 && csv.indexOf('Sattar') > -1, 'CSV rows present');
  ok(csv.indexOf('350') > -1, 'CSV cost column');

  /* ---------- 6. edit (no duplication) ---------- */
  const editBtn = t.qa('#regBody [data-act="edit"]')[0];
  t.click(editBtn);
  ok(t.$('entryModal').classList.contains('hide') === false, 'edit modal opens');
  ok(t.$('mTitle').textContent === 'Edit entry', 'edit title');
  ok(t.$('eWorker').value === 'Rafiq', 'edit prefills worker');
  ok(!t.$('mDelete').classList.contains('hide'), 'delete button visible when editing');
  setVal(t, 'eWork', 'Changed 2 classroom tube lights + holder');
  t.submit(t.$('entryForm'));
  ok(t.ls('mmr_entries').length === 3, 'edit did not duplicate');
  ok(t.$('regBody').textContent.indexOf('holder') > -1, 'edited text visible');

  /* ---------- 7. delete ---------- */
  t.click(t.qa('#regBody [data-act="del"]')[0]);
  ok(t.ls('mmr_entries').length === 2, 'delete removes entry');
  ok(t.qa('#regBody tr').length === 2, 'table updates after delete');

  /* ---------- 8. report ---------- */
  t.win.go('report');
  ok(!t.$('v-report').classList.contains('hide'), 'report view opens');
  ok(t.q('.chipbtn[data-preset="month"]').classList.contains('active'), 'month preset active');
  const rep = t.$('repPreview').textContent;
  ok(rep.indexOf('MAINTENANCE WORK REPORT') > -1, 'report title');
  ok(rep.indexOf('Madrsa e Mohammadi') > -1, 'madrsa name in report');
  ok(rep.indexOf('Summary by category') > -1 && rep.indexOf('Detailed register') > -1, 'report sections');
  ok(rep.indexOf('Sattar') === -1, 'worker name removed from report (per spec)');
  ok(rep.indexOf('Total time') === -1 && rep.indexOf('Summary by worker') === -1, 'total time + worker summary removed');
  ok(rep.indexOf('Entry') > -1 && rep.indexOf('Exit') > -1, 'entry/exit columns in report');
  ok(rep.indexOf('Headmaster') > -1, 'signature block');
  ok(t.$('printDoc').textContent.indexOf('MAINTENANCE WORK REPORT') > -1, 'print doc filled');
  t.click(t.$('printRep'));
  await wait(400);
  ok(t.printed() === 1, 'window.print called');
  const shared1 = t.shared();
  t.click(t.$('shareRep'));
  await wait(120);
  ok(t.shared() && t.shared().text.indexOf('Maintenance Report') > -1, 'share summary text');

  /* custom range report */
  t.click(t.q('.chipbtn[data-preset="custom"]'));
  ok(!t.$('repRange').classList.contains('hide'), 'custom range inputs appear');
  setVal(t, 'rFrom', winToday()); setVal(t, 'rTo', winToday());
  t.click(t.$('genRep'));
  ok(t.$('repPreview').textContent.indexOf('MAINTENANCE WORK REPORT') > -1, 'custom range report generated');

  /* ---------- 9. summary ---------- */
  t.win.go('summary');
  ok(!t.$('v-summary').classList.contains('hide'), 'summary view opens');
  ok(t.$('sumCat').textContent.indexOf('Plumbing') > -1, 'summary by category');
  ok(t.$('sumWorker').textContent.indexOf('Sattar') > -1, 'summary by worker');
  const dayCount = new Date().getDate();
  ok(t.qa('#sumBars .bar').length >= dayCount, 'daily bars for whole month');
  ok(t.$('sumChips').textContent.indexOf('2') > -1, 'summary chip count');

  /* ---------- 10. settings + workers ---------- */
  t.win.go('settings');
  ok(t.$('sMadrsa').value === 'Madrsa e Mohammadi', 'settings prefilled');
  setVal(t, 'sHead', 'Moulana Abdul Kareem');
  t.submit(t.$('setForm'));
  ok(t.ls('mmr_settings').headmaster === 'Moulana Abdul Kareem', 'settings saved');
  setVal(t, 'wName', 'Bashir (painter)');
  setVal(t, 'wPhone', '9876543210');
  t.submit(t.$('wForm'));
  ok(t.ls('mmr_workers').length === 1, 'worker saved');
  ok(t.$('wList').textContent.indexOf('Bashir') > -1, 'worker in list');
  ok(t.qa('#workerList option').length >= 1, 'datalist suggestion added');
  /* headmaster name now appears in a fresh report */
  t.win.go('report');
  t.click(t.q('.chipbtn[data-preset="month"]'));
  ok(t.$('repPreview').textContent.indexOf('Moulana Abdul Kareem') > -1, 'headmaster in report signature');

  /* remove worker */
  t.win.go('settings');
  t.click(t.q('#wList [data-wdel]'));
  ok(t.ls('mmr_workers').length === 0, 'worker removed');

  /* ---------- 11. backup + restore ---------- */
  t.click(t.$('backupBtn'));
  ok(t.blobUrl() >= 1, 'backup triggers download');
  const backupObj = { app: 'madrsa-maintenance', v: 1, date: '2026-01-05T10:00:00Z',
    entries: [{ id: 'X1', date: winToday(), cat: 'electrical', worker: 'Old Worker', in: '09:00', out: '12:00', work: 'Old work', materials: '', cost: 0, status: 'auto' }],
    workers: [{ name: 'Old Worker', phone: '' }], settings: { madrsa: 'Test Madrsa', address: '', phone: '', headmaster: 'HM', incharge: 'IC' },
    me: { name: 'Old Incharge', phone: '', role: 'Secretary', photo: '' } };
  const restored = t.win.applyBackup(backupObj);
  await wait(80);
  ok(restored === true, 'applyBackup returns true');
  ok(t.ls('mmr_entries').length === 1 && t.ls('mmr_entries')[0].worker === 'Old Worker', 'entries replaced by backup');
  ok(t.ls('mmr_settings').madrsa === 'Test Madrsa', 'settings restored');
  ok(t.ls('mmr_me') && t.ls('mmr_me').name === 'Old Incharge' && t.ls('mmr_me').role === 'Secretary', 'my profile restored from backup');
  t.win.go('today');
  ok(t.$('todayList').textContent.indexOf('Old Worker') > -1, 'restored entry visible in today');

  /* ---------- 12. follow-up status ---------- */
  addEntry(t, { cat: 'building', worker: 'Mason Umar', in: '08:00', out: '16:00', work: 'Boundary wall crack', status: 'follow' });
  ok(t.$('todayList').textContent.indexOf('Follow-up') > -1, 'follow-up status chip');
  t.win.go('report');
  ok(t.$('repPreview').textContent.indexOf('Follow-ups pending') > -1, 'follow-up section in report');

  /* ---------- 13. clear all ---------- */
  t.win.go('settings');
  t.click(t.$('clearBtn'));
  ok(t.ls('mmr_entries').length === 0, 'clear all removes entries');
  t.win.go('today');
  ok(t.qa('#todayList .empty').length === 1, 'empty state after clear');

  /* ---------- 14. theme ---------- */
  const html = t.doc.documentElement;
  const before2 = html.getAttribute('data-theme');
  t.click(t.$('themeBtn'));
  ok(html.getAttribute('data-theme') !== before2, 'theme toggles');
  ok(t.ls('mmr_theme') === 'night' || t.ls('mmr_theme') === 'day', 'theme persisted');

  /* ---------- 15. persistence across reload ---------- */
  const seed = [{ id: 'K1', date: winToday(), cat: 'plumbing', worker: 'Sattar', in: '10:00', out: '13:30', work: 'Water tank leak', materials: '', cost: 0, status: 'auto', createdAt: 1 }];
  const t2 = await boot({ entries: seed, theme: 'night' });
  ok(t2.qa('#todayList .ecard').length === 1, 'preseeded entry renders after reload');
  ok(t2.$('todayList').textContent.indexOf('3h 30m') > -1, 'reloaded duration 3h 30m');
  ok(t2.doc.documentElement.getAttribute('data-theme') === 'night', 'night theme restored');
  ok(t2.$('todayChips').textContent.indexOf('3h 30m') > -1, 'reloaded chip total');

  /* ---------- 16. v1.1: auto-fix English ---------- */
  ok(t2.win.autoEnglish('light kharab hai') === 'Light faulty.', 'autoEnglish: light kharab hai');
  ok(t2.win.autoEnglish('nal ka paani phoot raha tha') === 'Tap water leaking.', 'autoEnglish: nal ka paani phoot raha tha');
  ok(t2.win.autoEnglish('kaam ho gaya') === 'Work completed.', 'autoEnglish: kaam ho gaya');
  ok(t2.win.autoEnglish('نل خراب ہے') === 'نل خراب ہے', 'autoEnglish: Urdu script untouched');
  ok(t2.win.titleCase('rafiq (electrician)') === 'Rafiq (Electrician)', 'titleCase: rafiq (electrician)');
  ok(t2.win.autoFixOn() === true, 'auto-fix defaults ON');
  ok(t2.$('sAutoFix').checked === true, 'checkbox reflects default ON');

  addEntry(t2, { worker: 'rafiq (electrician)', work: 'light kharab hai', materials: '1 naya pankha', out: '12:00' });
  const fx = t2.ls('mmr_entries').find(x => x.worker === 'Rafiq (Electrician)');
  ok(!!fx, 'worker name title-cased on save');
  ok(fx && fx.work === 'Light faulty.', 'hinglish work auto-fixed on save');
  ok(fx && fx.materials === '1 new fan.', 'hinglish materials auto-fixed on save');
  ok(t2.$('toasts').textContent.indexOf('English auto-fixed') > -1, 'auto-fix toast shown');

  /* toggle OFF → raw text saved */
  t2.$('sAutoFix').checked = false;
  t2.$('sAutoFix').dispatchEvent(new t2.win.Event('change', { bubbles: true }));
  ok(t2.ls('mmr_autofix') === 0, 'auto-fix OFF persisted');
  ok(t2.$('toasts').textContent.indexOf('OFF') > -1, 'auto-fix OFF toast');
  addEntry(t2, { worker: 'raw man', work: 'light kharab hai', out: '11:00' });
  const raw = t2.ls('mmr_entries').find(x => x.worker === 'raw man');
  ok(raw && raw.work === 'light kharab hai' && raw.worker === 'raw man', 'raw text saved when OFF');
  t2.$('sAutoFix').checked = true;
  t2.$('sAutoFix').dispatchEvent(new t2.win.Event('change', { bubbles: true }));

  /* ---------- 17. v1.1: Urdu UI, report stays English ---------- */
  t2.$('langSel').value = 'ur';
  t2.$('langSel').dispatchEvent(new t2.win.Event('change', { bubbles: true }));
  ok(t2.doc.documentElement.getAttribute('dir') === 'rtl', 'ur: dir rtl');
  ok(t2.ls('mmr_lang') === 'ur', 'ur: language persisted');
  ok(t2.$('pgTitle').textContent === 'آج', 'ur: page title translated');
  const navActive = t2.q('.navbtn.active span');
  ok(navActive && navActive.textContent === 'آج', 'ur: active nav label translated');
  ok(t2.$('todayChips').textContent.indexOf('ورک انٹریاں') > -1, 'ur: chips translated');
  ok(t2.$('todayList').textContent.indexOf('مکمل') > -1, 'ur: card status translated');
  const hintUr = t2.q('#v-settings .card .hint');
  ok(hintUr && hintUr.textContent.indexOf('ہنگلش') > -1, 'ur: auto-fix hint translated');

  t2.win.go('report');
  await wait(80);
  ok(t2.$('repPreview').textContent.indexOf('MAINTENANCE WORK REPORT') > -1, 'ur: report title stays English');
  ok(t2.$('repPreview').textContent.indexOf('رپورٹ') === -1, 'ur: no Urdu inside report preview');
  ok(t2.$('printDoc').textContent.indexOf('MAINTENANCE WORK REPORT') > -1, 'ur: print doc stays English');

  t2.win.setLang('en');
  ok(t2.doc.documentElement.getAttribute('dir') === 'ltr', 'en: back to ltr');
  ok(t2.$('pgTitle').textContent === 'Headmaster Report', 'en: title restored');

  /* ---------- 18. v1.1: language + auto-fix persist across reload ---------- */
  const t3 = await boot({ entries: seed, lang: 'ur', autofix: 0 });
  ok(t3.doc.documentElement.getAttribute('dir') === 'rtl', 'reload: ur restores rtl');
  ok(t3.$('pgTitle').textContent === 'آج', 'reload: ur title translated');
  ok(t3.$('langSel').value === 'ur', 'reload: topbar select synced');
  ok(t3.$('langSel2').value === 'ur', 'reload: settings select synced');
  ok(t3.win.autoFixOn() === false, 'reload: auto-fix OFF restored');
  ok(t3.$('sAutoFix').checked === false, 'reload: checkbox reflects OFF');

  /* ---------- 19. v1.2: my profile + madrsa profile photo ---------- */
  t2.win.go('settings');
  ok(!!t2.$('meForm') && !!t2.$('mPhotoBtn'), 'profile UI present');
  setVal(t2, 'meName', 'shan');
  setVal(t2, 'mePhone', '9870011223');
  setVal(t2, 'meRole', 'in-charge, maintenance register');
  t2.submit(t2.$('meForm'));
  const meS = t2.ls('mmr_me');
  ok(meS && meS.name === 'Shan' && meS.phone === '9870011223' && meS.role === 'in-charge, maintenance register', 'my profile saved (name title-cased)');
  ok(t2.ls('mmr_settings').incharge === 'Shan', 'incharge synced from my profile');
  ok(t2.$('toasts').textContent.indexOf('Profile saved') > -1, 'profile saved toast');

  t2.win.go('report');
  t2.click(t2.q('.chipbtn[data-preset="month"]'));
  ok(t2.$('repPreview').textContent.indexOf('Shan') > -1, 'prepared-by name in report');
  ok(t2.$('repPreview').textContent.indexOf('in-charge, maintenance register') > -1, 'prepared-by role in report');

  /* madrsa photo → sidebar logo, report header, print doc */
  t2.win.go('settings');
  t2.win.settings.photo = 'data:image/png;base64,iVBORw0KGgo=';
  t2.win.saveSettings(t2.win.settings);
  t2.win.applyBrand(); t2.win.applyPhotoPrev();
  ok(t2.q('#brandLogo').classList.contains('has'), 'madrsa photo shows in sidebar');
  ok(t2.$('mPhotoBtn').textContent.indexOf('Change photo') > -1, 'upload button becomes Change photo');
  t2.win.go('report');
  t2.click(t2.q('.chipbtn[data-preset="month"]'));
  const rlogo = t2.q('#repPreview .rlogo');
  ok(rlogo && rlogo.getAttribute('src').indexOf('data:') === 0, 'madrsa photo as report logo');
  ok(t2.$('printDoc').innerHTML.indexOf('rlogo') > -1, 'print doc has the logo');

  /* remove photo → crest back */
  t2.win.go('settings');
  t2.click(t2.$('mPhotoRemove'));
  ok(t2.ls('mmr_settings').photo === '', 'photo removed persisted');
  ok(!t2.q('#brandLogo').classList.contains('has'), 'crest back after photo removed');

  /* ---------- 20. v1.3: PDF file save + prepared-by block in report ---------- */
  t2.win.go('report');
  t2.click(t2.q('.chipbtn[data-preset="month"]'));
  const repTxt = t2.$('repPreview').textContent;
  ok(repTxt.indexOf('Prepared by') > -1 && repTxt.indexOf('9870011223') > -1, 'prepared-by block with phone in preview');
  ok(repTxt.indexOf('Shan — in-charge, maintenance register') > -1, 'prepared-by name + role line');
  ok(!!t2.$('pdfRep'), 'Save PDF file button present');

  /* stub jsPDF (vendor script is not fetched in jsdom) */
  let savedPdf = null, atCount = 0;
  t2.win.jspdf = { jsPDF: function () {
    return {
      setFont: function () {}, setFontSize: function () {}, setTextColor: function () {},
      setDrawColor: function () {}, setFillColor: function () {},
      text: function () {}, line: function () {}, roundedRect: function () {},
      addImage: function () {}, setPage: function () {}, addPage: function () {},
      getNumberOfPages: function () { return 1; },
      getTextWidth: function () { return 22; },
      autoTable: function () { atCount++; this.lastAutoTable = { finalY: 80 }; },
      save: function (n) { savedPdf = n; }
    };
  } };
  t2.click(t2.$('pdfRep'));
  ok(savedPdf && /^madrsa-report-.+\.pdf$/.test(savedPdf), 'pdf saved with filename');
  ok(atCount >= 2, 'pdf has category+detail tables');
  ok(t2.$('toasts').textContent.indexOf('PDF file saved') > -1, 'pdf saved toast');

  /* Urdu → Jameel Noori Nastaleeq raster PDF path (not print fallback) */
  const printedBefore = t2.printed();
  t2.win.me.name = 'شاں';
  t2.click(t2.q('.chipbtn[data-preset="month"]'));
  ok(t2.$('repPreview').className.indexOf('ur') > -1, 'preview sheet gets ur class for Urdu data');
  let h2cCalls = 0;
  t2.win.html2canvas = function () {
    h2cCalls++;
    return Promise.resolve({ width: 1588, height: 2246, toDataURL: function () { return 'data:image/png;base64,AAAA'; } });
  };
  savedPdf = null; atCount = 0;
  t2.click(t2.$('pdfRep'));
  await wait(300);
  ok(savedPdf && /^madrsa-report-.+\.pdf$/.test(savedPdf), 'urdu pdf saved with filename');
  ok(h2cCalls >= 1, 'html2canvas rendered urdu page(s)');
  ok(t2.printed() === printedBefore, 'urdu path does not fall back to print');
  ok(t2.$('toasts').textContent.indexOf('PDF file saved') > -1, 'urdu pdf saved toast');
  ok(!t2.q('#pdfR'), 'pdf render host cleaned up');

  /* back to English → vector pdf works again */
  t2.win.me.name = 'Shan';
  t2.click(t2.q('.chipbtn[data-preset="month"]'));
  ok(t2.$('repPreview').className.indexOf('ur') === -1, 'preview sheet back to english');
  savedPdf = null; atCount = 0;
  t2.click(t2.$('pdfRep'));
  ok(savedPdf && atCount >= 2, 'vector pdf works after urdu round');

  /* no engine → falls back to print */
  delete t2.win.jspdf;
  const printed2 = t2.printed();
  t2.click(t2.$('pdfRep'));
  await wait(400);
  ok(t2.printed() === printed2 + 1, 'missing engine falls back to print');

  console.log('RESULT: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(1); });

function CATS_LEN() { return 8; }
