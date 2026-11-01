import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { AppText } from '@/components/ui/AppText';
import { Checkbox } from '@/components/ui/Checkbox';
import { useLanguage } from '@/i18n/LanguageProvider';
import { formatDue, formatNumber } from '@/lib/format';
import { dueStatus } from '@/lib/items';
import type { Item } from '@/lib/types';
import { useTheme } from '@/theme/ThemeProvider';

type Props = { item: Item; now: Date; onToggle: () => void; onDelete: () => void };

export function ItemRow({ item, now, onToggle, onDelete }: Props) {
  const { c, radius } = useTheme();
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const quantity = `${formatNumber(item.quantity, lang)} ${t(`units.${item.unit}`)}`;
  const status = item.bought ? 'none' : dueStatus(item.dueAt, now);
  const due =
    item.dueAt && !item.bought
      ? formatDue(item.dueAt, now, lang, { today: t('due.today'), tomorrow: t('due.tomorrow'), yesterday: t('due.yesterday') })
      : null;
  const who = item.bought && item.boughtBy ? t('list.boughtBy', { name: item.boughtBy }) : item.addedBy;

  const deleteAction = () => (
    <View style={{ width: 96, backgroundColor: c.danger, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
    </View>
  );

  return (
    <ReanimatedSwipeable
      friction={1.6}
      rightThreshold={72}
      overshootRight={false}
      renderRightActions={deleteAction}
      onSwipeableWillOpen={onDelete}
    >
      <Pressable
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.bought }}
        accessibilityLabel={`${item.name}, ${quantity}${due ? `, ${due}` : ''}`}
        accessibilityActions={[{ name: 'delete', label: t('common.delete') }]}
        onAccessibilityAction={(e) => e.nativeEvent.actionName === 'delete' && onDelete()}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 10,
          backgroundColor: pressed ? c.field : c.bg,
          borderBottomWidth: 1,
          borderBottomColor: c.line,
        })}
      >
        <Checkbox checked={item.bought} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText
            variant="bodyStrong"
            numberOfLines={1}
            style={item.bought ? { color: c.muted, textDecorationLine: 'line-through', fontFamily: 'Cairo_400Regular' } : null}
          >
            {item.name}
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            {due ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 6,
                  borderRadius: radius.sm - 2,
                  backgroundColor: status === 'overdue' ? c.danger : status === 'today' ? c.dueBg : 'transparent',
                }}
              >
                {status === 'overdue' ? <Ionicons name="alert-circle" size={12} color="#FFFFFF" /> : null}
                <AppText
                  variant="caption"
                  style={{
                    color: status === 'overdue' ? '#FFFFFF' : status === 'today' ? c.dueText : c.muted,
                    fontFamily: status === 'later' ? 'Cairo_400Regular' : 'Cairo_600SemiBold',
                  }}
                >
                  {due}
                </AppText>
              </View>
            ) : null}
            {who ? (
              <AppText variant="caption" tone="muted" numberOfLines={1}>
                {who}
              </AppText>
            ) : null}
          </View>
        </View>
        <AppText variant="bodyStrong" tone={item.bought ? 'muted' : 'primary'}>
          {quantity}
        </AppText>
      </Pressable>
    </ReanimatedSwipeable>
  );
}
