import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';
import { useDelayedFlag } from '@/hooks/useDelayedFlag';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from './AppText';

const HINT_AFTER_MS = 6000;

/** A spinner that explains itself if the wait drags on (usually no internet). */
export function LoadingState() {
  const { c } = useTheme();
  const { t } = useTranslation();
  const slow = useDelayedFlag(true, HINT_AFTER_MS);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 }}>
      {slow ? <Ionicons name="cloud-offline-outline" size={40} color={c.muted} /> : null}
      <ActivityIndicator color={c.primary} size="large" />
      {slow ? (
        <View style={{ gap: 4, alignItems: 'center' }} accessibilityLiveRegion="polite">
          <AppText variant="heading" style={{ textAlign: 'center' }}>
            {t('common.waitingTitle')}
          </AppText>
          <AppText tone="muted" style={{ textAlign: 'center' }}>
            {t('common.waitingBody')}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}
