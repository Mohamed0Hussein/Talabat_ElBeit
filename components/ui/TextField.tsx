import { forwardRef, useState } from 'react';
import { TextInput, type TextInputProps, View } from 'react-native';
import { useLanguage } from '@/i18n/LanguageProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from './AppText';

type Props = TextInputProps & { label: string; error?: string | null; hint?: string };

export const TextField = forwardRef<TextInput, Props>(function TextField({ label, error, hint, style, ...rest }, ref) {
  const { c, radius, font } = useTheme();
  const { isRTL } = useLanguage();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <AppText variant="caption" tone="muted" style={{ fontFamily: font.semibold }}>
        {label}
      </AppText>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        placeholderTextColor={c.muted}
        {...rest}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        style={[
          {
            minHeight: 48,
            borderRadius: radius.md,
            backgroundColor: c.field,
            borderWidth: 1.5,
            borderColor: error ? c.danger : focused ? c.primary : 'transparent',
            paddingHorizontal: 14,
            color: c.text,
            fontFamily: font.semibold,
            fontSize: 16,
            textAlign: isRTL ? 'right' : 'left',
          },
          style,
        ]}
      />
      {error ? (
        <AppText variant="caption" tone="danger">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" tone="muted">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
});
