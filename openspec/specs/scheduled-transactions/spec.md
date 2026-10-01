# scheduled-transactions Specification

## Purpose
Permite al usuario definir ingresos y gastos que se repiten o que están previstos, ver cuáles vencen y convertirlos en movimientos reales con un solo paso.

## Requirements

### Requirement: Definición de movimiento programado
El sistema SHALL permitir crear y editar movimientos programados de gasto o ingreso con cuenta propia, categoría opcional del mismo tipo, importe positivo, descripción obligatoria (máximo 120 caracteres), periodicidad (única, diaria, semanal, quincenal, mensual, trimestral o anual), fecha de inicio, fecha de fin opcional (no anterior a la de inicio) e indicador de importe estimado. La primera fecha prevista MUST ser la fecha de inicio.

#### Scenario: Alta mensual
- **WHEN** el usuario programa "Alquiler" de 800 € mensual desde el 1 de octubre de 2026
- **THEN** aparece con próxima fecha 1 de octubre de 2026

#### Scenario: Datos inválidos
- **WHEN** falta la descripción, el importe no es positivo o la fecha de fin es anterior a la de inicio
- **THEN** el sistema lo rechaza mostrando el error del campo

### Requirement: Registro y omisión de vencimientos
El sistema SHALL mostrar como vencidos los programados activos cuya próxima fecha sea hoy o anterior (en la zona horaria del perfil). Registrar un vencido MUST crear en una sola operación el movimiento real (fecha e importe previstos, o los indicados por el usuario) enlazado al programado y avanzar la próxima fecha. Omitir MUST avanzar la próxima fecha sin crear movimiento.

#### Scenario: Registrar
- **WHEN** el usuario registra el "Alquiler" vencido el 1 de octubre
- **THEN** se crea un gasto de 800 € con fecha 1 de octubre y la próxima fecha pasa a 1 de noviembre

#### Scenario: Importe estimado
- **WHEN** el programado es estimado y el usuario registra con importe 64,30 €
- **THEN** el movimiento se crea con 64,30 € y el programado conserva su importe previsto

#### Scenario: Fin de mes
- **WHEN** un programado mensual empieza el 31 de enero
- **THEN** sus siguientes fechas son el último día de febrero, 31 de marzo y 30 de abril

### Requirement: Finalización
El sistema SHALL desactivar un programado cuando su siguiente fecha supere la fecha de fin o tras registrar u omitir uno de periodicidad única. El usuario SHALL poder pausar y reactivar programados, y borrarlos sin afectar a los movimientos ya registrados.

#### Scenario: Fecha de fin
- **WHEN** se registra la última ocurrencia anterior a la fecha de fin
- **THEN** el programado pasa a inactivo

#### Scenario: Borrado
- **WHEN** el usuario borra un programado con movimientos ya registrados
- **THEN** el programado desaparece y los movimientos se conservan

### Requirement: Programados privados
Un usuario MUST NOT poder ver, registrar, modificar ni borrar programados de otro usuario, ni programar en cuentas o categorías ajenas.

#### Scenario: Programado ajeno
- **WHEN** un usuario intenta registrar un programado de otro usuario
- **THEN** el sistema lo rechaza sin crear movimientos

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
