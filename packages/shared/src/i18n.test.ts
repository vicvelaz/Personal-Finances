import { describe, expect, it } from "vitest";
import {
  catalogs,
  getLanguage,
  SUPPORTED_LANGUAGES,
  translate,
  translateKey,
  type TranslationKey,
} from "./i18n";

describe("language selection", () => {
  it.each([
    ["es-ES", "es"],
    ["es-MX", "es"],
    ["en-US", "en"],
    ["en-GB", "en"],
    [undefined, "es"],
  ] as const)("maps %s to %s", (locale, language) => {
    expect(getLanguage(locale)).toBe(language);
  });
});

describe("translate", () => {
  it("keeps the language list and hierarchical catalogs in sync", () => {
    expect(Object.keys(catalogs).sort()).toEqual(
      [...SUPPORTED_LANGUAGES].sort(),
    );

    const signInTitle: TranslationKey = "auth.signInTitle";
    expect(translateKey("en-US", signInTitle)).toBe("Sign in");
    expect(translateKey("es-ES", signInTitle)).toBe("Iniciar sesión");
  });

  it("supports typed English keys with interpolation", () => {
    expect(translateKey("en-US", "fields.amount")).toBe("Amount");
    expect(
      translateKey("en-US", "csvImport.fileLargerThanSizeMb", { size: 2 }),
    ).toBe("The file cannot be larger than 2 MB");
  });

  it("uses the selected language catalog", () => {
    expect(translate("es-ES", "Guardar")).toBe("Guardar");
    expect(translate("en-US", "Guardar")).toBe("Save");
  });

  it("substitutes interpolation values", () => {
    expect(
      translate(
        "en-US",
        "Importes convertidos a {currency}, sin transferencias.",
        { currency: "EUR" },
      ),
    ).toBe("Amounts converted to EUR, excluding transfers.");
    expect(
      translate("en-US", "El fichero no puede tener más de 12 filas"),
    ).toBe("The file cannot contain more than 12 rows");
    expect(translate("en-US", "Dividido (3)")).toBe("Split (3)");
  });

  it("keeps Spanish source text as the default and falls back for missing entries", () => {
    expect(translate("es-ES", "Guardar")).toBe("Guardar");
    expect(translate("en-US", "Texto nuevo")).toBe("Texto nuevo");
  });
});
