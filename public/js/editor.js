// Confetto — invitation editor: autosave, live preview, repeatable rows (programme, gifts, stays, story),
// photos and gallery, "rewrite with AI", and the WhatsApp preview image.
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
  const newId = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => 'abcdefghijkmnopqrstuvwxyz23456789'[b % 33]).join('');

  /** Values of a repeatable row, read from its [data-k] fields. */
  const readRow = (row) => {
    const out = {};
    row.querySelectorAll('[data-k]').forEach((el) => (out[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value));
    return out;
  };

  function collect() {
    const data = {};
    for (const el of form.elements) {
      if (!el.name || el.type === 'radio' || el.type === 'file') continue;
      data[el.name] = el.type === 'checkbox' ? el.checked : el.value;
    }
    data.program = [...programEl.querySelectorAll('[data-moment]')].map(readRow);
    form.querySelectorAll('[data-rows]').forEach((list) => {
      data[list.dataset.rows] = [...list.querySelectorAll(':scope > [data-row]')].map((row) => (row.dataset.id ? { id: row.dataset.id, ...readRow(row) } : readRow(row)));
    });
    return { theme: form.querySelector('input[name="theme"]:checked')?.value, data };
  }

  // ---------- live preview (double-buffered iframe: no white flash) ----------
  let previewSeq = 0;
  function refreshPreview(withEnvelope = false) {
    const old = document.getElementById('preview');
    if (!old) return;
    const seq = ++previewSeq;
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
        // a newer refresh is on its way: this one is already stale
        if (seq !== previewSeq) return fresh.remove();
        try {
          if (!withEnvelope) fresh.contentWindow.scrollTo(0, y);
        } catch {
          /* ignore */
        }
        fresh.style.opacity = '1';
        setTimeout(() => {
          if (seq !== previewSeq) return fresh.remove();
          fresh.parentElement.querySelectorAll('iframe').forEach((f) => f !== fresh && f.remove());
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
      scheduleOg();
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
    const quick = e.target.type === 'radio' || e.target.type === 'checkbox' || e.target.tagName === 'SELECT';
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

  // ---------- repeatable rows: move up/down, remove ----------
  form.addEventListener('click', (e) => {
    const row = e.target.closest('[data-moment],[data-row]');
    if (!row) return;
    const list = row.parentElement;
    if (e.target.closest('[data-remove]')) {
      row.remove();
      updateAdd();
      schedule(150);
      return;
    }
    const mv = e.target.closest('[data-move]');
    if (!mv) return;
    if (mv.dataset.move === '-1' && row.previousElementSibling) list.insertBefore(row, row.previousElementSibling);
    else if (mv.dataset.move === '1' && row.nextElementSibling) list.insertBefore(row.nextElementSibling, row);
    schedule(150);
  });

  // programme
  const max = Number(addBtn.dataset.max || 5);
  function updateAdd() {
    addBtn.hidden = programEl.children.length >= max;
    form.querySelectorAll('[data-add-row]').forEach((b) => {
      const list = form.querySelector(`[data-rows="${b.dataset.addRow}"]`);
      b.hidden = list.children.length >= Number(b.dataset.max || 10);
    });
  }
  updateAdd();
  addBtn.addEventListener('click', () => {
    if (programEl.children.length >= max) return;
    programEl.appendChild(tpl.content.firstElementChild.cloneNode(true));
    updateAdd();
    programEl.lastElementChild.querySelector('[data-k="title"]').focus();
    schedule();
  });

  // gifts, stays, story
  form.querySelectorAll('[data-add-row]').forEach((b) =>
    b.addEventListener('click', () => {
      const kind = b.dataset.addRow;
      const list = form.querySelector(`[data-rows="${kind}"]`);
      if (list.children.length >= Number(b.dataset.max || 10)) return;
      const row = document.getElementById(`tpl-${kind}`).content.firstElementChild.cloneNode(true);
      if (kind === 'gifts') row.dataset.id = newId();
      list.appendChild(row);
      updateAdd();
      row.querySelector('input[type="text"],textarea')?.focus();
      schedule();
    }),
  );

  // ---------- phrase suggestions ----------
  const message = field('message');
  const suggest = document.getElementById('suggest');
  if (suggest) {
    const phrases = JSON.parse(suggest.dataset.phrases || '[]');
    const fill = (p) => p.replaceAll('{nome}', (field('name1')?.value || '').trim());
    let i = phrases.findIndex((p) => fill(p) === message.value);
    suggest.addEventListener('click', () => {
      i = (i + 1) % phrases.length;
      message.value = fill(phrases[i]);
      schedule(120);
    });
  }

  // ---------- rewrite the message with AI (only when the site has a Claude API key) ----------
  const aiTools = document.getElementById('ai-tools');
  if (aiTools && form.dataset.ai) {
    const undo = document.getElementById('ai-undo');
    let before = null;
    aiTools.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-ai-tone]');
      if (!b) return;
      const buttons = aiTools.querySelectorAll('[data-ai-tone]');
      buttons.forEach((x) => (x.disabled = true));
      const label = b.textContent;
      b.textContent = 'Sto scrivendo…';
      try {
        const res = await fetch(form.dataset.ai, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ tone: b.dataset.aiTone, text: message.value, data: collect().data }),
        });
        const out = await res.json().catch(() => ({}));
        if (!res.ok || !out.ok) throw new Error(out.error || 'Non è stato possibile riscrivere il testo.');
        before = message.value;
        message.value = out.text;
        undo.hidden = false;
        schedule(120);
      } catch (err) {
        toast(err.message);
      } finally {
        b.textContent = label;
        buttons.forEach((x) => (x.disabled = false));
      }
    });
    undo.addEventListener('click', () => {
      if (before == null) return;
      message.value = before;
      before = null;
      undo.hidden = true;
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

  // ---------- photos ----------
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
  async function upload(url, blob) {
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': blob.type || 'image/jpeg' }, body: blob });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.error || 'Caricamento non riuscito');
    return data;
  }

  const coverInput = document.getElementById('cover-input');
  const coverImg = document.getElementById('cover-preview');
  const coverRemove = document.getElementById('cover-remove');
  coverInput?.addEventListener('change', async () => {
    const file = coverInput.files[0];
    if (!file) return;
    setStatus('saving', 'Carico la foto…');
    try {
      const data = await upload(form.dataset.upload, await resize(file, 1400, 0.84));
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

  // gallery
  const gallery = document.getElementById('gallery');
  const galleryInput = document.getElementById('gallery-input');
  const galleryAdd = document.getElementById('gallery-add');
  const galleryMax = Number(gallery?.dataset.max || 8);
  const updateGallery = () => galleryAdd && (galleryAdd.hidden = gallery.children.length >= galleryMax);
  galleryInput?.addEventListener('change', async () => {
    const files = [...galleryInput.files].slice(0, Math.max(0, galleryMax - gallery.children.length));
    galleryInput.value = '';
    if (!files.length) return toast(`Puoi caricare al massimo ${galleryMax} foto`);
    let done = 0;
    for (const file of files) {
      setStatus('saving', `Carico le foto (${done + 1} di ${files.length})…`);
      try {
        const data = await upload(gallery.dataset.upload, await resize(file, 1600, 0.82));
        const fig = document.createElement('figure');
        fig.dataset.key = data.key;
        fig.innerHTML = `<img alt="" src="${data.url}"><button type="button" class="gallery-remove" data-gallery-remove aria-label="Rimuovi la foto">✕</button>`;
        gallery.appendChild(fig);
        done++;
      } catch (err) {
        toast(err.message || 'Foto non caricata');
        break;
      }
    }
    updateGallery();
    setStatus('saved', done ? (done === 1 ? 'Foto aggiunta' : `${done} foto aggiunte`) : 'Tutto salvato');
    if (done) refreshPreview();
  });
  gallery?.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-gallery-remove]');
    if (!b) return;
    const fig = b.closest('figure');
    try {
      const res = await fetch(gallery.dataset.remove, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key: fig.dataset.key }) });
      if (!res.ok) throw new Error();
      fig.remove();
      updateGallery();
      refreshPreview();
    } catch {
      toast('Non siamo riusciti a rimuovere la foto');
    }
  });

  // ---------- WhatsApp preview image (shown when there is no cover photo) ----------
  // Drawn here with the theme colours and the invitation fonts, then stored with the invitation.
  const ogColors = JSON.parse(form.dataset.ogColors || '{}');
  const ogSig = () => {
    const c = collect();
    return [c.theme, c.data.eyebrow, c.data.name1, c.data.name2, c.data.date, c.data.saveTheDate].join('|');
  };
  let lastOg = form.dataset.hasOg === '1' ? ogSig() : '';
  let ogTimer = null;
  function scheduleOg() {
    clearTimeout(ogTimer);
    ogTimer = setTimeout(makeOg, 2500);
  }
  async function makeOg() {
    const sig = ogSig();
    if (sig === lastOg || !form.dataset.og) return;
    const { theme, data } = collect();
    const [paper, ink, accent] = ogColors[theme] || ['#fbf7ef', '#2b241d', '#7a5a1e'];
    try {
      await Promise.all([document.fonts.load('600 120px "Cormorant Garamond"'), document.fonts.load('500 30px "Jost"')]);
    } catch {
      /* draw with the fallback fonts */
    }
    const W = 1200;
    const H = 630;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = paper;
    g.fillRect(0, 0, W, H);
    const gold = g.createLinearGradient(0, 0, W, H);
    ['#6f5220', '#a8823f', '#ead9a0', '#b88f45', '#7d5d26', '#dcc387', '#99733a'].forEach((col, i, a) => gold.addColorStop(i / (a.length - 1), col));
    g.strokeStyle = gold;
    g.lineWidth = 3;
    g.strokeRect(28, 28, W - 56, H - 56);
    g.lineWidth = 1;
    g.strokeRect(42, 42, W - 84, H - 84);
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    const eyebrow = (data.saveTheDate ? 'Save the date' : data.eyebrow || form.dataset.eventLabel || '').toUpperCase();
    g.fillStyle = accent;
    g.font = '500 30px Jost, sans-serif';
    if ('letterSpacing' in g) g.letterSpacing = '4px';
    g.fillText(eyebrow, W / 2, 150);
    if ('letterSpacing' in g) g.letterSpacing = '0px';
    const names = [data.name1, data.name2].map((s) => (s || '').trim()).filter(Boolean);
    const line = names.length === 2 ? `${names[0]} & ${names[1]}` : names[0] || '';
    let size = 120;
    g.font = `600 ${size}px "Cormorant Garamond", Georgia, serif`;
    while (g.measureText(line).width > W - 200 && size > 56) {
      size -= 4;
      g.font = `600 ${size}px "Cormorant Garamond", Georgia, serif`;
    }
    g.fillStyle = ink;
    g.fillText(line, W / 2, 330);
    g.fillStyle = gold;
    g.fillRect(W / 2 - 70, 380, 140, 2);
    let when = '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(data.date || '')) {
      const [y, m, d] = data.date.split('-').map(Number);
      when = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
    }
    g.fillStyle = ink;
    g.font = '500 40px Jost, sans-serif';
    g.fillText(when.charAt(0).toUpperCase() + when.slice(1), W / 2, 460);
    const blob = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.88));
    if (!blob) return;
    try {
      await upload(form.dataset.og, blob);
      lastOg = sig;
    } catch {
      /* not important: we retry at the next change */
    }
  }
  if (form.dataset.hasOg !== '1') setTimeout(makeOg, 1500);

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
