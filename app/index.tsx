import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, SectionList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { confirm } from '@/components/confirm';
import { AddBar } from '@/components/list/AddBar';
import { AddItemSheet, type NewItem } from '@/components/list/AddItemSheet';
import { ItemRow } from '@/components/list/ItemRow';
import { SectionHeader } from '@/components/list/SectionHeader';
import { AppText } from '@/components/ui/AppText';
import { AvatarStack } from '@/components/ui/Avatar';
import { LoadingState } from '@/components/ui/LoadingState';
import { PatternBand } from '@/components/ui/PatternBand';
import { Snackbar } from '@/components/ui/Snackbar';
import { useFamily, useItems, useMembers } from '@/hooks/useFamilyData';
import { useNow } from '@/hooks/useNow';
import { useSession, useWho } from '@/hooks/useSession';
import { useLanguage } from '@/i18n/LanguageProvider';
import { errorMessage } from '@/i18n/errorMessage';
import { formatNumber } from '@/lib/format';
import { dueStatus, splitItems } from '@/lib/items';
import type { Item } from '@/lib/types';
import { db } from '@/services/firebase';
import { addItem, clearBought, deleteItem, setBought } from '@/services/items';
import { notifyMembers } from '@/services/push';
import { useTheme } from '@/theme/ThemeProvider';

type Toast = { message: string; undo?: boolean };

export default function ListScreen() {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const { familyId } = useSession();
  const who = useWho();
  const family = useFamily(familyId);
  const members = useMembers(familyId);
  const { items, loading } = useItems(familyId);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  // Swipe-to-delete waits for the Undo window before deleting, so Undo needs no rewrite.
  const [pendingDelete, setPendingDelete] = useState<Item | null>(null);
  const pendingRef = useRef<Item | null>(null);

  const showError = useCallback((e: unknown) => setToast({ message: errorMessage(e, lang) }), [lang]);

  // Latest members and sender for callbacks that run later (the delayed delete).
  const latest = useRef({ members, who });
  latest.current = { members, who };
  const notify = useCallback(
    (kind: 'added' | 'bought' | 'removed', itemName: string) => {
      if (familyId) notifyMembers(latest.current.members, latest.current.who, kind, itemName, familyId);
    },
    [familyId],
  );

  const commitPendingDelete = useCallback(() => {
    const item = pendingRef.current;
    pendingRef.current = null;
    setPendingDelete(null);
    if (item && familyId) {
      deleteItem(db, familyId, item.id)
        .then(() => notify('removed', item.name))
        .catch(showError);
    }
  }, [familyId, showError, notify]);

  // Leaving the screen (or the app closing it) finishes a pending delete.
  useEffect(() => () => commitPendingDelete(), [commitPendingDelete]);

  const onDelete = (item: Item) => {
    commitPendingDelete();
    pendingRef.current = item;
    setPendingDelete(item);
    setToast({ message: t('list.deleted', { name: item.name }), undo: true });
  };

  const undoDelete = () => {
    pendingRef.current = null;
    setPendingDelete(null);
    setToast(null);
  };

  const hideToast = useCallback(() => {
    setToast(null);
    commitPendingDelete();
  }, [commitPendingDelete]);

  const onToggle = (item: Item) => {
    if (!familyId) return;
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => undefined);
    setBought(db, familyId, item.id, !item.bought, who.displayName)
      .then(() => {
        if (!item.bought) notify('bought', item.name);
      })
      .catch(showError);
  };

  const onAdd = async (input: NewItem) => {
    if (!familyId) return;
    await addItem(db, familyId, who, input);
    notify('added', input.name); // the sheet itself confirms the add
  };

  const visible = items.filter((i) => i.id !== pendingDelete?.id);
  const { toBuy, bought } = splitItems(visible, now);
  const overdue = toBuy.filter((i) => dueStatus(i.dueAt, now) === 'overdue').length;
  const n = (x: number) => formatNumber(x, lang);

  const onClear = async () => {
    if (!familyId || bought.length === 0) return;
    const ok = await confirm(t('list.clearTitle'), t('list.clearBody', { n: n(bought.length) }), t('list.clear'), t('common.cancel'));
    if (ok) clearBought(db, familyId, bought.map((i) => i.id)).catch(showError);
  };

  const summary =
    visible.length === 0
      ? ''
      : toBuy.length === 0
        ? t('list.allDone')
      : overdue > 0
        ? t('list.summaryOverdue', { toBuy: n(toBuy.length), overdue: n(overdue) })
        : t('list.summary', { toBuy: n(toBuy.length) });

  const sections = [
    { key: 'toBuy', title: t('list.toBuy'), data: toBuy },
    ...(bought.length ? [{ key: 'bought', title: t('list.bought'), data: bought }] : []),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <PatternBand style={{ paddingTop: insets.top + 10, paddingBottom: 16, paddingHorizontal: 16, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <AppText variant="title" tone="onBand" numberOfLines={1} accessibilityRole="header" style={{ flex: 1 }}>
            {family?.name ?? ' '}
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('list.openFamily')}
            onPress={() => router.push('/family')}
            hitSlop={8}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <AvatarStack people={members.map((m) => ({ id: m.id, name: m.displayName }))} ring={c.band} />
            <Ionicons name="chevron-down" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
        <AppText variant="caption" tone="onBand" style={{ opacity: 0.85 }}>
          {summary}
        </AppText>
      </PatternBand>

      {loading ? (
        <LoadingState />
      ) : visible.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 32 }}>
          <Ionicons name="basket-outline" size={48} color={c.muted} />
          <AppText variant="heading">{t('list.emptyTitle')}</AppText>
          <AppText tone="muted" style={{ textAlign: 'center' }}>
            {t('list.emptyBody')}
          </AppText>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingBottom: 96 }}
          renderSectionHeader={({ section }) => (
            <SectionHeader
              title={section.title}
              count={n(section.data.length)}
              action={section.key === 'bought' ? { label: t('list.clear'), onPress: onClear } : undefined}
            />
          )}
          renderItem={({ item }) => (
            <ItemRow item={item} now={now} onToggle={() => onToggle(item)} onDelete={() => onDelete(item)} />
          )}
        />
      )}

      <Snackbar
        visible={!!toast}
        message={toast?.message ?? ''}
        actionLabel={toast?.undo ? t('common.undo') : undefined}
        onAction={toast?.undo ? undoDelete : undefined}
        onHide={hideToast}
        bottom={insets.bottom + 80}
      />
      <AddBar onPress={() => setSheetOpen(true)} />
      <AddItemSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} onAdd={onAdd} />
    </View>
  );
}
