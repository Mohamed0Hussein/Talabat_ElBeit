import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

/** Visual only: the row around it handles the press and announces the state. */
export function Checkbox({ checked }: { checked: boolean }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: c.primary,
        backgroundColor: checked ? c.primary : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {checked ? <Ionicons name="checkmark" size={16} color={c.onPrimary} /> : null}
    </View>
  );
}
