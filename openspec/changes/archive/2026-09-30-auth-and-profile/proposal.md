# Proposal

## Why

"fin" gestiona datos financieros privados, así que toda funcionalidad posterior (cuentas, movimientos, presupuestos...) depende de saber quién es el usuario y de aislar sus datos. Hoy el monorepo solo tiene el esquema Drizzle y las plantillas de Next.js/Expo: no hay registro, sesión, perfil, migraciones aplicadas ni políticas RLS.

## What Changes

- Registro con email y contraseña, confirmación por email, inicio y cierre de sesión en web y móvil usando Supabase Auth.
- Recuperación de contraseña (solicitud desde web o móvil; el cambio de contraseña se completa en la web).
- Creación automática del perfil (`profiles`) al registrarse, mediante trigger en base de datos.
- Pantalla de perfil para ver y editar nombre visible, moneda base, idioma/locale y zona horaria.
- Rutas protegidas: web (proxy de Next.js 16 que refresca sesión y redirige) y móvil (grupo de rutas autenticadas en expo-router).
- Persistencia segura de sesión en móvil con `expo-secure-store` (adaptador por fragmentos por el límite de tamaño).
- Esquemas zod compartidos en `@fin/shared` para credenciales y perfil.
- Infraestructura de base de datos: entorno local de Supabase (CLI + Docker), primera migración Drizzle de todo el esquema existente, RLS activado en todas las tablas de usuario con política "owner only".
- Scheme de la app móvil pasa de `mobile` a `fin`.

Fuera de alcance: login social (OAuth), MFA, borrado de cuenta y exportación de datos (cambios posteriores).

## Capabilities

### New Capabilities
- `user-auth`: registro, confirmación de email, inicio/cierre de sesión, recuperación de contraseña y protección de rutas en web y móvil.
- `user-profile`: perfil del usuario creado automáticamente, consulta y edición de preferencias, y aislamiento de datos por usuario (RLS).

### Modified Capabilities
<!-- Ninguna: no existen specs previas. -->

## Impact

- `packages/db`: políticas RLS en el esquema, trigger de creación de perfil (migración SQL personalizada), carpeta `drizzle/` con migraciones.
- `packages/shared`: nuevos esquemas zod `auth` y `profile` con tests.
- `apps/web`: clientes Supabase (browser/server), `proxy.ts`, páginas `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/auth/confirm`, `/profile`, layout protegido.
- `apps/mobile`: cliente Supabase con almacenamiento seguro, proveedor de sesión, pantallas de login/registro/recuperación/perfil, `app.json` (scheme).
- Raíz: dependencia de desarrollo `supabase` (CLI), carpeta `supabase/` con `config.toml`, variables en `.env.example`.
- Servicios: proyecto Supabase (free tier) con URLs de redirección configuradas para la web.
