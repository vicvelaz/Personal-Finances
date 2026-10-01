# Spec Delta

## Purpose

Permite repartir un movimiento entre varias categorías manteniendo coherentes presupuestos e informes.

## ADDED Requirements

### Requirement: Dividir un movimiento
El sistema SHALL permitir dividir un gasto o ingreso en al menos 2 partes, cada una con categoría opcional del mismo tipo e importe mayor que 0. La suma de las partes MUST ser igual al importe del movimiento; si no, se muestra "Las partes deben sumar el total del movimiento". Las transferencias MUST NOT poder dividirse. El usuario SHALL poder quitar la división.

#### Scenario: División válida
- **WHEN** divide un gasto de 100 € en 40 € Restaurantes y 60 € Salud
- **THEN** el movimiento aparece como "Dividido" y conserva su importe total

#### Scenario: Suma incorrecta
- **WHEN** las partes suman 90 € para un gasto de 100 €
- **THEN** ve "Las partes deben sumar el total del movimiento" y no se guarda nada

#### Scenario: Cambiar el importe de un movimiento dividido
- **WHEN** edita el importe total sin ajustar las partes
- **THEN** ve el mismo error y el cambio no se guarda

#### Scenario: Quitar la división
- **WHEN** pulsa "Quitar división"
- **THEN** el movimiento vuelve a tener una sola línea sin categoría

### Requirement: Informes con divisiones
Los presupuestos y el gasto por categoría SHALL contabilizar cada parte en su categoría en lugar del movimiento completo.

#### Scenario: Presupuesto
- **WHEN** 40 € de un gasto dividido van a Restaurantes (subcategoría de Alimentación)
- **THEN** el presupuesto de Alimentación suma 40 €, no el total del movimiento
