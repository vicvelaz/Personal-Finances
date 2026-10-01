# account-data-rights Specification

## Purpose
Garantiza al usuario el control sobre sus datos: poder descargarlos en formatos abiertos y eliminar su cuenta de forma definitiva.

## Requirements

### Requirement: Exportación de datos
El sistema SHALL permitir al usuario autenticado descargar todos sus datos (perfil, cuentas, categorías, movimientos, presupuestos, programados y metas) en un fichero JSON, y sus movimientos en un fichero CSV con fecha, tipo, cuenta, categoría, descripción, importe y moneda. Los valores de texto del CSV que empiecen por `=`, `+`, `-`, `@` MUST neutralizarse para evitar su ejecución como fórmula. La exportación MUST contener solo datos del usuario.

#### Scenario: Exportar JSON
- **WHEN** el usuario pulsa "Descargar mis datos (JSON)"
- **THEN** descarga un fichero con todas sus entidades y ninguna de otros usuarios

#### Scenario: Exportar CSV
- **WHEN** el usuario pulsa "Descargar movimientos (CSV)"
- **THEN** descarga un CSV con una fila por movimiento y los importes con signo en formato decimal

#### Scenario: Sin sesión
- **WHEN** se solicita la exportación sin sesión
- **THEN** el sistema responde 401 sin datos

### Requirement: Borrado de cuenta
El sistema SHALL permitir al usuario borrar definitivamente su cuenta y todos sus datos tras escribir "BORRAR" y su contraseña actual. Tras el borrado la sesión MUST cerrarse y el usuario no podrá iniciar sesión con esas credenciales.

#### Scenario: Confirmación correcta
- **WHEN** el usuario escribe "BORRAR" y su contraseña correcta
- **THEN** su cuenta y todos sus datos se eliminan y vuelve a la pantalla de inicio de sesión

#### Scenario: Contraseña incorrecta
- **WHEN** la contraseña no es correcta
- **THEN** el sistema no borra nada e indica el error

#### Scenario: Solo la propia cuenta
- **WHEN** se invoca el borrado
- **THEN** únicamente se elimina la cuenta del usuario autenticado
