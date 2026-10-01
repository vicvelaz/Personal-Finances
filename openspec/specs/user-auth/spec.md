# user-auth Specification

## Purpose
Permite que una persona cree una cuenta en "fin", inicie y cierre sesión, recupere su contraseña y solo acceda a las pantallas privadas de la web y la app móvil con una sesión válida.

## Requirements

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

### Requirement: Inicio de sesión con Google
El sistema SHALL permitir iniciar sesión o registrarse con una cuenta de Google cuando el proveedor esté configurado. Si no está configurado, el botón MUST ocultarse. Las credenciales del proveedor MUST leerse de variables de entorno y nunca guardarse en el repositorio.

#### Scenario: Proveedor configurado
- **WHEN** el usuario pulsa "Continuar con Google" y autoriza el acceso
- **THEN** vuelve a la aplicación con sesión iniciada

#### Scenario: Proveedor no configurado
- **WHEN** la variable de activación no está definida
- **THEN** el botón de Google no se muestra

### Requirement: Verificación en dos pasos
El sistema SHALL permitir al usuario activar un segundo factor TOTP escaneando un QR (web) o introduciendo la clave en su app de autenticación (móvil) y confirmándolo con un código. Con un factor verificado, tras la contraseña MUST pedirse el código y los datos MUST ser inaccesibles (RLS) hasta completar el segundo paso. El usuario SHALL poder desactivar el factor desde una sesión verificada.

#### Scenario: Activar
- **WHEN** el usuario escanea el QR e introduce un código válido
- **THEN** el factor queda verificado y aparece como activo

#### Scenario: Iniciar sesión con MFA
- **WHEN** un usuario con factor verificado introduce su contraseña
- **THEN** se le pide el código y solo accede a sus datos tras introducir uno válido

#### Scenario: Código incorrecto
- **WHEN** introduce un código inválido
- **THEN** ve "Código incorrecto" y sigue sin acceso

#### Scenario: Acceso a datos sin segundo factor
- **WHEN** una sesión `aal1` de un usuario con factor verificado consulta sus tablas
- **THEN** no obtiene filas ni puede escribir

### Requirement: Códigos por email en el móvil
Los emails de confirmación y recuperación SHALL incluir un código de 6 dígitos además del enlace. La app móvil MUST permitir confirmar el registro y restablecer la contraseña introduciendo ese código, sin abrir la web.

#### Scenario: Confirmar registro con código
- **WHEN** el usuario se registra en el móvil e introduce el código recibido
- **THEN** su email queda confirmado y entra en la app

#### Scenario: Recuperar contraseña con código
- **WHEN** introduce el código de recuperación y una contraseña nueva válida
- **THEN** la contraseña se actualiza y entra en la app
