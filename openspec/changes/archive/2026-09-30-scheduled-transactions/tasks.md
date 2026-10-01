# Tasks

## 1. Base de datos

- [x] 1.1 Migración personalizada con `next_occurrence`, `validate_scheduled`, `post_scheduled` y `skip_scheduled`; aplicar y verificar que el fichero no está vacío
- [x] 1.2 Ampliar `verify-rls.sql`: fechas fin de mes, registro con y sin importe, omisión, desactivación por fecha de fin y periodicidad única, tipo transferencia rechazado, programado ajeno; verificar `RLS OK`

## 2. Dominio compartido

- [x] 2.1 `scheduled.ts` con esquemas, etiquetas, `isDue` y mapeo de errores, con tests; verificar tests en verde

## 3. Web

- [x] 3.1 `/scheduled` con vencidos/próximos/inactivos, registrar (importe editable si estimado) y omitir; `new` y `[id]` con edición, pausa y borrado; enlace en cabecera; verificar en navegador
- [x] 3.2 Verificar `build` y `lint` de web

## 4. Móvil

- [x] 4.1 Perfil → Programados con listado, registrar/omitir, alta, edición y borrado; verificar en Expo web

## 5. Verificación integrada

- [x] 5.1 `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm db:verify-rls` en verde y prueba de aislamiento por API
