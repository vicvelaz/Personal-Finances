# Proposal: csv-import

## Why
Registrar a mano el histórico del banco es tedioso. Casi todos los bancos exportan CSV, y la propia app exporta movimientos en CSV.

## What Changes
- Página web "Importar CSV": elegir cuenta y fichero, asignar columnas (fecha, importe, descripción, categoría) con detección automática, vista previa con errores por fila e importación.
- El servidor revalida cada fila, asigna categorías por nombre y omite duplicados (misma cuenta, fecha, importe y descripción).
- Parser compartido y probado (separador `;`, `,` o tabulador, comillas, BOM, fechas `AAAA-MM-DD`/`DD/MM/AAAA`, importes con coma o punto decimal).

## Impact
- Specs: `transactions` (ADDED).
- Shared: `csv-import.ts`.
- Web: `/transactions/import` y Server Action `importTransactions`. Sin cambios de base de datos (RLS y triggers existentes validan cada fila).
