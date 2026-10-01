import { accountUpdateSchema, fieldErrors, formatMoney, minorToInput } from '@fin/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { type AccountFormValues, AccountFields } from '@/components/account-fields';
import { Button, FormAlert } from '@/components/form';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { type AccountRow, useAccount, useAccountMutations } from '@/lib/accounts';
import { confirm } from '@/lib/confirm';
import { useProfile } from '@/lib/profile';

export default function EditAccountScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const account = useAccount(id);
  const locale = useProfile().data?.locale ?? 'es-ES';

  if (account.isPending) return <Screen title="Cuenta" />;
  if (!account.data) {
    return (
      <Screen titleKey="accounts.account">
        <FormAlert error="La cuenta no existe" />
        <Button variant="link" title="Volver" onPress={() => router.back()} />
      </Screen>
    );
  }
  return <EditAccountForm key={account.data.id} account={account.data} locale={locale} />;
}

function EditAccountForm({ account, locale }: { account: AccountRow; locale: string }) {
  const { update, setArchived, remove } = useAccountMutations();
  const [values, setValues] = useState<AccountFormValues>({
    name: account.name,
    type: account.type,
    currency: account.currency,
    openingBalance: minorToInput(account.opening_balance, locale),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const mutationError = update.error ?? setArchived.error ?? remove.error;
  const busy = update.isPending || setArchived.isPending || remove.isPending;

  function onSubmit() {
    const parsed = accountUpdateSchema.safeParse(values);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    update.mutate({ id: account.id, values: parsed.data }, { onSuccess: () => router.back() });
  }

  async function onDelete() {
    const ok = await confirm('Borrar cuenta', 'Esta acción no se puede deshacer.', 'Borrar');
    if (ok) remove.mutate(account.id, { onSuccess: () => router.back() });
  }

  const count = account.transaction_count;
  return (
    <Screen title={account.name} translateTitle={false}>
      <ThemedText themeColor="textSecondary">
        Saldo actual: {formatMoney(account.balance, account.currency, locale)} · {count}{' '}
        {count === 1 ? 'movimiento' : 'movimientos'}
        {account.is_archived ? ' · Archivada' : ''}
      </ThemedText>
      <FormAlert error={mutationError?.message} />
      <AccountFields
        values={values}
        onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))}
        errors={errors}
        currencyLocked
      />
      <Button title="Guardar cambios" onPress={onSubmit} loading={update.isPending} />
      <Button
        variant="link"
        title={account.is_archived ? 'Desarchivar' : 'Archivar'}
        onPress={() =>
          !busy &&
          setArchived.mutate(
            { id: account.id, archived: !account.is_archived },
            { onSuccess: () => router.back() },
          )
        }
      />
      <Button variant="link" title="Borrar cuenta" onPress={() => !busy && onDelete()} />
      <Button variant="link" title="Cancelar" onPress={() => router.back()} />
    </Screen>
  );
}
