# Design

## Decisions

### D1. Agregaciones en SQL (SECURITY INVOKER, STABLE)
- `monthly_totals(p_from date, p_to date)` → `(month date, income bigint, expense bigint)`: `generate_series` de meses entre `date_trunc('month', p_from)` y `p_to`, `LEFT JOIN` con movimientos `kind in ('income','expense')` en `profiles.base_currency`; `expense` en positivo.
- `expenses_by_category(p_from, p_to)` → `(category_id, name, color, total)`: gastos en moneda base agrupados por `coalesce(c.parent_id, c.id)`; los sin categoría con `category_id NULL`.
RLS del invocante limita todas las tablas. Evita descargar todos los movimientos al cliente.

### D2. Utilidades compartidas
`groupTopCategories(rows, n = 6)` ordena por total y agrupa el resto en `{ id: 'other', name: 'Otros' }`; nombra `null` como "Sin categoría". `netSavings(income, expense)`.

### D3. Web
Server Component en `(app)/page.tsx`: consultas en paralelo (`monthly_totals` 6 meses, `expenses_by_category`, `account_balances`, `budget_progress`, programados vencidos, metas activas). Gráficos en un componente cliente con Recharts (`BarChart` de evolución y barras horizontales por categoría). Navegación de mes por `?month=`.

### D4. Móvil
`(app)/index.tsx` con TanStack Query y las mismas funciones; gráficos como barras con `View` (sin dependencias nuevas). Enlaces a Presupuestos, Programados y Metas.

## Risks / Trade-offs

- [Solo moneda base] → Indicado en la pantalla, coherente con presupuestos.
