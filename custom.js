// התזרים שלנו: מה שהמנוע לא עושה לבד.
// 1. מסך הבית: צ׳אט של שורה אחת ("שופרסל 340"), וטבעת "כמה נשאר החודש"
// 2. עדכון חודשי: קריאת קובץ העו״ש של לאומי והפירוט של כאל, בלי כפילויות
// 3. תובנות: לאן הלך הכסף, מנויים, עמלות, חריגות, תקציב מוצע ותחזית
(function () {
  'use strict';
  const L = window.LazyApp;
  const h = L.helpers;
  const BP = window.BLUEPRINT;
  const XLSX_JS = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';

  // ---------- כלים ----------
  const esc = h.esc;
  const money = n => h.money(Math.round(n)) || '₪0';
  const rows = id => h.rows[id] || [];
  const pad = n => String(n).padStart(2, '0');
  const isoDay = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseDay = s => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(s); };
  const monthKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  const monthName = key => { const [y, m] = key.split('-'); return `${MONTHS[+m - 1]} ${y}`; };
  const addMonths = (key, n) => { const [y, m] = key.split('-').map(Number); return monthKey(new Date(y, m - 1 + n, 1)); };
  const txMonth = r => monthKey(parseDay(r.date || r.created_at));
  const norm = s => String(s || '').toLowerCase().replace(/[\d"'״׳`.,:;!?()\-_/\\*#₪]+/g, ' ').replace(/\s+/g, ' ').trim();
  const key3 = s => norm(s).split(' ').slice(0, 3).join(' ');
  const cats = () => rows('cats');
  const catById = id => cats().find(c => c.id === id);
  const catName = id => (catById(id) || {}).name || 'בלי קטגוריה';
  const incomeCat = () => cats().find(c => c.type === 'הכנסה');
  const expense = r => r.kind === 'הוצאה';
  const income = r => r.kind === 'הכנסה';
  const sum = (list, f = r => +r.amount || 0) => list.reduce((a, r) => a + f(r), 0);

  const ME_KEY = 'tazrim-me';
  const byEmail = () => (window.LAZY_USER_EMAIL === '7145689b@gmail.com' ? 'בלומי' : 'פנחס');
  const me = () => { try { const v = localStorage.getItem(ME_KEY); return v === 'פנחס' || v === 'בלומי' ? v : byEmail(); } catch { return byEmail(); } };
  const setMe = v => { try { localStorage.setItem(ME_KEY, v); } catch { /* בלי זיכרון */ } };

  // ---------- זיהוי קטגוריה ----------
  // קודם מה שלמדנו מכם (תנועה קודמת עם אותו שם), אחר כך המילים של כל קטגוריה
  function guessCategory(desc, kind) {
    const k = key3(desc);
    if (k) {
      const prev = rows('tx').filter(r => r.category && key3(r.desc) === k).sort((a, b) => String(b.updated_at || b.created_at).localeCompare(String(a.updated_at || a.created_at)))[0];
      if (prev && catById(prev.category)) return prev.category;
    }
    if (kind === 'הכנסה') return (incomeCat() || {}).id || '';
    const text = ' ' + norm(desc) + ' ';
    let best = null, bestLen = 0;
    for (const c of cats()) {
      if (c.type === 'הכנסה') continue;
      for (const w of String(c.words || '').split(',').map(x => norm(x)).filter(Boolean)) {
        if (text.includes(' ' + w + ' ') || (w.length > 3 && text.includes(w))) { if (w.length > bestLen) { best = c.id; bestLen = w.length; } }
      }
    }
    return best || (cats().find(c => c.name === 'שונות') || {}).id || '';
  }
  function matchFixed(desc) {
    const t = norm(desc);
    return rows('fixed').find(f => f.type !== 'הופסק' && f.match && t.includes(norm(f.match)));
  }

  // ---------- הצ׳אט: "שופרסל 340, דלק 200" ----------
  const INCOME_RX = /משכורת|הכנסה|קיבלתי|קיבלנו|נכנס|נכנסו|החזר מס|מענק|קצבה|קצבת|ביטוח לאומי|שכר טרחה|תשלום מלקוח/;
  function parseChat(text) {
    const out = [];
    for (let part of String(text).split(/\n|;|,(?!\d{3}(?!\d))|\s+וגם\s+/)) {
      part = part.trim();
      if (!part) continue;
      const nums = [...part.matchAll(/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g)].map(m => ({ v: parseFloat(m[0].replace(/,/g, '')), i: m.index, s: m[0] }));
      if (!nums.length) continue;
      let n = nums[nums.length - 1];
      const big = nums.filter(x => x.v >= 10);
      if (big.length) n = big[big.length - 1];
      let amount = n.v;
      if (/אלף|אלפים/.test(part) && amount < 1000) amount *= 1000;
      const days = /שלשום/.test(part) ? -2 : /אתמול/.test(part) ? -1 : 0;
      const kind = INCOME_RX.test(part) ? 'הכנסה' : 'הוצאה';
      const waste = /מיותר|סתם|בזבוז/.test(part);
      let desc = (part.slice(0, n.i) + ' ' + part.slice(n.i + n.s.length))
        .replace(/ש["״]?ח|₪|שקלים|שקל|אלפים|אלף|אתמול|שלשום|היום|מיותרת?|סתם|בזבוז/g, ' ')
        .replace(/^\s*(קנינו|קניתי|שילמנו|שילמתי|הוצאנו|הוצאתי|עלה|עלתה|עלו)\s+/, ' ')
        .replace(/\s+(ב|על|של)[-־]?\s*$/, ' ')
        .replace(/^\s*(ב|על)[-־]?\s*/, ' ')
        .replace(/\s+/g, ' ').trim();
      if (!desc) desc = kind === 'הכנסה' ? 'הכנסה' : 'הוצאה';
      const d = new Date(); d.setDate(d.getDate() + days);
      const fx = kind === 'הוצאה' ? matchFixed(desc) : null;
      out.push({ desc, amount, kind, date: isoDay(d), waste, fixed: Boolean(fx), category: (fx && fx.category) || guessCategory(desc, kind) });
    }
    return out;
  }

  let chatLog = []; // מה שנכתב בפתיחה הזאת של האפליקציה
  let openChip = null;

  async function sendChat(text) {
    const items = parseChat(text);
    if (!items.length) { h.toast('לא מצאתי סכום. כתבו למשל: שופרסל 340'); return false; }
    const saved = [];
    for (const it of items) saved.push(await h.save('tx', { ...it, who: me(), source: 'צ׳אט' }));
    chatLog = saved.map(r => r.id).concat(chatLog).slice(0, 6);
    return true;
  }

  // ---------- חישוב החודש ----------
  function monthCalc(key = monthKey(new Date())) {
    const tx = rows('tx').filter(r => txMonth(r) === key);
    const fixed = rows('fixed');
    const incomeActual = sum(tx.filter(income));
    const incomeExpected = sum(fixed.filter(f => f.type === 'הכנסה קבועה'), f => +f.amount || 0);
    const inc = Math.max(incomeActual, incomeExpected);
    const fixedPlanned = sum(fixed.filter(f => f.type === 'הוצאה קבועה'), f => +f.amount || 0);
    const fixedPaid = sum(tx.filter(r => expense(r) && r.fixed));
    const fixedOut = Math.max(fixedPlanned, fixedPaid);
    const variable = sum(tx.filter(r => expense(r) && !r.fixed));
    const goals = sum(rows('goals').filter(g => g.status === 'בדרך'), g => +g.monthly || 0);
    const remaining = inc - fixedOut - goals - variable;
    const now = new Date();
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeft = key === monthKey(now) ? last - now.getDate() + 1 : 0;
    return { key, tx, incomeActual, incomeExpected, inc, fixedPlanned, fixedPaid, fixedOut, variable, goals, remaining, daysLeft, perDay: daysLeft ? remaining / daysLeft : 0 };
  }
  function byCategory(list) {
    const m = {};
    for (const r of list.filter(expense)) m[r.category || ''] = (m[r.category || ''] || 0) + (+r.amount || 0);
    return m;
  }
  // ממוצע הוצאה לקטגוריה ב-3 החודשים המלאים האחרונים שיש בהם נתונים
  function averages(n = 3) {
    const cur = monthKey(new Date());
    const months = [...new Set(rows('tx').map(txMonth))].filter(k => k < cur).sort().slice(-n);
    const avg = {};
    for (const k of months) for (const [c, v] of Object.entries(byCategory(rows('tx').filter(r => txMonth(r) === k)))) avg[c] = (avg[c] || 0) + v / months.length;
    return { months, avg };
  }

  // ---------- רכיבים ----------
  function ring(pct, big, small, bad) {
    const r = 80, c = 2 * Math.PI * r, p = Math.max(0, Math.min(1, pct));
    return `<div class="tz-ring ${bad ? 'is-bad' : ''}"><svg viewBox="0 0 200 200" aria-hidden="true"><circle class="tz-ring__bg" cx="100" cy="100" r="${r}"/><circle class="tz-ring__fg" cx="100" cy="100" r="${r}" stroke-dasharray="${c * p} ${c}" transform="rotate(-90 100 100)"/></svg>
      <div class="tz-ring__in"><small>נשאר החודש</small><b class="ltr">${esc(big)}</b><span>${esc(small)}</span></div></div>`;
  }
  const bar = (v, max, bad) => `<span class="tz-bar ${bad ? 'is-bad' : ''}"><i style="width:${Math.max(2, Math.min(100, max ? v / max * 100 : 0))}%"></i></span>`;

  function chatCard() {
    const who = me();
    const log = chatLog.map(id => rows('tx').find(r => r.id === id)).filter(Boolean);
    const top = cats().filter(c => c.type !== 'הכנסה');
    return `<section class="card tz-chat">
      <div class="tz-chat__who" role="group" aria-label="מי כותב">${['פנחס', 'בלומי'].map(w => `<button type="button" class="${w === who ? 'on' : ''}" data-tz-me="${esc(w)}">${esc(w)}</button>`).join('')}</div>
      <form data-tz-chat autocomplete="off"><input name="q" type="text" enterkeyhint="send" placeholder="מה קניתם? למשל: שופרסל 340" aria-label="מה קניתם וכמה עלה"><button class="btn btn--primary" type="submit" aria-label="שליחה">${h.icon('check')}</button></form>
      <p class="muted tz-chat__hint">אפשר כמה בבת אחת: "דלק 250, פיצה 118 מיותר". הכנסה: "משכורת 9800".</p>
      ${log.length ? `<ul class="tz-log">${log.map(r => `<li>
        <div class="tz-log__row"><span class="tz-log__ok">${h.icon('check')}</span><b>${esc(r.desc)}</b><span class="ltr tz-amt ${income(r) ? 'is-in' : ''}">${income(r) ? '+' : ''}${esc(money(r.amount))}</span>
          <button type="button" class="tz-tag" data-tz-open="${esc(r.id)}">${esc(catName(r.category))}</button>
          <button type="button" class="tz-x" data-tz-undo="${esc(r.id)}" aria-label="ביטול">ביטול</button></div>
        ${openChip === r.id ? `<div class="tz-pick">${top.map(c => `<button type="button" class="chip-btn ${c.id === r.category ? 'on' : ''}" data-tz-cat="${esc(c.id)}" data-tz-id="${esc(r.id)}">${esc(c.name)}</button>`).join('')}</div>` : ''}
      </li>`).join('')}</ul>` : ''}
    </section>`;
  }

  // ---------- מסך הבית ----------
  L.view('home', () => {
    const m = monthCalc();
    const used = m.fixedOut + m.goals + m.variable;
    const pct = m.inc ? 1 - used / m.inc : 0;
    const bad = m.remaining < 0;
    const realFixed = rows('fixed').filter(f => !f._sample).length;
    const lastImport = h.settings.lastImport ? h.dayDiff(h.settings.lastImport) : null;
    const over = Object.entries(byCategory(m.tx)).map(([id, v]) => ({ c: catById(id), v })).filter(x => x.c && +x.c.budget && x.v > +x.c.budget).sort((a, b) => (b.v - b.c.budget) - (a.v - a.c.budget)).slice(0, 3);
    const goals = rows('goals').filter(g => g.status === 'בדרך').slice(0, 2);
    const recent = [...rows('tx')].sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.created_at).localeCompare(String(a.created_at))).slice(0, 5);
    const t = h.table('tx');
    return `${h.top(h.settings.name || BP.name, monthName(m.key))}
      ${chatCard()}
      <section class="card tz-hero">
        ${ring(pct, money(m.remaining), m.daysLeft ? (bad ? 'חרגנו. כדאי לעצור הוצאות רצון' : `${money(m.perDay)} ליום, עוד ${m.daysLeft} ימים`) : '', bad)}
        <dl class="tz-split">
          <div><dt>הכנסות</dt><dd class="ltr">${esc(money(m.inc))}</dd>${m.incomeActual < m.incomeExpected ? `<small>צפוי. נכנס ${esc(money(m.incomeActual))}</small>` : ''}</div>
          <div><dt>קבועות</dt><dd class="ltr">${esc(money(m.fixedOut))}</dd></div>
          <div><dt>ליעדים</dt><dd class="ltr">${esc(money(m.goals))}</dd></div>
          <div><dt>הוצאות שוטפות</dt><dd class="ltr">${esc(money(m.variable))}</dd></div>
        </dl>
      </section>
      ${!realFixed && !h.preview ? `<a class="card tz-cta" href="#/t/fixed"><b>פעם ראשונה? מתחילים מהקבועים</b><span>שכר דירה, ארנונה, גן, ביטוחים והמשכורות. עשר דקות, פעם אחת, וכל השאר מסתדר לבד.</span></a>` : ''}
      ${lastImport === null || lastImport < -25 ? `<a class="card tz-cta tz-cta--soft" href="#/x/import"><b>עדכון חודשי</b><span>${lastImport === null ? 'מעלים את דף העו״ש ואת פירוט כאל, והתזרים מתמלא לבד.' : 'עבר חודש. הגיע הזמן להעלות את דף העו״ש ואת פירוט כאל.'}</span></a>` : ''}
      ${over.length ? `<section class="section"><div class="section__head"><h2>חריגות מהתקציב</h2><a href="#/x/insights">לתובנות</a></div><div class="card tz-rows">${over.map(x => `<div class="tz-r"><span>${esc(x.c.name)}</span>${bar(x.v, +x.c.budget * 1.5, true)}<b class="ltr">+${esc(money(x.v - x.c.budget))}</b></div>`).join('')}</div></section>` : ''}
      ${goals.length ? `<section class="section"><div class="section__head"><h2>היעדים שלנו</h2><a href="#/t/goals">הכל</a></div><div class="card tz-rows">${goals.map(g => `<a class="tz-r" href="#/t/goals/${esc(g.id)}"><span>${esc(g.name)}</span>${bar(+g.saved || 0, +g.target || 1)}<b class="ltr">${Math.round((+g.saved || 0) / (+g.target || 1) * 100)}%</b></a>`).join('')}</div></section>` : ''}
      <section class="section"><div class="section__head"><h2>אחרונות</h2><a href="#/t/tx">הכל</a></div>
        <div class="list">${recent.length ? recent.map(r => h.itemHtml(t, r)).join('') : '<div class="empty"><b>עוד אין תנועות</b>כתבו למעלה מה קניתם, והיא תופיע כאן.</div>'}</div></section>`;
  });

  // ---------- עוד ----------
  L.view('more', () => `${h.top('עוד')}
    <div class="list tz-more">
      ${[['#/x/import', 'file', 'עדכון חודשי', 'דף עו״ש, פירוט כאל והכנסות'],
        ['#/t/fixed', 'calendar', 'הוצאות והכנסות קבועות', `${rows('fixed').length} קבועים`],
        ['#/t/cats', 'box', 'קטגוריות ותקציב', `${cats().length} קטגוריות`],
        ['#/x/connect', 'chat', 'כתיבה מ-Claude ומ-GPT', 'אחרי החיבור לענן'],
        ['#/settings', 'settings', 'הגדרות וייצוא לאקסל', 'שם, סגנון, צבע, נתוני הדוגמה']]
        .map(([href, ic, title, sub]) => `<a class="item" href="${href}"><span class="item__av">${h.icon(ic)}</span><span class="item__main"><b>${esc(title)}</b><small>${esc(sub)}</small></span></a>`).join('')}
    </div>`);

  L.view('connect', () => `${h.top('כתיבה מ-Claude ומ-GPT', '', '#/x/more')}
    <section class="card set"><h3>איך זה יעבוד</h3>
      <p>כותבים ל-Claude או ל-GPT "שופרסל 340", והתנועה נכנסת ישר לתזרים, בדיוק כמו בצ׳אט שבאפליקציה.</p>
      <p class="muted">כדי שזה יעבוד, האפליקציה צריכה לשבת בענן (Supabase, חינמי). אחרי החיבור, גם אשתך תראה את אותם נתונים מהטלפון שלה. כרגע הנתונים נשמרים רק בדפדפן הזה.</p>
    </section>`);

  // ---------- תובנות ----------
  L.view('insights', () => {
    const m = monthCalc();
    const { months, avg } = averages();
    const cur = byCategory(m.tx);
    const allCats = cats().filter(c => c.type !== 'הכנסה');
    const catRows = allCats.map(c => ({ c, v: cur[c.id] || 0, a: avg[c.id] || 0, b: +c.budget || 0 })).filter(x => x.v || x.a || x.b).sort((a, b) => b.v - a.v);
    const max = Math.max(1, ...catRows.map(x => Math.max(x.v, x.b, x.a)));
    const tips = [];
    // מנויים והוראות קבע שלא רשומים כקבועים
    const groups = {};
    for (const r of rows('tx').filter(expense)) { const k = key3(r.desc); if (!k) continue; (groups[k] = groups[k] || []).push(r); }
    const subs = Object.values(groups).map(list => {
      const byM = {}; list.forEach(r => { byM[txMonth(r)] = r; });
      const ms = Object.values(byM);
      if (ms.length < 2) return null;
      const amounts = ms.map(r => +r.amount);
      const a0 = amounts[0];
      if (!amounts.every(x => Math.abs(x - a0) <= Math.max(3, a0 * 0.1))) return null;
      if (ms.some(r => r.fixed)) return null;
      return { name: list[0].desc, amount: a0 };
    }).filter(Boolean);
    if (subs.length) tips.push({ t: `${subs.length} תשלומים חוזרים שלא רשומים כקבועים`, d: subs.slice(0, 4).map(s => `${s.name} ${money(s.amount)}`).join(' · ') + `. בסך הכל ${money(sum(subs, s => s.amount))} בחודש. כדאי לבדוק אם צריך את כולם.` });
    const comm = sum(rows('fixed').filter(f => f.type === 'הוצאה קבועה' && catById(f.category)?.name === 'תקשורת ומנויים'), f => +f.amount);
    if (comm) tips.push({ t: `מנויים ותקשורת: ${money(comm)} בחודש`, d: `זה ${money(comm * 12)} בשנה. שיחה אחת לחברת הסלולר או האינטרנט חוסכת בדרך כלל.` });
    const fees = rows('tx').filter(r => expense(r) && /עמלה|עמלת|דמי ניהול|דמי כרטיס|ריבית חובה|ריבית/.test(r.desc) && h.dayDiff(r.date) > -92);
    if (fees.length) tips.push({ t: `עמלות וריביות: ${money(sum(fees))} ב-3 חודשים`, d: 'אפשר לבקש מהבנק מסלול עמלות מוזל, או פטור מדמי כרטיס.' });
    const waste = m.tx.filter(r => expense(r) && r.waste);
    if (waste.length) tips.push({ t: `סימנתם ${waste.length} הוצאות כמיותרות החודש`, d: `יחד ${money(sum(waste))}. זה הכסף הכי קל להחזיר לתזרים.` });
    const small = m.tx.filter(r => expense(r) && +r.amount < 60 && catById(r.category)?.type === 'רצון');
    if (small.length >= 5) tips.push({ t: `${small.length} קניות קטנות של רצון החודש`, d: `כל אחת נראית זניחה, וביחד ${money(sum(small))}.` });
    for (const x of catRows.filter(x => x.c.type === 'רצון' && x.a && x.v > x.a * 1.2).slice(0, 2)) tips.push({ t: `${x.c.name}: מעל הממוצע`, d: `${money(x.v)} החודש, לעומת ${money(x.a)} בממוצע.` });
    // תקציב מוצע
    const suggest = allCats.filter(c => avg[c.id]).map(c => ({ c, s: Math.ceil(avg[c.id] / 50) * 50 }));
    // תחזית ל-3 חודשים
    const avgVar = months.length ? months.reduce((a, k) => a + sum(rows('tx').filter(r => txMonth(r) === k && expense(r) && !r.fixed)), 0) / months.length : m.variable;
    const net = m.incomeExpected - m.fixedPlanned - m.goals - avgVar;
    const who = ['פנחס', 'בלומי'].map(w => ({ w, v: sum(m.tx.filter(r => expense(r) && !r.fixed && r.who === w)) }));
    return `${h.top('תובנות', monthName(m.key))}
      <section class="card set"><h3>לאן הלך הכסף החודש</h3>
        ${catRows.length ? `<div class="tz-rows tz-rows--flat">${catRows.map(x => `<a class="tz-r" href="#/t/cats/${esc(x.c.id)}"><span>${esc(x.c.name)}</span>${bar(x.v, max, x.b && x.v > x.b)}<b class="ltr">${esc(money(x.v))}</b>${x.b ? `<small>מתוך ${esc(money(x.b))}</small>` : x.a ? `<small>ממוצע ${esc(money(x.a))}</small>` : ''}</a>`).join('')}</div>` : '<p class="muted">עוד אין הוצאות החודש.</p>'}
      </section>
      <section class="card set"><h3>איפה אפשר לחסוך</h3>
        ${tips.length ? `<ul class="tz-tips">${tips.map(x => `<li><b>${esc(x.t)}</b><span>${esc(x.d)}</span></li>`).join('')}</ul>` : '<p class="muted">עוד לא מצאתי דפוסים. אחרי חודש או שניים של עדכונים, יופיעו כאן מנויים, עמלות וחריגות.</p>'}
      </section>
      <section class="card set"><h3>אם ממשיכים ככה</h3>
        <div class="tz-fore">${[1, 2, 3].map(i => `<div><small>${esc(monthName(addMonths(m.key, i)))}</small><b class="ltr ${net * i < 0 ? 'is-bad' : ''}">${net >= 0 ? '+' : ''}${esc(money(net * i))}</b></div>`).join('')}</div>
        <p class="muted">לפי ההכנסות והקבועים, ההפרשה ליעדים וממוצע ההוצאות השוטפות${months.length ? ` של ${months.length} החודשים האחרונים` : ' של החודש'}. זה מה שיישאר מעבר ליעדים.</p>
      </section>
      ${suggest.length ? `<section class="card set"><h3>תקציב מוצע לפי הממוצע שלכם</h3>
        <div class="tz-rows tz-rows--flat">${suggest.map(x => `<div class="tz-r"><span>${esc(x.c.name)}</span><b class="ltr">${esc(money(x.s))}</b>${+x.c.budget ? `<small>עכשיו ${esc(money(+x.c.budget))}</small>` : '<small>אין תקציב</small>'}</div>`).join('')}</div>
        <button class="btn btn--primary" type="button" data-tz-budget>להגדיר את זה כתקציב</button></section>` : ''}
      <section class="card set"><h3>מי הוציא מה, החודש</h3>
        <div class="tz-rows tz-rows--flat">${who.map(x => `<div class="tz-r"><span>${esc(x.w)}</span>${bar(x.v, Math.max(1, ...who.map(y => y.v)))}<b class="ltr">${esc(money(x.v))}</b></div>`).join('')}</div>
        <p class="muted">בלי הקבועים. רק כדי לדעת, לא כדי להתווכח.</p>
      </section>`;
  });

  // ---------- עדכון חודשי: קריאת קבצים מהבנק ומהאשראי ----------
  let pending = null; // { list, stats }

  function loadXlsx() {
    if (window.XLSX) return Promise.resolve();
    return new Promise((res, rej) => { const s = document.createElement('script'); s.src = XLSX_JS; s.integrity = 'sha384-vtjasyidUo0kW94K5MXDXntzOJpQgBKXmE7e2Ga4LG0skTTLeBi97eFAXsqewJjw'; s.crossOrigin = 'anonymous'; s.onload = res; s.onerror = () => rej(new Error('לא הצלחתי לטעון את קורא הקבצים. בדקו את האינטרנט.')); document.head.append(s); });
  }
  function toDate(v) {
    if (v instanceof Date && !isNaN(v)) return v;
    if (typeof v === 'number' && v > 20000 && v < 80000) return new Date(Math.round((v - 25569) * 864e5) + new Date().getTimezoneOffset() * 6e4);
    const m = String(v || '').trim().match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
    if (m) { let y = +m[3]; if (y < 100) y += 2000; return new Date(y, +m[2] - 1, +m[1]); }
    return null;
  }
  const toNum = v => { if (typeof v === 'number') return v; const s = String(v || '').replace(/[₪,\s]/g, '').replace(/[^\d.\-]/g, ''); return s && !isNaN(+s) ? +s : null; };
  const CARD_RX = /כאל|כ\.א\.ל|cal\b|ויזה|visa|כרטיס אשראי|כרטיסי אשראי|ישראכרט|מקס איט|max/i;

  function parseSheets(wb, source) {
    const found = [];
    for (const name of wb.SheetNames) {
      const grid = window.XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: '' });
      let hi = -1;
      for (let i = 0; i < Math.min(grid.length, 40); i++) {
        const row = grid[i].map(c => String(c));
        if (row.some(c => /תאריך/.test(c)) && row.some(c => /סכום|חובה|זכות|חיוב/.test(c))) { hi = i; break; }
      }
      if (hi < 0) continue;
      const head = grid[hi].map(c => String(c).replace(/\s+/g, ' ').trim());
      const col = (rx, not) => head.findIndex(c => rx.test(c) && !(not && not.test(c)));
      const cDate = [col(/תאריך עסקה/), col(/^תאריך$/), col(/תאריך/, /ערך|חיוב/), col(/תאריך/)].find(i => i >= 0);
      const cDesc = [col(/שם בית/), col(/בית עסק|בית העסק/), col(/תיאור/), col(/הפעולה|פעולה|פרטים/)].find(i => i >= 0);
      const cDebit = col(/חובה/), cCredit = col(/זכות/);
      const cAmt = [col(/סכום חיוב|סכום החיוב/), col(/סכום בש"ח|סכום ב/), col(/סכום/)].find(i => i >= 0);
      for (const row of grid.slice(hi + 1)) {
        const d = toDate(row[cDate]);
        const desc = String(row[cDesc] ?? '').replace(/\s+/g, ' ').trim();
        if (!d || !desc) continue;
        let amount = null, kind = 'הוצאה';
        if (cDebit >= 0 || cCredit >= 0) {
          const deb = toNum(row[cDebit]), cre = toNum(row[cCredit]);
          if (deb) amount = Math.abs(deb); else if (cre) { amount = Math.abs(cre); kind = 'הכנסה'; }
        } else if (cAmt !== undefined) {
          amount = toNum(row[cAmt]);
          if (amount != null && source === 'עו״ש לאומי' && amount > 0 && /זיכוי|משכורת|העברה מ/.test(desc)) kind = 'הכנסה';
        }
        if (!amount) continue;
        if (source === 'עו״ש לאומי' && kind === 'הוצאה' && CARD_RX.test(desc)) kind = 'העברה';
        found.push({ date: isoDay(d), desc, amount: Math.round(amount * 100) / 100, kind });
      }
    }
    return found;
  }

  async function readFile(file, source) {
    await loadXlsx();
    const buf = await file.arrayBuffer();
    let wb;
    try { wb = window.XLSX.read(buf, { type: 'array', cellDates: true, raw: true }); } catch { throw new Error('הקובץ לא נקרא. נסו לייצא שוב מהבנק בפורמט Excel.'); }
    const found = parseSheets(wb, source);
    if (!found.length) throw new Error('לא מצאתי תנועות בקובץ. ודאו שזה דף התנועות של העו״ש או פירוט החיובים של כאל.');
    const seen = new Set(rows('tx').map(r => `${r.date}|${Math.round(+r.amount)}|${key3(r.desc)}`));
    const list = [], stats = { all: found.length, dup: 0, card: 0, inc: 0, exp: 0, fixed: 0 };
    for (const f of found) {
      const k = `${f.date}|${Math.round(f.amount)}|${key3(f.desc)}`;
      if (seen.has(k)) { stats.dup++; continue; }
      seen.add(k);
      const fx = f.kind === 'הוצאה' ? matchFixed(f.desc) : null;
      const row = { ...f, source, who: '', fixed: Boolean(fx), category: f.kind === 'העברה' ? '' : (fx && fx.category) || guessCategory(f.desc, f.kind) };
      if (f.kind === 'העברה') stats.card++; else if (f.kind === 'הכנסה') stats.inc++; else stats.exp++;
      if (fx) stats.fixed++;
      list.push(row);
    }
    return { list, stats, source };
  }

  L.view('import', () => {
    const m = monthCalc();
    const fixedIn = rows('fixed').filter(f => f.type === 'הכנסה קבועה');
    const gotIt = f => m.tx.some(r => income(r) && key3(r.desc) === key3(f.name));
    return `${h.top('עדכון חודשי', 'פעם בחודש, עשר דקות', '#/x/more')}
      <section class="card set tz-step"><h3><em>1</em>הכנסות החודש</h3>
        ${fixedIn.length ? `<div class="tz-rows tz-rows--flat">${fixedIn.map(f => `<div class="tz-r"><span>${esc(f.name)}</span><b class="ltr">${esc(money(+f.amount))}</b>${gotIt(f) ? '<small>התקבל</small>' : `<button class="btn btn--ghost btn--sm" type="button" data-tz-got="${esc(f.id)}">התקבל</button>`}</div>`).join('')}</div>` : ''}
        <p class="muted">הכנסה אחרת? כותבים בצ׳אט בבית, למשל: "הכנסה מסדנה 3500".</p>
      </section>
      <section class="card set tz-step"><h3><em>2</em>דף העו״ש מלאומי</h3>
        <p class="muted">באתר לאומי: עו״ש, תנועות בחשבון, בוחרים את החודש, ואז הורדה לאקסל.</p>
        <label class="btn btn--primary">${h.icon('download')}העלאת הקובץ של לאומי<input type="file" accept=".xls,.xlsx,.csv,.html,.htm" data-tz-file="עו״ש לאומי" hidden></label>
      </section>
      <section class="card set tz-step"><h3><em>3</em>פירוט החיובים מכאל</h3>
        <p class="muted">באתר או באפליקציה של כאל: פירוט עסקאות, בוחרים את החודש, ואז ייצוא לאקסל. כך כל קנייה נכנסת בנפרד, והחיוב המרוכז בעו״ש לא נספר פעמיים.</p>
        <label class="btn btn--primary">${h.icon('download')}העלאת הקובץ של כאל<input type="file" accept=".xls,.xlsx,.csv,.html,.htm" data-tz-file="אשראי כאל" hidden></label>
      </section>
      ${pending ? `<section class="card set tz-review"><h3>מה מצאתי בקובץ של ${esc(pending.source)}</h3>
        <ul class="tz-stats"><li><b>${pending.stats.exp}</b>הוצאות</li><li><b>${pending.stats.inc}</b>הכנסות</li>${pending.stats.card ? `<li><b>${pending.stats.card}</b>חיובי אשראי, לא נספרים פעמיים</li>` : ''}${pending.stats.dup ? `<li><b>${pending.stats.dup}</b>כבר היו בתזרים</li>` : ''}</ul>
        <div class="list">${pending.list.filter(r => r.kind !== 'העברה').slice(0, 8).map(r => `<div class="item"><span class="item__main"><b>${esc(r.desc)}</b><small>${esc(catName(r.category))}${r.fixed ? ' · קבועה' : ''}</small></span><span class="item__end"><span class="money ltr">${r.kind === 'הכנסה' ? '+' : ''}${esc(money(r.amount))}</span><small>${esc(h.relDay(r.date))}</small></span></div>`).join('')}</div>
        ${pending.list.length > 8 ? `<p class="muted">ועוד ${pending.list.length - 8}. אפשר לתקן כל קטגוריה אחר כך, והאפליקציה תזכור.</p>` : ''}
        <div class="btn-row"><button class="btn btn--ghost" type="button" data-tz-cancel>ביטול</button><button class="btn btn--primary" type="button" data-tz-commit ${pending.list.length ? '' : 'disabled'}>${h.icon('check')}להכניס ${pending.list.length} תנועות</button></div>
      </section>` : ''}
      <p class="muted tz-safe">${h.live ? 'הקובץ נקרא במכשיר שלכם. רק התנועות עצמן נשמרות בחשבון שלכם בענן.' : 'הקובץ נקרא רק במכשיר הזה, ולא נשלח לשום מקום.'}</p>`;
  });

  // ---------- אירועים ----------
  const app = document.getElementById('app');
  app.addEventListener('submit', async e => {
    const f = e.target.closest('[data-tz-chat]');
    if (!f) return;
    e.preventDefault();
    const q = f.q.value.trim();
    if (!q) return;
    try { if (await sendChat(q)) { openChip = null; h.render(); const n = app.querySelector('[data-tz-chat] input'); if (n) n.focus(); } }
    catch (err) { h.toast(err.message || 'השמירה נכשלה'); }
  });

  app.addEventListener('click', async e => {
    const el = e.target.closest('[data-tz-me], [data-tz-open], [data-tz-cat], [data-tz-undo], [data-tz-budget], [data-tz-got], [data-tz-commit], [data-tz-cancel]');
    if (!el) return;
    const d = el.dataset;
    try {
      if (d.tzMe) { setMe(d.tzMe); h.render(); return; }
      if (d.tzOpen) { openChip = openChip === d.tzOpen ? null : d.tzOpen; h.render(); return; }
      if (d.tzCat) {
        const r = rows('tx').find(x => x.id === d.tzId);
        if (r) { await h.save('tx', { ...r, category: d.tzCat }); h.toast(`עודכן ל${catName(d.tzCat)}. בפעם הבאה אזכור.`); }
        openChip = null; h.render(); return;
      }
      if (d.tzUndo) {
        const r = rows('tx').find(x => x.id === d.tzUndo);
        await h.remove('tx', d.tzUndo);
        chatLog = chatLog.filter(id => id !== d.tzUndo);
        h.render();
        if (r) h.toast('בוטל', async () => { await h.save('tx', r); chatLog.unshift(r.id); h.render(); });
        return;
      }
      if (el.hasAttribute('data-tz-budget')) {
        const { avg } = averages();
        for (const c of cats()) if (avg[c.id] && c.type !== 'הכנסה') await h.save('cats', { ...c, budget: Math.ceil(avg[c.id] / 50) * 50 });
        h.toast('התקציב עודכן לכל הקטגוריות'); h.render(); return;
      }
      if (d.tzGot) {
        const f = rows('fixed').find(x => x.id === d.tzGot);
        if (f) await h.save('tx', { desc: f.name, amount: +f.amount, kind: 'הכנסה', category: f.category || (incomeCat() || {}).id || '', date: isoDay(new Date()), source: 'ידני', who: me() });
        h.toast('נרשם'); h.render(); return;
      }
      if (el.hasAttribute('data-tz-cancel')) { pending = null; h.render(); return; }
      if (el.hasAttribute('data-tz-commit') && pending) {
        el.disabled = true;
        const n = pending.list.length;
        for (const r of pending.list) await h.save('tx', r);
        pending = null;
        await h.saveSettings({ lastImport: isoDay(new Date()) });
        location.hash = '#/x/insights';
        setTimeout(() => h.toast(`${n} תנועות נכנסו לתזרים`), 40);
      }
    } catch (err) { h.toast(err.message || 'משהו השתבש'); }
  });

  app.addEventListener('change', async e => {
    const inp = e.target.closest('[data-tz-file]');
    if (!inp || !inp.files[0]) return;
    h.toast('קורא את הקובץ...');
    try { pending = await readFile(inp.files[0], inp.dataset.tzFile); h.render(); setTimeout(() => app.querySelector('.tz-review')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30); }
    catch (err) { h.toast(err.message || 'הקובץ לא נקרא'); }
  });

  // לבדיקות: הפענוח של הצ׳אט
  window.Tazrim = { parseChat, monthCalc, parseSheets };
})();
