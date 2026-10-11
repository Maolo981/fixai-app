import type { Invitation } from '../types';
import { Logo } from './layout';
import { publicPath } from '../model';

export function AppHeader({ inv, active, readOnly }: { inv: Invitation; active: 'dash' | 'edit'; readOnly?: boolean }) {
  const base = `/gestisci/${inv.admin_token}`;
  if (readOnly)
    return (
      <header class="site-header app-header">
        <div class="container header-inner">
          <Logo />
          <span class="badge badge-readonly">Sola lettura</span>
          {inv.status === 'active' && (
            <a class="btn btn-secondary btn-sm" href={publicPath(inv)} target="_blank" rel="noopener">
              Apri invito ↗
            </a>
          )}
        </div>
      </header>
    );
  return (
    <header class="site-header app-header">
      <div class="container header-inner">
        <Logo />
        <nav class="app-nav" aria-label="Il tuo invito">
          <a href={base} class={active === 'dash' ? 'on' : ''} aria-current={active === 'dash' ? 'page' : undefined}>
            Risposte
          </a>
          <a href={`${base}/modifica`} class={active === 'edit' ? 'on' : ''} aria-current={active === 'edit' ? 'page' : undefined}>
            Modifica
          </a>
        </nav>
        {inv.status === 'draft' ? (
          <a class="btn btn-primary btn-sm" href={`${base}#pubblica`}>
            Pubblica
          </a>
        ) : (
          <a class="btn btn-secondary btn-sm" href={publicPath(inv)} target="_blank" rel="noopener">
            Apri invito ↗
          </a>
        )}
      </div>
    </header>
  );
}
