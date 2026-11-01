import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { type Edge, SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';

export function Screen({ children, edges = ['top', 'bottom'], style }: { children: ReactNode; edges?: Edge[]; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor: c.bg }, style]}>{children}</SafeAreaView>;
}
