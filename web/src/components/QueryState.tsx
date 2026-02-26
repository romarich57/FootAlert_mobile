import { useTranslation } from 'react-i18next';

type QueryStateProps = {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  isEmpty: boolean;
};

export function QueryState({ isLoading, isError, error, isEmpty }: QueryStateProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return <div className="state">{t('app.states.loading')}</div>;
  }

  if (isError) {
    return (
      <div className="state error">
        {t('app.states.error')}
        {error instanceof Error ? `: ${error.message}` : ''}
      </div>
    );
  }

  if (isEmpty) {
    return <div className="state">{t('app.states.empty')}</div>;
  }

  return null;
}
