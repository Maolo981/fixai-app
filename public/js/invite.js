// Confetto — invitation page behaviour (envelope, countdown, RSVP, copy, confetti).
(() => {
  const body = document.body;
  const mode = body.dataset.mode;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel, root = document) => root.querySelector(sel);

  // ---------- toast ----------
  const toastEl = $('#toast');
  let toastTimer;
  function toast(text) {
    if (!toastEl) return;
    toastEl.textContent = text;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3400);
  }

  // ---------- confetti ----------
  function confetti(count = 90) {
    if (reduce) return;
    // theme palette: gold leaf, paper and ink (see --confetti in invite.css)
    const colors = getComputedStyle(body)
      .getPropertyValue('--confetti')
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    if (!colors.length) colors.push('#c9a65f', '#ead9a0', '#ffffff');
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
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
    body.appendChild(frag);
    setTimeout(() => document.querySelectorAll('.confetti-piece').forEach((e) => e.remove()), 6500);
  }

  // ---------- envelope ----------
  const screen = $('#envelope');
  if (screen) {
    let opening = false;
    const finish = () => {
      screen.classList.add('gone');
      body.classList.remove('has-envelope');
      confetti();
      setTimeout(() => screen.remove(), 900);
    };
    $('#env-open').addEventListener('click', () => {
      if (opening) return;
      opening = true;
      if (reduce) return finish();
      screen.classList.add('s1');
      setTimeout(() => screen.classList.add('s2'), 380);
      setTimeout(() => screen.classList.add('s3'), 1150);
      setTimeout(finish, 2350);
    });
  }

  // ---------- reveal sections on scroll ----------
  if ('IntersectionObserver' in window && !reduce && mode !== 'preview') {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add('in');
            io.unobserve(en.target);
          }
        }),
      { rootMargin: '0px 0px -6% 0px' },
    );
    document.querySelectorAll('.card .sheet:not(.sheet-main) .sec').forEach((s) => {
      s.classList.add('reveal');
      io.observe(s);
    });
  }

  // ---------- countdown ----------
  const cd = $('[data-countdown]');
  if (cd) {
    const target = Date.parse(cd.dataset.countdown);
    const u = (k) => cd.querySelector(`[data-u="${k}"]`);
    const els = { d: u('d'), h: u('h'), m: u('m'), s: u('s') };
    const tick = () => {
      let diff = Math.max(0, target - Date.now());
      const d = Math.floor(diff / 864e5);
      diff -= d * 864e5;
      const h = Math.floor(diff / 36e5);
      diff -= h * 36e5;
      const m = Math.floor(diff / 6e4);
      const s = Math.floor((diff - m * 6e4) / 1e3);
      els.d.textContent = d;
      els.h.textContent = h;
      els.m.textContent = m;
      els.s.textContent = s;
    };
    tick();
    setInterval(tick, 1000);
  }

  // ---------- copy (IBAN) ----------
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-copy]');
    if (!btn) return;
    const text = btn.dataset.copy;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    toast('IBAN copiato ✓');
  });

  // ---------- views beacon ----------
  const beacon = body.dataset.beacon;
  if (beacon && navigator.sendBeacon) {
    const key = `seen:${beacon}:${body.dataset.guest || ''}`;
    try {
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        navigator.sendBeacon(beacon, new Blob([JSON.stringify({ code: body.dataset.guest || '' })], { type: 'application/json' }));
      }
    } catch {
      /* private mode: skip */
    }
  }

  // ---------- RSVP ----------
  const form = $('#rsvp-form');
  if (!form) return;
  const done = $('#rsvp-done');
  const msg = $('.form-msg', form);
  const storeKey = form.dataset.key;
  const guestCode = body.dataset.guest;
  const seatsEl = $('[data-seats]', form);
  const maxSeats = seatsEl ? Number(seatsEl.dataset.seats) : 0;
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(storeKey) || 'null');
  } catch {
    saved = null;
  }

  const setAttending = () => {
    const v = $('input[name="attending"]:checked', form)?.value;
    form.classList.toggle('is-no', v === 'no');
  };
  const clampSeats = (changed) => {
    if (!maxSeats) return;
    const a = $('input[name="adults"]', form);
    const c = $('input[name="children"]', form);
    const total = (Number(a?.value) || 0) + (Number(c?.value) || 0);
    if (total > maxSeats && changed) {
      changed.value = Math.max(0, Number(changed.value) - (total - maxSeats));
      toast(`Abbiamo riservato ${maxSeats} ${maxSeats === 1 ? 'posto' : 'posti'} per voi`);
    }
  };
  form.addEventListener('change', (e) => {
    if (e.target.name === 'attending') setAttending();
    if (e.target.name === 'adults' || e.target.name === 'children') clampSeats(e.target);
  });
  form.addEventListener('click', (e) => {
    const b = e.target.closest('[data-step]');
    if (!b) return;
    const input = b.parentElement.querySelector('input');
    const next = (parseInt(input.value, 10) || 0) + Number(b.dataset.step);
    input.value = Math.max(Number(input.min || 0), Math.min(Number(input.max || 99), next));
    clampSeats(input);
  });
  setAttending();

  const showDone = (yes, scroll) => {
    form.hidden = true;
    done.hidden = false;
    done.classList.toggle('no', !yes);
    $('#rsvp-already')?.remove();
    if (scroll) done.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  };
  $('#rsvp-edit').addEventListener('click', () => {
    done.hidden = true;
    form.hidden = false;
    form.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  });

  // Returning visitor on the shared link: restore their answer.
  if (saved && !guestCode && form.dataset.mode === 'live') {
    form.name.value = saved.name || '';
    const radio = $(`input[name="attending"][value="${saved.attending}"]`, form);
    if (radio) radio.checked = true;
    for (const k of ['adults', 'children', 'diet', 'answer', 'message']) if (form[k] && saved[k] != null) form[k].value = saved[k];
    setAttending();
    showDone(saved.attending === 'yes', false);
  }

  const fail = (text) => {
    msg.textContent = text;
    msg.classList.add('err');
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';
    msg.classList.remove('err');
    const fd = new FormData(form);
    const attending = fd.get('attending');
    const payload = {
      name: String(fd.get('name') || '').trim(),
      attending,
      adults: Number(fd.get('adults')) || 0,
      children: Number(fd.get('children')) || 0,
      diet: String(fd.get('diet') || ''),
      answer: String(fd.get('answer') || ''),
      message: String(fd.get('message') || ''),
      website: String(fd.get('website') || ''),
      guestCode: String(fd.get('guestCode') || ''),
      id: saved?.id || '',
      editToken: saved?.editToken || '',
    };
    if (!payload.name) return fail('Scrivi il tuo nome, così sappiamo chi sei');
    if (!attending) return fail('Dicci se ci sarai: scegli «Parteciperò con piacere» oppure «Non potrò partecipare»');
    if (attending === 'yes' && payload.adults + payload.children < 1) return fail('Indica quante persone verranno');
    if (form.dataset.mode === 'preview') return toast('Anteprima: le risposte vere arriveranno quando l’invito sarà pubblicato');
    if (form.dataset.mode === 'demo') {
      showDone(attending === 'yes', true);
      if (attending === 'yes') confetti();
      return toast('Questo è un esempio: nessuna risposta è stata salvata');
    }
    const btn = $('[type="submit"]', form);
    btn.disabled = true;
    btn.textContent = 'Invio in corso…';
    try {
      const res = await fetch(form.dataset.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Non siamo riusciti a inviare la risposta. Riprova tra poco.');
      saved = { ...payload, id: data.id, editToken: data.editToken };
      delete saved.website;
      try {
        localStorage.setItem(storeKey, JSON.stringify(saved));
      } catch {
        /* ignore */
      }
      showDone(attending === 'yes', true);
      if (attending === 'yes') confetti();
    } catch (err) {
      fail(err.message || 'Errore di connessione. Riprova.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Invia la risposta';
    }
  });
})();
