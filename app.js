/* Madrsa Maintenance Register — v1.0
   Local-first PWA: daily work entries (entry/exit time), headmaster
   report (print→PDF), monthly summary, backup. No dependencies. */
'use strict';

var APP_VER = 'v1.2';
var LS = { E: 'mmr_entries', W: 'mmr_workers', S: 'mmr_settings', T: 'mmr_theme', L: 'mmr_lang', F: 'mmr_autofix', ME: 'mmr_me' };

var CATS = [
  { id: 'electrical', label: 'Electrical',   dot: '#d97706' },
  { id: 'plumbing',   label: 'Plumbing',    dot: '#0e7490' },
  { id: 'carpentry',  label: 'Carpentry',   dot: '#a16207' },
  { id: 'painting',   label: 'Painting',    dot: '#7c3aed' },
  { id: 'acfan',      label: 'AC / Fan',    dot: '#0369a1' },
  { id: 'cleaning',   label: 'Cleaning',    dot: '#0f766e' },
  { id: 'building',   label: 'Building',    dot: '#57534e' },
  { id: 'other',      label: 'Other',       dot: '#64748b' }
];

var MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var MONF = ['January','February','March','April','May','June','July','August','September','October','November','December'];
var WD = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

/* ---------- tiny utils ---------- */
function $(id) { return document.getElementById(id); }
function qs(sel, root) { return (root || document).querySelector(sel); }
function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function pad(n) { return String(n).padStart(2, '0'); }
function uid() { return 'E' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function isoOf(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function todayISO() { return isoOf(new Date()); }
function nowHM() { var d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
function t2m(hm) { if (!hm) return null; var p = hm.split(':'); return (+p[0]) * 60 + (+p[1]); }
function fmtDur(min) {
  if (min == null) return '—';
  if (min <= 0) return '0m';
  var h = Math.floor(min / 60), m = min % 60;
  return (h ? h + 'h ' : '') + (m ? m + 'm' : '') || h + 'h';
}
function durOf(e) {
  if (!e.in || !e.out) return null;
  var d = t2m(e.out) - t2m(e.in);
  var over = false;
  if (d < 0) { d += 1440; over = true; }
  return { min: d, overnight: over };
}
function fmtDate(iso) {
  if (!iso) return '—';
  var p = iso.split('-');
  return (+p[2]) + ' ' + MON[+p[1] - 1] + ' ' + p[0];
}
function wdOf(iso) {
  var p = iso.split('-');
  return WD[new Date(+p[0], +p[1] - 1, +p[2]).getDay()];
}
function monthLabel(ym) {
  var p = ym.split('-');
  return MONF[+p[1] - 1] + ' ' + p[0];
}
function statusOf(e) {
  if (e.status === 'follow') return 'follow';
  return e.out ? 'completed' : 'working';
}
var ST_LABEL = { working: 'On site now', completed: 'Completed', follow: 'Follow-up' };
function catById(id) {
  for (var i = 0; i < CATS.length; i++) if (CATS[i].id === id) return CATS[i];
  return CATS[CATS.length - 1];
}
function cmpEntry(a, b) {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return (t2m(a.in) || 0) - (t2m(b.in) || 0);
}

/* ---------- storage ---------- */
function lsGet(k, fb) {
  try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch (e) { return fb; }
}
function lsSet(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); return true; }
  catch (e) { toast('Storage full — take a backup and clear old data'); return false; }
}
function loadEntries() { var a = lsGet(LS.E, []); return Array.isArray(a) ? a : []; }
function saveEntries(a) { return lsSet(LS.E, a); }
function loadWorkers() { var a = lsGet(LS.W, []); return Array.isArray(a) ? a : []; }
function saveWorkers(a) { return lsSet(LS.W, a); }
var DEF_SET = { madrsa: 'Madrsa e Mohammadi', address: '', phone: '', headmaster: '', incharge: '', photo: '' };
var DEF_ME = { name: '', phone: '', role: '', photo: '' };
function loadSettings() {
  var s = lsGet(LS.S, {});
  var out = {};
  for (var k in DEF_SET) out[k] = s && s[k] != null && s[k] !== '' ? s[k] : DEF_SET[k];
  return out;
}
function saveSettings(s) { return lsSet(LS.S, s); }
function loadMe() { return Object.assign({}, DEF_ME, lsGet(LS.ME, {}) || {}); }
function saveMe(m) { me = m; return lsSet(LS.ME, m); }

/* ---------- profile photos (madrsa logo + my photo) ---------- */
function readPhoto(file, cb) {
  if (!file) return;
  if (!/^image\//.test(file.type)) { toast('Could not read that image'); return; }
  var fr = new FileReader();
  fr.onload = function () {
    var img = new Image();
    img.onload = function () {
      try {
        var mx = 512, w = img.width || mx, h = img.height || mx;
        var sc = Math.min(1, mx / Math.max(w, h));
        var cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(w * sc));
        cv.height = Math.max(1, Math.round(h * sc));
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        cb(cv.toDataURL('image/jpeg', 0.82));
      } catch (e) { cb(String(fr.result)); }
    };
    img.onerror = function () { toast('Could not read that image'); };
    img.src = String(fr.result);
  };
  fr.onerror = function () { toast('Could not read that image'); };
  fr.readAsDataURL(file);
}
/* uploaded madrsa photo replaces the crest everywhere (sidebar + report + favicon) */
function applyBrand() {
  var src = settings.photo || '';
  var bl = $('brandLogo');
  if (bl) {
    if (src) { bl.src = src; }
    else bl.removeAttribute('src');
    bl.classList.toggle('has', !!src);
  }
  var fav = document.querySelector('link[rel="icon"]');
  if (fav) fav.setAttribute('href', src || 'icons/icon-192.png');
}
function applyPhotoPrev() {
  var mp = $('mPhotoBox'), mep = $('mePhotoBox');
  if (mp) {
    var img = mp.querySelector('img');
    if (settings.photo) img.src = settings.photo;
    mp.classList.toggle('has', !!settings.photo);
    var b = $('mPhotoBtn');
    if (b) b.querySelector('span').textContent = tStr(settings.photo ? 'Change photo' : 'Upload photo');
  }
  if (mep) {
    var img2 = mep.querySelector('img');
    if (me.photo) img2.src = me.photo;
    mep.classList.toggle('has', !!me.photo);
    var b2 = $('mePhotoBtn');
    if (b2) b2.querySelector('span').textContent = tStr(me.photo ? 'Change photo' : 'Upload photo');
  }
}

/* ---------- icons ---------- */
function svgi(inner) {
  return '<svg viewBox="0 0 24 24" aria-hidden="true">' + inner + '</svg>';
}
var IC = {
  clock: svgi('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  edit: svgi('<path d="M12 20h9"/><path d="M16.5 3.5l4 4L8 20H4v-4z"/>'),
  trash: svgi('<path d="M4 7h16"/><path d="M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2"/><path d="M6 7l1 13a1.5 1.5 0 0 0 1.5 1.4h7A1.5 1.5 0 0 0 17 20l1-13"/><path d="M10 11.5v5M14 11.5v5"/>'),
  out: svgi('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>'),
  empty: svgi('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>'),
  warn: svgi('<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>'),
  phone: svgi('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2z"/>'),
  wrench: svgi('<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>'),
  camera: svgi('<path d="M4 8h3l2-3h6l2 3h3a1.5 1.5 0 0 1 1.5 1.5V19a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 19V9.5A1.5 1.5 0 0 1 4 8z"/><circle cx="12" cy="14" r="3.4"/>'),
  person: svgi('<circle cx="12" cy="8.5" r="3.4"/><path d="M5.5 19.5c1-3.6 3.5-5.3 6.5-5.3s5.5 1.7 6.5 5.3"/>')
};
var CREST = '<svg viewBox="0 0 64 64" aria-hidden="true">'
  + '<defs><linearGradient id="cg2" x1="0" y1="0" x2="0" y2="1">'
  + '<stop offset="0" stop-color="#2f86ea"/><stop offset="1" stop-color="#1b53a8"/></linearGradient></defs>'
  + '<rect width="64" height="64" rx="16" fill="url(#cg2)"/>'
  + '<g fill="#ffffff"><rect x="18" y="34" width="28" height="18" rx="2"/>'
  + '<path d="M32 15c-5.5 3.8-9.5 6.4-9.5 12.6V34h19v-6.4C41.5 21.4 37.5 18.8 32 15z"/>'
  + '<rect x="31" y="10.5" width="2" height="5" rx="1"/><circle cx="32" cy="8.8" r="1.8"/>'
  + '<rect x="11.5" y="20" width="4.4" height="32" rx="1.6"/><circle cx="13.7" cy="16.8" r="2.4"/>'
  + '<rect x="48.1" y="20" width="4.4" height="32" rx="1.6"/><circle cx="50.3" cy="16.8" r="2.4"/></g>'
  + '<rect x="28" y="40" width="8" height="12" rx="4" fill="#123f8f"/></svg>';

/* ---------- i18n — English default, Urdu optional ---------- */
var LANG = 'en';
var I18N_UR = {
  /* nav + view heads */
  'Today': 'آج', 'Register': 'رجسٹر', 'Report': 'رپورٹ', 'Summary': 'خلاصہ',
  'Settings': 'ترتیبات', 'Work Register': 'ورک رجسٹر',
  'Headmaster Report': 'ہیڈ ماسٹر رپورٹ', 'Monthly Summary': 'ماہانہ خلاصہ',
  'Daily register': 'روزانہ رجسٹر', 'Add work entry': 'نیا کام شامل کریں',
  'Add entry': 'انٹری شامل کریں', 'From': 'سے', 'To': 'تک', 'Category': 'قسم',
  'Worker': 'کاریگر', 'Status': 'صورتحال', 'All': 'سب',
  'On site now': 'ابھی موجود', 'Completed': 'مکمل', 'Follow-up': 'فالو اپ',
  'Follow-ups': 'فالو اپس', 'Search': 'تلاش', 'Clear': 'صاف کریں',
  'Yesterday': 'کل', 'This week': 'اس ہفتے', 'This month': 'اس ماہ',
  'Last month': 'پچھلے ماہ', 'All time': 'تمام عرصہ', 'Custom…': 'خود منتخب…',
  'Generate': 'بنائیں', 'Print / Save as PDF': 'پرنٹ / PDF محفوظ کریں',
  'Share summary': 'خلاصہ شیئر کریں',
  'Pick a period, generate the report, then print it to PDF or share the summary with the headmaster.':
    'مدت منتخب کریں، رپورٹ بنائیں، پھر PDF پرنٹ کریں یا ہیڈ ماسٹر کو خلاصہ بھیجیں۔',
  /* categories */
  'Electrical': 'الیکٹریکل', 'Plumbing': 'پلمبنگ', 'Carpentry': 'بڑھئی کا کام',
  'Painting': 'پینٹنگ', 'AC / Fan': 'اے سی / پنکھا', 'Cleaning': 'صفائی',
  'Building': 'بلڈنگ', 'Other': 'دیگر',
  /* today view */
  'Work entries': 'ورک انٹریاں', 'Total time': 'کل وقت',
  'No entries yet today': 'آج ابھی کوئی انٹری نہیں',
  'When a worker arrives, tap “Add work entry” — the clock starts from his entry time.':
    'جب کوئی کاریگر آئے تو “نیا کام شامل کریں” دبائیں — حساب اس کے آنے کے وقت سے شروع ہوتا ہے۔',
  'Mark exit': 'رفتگی درج کریں', 'Edit': 'تبدیل کریں', 'Delete': 'حذف کریں',
  'still on site': 'ابھی موجود ہے', '(overnight)': '(رات گئے)',
  /* entry form */
  'Date': 'تاریخ', 'Worker name': 'کاریگر کا نام', 'Phone': 'فون',
  'Entry time': 'آمد کا وقت', 'Exit time': 'رفتگی کا وقت', 'Now': 'ابھی',
  'Work done': 'کیا گیا کام', 'Materials used': 'استعمال شدہ سامان',
  'Cost (₹, optional)': 'لاگت (₹، اختیاری)',
  'Auto — by exit time': 'خودکار — رفتگی کے وقت سے',
  'Follow-up needed': 'فالو اپ درکار ہے', 'Save entry': 'انٹری محفوظ کریں',
  'Cancel': 'منسوک', 'Edit entry': 'انٹری تبدیل کریں',
  'e.g. Rafiq (electrician)': 'مثلاً رفیق (الیکٹریشن)', 'optional': 'اختیاری',
  'e.g. Changed classroom tube light': 'مثلاً کلاس روم کی ٹیوب لائٹ بدلی',
  'e.g. 2 tube lights, 5m wire — optional': 'مثلاً 2 ٹیوب لائٹس، 5 میٹر تار — اختیاری',
  /* register */
  'entries': 'انٹریاں', 'total time': 'کل وقت', 'average': 'اوسط',
  'No entries match': 'کوئی انٹری نہیں ملی',
  'Change the filters, or add a new entry.': 'فلٹر بدلیں، یا نئی انٹری شامل کریں۔',
  /* summary */
  'By category': 'قسم کے مطابق', 'By worker': 'کاریگر کے مطابق',
  'Daily works —': 'روزانہ کام —', 'No entries this month.': 'اس ماہ کوئی انٹری نہیں۔',
  'No workers this month.': 'اس ماہ کوئی کاریگر نہیں۔',
  /* settings */
  'Language & English': 'زبان اور انگریزی', 'App language': 'ایپ کی زبان',
  'Auto-fix English': 'انگریزی خودکار درست',
  'Turns Hinglish notes into clean English when saving — “light kharab hai” becomes “Light faulty.” The printed report always stays in English.':
    'محفوظ کرتے وقت ہنگلش نوٹ خودکار صاف انگریزی بن جاتے ہیں — “light kharab hai” بنے گا “Light faulty.” چھپی رپورٹ ہمیشہ انگریزی میں رہتی ہے۔',
  'Madrsa profile': 'مدرسہ کی پروفائل', 'Madrsa name': 'مدرسہ کا نام',
  'Address (optional)': 'پتہ (اختیاری)', 'Phone (optional)': 'فون (اختیاری)',
  'Headmaster name (optional)': 'ہیڈ ماسٹر کا نام (اختیاری)',
  'Save details': 'تفصیلات محفوظ کریں', 'Workers list': 'کاریگروں کی فہرست',
  'My profile': 'میری پروفائل', 'Your name': 'آپ کا نام',
  'Role (optional)': 'عہدہ (اختیاری)',
  'e.g. In-charge, Secretary': 'مثلاً ذمہ دار، سیکرٹری',
  'Save profile': 'پروفائل محفوظ کریں',
  'Your name and role appear on the report as “Prepared by”.': 'آپ کا نام اور عہدہ رپورٹ میں “Prepared by” کے طور پر آتا ہے۔',
  'Upload photo': 'تصویر لگائیں', 'Change photo': 'تصویر بدلیں',
  'Remove photo': 'تصویر ہٹائیں',
  'This photo becomes the logo on the report and the app icon.':
    'یہ تصویر رپورٹ اور ایپ آئیکن پر لوگو بن جاتی ہے۔',
  'Name': 'نام', 'Add worker': 'کاریگر شامل کریں',
  'These names appear as suggestions while adding entries.':
    'یہ نام انٹری شامل کرتے وقت تجویز کے طور پر نظر آتے ہیں۔',
  'No saved workers yet': 'ابھی کوئی کاریگر محفوظ نہیں',
  'Data': 'ڈیٹا', 'Backup (JSON file)': 'بیک اپ (JSON فائل)',
  'Restore from backup': 'بیک اپ بحال کریں', 'Clear all data': 'تمام ڈیٹا صاف کریں',
  'All data stays on this device. Take a backup regularly — before clearing or changing phones.':
    'تمام ڈیٹا اسی فون میں رہتا ہے۔ باقاعدگی سے بیک اپ لیں — صاف کرنے یا فون بدلنے سے پہلے۔',
  'About': 'تعارف',
  'Madrsa Maintenance Register — works offline, installs like an app. Entries are stored on this device only.':
    'مدرسہ مینٹیننس رجسٹر — بغیر انٹرنیٹ چلتا ہے، ایپ کی طرح انسٹال ہوتا ہے۔ انٹریاں صرف اسی فون میں محفوظ ہوتی ہیں۔',
  'Install app': 'ایپ انسٹال کریں',
  'iPhone: open this page in Safari → Share → “Add to Home Screen”.':
    'آئی فون: یہ صفحہ Safari میں کھولیں، پھر Share → “Add to Home Screen” دبائیں۔',
  'Street, area': 'گلی، علاقہ', 'Contact number': 'رابطہ نمبر',
  'Report signature line': 'رپورٹ کے دستخط کی جگہ',
  'Who prepares the report': 'رپورٹ کون تیار کرتا ہے',
  /* toasts */
  'Entry saved': 'انٹری محفوظ ہو گئی', 'Entry updated': 'انٹری اپ ڈیٹ ہو گئی',
  'Entry deleted': 'انٹری حذف ہو گئی', 'Exit time recorded': 'رفتگی کا وقت درج ہو گیا',
  'English auto-fixed — entry saved': 'انگریزی خودکار درست ہوئی — انٹری محفوظ ہو گئی',
  'Worker added': 'کاریگر شامل ہو گیا', 'Worker removed': 'کاریگر ہٹا دیا گیا',
  'This worker is already in the list': 'یہ کاریگر پہلے سے فہرست میں ہے',
  'Enter a worker name': 'کاریگر کا نام لکھیں',
  'Details saved': 'تفصیلات محفوظ ہو گئیں',
  'Profile saved': 'پروفائل محفوظ ہو گئی', 'Enter your name': 'اپنا نام لکھیں',
  'Photo updated': 'تصویر بدل گئی', 'Photo removed': 'تصویر ہٹ گئی',
  'Could not read that image': 'یہ تصویر نہیں پڑھی جا سکی',
  'Backup file downloaded': 'بیک اپ فائل ڈاؤن لوڈ ہو گئی',
  'Backup restored': 'بیک اپ بحال ہو گیا', 'All data cleared': 'تمام ڈیٹا صاف ہو گیا',
  'Nothing to clear': 'صاف کرنے کو کچھ نہیں',
  'Summary copied — paste anywhere': 'خلاصہ کاپی ہو گیا — کہیں بھی پیسٹ کریں',
  'Pick both dates': 'دونوں تاریخوں کا انتخاب کریں',
  '“From” date is after “To”': '“سے” کی تاریخ “تک” کے بعد ہے',
  'Please fill date, category, worker, entry time and work':
    'تاریخ، قسم، کاریگر، آمد کا وقت اور کام — سب پُر کریں',
  'No entries in this period': 'اس مدت میں کوئی انٹری نہیں',
  'Nothing to export with these filters': 'ان فلٹرز کے ساتھ کچھ برآمد نہیں',
  'Auto-fix English is ON': 'انگریزی خودکار درست آن ہے',
  'Auto-fix English is OFF': 'انگریزی خودکار درست آف ہے',
  'Could not share': 'شیئر نہیں ہو سکا', 'Download failed': 'ڈاؤن لوڈ ناکام',
  'Print not available in this browser': 'اس براؤزر میں پرنٹ دستیاب نہیں',
  'Storage full — take a backup and clear old data': 'اسٹوریج بھر گیا — بیک اپ لیں اور پرانا ڈیٹا صاف کریں',
  'Already installed, or use browser menu → “Install app”':
    'پہلے سے انسٹال ہے، یا براؤزر مینو → “Install app” استعمال کریں'
};
var _origNode = new WeakMap();
var _origPh = new WeakMap();
var _tmo = null;

function tStr(s) { return LANG === 'ur' && I18N_UR[s] ? I18N_UR[s] : s; }
function inReportZone(el) {
  /* the headmaster report document is ALWAYS English */
  for (var p = el && el.parentElement; p; p = p.parentElement) {
    if (p.id === 'repPreview' || p.id === 'printDoc') return true;
  }
  return false;
}
function translateTree() {
  if (!document.body) return;
  var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
  var nodes = [];
  while (walker.nextNode()) {
    var n = walker.currentNode;
    if (!n.nodeValue || !n.nodeValue.trim()) continue;
    var p = n.parentElement;
    if (!p) continue;
    var tag = p.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') continue;
    if (inReportZone(p)) continue;
    nodes.push(n);
  }
  nodes.forEach(function (n) {
    var key = n.nodeValue.trim();
    if (LANG === 'ur') {
      var v = I18N_UR[key];
      if (v) {
        if (!_origNode.has(n)) _origNode.set(n, n.nodeValue);
        n.nodeValue = n.nodeValue.replace(key, v);
      }
    } else {
      var o = _origNode.get(n);
      if (o != null) { n.nodeValue = o; _origNode.delete(n); }
    }
  });
  qsa('[placeholder]').forEach(function (el) {
    var ph = el.getAttribute('placeholder');
    if (!ph) return;
    if (LANG === 'ur') {
      var v = I18N_UR[ph];
      if (v) {
        if (!_origPh.has(el)) _origPh.set(el, ph);
        el.setAttribute('placeholder', v);
      }
    } else {
      var o = _origPh.get(el);
      if (o != null) { el.setAttribute('placeholder', o); _origPh.delete(el); }
    }
  });
}
function queueTranslate() {
  if (_tmo) clearTimeout(_tmo);
  _tmo = setTimeout(translateTree, 30);
}
function setLang(l) {
  LANG = l === 'ur' ? 'ur' : 'en';
  lsSet(LS.L, LANG);
  document.documentElement.setAttribute('lang', LANG === 'ur' ? 'ur' : 'en');
  document.documentElement.setAttribute('dir', LANG === 'ur' ? 'rtl' : 'ltr');
  ['langSel', 'langSel2'].forEach(function (id) { if ($(id)) $(id).value = LANG; });
  translateTree();
}
function initLang() {
  var s = lsGet(LS.L, 'en');
  if (s !== 'ur') s = 'en';
  LANG = s;
  document.documentElement.setAttribute('lang', s);
  document.documentElement.setAttribute('dir', s === 'ur' ? 'rtl' : 'ltr');
  ['langSel', 'langSel2'].forEach(function (id) { if ($(id)) $(id).value = s; });
  if (s === 'ur') translateTree();
}

/* ---------- auto English (Hinglish → clean English, offline rules) ---------- */
var HING = [
  [/\bband kar diya\b/gi, 'switched off'],
  [/\bband kiya\b/gi, 'switched off'],
  [/\bband (?:tha|thi|hai|ha)\b/gi, 'off'],
  [/\btheek kar diya\b/gi, 'repaired'],
  [/\btheek kiya\b/gi, 'repaired'],
  [/\bphoot raha\b/gi, 'leaking'],
  [/\btoot gaya\b/gi, 'broke'],
  [/\bkar diya\b/gi, 'done'],
  [/\bkar liya\b/gi, 'done'],
  [/\blaga diya\b/gi, 'installed'],
  [/\bbadal diya\b/gi, 'replaced'],
  [/\bbadla diya\b/gi, 'replaced'],
  [/\bho gaya\b/gi, 'completed'],
  [/\bcheck kiya\b/gi, 'checked'],
  [/\bchange kiya\b/gi, 'changed'],
  [/\bsaaf kiya\b/gi, 'cleaned'],
  [/\bkharab\b/gi, 'faulty'],
  [/\bkaam\b/gi, 'work'],
  [/\bkiya\b/gi, 'done'],
  [/\bhua\b/gi, 'done'],
  [/\bnahi\b/gi, 'not'],
  [/\bnahin\b/gi, 'not'],
  [/\bchalu\b/gi, 'running'],
  [/\bsaaf\b/gi, 'clean'],
  [/\btoota\b/gi, 'broken'],
  [/\bphoota\b/gi, 'leaking'],
  [/\bphoot\b/gi, 'leak'],
  [/\bnal\b/gi, 'tap'],
  [/\bpankha\b/gi, 'fan'],
  [/\bbijli\b/gi, 'electricity'],
  [/\bbadla\b/gi, 'replaced'],
  [/\bnayi\b/gi, 'new'],
  [/\bnaya\b/gi, 'new'],
  [/\bpurani\b/gi, 'old'],
  [/\bpurana\b/gi, 'old'],
  [/\bkamra\b/gi, 'room'],
  [/\bkamre\b/gi, 'rooms'],
  [/\bpaani\b/gi, 'water'],
  [/\bpani\b/gi, 'water'],
  [/\bmistri\b/gi, 'mason'],
  [/\bmistry\b/gi, 'mason'],
  [/\btanki\b/gi, 'tank'],
  [/\bchhat\b/gi, 'roof'],
  [/\bdeewar\b/gi, 'wall'],
  [/\bdiwar\b/gi, 'wall'],
  [/\bdarwaza\b/gi, 'door'],
  [/\bkhidki\b/gi, 'window'],
  [/\blagaya\b/gi, 'installed'],
  [/\btheek\b/gi, 'fixed'],
  [/\bjama\b/gi, 'fixed'],
  [/\bhataya\b/gi, 'removed'],
  [/\b(?:ka|ki|ke|kar|hai|ha|tha|thi|raha|rahi)\b/gi, ' ']
];
function autoEnglish(s) {
  if (!s) return s;
  s = String(s);
  if (/[\u0600-\u06FF]/.test(s)) return s; /* typed Urdu — never touch */
  HING.forEach(function (r) { s = s.replace(r[0], r[1]); });
  s = s.replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([,.;:!?])(?=[A-Za-z0-9])/g, '$1 ')
    .trim();
  s = s.replace(/\bi\b/g, 'I');
  if (s) {
    s = s.charAt(0).toUpperCase() + s.slice(1);
    if (!/[.!?)\]"]$/.test(s)) s += '.';
  }
  return s;
}
function titleCase(s) {
  if (!s) return s;
  s = String(s).trim();
  if (/[\u0600-\u06FF]/.test(s)) return s;
  return s.replace(/\S+/g, function (w) {
    /* capitalize the first letter, even behind a bracket — "(electrician)" → "(Electrician)" */
    return w.replace(/^([(\[{“"'-]*)([a-z])/, function (all, pre, ch) { return pre + ch.toUpperCase(); });
  });
}
function autoFixOn() {
  var v = lsGet(LS.F, 1);
  return v !== 0 && v !== '0' && v !== false;
}

/* ---------- state ---------- */
var entries = [];
var workers = [];
var settings = loadSettings();
var me = loadMe();
var editingId = null;
var view = 'today';
var repState = { preset: 'month', from: null, to: null };
var sumState = { month: null };

/* ---------- toast ---------- */
var toastQ = null;
function toast(msg) {
  var box = $('toasts');
  if (!box) return;
  box.innerHTML = '<div class="toast">' + esc(msg) + '</div>';
  clearTimeout(toastQ);
  toastQ = setTimeout(function () { box.innerHTML = ''; }, 2600);
}

/* ---------- theme ---------- */
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t === 'night' ? 'night' : 'day');
}
function initTheme() {
  var saved = lsGet(LS.T, null);
  if (saved !== 'day' && saved !== 'night') saved = 'day';
  applyTheme(saved);
}
function toggleTheme() {
  var now = document.documentElement.getAttribute('data-theme') === 'night' ? 'day' : 'night';
  applyTheme(now);
  lsSet(LS.T, now);
}

/* ---------- router ---------- */
var TITLES = { today: 'Today', register: 'Work Register', report: 'Headmaster Report', summary: 'Monthly Summary', settings: 'Settings' };
function go(v) {
  view = v;
  qsa('.view').forEach(function (s) { s.classList.add('hide'); });
  var el = $('v-' + v);
  if (el) el.classList.remove('hide');
  $('pgTitle').textContent = TITLES[v] || '';
  qsa('.navbtn').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-go') === v); });
  closeDrawer();
  if (v === 'today') renderToday();
  if (v === 'register') renderRegister();
  if (v === 'report') initReportView();
  if (v === 'summary') renderSummary();
  if (v === 'settings') renderSettings();
}
function openDrawer() { $('side').classList.add('open'); $('scrim').classList.add('open'); }
function closeDrawer() { $('side').classList.remove('open'); $('scrim').classList.remove('open'); }

/* ---------- worker name helpers ---------- */
function allWorkerNames() {
  var s = {};
  workers.forEach(function (w) { if (w.name) s[w.name] = 1; });
  entries.forEach(function (e) { if (e.worker) s[e.worker] = 1; });
  return Object.keys(s).sort();
}
function workerPhone(name) {
  for (var i = 0; i < workers.length; i++) if (workers[i].name === name) return workers[i].phone || '';
  for (var j = 0; j < entries.length; j++) if (entries[j].worker === name && entries[j].phone) return entries[j].phone;
  return '';
}

/* =================== TODAY =================== */
function renderToday() {
  var t = todayISO();
  $('todayLabel').textContent = wdOf(t) + ', ' + fmtDate(t);
  var todays = entries.filter(function (e) { return e.date === t; }).sort(cmpEntry);
  var totalMin = 0, onSite = 0, follow = 0;
  todays.forEach(function (e) {
    var d = durOf(e);
    if (d) totalMin += d.min;
    if (statusOf(e) === 'working') onSite++;
    if (statusOf(e) === 'follow') follow++;
  });
  $('todayChips').innerHTML =
    chip(todays.length, 'Work entries') +
    chip(fmtDur(totalMin), 'Total time') +
    chip(onSite, 'On site now') +
    chip(follow, 'Follow-ups');
  var box = $('todayList');
  if (!todays.length) {
    box.innerHTML = '<div class="empty">' + IC.wrench + '<b>No entries yet today</b>'
      + 'When a worker arrives, tap “Add work entry” — the clock starts from his entry time.</div>';
    return;
  }
  box.innerHTML = todays.map(entryCard).join('');
}
function chip(big, small) {
  return '<div class="chip"><b>' + esc(big) + '</b><span>' + esc(small) + '</span></div>';
}
function entryCard(e) {
  var c = catById(e.cat);
  var st = statusOf(e);
  var d = durOf(e);
  var phone = e.phone || workerPhone(e.worker);
  return '<div class="ecard" data-id="' + esc(e.id) + '">'
    + '<div class="ehead"><b>' + esc(e.worker) + '</b>'
    + '<span class="catpill"><i style="background:' + c.dot + '"></i>' + esc(c.label) + '</span>'
    + '<span class="stpill st-' + st + '"><i></i>' + ST_LABEL[st] + '</span></div>'
    + '<div class="etimerow">' + IC.clock + '<b>' + esc(e.in || '—') + '</b>'
    + '<span class="arr">→</span><b>' + esc(e.out || '…') + '</b>'
    + (d && d.overnight ? '<span title="exit after midnight">(overnight)</span>' : '')
    + '<span class="dur">' + (st === 'working' ? 'still on site' : fmtDur(d ? d.min : null)) + '</span></div>'
    + '<div class="ework">' + esc(e.work || '') + '</div>'
    + (e.materials ? '<div class="emeta">Materials: ' + esc(e.materials) + '</div>' : '')
    + (e.cost ? '<div class="emeta">Cost: ₹' + esc(e.cost) + '</div>' : '')
    + (phone ? '<div class="emeta">' + IC.phone + ' ' + esc(phone) + '</div>' : '')
    + '<div class="eacts">'
    + (st === 'working' ? '<button class="sbtn sbtn-acc" data-act="exit" data-id="' + esc(e.id) + '">' + IC.out + 'Mark exit</button>' : '')
    + '<button class="sbtn sbtn-mut" data-act="edit" data-id="' + esc(e.id) + '">' + IC.edit + 'Edit</button>'
    + '<button class="sbtn sbtn-bad" data-act="del" data-id="' + esc(e.id) + '">' + IC.trash + '</button>'
    + '</div></div>';
}

/* =================== REGISTER =================== */
function defaultFilterRange() {
  var d = new Date();
  var f = new Date(d.getFullYear(), d.getMonth(), 1);
  return [isoOf(f), todayISO()];
}
function initFilters() {
  var range = defaultFilterRange();
  if (!$('fFrom').value) $('fFrom').value = range[0];
  if (!$('fTo').value) $('fTo').value = range[1];
  var fCat = $('fCat');
  if (fCat.options.length <= 1) {
    CATS.forEach(function (c) {
      var o = document.createElement('option'); o.value = c.id; o.textContent = c.label; fCat.appendChild(o);
    });
  }
  fillWorkerFilter();
}
function fillWorkerFilter() {
  var sel = $('fWorker');
  var cur = sel.value;
  var names = allWorkerNames();
  sel.innerHTML = '<option value="">All</option>' + names.map(function (n) {
    return '<option' + (n === cur ? ' selected' : '') + '>' + esc(n) + '</option>';
  }).join('');
}
function filteredEntries() {
  var from = $('fFrom').value, to = $('fTo').value;
  var cat = $('fCat').value, wk = $('fWorker').value, st = $('fStatus').value;
  var q = ($('fSearch').value || '').toLowerCase().trim();
  return entries.filter(function (e) {
    if (from && e.date < from) return false;
    if (to && e.date > to) return false;
    if (cat && e.cat !== cat) return false;
    if (wk && e.worker !== wk) return false;
    if (st && statusOf(e) !== st) return false;
    if (q) {
      var hay = (e.worker + ' ' + e.work + ' ' + (e.materials || '') + ' ' + catById(e.cat).label).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  }).sort(cmpEntry);
}
function renderRegister() {
  initFilters();
  var rows = filteredEntries();
  var totalMin = 0;
  rows.forEach(function (e) { var d = durOf(e); if (d) totalMin += d.min; });
  $('regMeta').innerHTML = '<span><b>' + rows.length + '</b> entries</span>'
    + '<span><b>' + fmtDur(totalMin) + '</b> total time</span>'
    + '<span><b>' + fmtDur(rows.length ? Math.round(totalMin / rows.length) : null) + '</b> average</span>';
  var body = $('regBody');
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="9"><div class="empty">' + IC.empty
      + '<b>No entries match</b>Change the filters, or add a new entry.</div></td></tr>';
    return;
  }
  body.innerHTML = rows.map(function (e) {
    var c = catById(e.cat), st = statusOf(e), d = durOf(e);
    return '<tr>'
      + '<td class="mono">' + esc(fmtDate(e.date)) + '<div style="font-size:11px;color:var(--mut)">' + wdOf(e.date) + '</div></td>'
      + '<td><b>' + esc(e.worker) + '</b>' + (e.phone ? '<div class="emeta">' + esc(e.phone) + '</div>' : '') + '</td>'
      + '<td><span class="catpill"><i style="background:' + c.dot + '"></i>' + esc(c.label) + '</span></td>'
      + '<td class="mono">' + esc(e.in || '—') + '</td>'
      + '<td class="mono">' + esc(e.out || '…') + '</td>'
      + '<td class="mono">' + (st === 'working' ? '—' : fmtDur(d ? d.min : null)) + '</td>'
      + '<td class="wcell">' + esc(e.work || '') + (e.materials ? '<div class="emeta">' + esc(e.materials) + '</div>' : '') + (e.cost ? '<div class="emeta">₹' + esc(e.cost) + '</div>' : '') + '</td>'
      + '<td><span class="stpill st-' + st + '"><i></i>' + ST_LABEL[st] + '</span></td>'
      + '<td><div class="rowact">'
      + '<button data-act="edit" data-id="' + esc(e.id) + '" aria-label="Edit" title="Edit">' + IC.edit + '</button>'
      + '<button data-act="del" data-id="' + esc(e.id) + '" aria-label="Delete" title="Delete">' + IC.trash + '</button>'
      + '</div></td></tr>';
  }).join('');
}

/* =================== ENTRY MODAL =================== */
function fillCatSelect() {
  var sel = $('eCat');
  if (sel.options.length) return;
  CATS.forEach(function (c) {
    var o = document.createElement('option'); o.value = c.id; o.textContent = c.label; sel.appendChild(o);
  });
}
function fillWorkerDatalist() {
  $('workerList').innerHTML = allWorkerNames().map(function (n) {
    return '<option value="' + esc(n) + '">';
  }).join('');
}
function openModal(id) {
  editingId = id || null;
  fillCatSelect();
  fillWorkerDatalist();
  var f = $('entryForm');
  f.reset();
  $('eDate').value = todayISO();
  if (id) {
    var e = entries.find(function (x) { return x.id === id; });
    if (!e) return;
    $('mTitle').textContent = 'Edit entry';
    $('eDate').value = e.date; $('eCat').value = e.cat;
    $('eWorker').value = e.worker; $('ePhone').value = e.phone || '';
    $('eIn').value = e.in || ''; $('eOut').value = e.out || '';
    $('eWork').value = e.work || ''; $('eMaterials').value = e.materials || '';
    $('eCost').value = e.cost || ''; $('eStatus').value = e.status || 'auto';
    $('mDelete').classList.remove('hide');
  } else {
    $('mTitle').textContent = 'Add work entry';
    $('eStatus').value = 'auto';
    $('mDelete').classList.add('hide');
    $('eIn').value = nowHM();
  }
  $('entryModal').classList.remove('hide');
  $('entryModal').setAttribute('aria-hidden', 'false');
  setTimeout(function () { try { $('eWorker').focus(); } catch (err) {} }, 60);
}
function closeModal() {
  $('entryModal').classList.add('hide');
  $('entryModal').setAttribute('aria-hidden', 'true');
  editingId = null;
}
function saveEntry(ev) {
  ev.preventDefault();
  var f = $('entryForm');
  var g = function (id) { return $(id).value.trim(); };
  var data = {
    date: g('eDate'), cat: g('eCat'), worker: g('eWorker'),
    phone: g('ePhone'), in: g('eIn'), out: g('eOut'),
    work: g('eWork'), materials: g('eMaterials'),
    cost: g('eCost') ? Math.max(0, Math.round(+g('eCost'))) : 0,
    status: g('eStatus') || 'auto'
  };
  if (!data.date || !data.cat || !data.worker || !data.in || !data.work) {
    toast('Please fill date, category, worker, entry time and work');
    return;
  }
  var fixedEn = false;
  if (autoFixOn()) {
    var w2 = autoEnglish(data.work), m2 = autoEnglish(data.materials), nw = titleCase(data.worker);
    fixedEn = w2 !== data.work || m2 !== data.materials || nw !== data.worker;
    data.work = w2; data.materials = m2; data.worker = nw;
  }
  if (editingId) {
    var i = entries.findIndex(function (x) { return x.id === editingId; });
    if (i > -1) {
      entries[i] = Object.assign({}, entries[i], data, { updatedAt: Date.now() });
    }
    toast('Entry updated');
  } else {
    entries.push(Object.assign({ id: uid(), createdAt: Date.now() }, data));
    toast(fixedEn ? 'English auto-fixed — entry saved' : 'Entry saved');
  }
  saveEntries(entries);
  closeModal();
  refreshView();
}
function markExit(id) {
  var e = entries.find(function (x) { return x.id === id; });
  if (!e) return;
  e.out = nowHM();
  if (e.status !== 'follow') e.status = 'auto';
  e.updatedAt = Date.now();
  saveEntries(entries);
  var d = durOf(e);
  toast(tStr('Exit time recorded') + ' — ' + fmtDur(d ? d.min : null));
  refreshView();
}
function deleteEntry(id) {
  var e = entries.find(function (x) { return x.id === id; });
  if (!e) return;
  if (typeof confirm === 'function' && !confirm('Delete this entry?\n' + e.worker + ' — ' + fmtDate(e.date))) return;
  entries = entries.filter(function (x) { return x.id !== id; });
  saveEntries(entries);
  toast('Entry deleted');
  closeModal();
  refreshView();
}
function refreshView() {
  if (view === 'today') renderToday();
  else if (view === 'register') renderRegister();
  else if (view === 'summary') renderSummary();
  else if (view === 'report') renderReportOutput();
}

/* =================== REPORT =================== */
function presetRange(p) {
  var now = new Date();
  var y = now.getFullYear(), m = now.getMonth();
  switch (p) {
    case 'today': return [todayISO(), todayISO()];
    case 'yesterday': {
      var yd = new Date(y, m, now.getDate() - 1);
      return [isoOf(yd), isoOf(yd)];
    }
    case 'week': {
      var mon = new Date(y, m, now.getDate() - ((now.getDay() + 6) % 7));
      var sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      return [isoOf(mon), isoOf(sun)];
    }
    case 'month': return [isoOf(new Date(y, m, 1)), isoOf(new Date(y, m + 1, 0))];
    case 'lastmonth': return [isoOf(new Date(y, m - 1, 1)), isoOf(new Date(y, m, 0))];
    case 'all': {
      if (!entries.length) return [todayISO(), todayISO()];
      var ds = entries.map(function (e) { return e.date; }).sort();
      return [ds[0], ds[ds.length - 1]];
    }
  }
  return null;
}
function initReportView() {
  qsa('#repPresets .chipbtn').forEach(function (b) {
    b.classList.toggle('active', b.getAttribute('data-preset') === repState.preset);
  });
  $('repRange').classList.toggle('hide', repState.preset !== 'custom');
  if (repState.from && repState.to) { $('rFrom').value = repState.from; $('rTo').value = repState.to; }
  if (repState.preset === 'custom' && repState.from && repState.to) renderReportOutput();
  else if (repState.preset !== 'custom' && repState.from) renderReportOutput();
  else if (repState.preset !== 'custom') {
    var r = presetRange(repState.preset);
    repState.from = r[0]; repState.to = r[1];
    renderReportOutput();
  }
}
function setPreset(p) {
  repState.preset = p;
  qsa('#repPresets .chipbtn').forEach(function (b) {
    b.classList.toggle('active', b.getAttribute('data-preset') === p);
  });
  $('repRange').classList.toggle('hide', p !== 'custom');
  if (p !== 'custom') {
    var r = presetRange(p);
    repState.from = r[0]; repState.to = r[1];
    renderReportOutput();
  }
}
function reportRows() {
  var a = repState.from, b = repState.to;
  if (!a || !b) return [];
  return entries.filter(function (e) { return e.date >= a && e.date <= b; }).sort(function (x, y) {
    if (x.date !== y.date) return x.date < y.date ? -1 : 1;
    return (t2m(x.in) || 0) - (t2m(y.in) || 0);
  });
}
function renderReportOutput() {
  var rows = reportRows();
  var html = reportDocHtml(rows);
  $('repPreview').innerHTML = html;
  $('printDoc').innerHTML = '<div class="sheet">' + html + '</div>';
  $('sheetWrap').classList.remove('hide');
  $('repActions').classList.remove('hide');
  repState.lastRows = rows;
}
function reportDocHtml(rows) {
  var s = settings;
  var from = repState.from, to = repState.to;
  var same = from === to;
  var period = same ? fmtDate(from) : fmtDate(from) + ' to ' + fmtDate(to);
  var totalMin = 0, follow = 0;
  rows.forEach(function (e) { var d = durOf(e); if (d) totalMin += d.min; if (statusOf(e) === 'follow') follow++; });

  var byCat = {};
  CATS.forEach(function (c) {
    var sub = rows.filter(function (e) { return e.cat === c.id; });
    if (!sub.length) return;
    var mm = 0, ff = 0;
    sub.forEach(function (e) { var d = durOf(e); if (d) mm += d.min; if (statusOf(e) === 'follow') ff++; });
    byCat[c.id] = { n: sub.length, min: mm, follow: ff };
  });
  var byWorker = {};
  rows.forEach(function (e) {
    var k = e.worker || '—';
    if (!byWorker[k]) byWorker[k] = { n: 0, min: 0 };
    byWorker[k].n++;
    var d = durOf(e); if (d) byWorker[k].min += d.min;
  });

  var h = '<div class="rdoc">';
  h += '<div class="rh"><div class="rcrest">' + (s.photo ? '<img class="rlogo" src="' + esc(s.photo) + '" alt="">' : CREST) + '</div><div>'
    + '<div class="rname">' + esc(s.madrsa || 'Madrsa') + '</div>'
    + '<div class="rsub">' + esc([s.address, s.phone].filter(Boolean).join(' · ') || 'Maintenance Department') + '</div>'
    + '</div></div>';
  h += '<div class="rt">MAINTENANCE WORK REPORT</div>';
  h += '<div class="rmeta"><div><b>Period:</b> ' + esc(period) + '</div>'
    + '<div><b>Generated:</b> ' + esc(fmtDate(todayISO()) + ', ' + nowHM()) + '</div>'
    + '<div><b>Total works:</b> ' + rows.length + '</div>'
    + '<div><b>Total time:</b> ' + fmtDur(totalMin) + '</div></div>';

  if (!rows.length) {
    h += '<div class="emptyrep">No maintenance entries were recorded in this period.</div>';
  } else {
    /* 1 — by category */
    h += '<h3>1 · Summary by category</h3><table><thead><tr><th>Category</th><th>Works</th><th>Total time</th><th>Follow-ups</th></tr></thead><tbody>';
    Object.keys(byCat).forEach(function (k) {
      var c = catById(k), v = byCat[k];
      h += '<tr><td><b>' + esc(c.label) + '</b></td><td>' + v.n + '</td><td>' + fmtDur(v.min) + '</td><td>' + (v.follow || '-') + '</td></tr>';
    });
    h += '<tr class="ttot"><td>Total</td><td>' + rows.length + '</td><td>' + fmtDur(totalMin) + '</td><td>' + (follow || '-') + '</td></tr>';
    h += '</tbody></table>';

    /* 2 — by worker */
    var wk = Object.keys(byWorker).sort(function (a, b) { return byWorker[b].n - byWorker[a].n; });
    h += '<h3>2 · Summary by worker</h3><table><thead><tr><th>Worker</th><th>Works</th><th>Total time</th><th>Phone</th></tr></thead><tbody>';
    wk.forEach(function (k) {
      var v = byWorker[k];
      var ph = workerPhone(k);
      h += '<tr><td><b>' + esc(k) + '</b></td><td>' + v.n + '</td><td>' + fmtDur(v.min) + '</td><td>' + esc(ph || '-') + '</td></tr>';
    });
    h += '</tbody></table>';

    /* 3 — detailed register */
    h += '<h3>3 · Detailed register</h3><table><thead><tr><th>#</th><th>Date</th><th>Worker</th><th>Category</th>'
      + '<th>In</th><th>Out</th><th>Time</th><th>Work done</th><th>Materials</th><th>Cost</th><th>Status</th></tr></thead><tbody>';
    rows.forEach(function (e, i) {
      var c = catById(e.cat), d = durOf(e), st = statusOf(e);
      h += '<tr><td>' + (i + 1) + '</td><td>' + esc(fmtDate(e.date)) + '</td><td><b>' + esc(e.worker) + '</b></td>'
        + '<td>' + esc(c.label) + '</td><td>' + esc(e.in) + '</td><td>' + esc(e.out || '—') + '</td>'
        + '<td>' + (d ? fmtDur(d.min) + (d.overnight ? '*' : '') : '—') + '</td>'
        + '<td>' + esc(e.work || '') + '</td><td>' + esc(e.materials || '-') + '</td>'
        + '<td>' + (e.cost ? '₹' + e.cost : '-') + '</td><td>' + ST_LABEL[st] + '</td></tr>';
    });
    h += '<tr class="ttot"><td colspan="6">Total</td><td>' + fmtDur(totalMin) + '</td><td colspan="4">'
      + rows.length + ' works</td></tr></tbody></table>';
    h += '<div style="font-size:10px;color:#8a97a6">* exit after midnight</div>';

    /* follow-ups */
    var fl = rows.filter(function (e) { return statusOf(e) === 'follow'; });
    if (fl.length) {
      h += '<div class="rfollow"><h3>Follow-ups pending</h3><ul>'
        + fl.map(function (e) {
          return '<li>' + esc(fmtDate(e.date)) + ' — <b>' + esc(e.worker) + '</b> (' + esc(catById(e.cat).label) + '): ' + esc(e.work || '') + '</li>';
        }).join('') + '</ul></div>';
    }
  }

  h += '<div class="rsig">'
    + '<div class="sig"><div class="line"></div><b>Prepared by</b>' + esc(me.name || s.incharge || 'In-charge, Maintenance') + (me.role ? ' — ' + esc(me.role) : '') + '</div>'
    + '<div class="sig"><div class="line"></div><b>Headmaster</b>' + esc(s.headmaster || '') + '</div>'
    + '</div>';
  h += '<div class="rfoot">Generated by Madrsa Maintenance Register</div></div>';
  return h;
}
function printReport() {
  var rows = repState.lastRows || reportRows();
  $('printDoc').innerHTML = '<div class="sheet">' + reportDocHtml(rows) + '</div>';
  setTimeout(function () {
    try { window.print(); }
    catch (e) { toast('Print not available in this browser'); }
  }, 150);
}
function shareReport() {
  var rows = repState.lastRows || reportRows();
  var s = settings;
  var same = repState.from === repState.to;
  var period = same ? fmtDate(repState.from) : fmtDate(repState.from) + ' to ' + fmtDate(repState.to);
  var totalMin = 0, follow = 0;
  var byCat = {};
  rows.forEach(function (e) {
    var d = durOf(e); if (d) totalMin += d.min;
    if (statusOf(e) === 'follow') follow++;
    var c = catById(e.cat).label;
    byCat[c] = (byCat[c] || 0) + 1;
  });
  var catLine = Object.keys(byCat).map(function (k) { return k + ' ' + byCat[k]; }).join(' · ');
  var text = (s.madrsa || 'Madrsa') + ' — Maintenance Report\n'
    + 'Period: ' + period + '\n'
    + 'Works: ' + rows.length + ' · Total time: ' + fmtDur(totalMin) + '\n'
    + (catLine ? 'Categories: ' + catLine + '\n' : '')
    + (follow ? 'Follow-ups pending: ' + follow + '\n' : '')
    + '— Madrsa Maintenance Register';
  if (navigator.share) {
    navigator.share({ title: 'Maintenance Report', text: text }).catch(function () {});
  } else if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function () { toast('Summary copied — paste anywhere'); },
      function () { toast('Could not share'); });
  } else {
    var ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast('Summary copied — paste anywhere'); }
    catch (e) { toast('Could not share'); }
    ta.remove();
  }
}

/* =================== CSV =================== */
function rowsToCSV(rows) {
  var head = ['Date', 'Weekday', 'Category', 'Worker', 'Phone', 'Entry time', 'Exit time',
    'Duration (minutes)', 'Duration', 'Work done', 'Materials', 'Cost (INR)', 'Status'];
  var lines = [head.join(',')];
  rows.forEach(function (e) {
    var d = durOf(e), st = statusOf(e);
    var cells = [e.date, wdOf(e.date), catById(e.cat).label, e.worker, e.phone || workerPhone(e.worker) || '',
      e.in || '', e.out || '', d ? d.min : '', d ? fmtDur(d.min) : '', e.work || '',
      e.materials || '', e.cost || 0, ST_LABEL[st]];
    lines.push(cells.map(function (c) {
      var v = String(c == null ? '' : c);
      if (/[",\n]/.test(v)) v = '"' + v.replace(/"/g, '""') + '"';
      return v;
    }).join(','));
  });
  return '\uFEFF' + lines.join('\r\n');
}
function download(name, content, type) {
  try {
    var blob = new Blob([content], { type: type || 'text/plain' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { try { URL.revokeObjectURL(url); } catch (err) {} }, 5000);
    return true;
  } catch (e) { toast('Download failed'); return false; }
}
function fileStamp() {
  var d = new Date();
  return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes());
}

/* =================== SUMMARY =================== */
function renderSummary() {
  var ym = $('sumMonth').value || (sumState.month || todayISO().slice(0, 7));
  $('sumMonth').value = ym;
  sumState.month = ym;
  $('barLabel').textContent = monthLabel(ym);
  var rows = entries.filter(function (e) { return e.date.slice(0, 7) === ym; });
  var totalMin = 0, onSite = 0, follow = 0, done = 0;
  rows.forEach(function (e) {
    var d = durOf(e); if (d) totalMin += d.min;
    var st = statusOf(e);
    if (st === 'working') onSite++;
    else if (st === 'follow') follow++;
    else done++;
  });
  $('sumChips').innerHTML =
    chip(rows.length, 'Work entries') +
    chip(fmtDur(totalMin), 'Total time') +
    chip(done, 'Completed') +
    chip(follow, 'Follow-ups');
  /* by category */
  var byCat = {};
  rows.forEach(function (e) {
    if (!byCat[e.cat]) byCat[e.cat] = { n: 0, min: 0 };
    byCat[e.cat].n++;
    var d = durOf(e); if (d) byCat[e.cat].min += d.min;
  });
  var ct = $('sumCat');
  if (!Object.keys(byCat).length) {
    ct.innerHTML = '<tr><td style="padding:14px 12px;color:var(--mut)">No entries this month.</td></tr>';
  } else {
    ct.innerHTML = '<thead><tr><th>Category</th><th>Works</th><th>Time</th></tr></thead><tbody>'
      + Object.keys(byCat).map(function (k) {
        var c = catById(k), v = byCat[k];
        return '<tr><td><span class="catpill"><i style="background:' + c.dot + '"></i>' + esc(c.label) + '</span></td>'
          + '<td class="mono"><b>' + v.n + '</b></td><td class="mono">' + fmtDur(v.min) + '</td></tr>';
      }).join('') + '</tbody>';
  }
  /* by worker */
  var byW = {};
  rows.forEach(function (e) {
    var k = e.worker || '—';
    if (!byW[k]) byW[k] = { n: 0, min: 0 };
    byW[k].n++;
    var d = durOf(e); if (d) byW[k].min += d.min;
  });
  var wt = $('sumWorker');
  var wkeys = Object.keys(byW).sort(function (a, b) { return byW[b].n - byW[a].n; });
  if (!wkeys.length) {
    wt.innerHTML = '<tr><td style="padding:14px 12px;color:var(--mut)">No workers this month.</td></tr>';
  } else {
    wt.innerHTML = '<thead><tr><th>Worker</th><th>Works</th><th>Time</th></tr></thead><tbody>'
      + wkeys.map(function (k) {
        return '<tr><td><b>' + esc(k) + '</b></td><td class="mono"><b>' + byW[k].n + '</b></td><td class="mono">' + fmtDur(byW[k].min) + '</td></tr>';
      }).join('') + '</tbody>';
  }
  /* daily bars */
  var daysInMonth = new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0).getDate();
  var byDay = {};
  rows.forEach(function (e) { var d = +e.date.slice(8, 10); byDay[d] = (byDay[d] || 0) + 1; });
  var max = 1;
  Object.keys(byDay).forEach(function (k) { if (byDay[k] > max) max = byDay[k]; });
  var bars = '', axis = '';
  for (var dd = 1; dd <= daysInMonth; dd++) {
    var n = byDay[dd] || 0;
    var hPct = n ? Math.max(8, Math.round(n / max * 100)) : 0;
    bars += '<div class="bar' + (n ? '' : ' zero') + '" style="height:' + hPct + '%" title="' + dd + ' ' + esc(MON[+ym.slice(5, 7) - 1]) + ' — ' + n + ' work' + (n === 1 ? '' : 's') + '"></div>';
    axis += '<span>' + (dd % 5 === 0 || dd === 1 ? dd : '') + '</span>';
  }
  $('sumBars').innerHTML = bars + '<div class="bars-axis">' + axis + '</div>';
  $('sumBars').querySelector('.bars-axis').style.marginTop = '4px';
}

/* =================== SETTINGS =================== */
function renderSettings() {
  $('sMadrsa').value = settings.madrsa || '';
  $('sAddress').value = settings.address || '';
  $('sPhone').value = settings.phone || '';
  $('sHead').value = settings.headmaster || '';
  $('meName').value = me.name || settings.incharge || '';
  $('mePhone').value = me.phone || '';
  $('meRole').value = me.role || '';
  applyPhotoPrev();
  renderWorkerList();
}
function renderWorkerList() {
  var ul = $('wList');
  if (!workers.length) {
    ul.innerHTML = '<li style="border-style:dashed;color:var(--mut);background:none">No saved workers yet</li>';
    return;
  }
  ul.innerHTML = workers.map(function (w, i) {
    return '<li>' + IC.phone + '<b>' + esc(w.name) + '</b>' + (w.phone ? '<span class="emeta">' + esc(w.phone) + '</span>' : '')
      + '<button class="del" data-wdel="' + i + '" aria-label="Remove ' + esc(w.name) + '">' + IC.trash + '</button></li>';
  }).join('');
}

/* ---------- backup / restore ---------- */
function backupData() {
  var payload = {
    app: 'madrsa-maintenance', v: 1, date: new Date().toISOString(),
    entries: entries, workers: workers, settings: settings, me: me
  };
  if (download('madrsa-maintenance-backup-' + fileStamp() + '.json', JSON.stringify(payload, null, 2), 'application/json')) {
    toast('Backup file downloaded');
  }
}
function applyBackup(obj) {
  if (!obj || typeof obj !== 'object' || !Array.isArray(obj.entries)) {
    toast('This file is not a valid backup');
    return false;
  }
  var nE = obj.entries.length, nW = (obj.workers || []).length;
  var msg = 'Restore backup from ' + (obj.date ? fmtDate(obj.date.slice(0, 10)) : 'unknown date') + '?\n'
    + nE + ' entries, ' + nW + ' workers will replace the current data.';
  if (typeof confirm === 'function' && !confirm(msg)) return false;
  entries = obj.entries.slice();
  workers = (obj.workers || []).slice();
  if (obj.settings) settings = Object.assign({}, DEF_SET, obj.settings);
  if (obj.me) saveMe(Object.assign({}, DEF_ME, obj.me));
  else saveMe(me);
  saveEntries(entries); saveWorkers(workers); saveSettings(settings);
  toast(tStr('Backup restored') + ' — ' + nE + ' entries');
  fillWorkerFilter();
  applyBrand();
  refreshView();
  if (view === 'settings') renderSettings();
  return true;
}
function restoreFromFile(file) {
  if (!file) return;
  var fr = new FileReader();
  fr.onload = function () {
    try { applyBackup(JSON.parse(String(fr.result))); }
    catch (e) { toast('Could not read this backup file'); }
  };
  fr.onerror = function () { toast('Could not read this backup file'); };
  fr.readAsText(file);
}
function clearAll() {
  if (!entries.length && !workers.length) { toast('Nothing to clear'); return; }
  if (typeof confirm === 'function' &&
    !confirm('Delete ALL entries and workers from this device?\nThis cannot be undone — take a backup first!')) return;
  entries = []; workers = [];
  saveEntries(entries); saveWorkers(workers);
  fillWorkerFilter();
  refreshView();
  if (view === 'settings') renderSettings();
  toast('All data cleared');
}

/* =================== events =================== */
function bind() {
  qsa('.navbtn').forEach(function (b) {
    b.addEventListener('click', function () { go(b.getAttribute('data-go')); });
  });
  $('burger').addEventListener('click', openDrawer);
  $('scrim').addEventListener('click', closeDrawer);
  $('themeBtn').addEventListener('click', toggleTheme);

  /* language + auto-fix English */
  ['langSel', 'langSel2'].forEach(function (id) {
    var s = $(id);
    if (s) s.addEventListener('change', function () { setLang(this.value); });
  });
  var af = $('sAutoFix');
  if (af) af.addEventListener('change', function () {
    lsSet(LS.F, this.checked ? 1 : 0);
    toast(this.checked ? 'Auto-fix English is ON' : 'Auto-fix English is OFF');
  });

  $('addTodayBtn').addEventListener('click', function () { openModal(null); });
  $('addRegBtn').addEventListener('click', function () { openModal(null); });
  $('csvBtn').addEventListener('click', function () {
    var rows = filteredEntries();
    if (!rows.length) { toast('Nothing to export with these filters'); return; }
    if (download('maintenance-register-' + fileStamp() + '.csv', rowsToCSV(rows), 'text/csv')) {
      toast(rows.length + ' entries exported');
    }
  });

  ['fFrom', 'fTo', 'fCat', 'fWorker', 'fStatus'].forEach(function (id) {
    $(id).addEventListener('change', renderRegister);
  });
  $('fSearch').addEventListener('input', renderRegister);
  $('fClear').addEventListener('click', function () {
    var r = defaultFilterRange();
    $('fFrom').value = r[0]; $('fTo').value = r[1];
    $('fCat').value = ''; $('fWorker').value = ''; $('fStatus').value = ''; $('fSearch').value = '';
    renderRegister();
  });

  $('entryForm').addEventListener('submit', saveEntry);
  $('mClose').addEventListener('click', closeModal);
  $('mCancel').addEventListener('click', closeModal);
  $('mDelete').addEventListener('click', function () { if (editingId) deleteEntry(editingId); });
  qs('#entryModal .mscrim').addEventListener('click', closeModal);
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') {
      if (!$('entryModal').classList.contains('hide')) closeModal();
      else closeDrawer();
    }
  });
  $('inNow').addEventListener('click', function () { $('eIn').value = nowHM(); });
  $('outNow').addEventListener('click', function () { $('eOut').value = nowHM(); });

  /* delegated entry actions (cards + table rows) */
  document.addEventListener('click', function (ev) {
    var t = ev.target.closest ? ev.target.closest('[data-act]') : null;
    if (t) {
      var act = t.getAttribute('data-act'), id = t.getAttribute('data-id');
      if (act === 'edit') openModal(id);
      else if (act === 'del') deleteEntry(id);
      else if (act === 'exit') markExit(id);
      return;
    }
    var wd = ev.target.closest ? ev.target.closest('[data-wdel]') : null;
    if (wd) {
      var i = +wd.getAttribute('data-wdel');
      if (workers[i] && typeof confirm === 'function' && !confirm('Remove ' + workers[i].name + ' from the workers list?')) return;
      workers.splice(i, 1);
      saveWorkers(workers);
      renderWorkerList();
      fillWorkerFilter();
      fillWorkerDatalist();
      toast('Worker removed');
    }
  });

  /* report */
  $('repPresets').addEventListener('click', function (ev) {
    var b = ev.target.closest ? ev.target.closest('.chipbtn') : null;
    if (b) setPreset(b.getAttribute('data-preset'));
  });
  $('genRep').addEventListener('click', function () {
    var f = $('rFrom').value, t2 = $('rTo').value;
    if (!f || !t2) { toast('Pick both dates'); return; }
    if (f > t2) { toast('“From” date is after “To”'); return; }
    repState.from = f; repState.to = t2;
    renderReportOutput();
  });
  $('printRep').addEventListener('click', printReport);
  $('shareRep').addEventListener('click', shareReport);
  $('repCsv').addEventListener('click', function () {
    var rows = repState.lastRows || reportRows();
    if (!rows.length) { toast('No entries in this period'); return; }
    if (download('maintenance-report-' + repState.from + '_' + repState.to + '.csv', rowsToCSV(rows), 'text/csv')) {
      toast(rows.length + ' entries exported');
    }
  });

  /* summary */
  $('sumMonth').addEventListener('change', renderSummary);

  /* settings */
  $('setForm').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var f = $('setForm');
    settings = Object.assign({}, settings, {
      madrsa: f.querySelector('#sMadrsa').value.trim() || DEF_SET.madrsa,
      address: f.querySelector('#sAddress').value.trim(),
      phone: f.querySelector('#sPhone').value.trim(),
      headmaster: f.querySelector('#sHead').value.trim()
    });
    saveSettings(settings);
    toast('Details saved');
  });
  $('meForm').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var name = $('meName').value.trim(), ph = $('mePhone').value.trim(), role = $('meRole').value.trim();
    if (!name) { toast('Enter your name'); return; }
    if (autoFixOn()) name = titleCase(name);
    saveMe({ name: name, phone: ph, role: role, photo: me.photo || '' });
    settings.incharge = name; /* keep the report signature in sync */
    saveSettings(settings);
    toast('Profile saved');
  });
  /* profile photos — madrsa logo + my photo */
  $('mPhotoBtn').addEventListener('click', function () { $('mPhotoFile').click(); });
  $('mPhotoFile').addEventListener('change', function () {
    var f = this.files && this.files[0];
    this.value = '';
    if (f) readPhoto(f, function (d) {
      settings.photo = d; saveSettings(settings);
      applyBrand(); applyPhotoPrev(); toast('Photo updated');
    });
  });
  $('mPhotoRemove').addEventListener('click', function () {
    settings.photo = ''; saveSettings(settings);
    applyBrand(); applyPhotoPrev(); toast('Photo removed');
  });
  $('mePhotoBtn').addEventListener('click', function () { $('mePhotoFile').click(); });
  $('mePhotoFile').addEventListener('change', function () {
    var f = this.files && this.files[0];
    this.value = '';
    if (f) readPhoto(f, function (d) {
      saveMe({ name: me.name, phone: me.phone, role: me.role, photo: d });
      applyPhotoPrev(); toast('Photo updated');
    });
  });
  $('mePhotoRemove').addEventListener('click', function () {
    saveMe({ name: me.name, phone: me.phone, role: me.role, photo: '' });
    applyPhotoPrev(); toast('Photo removed');
  });
  $('wForm').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var name = $('wName').value.trim(), ph = $('wPhone').value.trim();
    if (!name) { toast('Enter a worker name'); return; }
    if (workers.some(function (w) { return w.name.toLowerCase() === name.toLowerCase(); })) {
      toast('This worker is already in the list'); return;
    }
    workers.push({ name: name, phone: ph });
    workers.sort(function (a, b) { return a.name.localeCompare(b.name); });
    saveWorkers(workers);
    $('wName').value = ''; $('wPhone').value = '';
    renderWorkerList();
    fillWorkerFilter();
    fillWorkerDatalist();
    toast('Worker added');
  });
  $('backupBtn').addEventListener('click', backupData);
  $('restoreBtn').addEventListener('click', function () { $('restoreFile').click(); });
  $('restoreFile').addEventListener('change', function () {
    if (this.files && this.files[0]) restoreFromFile(this.files[0]);
    this.value = '';
  });
  $('clearBtn').addEventListener('click', clearAll);

  /* install */
  [$('installBtn'), $('installBtn2')].forEach(function (b) {
    b.addEventListener('click', function () {
      if (window.__deferredPrompt) {
        window.__deferredPrompt.prompt();
        window.__deferredPrompt = null;
      } else {
        toast('Already installed, or use browser menu → “Install app”');
      }
    });
  });
}

/* =================== boot =================== */
function init() {
  entries = loadEntries();
  workers = loadWorkers();
  settings = loadSettings();
  initTheme();
  initLang();
  $('verChip').textContent = APP_VER + ' · offline';
  $('sumMonth').value = todayISO().slice(0, 7);
  fillCatSelect();
  fillWorkerDatalist();
  applyBrand();
  bind();
  var afc = $('sAutoFix');
  if (afc) afc.checked = autoFixOn();
  if (window.MutationObserver) {
    new MutationObserver(queueTranslate).observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  go('today');
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

/* PWA install prompt capture */
window.addEventListener('beforeinstallprompt', function (ev) {
  ev.preventDefault();
  window.__deferredPrompt = ev;
});
