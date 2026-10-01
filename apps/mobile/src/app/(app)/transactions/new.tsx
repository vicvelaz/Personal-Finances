import { type CategoryRow, fieldErrors, todayInTimeZone, transactionSchema } from '@fin/shared';
import { router } from 'expo-router';
import { useState } from 'react';

import { Button, FormAlert } from '@/components/form';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { type TransactionFormValues, TransactionFields } from '@/components/transaction-fields';
import { type AccountRow, useAccounts } from '@/lib/accounts';
import { useCategories } from '@/lib/categories';
import { useProfile } from '@/lib/profile';
import { TransactionError, useTransactionMutations } from '@/lib/transactions';

export default function NewTransactionScreen() {
  const accounts = useAccounts();
  const categories = useCategories();
  const timezone = useProfile().data?.timezone ?? 'Europe/Madrid';

  if (accounts.isPending) return <Screen title="Nuevo movimiento" />;
  const active = (accounts.data ?? []).filter((a) => !a.is_archived);
  if (active.length === 0) {
    return (
      <Screen titleKey="transactions.newTransaction">
        <ThemedText translationKey="transactions.needLeastOneActiveAccountRecordTransactions" />
        <Button variant="link" title="Volver" onPress={() => router.back()} />
      </Screen>
    );
  }
  return (
    <NewTransactionForm
      initial={{
        kind: 'expense',
        accountId: active[0]!.id,
        toAccountId: '',
        categoryId: '',
        amount: '',
        occurredOn: todayInTimeZone(timezone),
        description: '',
        notes: '',
        toAmount: '',
      }}
      accounts={accounts.data ?? []}
      categories={categories.data ?? []}
    />
  );
}

function NewTransactionForm({
  initial,
  accounts,
  categories,
}: {
  initial: TransactionFormValues;
  accounts: AccountRow[];
  categories: CategoryRow[];
}) {
  const { create } = useTransactionMutations();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function onSubmit() {
    const parsed = transactionSchema.safeParse(values);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    create.mutate(parsed.data, {
      onSuccess: () => router.back(),
      onError: (e) => {
        if (e instanceof TransactionError && e.field) setErrors({ [e.field]: e.message });
      },
    });
  }

  const formError = create.error instanceof TransactionError && create.error.field ? undefined : create.error?.message;
  return (
    <Screen titleKey="transactions.newTransaction">
      <FormAlert error={formError} />
      <TransactionFields
        values={values}
        onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))}
        errors={errors}
        accounts={accounts}
        categories={categories}
        allowedKinds={['expense', 'income', 'transfer']}
      />
      <Button title="Guardar movimiento" onPress={onSubmit} loading={create.isPending} />
      <Button variant="link" title="Cancelar" onPress={() => router.back()} />
    </Screen>
  );
}
