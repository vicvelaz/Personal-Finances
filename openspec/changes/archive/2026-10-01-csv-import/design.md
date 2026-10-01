# Design: csv-import

## Shared (`csv-import.ts`)
- `parseCsv(text)`: quita BOM, detecta separador (`;`, `,`, `\t`) en la primera línea fuera de comillas, RFC 4180 (comillas dobles escapadas, saltos de línea en campos), ignora líneas vacías. Deshace el prefijo `'` anti-fórmulas que añade nuestra exportación.
- `guessMapping(headers)`: sinónimos en español/inglés (fecha/date/f. valor, importe/amount/cantidad, descripción/concepto/description, categoría/category).
- `parseImportDate`: `AAAA-MM-DD`, `DD/MM/AAAA`, `DD-MM-AAAA`, `DD.MM.AAAA`.
- `buildImportRows(rows, mapping)`: filas con `{ line, value }` o `{ line, error }`; importe con `parseMoneyInput` (≠ 0), descripción ≤ 120.
- `importRowSchema` y `MAX_IMPORT_ROWS = 1000` para revalidar en el servidor.

## Web
- `/transactions/import` (cliente): cuenta, fichero (FileReader, ≤ 1 MB), selects de columnas, "La primera fila es cabecera", tabla de vista previa (primeras 50 filas + contador de errores) y botón "Importar N movimientos".
- `importTransactions(accountId, rowsJson)`: revalida con zod, comprueba la cuenta (RLS), resuelve categorías por nombre (sin distinguir mayúsculas) y tipo, consulta los existentes del rango de fechas para omitir duplicados, inserta en bloque y devuelve importados/omitidos. Errores de trigger (cuenta archivada…) se muestran con `transactionErrorMessage`.
