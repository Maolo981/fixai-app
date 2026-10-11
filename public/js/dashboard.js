// Confetto — host dashboard: tabs, guest filters (state and group), "sent" tracking, phone contacts.
(() => {
  const main = document.querySelector('.dash');
  if (!main) return;

  // ---------- tabs (progressive enhancement: without JS every panel is visible) ----------
  const tabs = [...document.querySelectorAll('[data-tab]')];
  const panels = [...document.querySelectorAll('[data-panel]')];
  if (tabs.length) {
    main.classList.add('js-tabs');
    const panelOf = (hash) => {
      if (panels.some((p) => p.dataset.panel === hash)) return hash;
      // anchors inside a panel (#passaggi, #musica) open their panel
      return document.getElementById(hash)?.closest('[data-panel]')?.dataset.panel || 'risposte';
    };
    const show = (hash, scroll) => {
      const name = panelOf(hash);
      tabs.forEach((t) => t.classList.toggle('on', t.dataset.tab === name));
      tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === name)));
      panels.forEach((p) => p.classList.toggle('on', p.dataset.panel === name));
      if (!scroll) return;
      const target = hash && hash !== name ? document.getElementById(hash) : null;
      (target && !target.closest('[data-panel]')?.hidden ? target : document.querySelector('.tabs'))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    tabs.forEach((t) =>
      t.addEventListener('click', (e) => {
        e.preventDefault();
        history.replaceState(null, '', `#${t.dataset.tab}`);
        show(t.dataset.tab, false);
      }),
    );
    const fromHash = location.hash.slice(1);
    // #strumenti, #condividi… live outside the tabs: just scroll there
    if (fromHash && document.getElementById(fromHash) && !document.getElementById(fromHash).closest('[data-panel]') && !panels.some((p) => p.dataset.panel === fromHash)) show('', false);
    else show(fromHash, Boolean(fromHash));
    window.addEventListener('hashchange', () => show(location.hash.slice(1), true));
  }

  // ---------- guest filters: state × group ----------
  const filters = [...document.querySelectorAll('[data-filter]')];
  const groupFilters = [...document.querySelectorAll('[data-group-filter]')];
  const guests = [...document.querySelectorAll('.guest[data-state]')];
  let wantState = 'all';
  let wantGroup = '';
  const apply = () =>
    guests.forEach((g) => {
      const s = g.dataset.state;
      const okState = wantState === 'all' || s === wantState || (wantState === 'pending' && (s === 'pending' || s === 'tosend'));
      g.hidden = !(okState && (!wantGroup || g.dataset.group === wantGroup));
    });
  filters.forEach((f) =>
    f.addEventListener('click', () => {
      filters.forEach((x) => x.classList.toggle('on', x === f));
      wantState = f.dataset.filter;
      apply();
    }),
  );
  groupFilters.forEach((f) =>
    f.addEventListener('click', () => {
      groupFilters.forEach((x) => x.classList.toggle('on', x === f));
      wantGroup = f.dataset.groupFilter;
      apply();
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

  // ---------- pick guests from the phone book (Chrome on Android) ----------
  const pick = document.getElementById('pick-contacts');
  const bulk = document.querySelector('textarea[name="bulk"]');
  if (pick && bulk && 'contacts' in navigator && 'select' in navigator.contacts) {
    pick.hidden = false;
    pick.addEventListener('click', async () => {
      try {
        const people = await navigator.contacts.select(['name', 'tel'], { multiple: true });
        const lines = people
          .map((p) => {
            const name = (p.name?.[0] || '').replace(/[,;\t]/g, ' ').trim();
            const tel = (p.tel?.[0] || '').replace(/[^\d+ ]/g, '').trim();
            return name ? `${name}, 1${tel ? `, ${tel}` : ''}` : '';
          })
          .filter(Boolean);
        if (!lines.length) return;
        bulk.value = [bulk.value.trim(), ...lines].filter(Boolean).join('\n');
        bulk.closest('details').open = true;
        window.toast?.(`${lines.length} ${lines.length === 1 ? 'contatto aggiunto' : 'contatti aggiunti'}: controlla i posti e premi «Aggiungi tutti»`);
      } catch {
        /* the user closed the picker */
      }
    });
  }
})();
