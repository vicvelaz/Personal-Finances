# Tasks

## 1. Base de datos

- [x] 1.1 Migración personalizada con `monthly_totals` y `expenses_by_category`; aplicar y verificar que el fichero no está vacío
- [x] 1.2 Ampliar `verify-rls.sql`: meses vacíos con 0, transferencias y otras monedas excluidas, subcategorías agregadas en su padre, sin categoría; verificar `RLS OK`

## 2. Dominio compartido

- [x] 2.1 `reports.ts` (`groupTopCategories`, `netSavings`) con tests; verificar tests en verde

## 3. Web

- [x] 3.1 Panel de inicio con resumen, saldos por moneda, gráficos (evolución y categorías), avisos y navegación por mes; verificar en navegador, `build` y `lint`

## 4. Móvil

- [x] 4.1 Pantalla de inicio con resumen, barras por categoría y evolución, avisos y enlaces; verificar en Expo web

## 5. Verificación integrada

- [x] 5.1 `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm db:verify-rls` en verde y aislamiento por API
