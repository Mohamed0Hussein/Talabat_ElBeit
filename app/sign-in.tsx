import Ionicons from '@expo/vector-icons/Ionicons';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LanguageToggle } from '@/components/LanguageToggle';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { PatternBand } from '@/components/ui/PatternBand';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { TextField } from '@/components/ui/TextField';
import { useLanguage } from '@/i18n/LanguageProvider';
import { errorMessage } from '@/i18n/errorMessage';
import { auth, db } from '@/services/firebase';
import { createUserProfile } from '@/services/users';
import { useTheme } from '@/theme/ThemeProvider';

type Mode = 'signIn' | 'signUp';

export default function SignInScreen() {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('signIn');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    if (!email.trim() || !password || (mode === 'signUp' && !name.trim())) {
      setError(t('auth.missingFields'));
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signIn') {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, { displayName: name.trim() });
        await createUserProfile(db, cred.user.uid, name.trim(), lang);
      }
    } catch (e) {
      setError(errorMessage(e, lang));
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 24 }}>
        <PatternBand style={{ paddingTop: insets.top + 36, paddingBottom: 36, paddingHorizontal: 20, gap: 10 }}>
          <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="basket" size={28} color={c.onAccent} />
          </View>
          <AppText variant="title" tone="onBand" accessibilityRole="header" style={{ fontSize: 30, lineHeight: 42 }}>
            {t('app.name')}
          </AppText>
          <AppText tone="onBand" style={{ opacity: 0.85 }}>
            {t('auth.tagline')}
          </AppText>
        </PatternBand>

        <View style={{ padding: 20, gap: 16 }}>
          <SegmentedTabs<Mode>
            options={[
              { key: 'signIn', label: t('auth.signInTab') },
              { key: 'signUp', label: t('auth.signUpTab') },
            ]}
            value={mode}
            onChange={(m) => {
              setMode(m);
              setError(null);
            }}
          />
          {mode === 'signUp' ? (
            <TextField
              label={t('auth.name')}
              value={name}
              onChangeText={setName}
              autoComplete="name"
              textContentType="name"
              hint={t('auth.nameHint')}
            />
          ) : null}
          <TextField
            label={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <TextField
            label={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
            textContentType={mode === 'signIn' ? 'password' : 'newPassword'}
            onSubmitEditing={submit}
          />
          {error ? (
            <AppText tone="danger" accessibilityLiveRegion="polite">
              {error}
            </AppText>
          ) : null}
          <Button title={mode === 'signIn' ? t('auth.signIn') : t('auth.signUp')} onPress={submit} loading={busy} />
          <View style={{ alignItems: 'center', paddingTop: 8 }}>
            <LanguageToggle />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
