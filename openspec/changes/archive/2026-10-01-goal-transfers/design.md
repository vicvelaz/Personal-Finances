# Design: goal-transfers

- `transactions.goal_id uuid` → `savings_goals(id)` ON DELETE SET NULL (+ índice). Borrar la meta conserva las transferencias.
- `adjust_goal` se recrea con `p_account uuid DEFAULT NULL, p_on date DEFAULT current_date` (las llamadas existentes siguen valiendo). Con `p_account`: exige cuenta vinculada (`goal_no_account`), llama a `create_transfer` (origen/destino según el signo) y marca ambas piernas con `goal_id`; después ajusta `current_amount`. Todo en una función: cualquier error revierte también la transferencia. Monedas distintas → `transfer_to_amount_required` (se pide usar la misma moneda).
- Mensajes: `goal_no_account` → "Vincula una cuenta a la meta para mover dinero"; `transfer_same_account` → "Elige una cuenta distinta de la de la meta"; `transfer_to_amount_required` → "La cuenta debe tener la misma moneda que la meta".
- Web: `AdjustGoal` recibe cuentas elegibles (activas, misma moneda, distintas de la vinculada) y muestra el selector solo si hay cuenta vinculada; el detalle lista movimientos con `goal_id` de la pierna de la cuenta de la meta.
- Móvil: equivalente en la pantalla de la meta.
