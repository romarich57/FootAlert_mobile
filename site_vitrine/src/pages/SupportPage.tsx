import { resolveSupportEmail } from '@/lib/config';
import { usePageMeta } from '@/lib/seo';

const supportFaq = [
  {
    question: 'Comment signaler un problème de score ?',
    answer: 'Envoie un message au support avec la date, le match et une capture si possible.',
  },
  {
    question: 'Comment gérer mes notifications ?',
    answer:
      'Depuis l’application mobile, section réglages, tu peux activer/désactiver chaque type d’alerte.',
  },
  {
    question: 'Sous quel délai recevez-vous une réponse ?',
    answer: 'Nous visons une première réponse sous 24 à 48 heures ouvrées.',
  },
];

export function SupportPage() {
  usePageMeta({
    title: 'Support FootAlert',
    description:
      'Besoin d’aide ? Consulte la FAQ FootAlert et contacte le support via email en quelques secondes.',
    path: '/support',
  });

  const supportEmail = resolveSupportEmail();

  return (
    <section className="page-stack" aria-label="Support FootAlert">
      <header className="panel-card">
        <p className="eyebrow">Support</p>
        <h1>Aide et contact</h1>
        <p>
          Une question, un bug ou une demande spécifique ? Notre support est joignable directement.
        </p>
        <div className="hero-cta">
          <a className="btn btn-primary" href={`mailto:${supportEmail}`}>
            Contacter le support
          </a>
          <a
            className="btn btn-primary"
            href="https://apps.apple.com/app/id0000000000"
            target="_blank"
            rel="noreferrer"
          >
            App Store
          </a>
          <a
            className="btn btn-primary"
            href="https://play.google.com/store/apps/details?id=com.footalert.app"
            target="_blank"
            rel="noreferrer"
          >
            Google Play
          </a>
        </div>
      </header>

      <div className="faq-grid">
        {supportFaq.map(item => (
          <article key={item.question} className="panel-card">
            <h2>{item.question}</h2>
            <p>{item.answer}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
