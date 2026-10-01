# Spec Delta

## Purpose

Permite al usuario registrar y mantener las cuentas donde guarda o debe dinero (banco, efectivo, tarjetas, inversiones, préstamos) y ver su saldo actual en web y móvil.

## ADDED Requirements

### Requirement: Alta de cuenta
El sistema SHALL permitir crear una cuenta con nombre (1 a 60 caracteres, obligatorio), tipo (corriente, ahorro, tarjeta de crédito, efectivo, inversión o préstamo), moneda (de las soportadas; por defecto la moneda base del perfil) y saldo inicial (importe con hasta 2 decimales, puede ser negativo; por defecto 0). El importe MUST guardarse en unidades menores sin pérdida de precisión.

#### Scenario: Alta válida
- **WHEN** el usuario crea la cuenta "Nómina" de tipo corriente en EUR con saldo inicial "1.250,50"
- **THEN** la cuenta aparece en su listado con saldo 1.250,50 €

#### Scenario: Datos inválidos
- **WHEN** el usuario envía un nombre vacío, una moneda no soportada o un saldo con más de 2 decimales o no numérico
- **THEN** el sistema no crea la cuenta y muestra el error junto al campo correspondiente

#### Scenario: Nombre duplicado
- **WHEN** el usuario crea una cuenta con el mismo nombre que otra cuenta activa suya
- **THEN** el sistema la crea igualmente (los nombres no son únicos)

### Requirement: Listado de cuentas con saldo
El sistema SHALL mostrar las cuentas activas del usuario ordenadas por nombre, cada una con tipo, moneda y saldo actual, siendo el saldo actual el saldo inicial más la suma de los movimientos de la cuenta. El sistema SHALL mostrar el total por moneda de las cuentas activas y MUST NOT sumar importes de monedas distintas. Las cuentas archivadas SHALL mostrarse en una sección separada y no computar en los totales.

#### Scenario: Totales por moneda
- **WHEN** el usuario tiene dos cuentas activas en EUR (100 € y -30 €) y una en USD (50 $)
- **THEN** ve un total de 70 € y otro de 50 $, sin total combinado

#### Scenario: Cuenta archivada
- **WHEN** el usuario tiene una cuenta archivada
- **THEN** aparece en la sección "Archivadas" y su saldo no suma en los totales

#### Scenario: Sin cuentas
- **WHEN** el usuario no tiene cuentas
- **THEN** ve un mensaje invitándole a crear su primera cuenta

### Requirement: Edición de cuenta
El sistema SHALL permitir modificar nombre, tipo y saldo inicial de una cuenta propia con las mismas reglas que el alta. La moneda MUST NOT poder cambiarse tras la creación.

#### Scenario: Edición válida
- **WHEN** el usuario cambia el nombre y el saldo inicial de su cuenta
- **THEN** el listado refleja el nuevo nombre y el saldo actual recalculado

#### Scenario: Intento de cambio de moneda
- **WHEN** se envía una actualización que incluye una moneda distinta
- **THEN** el sistema ignora o rechaza el cambio y la moneda permanece igual

### Requirement: Archivado de cuenta
El sistema SHALL permitir archivar y desarchivar cuentas propias. Archivar MUST conservar la cuenta y sus movimientos.

#### Scenario: Archivar
- **WHEN** el usuario archiva una cuenta activa
- **THEN** la cuenta pasa a la sección "Archivadas" y deja de computar en los totales

#### Scenario: Desarchivar
- **WHEN** el usuario desarchiva una cuenta
- **THEN** vuelve a las cuentas activas con su saldo intacto

### Requirement: Borrado de cuenta
El sistema SHALL permitir borrar una cuenta propia solo si no tiene movimientos, previa confirmación del usuario. Si tiene movimientos, el sistema MUST rechazar el borrado y sugerir archivarla.

#### Scenario: Borrar cuenta sin movimientos
- **WHEN** el usuario confirma el borrado de una cuenta sin movimientos
- **THEN** la cuenta desaparece de todos los listados

#### Scenario: Borrar cuenta con movimientos
- **WHEN** el usuario intenta borrar una cuenta que tiene movimientos
- **THEN** el sistema no la borra e indica que debe archivarla en su lugar

### Requirement: Cuentas privadas
Un usuario MUST NOT poder ver, editar, archivar ni borrar cuentas de otro usuario, ni sus saldos.

#### Scenario: Acceso a cuenta ajena
- **WHEN** un usuario abre o intenta modificar la cuenta de otro usuario (por URL o petición directa)
- **THEN** el sistema responde como si la cuenta no existiera y no la modifica
