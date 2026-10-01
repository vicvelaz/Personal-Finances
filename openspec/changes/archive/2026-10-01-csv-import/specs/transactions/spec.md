# Spec Delta

## Purpose

Permite cargar movimientos desde ficheros CSV del banco o de la propia exportación de la app.

## ADDED Requirements

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
