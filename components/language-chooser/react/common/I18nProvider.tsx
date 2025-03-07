import React, { useState, useEffect } from 'react';
import { I18nProvider as LinguiI18nProvider } from '@lingui/react';
import { i18n, initI18n } from './i18n';

interface I18nProviderProps {
  locale?: string;
  children: React.ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ 
  locale = 'en',
  children 
}) => {
  const [isI18nInitialized, setIsI18nInitialized] = useState(false);

  useEffect(() => {
    const setupI18n = async () => {
      await initI18n(locale);
      setIsI18nInitialized(true);
    };
    
    setupI18n();
  }, [locale]);

  if (!isI18nInitialized) {
    // You can replace this with a loading indicator if needed
    return null;
  }

  return (
    <LinguiI18nProvider i18n={i18n}>
      {children}
    </LinguiI18nProvider>
  );
};