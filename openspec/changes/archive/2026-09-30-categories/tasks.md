# Tasks

## 1. Base de datos

- [x] 1.1 Sustituir la unicidad de `categories` por índice único `(user_id, lower(name), parent_id) NULLS NOT DISTINCT` y generar migración; verificar que el SQL generado contiene `NULLS NOT DISTINCT`
- [x] 1.2 Migración personalizada: triggers `validate_category` y de borrado, función `seed_default_categories`, `handle_new_user` actualizado y siembra de perfiles existentes; aplicar con `pnpm db:migrate` sin errores
- [x] 1.3 Ampliar `verify-rls.sql`: categorías por defecto al crear usuario, duplicado insensible a mayúsculas en primer nivel, padre de otro tipo/usuario/subcategoría rechazado, borrado con hijos rechazado, borrado con movimientos deja `category_id` NULL; verificar `pnpm db:verify-rls` imprime `RLS OK`

## 2. Dominio compartido

- [x] 2.1 `categories.ts` en `@fin/shared` con esquemas, etiquetas, `buildCategoryTree` y `categoryErrorMessage`, con tests; verificar `pnpm --filter @fin/shared test`

## 3. Web

- [x] 3.1 Página `(app)/categories` agrupada por tipo con subcategorías y enlace "Categorías" en cabecera; verificar en navegador con las categorías por defecto
- [x] 3.2 Páginas `new` y `[id]` con Server Actions (crear, editar, borrar con confirmación), errores por campo y de BD mapeados, `notFound()` para ajenas; verificar alta de subcategoría, duplicado, borrado con hijos rechazado y 404 con id ajeno
- [x] 3.3 Verificar `pnpm --filter @fin/web build` y `lint`

## 4. Móvil

- [x] 4.1 Convertir `(app)/profile` en Stack con enlace a categorías y pantallas listado/alta/edición/borrado; verificar en Expo web alta, edición, duplicado y borrado

## 5. Verificación integrada

- [x] 5.1 Ejecutar `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm db:verify-rls`; verificar todo en verde
- [x] 5.2 Verificar con dos usuarios que ninguno ve ni modifica categorías del otro (UI y API)
