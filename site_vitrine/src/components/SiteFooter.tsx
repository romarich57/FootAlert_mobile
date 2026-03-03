import { NavLink } from 'react-router-dom';

export function SiteFooter() {
  return (
    <footer className="site-footer" role="contentinfo">
      <div className="footer-grid">
        <section>
          <h3>FootAlert</h3>
          <p>
            Une vitrine claire pour comprendre l&apos;application mobile, ses tutoriels et son cadre
            légal.
          </p>
        </section>

        <section>
          <h3>Ressources</h3>
          <ul>
            <li>
              <NavLink to="/tutorials">Tutoriels</NavLink>
            </li>
            <li>
              <NavLink to="/scores">Scores</NavLink>
            </li>
            <li>
              <NavLink to="/support">Support</NavLink>
            </li>
          </ul>
        </section>

        <section>
          <h3>Juridique</h3>
          <ul>
            <li>
              <NavLink to="/legal/privacy">Politique de confidentialité</NavLink>
            </li>
            <li>
              <NavLink to="/legal/terms">Conditions d&apos;utilisation</NavLink>
            </li>
          </ul>
        </section>
      </div>
      <p className="copyright">© {new Date().getFullYear()} FootAlert. Tous droits réservés.</p>
    </footer>
  );
}
