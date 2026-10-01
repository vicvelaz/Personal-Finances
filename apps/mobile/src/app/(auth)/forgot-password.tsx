import { AUTH_MESSAGES, fieldErrors, forgotPasswordSchema, recoverWithCodeSchema } from '@fin/shared';
import { router } from 'expo-router';
import { useState } from 'react';

import { Button, FormAlert, TextField } from '@/components/form';
import { Screen } from '@/components/screen';
import { supabase, WEB_URL } from '@/lib/supabase';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [form, setForm] = useState({ token: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setLoading(true);
    // Errors are ignored so the response never reveals whether the account exists.
    await supabase.auth
      .resetPasswordForEmail(parsed.data.email, { redirectTo: `${WEB_URL}/reset-password` })
      .catch(() => undefined);
    setLoading(false);
    setMessage(AUTH_MESSAGES.resetCodeSent);
  }

  async function onReset() {
    setError(undefined);
    const parsed = recoverWithCodeSchema.safeParse({ email, ...form });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setLoading(true);
    try {
      const { error: otpError } = await supabase.auth.verifyOtp({ email: parsed.data.email, token: parsed.data.token, type: 'recovery' });
      if (otpError) return setError(AUTH_MESSAGES.invalidEmailCode);
      // The verified session swaps the stack to the app; the update still completes.
      await supabase.auth.updateUser({ password: parsed.data.password });
    } catch {
      setError(AUTH_MESSAGES.unexpected);
    } finally {
      setLoading(false);
    }
  }

  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <Screen titleKey="auth.recoverPassword">
      <FormAlert message={message} error={error} />
      {!message ? (
        <>
          <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" error={errors.email} />
          <Button title="Enviar código" onPress={onSubmit} loading={loading} />
        </>
      ) : (
        <>
          <TextField label="Código" value={form.token} onChangeText={set('token')} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={6} error={errors.token} />
          <TextField label="Nueva contraseña" value={form.password} onChangeText={set('password')} secureTextEntry autoComplete="new-password" textContentType="newPassword" error={errors.password} />
          <TextField label="Repite la contraseña" value={form.confirmPassword} onChangeText={set('confirmPassword')} secureTextEntry autoComplete="new-password" error={errors.confirmPassword} />
          <Button title="Cambiar contraseña" onPress={onReset} loading={loading} />
        </>
      )}
      <Button variant="link" title="Volver a iniciar sesión" onPress={() => router.replace('/login')} />
    </Screen>
  );
}
