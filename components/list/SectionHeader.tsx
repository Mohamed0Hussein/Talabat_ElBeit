import { Pressable, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { useTheme } from '@/theme/ThemeProvider';

type Props = { title: string; count: string; action?: { label: string; onPress: () => void } };

export function SectionHeader({ title, count, action }: Props) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 18, paddingBottom: 6, backgroundColor: c.bg }}>
      <AppText variant="section" tone="muted" accessibilityRole="header" style={{ flex: 1 }}>
        {title} · {count}
      </AppText>
      {action ? (
        <Pressable accessibilityRole="button" onPress={action.onPress} hitSlop={10}>
          <AppText variant="section" tone="primary">
            {action.label}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}
