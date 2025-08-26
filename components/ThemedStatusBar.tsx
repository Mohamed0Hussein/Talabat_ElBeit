import { Colors } from '@/themes/colors';
import { StatusBar, useColorScheme } from 'react-native';

export default function ThemedStatusBar() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  return (
    <StatusBar
      barStyle={isDark ? 'light-content' : 'dark-content'}
      backgroundColor={isDark ? Colors.dark.statusBar : Colors.light.statusBar}
    />
  );
}