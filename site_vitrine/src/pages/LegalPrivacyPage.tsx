import { resolveSupportEmail } from '@/lib/config';
import { usePageMeta } from '@/lib/seo';

const LAST_UPDATED = '03 mars 2026';
const POLICY_VERSION = 'privacy-fr-v1.0.0';

export function LegalPrivacyPage() {
  usePageMeta({
    title: 'Politique de confidentialité | FootAlert',
    description:
      'Politique de confidentialité FootAlert: collecte, usage, sécurité des données et droits utilisateurs.',
    path: '/legal/privacy',
  });

  const supportEmail = resolveSupportEmail();

  return (
    <article className="panel-card legal-document" aria-label="Politique de confidentialité FootAlert">
      <p className="eyebrow">Juridique</p>
      <h1>Politique de confidentialité</h1>
      <p className="legal-meta">
        Version: {POLICY_VERSION} • Dernière mise à jour: {LAST_UPDATED}
      </p>

      <section>
        <h2>1. Données collectées</h2>
        <p>
          Nous collectons les données strictement nécessaires au fonctionnement du service: préférences
          de suivi, paramètres de notifications, informations techniques minimales et métriques
          agrégées d’usage.
        </p>
      </section>

      <section>
        <h2>2. Usage des données</h2>
        <p>
          Les données servent à afficher les scores, personnaliser les notifications et améliorer la
          stabilité de l’application. Aucune revente de données personnelles n’est réalisée.
        </p>
      </section>

      <section>
        <h2>3. Conservation et sécurité</h2>
        <p>
          Les données sont protégées par des mesures techniques adaptées (chiffrement, contrôle
          d’accès, journalisation) et conservées selon une durée proportionnée aux finalités du
          service.
        </p>
      </section>

      <section>
        <h2>4. Droits des utilisateurs</h2>
        <p>
          Tu peux demander l’accès, la rectification ou la suppression de tes données en contactant le
          support.
        </p>
      </section>

      <section>
        <h2>5. Contact</h2>
        <p>
          Pour toute demande liée à la confidentialité: <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
        </p>
      </section>
    </article>
  );
}
