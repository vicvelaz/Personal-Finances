import {
  AUTH_MESSAGES,
  DELETE_CONFIRMATION,
  deleteAccountSchema,
  fieldErrors,
  otpCodeSchema,
  profileUpdateSchema,
  SUPPORTED_CURRENCIES,
  SUPPORTED_LOCALES,
  translate,
  type ProfileUpdate,
} from '@fin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking } from 'react-native';

import { Button, FormAlert, OptionPicker, TextField } from '@/components/form';
import { MfaSettings, useTotpFactor } from '@/components/mfa-settings';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { confirm } from '@/lib/confirm';
import { useLocale } from '@/lib/i18n';
import { updateProfile, useProfile } from '@/lib/profile';
import { useSession } from '@/lib/session';
import { supabase, WEB_URL } from '@/lib/supabase';

type Form = { displayName: string; baseCurrency: string; locale: string; timezone: string };

export default function ProfileScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const profile = useProfile();

  return (
    <Screen titleKey="csvImport.profile">
      {profile.isError && <FormAlert error="No se pudo cargar el perfil" />}
      <ThemedText translationKey="auth.email" />
      <ThemedText themeColor="textSecondary" translateText={false}>{session?.user.email}</ThemedText>
      {profile.data && userId && (
        <ProfileForm
          key={userId}
          userId={userId}
          initial={{
            displayName: profile.data.display_name ?? '',
            baseCurrency: profile.data.base_currency,
            locale: profile.data.locale,
            timezone: profile.data.timezone,
          }}
        />
      )}
      <Button variant="link" title="Categorías" onPress={() => router.push('/profile/categories')} />
      <Button variant="link" title="Movimientos programados" onPress={() => router.push('/profile/scheduled')} />
      <Button variant="link" title="Metas de ahorro" onPress={() => router.push('/profile/goals')} />
      <Button variant="link" title="Exportar mis datos (web)" onPress={() => Linking.openURL(`${WEB_URL}/profile`)} />
      <Button variant="link" title="Cerrar sesión" onPress={() => supabase.auth.signOut({ scope: 'local' })} />
      <MfaSettings />
      {session?.user.email && <DeleteAccount email={session.user.email} />}
    </Screen>
  );
}

function DeleteAccount({ email }: { email: string }) {
  const factor = useTotpFactor();
  const [form, setForm] = useState({ confirmation: '', password: '', code: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit() {
    setError(undefined);
    const parsed = deleteAccountSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    const mfaFactor = factor.data;
    const code = otpCodeSchema.safeParse(form.code);
    if (mfaFactor && !code.success) return setErrors({ code: code.error.issues[0].message });
    setErrors({});
    const ok = await confirm('Borrar cuenta', 'Se borrarán definitivamente tu cuenta y todos tus datos.', 'Borrar');
    if (!ok) return;
    setPending(true);
    try {
      // Re-authenticate so an unattended open session cannot delete the account.
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password: parsed.data.password });
      if (authError) return setErrors({ password: 'Contraseña incorrecta' });
      // Password sign-in drops the session to aal1, so users with MFA must step up again.
      if (mfaFactor && code.success) {
        const { error: mfaError } = await supabase.auth.mfa.challengeAndVerify({ factorId: mfaFactor.id, code: code.data });
        if (mfaError) return setErrors({ code: AUTH_MESSAGES.invalidMfaCode });
      }
      const { error: rpcError } = await supabase.rpc('delete_my_account');
      if (rpcError) return setError(AUTH_MESSAGES.unexpected);
      await supabase.auth.signOut({ scope: 'local' });
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <ThemedText translationKey="dataRights.deleteAccount" />
      <ThemedText translationKey="dataRights.accountAllDataPermanentlyDeletedActionUndone" />
      <FormAlert error={error} />
      <TextField
        label={`Escribe ${DELETE_CONFIRMATION} para confirmar`}
        value={form.confirmation}
        onChangeText={(confirmation) => setForm((f) => ({ ...f, confirmation }))}
        autoCapitalize="characters"
        error={errors.confirmation}
      />
      <TextField
        label="Contraseña actual"
        value={form.password}
        onChangeText={(password) => setForm((f) => ({ ...f, password }))}
        secureTextEntry
        autoComplete="current-password"
        error={errors.password}
      />
      {factor.data && (
        <TextField
          label="Código de verificación"
          value={form.code}
          onChangeText={(code) => setForm((f) => ({ ...f, code }))}
          keyboardType="number-pad"
          maxLength={6}
          error={errors.code}
        />
      )}
      <Button title="Borrar mi cuenta definitivamente" onPress={onSubmit} loading={pending} />
    </>
  );
}

function ProfileForm({ userId, initial }: { userId: string; initial: Form }) {
  const { locale, setLocale } = useLocale();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Form>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>();

  const save = useMutation({
    mutationFn: (values: ProfileUpdate) => updateProfile(userId, values),
    onSuccess: (_, values) => {
      setMessage('Perfil actualizado');
      setLocale(values.locale);
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });

  function onSubmit() {
    setMessage(undefined);
    const parsed = profileUpdateSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    save.mutate(parsed.data);
  }

  const set = (key: keyof Form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <>
      {save.isError && <FormAlert error="No se pudo guardar el perfil. Inténtalo de nuevo" />}
      <FormAlert message={message} />
      <TextField label="Nombre visible" value={form.displayName} onChangeText={set('displayName')} error={errors.displayName} />
      <OptionPicker label="Moneda base" options={SUPPORTED_CURRENCIES} value={form.baseCurrency} onChange={set('baseCurrency')} error={errors.baseCurrency} />
      <OptionPicker
        label="Idioma y formato"
        options={SUPPORTED_LOCALES}
        labels={Object.fromEntries(SUPPORTED_LOCALES.map((value) => [value, translate(locale, LOCALE_LABELS[value])]))}
        value={form.locale}
        onChange={set('locale')}
        error={errors.locale}
      />
      <TextField label="Zona horaria" value={form.timezone} onChangeText={set('timezone')} autoCapitalize="none" error={errors.timezone} />
      <Button title="Guardar" onPress={onSubmit} loading={save.isPending} />
    </>
  );
}

const LOCALE_LABELS: Record<(typeof SUPPORTED_LOCALES)[number], string> = {
  'es-ES': 'Español (España)',
  'es-MX': 'Español (México)',
  'es-AR': 'Español (Argentina)',
  'es-CO': 'Español (Colombia)',
  'en-US': 'English (United States)',
  'en-GB': 'English (United Kingdom)',
};
