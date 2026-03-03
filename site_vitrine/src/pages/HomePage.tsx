import { motion } from 'framer-motion';

import { HeroMockup } from '@/components/HeroMockup';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Reveal } from '@/components/Reveal';
import { usePageMeta } from '@/lib/seo';

const pillars = [
  {
    title: 'Clarté en direct',
    description:
      'Un affichage net du score et du statut match pour rester concentré sur l’essentiel.',
  },
  {
    title: 'Notifications intelligentes',
    description:
      'Paramètre les alertes utiles selon tes équipes et compétitions sans surcharge inutile.',
  },
  {
    title: 'Cadre légal transparent',
    description:
      'Politique de confidentialité et conditions d’utilisation accessibles publiquement.',
  },
];

export function HomePage() {
  usePageMeta({
    title: 'FootAlert | Site officiel',
    description:
      'Découvrez FootAlert: application mobile football, tutoriels pas-à-pas, scores en direct et pages légales publiques.',
    path: '/',
  });

  return (
    <div className="page-stack">
      <section className="hero">
        <div>
          <motion.p className="eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            FOOTBALL • LIVE • MOBILE-FIRST
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            La vitrine officielle de l’app FootAlert.
          </motion.h1>
          <motion.p
            className="hero-copy"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            Explore les tutoriels interactifs, consulte les scores du jour et accède aux informations
            légales en toute transparence.
          </motion.p>

          <div className="hero-cta">
            <PrimaryButton to="/tutorials">Voir les tutoriels</PrimaryButton>
            <PrimaryButton to="/scores">Voir les scores</PrimaryButton>
          </div>
        </div>
        <HeroMockup />
      </section>

      <section className="pillars" aria-label="Atouts FootAlert">
        {pillars.map((pillar, index) => (
          <Reveal key={pillar.title} delay={index * 0.08}>
            <article className="panel-card">
              <h2>{pillar.title}</h2>
              <p>{pillar.description}</p>
            </article>
          </Reveal>
        ))}
      </section>

      <Reveal>
        <section className="panel-card legal-highlight">
          <h2>Confiance et conformité</h2>
          <p>
            Les pages légales sont publiques, en HTTPS, et directement reliées aux liens utilisés dans
            l’application mobile.
          </p>
          <div className="inline-links">
            <PrimaryButton to="/legal/privacy">Politique de confidentialité</PrimaryButton>
            <PrimaryButton to="/legal/terms">Conditions d&apos;utilisation</PrimaryButton>
          </div>
        </section>
      </Reveal>
    </div>
  );
}
