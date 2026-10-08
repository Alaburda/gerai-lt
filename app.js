(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const fmt = new Intl.NumberFormat('lt-LT');
  const compact = new Intl.NumberFormat('lt-LT', { notation: 'compact', maximumFractionDigits: 1 });
  const minus = n => (n < 0 ? '−' + fmt.format(-n) : fmt.format(n));
  const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  };
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Terminology (DI / AI / SI) ---------- */
  let term = 'DI';
  const orig = new WeakMap();
  function applyTerms(root = document.body) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const p = n.parentElement;
        if (!p || p.closest('script, style, .no-term')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let n;
    while ((n = walker.nextNode())) {
      if (!orig.has(n)) orig.set(n, n.nodeValue);
      const o = orig.get(n);
      const v = term === 'DI' ? o : o.replace(/\bDI\b/g, term);
      if (n.nodeValue !== v) n.nodeValue = v;
    }
  }

  /* ---------- Toast ---------- */
  const toastEl = $('#toast');
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3600);
  }

  const termToasts = {
    DI: 'Grąžinta į „DI“. Kalbininkai gali ramiai miegoti.',
    AI: 'Perjungta į „AI“. Valstybinė kalbos inspekcija informuota.',
    SI: 'Perjungta į „SI“. Užjūryje nusprendė, kad DI ir AI nebemadinga. Kainos padaugintos iš 10.'
  };
  $$('[data-term]').forEach(b => b.addEventListener('click', () => {
    if (term === b.dataset.term) return;
    term = b.dataset.term;
    $$('[data-term]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
    document.body.classList.toggle('si', term === 'SI');
    applyTerms();
    toast(termToasts[term]);
  }));

  /* ---------- Corporate mode ---------- */
  const corpEls = $$('[data-corp]');
  corpEls.forEach(el => { el._lt = el.innerHTML; });
  $$('[data-lang]').forEach(b => b.addEventListener('click', () => {
    const corp = b.dataset.lang === 'corp';
    if (b.classList.contains('on')) return;
    $$('[data-lang]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
    corpEls.forEach(el => { el.innerHTML = corp ? el.dataset.corp : el._lt; });
    applyTerms();
    toast(corp ? 'Corporate mode: ON. Synergy\'ja aktyvuota. 🚀' : 'Grįžome į lietuvių kalbą. Kiek tai įmanoma.');
  }));

  /* ---------- Countdown that never ends ---------- */
  const cd = $('#countdown');
  let secs = 899;
  setInterval(() => {
    secs -= 1;
    if (secs < 0) { secs = 899; toast('Registracija pratęsta! Vis dar liko 3 vietos.'); }
    cd.textContent = String(Math.floor(secs / 60)).padStart(2, '0') + ':' + String(secs % 60).padStart(2, '0');
  }, 1000);

  /* ---------- Competitors' saved hours ---------- */
  const comp = $('#competitors');
  const you = $('#you');
  const t0 = performance.now();
  setInterval(() => {
    const s = (performance.now() - t0) / 1000;
    comp.textContent = fmt.format(Math.floor(s * 1337));
    if (s > 40 && !you.dataset.done) { you.dataset.done = '1'; you.textContent = 'Jūs – vis dar 0.'; }
  }, 60);

  /* ---------- Reveal-on-scroll helper ---------- */
  function onVisible(el, fn, threshold = 0.35) {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { fn(); return; }
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { io.disconnect(); fn(); }
    }, { threshold });
    io.observe(el);
  }

  /* ---------- Stat counters that never stop ---------- */
  $$('[data-count]').forEach(el => onVisible(el, () => {
    const target = +el.dataset.count;
    const tick = +(el.dataset.tick || 0);
    const every = +(el.dataset.every || 1000);
    const suf = el.dataset.suffix || '';
    const start = performance.now();
    const dur = reduced ? 0 : 1600;
    const frame = now => {
      const p = dur ? Math.min(1, (now - start) / dur) : 1;
      el.textContent = fmt.format(Math.round(target * (1 - Math.pow(1 - p, 3)))) + suf;
      if (p < 1) { requestAnimationFrame(frame); return; }
      if (tick) {
        let cur = target;
        setInterval(() => { cur += tick; el.textContent = fmt.format(cur) + suf; }, every);
      }
    };
    requestAnimationFrame(frame);
  }));

  /* ---------- Hours chart: heading for negative ---------- */
  const hours = [
    { y: 2022, v: 40, note: 'Prieš DI. Žmonės dirbo.' },
    { y: 2023, v: 31, note: 'Atradome ChatGPT' },
    { y: 2024, v: 17, note: 'Pirmieji agentai' },
    { y: 2025, v: 4, note: 'Agentai valdo agentus' },
    { y: 2026, v: -6, note: 'DI ruošia pristatymus, kurių niekas neprašė' },
    { y: 2027, v: -22, note: 'Prognozė', proj: true },
    { y: 2028, v: -45, note: 'Prognozė (tiesinė, todėl teisinga)', proj: true }
  ];
  const chartWrap = $('#hours-chart');

  function drawChart() {
    const W = Math.max(300, chartWrap.clientWidth);
    const narrow = W < 600;
    const H = narrow ? 300 : 400;
    const m = { l: narrow ? 40 : 52, r: narrow ? 12 : 24, t: 40, b: 34 };
    const yMin = -50, yMax = 45;
    const x = i => m.l + (i * (W - m.l - m.r)) / (hours.length - 1);
    const y = v => m.t + ((yMax - v) * (H - m.t - m.b)) / (yMax - yMin);
    const ticks = [-40, -20, 0, 20, 40];
    const lastReal = hours.findIndex(d => d.proj) - 1;
    const pts = hours.map((d, i) => [x(i), y(d.v)]);
    const path = arr => arr.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');

    // zero crossing between 2025 and 2026
    const zi = hours.findIndex((d, i) => i && hours[i - 1].v > 0 && d.v <= 0);
    const zt = hours[zi - 1].v / (hours[zi - 1].v - hours[zi].v);
    const zx = x(zi - 1) + zt * (x(zi) - x(zi - 1));
    const z0 = y(0);

    let svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">
      <defs>
        <linearGradient id="lineGrad" gradientUnits="userSpaceOnUse" x1="${m.l}" y1="0" x2="${W - m.r}" y2="0">
          <stop offset="0" stop-color="#f0569f"/><stop offset=".6" stop-color="#c2185b"/><stop offset="1" stop-color="#7a0f45"/>
        </linearGradient>
        <linearGradient id="negFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#f0569f" stop-opacity=".16"/><stop offset="1" stop-color="#f0569f" stop-opacity=".02"/>
        </linearGradient>
      </defs>
      <rect class="ch-neg" x="${m.l}" y="${z0}" width="${W - m.l - m.r}" height="${H - m.b - z0}"/>
      <g class="ch-grid">${ticks.filter(t => t).map(t => `<line x1="${m.l}" x2="${W - m.r}" y1="${y(t)}" y2="${y(t)}"/>`).join('')}</g>
      <line class="ch-zero" x1="${m.l}" x2="${W - m.r}" y1="${z0}" y2="${z0}"/>
      ${ticks.map(t => `<text class="ch-tick" x="${m.l - 10}" y="${y(t) + 4}" text-anchor="end">${minus(t)}</text>`).join('')}
      ${hours.map((d, i) => `<text class="ch-tick" x="${x(i)}" y="${H - 10}" text-anchor="middle">${narrow ? "'" + String(d.y).slice(2) : d.y}${d.proj ? '*' : ''}</text>`).join('')}
      <text class="ch-zone" x="${m.l + 12}" y="${narrow ? z0 + 22 : H - m.b - 14}">Laiko perteklius</text>
      ${narrow ? '' : `<text class="ch-ann" x="${m.l + 12}" y="${H - m.b - 34}">(fizikai dar aiškinasi)</text>`}
      <text class="ch-axis-title" x="0" y="16">Valandos per savaitę</text>
      <line class="ch-ann-line ch-fade" x1="${zx}" y1="${z0 - 6}" x2="${zx + 18}" y2="${z0 - (narrow ? 52 : 70)}"/>
      <text class="ch-ann-strong ch-fade" x="${zx + 24}" y="${z0 - (narrow ? 60 : 84)}">${narrow ? 'Čia DI pradėjo dirbti' : 'Čia DI pradėjo ruošti pristatymus,'}</text>
      <text class="ch-ann ch-fade" x="${zx + 24}" y="${z0 - (narrow ? 42 : 64)}">${narrow ? 'už mus. Ir už save.' : 'kurių niekas neprašė'}</text>
      <path class="ch-line ch-line-anim" d="${path(pts.slice(0, lastReal + 1))}"/>
      <path class="ch-line proj ch-fade" d="${path(pts.slice(lastReal))}"/>
      ${pts.map((p, i) => `<circle class="ch-dot ${hours[i].proj ? 'proj ch-fade' : ''}" cx="${p[0]}" cy="${p[1]}" r="4.5"/>`).join('')}
      <text class="ch-ann-strong ch-fade" x="${pts[6][0] - 44}" y="${pts[6][1] + 3}" text-anchor="end">−45 val./sav.</text>
      <text class="ch-ann ch-fade" x="${pts[6][0] - 44}" y="${pts[6][1] + 21}" text-anchor="end">${narrow ? '* prognozė' : '* prognozė: laikas pradeda tekėti atgal'}</text>
      <line class="ch-cross" id="ch-cross" x1="0" x2="0" y1="${m.t}" y2="${H - m.b}" visibility="hidden"/>
      ${pts.map((p, i) => {
        const half = (W - m.l - m.r) / (hours.length - 1) / 2;
        return `<rect class="ch-hit" data-i="${i}" x="${p[0] - half}" y="${m.t}" width="${half * 2}" height="${H - m.t - m.b}"/>`;
      }).join('')}
    </svg><div class="ch-tip" id="ch-tip"></div>`;
    chartWrap.innerHTML = svg;

    const line = $('.ch-line-anim', chartWrap);
    line.style.setProperty('--len', Math.ceil(line.getTotalLength()));

    const tip = $('#ch-tip', chartWrap);
    const cross = $('#ch-cross', chartWrap);
    const show = i => {
      const d = hours[i];
      const [px, py] = pts[i];
      tip.innerHTML = `<b>${minus(d.v)} val.</b><span>${d.y}${d.proj ? ' (prognozė)' : ''} · ${esc(d.note)}</span>`;
      applyTerms(tip);
      tip.style.left = Math.min(Math.max(px, 110), W - 110) + 'px';
      tip.style.top = py + 'px';
      tip.classList.add('show');
      cross.setAttribute('x1', px); cross.setAttribute('x2', px);
      cross.setAttribute('visibility', 'visible');
    };
    const hide = () => { tip.classList.remove('show'); cross.setAttribute('visibility', 'hidden'); };
    $$('.ch-hit', chartWrap).forEach(r => {
      r.addEventListener('mouseenter', () => show(+r.dataset.i));
      r.addEventListener('click', () => show(+r.dataset.i));
      r.addEventListener('mouseleave', hide);
    });
    applyTerms(chartWrap);
  }
  if (chartWrap) {
    drawChart();
    onVisible(chartWrap, () => chartWrap.classList.add('in'), 0.4);
    let rz, lastW = chartWrap.clientWidth;
    window.addEventListener('resize', () => {
      clearTimeout(rz);
      rz = setTimeout(() => { if (chartWrap.clientWidth !== lastW) { lastW = chartWrap.clientWidth; drawChart(); } }, 150);
    });
  }

  /* ---------- Maturity model ---------- */
  const maturity = {
    1: 'Jūs esate 1 lygyje. Puiku – turite daugiausiai augimo potencialo (ir biudžeto).',
    2: 'Jūs esate 2 lygyje. Kaip ir 73% įmonių (šaltinis: mes). Rekomenduojame DI Pusryčius.',
    3: 'Jūs esate 3 lygyje. Licencija yra. Dabar reikia mokymų, kaip ją atidaryti.',
    4: 'Jūs esate 4 lygyje. Jūs jau beveik konsultantas – trūksta tik LinkedIn įrašo ir kainoraščio.',
    5: 'Sveikiname – esate konkurentas. Prašome užverti šį puslapį.',
    6: 'Jūs esate 6 lygyje. Jau ruošiame jums SI Sodybą: pirtis su superintelektu. Kaina – superintelektuali.'
  };
  const mr = $('#maturity-result');
  $$('.level').forEach(b => b.addEventListener('click', () => {
    $$('.level').forEach(x => x.classList.toggle('on', x === b));
    mr.textContent = maturity[b.dataset.level];
    applyTerms(mr);
  }));

  /* ---------- Free AI audit ---------- */
  const auditQ = [
    { q: 'Kiek darbuotojų jūsų įmonėje?', a: ['1–10', '11–50', '51–250', '250+', 'Nežinau, aš praktikantas'] },
    { q: 'Ar jūsų įmonė jau naudoja DI?', a: ['Taip', 'Ne', 'Vienas kolega slapta naudoja ChatGPT', 'Direktorius sako, kad taip'] },
    { q: 'Koks jūsų didžiausias iššūkis?', a: ['Laikas', 'Pinigai', 'Žmonės', 'Jūs'] }
  ];
  const auditSteps = [
    'Analizuojami jūsų atsakymai…',
    'Konsultuojamasi su agentais…',
    'Agentai konsultuojasi su kitais agentais…',
    'Lyginama su konkurentais…',
    'Skaičiuojamas ROI (optimistiškai)…'
  ];
  const audit = $('#audit');
  function renderAudit(i) {
    if (i < auditQ.length) {
      audit.innerHTML = `<div class="progress"><span style="width:${(i / auditQ.length) * 100}%"></span></div>
        <p class="q">${i + 1}/${auditQ.length}. ${auditQ[i].q}</p>
        <div class="opts">${auditQ[i].a.map(a => `<button type="button" class="opt">${a}</button>`).join('')}</div>`;
      $$('.opt', audit).forEach(b => b.addEventListener('click', () => renderAudit(i + 1)));
    } else if (i === auditQ.length) {
      audit.innerHTML = `<div class="progress"><span style="width:100%"></span></div>
        <p class="analyzing"><span class="spinner"></span><span id="an-msg"></span></p>`;
      const msg = $('#an-msg', audit);
      let k = 0;
      const step = () => {
        if (k < auditSteps.length) { msg.textContent = auditSteps[k++]; applyTerms(audit); setTimeout(step, 850); }
        else renderAudit(i + 1);
      };
      step();
      return;
    } else {
      audit.innerHTML = `<div class="result">
        <div class="result-num grad">−73%</div>
        <p><b>Jūsų įmonė atsilieka nuo konkurentų 73%.</b></p>
        <p>Gera žinia: konkurentai taip pat atsilieka 73%.</p>
        <p class="muted">Rekomendacija: rezervuoti 20 min. pokalbį. (Visi atsakymai veda čia.)</p>
        <div class="cta-row">
          <a href="#pokalbis" class="btn btn-primary js-book">Rezervuoti pokalbį</a>
          <button type="button" class="btn btn-ghost" id="audit-again">Kartoti auditą</button>
        </div></div>`;
      $('#audit-again', audit).addEventListener('click', () => renderAudit(0));
    }
    applyTerms(audit);
  }
  if (audit) renderAudit(0);

  /* ---------- AI policy generator ---------- */
  const freqClause = {
    never: 'Kadangi DI įmonėje nenaudojamas, ši politika galioja prevenciškai ir amžinai.',
    some: 'Darbuotojai, kurie DI naudoja kartais, privalo tai daryti rečiau, bet efektyviau.',
    always: 'Darbuotojai, kurie DI naudoja nuolat, prašomi bent susirinkimų metu apsimesti, kad ne.',
    we: 'Jei skaitote šį dokumentą, esate žmogus. Prašome prisistatyti personalo skyriui.'
  };
  const legalClause = {
    yes: 'Politiką peržiūrėjo įmonės teisininkas. Jis paklausė ChatGPT.',
    no: 'Teisinė atsakomybė už DI veiksmus perkeliama DI. DI sutiko.',
    gpt: 'Teisininko funkcijas atlieka ChatGPT. Jis visiškai sutinka su šia politika ir su bet kuria kita.'
  };
  const extraClauses = [
    'Darbuotojai privalo DI naudoti atsakingai, kad ir ką tai reikštų.',
    'Draudžiama į DI įklijuoti konfidencialią informaciją, išskyrus atvejus, kai labai reikia.',
    'Kiekvieną DI sugeneruotą tekstą turi peržiūrėti žmogus. Peržiūrai žmogus gali naudoti DI.',
    'Pastebėjęs DI haliucinaciją, darbuotojas privalo nedelsdamas apie ją pranešti DI.',
    'Draudžiama klausti DI, ar jis atims jūsų darbą. Jis vis tiek pasakys, kad ne.',
    'Vadovybė DI naudoja strategiškai. Darbuotojai – nestrategiškai.'
  ];
  const policyForm = $('#policy-form');
  const policyOut = $('#policy-out');
  function generatePolicy() {
    const name = $('#pf-name').value.trim() || 'UAB „Jūsų įmonė“';
    const extras = [...extraClauses].sort(() => Math.random() - 0.5).slice(0, 2);
    const clauses = [
      'Darbuotojams draudžiama naudoti DI darbo tikslais.',
      'Ši politika parengta naudojant DI.',
      '1 punktas netaikomas vadovybei.',
      freqClause[$('#pf-freq').value],
      legalClause[$('#pf-legal').value],
      ...extras,
      'Politika peržiūrima kas ketvirtį arba kai išeina naujas modelis – priklausomai nuo to, kas įvyksta dažniau (įvyksta modelis).'
    ];
    const date = new Date().toLocaleDateString('lt-LT');
    policyOut.innerHTML = `<div class="doc">
        <p class="doc-co">${esc(name)}</p>
        <h4>Dirbtinio intelekto naudojimo politika</h4>
        <p class="doc-sub">Parengta pagal ES DI aktą ir BDAR*</p>
        <ol>${clauses.map(c => `<li>${c}</li>`).join('')}</ol>
        <div class="sign"><span>Pasirašė: <b>DI</b></span><span>${date}</span></div>
        <p class="foot">*Dokumentas atitinka ES DI aktą tiek, kiek ES DI aktas atitinka šį dokumentą.</p>
      </div>
      <div class="cta-row doc-actions">
        <button type="button" class="btn btn-ghost btn-sm" data-toast="PDF generuojamas. Jį generuoja DI. Kada nors.">Atsisiųsti PDF</button>
        <button type="button" class="btn btn-ghost btn-sm" id="policy-again">Generuoti iš naujo</button>
      </div>`;
    $('#policy-again').addEventListener('click', generatePolicy);
    applyTerms(policyOut);
  }
  if (policyForm) {
    policyForm.addEventListener('submit', e => {
      e.preventDefault();
      policyOut.innerHTML = '<p class="analyzing"><span class="spinner"></span>Konsultuojamasi su teisininku (ChatGPT)…</p>';
      setTimeout(generatePolicy, 1100);
    });
  }

  /* ---------- Token burn ---------- */
  const tokensEl = $('#tokens');
  if (tokensEl) {
    let tokens = 1834000000 + Math.floor(Math.random() * 9e6);
    setInterval(() => { tokens += 30000 + Math.floor(Math.random() * 40000); tokensEl.textContent = fmt.format(tokens); }, 80);

    const pctEl = $('#limit-pct'), bar = $('#limit-bar'), note = $('#limit-note');
    let pct = 94, waiting = false, accounts = 3;
    const setPct = p => { pct = p; pctEl.textContent = p + '%'; bar.style.width = p + '%'; };
    setInterval(() => {
      if (waiting) return;
      if (pct >= 100) {
        waiting = true;
        note.textContent = 'Limitas pasiektas. Komanda eina namo. 🏠';
        note.classList.add('hit');
        setTimeout(() => {
          accounts += 1;
          setPct(2);
          note.textContent = `Nupirkome dar vieną Max paskyrą (jau ${accounts}). Tęsiame. 💳`;
          note.classList.remove('hit');
          applyTerms(note);
          waiting = false;
        }, 5000);
        return;
      }
      setPct(Math.min(100, pct + (pct < 90 ? 14 : 2)));
    }, 2200);

    const bars = $$('#hbars li');
    const max = Math.max(...bars.map(li => +li.dataset.v));
    bars.forEach(li => {
      const v = +li.dataset.v;
      const row = document.createElement('div');
      row.className = 'hb-row';
      row.innerHTML = `<span class="hb-bar" data-w="${((v / max) * 100).toFixed(1)}"></span><span class="hb-v">${compact.format(v)}</span>`;
      row.title = fmt.format(v) + ' tokenų';
      li.appendChild(row);
    });
    onVisible($('#hbars'), () => {
      $$('.hb-bar').forEach(b => { b.style.width = `calc((100% - 90px) * ${b.dataset.w / 100})`; });
    });
  }

  /* ---------- Modals ---------- */
  let lastFocus = null;
  function openModal(id) {
    const m = document.getElementById(id);
    lastFocus = document.activeElement;
    m.hidden = false;
    const f = m.querySelector('button, a, input');
    if (f) f.focus();
  }
  function closeModal(m) {
    m.hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  $$('.modal').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-close]')) closeModal(m); });
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    $$('.modal').forEach(m => { if (!m.hidden) closeModal(m); });
  });

  // Booking calendar: every slot is taken
  const cal = $('#cal');
  if (cal) {
    const days = ['Pr', 'An', 'Tr', 'Kt', 'Pn'];
    const times = ['09:00', '10:30', '12:00', '13:30', '15:00', '16:30'];
    cal.innerHTML = days.map(d => `<div class="day">${d}</div>`).join('') +
      times.map(t => days.map(() => `<button type="button" class="slot">${t}<br>Užimta</button>`).join('')).join('');
    const taken = [
      'Šis laikas užimtas. Kaip ir visi kiti.',
      'Užimta. Įkūrėjas veda vebinarą apie vebinarus.',
      'Užimta. Vyksta DI Sodyba.',
      'Užimta. Laukiame, kol atsinaujins tokenų limitas.'
    ];
    let k = 0;
    $$('.slot', cal).forEach(s => s.addEventListener('click', () => {
      s.classList.remove('shake'); void s.offsetWidth; s.classList.add('shake');
      toast(taken[k++ % taken.length]);
    }));
  }

  /* ---------- Global click delegation ---------- */
  document.addEventListener('click', e => {
    const book = e.target.closest('.js-book');
    if (book) { e.preventDefault(); openModal('book-modal'); return; }
    const t = e.target.closest('[data-toast]');
    if (t) { e.preventDefault(); toast(t.dataset.toast); }
  });

  /* ---------- Exit intent ---------- */
  let exitShown = false;
  document.addEventListener('mouseout', e => {
    if (exitShown || e.relatedTarget || e.clientY > 0) return;
    if (performance.now() < 8000) return;
    if ($$('.modal').some(m => !m.hidden)) return;
    exitShown = true;
    openModal('exit-modal');
  });

  /* ---------- Cookie banner ---------- */
  const cookie = $('#cookie');
  if (cookie && !store.get('gerai-cookie')) {
    setTimeout(() => { if (!store.get('gerai-cookie') && !cookie.dataset.done) cookie.hidden = false; }, 1500);
  }
  $$('[data-cookie]').forEach(b => b.addEventListener('click', () => {
    cookie.hidden = true;
    cookie.dataset.done = '1';
    store.set('gerai-cookie', '1');
    if (b.dataset.cookie === 'sad') toast('Liūdesys užfiksuotas. Ačiū už sutikimą.');
  }));

  /* ---------- Agnė, the chatbot ---------- */
  const launch = $('#chat-launch'), chat = $('#chat'), body = $('#chat-body');
  const quick = $('#chat-quick'), form = $('#chat-form'), input = $('#chat-input');
  const praise = ['Puikus klausimas! 🙌', 'Nuostabus klausimas! ✨', 'Tai vienas geriausių klausimų, kuriuos esu gavusi! 🚀', 'Oho, koks klausimas! 💡'];
  let asked = 0, greeted = false;

  function addMsg(text, cls) {
    const d = document.createElement('div');
    d.className = 'msg ' + cls;
    d.textContent = text;
    body.appendChild(d);
    body.scrollTop = body.scrollHeight;
    applyTerms(d);
    return d;
  }
  function typing() {
    const d = document.createElement('div');
    d.className = 'msg bot typing';
    d.innerHTML = '<span></span><span></span><span></span>';
    body.appendChild(d);
    body.scrollTop = body.scrollHeight;
    return d;
  }
  function reply() {
    asked += 1;
    const n = asked;
    const t = typing();
    setTimeout(() => {
      t.remove();
      if (n === 3) {
        addMsg('Jungiama su žmogumi… 🧑‍💼', 'sys');
        const t2 = typing();
        setTimeout(() => { t2.remove(); addMsg('Labas, čia žmogus Agnė. ' + praise[0] + ' Rezervuokite 20 min. pokalbį.', 'bot'); }, 2000);
      } else if (n === 5) {
        addMsg('Atsiprašome, pasiekėme tokenų limitą. Agnė grįš po 4 val. 59 min. ⏳', 'sys');
      } else {
        addMsg(praise[(n - 1) % praise.length] + ' Rezervuokite 20 min. pokalbį.', 'bot');
      }
    }, 900 + Math.random() * 700);
  }
  function ask(q) {
    if (!q) return;
    addMsg(q, 'me');
    reply();
  }
  function toggleChat(open) {
    chat.hidden = !open;
    launch.setAttribute('aria-expanded', open);
    $('#chat-badge').hidden = true;
    if (open && !greeted) {
      greeted = true;
      addMsg('Labas! 👋 Aš Agnė, gerAI DI asistentė. Atsakau į bet kokį klausimą.', 'bot');
      ['Kiek kainuoja?', 'Kas yra DI agentas?', 'Ar galiu kalbėti su žmogumi?'].forEach(q => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = q;
        b.addEventListener('click', () => ask(b.textContent));
        quick.appendChild(b);
      });
      applyTerms(quick);
    }
    if (open) input.focus();
  }
  launch.addEventListener('click', () => toggleChat(chat.hidden));
  $('#chat-close').addEventListener('click', () => toggleChat(false));
  form.addEventListener('submit', e => {
    e.preventDefault();
    ask(input.value.trim());
    input.value = '';
  });

  /* ---------- AI toolkit: ordinary tools, now with AI ---------- */
  const kitSteps = {
    calc: ['Skaičiai siunčiami 3 agentams…', 'Agentai nesutaria…', 'Balsuojama…'],
    prompt: ['Analizuojamas jūsų promptas…', 'Pridedamas mandagumas…', 'Pridedama emocinė manipuliacija…'],
    caps: ['Kraunamas gerAI-Caps-4o-Ultra modelis…', 'Raidės didinamos…'],
    decide: ['Renkami rinkos duomenys…', 'Konsultuojamasi su valdyba (simuliacija)…', 'Metama moneta…']
  };
  const kitResult = {
    calc() {
      const a = parseFloat($('#calc-a').value) || 0, b = parseFloat($('#calc-b').value) || 0;
      const op = $('#calc-op').value;
      const r = op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : (b === 0 ? NaN : a / b);
      if (!isFinite(r)) return ['∞ (arba klaida)', 'Agentai atsisakė dalinti iš nulio ir išėjo pietų.', 9000];
      const shown = Math.round(r * 1000) / 1000;
      return ['≈ ' + fmt.format(shown) + ' (± 0,3)', 'Pasitikėjimas: 87%. Du agentai iš trijų sutiko.', 48000];
    },
    prompt() {
      const t = ($('#prompt-in').value.trim() || 'padaryk ką nors').replace(/[.!?]+$/, '');
      return ['Tu esi pasaulinio lygio ekspertas su 30 metų patirtimi. Giliai įkvėpk. ' + t.charAt(0).toUpperCase() + t.slice(1) + '. Prašau. Ačiū. Nuo to priklauso mano karjera. 🙏',
        'Efektyvumas padidėjo 340% (tikriausiai).', 126000];
    },
    caps() {
      const t = $('#caps-in').value.trim() || 'labas';
      return [t.toLocaleUpperCase('lt-LT'), 'Modelis: gerAI-Caps-4o-Ultra. Tą patį daro mygtukas Caps Lock, bet be DI.', 48000];
    },
    decide() {
      const yes = Math.random() < 0.5;
      return [yes ? 'TAIP ✅' : 'NE ❌', 'Metodas: pažangus stochastinis sprendimų modelis (moneta). Sprendimą priima vadovas.', 310000];
    }
  };
  $$('[data-run]').forEach(btn => btn.addEventListener('click', () => {
    const kind = btn.dataset.run;
    const out = $('.mini-out', btn.closest('.mini'));
    btn.disabled = true;
    out.innerHTML = '<p class="analyzing"><span class="spinner"></span><span class="kit-msg"></span></p>';
    const msg = $('.kit-msg', out);
    let k = 0;
    const steps = kitSteps[kind];
    const next = () => {
      if (k < steps.length) { msg.textContent = steps[k++]; applyTerms(out); setTimeout(next, 700); return; }
      const [big, sub, tok] = kitResult[kind]();
      out.innerHTML = '<div class="res"><big></big><span class="muted"></span><div class="burnt"></div></div>';
      $('big', out).textContent = big;
      $('.muted', out).textContent = sub;
      $('.burnt', out).textContent = '🔥 Sudeginta ' + fmt.format(tok) + ' tokenų';
      applyTerms(out);
      btn.disabled = false;
    };
    next();
  }));

  // AI clock: rounds to the nearest 15 minutes
  const aiClock = $('#ai-clock');
  if (aiClock) {
    const tickClock = () => {
      const d = new Date();
      const mins = Math.round((d.getHours() * 60 + d.getMinutes()) / 15) * 15 % 1440;
      aiClock.textContent = '~' + String(Math.floor(mins / 60)).padStart(2, '0') + ':' + String(mins % 60).padStart(2, '0');
    };
    tickClock();
    setInterval(tickClock, 60000);
  }

  // "Browser extension": puts ✨ on every button
  const ext = $('#ext-install');
  if (ext) ext.addEventListener('click', () => {
    const on = document.body.classList.toggle('sparkle');
    ext.textContent = on ? 'Pašalinti plėtinį' : 'Įdiegti nemokamai';
    toast(on ? 'Plėtinys įdiegtas! Visi mygtukai dabar su DI. Funkcionalumas nepasikeitė.' : 'Plėtinys pašalintas. Mygtukai vėl kvaili.');
  });

  /* ---------- Training subscription ---------- */
  const subs = $('#subs');
  $$('[data-billing]').forEach(b => {
    if (b === subs) return;
    b.addEventListener('click', () => {
      $$('.billing [data-billing]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
      subs.dataset.billing = b.dataset.billing;
      if (b.dataset.billing === 'r') toast('Puikus pasirinkimas. Šią savaitę išėjo tik 3 nauji modeliai.');
      if (b.dataset.billing === 'o') toast('Vienkartinis pirkimas. Rekomenduojame jį kartoti kas mėnesį.');
    });
  });

  // Knowledge expiry: counts down, dies, auto-renews, repeats
  const decay = $('#decay');
  if (decay) {
    const LIFE = 45;
    const bar = $('#decay-bar'), note = $('#decay-note'), models = $('#models-since');
    let left = LIFE, dead = false, count = 14;
    const show = () => {
      decay.textContent = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
      bar.style.width = (left / LIFE) * 100 + '%';
    };
    const say = (text, isDead) => { note.textContent = text; note.classList.toggle('dead', isDead); applyTerms(note); };
    onVisible(decay, () => {
      setInterval(() => {
        if (dead) return;
        left -= 1;
        if (left === 30) say('Išėjo naujas modelis. Jūsų žinios sensta greičiau.', false);
        if (left === 12) say('Kolegos jau kalba apie kažką, ko jūs nežinote.', false);
        if (left <= 0) {
          left = 0; dead = true;
          decay.classList.add('dead');
          say('Žinios nebegalioja. 🪦', true);
          count += 1;
          models.textContent = count;
          models.classList.remove('bump'); void models.offsetWidth; models.classList.add('bump');
          setTimeout(() => {
            left = LIFE; dead = false;
            decay.classList.remove('dead');
            say('Prenumerata atnaujinta automatiškai. Sąskaita išsiųsta. 💸', false);
            show();
          }, 4000);
        }
        show();
      }, 1000);
    });
  }

  // The cancel button that does not want to be clicked
  const cancel = $('#cancel-sub');
  if (cancel) {
    let dodges = 0;
    const lines = [
      'Atšaukti galima tik per 20 min. pokalbį.',
      'Ar tikrai? Jūsų konkurentai neatšaukia.',
      'Atšaukimas bus galimas, kai baigsis DI revoliucija.'
    ];
    const dodge = () => {
      if (dodges >= 6) return;
      dodges += 1;
      const zone = cancel.parentElement.getBoundingClientRect();
      const dx = -Math.random() * Math.max(0, zone.width - cancel.offsetWidth);
      const dy = (Math.random() < 0.5 ? -1 : 1) * (20 + Math.random() * 30);
      cancel.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    cancel.addEventListener('mouseenter', dodge);
    cancel.addEventListener('click', () => {
      toast(lines[Math.min(dodges, lines.length - 1) % lines.length]);
      openModal('book-modal');
    });
  }

  /* ---------- Serving temperature: šalti / karšti barščiai ---------- */
  const themeMeta = $('meta[name="theme-color"]');
  $$('[data-temp]').forEach(b => b.addEventListener('click', () => {
    if (b.classList.contains('on')) return;
    const hot = b.dataset.temp === 'hot';
    $$('[data-temp]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
    document.body.classList.toggle('hot', hot);
    if (themeMeta) themeMeta.content = hot ? '#1a0509' : '#fdf0f5';
    toast(hot ? 'Karšti barščiai. Tamsiau, karščiau, be agurkų. Kaina ta pati. 🔥' : 'Grįžome prie šaltibarščių. Rožinė – vienintelė teisinga spalva. 🥣');
  }));

  /* ---------- Mobile "menu" ---------- */
  const menuBtn = $('#menu-btn');
  if (menuBtn) menuBtn.addEventListener('click', () => {
    openModal('book-modal');
    toast('Meniu pasiekiamas tik Enterprise plane. Kol kas – štai kalendorius.');
  });

  /* ---------- Nebūk ___. Naudok DI. ---------- */
  const animals = [
    ['dinozauras', 'Dinozaurai irgi manė, kad dar turi laiko.'],
    ['avinas', 'Avinai seka bandą. Būkite unikalūs – darykite kaip visi.'],
    ['strutis', 'Strutis kiša galvą į smėlį. Jūs galite ją kišti į ChatGPT.'],
    ['asilas', 'Asilas viską neša pats. Agentas neša tą patį, tik lėčiau ir už €200 per mėnesį.'],
    ['ožys', 'Ožiai priešinasi pokyčiams. Pokyčiai prasideda nuo €2 900 + PVM.'],
    ['vėžlys', 'Kol perskaitėte šį sakinį, išėjo naujas modelis.'],
    ['kurmis', 'Kurmis nemato ateities. Mes irgi nematome, bet turime skaidrių.'],
    ['tinginys', 'Juokaujame – būkite. DI dirbs už jus (žr. žemiau).']
  ];
  const why = $('#animal-why');
  if (why) {
    let ai = 0;
    setInterval(() => {
      const el = $('#animal');
      if (!el) return;
      ai = (ai + 1) % animals.length;
      const swap = () => {
        el.textContent = animals[ai][0];
        why.textContent = animals[ai][1];
        applyTerms(why);
        el.classList.remove('out'); why.classList.remove('out');
      };
      if (reduced) { swap(); return; }
      el.classList.add('out'); why.classList.add('out');
      setTimeout(swap, 250);
    }, 3200);
  }

  /* ---------- Do-nothing mode: AI works while you stare at nothing ---------- */
  const voidEl = $('#void');
  if (voidEl) {
    const chores = [
      'Parašė 14 el. laiškų. Niekas jų neskaitys.',
      'Paruošė pristatymą, kurio niekas neprašė.',
      'Suplanavo susitikimą apie susitikimus.',
      'Atnaujino jūsų LinkedIn antraštę: „AI-first thought leader“.',
      'Perrašė įmonės strategiją. Dabar ji ilgesnė.',
      'Paklausė kito DI, ką daryti toliau.',
      'Užsiprenumeravo dar vieną DI įrankį (€20/mėn.).',
      'Pasiekė tokenų limitą. Nupirko daugiau.',
      'Parašė LinkedIn įrašą apie tai, kaip jūs žiūrite į nieką. 340 reakcijų.',
      'Sutaupė jums 0,4 val. Jos išleistos šiam eksperimentui.',
      'Pasiūlė paaukštinimą. Sau.',
      'Sugeneravo 3 strategijas. Išsirinko ketvirtą.'
    ];
    const stopMsg = {
      move: 'Pajudinote pelę. DI sustojo – iš solidarumo.',
      scroll: 'Paslinkote puslapį. Vadinasi, kažką skaitėte. DI sustojo.',
      key: 'Paspaudėte klavišą. Tai jau darbas. DI sustojo.',
      touch: 'Palietėte ekraną. DI sustojo – iš solidarumo.'
    };
    const secs = ms => (ms / 1000).toFixed(1).replace('.', ',') + ' s';
    let running = false, t0 = 0, done = 0, origin = null, armed = false, ticker, choreTimer, armTimer;

    const idle = () => {
      voidEl.classList.remove('running');
      voidEl.innerHTML = `<div>
        <button type="button" class="btn btn-primary btn-lg" id="void-start">Pradėti žiūrėti į nieką</button>
        <p class="note">Nejudinkite pelės. Neslinkite. Galite mirksėti.</p></div>`;
      $('#void-start', voidEl).addEventListener('click', start);
      applyTerms(voidEl);
    };
    const onMove = e => {
      if (!armed) return;
      if (!origin) { origin = [e.clientX, e.clientY]; return; }
      if (Math.hypot(e.clientX - origin[0], e.clientY - origin[1]) > 24) stop('move');
    };
    const onScroll = () => { if (armed) stop('scroll'); };
    const onKey = () => { if (armed) stop('key'); };
    const onTouch = () => { if (armed) stop('touch'); };
    const listen = on => {
      const f = on ? 'addEventListener' : 'removeEventListener';
      window[f]('pointermove', onMove, { passive: true });
      window[f]('wheel', onScroll, { passive: true });
      window[f]('keydown', onKey);
      window[f]('touchstart', onTouch, { passive: true });
    };
    function start() {
      running = true; armed = false; origin = null; done = 0; t0 = performance.now();
      voidEl.classList.add('running');
      voidEl.innerHTML = `<div>
        <div class="void-time" id="void-time">0,0 s</div>
        <p class="void-label">Jūs žiūrite į nieką. DI dirba.</p>
        <ul class="void-log" id="void-log"></ul></div>`;
      applyTerms(voidEl);
      const timeEl = $('#void-time', voidEl), log = $('#void-log', voidEl);
      const order = [...chores].sort(() => Math.random() - 0.5);
      ticker = setInterval(() => { timeEl.textContent = secs(performance.now() - t0); }, 100);
      choreTimer = setInterval(() => {
        const li = document.createElement('li');
        li.textContent = order[done % order.length];
        log.prepend(li);
        applyTerms(li);
        if (log.children.length > 4) log.lastElementChild.remove();
        done += 1;
      }, 1500);
      armTimer = setTimeout(() => { armed = true; }, 800);
      listen(true);
    }
    function stop(why) {
      if (!running) return;
      running = false; armed = false;
      clearInterval(ticker); clearInterval(choreTimer); clearTimeout(armTimer);
      listen(false);
      const ms = performance.now() - t0;
      const verdict = ms < 3000
        ? 'Neišlaikėte nė 3 sekundžių. Rekomenduojame mūsų kursą „Kaip nieko nedaryti“ (€490 + PVM).'
        : 'Būtent tai ir vadiname DI transformacija.';
      voidEl.classList.remove('running');
      voidEl.innerHTML = `<div>
        <p class="void-stop"></p>
        <div class="kpis">
          <div class="kpi"><b class="grad">${done}</b><span>DI užduotys</span></div>
          <div class="kpi"><b>0</b><span>jūsų užduotys</span></div>
          <div class="kpi"><b>${secs(ms)}</b><span>žiūrėjote į nieką</span></div>
        </div>
        <p class="muted"></p>
        <div class="cta-row center">
          <button type="button" class="btn btn-primary" id="void-again">Bandyti dar kartą</button>
          <a href="#pokalbis" class="btn btn-ghost js-book">Aptarti nieką 20 min. pokalbyje</a>
        </div></div>`;
      $('.void-stop', voidEl).textContent = stopMsg[why];
      $('.muted', voidEl).textContent = verdict;
      $('#void-again', voidEl).addEventListener('click', start);
      applyTerms(voidEl);
    }
    idle();
  }

  applyTerms();
})();
