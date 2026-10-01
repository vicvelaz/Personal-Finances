# Design

## Context

- `accounts` ya existe con RLS "owner only" (`packages/db/src/schema/accounts.ts`); `transactions.account_id` referencia `accounts.id` con `ON DELETE CASCADE` y `amount` con signo en céntimos.
- Web y móvil acceden a Supabase directamente (ver diseño de `auth-and-profile`): Server Actions en web, `supabase-js` + TanStack Query en móvil.
- Requisitos: `specs/accounts/spec.md`.

## Goals / Non-Goals

**Goals:**
- Saldo actual correcto sin duplicar lógica en web y móvil.
- Evitar pérdida accidental de movimientos por el `ON DELETE CASCADE`.

**Non-Goals:**
- Conversión de divisas o total en moneda base.
- Paginación (número de cuentas por usuario pequeño).

## Decisions

### D1. Vista `account_balances` con `security_invoker`
Vista Postgres (`pgView` de Drizzle con `.with({ securityInvoker: true })`) que devuelve las columnas de `accounts` más `balance = opening_balance + coalesce(sum(transactions.amount), 0)` y `transaction_count`. Con `security_invoker` la vista aplica las políticas RLS del usuario que consulta, así que no filtra por `user_id` manualmente.
- Alternativa: calcular en cliente sumando movimientos. Descartada: descarga todos los movimientos y duplica lógica.
- Alternativa: columna `current_balance` mantenida por trigger. Descartada por ahora: más complejidad y riesgo de desincronización; revisable si hay problemas de rendimiento.

### D2. Borrado protegido en base de datos
Además del chequeo en UI, una función trigger `BEFORE DELETE ON accounts` lanza error (`P0001`, mensaje `account_has_transactions`) si existen movimientos. Así la regla se cumple aunque se llame a la API directamente, y el `ON DELETE CASCADE` sigue sirviendo para el borrado del usuario completo (el trigger se omite cuando el borrado viene en cascada desde `profiles`, detectado con `pg_trigger_depth() > 1`).
- Alternativa: cambiar la FK a `RESTRICT`. Descartada: rompería el borrado en cascada al eliminar la cuenta de usuario.

### D3. Moneda inmutable
El esquema `accountUpdateSchema` no incluye `currency` y las actualizaciones solo envían los campos permitidos. Complemento en BD: trigger `BEFORE UPDATE` que rechaza cambios de `currency`.

### D4. Parseo de importes en `@fin/shared`
`parseMoneyInput(text): number | null` acepta signo, separador de miles opcional (`.` o espacio cuando hay `,` decimal; `,` cuando hay `.` decimal) y hasta 2 decimales; devuelve céntimos enteros calculados sobre la cadena (sin `parseFloat * 100`). `accountCreateSchema` lo usa vía `z.string().transform`.
- Formateo con el `formatMoney` existente usando el `locale` del perfil.

### D5. UI
- Web: `(app)/accounts/page.tsx` (listado + totales, Server Component), `new/page.tsx` y `[id]/page.tsx` con formulario cliente (`useActionState`) y Server Actions `createAccount`, `updateAccount`, `setArchived`, `deleteAccount`. `[id]` devuelve `notFound()` si la cuenta no es visible (RLS).
- Móvil: nueva pestaña `accounts` (Stack interno: `index`, `new`, `[id]`), hooks `useAccounts`/`useAccountMutations` con TanStack Query e invalidación de `['accounts']`.
- Tipos de cuenta con etiquetas en español en `@fin/shared` (`ACCOUNT_TYPE_LABELS`).

## Risks / Trade-offs

- [Vista recalcula en cada consulta] → Índice `transactions_account_idx` existente; suficiente para volúmenes personales.
- [Triggers fuera de Drizzle] → Migración SQL personalizada, cubierta por el script de verificación de BD.
- [Integridad cruzada: un movimiento podría referenciar una cuenta ajena] → Se abordará en el cambio `transactions` (política `WITH CHECK` que verifique la propiedad de la cuenta).

## Migration Plan

`pnpm db:generate` (vista) + migración personalizada (triggers) + `pnpm db:migrate`. Rollback: eliminar vista y triggers; sin cambios en datos.
