# Tasks

- [x] 1.1 Migración `delete_my_account` y prueba en `verify-rls.sql` (borra solo al invocante, en cascada); verificar `RLS OK`
- [x] 1.2 `toCsv` y `deleteAccountSchema` en `@fin/shared` con tests (inyección de fórmulas, comillas, separador); verificar tests
- [x] 1.3 Web: `/api/export` (JSON/CSV, 401 sin sesión) y sección "Tus datos" en perfil con borrado reautenticado; verificar en navegador
- [x] 1.4 Móvil: borrado de cuenta y enlace a exportación en perfil; verificar typecheck/lint
- [x] 1.5 `pnpm typecheck`, `test`, `lint`, `db:verify-rls` y build web en verde
