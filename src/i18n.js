// Gedeelde i18n voor de CTF-formulieren-apps (NL/EN). Gebaseerd op de
// context-variant uit ctfveiligheid — de meest volwassen van de vier
// handgeschreven implementaties. Elke app levert z'n eigen woordenboek aan:
//
//   import { LanguageProvider, useTranslation, LanguageSwitcher } from 'ctf-ui/i18n';
//   const translations = { nl: {...}, en: {...} };
//   <LanguageProvider translations={translations}>
//     <LanguageSwitcher />
//     ... const { t, language } = useTranslation(); ... t('formTitle')
//   </LanguageProvider>

import React, { createContext, useContext, useState } from 'react';

const LanguageContext = createContext(undefined);

export const LanguageProvider = ({ translations, defaultLanguage = 'nl', children }) => {
    const [language, setLanguage] = useState(defaultLanguage);
    return (
        <LanguageContext.Provider value={{ language, setLanguage, translations }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useTranslation = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useTranslation moet binnen een LanguageProvider gebruikt worden');
    }
    const { language, setLanguage, translations } = context;
    const t = (key) => (translations?.[language]?.[key]) ?? key;
    return { t, language, setLanguage };
};

// NL/EN-schakelaar. Standaard de stijl uit ctfveiligheid (cyaan pilletjes,
// rechtsboven); via props aan te passen voor lichte achtergronden.
export const LanguageSwitcher = ({
    languages = ['nl', 'en'],
    className = 'absolute top-4 right-4 flex space-x-2',
    activeClass = 'bg-cyan-400 text-[#20747F] font-bold',
    inactiveClass = 'bg-white/20 text-white',
}) => {
    const { language, setLanguage } = useTranslation();
    return (
        <div className={className}>
            {languages.map((lang) => (
                <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${language === lang ? activeClass : inactiveClass}`}
                >
                    {lang.toUpperCase()}
                </button>
            ))}
        </div>
    );
};
