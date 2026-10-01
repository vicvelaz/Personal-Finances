# Proposal

## Why

Ahorrar con un objetivo concreto (vacaciones, fondo de emergencia, entrada de una vivienda) motiva y ayuda a planificar. La tabla `savings_goals` existe pero no hay forma de crear metas ni de seguir su progreso.

## What Changes

- Alta, edición, archivado y borrado de metas: nombre, importe objetivo, moneda, fecha objetivo opcional y cuenta asociada opcional (de la misma moneda).
- Aportaciones y retiradas que actualizan el importe ahorrado de forma atómica; el ahorrado nunca puede ser negativo.
- Estado automático: la meta pasa a "conseguida" al alcanzar el objetivo y vuelve a "activa" si baja de él; "archivada" es manual.
- Progreso: porcentaje, importe restante y, si hay fecha objetivo, aportación mensual necesaria.
- Pantallas en web (`/goals`) y móvil (Perfil → Metas de ahorro).

Fuera de alcance: vincular aportaciones a movimientos reales, aportaciones automáticas periódicas.

## Capabilities

### New Capabilities
- `savings-goals`: metas de ahorro con seguimiento de progreso.

### Modified Capabilities
<!-- Ninguna. -->

## Impact

- `packages/db`: trigger `validate_goal`, función `adjust_goal`.
- `packages/shared`: `goalSchema`, `goalAdjustSchema`, `goalProgress`, `GOAL_STATUS_LABELS`, mensajes, tests.
- `apps/web`: `(app)/goals`, `new`, `[id]`; enlace en cabecera.
- `apps/mobile`: Perfil → Metas de ahorro.
