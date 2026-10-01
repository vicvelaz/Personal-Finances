# Spec Delta

## Purpose

Permite al usuario definir metas de ahorro, registrar lo que va apartando para cada una y ver cuánto le falta y cuánto debería ahorrar al mes para cumplirlas a tiempo.

## ADDED Requirements

### Requirement: Definición de meta
El sistema SHALL permitir crear y editar metas con nombre (1 a 60 caracteres), importe objetivo positivo, moneda soportada (por defecto la moneda base), fecha objetivo opcional y cuenta propia opcional de la misma moneda. Una meta nueva MUST empezar con 0 ahorrado y estado activa.

#### Scenario: Alta válida
- **WHEN** el usuario crea "Vacaciones" con objetivo 2.000 € para el 1 de junio de 2027
- **THEN** la meta aparece activa con 0 € de 2.000 € (0 %)

#### Scenario: Cuenta de otra moneda
- **WHEN** el usuario asocia una cuenta en USD a una meta en EUR
- **THEN** el sistema lo rechaza

### Requirement: Aportaciones y retiradas
El sistema SHALL permitir aportar o retirar un importe positivo de una meta, actualizando el ahorrado en una sola operación. El ahorrado MUST NOT quedar negativo.

#### Scenario: Aportar
- **WHEN** el usuario aporta 250 € a "Vacaciones"
- **THEN** el ahorrado pasa a 250 € y el progreso a 12,5 %

#### Scenario: Retirar más de lo ahorrado
- **WHEN** el usuario intenta retirar 300 € teniendo 250 €
- **THEN** el sistema lo rechaza y el ahorrado sigue en 250 €

### Requirement: Estado y progreso
El sistema SHALL marcar la meta como conseguida cuando el ahorrado alcance el objetivo y volver a activa si baja de él, salvo que esté archivada. El sistema SHALL mostrar porcentaje, restante y, con fecha objetivo futura, la aportación mensual necesaria (restante entre los meses que faltan, mínimo 1).

#### Scenario: Meta conseguida
- **WHEN** el ahorrado llega a 2.000 € en una meta de 2.000 €
- **THEN** la meta aparece como conseguida

#### Scenario: Aportación mensual necesaria
- **WHEN** faltan 1.750 € y quedan 8 meses hasta la fecha objetivo
- **THEN** el sistema indica que hay que ahorrar 218,75 € al mes

### Requirement: Archivado y borrado
El sistema SHALL permitir archivar, reactivar y borrar metas propias; las archivadas se muestran aparte.

#### Scenario: Archivar
- **WHEN** el usuario archiva una meta
- **THEN** se muestra en la sección de archivadas y no cambia su ahorrado

### Requirement: Metas privadas
Un usuario MUST NOT poder ver, modificar, aportar ni borrar metas de otro usuario, ni asociarlas a cuentas ajenas.

#### Scenario: Meta ajena
- **WHEN** un usuario intenta aportar a una meta de otro usuario
- **THEN** el sistema lo rechaza sin modificarla
