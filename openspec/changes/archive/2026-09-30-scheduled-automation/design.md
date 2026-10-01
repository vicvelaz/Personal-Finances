# Design: scheduled-automation

## Base de datos
- `auto_post boolean not null default false` y check `scheduled_auto_post_fixed`: `not (auto_post and is_estimated)`.
- `post_due_scheduled(p_now timestamptz default now()) returns int`, SECURITY DEFINER, `search_path = ''`. Recorre programados activos con `auto_post` cuyo `next_run_on <= (p_now at time zone profiles.timezone)::date`; para cada uno llama a `post_scheduled` en bucle (máx. 400 iteraciones) mientras siga vencido. Cada programado va en un bloque `BEGIN … EXCEPTION` para que un error (p. ej. cuenta archivada) solo emita un WARNING. EXECUTE revocado a PUBLIC, anon y authenticated.
- `pg_cron`: `create extension if not exists pg_cron with schema pg_catalog` y `cron.schedule('post-due-scheduled', '15 * * * *', ...)` (cada hora, para respetar zonas horarias).

## Shared
- `scheduledSchema` añade `autoPost` (boolean, por defecto false) y `reminderDaysBefore` (texto "" o entero 0–30 → `number | null`), con refine de estimado + automático.
- `reminderDate(nextRunOn, daysBefore)` devuelve la fecha ISO del recordatorio.

## Móvil
- `lib/reminders.ts`: `syncReminders(rows)` cancela las notificaciones programadas y crea una por programado activo con recordatorio cuya fecha (9:00 local) sea futura. No-op en web. Pide permiso la primera vez.
- `(app)/_layout.tsx` sincroniza cuando cambian los programados (TanStack Query).
- Plugin `expo-notifications` en `app.json`.
