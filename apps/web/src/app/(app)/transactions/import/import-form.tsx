"use client";

import {
  buildImportRows,
  formatMoney,
  guessMapping,
  type ImportField,
  type ImportMapping,
  MAX_IMPORT_ROWS,
  parseCsv,
} from "@fin/shared";
import { startTransition, useActionState, useState } from "react";
import { FormAlert } from "@/components/form";
import { useTranslations } from "@/components/i18n-provider";
import type { AccountOption } from "@/lib/transactions";
import { type ImportState, importTransactions } from "./actions";
import { T } from "@/components/i18n-provider";

const inputClass = "rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700";
const MAX_BYTES = 1024 * 1024;
const PREVIEW = 50;

const FIELD_LABELS: Record<ImportField, string> = {
  date: "Fecha *",
  amount: "Importe (negativo = gasto) *",
  description: "Descripción",
  category: "Categoría",
  kind: "Tipo (omite transferencias)",
  currency: "Moneda (omite otras)",
  account: "Cuenta (omite otras)",
};

type Columns = Record<ImportField, number | null>;

export function ImportForm({ accounts, locale }: { accounts: AccountOption[]; locale: string }) {
  const { t } = useTranslations();
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [rows, setRows] = useState<string[][]>([]);
  const [hasHeader, setHasHeader] = useState(true);
  const [columns, setColumns] = useState<Columns>({
    date: null,
    amount: null,
    description: null,
    category: null,
    kind: null,
    currency: null,
    account: null,
  });
  const [fileError, setFileError] = useState<string>();
  const [state, action, pending] = useActionState<ImportState, FormData>(importTransactions, {});

  const target = accounts.find((a) => a.id === accountId);
  const currency = target?.currency ?? "EUR";
  const width = Math.max(0, ...rows.map((r) => r.length));
  const columnNames = Array.from({ length: width }, (_, i) => (hasHeader ? rows[0]?.[i] : undefined) || t("Columna {index}", { index: i + 1 }));
  const ready = columns.date !== null && columns.amount !== null;
  const preview = ready
    ? buildImportRows(rows, columns as ImportMapping, hasHeader, { accountName: target?.name, currency: target?.currency })
    : [];
  const valid = preview.flatMap((p) => (p.value ? [p.value] : []));
  const errors = preview.length - valid.length;
  const tooMany = preview.length > MAX_IMPORT_ROWS;

  async function onFile(file: File | undefined) {
    setFileError(undefined);
    setRows([]);
    if (!file) return;
    if (file.size > MAX_BYTES) return setFileError("El fichero no puede superar 1 MB");
    const parsed = parseCsv(await file.text());
    if (!parsed.length) return setFileError("El fichero está vacío");
    setRows(parsed);
    setColumns(guessMapping(parsed[0]!));
  }

  return (
    <div className="flex flex-col gap-6">
      <FormAlert error={fileError ?? state.error} message={state.message} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          <T id="accounts.account" />
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputClass}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name} <T>(</T>{a.currency}<T>)</T></option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          <T id="csvImport.csvFile" />
          <input type="file" accept=".csv,text/csv,text/plain" onChange={(e) => onFile(e.target.files?.[0])} className={inputClass} />
        </label>
      </div>

      {rows.length > 0 && (
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-lg font-medium"><T id="csvImport.columns" /></legend>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} /> <T id="csvImport.firstRowHeader" />
          </label>
          <div className="grid gap-4 sm:grid-cols-4">
            {(Object.keys(FIELD_LABELS) as ImportField[]).map((f) => (
              <label key={f} className="flex flex-col gap-1 text-sm font-medium">
                {t(FIELD_LABELS[f])}
                <select
                  value={columns[f] ?? ""}
                  onChange={(e) => setColumns((c) => ({ ...c, [f]: e.target.value === "" ? null : Number(e.target.value) }))}
                  className={inputClass}
                >
                  <option value=""><T>—</T></option>
                  {columnNames.map((name, i) => (
                    <option key={i} value={i}>{name}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {ready && (
        <section aria-label={t("Vista previa")} className="flex flex-col gap-3">
          <p className="text-sm">
            {valid.length} <T id="csvImport.validRows" />
            {errors > 0 && `, ${t("{count} con errores (no se importarán)", { count: errors })}`}<T>.</T>
            {preview.length > PREVIEW && ` ${t("Se muestran las primeras {count}.", { count: PREVIEW })}`}
          </p>
          {tooMany && <FormAlert error={`El fichero no puede tener más de ${MAX_IMPORT_ROWS} filas`} />}
          <table className="w-full text-sm">
            <thead className="text-left text-neutral-500">
              <tr>
                <th className="py-1"><T id="common.row" /></th>
                <th><T id="fields.date" /></th>
                <th><T id="fields.description" /></th>
                <th><T id="categories.category" /></th>
                <th className="text-right"><T id="csvImport.amount" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {preview.slice(0, PREVIEW).map((p) =>
                p.value ? (
                  <tr key={p.line}>
                    <td className="py-1">{p.line}</td>
                    <td>{p.value.occurredOn}</td>
                    <td>{p.value.description}</td>
                    <td>{p.value.category}</td>
                    <td className={`text-right ${p.value.amount < 0 ? "text-red-600" : "text-green-700"}`}>
                      {formatMoney(p.value.amount, currency, locale)}
                    </td>
                  </tr>
                ) : (
                  <tr key={p.line} className="text-red-600">
                    <td className="py-1">{p.line}</td>
                    <td colSpan={4}>{t(p.error ?? "Error inesperado. Inténtalo de nuevo.")}</td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              startTransition(() => action(data));
            }}
          >
            <input type="hidden" name="accountId" value={accountId} />
            <input type="hidden" name="rows" value={JSON.stringify(valid)} />
            <button
              type="submit"
              disabled={pending || !valid.length || tooMany}
              className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-60"
            >
              {valid.length === 1
                ? t("Importar {count} movimiento", { count: valid.length })
                : t("Importar {count} movimientos", { count: valid.length })}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
