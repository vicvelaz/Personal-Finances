import { AUTH_MESSAGES, fieldErrors, mfaCodeSchema } from '@fin/shared';
import { useState } from 'react';

import { Button, FormAlert, TextField } from '@/components/form';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

export default function MfaScreen() {
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(undefined);
    const parsed = mfaCodeSchema.safeParse({ code });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setLoading(true);
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      const factor = data?.totp[0];
      if (!factor) return setError(AUTH_MESSAGES.unexpected);
      // On success the session becomes aal2 and the layout swaps to the app.
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: parsed.data.code });
      if (error) setError(AUTH_MESSAGES.invalidMfaCode);
    } catch {
      setError(AUTH_MESSAGES.unexpected);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen titleKey="security.twoStepVerification">
      <ThemedText translationKey="security.enter6DigitCodeAuthenticatorApp" />
      <FormAlert error={error} />
      <TextField label="Código" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={6} error={errors.code} />
      <Button title="Verificar" onPress={onSubmit} loading={loading} />
      <Button variant="link" title="Cerrar sesión" onPress={() => supabase.auth.signOut({ scope: 'local' })} />
    </Screen>
  );
}
