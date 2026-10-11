// Confetto — shared behaviour for site and app pages (toast, copy, share, confirm).
(() => {
  const toastEl = document.getElementById('toast');
  let timer;
  window.toast = (text) => {
    if (!toastEl) return;
    toastEl.textContent = text;
    toastEl.classList.add('show');
    clearTimeout(timer);
    timer = setTimeout(() => toastEl.classList.remove('show'), 3000);
  };

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
  }

  document.addEventListener('click', async (e) => {
    const c = e.target.closest('[data-copy]');
    if (c) {
      e.preventDefault();
      await copy(c.dataset.copy);
      window.toast('Copiato ✓');
      return;
    }
    const s = e.target.closest('[data-share]');
    if (s && navigator.share) {
      e.preventDefault();
      try {
        await navigator.share({ text: s.dataset.shareText || s.dataset.share });
      } catch {
        /* user cancelled */
      }
    }
  });

  if (navigator.share) document.querySelectorAll('[data-share]').forEach((b) => (b.hidden = false));

  document.addEventListener('submit', (e) => {
    const f = e.target.closest('form[data-confirm]');
    if (f && !window.confirm(f.dataset.confirm)) e.preventDefault();
  });
})();
