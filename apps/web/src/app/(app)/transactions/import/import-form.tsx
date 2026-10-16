"use client";

import {
  buildCanonicalImportRows,
  formatMoney,
  INVALID_CSV_HEADER,
  MAX_IMPORT_ROWS,
  parseCsv,
  resolveImportAccounts,
  toCsv,
  type ImportAccountError,
  type CanonicalImportPreviewRow,
  type CanonicalImportRow,
  type CategoryRow,
} from "@fin/shared";
import { useState } from "react";
import { FormAlert } from "@/components/form";
import { T, useTranslations } from "@/components/i18n-provider";
import type { AccountOption } from "@/lib/transactions";

const inputClass = "rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700";
const MAX_BYTES = 1024 * 1024;
const TEMPLATE = toCsv(
  ["date", "amount", "type", "category", "account", "description", "destination_account"],
  [
    ["2026-10-15", "45.50", "EXPENSE", "Food", "Checking", "Lunch", ""],
    ["2026-10-16", "1200.00", "INCOME", "Salary", "Checking", "Payday", ""],
    ["2026-10-17", "50.00", "TRANSFER", "", "Checking", "Savings transfer", "Savings"],
  ],
);

type StagedRow = {
  line: number;
  value?: CanonicalImportRow;
  parseError?: string;
  categoryId: string;
  categoryWarning: boolean;
  selected: boolean;
};

type BatchResult = {
  imported: number;
  skipped: number;
  failed: number;
  errors: { line: number; error: string }[];
};

function isBatchResult(value: unknown): value is BatchResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;
  return (
    Number.isInteger(result.imported) &&
    Number.isInteger(result.skipped) &&
    Number.isInteger(result.failed) &&
    Array.isArray(result.errors) &&
    result.errors.every(
      (error) =>
        error &&
        typeof error === "object" &&
        Number.isInteger((error as Record<string, unknown>).line) &&
        typeof (error as Record<string, unknown>).error === "string",
    )
  );
}

const ACCOUNT_ERROR_KEYS: Record<ImportAccountError, string> = {
  source_account_not_found: "csvImport.sourceAccountNotFound",
  source_account_ambiguous: "csvImport.sourceAccountAmbiguous",
  invalid_default_account: "csvImport.invalidDefaultAccount",
  destination_account_required: "csvImport.destinationAccountRequired",
  destination_account_not_found: "csvImport.destinationAccountNotFound",
  destination_account_ambiguous: "csvImport.destinationAccountAmbiguous",
  transfer_same_account: "csvImport.transferSameAccount",
  transfer_currency_mismatch: "csvImport.transferCurrencyMismatch",
};

function buildStagingRows(
  parsed: CanonicalImportPreviewRow[],
  categories: CategoryRow[],
): StagedRow[] {
  return parsed.map((row) => {
    const value = row.value;
    const category = value?.category
      ? categories.find((item) => item.kind === value.type.toLowerCase() && item.name.trim().toLocaleLowerCase() === value.category!.trim().toLocaleLowerCase())
      : undefined;

    return {
      line: row.line,
      value,
      parseError: row.error,
      categoryId: category?.id ?? "",
      categoryWarning: Boolean(value?.category && !category),
      selected: true,
    };
  });
}

function rowError(
  row: StagedRow,
  accounts: AccountOption[],
  defaultAccountId: string,
  t: (key: string) => string,
): string | undefined {
  if (row.parseError) return t(row.parseError);
  if (!row.value) return t("validation.unexpectedErrorTryAgain");
  const resolution = resolveImportAccounts(row.value, accounts, defaultAccountId);
  return resolution.ok ? undefined : t(ACCOUNT_ERROR_KEYS[resolution.error]);
}

