// Confetto — invitation page behaviour (envelope, countdown, RSVP, copy, confetti).
(() => {
  const body = document.body;
  const mode = body.dataset.mode;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const load = (k, fallback) => {
    try {
      return JSON.parse(localStorage.getItem(k) || 'null') ?? fallback;
    } catch {
      return fallback;
    }
  };
  const store = (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      /* private mode */
    }
  };
  const postJson = async (url, data) => {
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
    const out = await res.json().catch(() => ({}));
    if (!res.ok || !out.ok) throw new Error(out.error || 'Qualcosa non ha funzionato. Riprova tra poco.');
    return out;
  };
  const slug = body.dataset.slug || '';
  /** Name to prefill: the guest of a personal link, or whoever already answered from this phone. */
  const knownName = () => body.dataset.guestName || load(`confetto:${slug}`, null)?.name || '';

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

  // ---------- weather (forecast in the days before the event) ----------
  const weatherSec = $('[data-weather]');
  const WEATHER_ICONS = {
    sun: '<circle cx="16" cy="16" r="6"/><path d="M16 3v4M16 25v4M3 16h4M25 16h4M6.8 6.8l2.8 2.8M22.4 22.4l2.8 2.8M6.8 25.2l2.8-2.8M22.4 9.6l2.8-2.8"/>',
    partly: '<circle cx="12" cy="12" r="5"/><path d="M12 3v2.4M3 12h2.4M5.6 5.6l1.7 1.7M18.4 5.6l-1.7 1.7"/><path d="M11 26h13a5 5 0 0 0 0-10 7 7 0 0 0-13 2 4 4 0 0 0 0 8Z"/>',
    cloud: '<path d="M9 25h15a6 6 0 0 0 0-12 8 8 0 0 0-15 2.5A4.8 4.8 0 0 0 9 25Z"/>',
    rain: '<path d="M9 20h15a6 6 0 0 0 0-12 8 8 0 0 0-15 2.5A4.8 4.8 0 0 0 9 20Z"/><path d="M11 24l-1.5 4M17 24l-1.5 4M23 24l-1.5 4"/>',
    storm: '<path d="M9 19h15a6 6 0 0 0 0-12 8 8 0 0 0-15 2.5A4.8 4.8 0 0 0 9 19Z"/><path d="M17 20l-3 5h4l-3 5"/>',
    snow: '<path d="M9 19h15a6 6 0 0 0 0-12 8 8 0 0 0-15 2.5A4.8 4.8 0 0 0 9 19Z"/><path d="M11 24v4M9 26h4M21 24v4M19 26h4"/>',
    fog: '<path d="M5 12h22M3 17h26M6 22h20M9 27h14"/>',
  };
  if (weatherSec) {
    fetch(weatherSec.dataset.weather)
      .then((r) => r.json())
      .then((w) => {
        if (!w || !w.ok) return;
        const icon = WEATHER_ICONS[w.icon] || WEATHER_ICONS.cloud;
        $('.weather', weatherSec).innerHTML =
          `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icon}</svg>` +
          `<p><strong>${esc(w.title)}</strong>${esc(w.text)}</p>`;
        weatherSec.hidden = false;
      })
      .catch(() => {});
  }

  // ---------- photo gallery ----------
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-full]');
    if (!b) return;
    const box = document.createElement('div');
    box.className = 'lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Foto');
    box.innerHTML = `<img src="${esc(b.dataset.full)}" alt="">`;
    const close = () => {
      box.remove();
      document.removeEventListener('keydown', onKey);
    };
    const onKey = (ev) => ev.key === 'Escape' && close();
    box.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    body.appendChild(box);
  });

  // ---------- gift registry ----------
  const registry = $('[data-registry]');
  if (registry) {
    const key = `confetto:${slug}:gifts`;
    const mine = load(key, {});
    const claimsOf = (li) => (li.dataset.claims || '').split(',').filter(Boolean);
    const paint = (li) => {
      const own = claimsOf(li).filter((id) => mine[id]);
      const state = $('[data-gift-state]', li);
      li.classList.toggle('mine', own.length > 0);
      if (own.length) {
        state.textContent = li.dataset.kind === 'fund' ? 'Hai partecipato ✓ ' : 'L’hai scelto tu ✓ ';
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'link-btn';
        b.textContent = 'Annulla';
        b.dataset.giftCancel = own[own.length - 1];
        state.appendChild(b);
      } else if (li.dataset.kind === 'item') {
        state.textContent = li.classList.contains('taken') ? 'Già scelto da un invitato' : '';
      } else state.textContent = '';
    };
    const setFund = (li, sum, count) => {
      const target = Number(li.dataset.target || 0);
      const bar = $('.fund-bar span', li);
      if (bar && target) bar.style.width = `${Math.min(100, Math.round((sum / (target * 100)) * 100))}%`;
      $('.fund-sum', li).textContent = count ? `Raccolti ${(sum / 100).toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })} da ${count} ${count === 1 ? 'persona' : 'persone'}` : 'Ancora nessuna quota: inizia tu!';
    };
    registry.querySelectorAll('[data-gift]').forEach(paint);
    registry.addEventListener('click', async (e) => {
      const li = e.target.closest('[data-gift]');
      if (!li) return;
      const form = $('[data-gift-form]', li);
      if (e.target.closest('[data-gift-open]')) {
        if (mode === 'preview' || mode === 'demo') return toast(mode === 'demo' ? 'Questo è un esempio: nel tuo invito gli ospiti prenotano qui il regalo' : 'Anteprima: la prenotazione funziona sull’invito pubblicato');
        form.hidden = false;
        if (!form.name.value) form.name.value = knownName();
        (form.name.value ? form.amount || form.name : form.name).focus();
        return;
      }
      if (e.target.closest('[data-gift-close]')) {
        form.hidden = true;
        return;
      }
      const cancel = e.target.closest('[data-gift-cancel]');
      if (cancel) {
        const id = cancel.dataset.giftCancel;
        try {
          const out = await postJson(`${registry.dataset.endpoint}/annulla`, { id, token: mine[id]?.token });
          delete mine[id];
          store(key, mine);
          li.dataset.claims = claimsOf(li).filter((x) => x !== id).join(',');
          if (li.dataset.kind === 'item') {
            li.classList.remove('taken');
            if (!$('[data-gift-open]', li)) {
              const b = document.createElement('button');
              b.type = 'button';
              b.className = 'btn btn-primary btn-sm';
              b.dataset.giftOpen = '';
              b.textContent = 'Lo regalo io';
              $('[data-gift-state]', li).before(b);
            }
          } else setFund(li, out.sum || 0, out.count || 0);
          paint(li);
          toast('Prenotazione annullata');
        } catch (err) {
          toast(err.message);
        }
      }
    });
    registry.addEventListener('submit', async (e) => {
      const form = e.target.closest('[data-gift-form]');
      if (!form) return;
      e.preventDefault();
      const li = form.closest('[data-gift]');
      const name = form.name.value.trim();
      if (!name) return form.name.focus();
      const amount = form.amount ? Number(form.amount.value) : 0;
      if (form.amount && !(amount >= 1)) return form.amount.focus();
      const btn = $('[type="submit"]', form);
      btn.disabled = true;
      try {
        const out = await postJson(registry.dataset.endpoint, { gift: li.dataset.gift, name, amount, guestCode: body.dataset.guest || '' });
        mine[out.id] = { token: out.token };
        store(key, mine);
        li.dataset.claims = [...claimsOf(li), out.id].join(',');
        form.hidden = true;
        if (li.dataset.kind === 'item') {
          li.classList.add('taken');
          $('[data-gift-open]', li)?.remove();
          toast('Fatto! Il regalo è prenotato a tuo nome');
        } else {
          setFund(li, out.sum || 0, out.count || 0);
          toast('Grazie! La tua quota è segnata');
        }
        paint(li);
      } catch (err) {
        toast(err.message);
        if (/appena scelto/.test(err.message)) {
          li.classList.add('taken');
          $('[data-gift-open]', li)?.remove();
          form.hidden = true;
          paint(li);
        }
      } finally {
        btn.disabled = false;
      }
    });
  }

  // ---------- rides board ----------
  const rideList = $('[data-ride-list]');
  const rideForm = $('[data-ride-form]');
  if (rideList) {
    const key = `confetto:${slug}:rides`;
    const mine = load(key, {});
    const addDelete = (li) => {
      if (!mine[li.dataset.ride] || $('[data-ride-delete]', li)) return;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'link-btn';
      b.dataset.rideDelete = '';
      b.textContent = 'Elimina';
      li.appendChild(b);
    };
    rideList.querySelectorAll('[data-ride]').forEach(addDelete);
    rideList.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-ride-delete]');
      if (!b) return;
      const li = b.closest('[data-ride]');
      try {
        await postJson(`${rideForm?.dataset.endpoint || ''}/elimina`, { id: li.dataset.ride, token: mine[li.dataset.ride]?.token });
        delete mine[li.dataset.ride];
        store(key, mine);
        li.remove();
        toast('Annuncio eliminato');
      } catch (err) {
        toast(err.message);
      }
    });
    $('[data-ride-open]')?.addEventListener('click', (e) => {
      if (mode === 'preview' || mode === 'demo') return toast(mode === 'demo' ? 'Questo è un esempio: nel tuo invito gli ospiti si organizzano qui' : 'Anteprima: la bacheca funziona sull’invito pubblicato');
      rideForm.hidden = false;
      e.target.hidden = true;
      if (!rideForm.name.value) rideForm.name.value = knownName();
      rideForm.place.focus();
    });
    rideForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = $('.form-msg', rideForm);
      msg.textContent = '';
      msg.classList.remove('err');
      const fd = new FormData(rideForm);
      const data = Object.fromEntries(fd.entries());
      if (!String(data.place || '').trim() || !String(data.name || '').trim() || !String(data.phone || '').trim()) {
        msg.textContent = 'Scrivi da dove parti, il tuo nome e il tuo numero';
        msg.classList.add('err');
        return;
      }
      try {
        const out = await postJson(rideForm.dataset.endpoint, data);
        mine[out.ride.id] = { token: out.token };
        store(key, mine);
        const r = out.ride;
        const li = document.createElement('li');
        li.className = 'ride';
        li.dataset.ride = r.id;
        li.innerHTML =
          `<div class="ride-main"><span class="ride-kind ${r.kind === 'offer' ? 'offer' : 'need'}">${r.kind === 'offer' ? 'Offre un passaggio' : 'Cerca un passaggio'}</span>` +
          `<strong>Da ${esc(r.place)}</strong><span>${esc(r.summary)}</span></div>` +
          `<a class="btn btn-ghost btn-sm" href="${esc(out.wa)}" target="_blank" rel="noopener">Scrivi</a>`;
        rideList.appendChild(li);
        addDelete(li);
        $('[data-rides-empty]')?.remove();
        rideForm.reset();
        rideForm.hidden = true;
        $('[data-ride-open]').hidden = false;
        toast('Annuncio pubblicato');
      } catch (err) {
        msg.textContent = err.message;
        msg.classList.add('err');
      }
    });
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

  // One row per person: name and/or menu (when the host asks for them).
  const peopleBox = $('[data-people]', form);
  const askNames = peopleBox?.dataset.names === '1';
  const menus = peopleBox ? JSON.parse(peopleBox.dataset.menu || '[]') : [];
  // the first person is whoever is answering (on personal links the name is the family's, so we don't copy it)
  let firstAuto = !guestCode;
  const readPeople = () =>
    peopleBox
      ? [...peopleBox.querySelectorAll('.person')].map((row) => ({ name: $('[data-p="name"]', row)?.value.trim() || '', menu: $('[data-p="menu"]', row)?.value || '' }))
      : [];
  const renderPeople = (initial) => {
    if (!peopleBox) return;
    const a = Number($('input[name="adults"]', form)?.value) || 0;
    const c = Number($('input[name="children"]', form)?.value) || 0;
    const current = readPeople();
    const values = current.length ? current : initial || [];
    peopleBox.querySelectorAll('.person').forEach((r) => r.remove());
    const total = Math.min(a + c, 20);
    for (let i = 0; i < total; i++) {
      const child = i >= a;
      const label = child ? `Bambino ${i - a + 1}` : `Adulto ${i + 1}`;
      const v = values[i] || {};
      const name = v.name || (i === 0 && firstAuto ? form.name.value.trim() : '');
      const row = document.createElement('div');
      row.className = `person${askNames ? '' : ' no-name'}${menus.length ? '' : ' no-menu'}`;
      row.innerHTML =
        (askNames ? `<label class="field"><span>${label}</span><input data-p="name" maxlength="60" value="${esc(name)}" placeholder="Nome"></label>` : '') +
        (menus.length
          ? `<label class="field"><span>${askNames ? 'Menu' : `${label}: menu`}</span><select data-p="menu"><option value="">Scegli…</option>${menus
              .map((m) => `<option${m === v.menu ? ' selected' : ''}>${esc(m)}</option>`)
              .join('')}</select></label>`
          : '');
      peopleBox.appendChild(row);
    }
    peopleBox.hidden = total === 0;
  };
  if (peopleBox) {
    let initial = [];
    try {
      initial = JSON.parse(peopleBox.dataset.prev || '[]');
    } catch {
      initial = [];
    }
    if (!initial.length && saved?.people) initial = saved.people;
    if (initial.length) firstAuto = false;
    renderPeople(initial);
    form.name.addEventListener('input', () => {
      const first = $('.person [data-p="name"]', peopleBox);
      if (first && firstAuto) first.value = form.name.value.trim();
    });
    peopleBox.addEventListener('input', (e) => {
      if (e.target === $('.person [data-p="name"]', peopleBox)) firstAuto = false;
    });
  }
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
    if (e.target.name === 'adults' || e.target.name === 'children') {
      clampSeats(e.target);
      renderPeople();
    }
  });
  form.addEventListener('click', (e) => {
    const b = e.target.closest('[data-step]');
    if (!b) return;
    const input = b.parentElement.querySelector('input');
    const next = (parseInt(input.value, 10) || 0) + Number(b.dataset.step);
    input.value = Math.max(Number(input.min || 0), Math.min(Number(input.max || 99), next));
    clampSeats(input);
    renderPeople();
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
    for (const k of ['adults', 'children', 'diet', 'answer', 'message', 'song']) if (form[k] && saved[k] != null) form[k].value = saved[k];
    setAttending();
    renderPeople(saved.people || []);
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
      song: String(fd.get('song') || ''),
      people: attending === 'yes' ? readPeople() : [],
      website: String(fd.get('website') || ''),
      guestCode: String(fd.get('guestCode') || ''),
      id: saved?.id || '',
      editToken: saved?.editToken || '',
    };
    if (!payload.name) return fail('Scrivi il tuo nome, così sappiamo chi sei');
    if (!attending) return fail('Dicci se ci sarai: scegli «Sì, ci sarò» oppure «No, non potrò esserci»');
    if (attending === 'yes' && payload.adults + payload.children < 1) return fail('Indica quante persone verranno');
    if (attending === 'yes' && menus.length && payload.people.some((x) => !x.menu)) return fail('Scegli il menu per ogni persona');
    if (attending === 'yes' && askNames && payload.people.some((x) => !x.name)) return fail('Scrivi il nome di ogni persona');
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
