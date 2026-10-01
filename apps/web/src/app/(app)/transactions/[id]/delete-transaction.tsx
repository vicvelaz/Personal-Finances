"use client";

import { useState, useTransition } from "react";
import { FormAlert } from "@/components/form";
import { deleteTransaction } from "../actions";

export function DeleteTransaction({ id, isTransfer }: { id: string; isTransfer: boolean }) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function onDelete() {
    const msg = isTransfer
      ? "¿Borrar esta transferencia? Se borrarán ambos movimientos."
      : "¿Borrar este movimiento?";
    if (!window.confirm(msg)) return;
    startTransition(async () => {
      const result = await deleteTransaction(id);
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
        {isTransfer ? "Borrar transferencia" : "Borrar movimiento"}
      </button>
    </div>
  );
}
