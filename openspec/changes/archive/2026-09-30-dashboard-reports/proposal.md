# Proposal

## Why

Con cuentas, movimientos, presupuestos, programados y metas ya disponibles, falta una vista de conjunto: la pantalla de inicio hoy es un marcador de posición. El usuario necesita ver de un vistazo cómo va el mes, en qué gasta y qué requiere su atención.

## What Changes

- Panel de inicio (web y móvil) para el mes seleccionado: ingresos, gastos y ahorro neto en la moneda base (sin transferencias), saldo total por moneda.
- Gasto por categoría principal del mes (las subcategorías se agregan en su padre; lo demás como "Otros").
- Evolución de ingresos y gastos de los últimos 6 meses.
- Avisos: programados vencidos, presupuestos en riesgo o superados, y progreso de metas activas, con enlaces a cada sección.
- Funciones SQL de agregación que respetan RLS.

Fuera de alcance: exportación, informes personalizables, conversión de divisas.

## Capabilities

### New Capabilities
- `dashboard-reports`: resumen financiero del mes, desglose por categoría, evolución mensual y avisos.

### Modified Capabilities
<!-- Ninguna. -->

## Impact

- `packages/db`: funciones `monthly_totals(p_from, p_to)` y `expenses_by_category(p_from, p_to)`.
- `packages/shared`: `groupTopCategories`, `netSavings`, tests.
- `apps/web`: página `(app)/page.tsx` con gráficos (Recharts, ya instalado).
- `apps/mobile`: pantalla `(app)/index.tsx` con resumen y barras nativas.
