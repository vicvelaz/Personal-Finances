# Proposal: multi-currency

## Why
Las cuentas pueden estar en distintas monedas, pero los informes, presupuestos y el panel solo cuentan la moneda base, y no se puede transferir entre cuentas de distinta moneda.

## What Changes
- Tabla de tipos de cambio (referencia BCE vía Frankfurter) actualizada por una ruta protegida (`/api/cron/fx`, con `CRON_SECRET`), con opción de cargar histórico.
- Informes, presupuestos y panel convierten cada movimiento a la moneda base con el tipo de su fecha (o el más cercano).
- Patrimonio total convertido en el panel, avisando de las monedas sin tipo disponible.
- Transferencias entre monedas distintas indicando el importe recibido.

## Impact
- Specs: `multi-currency` (nueva).
- DB: `exchange_rates` (lectura para autenticados), `fx_rate`, `convert_amount`, `net_worth`; `monthly_totals`, `expenses_by_category`, `budget_progress` con conversión; `create_transfer`/`update_transfer` con `p_to_amount`.
- Shared: `FX_CURRENCIES`, `parseFrankfurterRates`, `toAmount` en `transactionSchema`.
- Web y móvil: campo "Importe recibido" y patrimonio en el panel.
