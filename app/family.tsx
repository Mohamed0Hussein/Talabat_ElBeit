import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { signOut } from 'firebase/auth';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { confirm } from '@/components/confirm';
import { ChangePasswordSheet } from '@/components/family/ChangePasswordSheet';
import { LanguageToggle } from '@/components/LanguageToggle';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { PatternBand } from '@/components/ui/PatternBand';
import { useFamily, useMembers } from '@/hooks/useFamilyData';
import { useSession, useWho } from '@/hooks/useSession';
import { useLanguage } from '@/i18n/LanguageProvider';
import { errorMessage } from '@/i18n/errorMessage';
import { formatNumber } from '@/lib/format';
import { changeFamilyPassword, deleteFamily, leaveFamily, removeMember } from '@/services/families';
import { auth, db } from '@/services/firebase';
import { useTheme } from '@/theme/ThemeProvider';

export default function FamilySheet() {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const { c, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const { familyId } = useSession();
  const who = useWho();
  const family = useFamily(familyId);
  const members = useMembers(familyId);
  const [busy, setBusy] = useState<'leave' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passwordSheet, setPasswordSheet] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const isCreator = !!family && family.creatorId === who.uid;

  const onRemove = async (member: { id: string; displayName: string }) => {
    if (!familyId) return;
    const ok = await confirm(
      t('family.removeTitle', { name: member.displayName }),
      t('family.removeBody'),
      t('family.remove', { name: member.displayName }),
      t('common.cancel'),
    );
    if (!ok) return;
    setError(null);
    removeMember(db, familyId, member.id).catch((e) => setError(errorMessage(e, lang)));
  };

  const onChangePassword = async (password: string) => {
    if (!familyId) return;
    await changeFamilyPassword(db, familyId, password);
    setInfo(t('family.passwordChanged'));
  };

  const run = async (kind: 'leave' | 'delete') => {
    if (!familyId) return;
    const ok = await confirm(
      t(kind === 'leave' ? 'family.leaveTitle' : 'family.deleteTitle'),
      t(kind === 'leave' ? 'family.leaveBody' : 'family.deleteBody'),
      t(kind === 'leave' ? 'family.leave' : 'family.delete'),
      t('common.cancel'),
    );
    if (!ok) return;
    setBusy(kind);
    setError(null);
    try {
      if (kind === 'leave') await leaveFamily(db, who.uid, familyId);
      else await deleteFamily(db, who.uid, familyId);
      // The session moves to family setup.
    } catch (e) {
      setError(errorMessage(e, lang));
      setBusy(null);
    }
  };

  const onSignOut = async () => {
    if (await confirm(t('family.signOutTitle'), '', t('family.signOut'), t('common.cancel'))) await signOut(auth);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <PatternBand style={{ paddingTop: 18, paddingBottom: 18, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <AppText variant="caption" tone="onBand" style={{ opacity: 0.8 }}>
              {t('family.title')}
            </AppText>
            <AppText variant="title" tone="onBand" numberOfLines={1} accessibilityRole="header">
              {family?.name ?? ' '}
            </AppText>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={t('family.close')} onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </Pressable>
        </View>
      </PatternBand>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 24, paddingBottom: insets.bottom + 24 }}>
        <View style={{ gap: 8 }}>
          <AppText variant="section" tone="muted" accessibilityRole="header">
            {t('family.members')} · {t('family.memberCount', { count: members.length, n: formatNumber(members.length, lang) })}
          </AppText>
          <View style={{ backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line }}>
            {members.map((m, i) => (
              <View
                key={m.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: c.line,
                }}
              >
                <Avatar person={{ id: m.id, name: m.displayName }} size={34} />
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">
                    {m.displayName}
                    {m.id === who.uid ? ` (${t('common.you')})` : ''}
                  </AppText>
                  {m.id === family?.creatorId ? (
                    <AppText variant="caption" tone="muted">
                      {t('family.creator')}
                    </AppText>
                  ) : null}
                </View>
                {m.id === family?.creatorId ? <Ionicons name="star" size={16} color={c.accent} /> : null}
                {isCreator && m.id !== who.uid ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('family.remove', { name: m.displayName })}
                    onPress={() => onRemove(m)}
                    hitSlop={8}
                  >
                    <Ionicons name="person-remove-outline" size={20} color={c.danger} />
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
        </View>

        <View style={{ gap: 10 }}>
          <AppText variant="section" tone="muted" accessibilityRole="header">
            {t('family.language')}
          </AppText>
          <LanguageToggle />
        </View>

        <View style={{ gap: 10 }}>
          <AppText variant="section" tone="muted" accessibilityRole="header">
            {t('family.account')}
          </AppText>
          <AppText tone="muted">{t('family.signedInAs', { name: who.displayName })}</AppText>
          {error ? <AppText tone="danger">{error}</AppText> : null}
          {info ? <AppText tone="primary">{info}</AppText> : null}
          {isCreator ? (
            <Button
              title={t('family.changePassword')}
              variant="ghost"
              icon="key-outline"
              onPress={() => {
                setInfo(null);
                setPasswordSheet(true);
              }}
            />
          ) : null}
          {isCreator ? (
            <Button title={t('family.delete')} variant="danger" icon="trash-outline" loading={busy === 'delete'} onPress={() => run('delete')} />
          ) : (
            <Button title={t('family.leave')} variant="danger" icon="exit-outline" loading={busy === 'leave'} onPress={() => run('leave')} />
          )}
          <Button title={t('family.signOut')} variant="ghost" icon="log-out-outline" onPress={onSignOut} />
        </View>
      </ScrollView>
      <ChangePasswordSheet visible={passwordSheet} onClose={() => setPasswordSheet(false)} onSave={onChangePassword} />
    </View>
  );
}
