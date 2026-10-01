"use client";

import { useState, useTransition } from "react";
import { FormAlert } from "@/components/form";
import { deleteCategory } from "../actions";
import { T } from "@/components/i18n-provider";

export function DeleteCategory({ id }: { id: string }) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function onDelete() {
    if (!window.confirm("¿Borrar esta categoría? Sus movimientos quedarán sin categoría y se borrarán sus presupuestos.")) return;
    startTransition(async () => {
      const result = await deleteCategory(id);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-3 border-t border-neutral-200 pt-6 dark:border-neutral-800">
      <FormAlert error={error} />
      <button
        type="button"
        disabled={pending}
        onClick={onDelete}
        className="self-start rounded-md border border-red-300 px-4 py-2 text-sm text-red-700"
      >
        <T id="categories.deleteCategory" />
      </button>
    </div>
  );
}
