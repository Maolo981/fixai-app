// Confetto — host dashboard: tabs, guest filters, "sent" tracking.
(() => {
  const main = document.querySelector('.dash');
  if (!main) return;

  // ---------- tabs (progressive enhancement: without JS every panel is visible) ----------
  const tabs = [...document.querySelectorAll('[data-tab]')];
  const panels = [...document.querySelectorAll('[data-panel]')];
  if (tabs.length) {
    main.classList.add('js-tabs');
    const show = (name, scroll) => {
      if (!panels.some((p) => p.dataset.panel === name)) name = 'risposte';
      tabs.forEach((t) => t.classList.toggle('on', t.dataset.tab === name));
      tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === name)));
      panels.forEach((p) => p.classList.toggle('on', p.dataset.panel === name));
      if (scroll) document.querySelector('.tabs').scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    tabs.forEach((t) =>
      t.addEventListener('click', (e) => {
        e.preventDefault();
        history.replaceState(null, '', `#${t.dataset.tab}`);
        show(t.dataset.tab, false);
      }),
    );
    const fromHash = location.hash.slice(1);
    show(fromHash, Boolean(fromHash));
    window.addEventListener('hashchange', () => show(location.hash.slice(1), true));
  }

  // ---------- guest filters ----------
  const filters = [...document.querySelectorAll('[data-filter]')];
  const guests = [...document.querySelectorAll('.guest[data-state]')];
  filters.forEach((f) =>
    f.addEventListener('click', () => {
      filters.forEach((x) => x.classList.toggle('on', x === f));
      const want = f.dataset.filter;
      guests.forEach((g) => {
        const s = g.dataset.state;
        g.hidden = !(want === 'all' || s === want || (want === 'pending' && (s === 'pending' || s === 'tosend')));
      });
    }),
  );

  // ---------- mark as sent when the host taps "Invia su WhatsApp" ----------
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-sent]');
    if (!a) return;
    navigator.sendBeacon(a.dataset.sent);
    const li = a.closest('.guest');
    const pill = li?.querySelector('.pill');
    if (pill && li.dataset.state === 'tosend') {
      pill.textContent = 'Inviato';
      pill.className = 'pill pill-sent';
      li.dataset.state = 'pending';
      a.textContent = 'Promemoria';
    }
  });
})();
