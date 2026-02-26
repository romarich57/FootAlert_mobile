import { NavLink, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { CompetitionsPage } from '@/pages/CompetitionsPage';
import { FollowsPage } from '@/pages/FollowsPage';
import { HomePage } from '@/pages/HomePage';
import { MatchesPage } from '@/pages/MatchesPage';
import { PlayersPage } from '@/pages/PlayersPage';
import { SearchPage } from '@/pages/SearchPage';
import { TeamsPage } from '@/pages/TeamsPage';

const routes = [
  { to: '/', key: 'home' },
  { to: '/matches', key: 'matches' },
  { to: '/teams', key: 'teams' },
  { to: '/players', key: 'players' },
  { to: '/competitions', key: 'competitions' },
  { to: '/search', key: 'search' },
  { to: '/follows', key: 'follows' },
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
      </Routes>
    </div>
  );
}
