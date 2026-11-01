import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';

export default function NotFoundScreen() {
  const { t } = useTranslation();
  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
        <AppText variant="heading">{t('notFound.title')}</AppText>
        <Link href="/" replace>
          <AppText variant="bodyStrong" tone="primary">
            {t('notFound.home')}
          </AppText>
        </Link>
      </View>
    </Screen>
  );
}
