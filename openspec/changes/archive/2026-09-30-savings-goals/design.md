# Design

## Context

`savings_goals(user_id, account_id → accounts SET NULL, name, target_amount, current_amount default 0, currency, target_date, status goal_status[active|achieved|archived])` con RLS owner-only.

## Decisions

### D1. Trigger `validate_goal` (BEFORE INSERT/UPDATE, SECURITY INVOKER)
`target_amount > 0` (`goal_invalid_target`), `current_amount >= 0` (`goal_negative_amount`), cuenta visible, del usuario y misma moneda (`goal_invalid_account`). Estado: si no está `archived`, `status := CASE WHEN current >= target THEN 'achieved' ELSE 'active' END`.

### D2. `adjust_goal(p_id, p_delta bigint)`
`UPDATE … SET current_amount = current_amount + p_delta WHERE id = p_id RETURNING …`; sin fila → `goal_not_found`. El trigger impide negativos, así que la operación es atómica y concurrente-segura.

### D3. Progreso en `@fin/shared`
`goalProgress({ target, current, targetDate, today })` → `percent` (1 decimal, máx. 100 en la barra), `remaining` (≥0), `monthsLeft` (meses naturales hasta la fecha, mínimo 1 si es futura, `null` si no hay fecha o ya pasó) y `monthlyNeeded` redondeado al céntimo hacia arriba.

### D4. UI
Web `/goals` (Activas, Conseguidas, Archivadas) con barra de progreso; `new`; `[id]` con edición, formulario Aportar/Retirar, archivar/reactivar y borrar. Móvil en Perfil → Metas de ahorro con las mismas acciones.

## Risks / Trade-offs

- [Aportaciones manuales no se reflejan en cuentas] → Explícito en la UI; enlazar con movimientos queda para el futuro.
