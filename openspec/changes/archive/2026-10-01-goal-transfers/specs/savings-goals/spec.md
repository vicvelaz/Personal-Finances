# Spec Delta

## Purpose

Hace que las aportaciones a metas muevan dinero real entre cuentas para que los saldos reflejen lo apartado.

## ADDED Requirements

### Requirement: Aportaciones con transferencia
Cuando una meta tiene cuenta vinculada, el usuario SHALL poder indicar una cuenta al aportar o retirar. El sistema MUST crear, en la misma operación que el ajuste, una transferencia desde esa cuenta a la de la meta (aportar) o desde la cuenta de la meta a esa cuenta (retirar), con la fecha indicada y descripción "Aportación a <meta>" o "Retirada de <meta>". Si la operación falla (p. ej. retirar más de lo ahorrado), no MUST quedar ni transferencia ni ajuste. Sin cuenta indicada, el ajuste sigue sin generar movimientos.

#### Scenario: Aportar desde otra cuenta
- **WHEN** aporta 100 € a una meta vinculada a "Ahorro" indicando la cuenta "Nómina"
- **THEN** "Nómina" baja 100 €, "Ahorro" sube 100 € y la meta suma 100 €

#### Scenario: Retirar más de lo ahorrado
- **WHEN** intenta retirar más de lo ahorrado hacia una cuenta
- **THEN** ve "No puedes retirar más de lo ahorrado" y no se crea ninguna transferencia

#### Scenario: Meta sin cuenta vinculada
- **WHEN** indica una cuenta en una meta sin cuenta vinculada
- **THEN** ve "Vincula una cuenta a la meta para mover dinero"

### Requirement: Historial de la meta
El detalle de la meta SHALL listar las transferencias asociadas con fecha, cuenta e importe.

#### Scenario: Ver historial
- **WHEN** abre una meta con aportaciones con transferencia
- **THEN** ve cada aportación y retirada con su fecha e importe
