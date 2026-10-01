import { type CategoryRow, fieldErrors, minorToInput, transactionSchema } from '@fin/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Button, FormAlert } from '@/components/form';
import { Screen } from '@/components/screen';
import { SplitEditor } from '@/components/split-editor';
import { type TransactionFormValues, TransactionFields } from '@/components/transaction-fields';
import { type AccountRow, useAccounts } from '@/lib/accounts';
import { useCategories } from '@/lib/categories';
import { confirm } from '@/lib/confirm';
import { useProfile } from '@/lib/profile';
import { TransactionError, type TransactionRow, useTransaction, useTransactionMutations } from '@/lib/transactions';

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tx = useTransaction(id);
  const accounts = useAccounts();
  const categories = useCategories();
  const locale = useProfile().data?.locale ?? 'es-ES';

  if (tx.isPending || accounts.isPending) return <Screen title="Movimiento" />;
  if (!tx.data) {
    return (
      <Screen titleKey="transactions.transactionSingular">
        <FormAlert error="El movimiento no existe" />
        <Button variant="link" title="Volver" onPress={() => router.back()} />
      </Screen>
    );
  }
  const t = tx.data;
  return (
    <EditTransactionForm
      key={t.id}
      tx={t}
      initial={{
        kind: t.kind,
        accountId: t.fromId,
        toAccountId: t.toId,
        categoryId: t.category_id ?? '',
        amount: minorToInput(Math.abs(t.amount), locale),
        occurredOn: t.occurred_on,
        description: t.description ?? '',
        notes: t.notes ?? '',
        toAmount: t.toAmount ? minorToInput(t.toAmount, locale) : '',
      }}
      accounts={accounts.data ?? []}
      categories={categories.data ?? []}
      locale={locale}
    />
  );
}

function EditTransactionForm({
  tx,
  initial,
  accounts,
  categories,
  locale,
}: {
  tx: TransactionRow;
  initial: TransactionFormValues;
  accounts: AccountRow[];
  categories: CategoryRow[];
  locale: string;
}) {
  const { update, remove } = useTransactionMutations();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isTransfer = tx.kind === 'transfer';

  function onSubmit() {
    const parsed = transactionSchema.safeParse(values);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    update.mutate(
      { tx, v: parsed.data },
      {
        onSuccess: () => router.back(),
        onError: (e) => {
          if (e instanceof TransactionError && e.field) setErrors({ [e.field]: e.message });
        },
      },
    );
  }

  async function onDelete() {
    const ok = await confirm(
      isTransfer ? 'Borrar transferencia' : 'Borrar movimiento',
      isTransfer ? 'Se borrarán ambos movimientos.' : 'Esta acción no se puede deshacer.',
      'Borrar',
    );
    if (ok) remove.mutate(tx, { onSuccess: () => router.back() });
  }

  const mutationError = update.error ?? remove.error;
  const formError =
    mutationError instanceof TransactionError && mutationError.field ? undefined : mutationError?.message;
  return (
    <Screen title={isTransfer ? 'Editar transferencia' : 'Editar movimiento'}>
      <FormAlert error={formError} />
      <TransactionFields
        values={values}
        onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))}
        errors={errors}
        accounts={accounts}
        categories={categories}
        allowedKinds={isTransfer ? ['transfer'] : ['expense', 'income']}
      />
      <Button title="Guardar cambios" onPress={onSubmit} loading={update.isPending} />
      {!isTransfer && <SplitEditor tx={tx} categories={categories} locale={locale} />}
      <Button
        variant="link"
        title={isTransfer ? 'Borrar transferencia' : 'Borrar movimiento'}
        onPress={() => !remove.isPending && onDelete()}
      />
      <Button variant="link" title="Cancelar" onPress={() => router.back()} />
    </Screen>
  );
}
