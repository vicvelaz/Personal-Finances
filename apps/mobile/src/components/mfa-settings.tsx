import { AUTH_MESSAGES, fieldErrors, mfaCodeSchema } from '@fin/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Linking } from 'react-native';

import { Button, FormAlert, TextField } from '@/components/form';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

const FACTOR_KEY = ['mfa-factor'];

/** The user's verified TOTP factor, or null. */
export function useTotpFactor() {
  return useQuery({
    queryKey: FACTOR_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      return data.totp[0] ?? null;
    },
  });
}

type Enrollment = { factorId: string; secret: string; uri: string };

export function MfaSettings() {
  const queryClient = useQueryClient();
  const factor = useTotpFactor();
  const [enrollment, setEnrollment] = useState<Enrollment>();
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function run(fn: () => Promise<void>) {
    setError(undefined);
    setMessage(undefined);
    setLoading(true);
    try {
      await fn();
    } catch {
      setError(AUTH_MESSAGES.unexpected);
    } finally {
      setLoading(false);
    }
  }

  const start = () =>
    run(async () => {
      // Drop abandoned enrollments so they never pile up.
      const { data: factors } = await supabase.auth.mfa.listFactors();
      for (const f of factors?.all ?? []) {
        if (f.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', issuer: 'fin' });
      if (error) throw error;
      setEnrollment({ factorId: data.id, secret: data.totp.secret, uri: data.totp.uri });
    });

  const confirm = () => {
    const parsed = mfaCodeSchema.safeParse({ code });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    return run(async () => {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrollment!.factorId, code: parsed.data.code });
      if (error) return setErrors({ code: AUTH_MESSAGES.invalidMfaCode });
      setEnrollment(undefined);
      setCode('');
      setMessage(AUTH_MESSAGES.mfaEnabled);
      await queryClient.invalidateQueries({ queryKey: FACTOR_KEY });
    });
  };

  const disable = (factorId: string) =>
    run(async () => {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      setMessage(AUTH_MESSAGES.mfaDisabled);
      await queryClient.invalidateQueries({ queryKey: FACTOR_KEY });
    });

  return (
    <>
      <ThemedText translationKey="security.twoStepVerification" />
      <FormAlert error={error} message={message} />
      {factor.data ? (
        <>
          <ThemedText translationKey="security.enabledAuthenticatorApp" />
          <Button title="Desactivar" onPress={() => disable(factor.data!.id)} loading={loading} />
        </>
      ) : enrollment ? (
        <>
          <ThemedText translationKey="security.addKeyAuthenticatorAppEnterCodeDisplays" />
          <ThemedText selectable accessibilityLabel="Clave secreta">{enrollment.secret}</ThemedText>
          <Button variant="link" title="Abrir en la app de autenticación" onPress={() => Linking.openURL(enrollment.uri).catch(() => undefined)} />
          <TextField label="Código" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" maxLength={6} error={errors.code} />
          <Button title="Confirmar" onPress={confirm} loading={loading} />
        </>
      ) : (
        factor.isSuccess && <Button title="Activar" onPress={start} loading={loading} />
      )}
    </>
  );
}
