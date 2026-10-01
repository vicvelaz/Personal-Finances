# Spec Delta

## Purpose

Permite al usuario clasificar sus ingresos y gastos en categorías y subcategorías propias, partiendo de un conjunto inicial razonable, para poder analizar y presupuestar sus finanzas.

## ADDED Requirements

### Requirement: Categorías iniciales
El sistema SHALL crear para cada usuario nuevo un conjunto de categorías por defecto en español que incluya al menos gastos (Vivienda, Alimentación, Transporte, Ocio, Salud, Suministros, Compras, Otros gastos) e ingresos (Nómina, Otros ingresos). Los usuarios existentes sin categorías SHALL recibir el mismo conjunto.

#### Scenario: Usuario nuevo
- **WHEN** un usuario se registra
- **THEN** al abrir sus categorías ve el conjunto por defecto, agrupado en Gastos e Ingresos

### Requirement: Listado de categorías
El sistema SHALL mostrar las categorías del usuario agrupadas por tipo (Gastos, Ingresos), ordenadas por nombre, con sus subcategorías bajo la categoría padre.

#### Scenario: Subcategorías
- **WHEN** el usuario tiene "Alimentación" con la subcategoría "Supermercado"
- **THEN** "Supermercado" aparece bajo "Alimentación" en el grupo Gastos

### Requirement: Alta y edición de categoría
El sistema SHALL permitir crear y editar categorías con nombre (1 a 40 caracteres), tipo (gasto o ingreso), categoría padre opcional y color opcional (hexadecimal `#RRGGBB`). La categoría padre MUST ser del mismo usuario y tipo y MUST ser de primer nivel (solo un nivel de subcategorías). El nombre MUST ser único entre las categorías del usuario con el mismo padre, sin distinguir mayúsculas.

#### Scenario: Alta válida
- **WHEN** el usuario crea la subcategoría "Gasolina" de tipo gasto bajo "Transporte"
- **THEN** aparece bajo "Transporte"

#### Scenario: Nombre duplicado
- **WHEN** el usuario crea "alimentación" en primer nivel teniendo ya "Alimentación" en primer nivel
- **THEN** el sistema rechaza el alta indicando que ya existe una categoría con ese nombre

#### Scenario: Padre inválido
- **WHEN** se intenta asignar como padre una categoría de otro tipo, una subcategoría o una categoría de otro usuario
- **THEN** el sistema rechaza el cambio y no modifica la categoría

#### Scenario: Categoría con hijos no puede ser subcategoría
- **WHEN** el usuario intenta asignar un padre a una categoría que tiene subcategorías
- **THEN** el sistema rechaza el cambio

#### Scenario: Cambio de tipo con hijos
- **WHEN** el usuario cambia el tipo de una categoría que tiene subcategorías
- **THEN** el sistema rechaza el cambio

### Requirement: Borrado de categoría
El sistema SHALL permitir borrar una categoría propia previa confirmación. Los movimientos que la usaban MUST conservarse y quedar sin categoría. El sistema MUST rechazar el borrado de una categoría que tenga subcategorías.

#### Scenario: Borrado con movimientos
- **WHEN** el usuario borra una categoría usada por movimientos
- **THEN** la categoría desaparece y esos movimientos se muestran como "Sin categoría"

#### Scenario: Borrado con subcategorías
- **WHEN** el usuario intenta borrar una categoría que tiene subcategorías
- **THEN** el sistema no la borra e indica que primero debe borrar o mover sus subcategorías

### Requirement: Categorías privadas
Un usuario MUST NOT poder ver, crear bajo, editar ni borrar categorías de otro usuario.

#### Scenario: Acceso a categoría ajena
- **WHEN** un usuario abre o intenta modificar una categoría de otro usuario
- **THEN** el sistema responde como si no existiera y no la modifica
