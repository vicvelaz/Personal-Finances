# Tasks

## 1. Base de datos

- [x] 1.1 Migración personalizada con `validate_budget`, `budget_progress` y `copy_budgets`; aplicar con `pnpm db:migrate` y verificar que el fichero no está vacío
- [x] 1.2 Ampliar `verify-rls.sql`: categoría de ingresos/ajena rechazada, importe no positivo rechazado, mes normalizado, gasto incluye subcategorías y excluye otras monedas y transferencias, copia sin duplicar; verificar `RLS OK`

## 2. Dominio compartido

- [x] 2.1 `budgets.ts` (`budgetSchema`, `budgetStatus`, `BUDGET_MESSAGES`, `budgetErrorMessage`) con tests; verificar tests en verde

## 3. Web

- [x] 3.1 Página `/budgets` con navegación por mes, progreso, alta, edición, borrado y copia; enlace en cabecera; aviso en borrado de categoría; verificar en navegador
- [x] 3.2 Verificar `build` y `lint` de web

## 4. Móvil

- [x] 4.1 Pestaña "Presupuestos" con progreso por mes, alta, edición, borrado y copia; verificar en Expo web

## 5. Verificación integrada

- [x] 5.1 `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm db:verify-rls` en verde y prueba de aislamiento entre usuarios por API
