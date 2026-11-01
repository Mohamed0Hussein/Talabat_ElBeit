import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { TextField } from '@/components/ui/TextField';
import { useLanguage } from '@/i18n/LanguageProvider';
import { errorMessage } from '@/i18n/errorMessage';
import { validateFamilyPassword } from '@/lib/password';

type Props = { visible: boolean; onClose: () => void; onSave: (password: string) => Promise<void> };

export function ChangePasswordSheet({ visible, onClose, onSave }: Props) {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const close = () => {
    setPassword('');
    setError(null);
    onClose();
  };

  const save = async () => {
    setError(null);
    if (validateFamilyPassword(password) !== 'ok') {
      setError(t('familySetup.passwordTooShort'));
      return;
    }
    setBusy(true);
    try {
      await onSave(password);
      close();
    } catch (e) {
      setError(errorMessage(e, lang));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={close} closeLabel={t('family.close')}>
      <AppText variant="heading" accessibilityRole="header">
        {t('family.changePassword')}
      </AppText>
      <AppText tone="muted">{t('family.changePasswordBody')}</AppText>
      <TextField
        label={t('family.newPassword')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoFocus
        error={error}
        hint={t('familySetup.passwordHint')}
        onSubmitEditing={save}
      />
      <Button title={t('family.save')} icon="key-outline" onPress={save} loading={busy} />
    </Sheet>
  );
}
