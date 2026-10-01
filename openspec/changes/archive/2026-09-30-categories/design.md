# Design

## Context

- `categories` existe (`packages/db/src/schema/categories.ts`) con RLS owner-only, `parent_id` autorreferencia `ON DELETE SET NULL`, `UNIQUE(user_id, name, parent_id)` (sin efecto cuando `parent_id` es NULL) y `monthly_limit` (no se usa en este cambio).
- `transactions.category_id` y `scheduled_transactions.category_id` → `ON DELETE SET NULL`; `budgets.category_id` → `ON DELETE CASCADE`.
- Patrones ya establecidos en `accounts-management`: Server Actions en web, TanStack Query en móvil, triggers `P0001` para reglas, `verify-rls.sql`.

## Goals / Non-Goals

**Goals:** integridad de la jerarquía en BD; categorías iniciales sin intervención del usuario.
**Non-Goals:** más de un nivel de jerarquía; traducción de categorías por defecto según locale.

## Decisions

### D1. Unicidad insensible a mayúsculas y con NULL
Sustituir la restricción por un índice único `(user_id, lower(name), parent_id) NULLS NOT DISTINCT` (Postgres 15+; Supabase usa 17). Violación → código `23505`, mapeado a "Ya existe una categoría con ese nombre".
- Alternativa: `coalesce(parent_id, '0000…')` en el índice. Descartada: menos legible.

### D2. Trigger `validate_category` (BEFORE INSERT/UPDATE)
Rechaza con `P0001`:
- `category_invalid_parent`: el padre no existe para el mismo `user_id`, es de otro `kind`, tiene a su vez padre, o es la propia categoría.
- `category_has_children`: se asigna padre o se cambia `kind` a una categoría con hijos.
`SECURITY INVOKER`: la consulta al padre respeta RLS, así que un padre de otro usuario se ve como inexistente.

### D3. Trigger de borrado (BEFORE DELETE)
Rechaza `category_has_children` si tiene hijos y `pg_trigger_depth() = 1` (el borrado en cascada desde `profiles` no se bloquea). Hace innecesario el `ON DELETE SET NULL` de `parent_id`, que se mantiene sin cambios.

### D4. Categorías por defecto
Función `public.seed_default_categories(uid uuid)` (`SECURITY DEFINER`, `search_path=''`, `EXECUTE` revocado a `anon`/`authenticated`) que inserta padres e hijos por defecto. `handle_new_user` la llama tras crear el perfil. La migración la ejecuta para perfiles existentes sin categorías. La lista solo existe en la función SQL (única fuente de verdad).
- Alternativa: sembrar desde el cliente al primer login. Descartada: carreras entre web y móvil y duplicados.

### D5. UI
- `@fin/shared`: `CATEGORY_KINDS`, `CATEGORY_KIND_LABELS`, `categoryCreateSchema`/`categoryUpdateSchema` (color `#RRGGBB` opcional, `parentId` uuid o vacío→null), `buildCategoryTree(rows)` (agrupa por tipo, ordena con `localeCompare` y anida hijos), `CATEGORY_MESSAGES` y `categoryErrorMessage(code, message)` para mapear errores de BD.
- Web: `(app)/categories` (Server Component), `new` y `[id]` con formulario cliente; el selector de padre solo muestra categorías de primer nivel del tipo elegido (filtrado en cliente).
- Móvil: `(app)/profile` pasa a carpeta con Stack: `index` (perfil actual + enlace "Categorías"), `categories/index`, `categories/new`, `categories/[id]`. Evita una quinta pestaña.

## Risks / Trade-offs

- [Cambiar el índice único sobre datos existentes] → Solo hay datos de prueba; la migración falla si hubiera duplicados, lo que es el comportamiento deseado.
- [Borrar categoría borra sus presupuestos (CASCADE)] → Aceptado; se revisará en `budgets` (aviso en UI entonces).

## Migration Plan

`pnpm db:generate` (índice) + migración personalizada (triggers, función de siembra, `handle_new_user` actualizado, siembra de existentes) + `pnpm db:migrate`.
