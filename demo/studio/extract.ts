import { EVENTS, EVENT_GROUPS, defaultInviteData, priceFor } from '../../src/config';
import { dataUri, linen, paperGrain } from '../../src/art';
import { occasionIcon } from '../../src/icons';
import { THEMES, ornaments, themeInlineCss } from '../../src/themes';

const out = {
  groups: EVENT_GROUPS,
  events: EVENTS.map((e) => {
    const { date: _d, rsvpDeadline: _r, ...defaults } = defaultInviteData(e.id);
    return {
      id: e.id,
      group: e.group,
      label: e.label,
      icon: occasionIcon(e.id),
      couple: e.couple,
      theme: e.theme,
      name1Label: e.name1Label,
      name2Label: e.name2Label,
      messageFor: e.messageFor,
      phrases: e.phrases,
      sampleName: e.defaults().name1 ?? '',
      priceCents: priceFor(e.id).cents,
      phrase: e.eventPhrase({ name1: '{n1}', name2: '{n2}', eyebrow: '' }),
      defaults,
    };
  }),
  themes: THEMES.map((t) => ({ id: t.id, name: t.name, desc: t.desc, swatches: t.swatches, demoEvent: t.demoEvent, orn: ornaments(t.id), css: themeInlineCss(t.id) })),
  // textures for the Studio's own pages (the same cotton paper and linen as the invitations)
  ui: { grain: dataUri(paperGrain()), linen: dataUri(linen(200, 9, 0.6)) },
};
console.log(JSON.stringify(out));
