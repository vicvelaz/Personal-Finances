# Spec Delta

## Purpose

Permite que una persona cree una cuenta en "fin", inicie y cierre sesión, recupere su contraseña y solo acceda a las pantallas privadas de la web y la app móvil con una sesión válida.

## ADDED Requirements

### Requirement: Registro con email y contraseña
El sistema SHALL permitir registrarse con un email válido y una contraseña de al menos 8 caracteres que contenga al menos una letra y un número. El sistema MUST enviar un email de confirmación y MUST NOT dar acceso a las pantallas privadas hasta que el email esté confirmado.

#### Scenario: Registro correcto
- **WHEN** un visitante envía un email válido no registrado y una contraseña válida
- **THEN** el sistema crea la cuenta sin confirmar, envía un email de confirmación y muestra un mensaje indicando que revise su correo

#### Scenario: Datos inválidos
- **WHEN** un visitante envía un email mal formado o una contraseña que no cumple las reglas
- **THEN** el sistema rechaza el registro sin llamar al proveedor de autenticación y muestra el error junto al campo correspondiente

#### Scenario: Email ya registrado
- **WHEN** un visitante se registra con un email que ya tiene cuenta
- **THEN** el sistema muestra el mismo mensaje neutro que en un registro correcto, sin revelar que el email existe

### Requirement: Confirmación de email
El sistema SHALL confirmar la cuenta cuando el usuario abre el enlace de confirmación válido recibido por email, e iniciar sesión en la web.

#### Scenario: Enlace válido
- **WHEN** el usuario abre un enlace de confirmación válido y no caducado
- **THEN** la cuenta queda confirmada, se inicia sesión en la web y se redirige al área privada

#### Scenario: Enlace inválido o caducado
- **WHEN** el usuario abre un enlace de confirmación inválido o caducado
- **THEN** el sistema muestra una página de error con opción de volver a iniciar sesión

### Requirement: Inicio de sesión
El sistema SHALL permitir iniciar sesión con email y contraseña en web y móvil. Ante credenciales incorrectas el sistema MUST mostrar un mensaje genérico que no indique si el email existe.

#### Scenario: Credenciales correctas
- **WHEN** un usuario confirmado introduce su email y contraseña correctos
- **THEN** se inicia sesión y se muestra el área privada

#### Scenario: Credenciales incorrectas
- **WHEN** el usuario introduce un email o contraseña incorrectos
- **THEN** el sistema muestra "Email o contraseña incorrectos" y no inicia sesión

#### Scenario: Email sin confirmar
- **WHEN** un usuario con email sin confirmar intenta iniciar sesión con credenciales correctas
- **THEN** el sistema no inicia sesión e indica que debe confirmar su email

### Requirement: Persistencia de sesión
El sistema SHALL mantener la sesión entre recargas (web) y reinicios de la app (móvil) hasta que caduque o el usuario la cierre. En móvil los tokens de sesión MUST almacenarse en el almacenamiento seguro del sistema operativo.

#### Scenario: Reapertura de la app
- **WHEN** un usuario con sesión activa cierra y vuelve a abrir la app móvil
- **THEN** accede directamente al área privada sin volver a introducir credenciales

#### Scenario: Recarga en la web
- **WHEN** un usuario con sesión activa recarga una página privada de la web
- **THEN** la página se muestra sin pedir credenciales

### Requirement: Cierre de sesión
El sistema SHALL permitir cerrar sesión desde web y móvil, eliminando la sesión local.

#### Scenario: Cerrar sesión
- **WHEN** el usuario pulsa "Cerrar sesión"
- **THEN** se elimina la sesión local y se muestra la pantalla de inicio de sesión

### Requirement: Recuperación de contraseña
El sistema SHALL permitir solicitar un email de restablecimiento desde web y móvil, y establecer una nueva contraseña válida en la web a partir del enlace recibido. La solicitud MUST responder con el mismo mensaje exista o no el email.

#### Scenario: Solicitud de restablecimiento
- **WHEN** el usuario envía su email en "¿Olvidaste tu contraseña?"
- **THEN** el sistema muestra un mensaje neutro indicando que, si existe una cuenta, recibirá un email

#### Scenario: Nueva contraseña
- **WHEN** el usuario abre el enlace de restablecimiento válido y envía una nueva contraseña que cumple las reglas
- **THEN** la contraseña se actualiza, queda con sesión iniciada en la web y se redirige al área privada

#### Scenario: Nueva contraseña inválida
- **WHEN** el usuario envía una nueva contraseña que no cumple las reglas
- **THEN** el sistema la rechaza y muestra el error sin cambiar la contraseña

### Requirement: Protección de rutas
El sistema SHALL impedir el acceso a pantallas privadas sin sesión válida y SHALL redirigir a los usuarios con sesión fuera de las pantallas de autenticación.

#### Scenario: Acceso sin sesión
- **WHEN** un visitante sin sesión abre una ruta privada en web o móvil
- **THEN** es redirigido a la pantalla de inicio de sesión

#### Scenario: Pantalla de login con sesión
- **WHEN** un usuario con sesión válida abre la pantalla de inicio de sesión o registro
- **THEN** es redirigido al área privada
