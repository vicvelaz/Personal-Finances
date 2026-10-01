# Proposal

## Why

Los movimientos, presupuestos y recurrentes se clasifican por categoría; sin categorías no hay informes ni presupuestos útiles. La tabla `categories` existe con RLS, pero no hay gestión, ni categorías iniciales, y la restricción de unicidad no impide duplicados en categorías de primer nivel (en Postgres los `NULL` de `parent_id` se consideran distintos).

## What Changes

- Categorías por defecto (gastos e ingresos, en español) creadas automáticamente para cada usuario nuevo y para los usuarios existentes sin categorías.
- Listado de categorías agrupado en Gastos e Ingresos, con subcategorías de un solo nivel.
- Alta y edición: nombre, tipo (gasto/ingreso), categoría padre opcional del mismo tipo y color opcional.
- Borrado con confirmación: los movimientos quedan "Sin categoría"; no se puede borrar una categoría que tenga subcategorías.
- Reglas de integridad en base de datos: nombre único por usuario y padre (también en primer nivel), padre del mismo usuario y tipo, jerarquía de un nivel.
- Esquemas y utilidades compartidas en `@fin/shared`.
- Pantallas en web (`/categories`) y móvil (desde Perfil → Categorías).

Fuera de alcance: iconos, reordenación manual, archivado de categorías, límite mensual por categoría (lo cubrirá `budgets`).

## Capabilities

### New Capabilities
- `categories`: categorías de ingresos y gastos del usuario, con subcategorías, valores iniciales y reglas de integridad.

### Modified Capabilities
<!-- Ninguna. -->

## Impact

- `packages/db`: unicidad con `NULLS NOT DISTINCT`, triggers de validación de padre y de borrado, siembra de categorías por defecto (trigger de alta de usuario + usuarios existentes).
- `packages/shared`: `categoryCreateSchema`, `categoryUpdateSchema`, `buildCategoryTree`, `categoryErrorMessage`, tests.
- `apps/web`: `(app)/categories`, `new`, `[id]`, enlace en cabecera.
- `apps/mobile`: perfil pasa a ser un Stack (`profile/index`, `profile/categories/*`).
