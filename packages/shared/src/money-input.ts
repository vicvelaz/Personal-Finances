import type { Minor } from "./money";

/**
 * Parses a user-typed amount ("1.250,50", "1,250.50", "-30", "12,5") into minor units.
 * The last separator followed by 1-2 digits is the decimal mark; a lone separator followed
 * by exactly 3 digits is treated as a thousands separator. Returns null if invalid.
 */
export function parseMoneyInput(input: string): Minor | null {
  let s = input.trim().replace(/[\s\u00a0\u202f]/g, "").replace(/^\u2212/, "-");
  let sign = 1;
  if (s.startsWith("-") || s.startsWith("+")) {
    if (s[0] === "-") sign = -1;
    s = s.slice(1);
  }
  if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return null;

  const lastSep = Math.max(s.lastIndexOf(","), s.lastIndexOf("."));
  let intPart = s;
  let decPart = "";
  if (lastSep !== -1) {
    const sepChar = s[lastSep]!;
    const after = s.slice(lastSep + 1);
    const hasOtherSep = s.includes(sepChar === "," ? "." : ",");
    const sepCount = s.split(sepChar).length - 1;
    const isThousands = !hasOtherSep && (sepCount > 1 || after.length === 3);
    if (!isThousands) {
      intPart = s.slice(0, lastSep);
      decPart = after;
      if (decPart.length === 0 || decPart.length > 2 || !/^\d+$/.test(decPart)) return null;
    }
  }

  const groups = intPart.split(/[.,]/);
  if (groups.length > 1) {
    if (groups[0] === "" || groups[0]!.length > 3 || groups.slice(1).some((g) => !/^\d{3}$/.test(g))) {
      return null;
    }
  }
  const digits = groups.join("");
  if (!/^\d*$/.test(digits) || (digits === "" && decPart === "")) return null;

  const minor = Number(digits || "0") * 100 + Number(decPart.padEnd(2, "0") || "0");
  if (!Number.isSafeInteger(minor)) return null;
  return minor === 0 ? 0 : sign * minor;
}

/** Formats minor units for an editable input, using the locale's decimal mark and no grouping. */
export function minorToInput(minor: Minor, locale = "es-ES"): string {
  const decimalMark = new Intl.NumberFormat(locale).format(1.5).includes(",") ? "," : ".";
  const abs = Math.abs(minor);
  const text = `${Math.floor(abs / 100)}${decimalMark}${String(abs % 100).padStart(2, "0")}`;
  return minor < 0 ? `-${text}` : text;
}
