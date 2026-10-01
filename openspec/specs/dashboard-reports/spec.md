# dashboard-reports Specification

## Purpose
Da al usuario una visión global de sus finanzas al abrir la aplicación: resultado del mes, en qué gasta, cómo evoluciona y qué necesita su atención.

## Requirements

### Requirement: Resumen del mes
El sistema SHALL mostrar para el mes seleccionado (por defecto el actual en la zona horaria del perfil) el total de ingresos, el total de gastos y el ahorro neto (ingresos menos gastos), considerando solo movimientos en la moneda base y excluyendo transferencias. También SHALL mostrar el saldo total de las cuentas activas por moneda.

#### Scenario: Mes con movimientos
- **WHEN** en septiembre hay ingresos de 2.000 € y gastos de 1.250 € en EUR, y una transferencia de 100 €
- **THEN** el panel muestra ingresos 2.000 €, gastos 1.250 € y ahorro neto 750 €

#### Scenario: Mes sin movimientos
- **WHEN** el mes seleccionado no tiene movimientos
- **THEN** el panel muestra 0 en ingresos, gastos y ahorro neto

### Requirement: Gasto por categoría
El sistema SHALL mostrar el gasto del mes agrupado por categoría principal (sumando sus subcategorías), ordenado de mayor a menor, con las 6 primeras y el resto agrupado en "Otros", e incluyendo "Sin categoría" cuando proceda.

#### Scenario: Subcategorías agregadas
- **WHEN** hay 120 € en "Supermercado" y 60 € en "Restaurantes"
- **THEN** "Alimentación" aparece con 180 €

### Requirement: Evolución mensual
El sistema SHALL mostrar ingresos y gastos de los últimos 6 meses hasta el seleccionado, incluidos los meses sin movimientos con valor 0.

#### Scenario: Meses vacíos
- **WHEN** un mes intermedio no tiene movimientos
- **THEN** aparece en la evolución con ingresos y gastos 0

### Requirement: Avisos
El sistema SHALL mostrar en el panel el número de programados vencidos, los presupuestos del mes en riesgo (≥ 80 %) o superados, y el progreso de las metas activas, cada uno con acceso a su sección.

#### Scenario: Programados vencidos
- **WHEN** hay 2 programados activos con fecha prevista anterior o igual a hoy
- **THEN** el panel indica "2 movimientos programados pendientes" con enlace para registrarlos

### Requirement: Datos privados en informes
Las agregaciones MUST calcularse solo con los datos del usuario autenticado.

#### Scenario: Aislamiento
- **WHEN** dos usuarios consultan el resumen del mismo mes
- **THEN** cada uno ve únicamente los totales de sus propios movimientos
