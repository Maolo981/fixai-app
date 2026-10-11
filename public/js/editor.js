// Confetto — invitation editor: autosave, live preview, programme rows, photo upload.
(() => {
  const form = document.getElementById('editor');
  if (!form) return;
  const field = (name) => form.elements.namedItem(name);
  const statusEl = document.getElementById('save-status');
  const programEl = document.getElementById('program');
  const tpl = document.getElementById('program-tpl');
  const addBtn = document.getElementById('add-moment');
  const toast = (t) => window.toast && window.toast(t);
  let timer = null;
  let saving = false;
  let queued = false;
  let dirty = false;

  const setStatus = (state, text) => {
    statusEl.dataset.state = state;
    statusEl.textContent = text;
  };

  function collect() {
    const data = {};
    for (const el of form.elements) {
      if (!el.name || el.type === 'radio' || el.type === 'file') continue;
      data[el.name] = el.type === 'checkbox' ? el.checked : el.value;
    }
    data.program = [...programEl.querySelectorAll('[data-moment]')].map((row) => {
      const get = (k) => row.querySelector(`[data-k="${k}"]`).value;
      return { time: get('time'), title: get('title'), place: get('place'), address: get('address') };
    });
    return { theme: form.querySelector('input[name="theme"]:checked')?.value, data };
  }

  // ---------- live preview (double-buffered iframe: no white flash) ----------
  function refreshPreview(withEnvelope = false) {
    const old = document.getElementById('preview');
    if (!old) return;
    let y = 0;
    try {
      y = old.contentWindow.scrollY;
    } catch {
      y = 0;
    }
    const fresh = old.cloneNode(false);
    fresh.removeAttribute('id');
    Object.assign(fresh.style, { position: 'absolute', left: '12px', top: '12px', opacity: '0' });
    fresh.src = `${form.dataset.preview}?${withEnvelope ? 'busta=1&' : ''}t=${Date.now()}`;
    fresh.addEventListener(
      'load',
      () => {
        try {
          if (!withEnvelope) fresh.contentWindow.scrollTo(0, y);
        } catch {
          /* ignore */
        }
        fresh.style.opacity = '1';
        setTimeout(() => {
          old.remove();
          fresh.id = 'preview';
          Object.assign(fresh.style, { position: '', left: '', top: '' });
        }, 80);
      },
      { once: true },
    );
    old.parentElement.appendChild(fresh);
  }

  // ---------- autosave ----------
  async function save() {
    clearTimeout(timer);
    if (saving) {
      queued = true;
      return;
    }
    saving = true;
    queued = false;
    setStatus('saving', 'Salvataggio…');
    try {
      const res = await fetch(form.dataset.save, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(collect()),
      });
      if (!res.ok) throw new Error(String(res.status));
      dirty = false;
      setStatus('saved', 'Tutto salvato');
      refreshPreview();
    } catch {
      setStatus('error', 'Non salvato, riprovo…');
      timer = setTimeout(save, 4000);
    } finally {
      saving = false;
      if (queued) save();
    }
  }
  function schedule(delay = 650) {
    dirty = true;
    setStatus('saving', 'Modifiche in corso…');
    clearTimeout(timer);
    timer = setTimeout(save, delay);
  }

  form.addEventListener('input', (e) => {
    if (e.target.type === 'file') return;
    const quick = e.target.type === 'radio' || e.target.type === 'checkbox';
    schedule(quick ? 80 : 650);
  });
  form.addEventListener('submit', (e) => e.preventDefault());

  // Flush unsaved changes when the tab is hidden (mobile app switch) or before leaving.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && dirty) {
      navigator.sendBeacon(form.dataset.save, new Blob([JSON.stringify(collect())], { type: 'application/json' }));
      dirty = false;
    }
  });
  document.addEventListener('click', async (e) => {
    const a = e.target.closest('a[href]');
    if (!a || !dirty || a.target === '_blank') return;
    e.preventDefault();
    await save();
    window.location.href = a.href;
  });
  window.addEventListener('beforeunload', (e) => {
    if (dirty || saving) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // ---------- programme ----------
  const max = Number(addBtn.dataset.max || 5);
  const updateAdd = () => (addBtn.hidden = programEl.children.length >= max);
  updateAdd();
  addBtn.addEventListener('click', () => {
    if (programEl.children.length >= max) return;
    programEl.appendChild(tpl.content.firstElementChild.cloneNode(true));
    updateAdd();
    programEl.lastElementChild.querySelector('[data-k="title"]').focus();
    schedule();
  });
  programEl.addEventListener('click', (e) => {
    const row = e.target.closest('[data-moment]');
    if (!row) return;
    if (e.target.closest('[data-remove]')) {
      row.remove();
      updateAdd();
      schedule(150);
      return;
    }
    const mv = e.target.closest('[data-move]');
    if (!mv) return;
    if (mv.dataset.move === '-1' && row.previousElementSibling) programEl.insertBefore(row, row.previousElementSibling);
    else if (mv.dataset.move === '1' && row.nextElementSibling) programEl.insertBefore(row.nextElementSibling, row);
    schedule(150);
  });

  // ---------- phrase suggestions ----------
  const suggest = document.getElementById('suggest');
  if (suggest) {
    const phrases = JSON.parse(suggest.dataset.phrases || '[]');
    const fill = (p) => p.replaceAll('{nome}', (field('name1')?.value || '').trim());
    let i = phrases.findIndex((p) => fill(p) === field('message').value);
    suggest.addEventListener('click', () => {
      i = (i + 1) % phrases.length;
      field('message').value = fill(phrases[i]);
      schedule(120);
    });
  }

  // ---------- IBAN check ----------
  const iban = field('iban');
  const ibanHint = document.getElementById('iban-hint');
  const validIban = (s) => {
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
    let m = 0;
    for (const ch of s.slice(4) + s.slice(0, 4)) {
      const v = ch >= 'A' ? String(ch.charCodeAt(0) - 55) : ch;
      for (const d of v) m = (m * 10 + Number(d)) % 97;
    }
    return m === 1;
  };
  const checkIban = () => {
    const v = iban.value.replace(/\s+/g, '').toUpperCase();
    if (!v) {
      ibanHint.textContent = '';
      return;
    }
    const ok = validIban(v);
    ibanHint.textContent = ok ? '✓ IBAN corretto' : 'Controlla l’IBAN: sembra esserci un errore di battitura';
    ibanHint.className = `field-hint ${ok ? 'good' : 'bad'}`;
  };
  if (iban && ibanHint) {
    iban.addEventListener('input', checkIban);
    checkIban();
  }

  // ---------- cover photo ----------
  const coverInput = document.getElementById('cover-input');
  const coverImg = document.getElementById('cover-preview');
  const coverRemove = document.getElementById('cover-remove');

  async function resize(file, maxSide, quality) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((ok, ko) => {
        const i = new Image();
        i.onload = () => ok(i);
        i.onerror = () => ko(new Error('Formato non supportato: usa una foto JPG o PNG.'));
        i.src = url;
      });
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      return await new Promise((ok, ko) => canvas.toBlob((b) => (b ? ok(b) : ko(new Error('Conversione non riuscita'))), 'image/jpeg', quality));
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  coverInput?.addEventListener('change', async () => {
    const file = coverInput.files[0];
    if (!file) return;
    setStatus('saving', 'Carico la foto…');
    try {
      const blob = await resize(file, 1400, 0.84);
      const res = await fetch(form.dataset.upload, { method: 'POST', headers: { 'content-type': 'image/jpeg' }, body: blob });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Caricamento non riuscito');
      coverImg.src = data.url;
      coverImg.hidden = false;
      coverRemove.hidden = false;
      setStatus('saved', 'Foto caricata');
      refreshPreview();
    } catch (err) {
      setStatus('error', 'Foto non caricata');
      toast(err.message || 'Non siamo riusciti a caricare la foto');
    } finally {
      coverInput.value = '';
    }
  });

  coverRemove?.addEventListener('click', async () => {
    await fetch(form.dataset.unupload, { method: 'POST' });
    coverImg.hidden = true;
    coverImg.removeAttribute('src');
    coverRemove.hidden = true;
    refreshPreview();
  });

  // ---------- preview controls ----------
  document.getElementById('replay')?.addEventListener('click', () => refreshPreview(true));
  const pane = document.getElementById('preview-pane');
  document.getElementById('open-preview')?.addEventListener('click', () => {
    pane.classList.add('open');
    document.body.style.overflow = 'hidden';
    refreshPreview();
  });
  document.getElementById('close-preview')?.addEventListener('click', () => {
    pane.classList.remove('open');
    document.body.style.overflow = '';
  });
})();
