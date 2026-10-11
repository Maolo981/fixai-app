(() => {
  'use strict';

  // ---------------------------------------------------------------------------
  // Data shipped with the page
  // ---------------------------------------------------------------------------
  const dataEl = document.getElementById('studio-data');
  const DATA = JSON.parse(dataEl.textContent);
  const BASE_URL = dataEl.dataset.base || window.location.href.split('#')[0];
  const COVERS = JSON.parse(document.getElementById('studio-covers').textContent);
  const THUMBS = JSON.parse(document.getElementById('studio-thumbs').textContent);
  const EVENTS = DATA.events;
  const THEMES = DATA.themes;
  const EV = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
  const TH = Object.fromEntries(THEMES.map((t) => [t.id, t]));
  const app = document.getElementById('app');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------------------------------------------------------------------
  // Small utilities
  // ---------------------------------------------------------------------------
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const str = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max) : '');
  const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;
  const HM = /^([01]\d|2[0-3]):([0-5]\d)$/;
  const isHm = (s) => HM.test(s || '');
  const isYmd = (s) => {
    const m = YMD.exec(s || '');
    if (!m) return false;
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
  };
  const ymdDate = (ymd) => {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  };
  const addDays = (ymd, n) => {
    const d = ymdDate(ymd);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const todayRome = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date());
  const nextSaturday = (minDays) => {
    let ymd = addDays(todayRome(), minDays);
    while (ymdDate(ymd).getUTCDay() !== 6) ymd = addDays(ymd, 1);
    return ymd;
  };
  function tzOffset(date) {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Rome', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
        .formatToParts(date)
        .map((p) => [p.type, p.value]),
    );
    return Math.round((Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second) - date.getTime()) / 60000);
  }
  function romeToUtc(ymd, hm) {
    const [y, m, d] = ymd.split('-').map(Number);
    const [hh, mm] = (isHm(hm) ? hm : '12:00').split(':').map(Number);
    const guess = Date.UTC(y, m - 1, d, hh, mm);
    let ts = guess - tzOffset(new Date(guess)) * 60000;
    const corrected = guess - tzOffset(new Date(ts)) * 60000;
    if (corrected !== ts) ts = corrected;
    return new Date(ts);
  }
  const itFmt = (o) => new Intl.DateTimeFormat('it-IT', { ...o, timeZone: 'UTC' });
  const F_LONG = itFmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const F_SHORT = itFmt({ day: 'numeric', month: 'long', year: 'numeric' });
  const F_DM = itFmt({ day: 'numeric', month: 'long' });
  const dateLong = (ymd) => (isYmd(ymd) ? F_LONG.format(ymdDate(ymd)) : '');
  const dateShort = (ymd) => (isYmd(ymd) ? F_SHORT.format(ymdDate(ymd)) : '');
  const dayMonth = (ymd) => (isYmd(ymd) ? F_DM.format(ymdDate(ymd)) : '');
  const waNumber = (p) => {
    let d = String(p || '').replace(/[^\d+]/g, '');
    if (d.startsWith('+')) d = d.slice(1);
    else if (d.startsWith('00')) d = d.slice(2);
    else if (/^[03]\d{5,10}$/.test(d)) d = '39' + d;
    return d.replace(/\D/g, '');
  };
  const waLink = (text, phone) => `https://wa.me/${phone ? waNumber(phone) : ''}?text=${encodeURIComponent(text)}`;
  const mapsLink = (place, address) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([place, address].filter(Boolean).join(', '))}`;
  const fmtIban = (s) => s.replace(/(.{4})/g, '$1 ').trim();
  function validIban(s) {
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
    let m = 0;
    for (const ch of s.slice(4) + s.slice(0, 4)) {
      const v = ch >= 'A' ? String(ch.charCodeAt(0) - 55) : ch;
      for (const d of v) m = (m * 10 + Number(d)) % 97;
    }
    return m === 1;
  }
  const pad = (n) => String(n).padStart(2, '0');
  function localStamp(date, time, plusMin) {
    const [y, m, d] = date.split('-').map(Number);
    const [hh, mm] = time.split(':').map(Number);
    const t = new Date(Date.UTC(y, m - 1, d, hh, mm) + plusMin * 60000);
    return `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}T${pad(t.getUTCHours())}${pad(t.getUTCMinutes())}00`;
  }
  function gcalUrl(title, d, location, details) {
    const dates = isHm(d.time)
      ? `${localStamp(d.date, d.time, 0)}/${localStamp(d.date, d.time, 300)}`
      : `${d.date.replace(/-/g, '')}/${addDays(d.date, 1).replace(/-/g, '')}`;
    const p = new URLSearchParams({ action: 'TEMPLATE', text: title, dates, ctz: 'Europe/Rome', location, details });
    return `https://calendar.google.com/calendar/render?${p}`;
  }
  const displayNames = (d) => [d.name1, d.name2].filter(Boolean).join(' & ') || 'Il tuo invito';
  const initials = (d) => {
    const first = (s) => ((s || '').trim().match(/\p{L}/u)?.[0] ?? '').toUpperCase();
    const a = first(d.name1);
    const b = first(d.name2);
    return a && b ? `${a}&${b}` : a || '♥';
  };
  function eventPhrase(ev, d) {
    if (ev.phrase === 'a {n1}') return `a «${d.name1}»`;
    let p = ev.phrase;
    if (ev.couple) p = p.replace('{n1} e {n2}', [d.name1, d.name2].filter(Boolean).join(' e '));
    if (ev.id === 'addio' && /celibato/i.test(d.eyebrow)) p = p.replace('nubilato', 'celibato');
    return p.replace('{n1}', d.name1).replace('{n2}', d.name2);
  }
  const nsClass = (d) => {
    const l = Math.max(d.name1.length, d.name2.length);
    return l <= 7 ? 'ns-xl' : l <= 10 ? 'ns-l' : l <= 14 ? 'ns-m' : 'ns-s';
  };

  // ---------------------------------------------------------------------------
  // Toast and confetti
  // ---------------------------------------------------------------------------
  const toastEl = document.getElementById('toast');
  let toastTimer;
  function toast(text) {
    toastEl.textContent = text;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3400);
  }
  function confetti() {
    if (reduce) return;
    const inv = document.querySelector('.inv');
    const colors = (inv ? getComputedStyle(inv).getPropertyValue('--confetti') : '')
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    if (!colors.length) colors.push('#c9a65f', '#ead9a0', '#ffffff');
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 90; i++) {
      const el = document.createElement('i');
      const w = 5 + Math.random() * 6;
      el.className = 'confetti-piece';
      el.style.left = Math.random() * 100 + 'vw';
      el.style.width = w + 'px';
      el.style.height = w * (Math.random() > 0.5 ? 1.8 : 1) + 'px';
      el.style.background = colors[i % colors.length];
      el.style.borderRadius = Math.random() > 0.6 ? '50%' : '1px';
      el.style.animationDelay = Math.random() * 0.7 + 's';
      el.style.setProperty('--dx', (Math.random() - 0.5) * 180 + 'px');
      el.style.setProperty('--rot', (Math.random() - 0.5) * 1000 + 'deg');
      el.style.setProperty('--dur', 2.4 + Math.random() * 2.4 + 's');
      frag.appendChild(el);
    }
    document.body.appendChild(frag);
    setTimeout(() => document.querySelectorAll('.confetti-piece').forEach((e) => e.remove()), 6500);
  }
  async function copyText(text, selectEl) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      if (selectEl) {
        if (selectEl.select) selectEl.select();
        else {
          const range = document.createRange();
          range.selectNodeContents(selectEl);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const state = {
    step: 'choose', // choose | edit | share | view
    ev: 'matrimonio',
    theme: 'ulivo',
    cover: '',
    data: null,
    guest: '',
    fromLink: false,
    payload: '',
    previewEnvelope: false,
    sample: null,
  };

  function defaultsFor(evId) {
    const ev = EV[evId];
    const date = nextSaturday(evId === 'matrimonio' ? 240 : 60);
    return { ...JSON.parse(JSON.stringify(ev.defaults)), date, rsvpDeadline: addDays(date, evId === 'matrimonio' ? -45 : -10) };
  }

  function startEditing(evId) {
    state.ev = evId;
    state.theme = EV[evId].theme;
    state.cover = '';
    state.data = defaultsFor(evId);
    state.guest = '';
    go('edit');
  }

  // ---------------------------------------------------------------------------
  // Share links: the whole invitation travels in the link (#...)
  // ---------------------------------------------------------------------------
  const KEYS = [
    ['eyebrow', 'ey', 60],
    ['name1', 'n1', 60],
    ['name2', 'n2', 60],
    ['subtitle', 'st', 80],
    ['date', 'd', 10],
    ['time', 'ti', 5],
    ['message', 'm', 1200],
    ['dressCode', 'dc', 140],
    ['giftText', 'gt', 400],
    ['iban', 'ib', 34],
    ['ibanHolder', 'ih', 80],
    ['giftLink', 'gl', 300],
    ['rsvpDeadline', 'rd', 10],
    ['customQuestion', 'cq', 120],
    ['contactName', 'cn', 40],
    ['contactPhone', 'cp', 24],
    ['signature', 'sg', 120],
  ];
  function pack() {
    const d = state.data;
    const o = { v: 1, e: state.ev, t: state.theme };
    for (const [k, s] of KEYS) if (d[k]) o[s] = d[k];
    const prog = d.program.filter((x) => x.time || x.title || x.place || x.address);
    if (prog.length) o.p = prog.map((x) => [x.time, x.title, x.place, x.address]);
    o.f = (d.askChildren ? 1 : 0) | (d.askDiet ? 2 : 0) | (d.showCountdown ? 4 : 0);
    if (state.cover) o.c = state.cover;
    return o;
  }
  function unpack(o) {
    if (!o || o.v !== 1 || !EV[o.e]) return null;
    const d = { program: [] };
    for (const [k, s, max] of KEYS) d[k] = str(o[s], max);
    if (!isYmd(d.date)) return null;
    if (d.time && !isHm(d.time)) d.time = '';
    if (d.rsvpDeadline && !isYmd(d.rsvpDeadline)) d.rsvpDeadline = '';
    if (d.giftLink && !/^https?:\/\/\S+$/i.test(d.giftLink)) d.giftLink = '';
    d.iban = d.iban.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    if (Array.isArray(o.p))
      d.program = o.p.slice(0, 5).map((a) => ({
        time: isHm(a?.[0]) ? a[0] : '',
        title: str(a?.[1], 60),
        place: str(a?.[2], 90),
        address: str(a?.[3], 140),
      }));
    const f = Number(o.f) || 0;
    d.askChildren = Boolean(f & 1);
    d.askDiet = Boolean(f & 2);
    d.showCountdown = Boolean(f & 4);
    return { ev: o.e, theme: TH[o.t] ? o.t : EV[o.e].theme, cover: COVERS[o.c] ? o.c : '', data: d };
  }
  const b64url = (bytes) => {
    let s = '';
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  const unb64url = (text) => {
    const s = text.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(s + '='.repeat((4 - (s.length % 4)) % 4));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  };
  const through = async (bytes, transform) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(transform)).arrayBuffer());
  async function encodePayload(obj) {
    const raw = new TextEncoder().encode(JSON.stringify(obj));
    if (typeof CompressionStream === 'function') {
      try {
        return 'z' + b64url(await through(raw, new CompressionStream('deflate-raw')));
      } catch {
        /* fall back to plain */
      }
    }
    return 'j' + b64url(raw);
  }
  async function decodePayload(p) {
    const bytes = unb64url(p.slice(1));
    let raw;
    if (p[0] === 'z') raw = await through(bytes, new DecompressionStream('deflate-raw'));
    else if (p[0] === 'j') raw = bytes;
    else throw new Error('formato sconosciuto');
    return JSON.parse(new TextDecoder().decode(raw));
  }
  const encodeName = (name) => b64url(new TextEncoder().encode(name.trim().slice(0, 40)));
  const decodeName = (s) => str(new TextDecoder().decode(unb64url(s)), 40);
  const linkFor = (guest) => `${BASE_URL}#${state.payload}${guest && guest.trim() ? '~' + encodeName(guest) : ''}`;

  // ---------------------------------------------------------------------------
  // The invitation (same markup and classes as the real product)
  // ---------------------------------------------------------------------------
  function stepper(label, name, value, max) {
    return `<div class="stepper"><span class="stp-label">${label}</span><div class="stp">
      <button type="button" data-step="-1" aria-label="Uno in meno">−</button>
      <input type="number" id="r-${name}" name="${name}" inputmode="numeric" min="0" max="${max}" value="${value}" aria-label="${label}">
      <button type="button" data-step="1" aria-label="Uno in più">+</button></div></div>`;
  }

  const mono = (d) => {
    const [a, b] = initials(d).split('&');
    return b ? `${esc(a)}<span class="mono-amp">&amp;</span>${esc(b)}` : esc(a);
  };
  function dateParts(ymd) {
    if (!isYmd(ymd)) return null;
    const parts = F_LONG.formatToParts(ymdDate(ymd));
    const get = (type) => parts.find((x) => x.type === type)?.value ?? '';
    return { weekday: get('weekday'), day: get('day'), month: get('month'), year: get('year') };
  }

  function renderInvite(mode, withEnvelope) {
    const ev = EV[state.ev];
    const th = TH[state.theme];
    const orn = th.orn;
    const d = state.data;
    const names = displayNames(d);
    const start = isYmd(d.date) ? romeToUtc(d.date, d.time || '12:00') : null;
    const program = d.program.filter((x) => x.time || x.title || x.place || x.address);
    const firstPlace = program.find((x) => x.place)?.place || '';
    const twoNames = ev.couple && d.name2;
    const cover = state.cover && COVERS[state.cover];
    const guest = state.guest;
    const who = d.contactName || 'chi ti ha invitato';
    const calLocation = [program[0]?.place, program[0]?.address].filter(Boolean).join(', ');
    const showCountdown = d.showCountdown && start && start.getTime() > Date.now();
    const hasGifts = d.giftText || d.iban || d.giftLink;
    const hasDetails = showCountdown || d.message || program.length || d.dressCode || hasGifts || d.signature;
    const dp = dateParts(d.date);
    const h = [];
    h.push(`<div class="inv t-${th.id} ev-${ev.id}" data-mode="${mode}">`);
    if (withEnvelope) {
      h.push(`<div class="env-screen" id="envelope"><div class="env-intro">${
        guest ? `<p class="env-kicker">Un invito per</p><p class="env-guest">${esc(guest)}</p>` : '<p class="env-kicker">Hai ricevuto</p><p class="env-guest">un invito</p>'
      }</div><button class="env" type="button" id="env-open" aria-label="Apri l’invito"><span class="env-back"></span><span class="env-letter"><span class="env-letter-eyebrow">${esc(
        d.eyebrow || ev.label,
      )}</span><span class="env-letter-names">${esc(names)}</span><span class="env-letter-date">${esc(dateShort(d.date))}</span></span><span class="env-pocket"></span><span class="env-flap"><span class="face-out"></span><span class="face-in"></span></span><span class="env-seal">${mono(
        d,
      )}</span></button><p class="env-hint">Tocca la busta per aprirla</p></div>`);
    }
    h.push('<div class="page"><main class="card"><article class="sheet sheet-main">');
    if (orn.scatter) h.push(orn.scatter);
    h.push('<header class="hero sec">');
    if (orn.top) h.push(orn.top);
    h.push('<div class="hero-body">');
    if (orn.crest) h.push(`<div class="crest" aria-hidden="true"><span class="crest-mono">${mono(d)}</span></div>`);
    if (guest) h.push(`<p class="for-guest">Un invito speciale per <strong>${esc(guest)}</strong></p>`);
    if (cover) h.push(`<figure class="cover"><img src="${cover}" alt="Illustrazione: il mare al tramonto" width="480" height="600"></figure>`);
    if (d.eyebrow) h.push(`<p class="eyebrow">${esc(d.eyebrow)}</p>`);
    h.push(
      `<h1 class="names ${nsClass(d)}">${
        twoNames ? `<span class="n">${esc(d.name1)}</span><span class="amp">&amp;</span><span class="n">${esc(d.name2)}</span>` : `<span class="n">${esc(d.name1 || names)}</span>`
      }</h1>`,
    );
    if (d.subtitle) h.push(`<p class="subtitle">${esc(d.subtitle)}</p>`);
    h.push(orn.divider);
    if (dp) h.push(`<p class="date"><span class="d-wd">${esc(dp.weekday)}</span> <span class="d-day">${esc(dp.day)}</span> <span class="d-mo">${esc(dp.month)}</span> <span class="d-yr">${esc(dp.year)}</span></p>`);
    if (d.time) h.push(`<p class="time">ore ${esc(d.time)}</p>`);
    if (firstPlace) h.push(`<p class="place">${esc(firstPlace)}</p>`);
    h.push('</div></header></article>');
    if (hasDetails) {
      h.push('<article class="sheet sheet-details">');
      if (showCountdown) {
        h.push(
          `<section class="countdown sec" aria-label="Conto alla rovescia"><p class="kicker">Mancano</p><div class="cd" data-countdown="${start.toISOString()}">` +
            ['d:giorni', 'h:ore', 'm:minuti', 's:secondi'].map((u) => `<div><span data-u="${u[0]}">0</span><small>${u.slice(2)}</small></div>`).join('') +
            '</div></section>',
        );
      }
      if (d.message) h.push(`<section class="message sec"><p>${esc(d.message)}</p></section>`);
      if (program.length) {
        h.push('<section class="program sec"><h2 class="sec-title">Programma</h2><ol class="moments">');
        for (const m of program) {
          h.push(
            `<li class="moment">${m.time ? `<span class="m-time">${esc(m.time)}</span>` : ''}${m.title ? `<h3 class="m-title">${esc(m.title)}</h3>` : ''}${
              m.place ? `<p class="m-place">${esc(m.place)}</p>` : ''
            }${m.address ? `<p class="m-addr">${esc(m.address)}</p>` : ''}${
              m.place || m.address ? `<a class="btn btn-ghost btn-sm" href="${esc(mapsLink(m.place, m.address))}" target="_blank" rel="noopener">Indicazioni stradali</a>` : ''
            }</li>`,
          );
        }
        h.push('</ol></section>');
      }
      if (d.dressCode) h.push(`<section class="dress sec"><h2 class="sec-title">Dress code</h2><p>${esc(d.dressCode)}</p></section>`);
      if (hasGifts) {
        h.push(`<section class="gifts sec"><h2 class="sec-title">${state.ev === 'matrimonio' ? 'Lista nozze' : 'Regali'}</h2>`);
        if (d.giftText) h.push(`<p>${esc(d.giftText)}</p>`);
        if (d.iban)
          h.push(
            `<div class="iban-box"><p class="iban-label">IBAN${d.ibanHolder ? ` · intestato a ${esc(d.ibanHolder)}` : ''}</p><p class="iban">${esc(fmtIban(d.iban))}</p><button type="button" class="btn btn-ghost btn-sm" data-copy="${esc(
              d.iban,
            )}">Copia IBAN</button></div>`,
          );
        if (d.giftLink) h.push(`<a class="btn btn-ghost" href="${esc(d.giftLink)}" target="_blank" rel="noopener nofollow">Vai alla lista regali</a>`);
        h.push('</section>');
      }
      if (d.signature) h.push(`<section class="sign sec"><p class="signature">${esc(d.signature)}</p></section>`);
      if (orn.bottom) h.push(orn.bottom);
      h.push('</article>');
    }
    // Reply card
    h.push('<article class="sheet sheet-reply">');
    h.push(`<section class="rsvp sec" id="rsvp"><p class="kicker">R.S.V.P.</p><h2 class="sec-title">Conferma la tua presenza</h2>`);
    if (d.rsvpDeadline) h.push(`<p class="deadline">Ti chiediamo gentilmente di rispondere entro il <strong>${esc(dayMonth(d.rsvpDeadline))}</strong>.</p>`);
    h.push(`<form class="rsvp-form" id="rsvp-form" novalidate>
      <label class="field" for="r-name"><span>Nome e cognome</span><input id="r-name" name="name" maxlength="80" autocomplete="name" placeholder="Il tuo nome" value="${esc(guest)}"></label>
      <fieldset class="choice"><legend class="sr-only">Parteciperai?</legend>
        <label class="choice-opt"><input type="radio" id="r-yes" name="attending" value="yes"><span>Parteciperò con piacere</span></label>
        <label class="choice-opt"><input type="radio" id="r-no" name="attending" value="no"><span>Non potrò partecipare</span></label></fieldset>
      <div class="if-yes"><div class="steppers">${stepper('Adulti', 'adults', 1, 10)}${d.askChildren ? stepper('Bambini', 'children', 0, 10) : ''}</div>
      ${d.askDiet ? '<label class="field" for="r-diet"><span>Allergie, intolleranze o menu particolari</span><textarea id="r-diet" name="diet" rows="2" maxlength="300" placeholder="Es. 1 vegetariano, 1 senza glutine"></textarea></label>' : ''}
      ${d.customQuestion ? `<label class="field" for="r-answer"><span>${esc(d.customQuestion)}</span><input id="r-answer" name="answer" maxlength="200"></label>` : ''}</div>
      <label class="field" for="r-message"><span>${esc(ev.messageFor)} <em>(facoltativo)</em></span><textarea id="r-message" name="message" rows="3" maxlength="600"></textarea></label>
      <button class="btn btn-primary btn-block" type="submit">Invia la risposta</button>
      <p class="form-msg" role="status" aria-live="polite"></p></form>
      <div class="rsvp-done" id="rsvp-done" hidden>
        <div class="done-yes"><p class="done-emoji" aria-hidden="true">✦</p><h3>Grazie, a presto!</h3><p>Segna la data in calendario qui sotto.</p></div>
        <div class="done-no"><p class="done-emoji" aria-hidden="true">✦</p><h3>Grazie di cuore</h3><p>Ci dispiace che non potrai esserci.</p></div>
        <div class="handoff"><p class="handoff-note">Ultimo passo: manda la risposta a ${esc(who)}. Si apre WhatsApp con il messaggio già scritto.</p>
          <a class="btn btn-primary btn-block" id="send-wa" href="https://wa.me/" target="_blank" rel="noopener">Manda la risposta su WhatsApp</a>
          <button type="button" class="btn btn-ghost btn-block" id="copy-answer">Copia il testo della risposta</button>
          <pre class="answer-preview" id="answer-preview" hidden></pre></div>
        <button class="link-btn" type="button" id="rsvp-edit">Modifica la risposta</button>
      </div></section>`);
    h.push(
      `<section class="actions sec">${
        isYmd(d.date)
          ? `<a class="btn btn-ghost" href="${esc(gcalUrl(`${ev.label}: ${names}`, d, calLocation, d.eyebrow ? `${d.eyebrow} ${names}` : names))}" target="_blank" rel="noopener">Aggiungi al calendario</a>`
          : ''
      }${
        d.contactPhone
          ? `<a class="btn btn-ghost" href="${esc(waLink(`Ciao${d.contactName ? ' ' + d.contactName : ''}! Ti scrivo per l’invito ${eventPhrase(ev, d)}: `, d.contactPhone))}" target="_blank" rel="noopener">Scrivi ${
              d.contactName ? 'a ' + esc(d.contactName) : 'agli organizzatori'
            }</a>`
          : ''
      }</section></article>`,
    );
    h.push('</main></div>');
    h.push(
      mode === 'view'
        ? `<footer class="made-with"><span>Creato con <strong>Confetto</strong> · versione di prova</span><br><button type="button" class="s-link" data-act="start">Crea anche tu il tuo invito</button></footer>`
        : '<footer class="made-with"><span>Creato con <strong>Confetto</strong></span></footer>',
    );
    h.push('</div>');
    return h.join('');
  }

  // ---------------------------------------------------------------------------
  // Screens
  // ---------------------------------------------------------------------------
  const LOGO = `<svg viewBox="0 0 40 40" aria-hidden="true" class="s-logo-mark"><ellipse cx="20" cy="20.5" rx="9.5" ry="13" transform="rotate(-30 20 20.5)" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M14.6 13.4C16.4 11.2 19 10.2 21.4 10.6" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" transform="rotate(-30 20 20.5)"/></svg>`;
  const header = (right = '') =>
    `<header class="s-top"><div class="s-wrap s-top-in"><button type="button" class="s-logo" data-act="home" aria-label="Torna all’inizio">${LOGO}<span>Confetto</span></button><span class="s-badge">versione di prova</span><span class="s-top-right">${right}</span></div></header>`;

  function renderChoose() {
    const groups = DATA.groups
      .map(
        (g) => `<section class="s-group"><h2 class="s-group-title"><span>${esc(g.label)}</span></h2><div class="s-grid">${EVENTS.filter((e) => e.group === g.id)
          .map(
            (e) =>
              `<button type="button" class="s-occ" data-act="pick" data-ev="${e.id}"><span class="s-occ-icon">${e.icon}</span><span class="s-occ-label">${esc(e.label)}</span></button>`,
          )
          .join('')}</div></section>`,
      )
      .join('');
    const ai = state.sample
      ? `<section class="s-ai" id="ai-box"><p class="s-kicker">Su misura</p><h2 class="s-ai-title">Oppure raccontamelo con parole tue</h2>
          <label class="s-field" for="ai-text"><span class="s-label">Cosa vuoi festeggiare? Scrivi tutto quello che sai: chi, quando, dove.</span>
          <textarea id="ai-text" rows="3" maxlength="800" placeholder="Es. Festa a sorpresa per i 40 anni di Marco, sabato 14 marzo alle 21 al Bar Centrale di Bologna. Tema anni ’80."></textarea></label>
          <button type="button" class="s-btn s-btn-primary" data-act="ai">Prepara il mio invito</button><p class="s-ai-msg" id="ai-msg" role="status" aria-live="polite"></p></section>`
      : '';
    app.innerHTML = `${header()}<main class="s-wrap s-choose">
      <div class="s-hero">
        <p class="s-kicker">Inviti digitali · conferme di presenza</p>
        <h1 class="s-h1">Che cosa <em>festeggi?</em></h1>
        <p class="s-lead">Scegli l’occasione, oppure «Altro» e scrivi tu. Ti prepariamo un invito già compilato, su carta di cotone e oro a caldo: lo personalizzi, lo vedi dal vivo e lo mandi su WhatsApp.</p>
      </div>
      ${ai}${groups}
      <p class="s-note">Questa è una versione di prova di Confetto: è gratis e non serve registrarsi.</p></main>`;
  }

  function field(label, f, value, attrs = '') {
    return `<label class="s-field" for="f-${f}"><span class="s-label">${label}</span><input id="f-${f}" data-f="${f}" value="${esc(value)}" ${attrs}></label>`;
  }
  function area(label, f, value, attrs = '') {
    return `<label class="s-field" for="f-${f}"><span class="s-label">${label}</span><textarea id="f-${f}" data-f="${f}" ${attrs}>${esc(value)}</textarea></label>`;
  }
  function toggle(label, f, checked) {
    return `<label class="s-toggle" for="f-${f}"><input type="checkbox" id="f-${f}" data-f="${f}" ${checked ? 'checked' : ''}><span class="s-toggle-ui" aria-hidden="true"></span><span>${label}</span></label>`;
  }
  function programRows() {
    return state.data.program
      .map(
        (m, i) => `<div class="s-moment" data-i="${i}">
        <div class="s-row-time"><label class="s-field" for="p-${i}-time"><span class="s-label">Ora</span><input type="time" id="p-${i}-time" data-p="time" value="${esc(m.time)}"></label>
        <label class="s-field" for="p-${i}-title"><span class="s-label">Cosa</span><input id="p-${i}-title" data-p="title" maxlength="60" value="${esc(m.title)}" placeholder="Es. Cerimonia, Cena, Festa"></label></div>
        <label class="s-field" for="p-${i}-place"><span class="s-label">Luogo</span><input id="p-${i}-place" data-p="place" maxlength="90" value="${esc(m.place)}" placeholder="Es. Ristorante Il Giardino"></label>
        <label class="s-field" for="p-${i}-address"><span class="s-label">Indirizzo</span><input id="p-${i}-address" data-p="address" maxlength="140" value="${esc(m.address)}" placeholder="Via, numero, città"></label>
        <div class="s-moment-tools"><button type="button" class="s-icon" data-act="mv" data-dir="-1" aria-label="Sposta su">↑</button><button type="button" class="s-icon" data-act="mv" data-dir="1" aria-label="Sposta giù">↓</button><button type="button" class="s-del" data-act="rm">Rimuovi</button></div></div>`,
      )
      .join('');
  }

  function renderEditor() {
    const ev = EV[state.ev];
    const d = state.data;
    const themes = THEMES.map(
      (t) =>
        `<button type="button" class="s-theme${t.id === state.theme ? ' on' : ''}" data-act="theme" data-theme="${t.id}" aria-pressed="${t.id === state.theme}"><span class="s-theme-thumb" style="background:${t.swatches[0]}"><img src="${THUMBS[t.id]}" alt="" width="120" height="160"></span><span class="s-theme-name">${esc(t.name)}</span></button>`,
    ).join('');
    const who = state.ev === 'matrimonio' ? 'Gli sposi' : ev.couple ? 'La coppia' : ['festa', 'cena', 'natale', 'aziendale', 'altro', 'inaugurazione', 'genderreveal'].includes(state.ev) ? 'L’evento' : 'Chi festeggiamo';
    app.innerHTML = `${header('<button type="button" class="s-btn s-btn-primary s-btn-sm" data-act="make-link">Crea il link</button>')}
    <main class="s-wrap s-editor">
      <div class="s-form">
        <button type="button" class="s-back" data-act="choose">← Cambia occasione</button>
        <p class="s-kicker s-kicker-icon">${ev.icon}<span>${esc(ev.label)}</span></p>
        <h1 class="s-h2">Personalizza il tuo invito</h1>
        <p class="s-hint">Abbiamo scritto dei testi di esempio: cambiali con i tuoi. L’anteprima si aggiorna mentre scrivi.</p>
        <section class="s-card"><h2 class="s-card-title"><span class="s-num">I</span>Lo stile</h2><div class="s-themes">${themes}</div>
          <p class="s-label">Immagine di copertina</p>
          <div class="s-covers">
            <button type="button" class="s-chip${state.cover ? '' : ' on'}" data-act="cover" data-cover="">Nessuna</button>
            <button type="button" class="s-chip${state.cover === 'tramonto' ? ' on' : ''}" data-act="cover" data-cover="tramonto">Tramonto sul mare</button>
          </div><p class="s-hint s-hint-sm">Nel servizio completo carichi la tua foto.</p></section>
        <section class="s-card"><h2 class="s-card-title"><span class="s-num">II</span>${who}</h2>
          ${field('Riga sopra il nome', 'eyebrow', d.eyebrow, 'maxlength="60" placeholder="Es. Il matrimonio di"')}
          <div class="${ev.couple ? 's-row2' : ''}">${field(esc(ev.name1Label), 'name1', d.name1, 'maxlength="60"')}${ev.couple ? field(esc(ev.name2Label), 'name2', d.name2, 'maxlength="60"') : ''}</div>
          ${field('Sottotitolo (facoltativo)', 'subtitle', d.subtitle, 'maxlength="80" placeholder="Es. compie 30 anni"')}</section>
        <section class="s-card"><h2 class="s-card-title"><span class="s-num">III</span>Quando</h2>
          <div class="s-row2">${field('Data', 'date', d.date, 'type="date"')}${field('Ora', 'time', d.time, 'type="time"')}</div>
          ${toggle('Mostra il conto alla rovescia', 'showCountdown', d.showCountdown)}</section>
        <section class="s-card"><h2 class="s-card-title"><span class="s-num">IV</span>Programma e luoghi</h2>
          <p class="s-hint">Ogni tappa avrà il tasto «Indicazioni stradali» con la mappa.</p>
          <div id="program">${programRows()}</div>
          <button type="button" class="s-btn s-btn-ghost s-btn-sm" data-act="add" id="add-moment"${d.program.length >= 5 ? ' hidden' : ''}>+ Aggiungi una tappa</button></section>
        <section class="s-card"><h2 class="s-card-title"><span class="s-num">V</span>Il messaggio</h2>
          ${area('Testo dell’invito', 'message', d.message, 'rows="5" maxlength="1200"')}
          <button type="button" class="s-btn s-btn-ghost s-btn-sm" data-act="suggest">Suggeriscimi una frase</button>
          ${field('Firma in fondo (facoltativa)', 'signature', d.signature, 'maxlength="120" placeholder="Es. Con affetto, Anna e Marco"')}</section>
        <section class="s-card"><h2 class="s-card-title"><span class="s-num">VI</span>Dettagli</h2>
          ${field('Dress code (facoltativo)', 'dressCode', d.dressCode, 'maxlength="140" placeholder="Es. Elegante, colori pastello"')}
          ${area('Regali: testo (facoltativo)', 'giftText', d.giftText, 'rows="2" maxlength="400" placeholder="Es. La vostra presenza è il regalo più bello…"')}
          <div class="s-row2">${field('IBAN (facoltativo)', 'iban', d.iban, 'maxlength="42" autocomplete="off"')}${field('Intestato a', 'ibanHolder', d.ibanHolder, 'maxlength="80"')}</div>
          <p class="s-hint s-hint-sm" id="iban-hint" aria-live="polite"></p>
          ${field('Link alla lista regali (facoltativo)', 'giftLink', d.giftLink, 'maxlength="300" placeholder="https://…" inputmode="url"')}</section>
        <section class="s-card"><h2 class="s-card-title"><span class="s-num">VII</span>Conferme di presenza</h2>
          ${field('Chiedi di rispondere entro il', 'rsvpDeadline', d.rsvpDeadline, 'type="date"')}
          ${toggle('Chiedi quanti bambini', 'askChildren', d.askChildren)}
          ${toggle('Chiedi allergie e menu', 'askDiet', d.askDiet)}
          ${field('Una domanda in più (facoltativa)', 'customQuestion', d.customQuestion, 'maxlength="120" placeholder="Es. Ti serve il passaggio?"')}
          <div class="s-row2">${field('Il tuo nome', 'contactName', d.contactName, 'maxlength="40" placeholder="Es. Anna"')}${field('Il tuo WhatsApp', 'contactPhone', d.contactPhone, 'type="tel" maxlength="24" placeholder="333 123 4567" inputmode="tel"')}</div>
          <p class="s-hint s-hint-sm">Gli invitati ti manderanno la risposta su questo numero. Nel servizio completo le risposte arrivano da sole in una lista.</p></section>
        <button type="button" class="s-btn s-btn-primary s-btn-lg s-btn-block" data-act="make-link">Crea il link dell’invito</button>
      </div>
      <aside class="s-preview" id="preview-pane" aria-label="Anteprima">
        <div class="s-preview-head"><span class="s-live">Anteprima dal vivo</span><button type="button" class="s-link" data-act="replay">Rivedi la busta</button><button type="button" class="s-link s-close" data-act="close-preview">Chiudi</button></div>
        <div class="s-phone"><div class="s-screen" id="screen"></div></div>
      </aside>
    </main>
    <div class="s-bar"><button type="button" class="s-btn s-btn-ghost" data-act="open-preview">Anteprima</button><button type="button" class="s-btn s-btn-primary" data-act="make-link">Crea il link</button></div>`;
    checkIban();
    renderPreview();
  }

  let previewTimer;
  function schedulePreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(renderPreview, 120);
  }
  function renderPreview() {
    const screen = document.getElementById('screen');
    if (!screen) return;
    const top = screen.scrollTop;
    screen.innerHTML = renderInvite('preview', state.previewEnvelope);
    screen.classList.toggle('has-envelope', state.previewEnvelope);
    if (!state.previewEnvelope) screen.scrollTop = top;
    tickCountdowns();
  }

  function renderShare(link) {
    const ev = EV[state.ev];
    const d = state.data;
    const text = `Ciao! Ti invito ${eventPhrase(ev, d)}, ${dateLong(d.date)}. Apri l’invito e fammi sapere se ci sarai: ${link}`;
    app.innerHTML = `${header()}<main class="s-wrap s-share">
      <div class="s-share-card">
        <div class="t-${state.theme} s-seal-wrap"><span class="s-seal">${mono(d)}</span></div>
        <p class="s-kicker">Tutto pronto</p>
        <h1 class="s-h2">Il tuo invito è <em>pronto</em></h1>
        <p class="s-lead">Questo è il link da mandare: dentro c’è tutto l’invito. Chi lo apre vede la busta, l’invito e può confermare.</p>
        <div class="s-copy"><input id="share-link" readonly value="${esc(link)}" aria-label="Link dell’invito"><button type="button" class="s-btn s-btn-ghost s-btn-sm" data-act="copy" data-target="share-link">Copia</button></div>
        <div class="s-actions"><a class="s-btn s-btn-wa" href="${esc(waLink(text))}" target="_blank" rel="noopener">Manda su WhatsApp</a>
        <button type="button" class="s-btn s-btn-ghost" data-act="view">Guardalo come un invitato</button></div>
        <div class="s-personal"><h2 class="s-card-title">Link con il nome dell’invitato</h2>
          <p class="s-hint">Scrivi un nome: la busta dirà «Un invito per…» e il modulo sarà già compilato.</p>
          <label class="s-field" for="guest-name"><span class="s-label">Nome dell’invitato</span><input id="guest-name" maxlength="40" placeholder="Es. Zia Carla e Zio Paolo"></label>
          <div class="s-copy"><input id="guest-link" readonly value="${esc(link)}" aria-label="Link personale"><button type="button" class="s-btn s-btn-ghost s-btn-sm" data-act="copy" data-target="guest-link">Copia</button></div>
          <a class="s-btn s-btn-wa s-btn-sm" id="guest-wa" href="${esc(waLink(text))}" target="_blank" rel="noopener">Manda su WhatsApp</a></div>
        <button type="button" class="s-back" data-act="edit">← Continua a modificare</button>
      </div>
      <p class="s-note">Nel servizio completo questo invito avrebbe un indirizzo tutto tuo, la lista degli invitati e le risposte raccolte in automatico.</p></main>`;
    const input = document.getElementById('guest-name');
    input.addEventListener('input', () => {
      const name = input.value.trim();
      const l = linkFor(name);
      document.getElementById('guest-link').value = l;
      const t = name ? `Ciao ${name}! Ti invito ${eventPhrase(ev, d)}, ${dateLong(d.date)}. Apri l’invito e fammi sapere se ci sarai: ${l}` : text;
      document.getElementById('guest-wa').href = waLink(t);
    });
  }

  function renderView() {
    app.innerHTML =
      renderInvite('view', true) +
      (state.fromLink ? '' : '<button type="button" class="s-floating" data-act="edit">← Torna a modificare</button>');
    document.body.classList.add('has-envelope');
    tickCountdowns();
    window.scrollTo(0, 0);
  }

  function go(step, extra) {
    state.step = step;
    document.body.classList.remove('has-envelope');
    document.body.classList.toggle('s-mode-view', step === 'view');
    if (step === 'choose') renderChoose();
    if (step === 'edit') {
      state.previewEnvelope = false;
      renderEditor();
    }
    if (step === 'share') renderShare(extra);
    if (step === 'view') renderView();
    if (step !== 'view') window.scrollTo(0, 0);
  }

  // ---------------------------------------------------------------------------
  // Editor behaviour
  // ---------------------------------------------------------------------------
  function checkIban() {
    const hint = document.getElementById('iban-hint');
    if (!hint) return;
    const v = state.data.iban.replace(/\s+/g, '').toUpperCase();
    if (!v) {
      hint.textContent = '';
      return;
    }
    const ok = validIban(v);
    hint.textContent = ok ? 'IBAN corretto' : 'Controlla l’IBAN: sembra esserci un errore di battitura';
    hint.className = `s-hint s-hint-sm ${ok ? 's-good' : 's-bad'}`;
  }

  function onEditorInput(e) {
    const t = e.target;
    if (t.dataset.f) {
      const f = t.dataset.f;
      if (t.type === 'checkbox') state.data[f] = t.checked;
      else if (f === 'iban') {
        state.data.iban = t.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 34);
        checkIban();
      } else if (f === 'giftLink') {
        const v = t.value.trim();
        state.data.giftLink = !v || /^https?:\/\//i.test(v) ? v : /^[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(v) ? `https://${v}` : '';
      } else state.data[f] = t.value;
      schedulePreview();
      return;
    }
    if (t.dataset.p) {
      const row = t.closest('[data-i]');
      state.data.program[Number(row.dataset.i)][t.dataset.p] = t.value;
      schedulePreview();
    }
  }

  function rerenderProgram() {
    document.getElementById('program').innerHTML = programRows();
    document.getElementById('add-moment').hidden = state.data.program.length >= 5;
    schedulePreview();
  }

  async function makeLink() {
    const d = state.data;
    if (!d.name1.trim()) {
      toast('Scrivi almeno il nome o il titolo dell’evento');
      document.getElementById('f-name1')?.focus();
      return;
    }
    if (!isYmd(d.date)) {
      toast('Scegli la data');
      document.getElementById('f-date')?.focus();
      return;
    }
    state.payload = await encodePayload(pack());
    go('share', linkFor(''));
  }

  // ---------------------------------------------------------------------------
  // RSVP (answers go back to the organiser by WhatsApp in this demo)
  // ---------------------------------------------------------------------------
  let answer = null;
  function answerText() {
    if (!answer) return '';
    const ev = EV[state.ev];
    const d = state.data;
    const lines = [`Ciao${d.contactName ? ' ' + d.contactName : ''}! Rispondo all’invito ${eventPhrase(ev, d)}.`];
    if (answer.yes) {
      const parts = [`${answer.adults} ${answer.adults === 1 ? 'adulto' : 'adulti'}`];
      if (answer.children) parts.push(`${answer.children} ${answer.children === 1 ? 'bambino' : 'bambini'}`);
      lines.push(`✅ Parteciperò con piacere (${parts.join(', ')})`);
      if (answer.diet) lines.push(`Allergie e menu: ${answer.diet}`);
      if (answer.extra) lines.push(`${d.customQuestion} ${answer.extra}`);
    } else {
      lines.push('❌ Purtroppo non potrò partecipare');
    }
    if (answer.message) lines.push(`Messaggio: ${answer.message}`);
    lines.push(`— ${answer.name}`);
    return lines.join('\n');
  }

  function onRsvpSubmit(form) {
    const msg = form.querySelector('.form-msg');
    msg.textContent = '';
    msg.classList.remove('err');
    const fail = (t) => {
      msg.textContent = t;
      msg.classList.add('err');
    };
    const mode = form.closest('.inv').dataset.mode;
    if (mode === 'preview') return toast('Questa è l’anteprima: il modulo funziona quando apri il link');
    const fd = new FormData(form);
    const name = String(fd.get('name') || '').trim();
    const attending = fd.get('attending');
    if (!name) return fail('Scrivi il tuo nome, così sappiamo chi sei');
    if (!attending) return fail('Dicci se ci sarai: scegli «Parteciperò con piacere» oppure «Non potrò partecipare»');
    const yes = attending === 'yes';
    const adults = yes ? Number(fd.get('adults')) || 0 : 0;
    const children = yes ? Number(fd.get('children')) || 0 : 0;
    if (yes && adults + children < 1) return fail('Indica quante persone verranno');
    answer = {
      name,
      yes,
      adults,
      children,
      diet: yes ? String(fd.get('diet') || '').trim() : '',
      extra: yes ? String(fd.get('answer') || '').trim() : '',
      message: String(fd.get('message') || '').trim(),
    };
    const done = document.getElementById('rsvp-done');
    document.getElementById('send-wa').href = waLink(answerText(), state.data.contactPhone);
    form.hidden = true;
    done.hidden = false;
    done.classList.toggle('no', !yes);
    if (yes) confetti();
    done.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

  // ---------------------------------------------------------------------------
  // AI helper (only when this viewer can ask Claude)
  // ---------------------------------------------------------------------------
  async function runAi() {
    const box = document.getElementById('ai-box');
    const text = document.getElementById('ai-text').value.trim();
    const out = document.getElementById('ai-msg');
    const btn = box.querySelector('[data-act="ai"]');
    if (text.length < 8) {
      out.textContent = 'Scrivi qualche parola in più: cosa festeggi, quando e dove.';
      return;
    }
    btn.disabled = true;
    out.textContent = 'Sto preparando il tuo invito…';
    const prompt = `Sei l'assistente di Confetto, un servizio italiano di inviti digitali. Dalla descrizione dell'utente prepara i testi di un invito in italiano.
Rispondi solo con un oggetto JSON con queste chiavi:
{"event": uno tra ${JSON.stringify(EVENTS.map((e) => e.id))},
 "theme": uno tra ${JSON.stringify(THEMES.map((t) => t.id))} (ulivo=rami d'ulivo, elegante e naturale; avorio=classico avorio e oro; limoni=estate italiana, Amalfi; notte=sera elegante blu e oro; alloro=laurea; cielo=bambini, azzurro; cipria=rosa delicato con rose; spiga=comunione e cresima; coriandoli=festa elegante nero e oro),
 "eyebrow": "riga breve sopra il nome, es. Il matrimonio di / Festa per i 40 anni di",
 "name1": "nome del festeggiato o titolo dell'evento", "name2": "secondo nome solo per una coppia, altrimenti stringa vuota",
 "subtitle": "breve sottotitolo o stringa vuota", "date": "YYYY-MM-DD o stringa vuota", "time": "HH:MM o stringa vuota",
 "program": [{"time": "HH:MM", "title": "es. Cena", "place": "nome del luogo", "address": "indirizzo se indicato, altrimenti la città"}],
 "message": "due frasi calde e naturali per invitare", "dressCode": "stringa o vuota", "signature": "firma breve"}
Oggi è ${todayRome()}: le date senza anno sono le prossime. Non inventare indirizzi precisi che l'utente non ha scritto.
Descrizione dell'utente: """${text.slice(0, 800)}"""`;
    try {
      const r = await state.sample.json(prompt, { modelTier: 'quick' });
      const evId = EV[r?.event] ? r.event : 'altro';
      state.ev = evId;
      state.theme = TH[r?.theme] ? r.theme : EV[evId].theme;
      state.cover = '';
      state.guest = '';
      const d = defaultsFor(evId);
      const take = (k, max) => {
        const v = str(r?.[k], max);
        if (v) d[k] = v;
      };
      take('eyebrow', 60);
      take('name1', 60);
      d.name2 = EV[evId].couple ? str(r?.name2, 60) : '';
      d.subtitle = str(r?.subtitle, 80);
      take('message', 1200);
      d.dressCode = str(r?.dressCode, 140);
      take('signature', 120);
      if (isYmd(r?.date)) {
        d.date = r.date;
        d.rsvpDeadline = addDays(r.date, evId === 'matrimonio' ? -45 : -10);
      }
      if (isHm(r?.time)) d.time = r.time;
      if (Array.isArray(r?.program) && r.program.length)
        d.program = r.program.slice(0, 5).map((p) => ({ time: isHm(p?.time) ? p.time : '', title: str(p?.title, 60), place: str(p?.place, 90), address: str(p?.address, 140) }));
      state.data = d;
      go('edit');
      toast('Ecco la tua bozza: controlla e completa i dettagli');
    } catch (e) {
      btn.disabled = false;
      const code = e?.code;
      if (code === 'not_granted' || code === 'sampling_disabled' || code === 'session_expired' || code === 'not_declared' || code === 'capability_disabled') {
        state.sample = null;
        box.remove();
        toast('Questa funzione non è disponibile qui: scegli l’occasione qui sotto');
      } else if (code === 'rate_limited') out.textContent = 'Troppe richieste in poco tempo: riprova tra qualche minuto.';
      else if (code === 'invalid_json' || code === 'refused' || code === 'empty_completion') out.textContent = 'Non sono riuscito a capire: prova a riscriverlo con più dettagli.';
      else if (code === 'cancelled') out.textContent = '';
      else out.textContent = 'Qualcosa non ha funzionato. Riprova tra poco.';
    }
  }

  // ---------------------------------------------------------------------------
  // Envelope, countdown and global events
  // ---------------------------------------------------------------------------
  function openEnvelope(btn) {
    const screen = btn.closest('.env-screen');
    if (!screen || screen.dataset.opening) return;
    screen.dataset.opening = '1';
    const container = screen.closest('.s-screen');
    const finish = () => {
      screen.classList.add('gone');
      document.body.classList.remove('has-envelope');
      container?.classList.remove('has-envelope');
      if (container) state.previewEnvelope = false;
      confetti();
      setTimeout(() => screen.remove(), 900);
    };
    if (reduce) return finish();
    screen.classList.add('s1');
    setTimeout(() => screen.classList.add('s2'), 380);
    setTimeout(() => screen.classList.add('s3'), 1150);
    setTimeout(finish, 2350);
  }

  function tickCountdowns() {
    document.querySelectorAll('[data-countdown]').forEach((cd) => {
      let diff = Math.max(0, Date.parse(cd.dataset.countdown) - Date.now());
      const dd = Math.floor(diff / 864e5);
      diff -= dd * 864e5;
      const hh = Math.floor(diff / 36e5);
      diff -= hh * 36e5;
      const mm = Math.floor(diff / 6e4);
      const ss = Math.floor((diff - mm * 6e4) / 1e3);
      const set = (k, v) => {
        const el = cd.querySelector(`[data-u="${k}"]`);
        if (el) el.textContent = v;
      };
      set('d', dd);
      set('h', hh);
      set('m', mm);
      set('s', ss);
    });
  }
  setInterval(tickCountdowns, 1000);

  document.addEventListener('input', (e) => {
    if (state.step === 'edit' && e.target.closest('.s-form')) onEditorInput(e);
  });
  document.addEventListener('change', (e) => {
    const f = e.target.closest('#rsvp-form');
    if (f && e.target.name === 'attending') f.classList.toggle('is-no', e.target.value === 'no');
  });
  document.addEventListener('submit', (e) => {
    if (e.target.id === 'rsvp-form') {
      e.preventDefault();
      onRsvpSubmit(e.target);
    }
  });

  document.addEventListener('click', async (e) => {
    const env = e.target.closest('#env-open');
    if (env) return openEnvelope(env);
    const stepBtn = e.target.closest('[data-step]');
    if (stepBtn) {
      const input = stepBtn.parentElement.querySelector('input');
      input.value = Math.max(Number(input.min || 0), Math.min(Number(input.max || 10), (parseInt(input.value, 10) || 0) + Number(stepBtn.dataset.step)));
      return;
    }
    const copyBtn = e.target.closest('[data-copy]');
    if (copyBtn) {
      const ok = await copyText(copyBtn.dataset.copy, copyBtn.closest('.iban-box')?.querySelector('.iban'));
      return toast(ok ? 'IBAN copiato' : 'IBAN selezionato: copialo dal menu');
    }
    if (e.target.closest('#rsvp-edit')) {
      document.getElementById('rsvp-done').hidden = true;
      document.getElementById('rsvp-form').hidden = false;
      return;
    }
    if (e.target.closest('#copy-answer')) {
      const pre = document.getElementById('answer-preview');
      pre.textContent = answerText();
      pre.hidden = false;
      const ok = await copyText(answerText(), pre);
      return toast(ok ? 'Testo copiato: incollalo dove vuoi' : 'Testo selezionato: copialo dal menu');
    }
    const act = e.target.closest('[data-act]');
    if (!act) return;
    const a = act.dataset.act;
    if (a === 'home' || a === 'start' || a === 'choose') {
      state.fromLink = false;
      return go('choose');
    }
    if (a === 'pick') return startEditing(act.dataset.ev);
    if (a === 'ai') return runAi();
    if (a === 'theme') {
      state.theme = act.dataset.theme;
      document.querySelectorAll('.s-theme').forEach((b) => {
        b.classList.toggle('on', b === act);
        b.setAttribute('aria-pressed', String(b === act));
      });
      return renderPreview();
    }
    if (a === 'cover') {
      state.cover = act.dataset.cover;
      document.querySelectorAll('[data-act="cover"]').forEach((b) => b.classList.toggle('on', b === act));
      return renderPreview();
    }
    if (a === 'add') {
      if (state.data.program.length >= 5) return;
      state.data.program.push({ time: '', title: '', place: '', address: '' });
      rerenderProgram();
      document.getElementById(`p-${state.data.program.length - 1}-title`)?.focus();
      return;
    }
    if (a === 'rm' || a === 'mv') {
      const i = Number(act.closest('[data-i]').dataset.i);
      const p = state.data.program;
      if (a === 'rm') p.splice(i, 1);
      else {
        const j = i + Number(act.dataset.dir);
        if (j < 0 || j >= p.length) return;
        [p[i], p[j]] = [p[j], p[i]];
      }
      return rerenderProgram();
    }
    if (a === 'suggest') {
      const ev = EV[state.ev];
      const fill = (ph) => ph.replaceAll('{nome}', state.data.name1.trim());
      const i = ev.phrases.findIndex((ph) => fill(ph) === state.data.message);
      state.data.message = fill(ev.phrases[(i + 1) % ev.phrases.length]);
      document.getElementById('f-message').value = state.data.message;
      return renderPreview();
    }
    if (a === 'replay') {
      state.previewEnvelope = true;
      const screen = document.getElementById('screen');
      screen.scrollTop = 0;
      return renderPreview();
    }
    if (a === 'open-preview') {
      document.getElementById('preview-pane').classList.add('open');
      document.body.classList.add('s-lock');
      return renderPreview();
    }
    if (a === 'close-preview') {
      document.getElementById('preview-pane').classList.remove('open');
      document.body.classList.remove('s-lock');
      return;
    }
    if (a === 'make-link') {
      document.body.classList.remove('s-lock');
      return makeLink();
    }
    if (a === 'copy') {
      const input = document.getElementById(act.dataset.target);
      const ok = await copyText(input.value, input);
      return toast(ok ? 'Link copiato' : 'Link selezionato: copialo dal menu');
    }
    if (a === 'view') {
      state.fromLink = false;
      state.guest = (document.getElementById('guest-name')?.value || '').trim();
      return go('view');
    }
    if (a === 'edit') {
      state.guest = '';
      return go('edit');
    }
  });

  // ---------------------------------------------------------------------------
  // Boot: a link with an invitation opens it, otherwise the creator
  // ---------------------------------------------------------------------------
  async function boot() {
    const hash = window.location.hash.slice(1);
    if (/^[zj][A-Za-z0-9_-]{20,}/.test(hash)) {
      try {
        const [payload, name] = hash.split('~');
        const st = unpack(await decodePayload(payload));
        if (st) {
          Object.assign(state, st, { payload, guest: name ? decodeName(name) : '', fromLink: true });
          return go('view');
        }
      } catch {
        toast('Questo link non contiene un invito valido: creane uno nuovo');
      }
    }
    go('choose');
  }
  boot();

  (async () => {
    try {
      const sample = await window.claude?.use?.('sample');
      if (sample) {
        state.sample = sample;
        if (state.step === 'choose') renderChoose();
      }
    } catch {
      /* not available in this view */
    }
  })();
})();
