import { NavLink } from 'react-router-dom';

import type { NavItem } from '@/types/navigation';

const navItems: NavItem[] = [
  { to: '/', label: 'Accueil' },
  { to: '/tutorials', label: 'Tutoriels' },
  { to: '/scores', label: 'Scores' },
  { to: '/support', label: 'Support' },
  { to: '/social', label: 'Suivez-nous' },
];

export function SiteHeader() {
  return (
    <header className="site-header" role="banner">
      <NavLink to="/" className="brand" aria-label="FootAlert accueil">
        <span className="brand-dot" aria-hidden="true" />
        <span>
          <strong>FootAlert</strong>
          <small>Compagnon live football</small>
        </span>
      </NavLink>

      <nav className="site-nav" aria-label="Navigation principale">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            end={item.to === '/'}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
