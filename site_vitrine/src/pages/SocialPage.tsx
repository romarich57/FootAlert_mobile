import { resolveSocialLinks } from '@/lib/config';
import { usePageMeta } from '@/lib/seo';

export function SocialPage() {
  usePageMeta({
    title: 'Suivez FootAlert',
    description:
      'Retrouve FootAlert sur les réseaux sociaux officiels pour les annonces et nouveautés produit.',
    path: '/social',
  });

  const social = resolveSocialLinks();

  return (
    <section className="page-stack" aria-label="Réseaux sociaux FootAlert">
      <header className="panel-card">
        <p className="eyebrow">Suivez-nous</p>
        <h1>Réseaux sociaux officiels</h1>
        <p>Reste informé des nouveautés produit, mises à jour et annonces de roadmap.</p>
      </header>

      <div className="social-grid">
        <a className="panel-card social-link" href={social.x} target="_blank" rel="noreferrer">
          <h2>X / Twitter</h2>
          <p>{social.x}</p>
        </a>
        <a
          className="panel-card social-link"
          href={social.instagram}
          target="_blank"
          rel="noreferrer"
        >
          <h2>Instagram</h2>
          <p>{social.instagram}</p>
        </a>
        <a
          className="panel-card social-link"
          href={social.linkedin}
          target="_blank"
          rel="noreferrer"
        >
          <h2>LinkedIn</h2>
          <p>{social.linkedin}</p>
        </a>
      </div>
    </section>
  );
}
