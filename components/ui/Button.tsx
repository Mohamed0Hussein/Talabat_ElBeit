import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from './AppText';

type Props = {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'accent' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, onPress, variant = 'primary', loading, disabled, icon, style }: Props) {
  const { c, radius } = useTheme();
  const colors = {
    primary: { bg: c.primary, fg: c.onPrimary, border: c.primary },
    accent: { bg: c.accent, fg: c.onAccent, border: c.accent },
    ghost: { bg: 'transparent', fg: c.primary, border: c.line },
    danger: { bg: 'transparent', fg: c.danger, border: c.danger },
  }[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 48,
          borderRadius: radius.md,
          borderWidth: 1.5,
          borderColor: colors.border,
          backgroundColor: colors.bg,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: inactive ? 0.6 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={colors.fg} /> : null}
          <AppText variant="bodyStrong" style={{ color: colors.fg }}>
            {title}
          </AppText>
        </>
      )}
    </Pressable>
  );
}
