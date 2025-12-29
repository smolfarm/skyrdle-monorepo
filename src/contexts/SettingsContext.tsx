import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Settings {
  colorblindMode: boolean;
}

interface SettingsContextType {
  settings: Settings;
  setColorblindMode: (enabled: boolean) => void;
}

const COOKIE_NAME = 'skyrdle_settings';
const COOKIE_EXPIRY_DAYS = 365;

const defaultSettings: Settings = {
  colorblindMode: false,
};

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, days: number): void {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function loadSettings(): Settings {
  try {
    const cookie = getCookie(COOKIE_NAME);
    if (cookie) {
      return { ...defaultSettings, ...JSON.parse(cookie) };
    }
  } catch (e) {
    console.error('Failed to load settings from cookie:', e);
  }
  return defaultSettings;
}

function saveSettings(settings: Settings): void {
  setCookie(COOKIE_NAME, JSON.stringify(settings), COOKIE_EXPIRY_DAYS);
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (settings.colorblindMode) {
      document.body.classList.add('colorblind');
    } else {
      document.body.classList.remove('colorblind');
    }
  }, [settings.colorblindMode]);

  const setColorblindMode = (enabled: boolean) => {
    setSettings(prev => ({ ...prev, colorblindMode: enabled }));
  };

  return (
    <SettingsContext.Provider value={{ settings, setColorblindMode }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextType {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
