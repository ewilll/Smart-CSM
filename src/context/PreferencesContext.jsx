import React, { createContext, useContext, useState, useEffect } from 'react';

const PreferencesContext = createContext({});

export function PreferencesProvider({ children }) {
    const getInitialTheme = () => {
        const savedTheme = localStorage.getItem('smart_csm_theme') || 'light';
        return ['light', 'dark'].includes(savedTheme) ? savedTheme : 'light';
    };

    const [theme, setTheme] = useState(getInitialTheme);
    const [language, setLanguage] = useState(localStorage.getItem('smart_csm_language') || 'EN');
    const [font, setFont] = useState(localStorage.getItem('smart_csm_font') || 'inter');

    useEffect(() => {
        // Apply theme classes to html or body tag
        const root = document.documentElement;

        // Handle Theme
        root.classList.remove('theme-light', 'theme-dark', 'theme-dim', 'theme-oled');
        root.classList.add(`theme-${theme}`);
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }

        // Handle Font Family
        root.classList.remove('font-inter', 'font-roboto', 'font-sans', 'font-mono');
        root.classList.add(`font-${font}`);

        localStorage.setItem('smart_csm_theme', theme);
        localStorage.setItem('smart_csm_language', language);
        localStorage.setItem('smart_csm_font', font);
    }, [theme, language, font]);

    const value = {
        theme, setTheme,
        language, setLanguage,
        font, setFont
    };

    return (
        <PreferencesContext.Provider value={value}>
            {children}
        </PreferencesContext.Provider>
    );
}

export const usePreferences = () => useContext(PreferencesContext);
