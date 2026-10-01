import { CATEGORY_KIND_LABELS, CATEGORY_KINDS, translate, type CategoryRow } from '@fin/shared';

import { OptionPicker, TextField } from '@/components/form';
import { useLocale } from '@/lib/i18n';

export type CategoryFormValues = { name: string; kind: string; parentId: string; color: string };

const NONE = '';

export function CategoryFields({
  values,
  onChange,
  errors,
  parents,
  selfId,
}: {
  values: CategoryFormValues;
  onChange: (key: keyof CategoryFormValues, value: string) => void;
  errors: Record<string, string>;
  parents: CategoryRow[];
  selfId?: string;
}) {
  const { locale } = useLocale();
  const options = parents.filter((p) => p.kind === values.kind && p.id !== selfId);
  const parentLabels: Record<string, string> = { [NONE]: translate(locale, "common.none") };
  for (const p of options) parentLabels[p.id] = p.name;

  return (
    <>
      <TextField label="Nombre" value={values.name} onChangeText={(v) => onChange('name', v)} error={errors.name} />
      <OptionPicker
        label="Tipo"
        options={CATEGORY_KINDS}
        labels={CATEGORY_KIND_LABELS}
        translateLabels
        value={values.kind}
        onChange={(v) => {
          onChange('kind', v);
          onChange('parentId', NONE);
        }}
        error={errors.kind}
      />
      <OptionPicker
        label="Categoría padre"
        options={[NONE, ...options.map((p) => p.id)]}
        labels={parentLabels}
        value={values.parentId}
        onChange={(v) => onChange('parentId', v)}
        error={errors.parentId}
      />
      <TextField
        label="Color (opcional)"
        value={values.color}
        onChangeText={(v) => onChange('color', v)}
        autoCapitalize="none"
        placeholder="#22C55E"
        error={errors.color}
      />
    </>
  );
}
