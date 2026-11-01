import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Chip } from '@/components/ui/Chip';
import { useLanguage } from '@/i18n/LanguageProvider';

export function LanguageToggle() {
  const { lang, setLang } = useLanguage();
  const { t } = useTranslation();
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Chip label={t('language.en')} selected={lang === 'en'} onPress={() => setLang('en')} />
      <Chip label={t('language.ar')} selected={lang === 'ar'} onPress={() => setLang('ar')} />
    </View>
  );
}
