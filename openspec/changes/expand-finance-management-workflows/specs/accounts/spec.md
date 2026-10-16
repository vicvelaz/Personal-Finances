# Spec Delta

## ADDED Requirements

### Requirement: Conciliación del saldo de cuenta
El sistema SHALL permitir al usuario fijar el saldo real de una cuenta propia activa. En una sola operación, MUST calcular la diferencia respecto del saldo contable a la fecha y registrar un ajuste interno por esa diferencia; si la diferencia es cero, MUST NOT crear movimiento. El ajuste SHALL cambiar el saldo de la cuenta, MUST NOT computar como gasto o ingreso en presupuestos ni informes y SHALL mostrarse como "Ajuste de saldo / No contabilizado". Solo el propietario MUST poder conciliar la cuenta.

#### Scenario: Saldo real superior al contable
- **WHEN** el saldo contable de una cuenta es 120 € y el usuario concilia un saldo real de 150 €
- **THEN** el sistema registra un ajuste de +30 € y el saldo de la cuenta pasa a 150 €

#### Scenario: Saldo real inferior al contable
- **WHEN** el saldo contable de una cuenta es 150 € y el usuario concilia un saldo real de 120 €
- **THEN** el sistema registra un ajuste de -30 € y el saldo de la cuenta pasa a 120 €

#### Scenario: Sin diferencia
- **WHEN** el usuario concilia la cuenta con su saldo contable actual
- **THEN** el saldo no cambia y no se crea ningún ajuste

#### Scenario: Ajuste excluido de informes
- **WHEN** un informe calcula gastos e ingresos de una categoría que tiene una cuenta conciliada
- **THEN** el ajuste modifica el saldo de la cuenta pero no se suma al gasto ni al ingreso

