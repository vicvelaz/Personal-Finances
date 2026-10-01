# Proposal

## Why

Las cuentas (banco, efectivo, tarjeta, inversión, préstamo) son el contenedor de todos los movimientos: sin ellas no se pueden registrar transacciones, presupuestos ni metas. La tabla `accounts` ya existe con RLS, pero no hay forma de gestionarla desde web ni móvil.

## What Changes

- Alta de cuentas con nombre, tipo, moneda y saldo inicial (importe decimal con signo, guardado en céntimos).
- Listado de cuentas activas con saldo actual y total por moneda; las archivadas se muestran aparte.
- Edición de nombre, tipo y saldo inicial; la moneda no se puede cambiar una vez creada.
- Archivar / desarchivar cuentas; borrado solo permitido si la cuenta no tiene movimientos.
- Saldo actual calculado en base de datos (saldo inicial + suma de movimientos) respetando RLS.
- Validación y parseo de importes compartidos en `@fin/shared` (acepta `1234,56` y `1234.56`).
- Pantallas en web (`/accounts`) y móvil (pestaña "Cuentas").

Fuera de alcance: conversión entre monedas, totales consolidados en moneda base, importación bancaria, reordenar cuentas.

## Capabilities

### New Capabilities
- `accounts`: gestión de cuentas del usuario (alta, listado con saldos, edición, archivado y borrado).

### Modified Capabilities
<!-- Ninguna: el aislamiento por usuario ya está cubierto por user-profile. -->

## Impact

- `packages/db`: vista `account_balances` (security invoker) y migración.
- `packages/shared`: esquemas `accountCreateSchema`/`accountUpdateSchema`, `ACCOUNT_TYPES`, `parseMoneyInput`, tests.
- `apps/web`: rutas `(app)/accounts`, `(app)/accounts/new`, `(app)/accounts/[id]`, enlace en la cabecera.
- `apps/mobile`: pestaña `accounts` con listado, alta y edición.
