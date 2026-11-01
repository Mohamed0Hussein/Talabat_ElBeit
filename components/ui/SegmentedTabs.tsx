import { Pressable, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from './AppText';

type Props<K extends string> = { options: { key: K; label: string }[]; value: K; onChange: (key: K) => void };

export function SegmentedTabs<K extends string>({ options, value, onChange }: Props<K>) {
  const { c, radius } = useTheme();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', backgroundColor: c.field, borderRadius: radius.pill, padding: 4 }}>
      {options.map((o) => {
        const selected = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.key)}
            style={{
              flex: 1,
              minHeight: 40,
              borderRadius: radius.pill,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selected ? c.surface : 'transparent',
              boxShadow: selected ? '0 1px 3px rgba(0,0,0,0.12)' : undefined,
            }}
          >
            <AppText variant="bodyStrong" tone={selected ? 'primary' : 'muted'}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
