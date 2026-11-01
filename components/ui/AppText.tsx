import { Text, type TextProps } from 'react-native';
import { useLanguage } from '@/i18n/LanguageProvider';
import { useTheme } from '@/theme/ThemeProvider';

export type TextVariant = 'title' | 'heading' | 'body' | 'bodyStrong' | 'caption' | 'section';
export type TextTone = 'default' | 'muted' | 'primary' | 'danger' | 'onBand' | 'onPrimary' | 'onAccent';

const VARIANTS = {
  title: { weight: 'extrabold', size: 24, lineHeight: 34 },
  heading: { weight: 'bold', size: 18, lineHeight: 28 },
  body: { weight: 'regular', size: 15, lineHeight: 24 },
  bodyStrong: { weight: 'semibold', size: 15, lineHeight: 24 },
  caption: { weight: 'regular', size: 12.5, lineHeight: 20 },
  section: { weight: 'bold', size: 12.5, lineHeight: 20 },
} as const;

export function AppText({
  variant = 'body',
  tone = 'default',
  style,
  ...rest
}: TextProps & { variant?: TextVariant; tone?: TextTone }) {
  const { c, font } = useTheme();
  const { lang } = useLanguage();
  const v = VARIANTS[variant];
  const color = {
    default: c.text,
    muted: c.muted,
    primary: c.primary,
    danger: c.danger,
    onBand: '#FFFFFF',
    onPrimary: c.onPrimary,
    onAccent: c.onAccent,
  }[tone];
  // Uppercase and letter-spacing only make sense in English; spacing breaks Arabic letter joins.
  const sectionStyle = variant === 'section' && lang === 'en' ? { textTransform: 'uppercase' as const, letterSpacing: 0.8 } : null;
  return (
    <Text
      {...rest}
      style={[{ fontFamily: font[v.weight], fontSize: v.size, lineHeight: v.lineHeight, color }, sectionStyle, style]}
    />
  );
}
