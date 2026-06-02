import React from 'react';
import { AppLanguage, getIntlPreferences, translate, translateText } from './international';

export const useI18n = () => {
  const [language, setLanguage] = React.useState<AppLanguage>(getIntlPreferences().language);

  React.useEffect(() => {
    const sync = () => setLanguage(getIntlPreferences().language);
    window.addEventListener('intl:updated', sync as EventListener);
    return () => window.removeEventListener('intl:updated', sync as EventListener);
  }, []);

  const t = React.useCallback((key: string) => translate(language, key), [language]);
  const tp = React.useCallback((text: string) => translateText(language, text), [language]);

  return { language, t, tp };
};
