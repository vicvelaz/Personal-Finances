# Spec Delta

## Purpose

Define el comportamiento accesible y coherente de los controles de selección, importe y fecha en las interfaces web y móvil de finanzas personales.

## ADDED Requirements

### Requirement: Contraste accesible en controles de selección
Los controles desplegables y sus opciones SHALL mantener texto legible, fondo distinguible y estados de interacción visibles en los temas claro y oscuro. El texto normal MUST alcanzar contraste WCAG AA de al menos 4.5:1. La selección, foco, hover y error MUST poder distinguirse sin depender únicamente del color.

#### Scenario: Selector en tema claro
- **WHEN** el usuario abre un selector en tema claro
- **THEN** el fondo, texto, borde y opciones alcanzan contraste WCAG AA y la opción enfocada es identificable

#### Scenario: Selector en tema oscuro
- **WHEN** el usuario abre un selector en tema oscuro
- **THEN** el fondo, texto, borde y opciones alcanzan contraste WCAG AA y la opción enfocada es identificable

### Requirement: Entrada estricta de importes
Los campos de importe de magnitud positiva SHALL aceptar dígitos y como máximo un separador decimal (`.` o `,`) y MUST rechazar entradas que no representen un importe válido, tanto al escribir como al pegar. Al perder foco SHALL mostrar el importe localizado con moneda. Su valor de dominio SHALL ser un entero seguro en unidades menores o `null` si está vacío; MUST NOT usar coma flotante como valor almacenado o de dominio.

#### Scenario: Entrada decimal válida
- **WHEN** el usuario introduce `1250,50` en un campo de importe
- **THEN** el campo acepta la entrada y entrega el valor de dominio `125050` unidades menores

#### Scenario: Separador duplicado
- **WHEN** el usuario intenta introducir o pegar un segundo separador decimal
- **THEN** el campo rechaza el carácter que produciría un importe inválido

#### Scenario: Formato localizado al salir
- **WHEN** el usuario termina de editar un importe de 125050 unidades menores en EUR con configuración española
- **THEN** el campo muestra `1.250,50 €` sin perder la precisión del valor interno

#### Scenario: Campo vacío
- **WHEN** el usuario borra todo el contenido de un campo de importe
- **THEN** el valor de dominio es `null` y la validación requerida del formulario informa del campo vacío

### Requirement: Entrada manual y calendario para fechas
El campo de fecha SHALL permitir entrada manual en formato `DD/MM/YYYY` y selección mediante calendario con navegación de mes y año. MUST rechazar fechas inexistentes según el calendario y sincronizar una fecha válida entre texto y calendario. Al confirmar SHALL entregar una fecha ISO `YYYY-MM-DD` sin desplazamiento de zona horaria.

#### Scenario: Fecha válida escrita
- **WHEN** el usuario introduce `15/10/2026`
- **THEN** el calendario selecciona el 15 de octubre de 2026 y el valor de dominio es `2026-10-15`

#### Scenario: Fecha inexistente
- **WHEN** el usuario introduce `31/02/2026`
- **THEN** el campo indica que la fecha no es válida y no emite una fecha confirmada

#### Scenario: Selección desde calendario
- **WHEN** el usuario selecciona un día válido en el calendario
- **THEN** el campo muestra ese día en formato `DD/MM/YYYY` y el calendario se cierra

### Requirement: Selector compacto móvil con búsqueda
En vistas de ancho inferior a 768 px, los selectores de opciones SHALL mostrar un control compacto con el valor seleccionado o placeholder. Al activarlo, MUST abrir una hoja inferior modal con búsqueda en tiempo real y opciones con área táctil mínima de 44 px. La selección SHALL actualizar el valor y cerrar la hoja. En vistas de 768 px o más SHALL conservarse el selector desplegable optimizado para escritorio.

#### Scenario: Abrir selector compacto
- **WHEN** el usuario abre un selector en una vista inferior a 768 px
- **THEN** ve el valor actual en un control compacto y puede abrir la hoja inferior

#### Scenario: Buscar y seleccionar
- **WHEN** el usuario filtra opciones y selecciona una
- **THEN** el control compacto muestra la opción seleccionada y la hoja inferior se cierra

#### Scenario: Opciones táctiles
- **WHEN** se muestran opciones en la hoja inferior
- **THEN** cada opción dispone de un área táctil de al menos 44 px de alto

#### Scenario: Selector de escritorio
- **WHEN** el usuario abre el mismo selector en una vista de 768 px o más
- **THEN** se muestra el selector desplegable de escritorio y no la hoja inferior móvil

