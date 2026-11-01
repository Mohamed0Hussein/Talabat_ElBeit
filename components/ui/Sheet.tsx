import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';

type Props = { visible: boolean; onClose: () => void; children: ReactNode; closeLabel: string };

export function Sheet({ visible, onClose, children, closeLabel }: Props) {
  const { c, radius } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          onPress={onClose}
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
        />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            style={{
              backgroundColor: c.surface,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              paddingHorizontal: 16,
              paddingTop: 8,
              paddingBottom: insets.bottom + 16,
              gap: 14,
            }}
          >
            <View style={{ alignSelf: 'center', width: 38, height: 4, borderRadius: 2, backgroundColor: c.line }} />
            {children}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
