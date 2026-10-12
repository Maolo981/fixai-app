import { raw } from 'hono/html';
import { BRAND, EVENTS, EVENT_GROUPS, priceFor } from '../config';
import { occasionIcon } from '../icons';
import { THEME_BY_ID } from '../themes';
import type { ThemeId } from '../types';
import { euro } from '../util';
import { Layout } from './layout';

export function CreatePage({ origin, preselect, theme }: { origin: string; preselect?: string; theme?: ThemeId }) {
  return (
    <Layout
      title={`Crea il tuo invito · ${BRAND.name}`}
      description="Scegli l’occasione e crea il tuo invito digitale con conferma di presenza: matrimoni, battesimi, compleanni, cene, eventi e qualsiasi festa."
      canonical={`${origin}/crea`}
    >
      <main class="container create-page">
        <p class="kicker center">Passo 1 di 2</p>
        <h1 class="h2 center">Cosa festeggiamo?</h1>
        <p class="lead center narrow">Scegli l’occasione, oppure «Altro» e scrivi tu. Ti prepariamo un invito già compilato da personalizzare. Lo vedi subito, gratis.</p>
        {theme && (
          <p class="chosen-style center">
            Stile scelto: <strong>{THEME_BY_ID[theme].name}</strong> · <a href="/stili">cambia</a>
          </p>
        )}
        <form method="post" action="/crea">
          {theme && <input type="hidden" name="theme" value={theme} />}
          {EVENT_GROUPS.map((g) => (
            <section class="event-group">
              <h2 class="event-group-title">{g.label}</h2>
              <div class="event-grid">
                {EVENTS.filter((e) => e.group === g.id).map((e) => (
                  <button class={`event-card${preselect === e.slug ? ' preselected' : ''}`} type="submit" name="type" value={e.id}>
                    <span class="event-icon">{raw(occasionIcon(e.id))}</span>
                    <span class="event-label">{e.label}</span>
                    <span class="event-price">{euro(priceFor(e.id).cents)}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </form>
        <p class="center muted small">Il prezzo si paga una sola volta, solo quando decidi di pubblicare l’invito.</p>
      </main>
    </Layout>
  );
}
