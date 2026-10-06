import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UIMode, LanguageCode } from '../types';
import { DICTIONARY } from '../config/languages';

interface UIContextType {
  uiMode: UIMode;
  setUIMode: (mode: UIMode) => void;
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string) => string;
  isOnboardingOpen: boolean;
  setIsOnboardingOpen: (open: boolean) => void;
  completeOnboarding: (mode: UIMode, lang: LanguageCode) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [uiMode, setUIModeState] = useState<UIMode>(() => {
    return (localStorage.getItem('nagrikq_mode') as UIMode) || 'modern';
  });

  const [language, setLanguageState] = useState<LanguageCode>(() => {
    return (localStorage.getItem('nagrikq_lang') as LanguageCode) || 'en';
  });

  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);

  useEffect(() => {
    document.body.classList.remove('mode-modern', 'mode-simple');
    document.body.classList.add(`mode-${uiMode}`);
    localStorage.setItem('nagrikq_mode', uiMode);
  }, [uiMode]);

  useEffect(() => {
    localStorage.setItem('nagrikq_lang', language);
  }, [language]);

  const setUIMode = (mode: UIMode) => {
    setUIModeState(mode);
  };

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    const langDict = DICTIONARY[language] || DICTIONARY['en'];
    return langDict[key] || DICTIONARY['en'][key] || key;
  };

  const completeOnboarding = (mode: UIMode, lang: LanguageCode) => {
    setUIModeState(mode);
    setLanguageState(lang);
    localStorage.setItem('nagrikq_onboarded', 'true');
    setIsOnboardingOpen(false);
  };

  return (
    <UIContext.Provider
      value={{
        uiMode,
        setUIMode,
        language,
        setLanguage,
        t,
        isOnboardingOpen,
        setIsOnboardingOpen,
        completeOnboarding,
      }}
    >
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};
