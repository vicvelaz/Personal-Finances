import { fieldErrors, goalSchema } from '@fin/shared';
import { router } from 'expo-router';
import { useState } from 'react';

import { Button, FormAlert } from '@/components/form';
import { type GoalFormValues, GoalFields } from '@/components/goal-fields';
import { Screen } from '@/components/screen';
import { useAccounts } from '@/lib/accounts';
import { GoalError, useGoalMutations } from '@/lib/goals';
import { useProfile } from '@/lib/profile';

export default function NewGoalScreen() {
  const accounts = useAccounts();
  const baseCurrency = useProfile().data?.base_currency ?? 'EUR';
  const { create } = useGoalMutations();
  const [values, setValues] = useState<GoalFormValues>({
    name: '',
    targetAmount: '',
    currency: baseCurrency,
    targetDate: '',
    accountId: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function onSubmit() {
    const parsed = goalSchema.safeParse(values);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    create.mutate(parsed.data, {
      onSuccess: () => router.back(),
      onError: (e) => {
        if (e instanceof GoalError && e.field) setErrors({ [e.field]: e.message });
      },
    });
  }

  const formError = create.error instanceof GoalError && create.error.field ? undefined : create.error?.message;
  return (
    <Screen titleKey="goals.newGoal">
      <FormAlert error={formError} />
      <GoalFields values={values} onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))} errors={errors} accounts={accounts.data ?? []} />
      <Button title="Crear meta" onPress={onSubmit} loading={create.isPending} />
      <Button variant="link" title="Cancelar" onPress={() => router.back()} />
    </Screen>
  );
}
