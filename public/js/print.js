// Confetto — printable pages: the "Stampa" button.
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-print]')) window.print();
});
