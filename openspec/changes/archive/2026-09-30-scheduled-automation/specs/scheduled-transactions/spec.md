# Spec Delta

## Purpose

Automatiza los movimientos programados de importe fijo y avisa al usuario antes de sus vencimientos.

## ADDED Requirements

### Requirement: Registro automático
El sistema SHALL permitir marcar un movimiento programado de importe fijo como "Registrar automáticamente". Un proceso periódico MUST crear el movimiento real de cada vencimiento cuya fecha sea igual o anterior al día actual en la zona horaria del usuario, incluidos los atrasados, y avanzar la siguiente fecha. Los importes estimados MUST NOT poder registrarse automáticamente. Un fallo en un programado no MUST impedir procesar los demás.

#### Scenario: Vencimiento automático
- **WHEN** llega la fecha de un programado automático activo
- **THEN** se crea el movimiento con su importe y la siguiente fecha avanza según la periodicidad

#### Scenario: Vencimientos atrasados
- **WHEN** un programado automático mensual tiene dos vencimientos pasados sin registrar
- **THEN** se crean dos movimientos y la siguiente fecha queda en el futuro

#### Scenario: Importe estimado
- **WHEN** el usuario marca como automático un programado con importe estimado
- **THEN** ve "Los importes estimados no se pueden registrar automáticamente"

#### Scenario: Sin acceso de usuarios
- **WHEN** un usuario autenticado intenta ejecutar el proceso periódico
- **THEN** la base de datos lo rechaza por falta de permisos

### Requirement: Recordatorios
El usuario SHALL poder indicar cuántos días antes (0–30) quiere un recordatorio de cada programado. La app móvil MUST programar una notificación local a las 9:00 del día correspondiente para cada programado activo con recordatorio y reprogramarlas cuando cambien los datos.

#### Scenario: Recordatorio programado
- **WHEN** un programado vence el día 10 con recordatorio de 2 días
- **THEN** la app móvil muestra una notificación el día 8 a las 9:00

#### Scenario: Valor fuera de rango
- **WHEN** el usuario introduce 45 días
- **THEN** ve "Introduce un número de días entre 0 y 30"
