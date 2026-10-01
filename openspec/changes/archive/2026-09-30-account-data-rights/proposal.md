# Proposal

## Why

Los usuarios deben poder llevarse sus datos y eliminar su cuenta (RGPD, derechos de portabilidad y supresión). Hoy no existe ninguna de las dos opciones.

## What Changes

- Exportación de todos los datos del usuario en JSON y de los movimientos en CSV desde la web (el móvil enlaza a la web).
- Borrado definitivo de la cuenta y de todos sus datos, previa confirmación escribiendo "BORRAR" y la contraseña actual, en web y móvil.
- CSV protegido contra inyección de fórmulas.

## Capabilities

### New Capabilities
- `account-data-rights`: exportación de datos personales y supresión de la cuenta.

### Modified Capabilities
<!-- Ninguna. -->

## Impact

- `packages/db`: función `delete_my_account()` (SECURITY DEFINER limitada a `auth.uid()`).
- `packages/shared`: `toCsv`, `deleteAccountSchema`, tests.
- `apps/web`: ruta `/api/export`, sección "Tus datos" en perfil.
- `apps/mobile`: borrado de cuenta y enlace a exportación en perfil.
