import { useTranslation } from 'react-i18next';

export function HomePage() {
  const { t } = useTranslation();

  return (
    <div className="content-card">
      <h2>{t('app.routes.home')}</h2>
      <p>
        API-first web client connected to the same BFF contracts as mobile. This surface exposes
        read flows for matches, teams, players, competitions, follows and search.
      </p>
      <p>
        Security note: signed technical endpoints (<code>/v1/notifications/*</code>,{' '}
        <code>/v1/telemetry/*</code>) remain mobile-only.
      </p>
    </div>
  );
}
