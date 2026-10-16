import {
  accountUpdateSchema,
  fieldErrors,
  formatMoney,
  minorToInput,
  parseMoneyInput,
  translate,
  translateKey,
} from '@fin/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { type AccountFormValues, AccountFields } from '@/components/account-fields';
import { Button, FormAlert, TextField } from '@/components/form';
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
  const { update, setArchived, remove, reconcile } = useAccountMutations();
  const [values, setValues] = useState<AccountFormValues>({
    name: account.name,
    type: account.type,
    currency: account.currency,
    openingBalance: minorToInput(account.opening_balance, locale),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const mutationError = update.error ?? setArchived.error ?? remove.error;
  const busy = update.isPending || setArchived.isPending || remove.isPending || reconcile.isPending;

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
      {!account.is_archived && (
        <AccountReconciliationForm account={account} locale={locale} reconcile={reconcile} />
      )}
      <AccountFields
        values={values}
        onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))}
        errors={errors}
        currencyLocked
      />
      <Button title="Guardar cambios" onPress={onSubmit} loading={update.isPending || reconcile.isPending} />
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

function AccountReconciliationForm({
  account,
  locale,
  reconcile,
}: {
  account: AccountRow;
  locale: string;
  reconcile: ReturnType<typeof useAccountMutations>['reconcile'];
}) {
  const [realBalance, setRealBalance] = useState(minorToInput(account.balance, locale));
  const [error, setError] = useState<string>();
  const [serverError, setServerError] = useState<string>();
  const [delta, setDelta] = useState<number>();

  function onSubmit() {
    const parsed = parseMoneyInput(realBalance);
    setServerError(undefined);
    if (parsed === null) {
      setError(translateKey(locale, 'accounts.invalidRealBalance'));
      setDelta(undefined);
      return;
    }
    setError(undefined);
    setDelta(undefined);
    reconcile.mutate(
      { id: account.id, realBalance: parsed },
      {
        onSuccess: (result) => setDelta(result),
        onError: (mutationError) => setServerError(translate(locale, mutationError.message)),
      },
    );
  }

  const successMessage =
    delta === undefined
      ? undefined
      : delta === 0
        ? translateKey(locale, 'accounts.noAdjustmentNeeded')
        : translateKey(locale, 'accounts.balanceReconciled', {
            adjustment: formatMoney(delta, account.currency, locale),
          });

  return (
    <>
      <ThemedText type="smallBold">{translateKey(locale, 'accounts.reconcileBalance')}</ThemedText>
      <ThemedText themeColor="textSecondary">{translateKey(locale, 'accounts.reconcileDescription')}</ThemedText>
      <TextField
        labelKey="accounts.realBalance"
        value={realBalance}
        onChangeText={(value) => {
          setRealBalance(value);
          setError(undefined);
          setServerError(undefined);
          setDelta(undefined);
        }}
        keyboardType="decimal-pad"
        error={error}
      />
      <FormAlert error={serverError} message={successMessage} />
      <Button
        titleKey="accounts.reconcileBalance"
        onPress={onSubmit}
        loading={reconcile.isPending}
      />
    </>
  );
}
