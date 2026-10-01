import { AUTH_MESSAGES, fieldErrors, signUpSchema, verifyEmailCodeSchema } from '@fin/shared';
import { router } from 'expo-router';
import { useState } from 'react';

import { Button, FormAlert, TextField } from '@/components/form';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { supabase, WEB_URL } from '@/lib/supabase';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(undefined);
    const parsed = signUpSchema.safeParse({ email, password });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setLoading(true);
    try {
      // The email carries both a web link and a 6-digit code; an existing email returns no error, keeping this neutral.
      const { error } = await supabase.auth.signUp({
        ...parsed.data,
        options: { emailRedirectTo: WEB_URL },
      });
      if (error?.code === 'weak_password') setErrors({ password: error.message });
      else if (error) setError(AUTH_MESSAGES.unexpected);
      else setMessage(AUTH_MESSAGES.signUpCodeSent);
    } catch {
      setError(AUTH_MESSAGES.unexpected);
    } finally {
      setLoading(false);
    }
  }

  async function onVerify() {
    setError(undefined);
    const parsed = verifyEmailCodeSchema.safeParse({ email, token: code });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setLoading(true);
    try {
      // On success the session listener swaps the protected stack.
      const { error } = await supabase.auth.verifyOtp({ ...parsed.data, type: 'email' });
      if (error) setError(AUTH_MESSAGES.invalidEmailCode);
    } catch {
      setError(AUTH_MESSAGES.unexpected);
    } finally {
      setLoading(false);
    }
  }

  if (message) {
    return (
      <Screen titleKey="auth.confirmEmail">
        <FormAlert message={message} error={error} />
        <TextField label="Código" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={6} error={errors.token} />
        <Button title="Confirmar" onPress={onVerify} loading={loading} />
        <Button variant="link" title="Volver a iniciar sesión" onPress={() => router.replace('/login')} />
      </Screen>
    );
  }

  return (
    <Screen titleKey="accounts.createAccount">
      <FormAlert error={error} />
      <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" error={errors.email} />
      <TextField label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" error={errors.password} />
      <ThemedText translationKey="common.least8CharactersIncludingOneLetterOneNumber" />
      <Button title="Registrarme" onPress={onSubmit} loading={loading} />
      <Button variant="link" title="¿Ya tienes cuenta? Inicia sesión" onPress={() => router.replace('/login')} />
    </Screen>
  );
}
