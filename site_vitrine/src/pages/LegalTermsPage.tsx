import { usePageMeta } from '@/lib/seo';

const LAST_UPDATED = '03 mars 2026';
const TERMS_VERSION = 'terms-fr-v1.0.0';

export function LegalTermsPage() {
  usePageMeta({
    title: "Conditions d'utilisation | FootAlert",
    description:
      "Consulte les conditions d'utilisation de FootAlert: cadre d'usage, responsabilité, propriété intellectuelle et accès au service.",
    path: '/legal/terms',
  });

  return (
    <article className="panel-card legal-document" aria-label="Conditions d'utilisation FootAlert">
      <p className="eyebrow">Juridique</p>
      <h1>Conditions d&apos;utilisation</h1>
      <p className="legal-meta">
        Version: {TERMS_VERSION} • Dernière mise à jour: {LAST_UPDATED}
      </p>

      <section>
        <h2>1. Objet</h2>
        <p>
          FootAlert fournit des informations football en temps réel à titre informatif. Le service est
          accessible selon les disponibilités techniques.
        </p>
      </section>

      <section>
        <h2>2. Règles d’usage</h2>
        <p>
          L’utilisateur s’engage à utiliser le service de manière licite, sans tenter d’altérer son
          fonctionnement ni contourner ses mécanismes de sécurité.
        </p>
      </section>

      <section>
        <h2>3. Responsabilité</h2>
        <p>
          Malgré nos efforts de fiabilité, des retards ou imprécisions ponctuelles peuvent exister dans
          les flux de scores. Les contenus prédictifs, s’ils existent, restent purement informatifs.
        </p>
      </section>

      <section>
        <h2>4. Propriété intellectuelle</h2>
        <p>
          Le nom FootAlert, ses éléments graphiques, son code et ses contenus éditoriaux sont protégés
          et ne peuvent être reproduits sans autorisation.
        </p>
      </section>

      <section>
        <h2>5. Modification des conditions</h2>
        <p>
          Ces conditions peuvent évoluer. La version en vigueur est toujours publiée sur cette page.
        </p>
      </section>
    </article>
  );
}
