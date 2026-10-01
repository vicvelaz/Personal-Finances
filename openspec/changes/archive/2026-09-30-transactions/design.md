# Design

## Context

- `transactions` (`packages/db/src/schema/transactions.ts`): `amount` con signo en céntimos, `currency`, `occurred_on date`, `category_id` (SET NULL), `transfer_group_id` y `scheduled_transaction_id` sin uso aún. RLS owner-only. `account_balances` ya suma `amount`.
- Patrones de cambios anteriores: triggers `P0001` con códigos de mensaje, mapeo a mensajes en `@fin/shared`, Server Actions en web, TanStack Query en móvil.

## Goals / Non-Goals

**Goals:** coherencia de datos garantizada en BD aunque se use la API directamente; transferencias atómicas.
**Non-Goals:** búsqueda de texto completo; agregados/resúmenes (irán en `dashboard-reports`).

## Decisions

### D1. Trigger `validate_transaction` (BEFORE INSERT/UPDATE, SECURITY INVOKER)
- Lee la cuenta con RLS del invocante: si no existe → `transaction_invalid_account`. Copia `NEW.currency := cuenta.currency`.
- Si es INSERT o cambia `account_id` y la cuenta está archivada → `transaction_account_archived`.
- `kind = transfer` exige `category_id IS NULL`, `transfer_group_id IS NOT NULL` y `amount <> 0`; `expense` exige `amount < 0`; `income` exige `amount > 0` → `transaction_invalid_amount` / `transaction_invalid_category`.
- Si hay `category_id`, la categoría debe ser visible y del mismo `kind` → `transaction_invalid_category`.
- Esto también cierra el riesgo señalado en `accounts-management` (movimientos apuntando a cuentas ajenas).

### D2. Transferencias vía RPC
Funciones SQL `SECURITY INVOKER` (RLS aplica): `create_transfer(p_from, p_to, p_amount, p_occurred_on, p_description, p_notes) returns uuid` y `update_transfer(p_group, …)`. Validan `p_from <> p_to`, `p_amount > 0` y misma moneda (`transfer_currency_mismatch`, `transfer_same_account`); insertan/actualizan ambas patas en la misma transacción. Borrado: `DELETE … WHERE transfer_group_id = $1` (una sentencia, atómica). La pata negativa es el origen.
- Alternativa: dos inserts desde el cliente. Descartada: no atómico.

### D3. Formularios
Importe siempre positivo en UI; `signedAmount(kind, minor)` aplica el signo. Esquema `transactionSchema` con `superRefine`: `toAccountId` obligatorio y distinto en transferencias; `categoryId` ignorado en transferencias. Fecha `YYYY-MM-DD` validada como fecha real. `todayInTimeZone(tz)` con `Intl.DateTimeFormat('en-CA', { timeZone })`.

### D4. Listado
Consulta con embebidos PostgREST: `transactions.select('id, kind, amount, currency, occurred_on, description, transfer_group_id, account:accounts(id,name), category:categories(id,name,color)')`, orden `occurred_on desc, created_at desc`, `range()` de 50 y `count: 'exact'` para paginación en web. Filtro de mes con `monthRange('YYYY-MM')` → `gte/lte`. Filtro de categoría padre: `category_id in (padre + hijos)` resuelto en servidor a partir de la lista de categorías. Texto: `ilike` sobre `description` escapando `%`/`_`.
- Web: estado de filtros en `searchParams` (enlaces compartibles).
- Móvil: `useInfiniteQuery` por mes y tipo.

### D5. Edición de transferencias
Pantalla de edición común; si el movimiento tiene `transfer_group_id`, carga ambas patas y usa `update_transfer`/borrado por grupo.

## Risks / Trade-offs

- [Trigger añade lecturas por fila] → Volumen personal; índices por PK.
- [`ilike` sin índice] → Aceptable a esta escala.
- [Cambiar el `kind` de un movimiento a/desde transferencia] → No permitido en edición (se borra y se crea de nuevo); simplifica la lógica.

## Migration Plan

`pnpm db:generate` (índice) + migración personalizada (trigger y RPC) + `pnpm db:migrate`. Ajustar `verify-rls.sql`, que ya inserta movimientos de prueba coherentes.
