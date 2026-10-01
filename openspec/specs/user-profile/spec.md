# user-profile Specification

## Purpose
Guarda las preferencias de cada usuario (nombre visible, moneda base, idioma y zona horaria) y garantiza que cada usuario solo pueda leer y modificar sus propios datos.

## Requirements

### Requirement: Creación automática del perfil
El sistema SHALL crear un perfil por cada cuenta registrada en el momento del registro, con valores por defecto: moneda base `EUR`, locale `es-ES` y zona horaria `Europe/Madrid`.

#### Scenario: Nuevo registro
- **WHEN** se crea una cuenta nueva
- **THEN** existe exactamente un perfil asociado a ella con los valores por defecto

### Requirement: Consulta del perfil
El sistema SHALL mostrar al usuario autenticado su email (solo lectura), nombre visible, moneda base, locale y zona horaria en web y móvil.

#### Scenario: Ver perfil
- **WHEN** el usuario abre la pantalla de perfil
- **THEN** ve sus datos actuales

### Requirement: Edición del perfil
El sistema SHALL permitir editar nombre visible (opcional, máximo 80 caracteres), moneda base (código ISO 4217 de una lista soportada), locale (de una lista soportada) y zona horaria (identificador IANA válido). Los datos MUST validarse antes de guardarse.

#### Scenario: Edición válida
- **WHEN** el usuario guarda cambios válidos en su perfil
- **THEN** el sistema persiste los cambios, actualiza la fecha de modificación y muestra una confirmación

#### Scenario: Edición inválida
- **WHEN** el usuario envía una moneda no soportada, una zona horaria inválida o un nombre de más de 80 caracteres
- **THEN** el sistema rechaza el cambio, muestra el error del campo y no modifica el perfil

### Requirement: Aislamiento de datos por usuario
El sistema MUST garantizar a nivel de base de datos que un usuario autenticado solo puede leer, crear, modificar o borrar filas propias en el perfil y en todas las tablas de datos de usuario, y que un visitante sin sesión no puede acceder a ninguna.

#### Scenario: Acceso a datos ajenos
- **WHEN** un usuario autenticado consulta o modifica filas cuyo propietario es otro usuario
- **THEN** la base de datos no devuelve ni modifica ninguna de esas filas

#### Scenario: Acceso anónimo
- **WHEN** un cliente sin sesión consulta cualquier tabla de datos de usuario
- **THEN** la base de datos no devuelve filas

#### Scenario: Suplantación de propietario
- **WHEN** un usuario autenticado intenta insertar una fila indicando como propietario a otro usuario
- **THEN** la base de datos rechaza la inserción
