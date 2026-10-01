# Proposal

## Why

Registrar ingresos, gastos y transferencias es la función central de "fin": los saldos de cuentas, presupuestos, metas e informes dependen de ello. La tabla `transactions` existe con RLS, pero no hay forma de registrar movimientos ni garantías de coherencia (cuenta y categoría del mismo usuario, signo del importe, moneda de la cuenta).

## What Changes

- Alta de gastos e ingresos: cuenta, importe (positivo; el signo lo pone el tipo), fecha, categoría opcional del mismo tipo, descripción y notas.
- Transferencias entre dos cuentas propias de la misma moneda, registradas como dos movimientos enlazados y gestionadas de forma atómica.
- Listado paginado ordenado por fecha, con filtros por mes, cuenta, categoría, tipo y texto (web) y por mes y tipo (móvil).
- Edición y borrado de movimientos; en transferencias se editan/borran ambas patas juntas.
- Reglas de integridad en base de datos: cuenta y categoría propias, categoría del mismo tipo, signo coherente, moneda heredada de la cuenta, no se añaden movimientos a cuentas archivadas.
- Utilidades compartidas de fechas (hoy en la zona horaria del perfil, rango de mes).

Fuera de alcance: transferencias entre monedas distintas, adjuntos, división de un movimiento en varias categorías, importación CSV.

## Capabilities

### New Capabilities
- `transactions`: registro, consulta, edición y borrado de ingresos, gastos y transferencias.

### Modified Capabilities
<!-- Ninguna: el saldo de cuentas ya se define como saldo inicial + movimientos en `accounts`. -->

## Impact

- `packages/db`: trigger `validate_transaction`, funciones RPC `create_transfer` y `update_transfer`, índice por `transfer_group_id`.
- `packages/shared`: `transactionSchema`, `signedAmount`, `TRANSACTION_MESSAGES`, `transactionErrorMessage`, `todayInTimeZone`, `monthRange`, tests.
- `apps/web`: `(app)/transactions` (listado con filtros y paginación), `new`, `[id]`; enlace en cabecera.
- `apps/mobile`: pestaña "Movimientos" con listado por mes, alta, edición y borrado.
