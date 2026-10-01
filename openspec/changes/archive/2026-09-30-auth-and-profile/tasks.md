# Tasks

## 1. Supabase local y variables

- [x] 1.1 Añadir `supabase` (CLI) como devDependency raíz, ejecutar `supabase init` y scripts `supabase:start`/`supabase:stop`; verificar que existe `supabase/config.toml` con `site_url` y `additional_redirect_urls` de la web local (`http://localhost:3000`)
- [x] 1.2 Añadir `EXPO_PUBLIC_WEB_URL` y `NEXT_PUBLIC_SITE_URL` a `.env.example` y `turbo.json`; verificar `pnpm typecheck` en verde
- [x] 1.3 Documentar en el README raíz el arranque local (Docker, `supabase start`, copiar `.env`, migraciones, Mailpit); verificar que los comandos documentados existen en `package.json`

## 2. Base de datos: RLS, trigger y migraciones

- [x] 2.1 Añadir políticas RLS "owner only" con `pgPolicy` a accounts, categories, transactions, budgets, scheduled y savings_goals, y en profiles solo `select`/`update` propios; verificar `pnpm --filter @fin/db typecheck`
- [x] 2.2 Generar la migración inicial con `pnpm db:generate`; verificar que el SQL contiene `ENABLE ROW LEVEL SECURITY` y las políticas por tabla
- [x] 2.3 Crear migración personalizada `handle_new_user` (función `security definer`, `search_path = ''`, trigger `after insert on auth.users`); verificar que el SQL está en `packages/db/drizzle/`
- [x] 2.4 Aplicar migraciones en local con `pnpm db:migrate`; verificar con `psql`/SQL que al crear un usuario en `auth.users` aparece su perfil con valores por defecto
- [x] 2.5 Script SQL de verificación RLS (`packages/db/scripts/verify-rls.sql`) que simula dos usuarios y `anon` y comprueba lectura ajena, escritura ajena, suplantación de `user_id` y acceso anónimo; verificar que se ejecuta sin fallos

## 3. Validación compartida (`@fin/shared`)

- [x] 3.1 Implementar `auth.ts` (email, contraseña ≥8 con letra y número, signUp, signIn, resetPassword) con tests vitest; verificar `pnpm --filter @fin/shared test`
- [x] 3.2 Implementar `profile.ts` (monedas y locales soportados, zona horaria IANA, nombre ≤80, `profileUpdateSchema`) con tests; verificar `pnpm --filter @fin/shared test`
- [x] 3.3 Añadir `safeRedirectPath(next)` (solo rutas internas que empiezan por `/` y no por `//`) con tests; verificar tests en verde

## 4. Web: auth

- [x] 4.1 Crear clientes `src/lib/supabase/{client,server,proxy}.ts` con `@supabase/ssr`; verificar `pnpm --filter @fin/web typecheck`
- [x] 4.2 Crear `src/proxy.ts` que refresca sesión y aplica redirecciones de rutas privadas/auth; verificar manualmente que `/` sin sesión redirige a `/login?next=/`
- [x] 4.3 Páginas `(auth)/login` y `(auth)/signup` con Server Actions, validación zod y mensajes neutros; verificar registro → email en Mailpit, y login con credenciales incorrectas muestra mensaje genérico
- [x] 4.4 Ruta `auth/confirm` (`verifyOtp` para `signup` y `recovery`, redirección segura con `next`) y página de error; verificar que el enlace de Mailpit confirma e inicia sesión y que un enlace alterado muestra error
- [x] 4.5 Páginas `(auth)/forgot-password` y `reset-password`; verificar flujo completo de restablecimiento con Mailpit y rechazo de contraseña inválida
- [x] 4.6 Layout `(app)` con comprobación `getUser()` en servidor, cabecera con email y botón "Cerrar sesión"; verificar que cerrar sesión vuelve a `/login` y que recargar con sesión mantiene la página
- [x] 4.7 Actualizar metadata y `lang="es"` del layout raíz; verificar `pnpm --filter @fin/web build`

## 5. Web: perfil

- [x] 5.1 Página `(app)/profile` que carga el perfil y el email del usuario; verificar que muestra los valores por defecto tras el registro
- [x] 5.2 Server Action de actualización con `profileUpdateSchema` y `updated_at`; verificar guardado correcto y errores por campo con datos inválidos

## 6. Móvil: auth

- [x] 6.1 Cambiar `scheme` a `fin` y nombre a "fin" en `app.json`; verificar `pnpm --filter @fin/mobile typecheck`
- [x] 6.2 Adaptador de almacenamiento seguro fragmentado (`src/lib/secure-storage.ts`, localStorage en web) y cliente `src/lib/supabase.ts` con refresh ligado a `AppState`; verificar typecheck
- [x] 6.3 `SessionProvider` y reestructurar rutas en grupos `(auth)` y `(app)` con `Stack.Protected`, eliminando pantallas de plantilla; verificar que sin sesión la app abre en login
- [x] 6.4 Pantallas login, registro y recuperar contraseña con zod de `@fin/shared` y mensajes neutros (redirecciones a `EXPO_PUBLIC_WEB_URL`); verificar en Expo (web o dispositivo) login correcto e incorrecto
- [x] 6.5 Cerrar sesión y persistencia; verificar que reabrir la app mantiene la sesión y cerrar sesión vuelve a login

## 7. Móvil: perfil

- [x] 7.1 Pantalla de perfil con carga y edición (select de moneda/locale, zona horaria) usando TanStack Query y `profileUpdateSchema`; verificar guardado y errores por campo

## 8. Verificación integrada

- [x] 8.1 Ejecutar `pnpm typecheck`, `pnpm test` y `pnpm lint` en la raíz; verificar todo en verde
- [x] 8.2 Recorrer los escenarios de `specs/user-auth` y `specs/user-profile` en web y móvil contra Supabase local; verificar que un usuario B no ve el perfil del usuario A
