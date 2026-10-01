# Proposal

## Why

Saber cuánto se ha gastado frente a lo planificado por categoría es la principal herramienta de control del gasto. La tabla `budgets` existe (una fila por categoría y mes) pero no hay gestión ni cálculo del progreso.

## What Changes

- Presupuestos mensuales por categoría de gasto (principal o subcategoría) en la moneda base del perfil.
- Vista mensual con importe presupuestado, gastado, restante y porcentaje; aviso visual al superar el 80 % y el 100 %.
- El gasto de una categoría principal incluye el de sus subcategorías.
- Alta, edición del importe y borrado de presupuestos; copia de los presupuestos del mes anterior.
- Reglas en base de datos: categoría propia de tipo gasto, mes normalizado al día 1, importe positivo, un presupuesto por categoría y mes.
- Aviso al borrar una categoría de que se borrarán sus presupuestos.
- Pantallas en web (`/budgets`) y móvil (pestaña "Presupuestos").

Fuera de alcance: presupuestos en otras monedas, presupuestos anuales, arrastre del sobrante, notificaciones.

## Capabilities

### New Capabilities
- `budgets`: presupuestos mensuales por categoría de gasto y seguimiento del gasto frente a lo planificado.

### Modified Capabilities
<!-- Ninguna (el aviso en el borrado de categorías es de interfaz y no cambia el requisito). -->

## Impact

- `packages/db`: trigger `validate_budget`, funciones `budget_progress(p_month)` y `copy_budgets(p_from, p_to)`.
- `packages/shared`: `budgetSchema`, `budgetStatus`, `BUDGET_MESSAGES`, tests.
- `apps/web`: `(app)/budgets`, enlace en cabecera, aviso en borrado de categoría.
- `apps/mobile`: pestaña "Presupuestos".
