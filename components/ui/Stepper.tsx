import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { useLanguage } from '@/i18n/LanguageProvider';
import { formatNumber } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from './AppText';

type Props = { value: number; onChange: (n: number) => void; min?: number; max?: number };

export function Stepper({ value, onChange, min = 1, max = 999 }: Props) {
  const { c, radius } = useTheme();
  const { lang } = useLanguage();
  const { t } = useTranslation();
  const button = (icon: 'remove' | 'add', label: string, next: number, disabled: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => onChange(next)}
      hitSlop={6}
      style={{ width: 40, height: 48, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.35 : 1 }}
    >
      <Ionicons name={icon} size={20} color={c.primary} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.field, borderRadius: radius.md }}>
      {button('remove', t('common.decrease'), Math.max(min, value - 1), value <= min)}
      <AppText variant="heading" style={{ minWidth: 28, textAlign: 'center' }} accessibilityLiveRegion="polite">
        {formatNumber(value, lang)}
      </AppText>
      {button('add', t('common.increase'), Math.min(max, value + 1), value >= max)}
    </View>
  );
}
