// Mashrabiya: Nile teal, saffron actions, a faint star-tile pattern on the header band.

export type Palette = {
  bg: string;
  surface: string;
  field: string;
  text: string;
  muted: string;
  line: string;
  primary: string;
  onPrimary: string;
  accent: string;
  onAccent: string;
  dueBg: string;
  dueText: string;
  danger: string;
  band: string;
};

export const palettes: { light: Palette; dark: Palette } = {
  light: {
    bg: '#F2F5F6',
    surface: '#FFFFFF',
    field: '#E9EEF0',
    text: '#0F232A',
    muted: '#56676E',
    line: '#DCE3E6',
    primary: '#0B5E6B',
    onPrimary: '#FFFFFF',
    accent: '#E39B2D',
    onAccent: '#2A1A00',
    dueBg: '#FBE7C4',
    dueText: '#714500',
    danger: '#C2412B',
    band: '#0B5E6B',
  },
  dark: {
    bg: '#08171B',
    surface: '#0F242A',
    field: '#163038',
    text: '#E3EFF1',
    muted: '#8FA7AE',
    line: '#1C363E',
    primary: '#4FBFCC',
    onPrimary: '#04252B',
    accent: '#F0B457',
    onAccent: '#2A1A00',
    dueBg: '#3F2E0E',
    dueText: '#F7CB7E',
    danger: '#FF7E66',
    band: '#0D3B43',
  },
};

export const radius = { sm: 6, md: 10, lg: 14, xl: 22, pill: 999 } as const;

export const space = (n: 1 | 2 | 3 | 4 | 5 | 6 | 8) => n * 4;

export const font = {
  regular: 'Cairo_400Regular',
  semibold: 'Cairo_600SemiBold',
  bold: 'Cairo_700Bold',
  extrabold: 'Cairo_800ExtraBold',
} as const;

/** Member avatar fills; the text on them is always dark. */
export const AVATAR_COLORS = ['#F2C6B4', '#BFD8F6', '#CDE8C5', '#F6DFA5', '#E3CFF5', '#F5C6D8'];
export const AVATAR_TEXT = '#1B1E22';
