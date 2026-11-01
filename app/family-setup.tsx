import Ionicons from '@expo/vector-icons/Ionicons';
import { signOut } from 'firebase/auth';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { PatternBand } from '@/components/ui/PatternBand';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { TextField } from '@/components/ui/TextField';
import { useSession } from '@/hooks/useSession';
import { useLanguage } from '@/i18n/LanguageProvider';
import { errorMessage } from '@/i18n/errorMessage';
import { displayNameOf, validateFamilyName } from '@/lib/familyName';
import { validateFamilyPassword } from '@/lib/password';
import { createFamily, joinFamily } from '@/services/families';
import { auth, db } from '@/services/firebase';
import { useTheme } from '@/theme/ThemeProvider';

type Mode = 'join' | 'create';

const NAME_ERRORS = {
  tooShort: 'familySetup.nameTooShort',
  tooLong: 'familySetup.nameTooLong',
  invalidChars: 'familySetup.nameInvalid',
} as const;

export default function FamilySetupScreen() {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const { c, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const { notice, clearNotice } = useSession();
  const [mode, setMode] = useState<Mode>('join');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    setNameError(null);
    setPasswordError(null);
    const nameCheck = validateFamilyName(name);
    if (nameCheck !== 'ok') {
      setNameError(t(NAME_ERRORS[nameCheck]));
      return;
    }
    if (mode === 'create' && validateFamilyPassword(password) !== 'ok') {
      setPasswordError(t('familySetup.passwordTooShort'));
      return;
    }
    if (mode === 'join' && !password.trim()) {
      setPasswordError(t('auth.missingFields'));
      return;
    }
    const user = auth.currentUser;
    if (!user) return;
    setBusy(true);
    clearNotice();
    try {
      const who = { uid: user.uid, displayName: displayNameOf(user) };
      const input = { name, password, language: lang, expoPushToken: '' };
      if (mode === 'create') await createFamily(db, who, input);
      else await joinFamily(db, who, input);
      // The session sees the new family and moves to the list.
    } catch (e) {
      setError(errorMessage(e, lang));
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 24 }}>
        <PatternBand style={{ paddingTop: insets.top + 12, paddingBottom: 28, paddingHorizontal: 20, gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => signOut(auth)}
            hitSlop={8}
            style={{ alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 }}
          >
            <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
            <AppText variant="bodyStrong" tone="onBand">
              {t('familySetup.signOut')}
            </AppText>
          </Pressable>
          <AppText variant="title" tone="onBand" accessibilityRole="header">
            {t('familySetup.title')}
          </AppText>
          <AppText tone="onBand" style={{ opacity: 0.85 }}>
            {t('familySetup.subtitle')}
          </AppText>
        </PatternBand>

        <View style={{ padding: 20, gap: 16 }}>
          {notice ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.dueBg, borderRadius: radius.md, padding: 12 }}>
              <Ionicons name="information-circle" size={22} color={c.dueText} />
              <AppText style={{ flex: 1, color: c.dueText }}>{t(`familySetup.${notice}`)}</AppText>
              <Pressable accessibilityRole="button" accessibilityLabel={t('family.close')} onPress={clearNotice} hitSlop={8}>
                <Ionicons name="close" size={20} color={c.dueText} />
              </Pressable>
            </View>
          ) : null}
          <SegmentedTabs<Mode>
            options={[
              { key: 'join', label: t('familySetup.joinTab') },
              { key: 'create', label: t('familySetup.createTab') },
            ]}
            value={mode}
            onChange={(m) => {
              setMode(m);
              setError(null);
              setNameError(null);
              setPasswordError(null);
            }}
          />
          <TextField label={t('familySetup.name')} value={name} onChangeText={setName} autoCapitalize="words" error={nameError} />
          <TextField
            label={t('familySetup.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            error={passwordError}
            hint={mode === 'create' ? t('familySetup.passwordHint') : t('familySetup.joinHint')}
            onSubmitEditing={submit}
          />
          {error ? (
            <AppText tone="danger" accessibilityLiveRegion="polite">
              {error}
            </AppText>
          ) : null}
          <Button
            title={mode === 'create' ? t('familySetup.create') : t('familySetup.join')}
            icon={mode === 'create' ? 'add-circle-outline' : 'people-outline'}
            onPress={submit}
            loading={busy}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
