import { EVENTS, EVENT_GROUPS, defaultInviteData, priceFor } from '../../src/config';
import { THEMES, ornaments, themeInlineCss } from '../../src/themes';

const out = {
  groups: EVENT_GROUPS,
  events: EVENTS.map((e) => {
    const { date: _d, rsvpDeadline: _r, ...defaults } = defaultInviteData(e.id);
    return {
      id: e.id,
      group: e.group,
      label: e.label,
      emoji: e.emoji,
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
};
console.log(JSON.stringify(out));
