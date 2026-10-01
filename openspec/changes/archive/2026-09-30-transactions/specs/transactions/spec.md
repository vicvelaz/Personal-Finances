# Spec Delta

## Purpose

Permite al usuario registrar y consultar sus ingresos, gastos y transferencias entre cuentas, que son la base del cálculo de saldos, presupuestos e informes.

## ADDED Requirements

### Requirement: Registro de gasto o ingreso
El sistema SHALL permitir registrar un gasto o un ingreso indicando cuenta propia activa, importe positivo con hasta 2 decimales, fecha (por defecto hoy en la zona horaria del perfil), categoría opcional del mismo tipo, descripción opcional (máximo 120 caracteres) y notas opcionales (máximo 500 caracteres). El sistema MUST guardar los gastos con importe negativo y los ingresos con importe positivo, en la moneda de la cuenta.

#### Scenario: Gasto válido
- **WHEN** el usuario registra un gasto de "12,50" en su cuenta en EUR con categoría "Supermercado"
- **THEN** el movimiento aparece en el listado como -12,50 € y el saldo de la cuenta disminuye 12,50 €

#### Scenario: Datos inválidos
- **WHEN** el usuario envía importe 0, negativo o no numérico, una fecha inválida o sin cuenta
- **THEN** el sistema no registra el movimiento y muestra el error del campo

#### Scenario: Categoría de otro tipo
- **WHEN** se intenta registrar un ingreso con una categoría de gastos
- **THEN** el sistema lo rechaza

#### Scenario: Cuenta archivada
- **WHEN** se intenta registrar un movimiento nuevo en una cuenta archivada
- **THEN** el sistema lo rechaza indicando que la cuenta está archivada

### Requirement: Transferencia entre cuentas
El sistema SHALL permitir transferir un importe positivo entre dos cuentas propias distintas, activas y de la misma moneda. La transferencia MUST registrarse de forma atómica como una salida en la cuenta origen y una entrada del mismo importe en la cuenta destino, y MUST NOT tener categoría.

#### Scenario: Transferencia válida
- **WHEN** el usuario transfiere 100 € de "Nómina" a "Ahorro"
- **THEN** "Nómina" disminuye 100 €, "Ahorro" aumenta 100 € y el total en EUR no cambia

#### Scenario: Monedas distintas
- **WHEN** el usuario intenta transferir entre una cuenta en EUR y otra en USD
- **THEN** el sistema lo rechaza indicando que las cuentas deben tener la misma moneda

#### Scenario: Misma cuenta
- **WHEN** el origen y el destino son la misma cuenta
- **THEN** el sistema lo rechaza

### Requirement: Listado de movimientos
El sistema SHALL mostrar los movimientos del usuario ordenados por fecha descendente, con fecha, descripción, cuenta, categoría (o "Sin categoría"), tipo e importe con signo en la moneda de la cuenta, paginados de 50 en 50. El sistema SHALL permitir filtrar por mes y tipo en web y móvil, y además por cuenta, categoría (incluyendo sus subcategorías) y texto en la descripción en web.

#### Scenario: Filtro por mes
- **WHEN** el usuario selecciona septiembre de 2026
- **THEN** solo ve movimientos con fecha entre el 1 y el 30 de septiembre de 2026

#### Scenario: Filtro por categoría padre
- **WHEN** el usuario filtra por "Alimentación"
- **THEN** ve los movimientos de "Alimentación", "Supermercado" y "Restaurantes"

#### Scenario: Sin resultados
- **WHEN** ningún movimiento cumple los filtros
- **THEN** el sistema muestra un mensaje indicándolo

### Requirement: Edición y borrado de movimientos
El sistema SHALL permitir editar y borrar movimientos propios con las mismas reglas que el alta. Editar o borrar una pata de una transferencia MUST aplicarse a ambas patas. El borrado MUST requerir confirmación.

#### Scenario: Editar importe
- **WHEN** el usuario cambia un gasto de 12,50 € a 15 €
- **THEN** el listado y el saldo de la cuenta reflejan el nuevo importe

#### Scenario: Borrar transferencia
- **WHEN** el usuario borra una transferencia
- **THEN** desaparecen ambos movimientos y los saldos de ambas cuentas vuelven a su valor anterior

### Requirement: Movimientos privados
Un usuario MUST NOT poder ver, crear en cuentas o categorías ajenas, editar ni borrar movimientos de otro usuario.

#### Scenario: Cuenta ajena
- **WHEN** un usuario intenta registrar un movimiento en una cuenta de otro usuario
- **THEN** el sistema lo rechaza

#### Scenario: Movimiento ajeno
- **WHEN** un usuario abre o intenta modificar un movimiento de otro usuario
- **THEN** el sistema responde como si no existiera y no lo modifica
