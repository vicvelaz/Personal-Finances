import { categoryUpdateSchema, type CategoryRow, fieldErrors } from '@fin/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { type CategoryFormValues, CategoryFields } from '@/components/category-fields';
import { Button, FormAlert } from '@/components/form';
import { Screen } from '@/components/screen';
import { CategoryError, useCategories, useCategoryMutations } from '@/lib/categories';
import { confirm } from '@/lib/confirm';

export default function EditCategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const categories = useCategories();

  if (categories.isPending) return <Screen title="Categoría" />;
  const category = categories.data?.find((c) => c.id === id);
  if (!category) {
    return (
      <Screen titleKey="categories.category">
        <FormAlert error="La categoría no existe" />
        <Button variant="link" title="Volver" onPress={() => router.back()} />
      </Screen>
    );
  }
  const parents = (categories.data ?? []).filter((c) => c.parent_id === null);
  return <EditCategoryForm key={category.id} category={category} parents={parents} />;
}

function EditCategoryForm({ category, parents }: { category: CategoryRow; parents: CategoryRow[] }) {
  const { update, remove } = useCategoryMutations();
  const [values, setValues] = useState<CategoryFormValues>({
    name: category.name,
    kind: category.kind,
    parentId: category.parent_id ?? '',
    color: category.color ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const onError = (e: Error) => {
    if (e instanceof CategoryError && e.field) setErrors({ [e.field]: e.message });
  };

  function onSubmit() {
    const parsed = categoryUpdateSchema.safeParse(values);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    update.mutate({ id: category.id, values: parsed.data }, { onSuccess: () => router.back(), onError });
  }

  async function onDelete() {
    const ok = await confirm('Borrar categoría', 'Sus movimientos quedarán sin categoría y se borrarán sus presupuestos.', 'Borrar');
    if (ok) remove.mutate(category.id, { onSuccess: () => router.back() });
  }

  const mutationError = update.error ?? remove.error;
  const formError = mutationError instanceof CategoryError && mutationError.field ? undefined : mutationError?.message;
  return (
    <Screen title={category.name} translateTitle={false}>
      <FormAlert error={formError} />
      <CategoryFields
        values={values}
        onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))}
        errors={errors}
        parents={parents}
        selfId={category.id}
      />
      <Button title="Guardar cambios" onPress={onSubmit} loading={update.isPending} />
      <Button variant="link" title="Borrar categoría" onPress={() => !remove.isPending && onDelete()} />
      <Button variant="link" title="Cancelar" onPress={() => router.back()} />
    </Screen>
  );
}
