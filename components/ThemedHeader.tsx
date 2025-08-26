// components/CustomHeader.tsx
import { HeaderBackButton } from '@react-navigation/elements';
import { useNavigation } from '@react-navigation/native';
import { useColorScheme } from 'react-native';
import { Colors } from '../themes/colors';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

export default function ThemedHeader({ title }: { title: string }) {
  const scheme = useColorScheme();
  const themeColors = scheme === 'dark' ? Colors.dark : Colors.light;
  const navigation = useNavigation();

  return (
    <ThemedView
      style={{
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottomWidth: 1,
        borderBottomColor: themeColors.headerBorder,
        paddingHorizontal: 16,
      }}
    >
      {navigation.canGoBack() && (
        <HeaderBackButton
          tintColor={themeColors.headerText}
          onPress={navigation.goBack}
          style={{ position: 'absolute', left: 16 }}
        />
      )}
      <ThemedText style={{ fontSize: 18, fontWeight: '600' }}>
        {title}
      </ThemedText>
    </ThemedView>
  );
}