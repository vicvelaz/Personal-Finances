# Design

## Context

`budgets(user_id, category_id → categories ON DELETE CASCADE, period_start date, amount bigint)` con `UNIQUE(user_id, category_id, period_start)` y RLS. Movimientos con `amount` negativo para gastos y `currency` de la cuenta. Perfil con `base_currency`.

## Goals / Non-Goals

**Goals:** cálculo del progreso en base de datos respetando RLS; mismas reglas desde web y móvil.
**Non-Goals:** conversión de divisas; presupuestos globales sin categoría.

## Decisions

### D1. Trigger `validate_budget`
BEFORE INSERT/UPDATE: normaliza `period_start := date_trunc('month', period_start)`, exige `amount > 0` (`budget_invalid_amount`) y categoría visible, del mismo usuario y `kind = 'expense'` (`budget_invalid_category`). Duplicado → `23505`.

### D2. `budget_progress(p_month date)` (SECURITY INVOKER, STABLE)
Devuelve `budget_id, category_id, category_name, color, parent_id, amount, spent`. `spent = -sum(t.amount)` de movimientos `kind = 'expense'` del usuario, con `currency = profiles.base_currency`, fecha dentro del mes y `category_id` igual a la categoría o a una hija suya. RLS limita todas las tablas al invocante.
- Alternativa: vista. Descartada: el mes es un parámetro.

### D3. `copy_budgets(p_from date, p_to date) returns int`
`INSERT … SELECT … ON CONFLICT DO NOTHING` con `auth.uid()`; devuelve filas creadas.

### D4. Estado en `@fin/shared`
`budgetStatus(amount, spent)` → `{ remaining, percent, level: 'ok'|'warning'|'over' }` (warning ≥ 80 %, over > 100 %). `budgetSchema` (categoría uuid, mes `YYYY-MM`, importe positivo).

### D5. UI
Web `/budgets?month=YYYY-MM` (Server Component) con barra de progreso, formulario de alta (categorías de gasto sin presupuesto ese mes), edición del importe en línea, borrado y "Copiar mes anterior". Móvil: pestaña "Presupuestos" con la misma información y formulario de alta/edición. El confirm de borrado de categoría menciona que se borrarán sus presupuestos.

## Risks / Trade-offs

- [Gastos en otra moneda no cuentan] → Se indica en la pantalla que solo se consideran movimientos en la moneda base.
- [Presupuesto de padre e hijo a la vez cuentan el mismo gasto] → Aceptado: son vistas distintas del mismo gasto.
