# Spec Delta

## ADDED Requirements

### Requirement: Aportaciones virtuales desde presupuestos
El sistema SHALL permitir que el cierre mensual asigne un sobrante presupuestario a una meta de ahorro propia y activa, en la misma moneda base del presupuesto. La operación MUST actualizar el saldo de la meta y registrar el origen y periodo del sobrante de forma atómica e idempotente. SHALL ser una reasignación virtual, MUST NOT crear transferencias ni movimientos de cuenta y MUST NOT permitir que la meta quede con un saldo negativo. Si la operación falla, ni el saldo de la meta ni el cierre del sobrante MUST cambiar.

#### Scenario: Asignación válida
- **WHEN** el usuario asigna 50 € de sobrante de un presupuesto mensual a una meta propia activa
- **THEN** el saldo de la meta aumenta 50 € y el cierre identifica el sobrante como aportado a esa meta

#### Scenario: Meta de otro usuario o archivada
- **WHEN** un cierre intenta asignar sobrante a una meta ajena o archivada
- **THEN** el sistema rechaza la asignación y conserva sin cambios tanto la meta como el sobrante

#### Scenario: Repetición de la operación
- **WHEN** se reintenta la misma asignación de sobrante tras un resultado ya confirmado
- **THEN** el sistema no vuelve a sumar el importe al saldo de la meta

#### Scenario: Sin movimiento bancario
- **WHEN** se completa una asignación virtual desde presupuesto a meta
- **THEN** no se crea transferencia ni cambia el saldo de ninguna cuenta

