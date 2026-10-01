# budgets Specification

## Purpose
Permite al usuario planificar cuánto quiere gastar cada mes por categoría y comprobar en todo momento cuánto lleva gastado frente a lo previsto.

## Requirements

### Requirement: Presupuesto mensual por categoría
El sistema SHALL permitir crear un presupuesto para una categoría de gasto propia y un mes, con importe positivo (hasta 2 decimales) expresado en la moneda base del perfil. Solo MUST existir un presupuesto por categoría y mes.

#### Scenario: Alta válida
- **WHEN** el usuario presupuesta 300 € para "Alimentación" en septiembre de 2026
- **THEN** el presupuesto aparece en la vista de septiembre con 300 € presupuestados

#### Scenario: Duplicado
- **WHEN** el usuario crea un segundo presupuesto para "Alimentación" en el mismo mes
- **THEN** el sistema lo rechaza indicando que ya existe

#### Scenario: Categoría de ingresos
- **WHEN** se intenta presupuestar una categoría de ingresos o de otro usuario
- **THEN** el sistema lo rechaza

### Requirement: Progreso del presupuesto
El sistema SHALL mostrar para cada presupuesto del mes el importe gastado (suma de gastos del mes en la moneda base en esa categoría y, si es principal, en sus subcategorías; las transferencias no cuentan), el restante y el porcentaje consumido. El sistema SHALL marcar como "en riesgo" los presupuestos con 80 % o más consumido y como "superado" los que pasen del 100 %. Los gastos en otras monedas MUST NOT sumarse.

#### Scenario: Gasto en subcategoría
- **WHEN** hay un presupuesto de 300 € en "Alimentación" y gastos de 120 € en "Supermercado" y 60 € en "Restaurantes" ese mes
- **THEN** el presupuesto muestra 180 € gastados, 120 € restantes y 60 %

#### Scenario: Presupuesto superado
- **WHEN** el gasto de la categoría supera el importe presupuestado
- **THEN** el presupuesto se muestra como superado con restante negativo

### Requirement: Edición, borrado y copia
El sistema SHALL permitir cambiar el importe y borrar presupuestos, y copiar al mes seleccionado los presupuestos del mes anterior que aún no existan en él.

#### Scenario: Copiar mes anterior
- **WHEN** el usuario copia los presupuestos de agosto a septiembre y en septiembre ya existía el de "Ocio"
- **THEN** se crean los de agosto que faltaban y el de "Ocio" de septiembre no cambia

### Requirement: Presupuestos privados
Un usuario MUST NOT poder ver, crear, editar ni borrar presupuestos de otro usuario, ni ver el gasto de otro usuario a través de ellos.

#### Scenario: Acceso ajeno
- **WHEN** un usuario consulta el progreso de presupuestos
- **THEN** solo ve sus presupuestos calculados con sus propios movimientos
