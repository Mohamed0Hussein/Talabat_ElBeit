import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import * as Updates from 'expo-updates';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, DevSettings, I18nManager, Platform } from 'react-native';
import type { Lang } from '@/lib/types';
import i18n from './index';

const LANG_KEY = 'talabat.lang';
const RELOADED_FOR_KEY = 'talabat.rtlReloadedFor';

type LanguageContextValue = { lang: Lang; isRTL: boolean; setLang: (l: Lang) => Promise<void> };

const LanguageContext = createContext<LanguageContextValue | null>(null);

function deviceLang(): Lang {
  return getLocales()[0]?.languageCode === 'ar' ? 'ar' : 'en';
}

async function restart() {
  if (__DEV__) DevSettings.reload();
  else await Updates.reloadAsync();
}

/** React Native only flips layout direction on a restart, so a direction change reloads the app once. */
async function applyDirection(lang: Lang): Promise<'ok' | 'reloading' | 'needsReopen'> {
  const rtl = lang === 'ar';
  if (Platform.OS === 'web') {
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    return 'ok';
  }
  if (I18nManager.isRTL === rtl) return 'ok';
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
  // Guard against a reload loop if the platform ignores forceRTL.
  if ((await AsyncStorage.getItem(RELOADED_FOR_KEY)) === lang) return 'needsReopen';
  await AsyncStorage.setItem(RELOADED_FOR_KEY, lang);
  try {
    await restart();
    return 'reloading';
  } catch {
    return 'needsReopen';
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang | null>(null);

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(LANG_KEY).catch(() => null);
      const initial: Lang = stored === 'ar' || stored === 'en' ? stored : deviceLang();
      await i18n.changeLanguage(initial);
      const result = await applyDirection(initial);
      if (result !== 'reloading') setLangState(initial);
      if (result === 'ok') await AsyncStorage.removeItem(RELOADED_FOR_KEY);
    })();
  }, []);

  const setLang = useCallback(async (next: Lang) => {
    await AsyncStorage.setItem(LANG_KEY, next);
    await AsyncStorage.removeItem(RELOADED_FOR_KEY);
    await i18n.changeLanguage(next);
    setLangState(next);
    const result = await applyDirection(next);
    if (result === 'needsReopen') Alert.alert(i18n.t('settings.reopenTitle'), i18n.t('settings.reopenToApply'));
  }, []);

  const value = useMemo(() => (lang ? { lang, isRTL: lang === 'ar', setLang } : null), [lang, setLang]);
  if (!value) return null; // the splash screen stays up until the language is known
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('useLanguage must be used inside LanguageProvider');
  return value;
}
