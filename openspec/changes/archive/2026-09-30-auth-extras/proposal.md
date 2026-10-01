# Proposal: auth-extras

## Why
El acceso solo con email y contraseña deja fuera funciones habituales en una app financiera: inicio de sesión con Google, segundo factor y una confirmación de email cómoda en el móvil (los enlaces abren la web, no la app).

## What Changes
- Inicio de sesión con Google (OAuth) en web y móvil, activable por configuración (credenciales vía variables de entorno).
- Verificación en dos pasos (TOTP) opcional: alta, verificación al iniciar sesión y baja, en web y móvil.
- Los datos solo son accesibles con sesión `aal2` cuando el usuario tiene un factor verificado (política RLS restrictiva).
- Los emails de confirmación y recuperación incluyen un código de 6 dígitos; el móvil lo pide dentro de la app en lugar de abrir la web.

## Impact
- Specs: `user-auth` (MODIFIED/ADDED).
- DB: función `has_verified_mfa()`, políticas restrictivas en todas las tablas de usuario, `delete_my_account` exige `aal2` si hay MFA.
- Config Supabase: TOTP activado, proveedor Google, URLs de redirección móviles.
- Web: `/auth/callback`, `/mfa`, sección MFA en perfil, botón Google.
- Móvil: códigos OTP en registro y recuperación, pantalla MFA, alta TOTP, botón Google.
