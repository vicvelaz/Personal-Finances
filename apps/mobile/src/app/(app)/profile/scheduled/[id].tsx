import { fieldErrors, minorToInput, scheduledSchema } from '@fin/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Button, FormAlert } from '@/components/form';
import { type ScheduledFormValues, ScheduledFields } from '@/components/scheduled-fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useAccounts } from '@/lib/accounts';
import { useCategories } from '@/lib/categories';
import { confirm } from '@/lib/confirm';
import { useProfile } from '@/lib/profile';
import { ScheduledError, type ScheduledRow, useScheduled, useScheduledMutations } from '@/lib/scheduled';

export default function EditScheduledScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheduled = useScheduled();
  const locale = useProfile().data?.locale ?? 'es-ES';
  if (scheduled.isPending) return <Screen title="Programado" />;
  const row = scheduled.data?.find((r) => r.id === id);
  if (!row) {
    return (
      <Screen titleKey="scheduled.scheduledTransaction">
        <FormAlert error="El movimiento programado no existe" />
        <Button variant="link" title="Volver" onPress={() => router.back()} />
      </Screen>
    );
  }
  return <EditForm key={row.id} row={row} locale={locale} />;
}

function EditForm({ row, locale }: { row: ScheduledRow; locale: string }) {
  const accounts = useAccounts();
  const categories = useCategories();
  const { update, setActive, remove } = useScheduledMutations();
  const [values, setValues] = useState<ScheduledFormValues>({
    kind: row.kind,
    accountId: row.account_id,
    categoryId: row.category_id ?? '',
    amount: minorToInput(Math.abs(row.amount), locale),
    description: row.description,
    recurrence: row.recurrence,
    startsOn: row.starts_on,
    endsOn: row.ends_on ?? '',
    isEstimated: row.is_estimated,
    autoPost: row.auto_post,
    reminderDaysBefore: row.reminder_days_before?.toString() ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function onSubmit() {
    const parsed = scheduledSchema.safeParse(values);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    update.mutate(
      { id: row.id, v: parsed.data },
      {
        onSuccess: () => router.back(),
        onError: (e) => {
          if (e instanceof ScheduledError && e.field) setErrors({ [e.field]: e.message });
        },
      },
    );
  }

  async function onDelete() {
    if (await confirm('Borrar programado', 'Los movimientos ya registrados se conservan.', 'Borrar')) {
      remove.mutate(row.id, { onSuccess: () => router.back() });
    }
  }

  const mutationError = update.error ?? setActive.error ?? remove.error;
  const formError = mutationError instanceof ScheduledError && mutationError.field ? undefined : mutationError?.message;
  return (
    <Screen title={row.description} translateTitle={false}>
      {!row.is_active && <ThemedText translationKey="scheduled.inactiveStatus" />}
      <FormAlert error={formError} />
      <ScheduledFields
        values={values}
        onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))}
        errors={errors}
        accounts={accounts.data ?? []}
        categories={categories.data ?? []}
      />
      <Button title="Guardar cambios" onPress={onSubmit} loading={update.isPending} />
      <Button
        variant="link"
        title={row.is_active ? 'Pausar' : 'Reactivar'}
        onPress={() => setActive.mutate({ id: row.id, active: !row.is_active }, { onSuccess: () => router.back() })}
      />
      <Button variant="link" title="Borrar programado" onPress={onDelete} />
      <Button variant="link" title="Cancelar" onPress={() => router.back()} />
    </Screen>
  );
}
