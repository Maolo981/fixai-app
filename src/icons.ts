/**
 * Fine line icons for the occasions (32×32, drawn with the current text colour).
 * Used instead of emoji on the site and in the Studio demo.
 */
import type { EventType } from './types';

const HEART = 'M16 25C10.5 21.2 6.5 17.6 6.5 13.6C6.5 10.7 8.7 8.6 11.3 8.6C13.2 8.6 14.9 9.7 16 11.4C17.1 9.7 18.8 8.6 20.7 8.6C23.3 8.6 25.5 10.7 25.5 13.6C25.5 17.6 21.5 21.2 16 25Z';

export const OCCASION_ICONS: Record<EventType, string> = {
  matrimonio: '<circle cx="12.6" cy="18.6" r="6.6"/><circle cx="19.4" cy="18.6" r="6.6"/><path d="M17.3 9.2L18.7 7.4H20.1L21.5 9.2L19.4 11.6Z"/>',
  battesimo: '<path d="M16 25.5C9.6 25.5 5.6 20.3 6.4 13.9C9 10.3 12.3 8.5 16 8.5S23 10.3 25.6 13.9C26.4 20.3 22.4 25.5 16 25.5Z"/><path d="M16 25.5L10.4 11.1M16 25.5L13.1 9M16 25.5V8.5M16 25.5L18.9 9M16 25.5L21.6 11.1"/><path d="M13 26.8H19"/>',
  comunione: '<circle cx="16" cy="5.8" r="2.6"/><path d="M9.6 10.6H22.4C22.4 16.6 19.8 19.6 16 19.6S9.6 16.6 9.6 10.6Z"/><path d="M16 19.6V25"/><path d="M11.4 26.2C11.4 25 13.4 24.6 16 24.6S20.6 25 20.6 26.2Z"/>',
  cresima: '<path d="M16 27C11.2 27 8.6 23.6 9.2 19.4C9.8 15.6 12.8 14.2 12.6 10.4C15.2 12 16.4 14.6 16.2 17C17.6 15.2 18.6 11.6 17.6 5.6C22 8.6 24.4 13.6 23.6 19C23 23.8 20 27 16 27Z"/><path d="M16 27C14 27 12.8 25.4 13.2 23.4C13.6 21.6 15 20.8 15.4 19C17.4 20.4 18.6 22.4 18.4 24.2C18.2 25.8 17.4 27 16 27Z"/>',
  compleanno: '<path d="M8.5 15.5H23.5V24.5H8.5Z"/><path d="M8.5 18.6C10 20.2 11.6 20.2 13.1 18.6C14.6 20.2 16.2 20.2 17.7 18.6C19.2 20.2 20.8 20.2 22.3 18.6"/><path d="M16 15.5V11.5"/><path d="M16 7.4C17.3 8.7 17.4 10 16 10.9C14.6 10 14.7 8.7 16 7.4Z"/><path d="M6 24.5H26"/>',
  diciottesimo: '<circle cx="10.6" cy="16" r="4.6"/><circle cx="10.6" cy="16" r="1.6"/><path d="M15.2 16H26.4"/><path d="M22.4 16V19.6M25.4 16V18.6"/>',
  laurea: '<path d="M4 13L16 7.2L28 13L16 18.8Z"/><path d="M9.2 15.6V21C9.2 23.4 22.8 23.4 22.8 21V15.6"/><path d="M25.6 14.2V20.4"/><circle cx="25.6" cy="21.4" r="1"/>',
  babyshower: '<path d="M6.6 15H25.4C25.4 20 21.4 23 16 23S6.6 20 6.6 15Z"/><path d="M6.6 15C6.6 10.4 10.4 7 15.6 7V15"/><circle cx="11" cy="25.4" r="1.9"/><circle cx="21" cy="25.4" r="1.9"/><path d="M25.4 15L28 11.4"/>',
  anniversario: `<path transform="translate(-3.4 1) scale(.82) translate(3.5 3.5)" d="${HEART}"/><path transform="translate(8.2 -.6) scale(.62) translate(3.5 3.5)" d="${HEART}"/>`,
  festa: '<path d="M8.4 6.6L13.2 5.4L14.4 12.2C14.8 14.6 13.8 16 12.4 16.4S9.6 15.6 9.2 13.2Z"/><path d="M12.4 16.4L14 23.4M11.4 24.2L16.4 23"/><path d="M23.6 6.6L18.8 5.4L17.6 12.2C17.2 14.6 18.2 16 19.6 16.4S22.4 15.6 22.8 13.2Z"/><path d="M19.6 16.4L18 23.4M20.6 24.2L15.6 23"/><path d="M16 2.6V4.2M13.6 3.4L14.4 4.6M18.4 3.4L17.6 4.6"/>',
  cena: '<path d="M10.6 5.6H21.4C21.4 12 19.4 15.6 16 15.6S10.6 12 10.6 5.6Z"/><path d="M11.2 10.2H20.8"/><path d="M16 15.6V24.6"/><path d="M11.6 26C11.6 25 13.4 24.6 16 24.6S20.4 25 20.4 26Z"/>',
  addio: '<path d="M7.6 12.2L11.6 7H20.4L24.4 12.2L16 25.4Z"/><path d="M7.6 12.2H24.4"/><path d="M13.4 7L12.6 12.2L16 25.4L19.4 12.2L18.6 7"/>',
  genderreveal: '<path d="M16 4.6C20.4 4.6 23.4 8 23.4 12.4C23.4 17.4 19.6 21.4 16 21.4S8.6 17.4 8.6 12.4C8.6 8 11.6 4.6 16 4.6Z"/><path d="M14.8 21.4L16 22.8L17.2 21.4"/><path d="M16 22.8C14.4 24.6 17.6 25.6 16 27.6"/><path d="M12.2 9.4C12.8 8.4 13.8 7.8 15 7.6"/>',
  pensione: '<path d="M5 15.2C6.2 9.6 10.6 6.2 16 6.2S25.8 9.6 27 15.2C25.2 13.8 23.2 13.8 21.5 15.2C19.8 13.8 17.8 13.8 16 15.2C14.2 13.8 12.2 13.8 10.5 15.2C8.8 13.8 6.8 13.8 5 15.2Z"/><path d="M16 15.2V25.6"/><path d="M6.4 26.4C9.6 25.4 12.8 25.4 16 26.4S22.4 27.4 25.6 26.4"/>',
  natale: '<path d="M16 5.2L10.4 13.2H13.2L8.4 20.4H23.6L18.8 13.2H21.6Z"/><path d="M14.8 20.4V24.8H17.2V20.4"/><path d="M16 2.2L16.6 3.6L18 3.8L16.9 4.7L17.3 6.1L16 5.3L14.7 6.1L15.1 4.7L14 3.8L15.4 3.6Z"/>',
  inaugurazione: '<path d="M16 15.2C12.6 10.6 7.4 10.2 7.4 13.2C7.4 16.2 12.4 16.4 16 15.2Z"/><path d="M16 15.2C19.4 10.6 24.6 10.2 24.6 13.2C24.6 16.2 19.6 16.4 16 15.2Z"/><circle cx="16" cy="15.2" r="1.6"/><path d="M15 16.6L11.6 25.2L13.8 24.4L14.8 26.6L16.4 16.8"/><path d="M17 16.6L20.4 25.2L18.2 24.4L17.2 26.6L15.6 16.8"/>',
  aziendale: '<rect x="5.6" y="11.2" width="20.8" height="13.6" rx="1.6"/><path d="M12.4 11.2V8.8C12.4 7.9 13.1 7.2 14 7.2H18C18.9 7.2 19.6 7.9 19.6 8.8V11.2"/><path d="M5.6 16.8H26.4"/><path d="M14.6 16.8V19H17.4V16.8"/>',
  altro: '<path d="M16 4.8L21.8 13.6L16 27.2L10.2 13.6Z"/><path d="M16 27.2V17.6"/><circle cx="16" cy="15.8" r="1.8"/>',
};

export const iconSvg = (inner: string, cls = 'icon') =>
  `<svg class="${cls}" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${inner}</svg>`;

export const occasionIcon = (id: EventType, cls?: string) => iconSvg(OCCASION_ICONS[id], cls);
