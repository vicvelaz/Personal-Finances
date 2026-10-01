import { categoryCreateSchema, fieldErrors } from '@fin/shared';
import { router } from 'expo-router';
import { useState } from 'react';

import { type CategoryFormValues, CategoryFields } from '@/components/category-fields';
import { Button, FormAlert } from '@/components/form';
import { Screen } from '@/components/screen';
import { CategoryError, useCategories, useCategoryMutations } from '@/lib/categories';

export default function NewCategoryScreen() {
  const categories = useCategories();
  const { create } = useCategoryMutations();
  const [values, setValues] = useState<CategoryFormValues>({ name: '', kind: 'expense', parentId: '', color: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function onSubmit() {
    const parsed = categoryCreateSchema.safeParse(values);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    create.mutate(parsed.data, {
      onSuccess: () => router.back(),
      onError: (e) => {
        if (e instanceof CategoryError && e.field) setErrors({ [e.field]: e.message });
      },
    });
  }

  const formError = create.error instanceof CategoryError && create.error.field ? undefined : create.error?.message;
  return (
    <Screen titleKey="categories.newCategory">
      <FormAlert error={formError} />
      <CategoryFields
        values={values}
        onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))}
        errors={errors}
        parents={(categories.data ?? []).filter((c) => c.parent_id === null)}
      />
      <Button title="Crear categoría" onPress={onSubmit} loading={create.isPending} />
      <Button variant="link" title="Cancelar" onPress={() => router.back()} />
    </Screen>
  );
}
