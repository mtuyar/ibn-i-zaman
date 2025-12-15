import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  Appearance,
  ColorSchemeName,
  Platform,
  useColorScheme as useSystemColorScheme,
} from 'react-native';

const THEME_STORAGE_KEY = 'theme_preference';

export type ThemePreference = 'system' | 'light' | 'dark';

type ThemeContextValue = {
  colorScheme: NonNullable<ColorSchemeName>;
  preference: ThemePreference;
  isDarkMode: boolean;
  isUsingSystem: boolean;
  isReady: boolean;
  toggleTheme: () => Promise<void>;
  setPreference: (preference: ThemePreference) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

type AppearanceListener = (preferences: { colorScheme: ColorSchemeName | null | undefined }) => void;

type AppearanceWithOverride = typeof Appearance & {
  setColorScheme?: (scheme: ColorSchemeName | null | undefined) => void;
  addChangeListener: (listener: AppearanceListener) => { remove: () => void };
  getColorScheme: () => ColorSchemeName | null | undefined;
};

const appearanceWithOverride = Appearance as AppearanceWithOverride;

const ensureWebAppearancePatch = (() => {
  let patched = false;

  return () => {
    if (patched || Platform.OS !== 'web') {
      return;
    }

    if (typeof appearanceWithOverride.setColorScheme === 'function') {
      patched = true;
      return;
    }

    let overrideScheme: ColorSchemeName | null = null;
    const listeners = new Set<AppearanceListener>();
    const originalAddChangeListener = appearanceWithOverride.addChangeListener.bind(appearanceWithOverride);
    const originalGetColorScheme = appearanceWithOverride.getColorScheme.bind(appearanceWithOverride);

    appearanceWithOverride.addChangeListener = (listener: AppearanceListener) => {
      listeners.add(listener);
      const subscription = originalAddChangeListener(preferences => {
        const nextScheme = (overrideScheme ?? preferences.colorScheme ?? 'light') as ColorSchemeName;
        listener({ colorScheme: nextScheme });
      });

      return {
        remove() {
          listeners.delete(listener);
          subscription?.remove?.();
        },
      };
    };

    appearanceWithOverride.setColorScheme = scheme => {
      overrideScheme = scheme ?? null;
      const nextScheme = (overrideScheme ?? originalGetColorScheme() ?? 'light') as ColorSchemeName;
      listeners.forEach(listener => listener({ colorScheme: nextScheme }));
    };

    appearanceWithOverride.getColorScheme = () => {
      const systemScheme = originalGetColorScheme() ?? 'light';
      return (overrideScheme ?? systemScheme) as ColorSchemeName;
    };

    patched = true;
  };
})();

ensureWebAppearancePatch();

type ThemeProviderProps = {
  children: React.ReactNode;
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = (useSystemColorScheme() ?? 'light') as NonNullable<ColorSchemeName>;
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [isReady, setIsReady] = useState(false);

  const setAppearanceScheme = useCallback((scheme: ColorSchemeName | null) => {
    if (typeof appearanceWithOverride.setColorScheme === 'function') {
      try {
        appearanceWithOverride.setColorScheme(scheme);
      } catch (error) {
        console.warn('Tema görünümü uygulanırken hata oluştu:', error);
      }
    }
  }, []);

  const savePreference = useCallback(
    async (next: ThemePreference) => {
      setPreferenceState(next);

      try {
        if (next === 'system') {
          await AsyncStorage.removeItem(THEME_STORAGE_KEY);
          setAppearanceScheme(null);
        } else {
          await AsyncStorage.setItem(THEME_STORAGE_KEY, next);
          setAppearanceScheme(next);
        }
      } catch (error) {
        console.warn('Tema tercihi kaydedilirken hata oluştu:', error);
        throw error;
      }
    },
    [setAppearanceScheme]
  );

  useEffect(() => {
    let isMounted = true;

    const loadPreference = async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (!isMounted) {
          return;
        }

        if (stored === 'light' || stored === 'dark') {
          setPreferenceState(stored);
          setAppearanceScheme(stored);
        } else {
          setAppearanceScheme(null);
        }
      } catch (error) {
        console.warn('Tema tercihi yüklenirken hata oluştu:', error);
      } finally {
        if (isMounted) {
          setIsReady(true);
        }
      }
    };

    loadPreference();

    return () => {
      isMounted = false;
    };
  }, [setAppearanceScheme]);

  const toggleTheme = useCallback(async () => {
    const nextPreference: ThemePreference = systemColorScheme === 'dark' ? 'light' : 'dark';
    await savePreference(nextPreference);
  }, [savePreference, systemColorScheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      colorScheme: systemColorScheme,
      preference,
      isDarkMode: systemColorScheme === 'dark',
      isUsingSystem: preference === 'system',
      isReady,
      toggleTheme,
      setPreference: savePreference,
    }),
    [systemColorScheme, preference, isReady, toggleTheme, savePreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme hook must be used within a ThemeProvider');
  }
  return context;
};



