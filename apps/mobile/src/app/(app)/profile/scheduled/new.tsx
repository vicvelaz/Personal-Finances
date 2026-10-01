import { fieldErrors, scheduledSchema, todayInTimeZone } from '@fin/shared';
import { router } from 'expo-router';
import { useState } from 'react';

import { Button, FormAlert } from '@/components/form';
import { type ScheduledFormValues, ScheduledFields } from '@/components/scheduled-fields';
import { Screen } from '@/components/screen';
import { useAccounts } from '@/lib/accounts';
import { useCategories } from '@/lib/categories';
import { useProfile } from '@/lib/profile';
import { ScheduledError, useScheduledMutations } from '@/lib/scheduled';

export default function NewScheduledScreen() {
  const accounts = useAccounts();
  const categories = useCategories();
  const timezone = useProfile().data?.timezone ?? 'Europe/Madrid';
  const { create } = useScheduledMutations();
  const first = accounts.data?.find((a) => !a.is_archived);
  const [values, setValues] = useState<ScheduledFormValues>({
    kind: 'expense',
    accountId: '',
    categoryId: '',
    amount: '',
    description: '',
    recurrence: 'monthly',
    startsOn: todayInTimeZone(timezone),
    endsOn: '',
    isEstimated: false,
    autoPost: false,
    reminderDaysBefore: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const current = { ...values, accountId: values.accountId || first?.id || '' };

  function onSubmit() {
    const parsed = scheduledSchema.safeParse(current);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    create.mutate(parsed.data, {
      onSuccess: () => router.back(),
      onError: (e) => {
        if (e instanceof ScheduledError && e.field) setErrors({ [e.field]: e.message });
      },
    });
  }

  const formError = create.error instanceof ScheduledError && create.error.field ? undefined : create.error?.message;
  return (
    <Screen titleKey="scheduled.newScheduledButton">
      <FormAlert error={formError} />
      <ScheduledFields
        values={current}
        onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))}
        errors={errors}
        accounts={accounts.data ?? []}
        categories={categories.data ?? []}
      />
      <Button title="Guardar programado" onPress={onSubmit} loading={create.isPending} />
      <Button variant="link" title="Cancelar" onPress={() => router.back()} />
    </Screen>
  );
}
