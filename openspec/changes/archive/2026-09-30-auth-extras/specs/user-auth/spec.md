# Spec Delta

## Purpose

Amplía la autenticación con inicio de sesión social, verificación en dos pasos y códigos de un solo uso por email para el móvil.

## ADDED Requirements

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
