# Tasks

## 1. Base de datos

- [x] 1.1 Añadir vista `account_balances` (`securityInvoker`) con `balance` y `transaction_count` en `packages/db`; verificar `pnpm db:generate` produce `CREATE VIEW ... WITH (security_invoker = true)`
- [x] 1.2 Migración personalizada con triggers `prevent_account_delete_with_transactions` (omitido en cascada) y `prevent_account_currency_change`; verificar que el SQL está en `packages/db/drizzle/`
- [x] 1.3 Aplicar con `pnpm db:migrate` y ampliar `verify-rls.sql`: saldo = inicial + movimientos, la vista no muestra cuentas ajenas, borrar cuenta con movimientos falla, cambiar moneda falla, borrar usuario sigue en cascada; verificar `pnpm db:verify-rls` imprime `RLS OK`

## 2. Dominio compartido (`@fin/shared`)

- [x] 2.1 Implementar `parseMoneyInput` con tests (enteros, decimales con `,` y `.`, miles, negativos, >2 decimales, texto inválido); verificar `pnpm --filter @fin/shared test`
- [x] 2.2 Implementar `ACCOUNT_TYPES`, `ACCOUNT_TYPE_LABELS`, `accountCreateSchema` y `accountUpdateSchema` (sin moneda) con tests; verificar tests en verde
- [x] 2.3 Añadir `totalsByCurrency(accounts)` (solo activas, agrupa por moneda) con tests; verificar tests en verde

## 3. Web

- [x] 3.1 Página `(app)/accounts` con listado activas/archivadas, saldo formateado con el locale del perfil, totales por moneda y estado vacío; enlace "Cuentas" en la cabecera; verificar en navegador con cuentas en EUR y USD
- [x] 3.2 Página `(app)/accounts/new` y Server Action `createAccount` con errores por campo; verificar alta válida y errores con datos inválidos
- [x] 3.3 Página `(app)/accounts/[id]` con edición (moneda solo lectura), archivar/desarchivar y borrar con confirmación, `notFound()` para cuentas no visibles; verificar edición, archivado, borrado sin movimientos, rechazo con movimientos y 404 con id ajeno
- [x] 3.4 Verificar `pnpm --filter @fin/web build` y `lint`

## 4. Móvil

- [x] 4.1 Pestaña "Cuentas" (native y web) con Stack interno y listado activas/archivadas + totales; verificar en Expo web
- [x] 4.2 Pantallas alta y edición (archivar, borrar con confirmación, mensaje si tiene movimientos) con TanStack Query; verificar alta, edición, archivado y borrado en Expo web

## 5. Verificación integrada

- [x] 5.1 Ejecutar `pnpm typecheck`, `pnpm test`, `pnpm lint` y `pnpm db:verify-rls`; verificar todo en verde
- [x] 5.2 Recorrer los escenarios de `specs/accounts` en web y móvil con dos usuarios; verificar que un usuario no ve ni modifica cuentas del otro
