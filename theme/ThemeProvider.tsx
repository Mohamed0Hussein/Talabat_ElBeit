import { createContext, type ReactNode, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { type Palette, font, palettes, radius, space } from './tokens';

type Theme = {
  scheme: 'light' | 'dark';
  c: Palette;
  space: typeof space;
  radius: typeof radius;
  font: typeof font;
};

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const value = useMemo<Theme>(() => ({ scheme, c: palettes[scheme], space, radius, font }), [scheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used inside ThemeProvider');
  return theme;
}
