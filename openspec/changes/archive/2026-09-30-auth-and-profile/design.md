# Design

## Context

- Esquema Drizzle ya definido en `packages/db` (profiles, accounts, categories, transactions, budgets, scheduled, savings_goals), con `user_id -> profiles.id` y `profiles.id -> auth.users.id`. No hay migraciones generadas ni RLS.
- `apps/web` (Next.js 16) y `apps/mobile` (Expo SDK 57) son plantillas; ya tienen `@supabase/supabase-js`, `@supabase/ssr` (web) y `expo-secure-store` (móvil) como dependencias.
- Docker disponible en la máquina de desarrollo; Supabase CLI no instalado.
- Requisitos: ver `specs/user-auth` y `specs/user-profile`.

## Goals / Non-Goals

**Goals:**
- Un único flujo de auth (Supabase Auth, email+contraseña) compartido por web y móvil.
- RLS como barrera principal de seguridad: los clientes hablan directamente con Supabase con la anon key y la sesión del usuario.
- Migraciones reproducibles versionadas en git.

**Non-Goals:**
- Deep links de auth en móvil (confirmación y reset se completan en la web).
- Uso de la service role key en esta fase.
- Acceso a datos vía Drizzle desde la web en runtime (Drizzle solo define esquema y migraciones por ahora).

## Decisions

### D1. Supabase Auth con clientes directos + RLS
Web y móvil usan `supabase-js` con la anon key; la autorización la aplica Postgres vía RLS.
- Alternativa: API propia en route handlers con Drizzle y service role. Descartada: duplica lógica de autorización, más código y más superficie de ataque.

### D2. Políticas RLS declaradas en Drizzle
Usar `pgPolicy` + `authenticatedRole` + `authUid` de `drizzle-orm/supabase` en cada tabla, con una política `for: "all"` `using`/`withCheck` `user_id = auth.uid()` (en `profiles`: `id = auth.uid()`). `drizzle-kit generate` emite `ENABLE ROW LEVEL SECURITY` y las políticas. Sin políticas para `anon` ⇒ acceso anónimo denegado.
- Alternativa: SQL manual en migraciones. Descartada: el esquema y sus políticas quedarían desacoplados.
- `profiles` no permite `insert`/`delete` al usuario (solo `select`/`update`); la fila la crea el trigger.

### D3. Trigger `handle_new_user` en migración personalizada
`drizzle-kit generate --custom --name=handle_new_user` con una función `security definer` (`set search_path = ''`) que inserta en `public.profiles` tras `insert on auth.users`. Drizzle no modela triggers, por eso va como migración SQL propia.
- Alternativa: crear el perfil desde el cliente tras el registro. Descartada: el usuario no tiene sesión hasta confirmar email y podría quedar sin perfil.

### D4. Supabase local con la CLI (`supabase` como devDependency raíz)
`supabase init` crea `supabase/config.toml`; `supabase start` levanta Postgres (54322), API (54321) y Mailpit (54324) para ver los emails. Las migraciones las aplica `drizzle-kit migrate` contra `DATABASE_URL`, no `supabase/migrations`, para tener una sola fuente.
- Alternativa: trabajar solo contra el proyecto cloud free. Descartada para desarrollo diario (límites y datos compartidos); el cloud se usa para despliegue.

### D5. Web: `@supabase/ssr` + `proxy.ts`
En Next.js 16 el middleware se llama `proxy.ts`. Refresca la sesión en cada petición (cookies) y redirige: sin sesión en rutas privadas → `/login?next=...`; con sesión en `/login`/`/signup` → `/`. Estructura:
- `src/lib/supabase/{client,server,proxy}.ts`
- `src/app/(auth)/{login,signup,forgot-password,reset-password}` y `src/app/auth/confirm/route.ts` (canjea `token_hash` con `verifyOtp`, tipos `signup` y `recovery`).
- `src/app/(app)/` con layout que verifica `getUser()` en servidor (defensa además del proxy) y contiene `/` y `/profile`.
- Mutaciones con Server Actions validadas con zod de `@fin/shared`.
- El parámetro `next` solo se acepta si es una ruta relativa interna (evita open redirect).

### D6. Móvil: sesión en SecureStore fragmentada
`expo-secure-store` limita valores a ~2 KB y la sesión de Supabase puede superarlo. Adaptador de storage que divide el valor en fragmentos (`key.0..n` + `key.count`); en plataforma web (react-native-web) usa `localStorage`. `autoRefreshToken` se pausa/reanuda con `AppState`.
- Alternativa: AsyncStorage + cifrado AES (patrón "LargeSecureStore"). Descartada: añade 2 dependencias y gestión de claves sin beneficio claro.
- Navegación: `SessionProvider` (contexto) + grupos `src/app/(auth)` y `src/app/(app)` con `Stack.Protected guard` de expo-router.
- `emailRedirectTo`/`redirectTo` apuntan a la URL de la web (`EXPO_PUBLIC_WEB_URL`), por eso no hacen falta deep links.

### D7. Validación compartida en `@fin/shared`
`auth.ts`: `emailSchema`, `passwordSchema` (≥8, letra y número), `signUpSchema`, `signInSchema`, `resetPasswordSchema`. `profile.ts`: `SUPPORTED_CURRENCIES`, `SUPPORTED_LOCALES`, `profileUpdateSchema` (zona horaria validada con `Intl.supportedValuesOf("timeZone")` con fallback a `Intl.DateTimeFormat`). Tests con vitest.

### D8. Mensajes neutros
Errores de login se mapean a "Email o contraseña incorrectos" salvo `email_not_confirmed`. Registro y recuperación muestran siempre el mismo mensaje de éxito (Supabase ya no revela emails existentes con confirmación activa).

## Risks / Trade-offs

- [La anon key y las URL son públicas] → Toda la seguridad depende de RLS; tarea de verificación explícita de políticas con dos usuarios.
- [`updated_at` no se actualiza solo] → La edición de perfil lo envía explícitamente; un trigger genérico se valorará en cambios posteriores.
- [Móvil depende de la web para confirmar/resetear] → Aceptado para el MVP; deep links en un cambio futuro.
- [Límite de emails del SMTP por defecto de Supabase (pocos/hora)] → Suficiente en desarrollo (Mailpit local); para producción configurar SMTP gratuito (p. ej. Resend free) más adelante.
- [Cambio de scheme `mobile` → `fin`] → Sin usuarios aún; sin impacto.

## Migration Plan

1. `supabase start` en local; `pnpm db:generate` + `pnpm db:migrate`.
2. En cloud: crear proyecto free, fijar Site URL y Redirect URLs de la web, aplicar migraciones con `DATABASE_URL` del proyecto.
3. Rollback: base de datos nueva sin datos; se puede resetear con `supabase db reset` en local.

## Open Questions

- Proveedor SMTP de producción (no afecta a specs ni tareas de este cambio).
