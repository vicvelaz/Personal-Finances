# Proposal: goal-transfers

## Why
Las aportaciones a metas solo cambian un contador: el dinero no se mueve entre cuentas, así que los saldos no reflejan lo apartado.

## What Changes
- Al aportar o retirar de una meta con cuenta vinculada, el usuario puede elegir otra cuenta: se crea una transferencia (origen → cuenta de la meta al aportar; al revés al retirar) y se ajusta el ahorrado en una sola operación.
- Las transferencias quedan asociadas a la meta y se listan en su detalle.

## Impact
- Specs: `savings-goals` (ADDED).
- DB: `transactions.goal_id` (FK set null), `adjust_goal(p_id, p_delta, p_account, p_on)` con transferencia opcional.
- Shared: `accountId` opcional en `goalAdjustSchema`, mensajes nuevos.
- Web y móvil: selector de cuenta al aportar/retirar e historial de movimientos de la meta.
