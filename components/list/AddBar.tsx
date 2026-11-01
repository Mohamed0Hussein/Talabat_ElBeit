import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { useTheme } from '@/theme/ThemeProvider';

/** The slim bar at the bottom of the list; both parts open the add sheet. */
export function AddBar({ onPress }: { onPress: () => void }) {
  const { c, radius } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 10,
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: insets.bottom + 10,
        backgroundColor: c.surface,
        borderTopWidth: 1,
        borderTopColor: c.line,
      }}
    >
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={{ flex: 1, minHeight: 48, borderRadius: radius.md, backgroundColor: c.field, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14 }}
      >
        <Ionicons name="basket-outline" size={18} color={c.muted} />
        <AppText tone="muted">{t('list.addPlaceholder')}</AppText>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('addItem.title')}
        onPress={onPress}
        style={({ pressed }) => ({
          width: 48,
          height: 48,
          borderRadius: radius.md,
          backgroundColor: c.accent,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Ionicons name="add" size={26} color={c.onAccent} />
      </Pressable>
    </View>
  );
}
