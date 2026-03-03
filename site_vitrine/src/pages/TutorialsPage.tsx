import { Reveal } from '@/components/Reveal';
import { tutorialSteps } from '@/features/tutorials/content';
import { usePageMeta } from '@/lib/seo';

export function TutorialsPage() {
  usePageMeta({
    title: 'Tutoriels FootAlert | Site officiel',
    description:
      'Apprends à utiliser FootAlert avec des tutoriels pratiques: onboarding, suivi de matchs et notifications.',
    path: '/tutorials',
  });

  return (
    <section className="page-stack" aria-label="Tutoriels FootAlert">
      <header className="panel-card">
        <p className="eyebrow">Tutoriels</p>
        <h1>Prise en main guidée de FootAlert</h1>
        <p>
          Une approche progressive pour tirer le meilleur de l’application mobile, sans complexité.
        </p>
      </header>

      <div className="tutorial-grid">
        {tutorialSteps.map((step, index) => (
          <Reveal key={step.id} delay={index * 0.06}>
            <article className="panel-card tutorial-card">
              <h2>{step.title}</h2>
              <p>{step.description}</p>
              <ul>
                {step.points.map(point => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
