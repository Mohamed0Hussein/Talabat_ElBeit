import { Pressable } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from './AppText';

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { c, radius } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 36,
        paddingHorizontal: 14,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: selected ? c.primary : c.line,
        backgroundColor: selected ? c.primary : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <AppText variant={selected ? 'bodyStrong' : 'body'} tone={selected ? 'onPrimary' : 'default'} style={{ fontSize: 14 }}>
        {label}
      </AppText>
    </Pressable>
  );
}
