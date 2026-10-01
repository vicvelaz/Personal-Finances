# Design

## Context

`scheduled_transactions` ya tiene cuenta, categoría, `kind`, `amount`, `currency`, `description`, `recurrence` (enum con `none`), `starts_on`, `ends_on`, `next_run_on`, `is_estimated`, `reminder_days_before`, `is_active`; RLS owner-only. `transactions.scheduled_transaction_id` sin FK. Regla de signo y validaciones de movimientos en `validate_transaction`.

## Goals / Non-Goals

**Goals:** registro atómico; fechas sin deriva; reglas en BD.
**Non-Goals:** ejecución automática (sin cron para no depender de extensiones ni de estado del servidor); notificaciones (`reminder_days_before` se mantiene sin uso).

## Decisions

### D1. `next_occurrence(p_start, p_recurrence, p_current) returns date` (IMMUTABLE)
Días fijos para diaria/semanal/quincenal. Para mensual/trimestral/anual calcula la siguiente ocurrencia desde el ancla `p_start` (`p_start + k * step meses`), así Postgres ajusta el fin de mes en cada ocurrencia sin arrastrar el día 28. `none` → NULL.

### D2. Trigger `validate_scheduled` (SECURITY INVOKER)
Solo `expense`/`income` (`scheduled_invalid_kind`); cuenta visible y del usuario (`transaction_invalid_account`), copia su moneda; categoría del mismo tipo (`transaction_invalid_category`); signo según tipo (`transaction_invalid_amount`); `ends_on >= starts_on` (`scheduled_invalid_dates`). En INSERT, o si cambian `starts_on`/`recurrence`, `next_run_on := starts_on`.

### D3. `post_scheduled(p_id, p_occurred_on, p_amount)` y `skip_scheduled(p_id)` (SECURITY INVOKER)
`SELECT … FOR UPDATE` del programado (RLS: ajeno = no encontrado → `scheduled_not_found`), exige `is_active` (`scheduled_inactive`). `post` inserta el movimiento (las reglas de `validate_transaction` aplican) con `scheduled_transaction_id` e importe `p_amount` (magnitud) o el previsto. Ambos avanzan `next_run_on` con `next_occurrence`; si es NULL o supera `ends_on`, `is_active := false`.

### D4. Compartido y UI
`@fin/shared/scheduled.ts`: `RECURRENCES`, `RECURRENCE_LABELS`, `scheduledSchema` (reutiliza parseo de importes y `isValidIsoDate`), `scheduledErrorMessage` (reutiliza mensajes de movimientos), `isDue(nextRunOn, today)`.
Web `/scheduled` con secciones Vencidos / Próximos / Inactivos, botones Registrar (con importe editable si es estimado) y Omitir; `new` y `[id]` con formulario y pausa/borrado. Móvil en `Perfil → Programados` (Stack existente).

## Risks / Trade-offs

- [Sin ejecución automática, el usuario debe abrir la app] → Los vencidos se destacan; el panel de inicio los mostrará en `dashboard-reports`.
- [Editar `recurrence`/`starts_on` reinicia la próxima fecha] → Comportamiento explícito y predecible.
