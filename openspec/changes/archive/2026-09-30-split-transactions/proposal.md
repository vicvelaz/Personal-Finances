# Proposal: split-transactions

## Why
Un mismo ticket suele mezclar categorías (supermercado + farmacia). Hoy un movimiento solo admite una categoría, así que presupuestos e informes pierden precisión.

## What Changes
- Un gasto o ingreso puede dividirse en 2 o más partes, cada una con su categoría e importe, que deben sumar exactamente el total.
- Presupuestos y gasto por categoría usan las partes en lugar del movimiento completo.
- Editor de división en el detalle del movimiento (web y móvil) y etiqueta "Dividido" en las listas.

## Impact
- Specs: `transactions` (ADDED).
- DB: tabla `transaction_splits` (RLS + MFA), vista `transaction_lines`, triggers de validación y suma (diferida), RPC `set_transaction_splits`, `budget_progress` y `expenses_by_category` reescritas sobre la vista.
- Shared: `splitsSchema`, `splitRemaining`, mensajes de error.
- Web y móvil: editor de división.
