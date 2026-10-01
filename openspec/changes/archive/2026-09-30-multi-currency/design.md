# Design: multi-currency

## Datos
- `exchange_rates(base, quote, rate_date, rate numeric(20,10), fetched_at)`, PK `(base, quote, rate_date)`. Política SELECT para `authenticated`; escrituras solo con service role.
- `fx_rate(from, to, on)`: 1 si son iguales; si no, `EUR→to / EUR→from` usando para cada moneda el tipo con `rate_date <= on` más reciente o, si no hay, el más próximo posterior. NULL si no hay datos.
- `convert_amount(amount, from, to, on)` = `round(amount * fx_rate)`. Los importes están en céntimos para todas las monedas, así que el factor es directo.
- `monthly_totals`, `expenses_by_category` y `budget_progress` suman `convert_amount(...)` (NULL se ignora). `net_worth()` devuelve total convertido a hoy, moneda base y monedas sin tipo.
- `resolve_transfer_amount(from, to, amount, to_amount)` sustituye a `assert_transfer`: mismas comprobaciones; con monedas distintas exige `to_amount > 0` (`transfer_to_amount_required`) y lo devuelve. `create_transfer`/`update_transfer` aceptan `p_to_amount` (DEFAULT NULL) y usan ese importe en la pierna destino.

## Actualización
- `GET /api/cron/fx[?from=YYYY-MM-DD]` con `Authorization: Bearer $CRON_SECRET` (comparación en tiempo constante). Descarga de `api.frankfurter.app` (latest o serie desde `from`), `parseFrankfurterRates` y upsert con cliente service role. Preparado para Vercel Cron o cualquier planificador.

## UI
- `toAmount` opcional en `transactionSchema`; el formulario lo muestra cuando origen y destino tienen distinta moneda.
- Panel: "Patrimonio" convertido y aviso de monedas sin tipo; texto "Importes convertidos a <base>".
- `verify-rls.sql` vacía `exchange_rates` al inicio (dentro de la transacción) para que las pruebas sean deterministas.
