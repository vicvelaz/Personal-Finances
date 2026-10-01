# Design: auth-extras

## Google OAuth
- `config.toml` `[auth.external.google]` con `client_id`/`secret` desde `env(...)`; desactivado por defecto.
- Web: Server Action `signInWithOAuth({ provider: "google", redirectTo: <origin>/auth/callback?next=... })` y `redirect(data.url)`. `/auth/callback` hace `exchangeCodeForSession(code)` (PKCE, cookies SSR). Botón visible si `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`.
- Móvil: `signInWithOAuth({ skipBrowserRedirect: true, redirectTo: Linking.createURL("auth/callback") })` + `WebBrowser.openAuthSessionAsync`; el cliente usa flujo implícito, así que se leen `access_token`/`refresh_token` del fragmento y se llama a `setSession`. Botón visible si `EXPO_PUBLIC_GOOGLE_AUTH_ENABLED=true`. `additional_redirect_urls` incluye `fin://**` y `exp://**`.

## MFA TOTP
- Activado en `[auth.mfa.totp]`.
- `public.has_verified_mfa()` SECURITY DEFINER (el rol `authenticated` no puede leer `auth.mfa_factors`).
- Política RESTRICTIVE `<tabla>_mfa` en todas las tablas de usuario: `auth.jwt()->>'aal' = 'aal2' OR NOT has_verified_mfa()`. Se define en el esquema Drizzle (`mfaPolicy`) para que sea la fuente de verdad.
- `delete_my_account` lanza `mfa_required` si hay factor y la sesión no es `aal2`. El borrado web/móvil pide el código cuando hay MFA y, tras reautenticar con contraseña (que baja a `aal1`), hace `challengeAndVerify`.
- Web: el proxy redirige a `/mfa` a sesiones con `nextLevel=aal2` y `currentLevel=aal1`. Perfil: alta (QR SVG + clave), lista y baja.
- Móvil: `SessionProvider` calcula `needsMfa`; el layout raíz muestra la pantalla `mfa` en ese caso. Alta mostrando la clave y enlace `otpauth://`.

## Códigos OTP por email
- Plantillas con `{{ .Token }}` además del enlace.
- Móvil: tras `signUp` se pide el código → `verifyOtp({ email, token, type: "email" })`. Recuperación: código + nueva contraseña → `verifyOtp({ type: "recovery" })` y `updateUser({ password })`.
- `otpCodeSchema` compartido (6 dígitos) y mensajes en español.
