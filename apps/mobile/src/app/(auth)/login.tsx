import { AUTH_MESSAGES, fieldErrors, signInErrorMessage, signInSchema } from '@fin/shared';
import { router } from 'expo-router';
import { useState } from 'react';

import { Button, FormAlert, TextField } from '@/components/form';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { GOOGLE_AUTH_ENABLED, signInWithGoogle } from '@/lib/oauth';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(undefined);
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setLoading(true);
    try {
      // On success the session listener swaps the protected stack.
      const { error } = await supabase.auth.signInWithPassword(parsed.data);
      if (error) setError(signInErrorMessage(error.code));
    } catch {
      setError(AUTH_MESSAGES.unexpected);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <ThemedText type="subtitle">fin</ThemedText>
      <ThemedText translationKey="auth.signInTitle" />
      <FormAlert error={error} />
      <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" error={errors.email} />
      <TextField label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" error={errors.password} />
      <Button title="Entrar" onPress={onSubmit} loading={loading} />
      {GOOGLE_AUTH_ENABLED && (
        <Button
          variant="link"
          title="Continuar con Google"
          onPress={async () => {
            setError(undefined);
            if (!(await signInWithGoogle().catch(() => false))) setError(AUTH_MESSAGES.oauthFailed);
          }}
        />
      )}
      <Button variant="link" title="¿Olvidaste tu contraseña?" onPress={() => router.push('/forgot-password')} />
      <Button variant="link" title="Crear cuenta" onPress={() => router.push('/signup')} />
    </Screen>
  );
}
