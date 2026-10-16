"use client";

import { formatManualDate, formatMonth, isValidIsoDate, maskManualDateInput, parseManualDate, shiftMonth } from "@fin/shared";
import { useState } from "react";
import { useTranslations } from "@/components/i18n-provider";

export function DateInput({
  id,
  name,
  defaultValue,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: {
  id: string;
  name: string;
  defaultValue?: string | null;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  const { locale, t } = useTranslations();
  const initialIso = defaultValue && isValidIsoDate(defaultValue) ? defaultValue : "";
  const [draft, setDraft] = useState(() => (initialIso ? formatManualDate(initialIso) ?? "" : ""));
  const [month, setMonth] = useState(
    () => initialIso.slice(0, 7) || new Date().toISOString().slice(0, 7),
  );
  const [calendarOpen, setCalendarOpen] = useState(false);
  const iso = parseManualDate(draft);
  const draftInvalid = draft !== "" && iso === null;
  const showDraftError = draftInvalid && !ariaInvalid;
  const describedBy = [ariaDescribedBy, showDraftError ? `${id}-manual-error` : undefined]
    .filter(Boolean)
    .join(" ") || undefined;
  const [year, monthNumber] = month.split("-").map(Number);
  const firstWeekday = new Date(Date.UTC(year!, monthNumber! - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year!, monthNumber!, 0)).getUTCDate();
  const days = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(
      new Date(Date.UTC(2023, 0, index + 1)),
    ),
  );

  function selectDate(day: number) {
    const value = `${month}-${String(day).padStart(2, "0")}`;
    const formatted = formatManualDate(value);
    if (!formatted) return;
    setDraft(formatted);
    setCalendarOpen(false);
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="DD/MM/YYYY"
          aria-invalid={ariaInvalid || draftInvalid}
          aria-describedby={describedBy}
          value={draft}
          onChange={(event) => {
            const value = maskManualDateInput(event.target.value);
            setDraft(value);
            const parsed = parseManualDate(value);
            if (parsed) setMonth(parsed.slice(0, 7));
          }}
          className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700"
        />
        <button
          type="button"
          aria-label={t("Abrir calendario")}
          aria-expanded={calendarOpen}
          onClick={() => setCalendarOpen((open) => !open)}
          className="min-h-11 min-w-11 rounded-md border border-neutral-300 px-3 dark:border-neutral-700"
        >
          <span aria-hidden="true">▦</span>
        </button>
      </div>
      <input type="hidden" name={name} value={iso ?? ""} />
      {showDraftError && (
        <p id={`${id}-manual-error`} role="alert" className="mt-1 text-sm text-red-700 dark:text-red-300">
          {t("Fecha no válida")}
        </p>
      )}
      {calendarOpen && (
        <div
          role="dialog"
          aria-label={t("Calendario")}
          className="absolute left-0 top-full z-20 mt-2 w-72 rounded-md border border-neutral-300 bg-white p-3 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
        >
          <div className="mb-2 flex items-center justify-between gap-1">
            <button
              type="button"
              aria-label={t("Año anterior")}
              onClick={() => setMonth((current) => shiftMonth(current, -12))}
              className="min-h-11 rounded px-2 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 dark:hover:bg-neutral-800"
            >
              «
            </button>
            <button
              type="button"
              aria-label={t("Mes anterior")}
              onClick={() => setMonth((current) => shiftMonth(current, -1))}
              className="min-h-11 rounded px-2 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 dark:hover:bg-neutral-800"
            >
              ‹
            </button>
            <strong aria-live="polite" className="flex-1 text-center">
              {formatMonth(month, locale)}
            </strong>
            <button
              type="button"
              aria-label={t("Mes siguiente")}
              onClick={() => setMonth((current) => shiftMonth(current, 1))}
              className="min-h-11 rounded px-2 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 dark:hover:bg-neutral-800"
            >
              ›
            </button>
            <button
              type="button"
              aria-label={t("Año siguiente")}
              onClick={() => setMonth((current) => shiftMonth(current, 12))}
              className="min-h-11 rounded px-2 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 dark:hover:bg-neutral-800"
            >
              »
            </button>
          </div>
          <div className="grid grid-cols-7 text-center text-xs text-neutral-600 dark:text-neutral-300">
            {weekdays.map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
          </div>
          <div className="grid grid-cols-7 text-center">
            {days.map((day, index) =>
              day === null ? (
                <span key={`empty-${index}`} aria-hidden="true" />
              ) : (
                <button
                  key={day}
                  type="button"
                  aria-label={t("Seleccionar fecha {date}", { date: `${String(day).padStart(2, "0")}/${String(monthNumber).padStart(2, "0")}/${year}` })}
                  aria-pressed={iso === `${month}-${String(day).padStart(2, "0")}`}
                  onClick={() => selectDate(day)}
                  className={`min-h-11 rounded hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 dark:hover:bg-blue-950 ${
                    iso === `${month}-${String(day).padStart(2, "0")}` ? "bg-blue-700 font-bold text-white dark:bg-blue-300 dark:text-neutral-900" : ""
                  }`}
                >
                  {day}
                </button>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
