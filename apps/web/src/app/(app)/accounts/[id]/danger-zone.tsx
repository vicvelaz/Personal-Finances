"use client";

import { useState, useTransition } from "react";
import { FormAlert } from "@/components/form";
import { deleteAccount, setArchived } from "../actions";
import { T } from "@/components/i18n-provider";

export function AccountDangerZone({ id, isArchived }: { id: string; isArchived: boolean }) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function onDelete() {
    if (!window.confirm("¿Borrar esta cuenta? Esta acción no se puede deshacer.")) return;
    startTransition(async () => {
      const result = await deleteAccount(id);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-3 border-t border-neutral-200 pt-6 dark:border-neutral-800">
      <FormAlert error={error} />
      <div className="flex gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => setArchived(id, !isArchived))}
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
        >
          {isArchived ? "Desarchivar" : "Archivar"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onDelete}
          className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-700"
        >
          <T id="dataRights.deleteAccount" />
        </button>
      </div>
    </div>
  );
}
