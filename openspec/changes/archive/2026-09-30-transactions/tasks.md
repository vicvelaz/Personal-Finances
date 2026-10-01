# Tasks

## 1. Base de datos

- [x] 1.1 Índice `transactions_transfer_group_idx` en el esquema y migración generada; verificar el `CREATE INDEX` en el SQL
- [x] 1.2 Migración personalizada con `validate_transaction`, `create_transfer` y `update_transfer`; aplicar con `pnpm db:migrate` sin errores
- [x] 1.3 Ampliar `verify-rls.sql`: signo por tipo, moneda heredada, categoría de otro tipo o ajena, cuenta ajena o archivada, transferencia válida/misma cuenta/monedas distintas, `update_transfer` y borrado por grupo; verificar `pnpm db:verify-rls` imprime `RLS OK`

## 2. Dominio compartido

- [x] 2.1 `dates.ts` (`todayInTimeZone`, `monthRange`, `isValidIsoDate`, `shiftMonth`) con tests; verificar tests en verde
- [x] 2.2 `transactions.ts` (`TRANSACTION_KINDS`, etiquetas, `transactionSchema`, `signedAmount`, `transactionErrorMessage`, `escapeLike`) con tests; verificar `pnpm --filter @fin/shared test`

## 3. Web

- [x] 3.1 Página `(app)/transactions` con filtros (mes, tipo, cuenta, categoría con hijos, texto) en `searchParams`, paginación de 50 y estado vacío; enlace en cabecera; verificar en navegador
- [x] 3.2 Páginas `new` y `[id]` con formulario (gasto/ingreso/transferencia), Server Actions (crear, editar, borrar con confirmación) y errores mapeados; verificar gasto, ingreso, transferencia, monedas distintas rechazadas, edición y borrado de transferencia, 404 con id ajeno
- [x] 3.3 Verificar `pnpm --filter @fin/web build` y `lint`

## 4. Móvil

- [x] 4.1 Pestaña "Movimientos" con listado por mes (navegación anterior/siguiente), filtro de tipo y carga incremental; verificar en Expo web
- [x] 4.2 Pantallas alta y edición (incluida transferencia) con borrado; verificar alta, edición y borrado en Expo web

## 5. Verificación integrada

- [x] 5.1 Ejecutar `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm db:verify-rls`; verificar todo en verde
- [x] 5.2 Verificar con dos usuarios que ninguno ve ni modifica movimientos del otro ni registra en cuentas ajenas (UI y API)
