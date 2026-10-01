# Tasks

## 1. Base de datos

- [x] 1.1 Migración personalizada con `validate_goal` y `adjust_goal`; aplicar y verificar que el fichero no está vacío
- [x] 1.2 Ampliar `verify-rls.sql`: estado automático, retirada que deja negativo rechazada, cuenta de otra moneda o ajena rechazada, archivada conserva estado, meta ajena; verificar `RLS OK`

## 2. Dominio compartido

- [x] 2.1 `goals.ts` con esquemas, `goalProgress`, etiquetas y mapeo de errores, con tests; verificar tests en verde

## 3. Web

- [x] 3.1 `/goals`, `new` y `[id]` con aportar/retirar, archivar y borrar; enlace en cabecera; verificar en navegador y `build`/`lint`

## 4. Móvil

- [x] 4.1 Perfil → Metas de ahorro con listado, alta, edición, aportar/retirar, archivar y borrar; verificar en Expo web

## 5. Verificación integrada

- [x] 5.1 `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm db:verify-rls` en verde y aislamiento por API
