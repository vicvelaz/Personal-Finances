# Proposal

## Why

Gran parte de las finanzas personales son movimientos que se repiten (nómina, alquiler, suscripciones, recibos). Registrarlos a mano cada vez es tedioso y fácil de olvidar. La tabla `scheduled_transactions` existe pero no tiene gestión ni forma de generar los movimientos.

## What Changes

- Alta, edición, pausa y borrado de movimientos programados de gasto o ingreso: cuenta, categoría, importe, descripción, periodicidad (única, diaria, semanal, quincenal, mensual, trimestral, anual), fecha de inicio, fecha de fin opcional e indicador de importe estimado.
- Listado con los vencidos (fecha prevista hoy o antes), los próximos y los inactivos.
- "Registrar" un vencido crea el movimiento real (con la fecha e importe previstos, editables si es estimado) y avanza a la siguiente fecha; "Omitir" avanza sin registrar. Al superar la fecha de fin, o tras registrar uno de periodicidad única, queda inactivo.
- Cálculo de fechas sin deriva en fin de mes (31 de enero → 28/29 de febrero → 31 de marzo).
- Reglas en BD equivalentes a las de movimientos (cuenta y categoría propias, tipo coherente, moneda de la cuenta).

Fuera de alcance: registro automático en segundo plano, recordatorios/notificaciones push, transferencias programadas.

## Capabilities

### New Capabilities
- `scheduled-transactions`: movimientos recurrentes o previstos y su conversión en movimientos reales.

### Modified Capabilities
<!-- Ninguna. -->

## Impact

- `packages/db`: funciones `next_occurrence`, `post_scheduled`, `skip_scheduled`; trigger `validate_scheduled`.
- `packages/shared`: `RECURRENCES`, `RECURRENCE_LABELS`, `scheduledSchema`, `scheduledErrorMessage`, tests.
- `apps/web`: `(app)/scheduled` (listado, alta, edición), enlace en cabecera.
- `apps/mobile`: Perfil → Programados (listado, registrar/omitir, alta, edición).
