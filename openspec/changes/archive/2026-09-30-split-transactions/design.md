# Design: split-transactions

## Datos
- `transaction_splits(id, user_id, transaction_id → transactions cascade, category_id → categories set null, amount bigint con signo del padre, note, created_at)`. RLS owner + MFA.
- Trigger `validate_split` (BEFORE): el padre existe y es del mismo usuario, no es transferencia (`split_transfer`), importe con el mismo signo y ≠ 0, categoría del usuario y del mismo tipo.
- Constraint triggers DIFERIDOS en `transaction_splits` y en `transactions` (update de amount/kind): si hay partes, su suma = importe del padre (`split_sum_mismatch`). Diferidos para permitir reemplazar partes dentro de una transacción.
- `set_transaction_splits(p_transaction_id, p_splits jsonb)` (INVOKER): borra las partes, inserta las nuevas con magnitudes positivas firmadas según el padre, exige ≥ 2 (`split_too_few`) y suma exacta (error inmediato), y pone `category_id = null` en el padre. Array vacío = quitar división.
- Vista `transaction_lines` (security_invoker): una fila por parte o por movimiento sin partes. `budget_progress` y `expenses_by_category` la usan; `monthly_totals` no cambia (los totales son los mismos).

## UI
- Web: componente cliente `SplitEditor` en `/transactions/[id]` con filas categoría/importe, "Añadir parte", resto por asignar, "Guardar división" y "Quitar división". Lista: "Dividido" como categoría.
- Móvil: sección equivalente en la pantalla de edición del movimiento.
