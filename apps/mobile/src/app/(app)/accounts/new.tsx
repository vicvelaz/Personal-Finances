import { accountCreateSchema, fieldErrors } from '@fin/shared';
import { router } from 'expo-router';
import { useState } from 'react';

import { type AccountFormValues, AccountFields } from '@/components/account-fields';
import { Button, FormAlert } from '@/components/form';
import { Screen } from '@/components/screen';
import { useAccountMutations } from '@/lib/accounts';
import { useProfile } from '@/lib/profile';

export default function NewAccountScreen() {
  const baseCurrency = useProfile().data?.base_currency ?? 'EUR';
  const { create } = useAccountMutations();
  const [values, setValues] = useState<AccountFormValues>({
    name: '',
    type: 'checking',
    currency: baseCurrency,
    openingBalance: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function onSubmit() {
    const parsed = accountCreateSchema.safeParse(values);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    create.mutate(parsed.data, { onSuccess: () => router.back() });
  }

  return (
    <Screen titleKey="accounts.newAccount">
      <FormAlert error={create.error?.message} />
      <AccountFields
        values={values}
        onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))}
        errors={errors}
      />
      <Button title="Crear cuenta" onPress={onSubmit} loading={create.isPending} />
      <Button variant="link" title="Cancelar" onPress={() => router.back()} />
    </Screen>
  );
}
