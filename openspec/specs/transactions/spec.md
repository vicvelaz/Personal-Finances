# transactions Specification

## Purpose
Permite al usuario registrar y consultar sus ingresos, gastos y transferencias entre cuentas, que son la base del cálculo de saldos, presupuestos e informes.

## Requirements

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

### Requirement: Importación de CSV
El sistema SHALL permitir importar gastos e ingresos a una cuenta desde un CSV (máximo 1000 filas). El usuario MUST poder asignar las columnas de fecha e importe (obligatorias) y descripción y categoría (opcionales), que se preseleccionan si la cabecera las reconoce. Antes de importar SHALL mostrarse una vista previa con los errores por fila. Los importes negativos MUST importarse como gastos y los positivos como ingresos. Las categorías se asignan por nombre si coinciden con una del usuario del mismo tipo.

#### Scenario: Importación correcta
- **WHEN** sube un CSV con 3 filas válidas y pulsa "Importar 3 movimientos"
- **THEN** se crean 3 movimientos en la cuenta elegida y ve "3 movimientos importados"

#### Scenario: Filas con errores
- **WHEN** una fila tiene una fecha inválida
- **THEN** la vista previa la marca con "Fecha no válida" y no se importa

#### Scenario: Duplicados
- **WHEN** importa dos veces el mismo fichero en la misma cuenta
- **THEN** la segunda vez ve "0 movimientos importados, 3 duplicados omitidos"

#### Scenario: Re-importar una exportación
- **WHEN** sube el CSV exportado por la app
- **THEN** las columnas fecha, descripción, importe y categoría se detectan solas
