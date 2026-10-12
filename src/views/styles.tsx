import { BRAND, PHOTO_STYLES } from '../config';
import { THEMES, THEME_CATEGORIES } from '../themes';
import { Layout } from './layout';

/** The ways to show your own photo (home page and /stili). */
export function PhotoStylesSection({ alt }: { alt?: boolean }) {
  return (
    <section class={`section${alt ? ' alt' : ''}`} id="foto">
      <div class="container">
        <h2 class="h2 center">
          La tua foto, <em>come la vuoi tu</em>
        </h2>
        <p class="lead center narrow">Carica una foto dal telefono e scegli come mostrarla: ad arco, tonda, in cornice, come una polaroid o grande in cima all’invito. Sta bene con tutti gli stili.</p>
        <div class="photo-grid">
          {PHOTO_STYLES.map((p) => (
            <a class="photo-card" href={`/demo/cipria?foto=${p.id}`}>
              <img src={`/img/foto/${p.id}.webp`} alt={`Invito con la foto: ${p.label.toLowerCase()}`} loading="lazy" width={480} height={862} />
              <span>{p.label}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StylesPage({ origin }: { origin: string }) {
  return (
    <Layout
      title={`${THEMES.length} stili per inviti digitali · ${BRAND.name}`}
      description={`Acquerelli, oro a caldo e carta di cotone: ${THEMES.length} stili per inviti digitali di matrimonio, battesimo, comunione, compleanno e feste. Con la tua foto, come vuoi tu.`}
      canonical={`${origin}/stili`}
    >
      <main>
        <section class="section styles-head">
          <div class="container">
            <p class="kicker center">Gli stili</p>
            <h1 class="h2 center">
              {THEMES.length} stili, <em>dipinti uno per uno</em>
            </h1>
            <p class="lead center narrow">
              Acquerelli, oro a caldo e carta di cotone, disegnati per l’Italia. Ogni stile va bene per qualsiasi occasione: apri l’esempio per vederlo come lo vedranno i tuoi ospiti.
            </p>
            <nav class="style-nav" aria-label="Categorie di stili">
              {THEME_CATEGORIES.map((c) => (
                <a class="chip-btn" href={`#${c.id}`}>
                  {c.label}
                </a>
              ))}
              <a class="chip-btn" href="#foto">
                Con la tua foto
              </a>
            </nav>
          </div>
        </section>
        {THEME_CATEGORIES.map((c, i) => (
          <section class={`section${i % 2 ? '' : ' alt'}`} id={c.id}>
            <div class="container">
              <h2 class="h3 center">{c.label}</h2>
              <div class="themes-grid">
                {THEMES.filter((t) => t.category === c.id).map((t) => (
                  <article class="theme-card style-card">
                    <a href={`/demo/${t.id}`} tabindex={-1} aria-hidden="true">
                      <img src={`/img/themes/${t.id}.webp`} alt="" loading="lazy" width={390} height={520} />
                    </a>
                    <span class="theme-meta">
                      <strong>{t.name}</strong>
                      <span>{t.desc}</span>
                    </span>
                    <span class="style-actions">
                      <a class="btn btn-secondary btn-sm" href={`/demo/${t.id}`}>
                        Vedi l’esempio<span class="sr-only"> dello stile {t.name}</span>
                      </a>
                      <a class="btn btn-primary btn-sm" href={`/crea?stile=${t.id}`}>
                        Usa questo stile<span class="sr-only">: {t.name}</span>
                      </a>
                    </span>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ))}
        <PhotoStylesSection alt={THEME_CATEGORIES.length % 2 === 0} />
        <section class="section">
          <div class="container narrow center">
            <h2 class="h2">Trovato quello giusto?</h2>
            <p class="lead">Scegli l’occasione e personalizza l’invito: lo stile lo puoi cambiare quando vuoi, anche dopo averlo mandato.</p>
            <a class="btn btn-primary btn-lg" href="/crea">
              Crea il tuo invito
            </a>
          </div>
        </section>
      </main>
    </Layout>
  );
}
