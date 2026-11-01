import { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from './AppText';

export const SNACKBAR_MS = 5000;

type Props = {
  visible: boolean;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onHide: () => void;
  bottom: number;
};

export function Snackbar({ visible, message, actionLabel, onAction, onHide, bottom }: Props) {
  const { c, radius } = useTheme();

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onHide, SNACKBAR_MS);
    return () => clearTimeout(timer);
  }, [visible, message, onHide]);

  if (!visible) return null;
  return (
    <Animated.View
      entering={FadeInDown.duration(180)}
      exiting={FadeOutDown.duration(180)}
      accessibilityLiveRegion="polite"
      style={{
        position: 'absolute',
        start: 16,
        end: 16,
        bottom,
        borderRadius: radius.md,
        backgroundColor: c.text,
        paddingVertical: 10,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <AppText variant="bodyStrong" style={{ flex: 1, color: c.bg }} numberOfLines={2}>
        {message}
      </AppText>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
          <AppText variant="bodyStrong" style={{ color: c.accent }}>
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}
