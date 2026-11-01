import { type ReactNode, useId } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Defs, G, Path, Pattern, Rect } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';

/** The header band: Nile teal with a faint mashrabiya star tile (two squares, one turned 45°). */
export function PatternBand({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  // Each band needs its own pattern id: on web, ids are shared across the whole page.
  const patternId = `mashrabiya${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View style={[{ backgroundColor: c.band, overflow: 'hidden' }, style]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
        <Defs>
          <Pattern id={patternId} patternUnits="userSpaceOnUse" width={34} height={34}>
            <G fill="none" stroke="#FFFFFF" strokeOpacity={0.17} strokeWidth={1}>
              <Rect x={9} y={9} width={16} height={16} />
              <Rect x={9} y={9} width={16} height={16} transform="rotate(45 17 17)" />
              <Path d="M0 17H3.7M30.3 17H34M17 0V3.7M17 30.3V34" />
            </G>
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </Svg>
      {children}
    </View>
  );
}
