import { NavLink, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { CompetitionsPage } from '@/pages/CompetitionsPage';
import { FollowsPage } from '@/pages/FollowsPage';
import { HomePage } from '@/pages/HomePage';
import { MatchesPage } from '@/pages/MatchesPage';
import { PlayersPage } from '@/pages/PlayersPage';
import { SearchPage } from '@/pages/SearchPage';
import { TeamsPage } from '@/pages/TeamsPage';
import { CookiesPolicyPage } from '@/pages/legal/CookiesPolicyPage';
import { DataDeletionPage } from '@/pages/legal/DataDeletionPage';
import { PrivacyPolicyPage } from '@/pages/legal/PrivacyPolicyPage';
import { TermsOfUsePage } from '@/pages/legal/TermsOfUsePage';

const routes = [
  { to: '/', key: 'home' },
  { to: '/matches', key: 'matches' },
  { to: '/teams', key: 'teams' },
  { to: '/players', key: 'players' },
  { to: '/competitions', key: 'competitions' },
  { to: '/search', key: 'search' },
  { to: '/follows', key: 'follows' },
] as const;

const legalRoutes = [
  { to: '/legal/privacy', key: 'privacy' },
  { to: '/legal/terms', key: 'terms' },
  { to: '/legal/cookies', key: 'cookies' },
  { to: '/legal/data-deletion', key: 'dataDeletion' },
] as const;

export function App() {
  const { t, i18n } = useTranslation();

  const switchLanguage = (nextLanguage: 'fr' | 'en') => {
    i18n.changeLanguage(nextLanguage).catch(() => undefined);
  };

  return (
    <div className="app-shell">
      <header className="shell-header">
        <div className="brand">
          <h1>{t('app.title')}</h1>
          <p>{t('app.subtitle')}</p>
        </div>

        <div className="language-switch" aria-label="Language switch">
          <button
            className={i18n.language === 'fr' ? 'active' : ''}
            type="button"
            onClick={() => switchLanguage('fr')}
          >
            FR
          </button>
          <button
            className={i18n.language === 'en' ? 'active' : ''}
            type="button"
            onClick={() => switchLanguage('en')}
          >
            EN
          </button>
        </div>
      </header>

      <nav className="nav-grid">
        {routes.map(route => (
          <NavLink
            key={route.key}
            to={route.to}
            className={({ isActive }) => (isActive ? 'active' : '')}
            end={route.to === '/'}
          >
            {t(`app.routes.${route.key}`)}
          </NavLink>
        ))}
      </nav>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/matches" element={<MatchesPage />} />
        <Route path="/teams" element={<TeamsPage />} />
        <Route path="/players" element={<PlayersPage />} />
        <Route path="/competitions" element={<CompetitionsPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/follows" element={<FollowsPage />} />
        <Route path="/legal/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/legal/terms" element={<TermsOfUsePage />} />
        <Route path="/legal/cookies" element={<CookiesPolicyPage />} />
        <Route path="/legal/data-deletion" element={<DataDeletionPage />} />
      </Routes>

      <footer className="legal-footer">
        <span>{t('app.legal.footerTitle')}</span>
        {legalRoutes.map(route => (
          <NavLink key={route.key} to={route.to}>
            {t(`app.legal.routes.${route.key}`)}
          </NavLink>
        ))}
        <p className="legal-disclaimer">{t('app.legal.disclaimer')}</p>
      </footer>
    </div>
  );
}
