"use client";

import { CATEGORY_KIND_LABELS, CATEGORY_KINDS, type CategoryRow } from "@fin/shared";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Field, FormAlert, SubmitButton } from "@/components/form";
import type { CategoryFormState } from "./actions";
import { T } from "@/components/i18n-provider";

const inputClass =
  "rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700";

export type CategoryFormValues = { name: string; kind: string; parentId: string; color: string };

export function CategoryForm({
  action,
  initial,
  parents,
  selfId,
  submitLabel,
}: {
  action: (state: CategoryFormState, formData: FormData) => Promise<CategoryFormState>;
  initial: CategoryFormValues;
  /** Top-level categories that can act as parent. */
  parents: CategoryRow[];
  selfId?: string;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const [kind, setKind] = useState(initial.kind);
  const options = parents.filter((p) => p.kind === kind && p.id !== selfId);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormAlert error={state.error} />
      <Field label="Nombre" name="name" defaultValue={initial.name} error={state.errors?.name} />
      <Field labelKey="fields.type" name="kind" error={state.errors?.kind}>
        <select id="field-kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value)} className={inputClass}>
          {CATEGORY_KINDS.map((k) => (
            <option key={k} value={k}><T>{CATEGORY_KIND_LABELS[k]}</T></option>
          ))}
        </select>
      </Field>
      <Field labelKey="categories.parentCategory" name="parentId" error={state.errors?.parentId}>
        <select id="field-parentId" name="parentId" defaultValue={initial.parentId} key={kind} className={inputClass}>
          <option value=""><T id="categories.noneTopLevelCategory" /></option>
          {options.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </Field>
      <Field labelKey="fields.color" name="color" error={state.errors?.color}>
        <input id="field-color" name="color" type="color" defaultValue={initial.color || "#64748b"} className="h-10 w-20" />
      </Field>
      <div className="flex items-center gap-4">
        <SubmitButton>{submitLabel}</SubmitButton>
        <Link href="/categories" className="text-sm underline"><T id="common.cancel" /></Link>
      </div>
    </form>
  );
}