export function ImportForm({
  accounts,
  categories,
  locale,
}: {
  accounts: AccountOption[];
  categories: CategoryRow[];
  locale: string;
}) {
  const { t } = useTranslations();
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [rows, setRows] = useState<StagedRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [fileError, setFileError] = useState<string>();
  const [submitError, setSubmitError] = useState<string>();
  const [result, setResult] = useState<BatchResult>();
  const [pending, setPending] = useState(false);

  const activeRows = rows.filter((row) => row.selected);
  const validRows = activeRows.filter((row) => !rowError(row, accounts, accountId, t));
  const invalidRows = activeRows.length - validRows.length;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  async function onFile(file: File | undefined) {
    setRows([]);
    setPage(1);
    setFileError(undefined);
    setSubmitError(undefined);
    setResult(undefined);
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setFileError(t("csvImport.fileLargerThan1Mb"));
      return;
    }

    let parsed: string[][];
    try {
      parsed = parseCsv(await file.text());
    } catch {
      setFileError(t("csvImport.fileReadFailed"));
      return;
    }
    if (!parsed.length) {
      setFileError(t("csvImport.fileEmpty"));
      return;
    }
    if (parsed.length - 1 > MAX_IMPORT_ROWS) {
      setFileError(t("csvImport.maximumRows", { count: MAX_IMPORT_ROWS }));
      return;
    }
    const canonical = buildCanonicalImportRows(parsed);
    if (!canonical.success) {
      setFileError(INVALID_CSV_HEADER);
      return;
    }
    if (!canonical.rows.length) {
      setFileError(t("csvImport.fileEmpty"));
      return;
    }
    setRows(buildStagingRows(canonical.rows, categories));
  }

  function changeRow(line: number, patch: Partial<StagedRow>) {
    setRows((current) => current.map((row) => (row.line === line ? { ...row, ...patch } : row)));
    setResult(undefined);
    setSubmitError(undefined);
  }

  function selectRows(lines: number[], selected: boolean) {
    const selectedLines = new Set(lines);
    setRows((current) => current.map((row) => (selectedLines.has(row.line) ? { ...row, selected } : row)));
  }

  function deleteRows(lines: number[]) {
    const deletedLines = new Set(lines);
    const remaining = rows.filter((row) => !deletedLines.has(row.line));
    setRows(remaining);
    setPage((current) => Math.min(current, Math.max(1, Math.ceil(remaining.length / pageSize))));
  }

  async function submit() {
    setPending(true);
    setSubmitError(undefined);
    setResult(undefined);
    try {
      const response = await fetch("/api/v1/transactions/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultAccountId: accountId,
          rows: validRows.flatMap((row) =>
            row.value
              ? [{
                  line: row.line,
                  occurredOn: row.value.occurredOn,
                  amount: row.value.amount,
                  type: row.value.type,
                  account: row.value.account,
                  destinationAccount: row.value.destinationAccount,
                  description: row.value.description,
                  categoryId: row.value.type === "TRANSFER" ? null : row.categoryId || null,
                }]
              : [],
          ),
        }),
      });
      const body: unknown = await response.json();
      if (!response.ok && (!body || typeof body !== "object" || !("imported" in body))) {
        setSubmitError(t("csvImport.batchRequestFailed"));
        return;
      }
      if (!isBatchResult(body)) {
        setSubmitError(t("csvImport.batchRequestFailed"));
        return;
      }
      setResult(body);
    } catch {
      setSubmitError(t("csvImport.batchRequestFailed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <FormAlert error={fileError ?? submitError} />
      {fileError === INVALID_CSV_HEADER && (
        <p role="alert" className="text-sm text-red-600">
          {t("csvImport.canonicalHeaderRequired")} (<code>{INVALID_CSV_HEADER}</code>)
        </p>
      )}
      {result && (
        <div role={result.failed ? "alert" : "status"} className="rounded-md border p-3 text-sm">
          <p>
            {t("csvImport.batchResult", {
              imported: result.imported,
              skipped: result.skipped,
              failed: result.failed,
            })}
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-2 list-inside list-disc text-red-600">
              {result.errors.map((error) => (
                <li key={`${error.line}-${error.error}`}>
                  {t("common.row")} {error.line}: {error.error}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-4">
        <label className="flex min-w-56 flex-col gap-1 text-sm font-medium">
          <T id="csvImport.defaultAccount" />
          <select
            value={accountId}
            onChange={(event) => {
              setAccountId(event.target.value);
            }}
            className={inputClass}
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.currency})
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-56 flex-col gap-1 text-sm font-medium">
          <T id="csvImport.csvFile" />
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            onChange={(event) => onFile(event.target.files?.[0])}
            className={inputClass}
          />
        </label>
        <a
          href={`data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE)}`}
          download="fin-import-template.csv"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm underline dark:border-neutral-700"
        >
          <T id="csvImport.downloadTemplate" />
        </a>
      </div>

      {rows.length > 0 && (
        <section aria-label={t("csvImport.preview")} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">
              {t("csvImport.importableCount", { count: validRows.length })}; {invalidRows} {t("csvImport.selectedRowsInvalid")}.
            </p>
            <label className="flex items-center gap-2 text-sm">
              <T id="csvImport.rowsPerPage" />
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
                className={inputClass}
              >
                {[10, 25, 50].map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap gap-2 text-sm">
            <button type="button" onClick={() => selectRows(pageRows.map((row) => row.line), true)} className="underline">
              <T id="csvImport.selectPage" />
            </button>
            <button type="button" onClick={() => selectRows(rows.map((row) => row.line), true)} className="underline">
              <T id="csvImport.selectAllRows" />
            </button>
            <button type="button" onClick={() => selectRows(rows.map((row) => row.line), false)} className="underline">
              <T id="csvImport.clearSelection" />
            </button>
            <button
              type="button"
              onClick={() => deleteRows(activeRows.map((row) => row.line))}
              disabled={!activeRows.length}
              className="text-red-600 underline disabled:opacity-50"
            >
              <T id="csvImport.deleteSelectedRows" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="text-left text-neutral-500">
                <tr>
                  <th className="py-1"><T id="common.select" /></th>
                  <th><T id="common.row" /></th>
                  <th><T id="fields.date" /></th>
                  <th><T id="fields.description" /></th>
                  <th><T id="accounts.sourceAccount" /></th>
                  <th><T id="accounts.destinationAccount" /></th>
                  <th><T id="categories.category" /></th>
                  <th className="text-right"><T id="csvImport.amount" /></th>
                  <th><T id="common.delete" /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {pageRows.map((row) => {
                  const error = rowError(row, accounts, accountId, t);
                  const resolution = row.value ? resolveImportAccounts(row.value, accounts, accountId) : undefined;
                  const kind = row.value?.type.toLowerCase();
                  const allowedCategories = categories.filter((category) => category.kind === kind);
                  const shownAmount = row.value
                    ? row.value.type === "TRANSFER"
                      ? -row.value.amount
                      : row.value.amount
                    : undefined;

                  return (
                    <tr key={row.line} className={error ? "align-top text-red-600" : "align-top"}>
                      <td className="py-2">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          aria-label={t("csvImport.selectRow", { line: row.line })}
                          onChange={(event) => changeRow(row.line, { selected: event.target.checked })}
                        />
                      </td>
                      <td>{row.line}</td>
                      <td>{row.value?.occurredOn ?? "—"}</td>
                      <td>{row.value?.description ?? "—"}</td>
                      <td>
                        <p>{row.value?.account || <T id="csvImport.defaultAccountValue" />}</p>
                        {resolution?.ok && <p className="text-xs text-neutral-500">→ {resolution.source.name}</p>}
                      </td>
                      <td>
                        {row.value?.type === "TRANSFER" ? (
                          <>
                            <p>{row.value.destinationAccount ?? "—"}</p>
                            {resolution?.ok && resolution.destination && (
                              <p className="text-xs text-neutral-500">→ {resolution.destination.name}</p>
                            )}
                          </>
                        ) : "—"}
                      </td>
                      <td>
                        {row.value && row.value.type !== "TRANSFER" ? (
                          <>
                            <select
                              value={row.categoryId}
                              onChange={(event) => changeRow(row.line, { categoryId: event.target.value, categoryWarning: false })}
                              className={inputClass}
                              aria-label={t("csvImport.editCategory")}
                            >
                              <option value=""><T id="categories.uncategorized" /></option>
                              {allowedCategories.map((category) => (
                                <option key={category.id} value={category.id}>{category.name}</option>
                              ))}
                            </select>
                            {row.categoryWarning && (
                              <p className="mt-1 text-amber-700 dark:text-amber-400"><T id="csvImport.categoryNotMapped" /></p>
                            )}
                          </>
                        ) : "—"}
                      </td>
                      <td className="text-right">
                        {shownAmount !== undefined && resolution?.ok
                          ? formatMoney(shownAmount, resolution.source.currency, locale)
                          : row.value?.type ?? "—"}
                        {row.value && <span className="ml-1 text-xs">{row.value.type}</span>}
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => deleteRows([row.line])}
                          className="underline"
                        >
                          <T id="common.delete" />
                        </button>
                        {error && <p className="mt-1 max-w-48">{error}</p>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <nav aria-label={t("common.pagination")} className="flex items-center justify-between text-sm">
            <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="underline disabled:opacity-50">
              <T id="common.previous" />
            </button>
            <span>{t("common.pagePagePages", { page, pages: pageCount })}</span>
            <button type="button" disabled={page >= pageCount} onClick={() => setPage((current) => current + 1)} className="underline disabled:opacity-50">
              <T id="common.next" />
            </button>
          </nav>

          <button
            type="button"
            onClick={submit}
            disabled={pending || validRows.length === 0}
            className="self-start rounded-md bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-60"
          >
            {pending
              ? t("common.sending")
              : t("csvImport.importCountTransactions", { count: validRows.length })}
          </button>
        </section>
      )}
    </div>
  );
}
