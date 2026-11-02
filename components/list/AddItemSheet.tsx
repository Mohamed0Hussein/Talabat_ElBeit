import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Sheet } from '@/components/ui/Sheet';
import { Stepper } from '@/components/ui/Stepper';
import { TextField } from '@/components/ui/TextField';
import { useLanguage } from '@/i18n/LanguageProvider';
import { errorMessage } from '@/i18n/errorMessage';
import { formatDue } from '@/lib/format';
import { type DuePreset, duePreset } from '@/lib/items';
import { UNITS, type Unit } from '@/lib/types';
import { useTheme } from '@/theme/ThemeProvider';

export type NewItem = { name: string; quantity: number; unit: Unit; dueAt: Date | null };

type DueChoice = DuePreset | 'pick';

type Props = { visible: boolean; onClose: () => void; onAdd: (item: NewItem) => Promise<void> };

export function AddItemSheet({ visible, onClose, onAdd }: Props) {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const { scheme, c } = useTheme();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState<Unit>('pcs');
  const [due, setDue] = useState<DueChoice>('none');
  const [picked, setPicked] = useState<Date | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The last item added, confirmed here because the list behind the sheet is covered.
  const [added, setAdded] = useState<string | null>(null);

  useEffect(() => {
    if (!added) return;
    const id = setTimeout(() => setAdded(null), 3000);
    return () => clearTimeout(id);
  }, [added]);

  const words = { today: t('due.today'), tomorrow: t('due.tomorrow'), yesterday: t('due.yesterday') };

  const pickDateTime = () => {
    setDue('pick');
    const start = picked ?? duePreset('today', new Date()) ?? new Date();
    if (Platform.OS === 'android') {
      // Android shows date and time as two dialogs.
      DateTimePickerAndroid.open({
        value: start,
        mode: 'date',
        minimumDate: new Date(),
        onChange: (event, date) => {
          if (event.type !== 'set' || !date) return;
          DateTimePickerAndroid.open({
            value: date,
            mode: 'time',
            onChange: (e2, time) => {
              if (e2.type === 'set' && time) setPicked(time);
            },
          });
        },
      });
    } else if (!picked) {
      setPicked(start);
    }
  };

  const submit = async () => {
    setError(null);
    if (!name.trim()) {
      setError(t('addItem.missingName'));
      return;
    }
    const dueAt = due === 'pick' ? picked : duePreset(due, new Date());
    setBusy(true);
    try {
      await onAdd({ name: name.trim(), quantity, unit, dueAt });
      // Stay open for the next item. Keep the unit, but each item starts with no due date.
      setAdded(name.trim());
      setName('');
      setQuantity(1);
      setDue('none');
      setPicked(null);
    } catch (e) {
      setError(errorMessage(e, lang));
    } finally {
      setBusy(false);
    }
  };

  const dueChips: { key: DueChoice; label: string }[] = [
    { key: 'none', label: t('due.none') },
    { key: 'today', label: t('due.today') },
    { key: 'tomorrow', label: t('due.tomorrow') },
  ];

  return (
    <Sheet visible={visible} onClose={onClose} closeLabel={t('family.close')}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <AppText variant="heading" accessibilityRole="header" style={{ flex: 1 }}>
          {t('addItem.title')}
        </AppText>
        {added ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 }} accessibilityLiveRegion="polite">
            <Ionicons name="checkmark-circle" size={18} color={c.primary} />
            <AppText variant="bodyStrong" tone="primary" numberOfLines={1} style={{ flexShrink: 1 }}>
              {t('addItem.added', { name: added })}
            </AppText>
          </View>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <TextField
            label={t('addItem.name')}
            value={name}
            onChangeText={setName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={submit}
            error={error}
          />
        </View>
        <View style={{ paddingBottom: error ? 26 : 0 }}>
          <Stepper value={quantity} onChange={setQuantity} />
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <AppText variant="caption" tone="muted">
          {t('addItem.unit')}
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {UNITS.map((u) => (
            <Chip key={u} label={t(`units.${u}`)} selected={unit === u} onPress={() => setUnit(u)} />
          ))}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <AppText variant="caption" tone="muted">
          {t('addItem.due')}
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {dueChips.map((d) => (
            <Chip key={d.key} label={d.label} selected={due === d.key} onPress={() => setDue(d.key)} />
          ))}
          {Platform.OS !== 'web' ? (
            <Chip
              label={due === 'pick' && picked ? formatDue(picked, new Date(), lang, words) : t('due.pick')}
              selected={due === 'pick'}
              onPress={pickDateTime}
            />
          ) : null}
        </View>
        {Platform.OS === 'ios' && due === 'pick' && picked ? (
          <DateTimePicker
            value={picked}
            mode="datetime"
            display="spinner"
            minimumDate={new Date()}
            locale={lang === 'ar' ? 'ar-EG' : 'en-US'}
            themeVariant={scheme}
            onChange={(_, date) => date && setPicked(date)}
          />
        ) : null}
      </View>

      <Button title={t('addItem.add')} variant="accent" icon="add" onPress={submit} loading={busy} />
    </Sheet>
  );
}
