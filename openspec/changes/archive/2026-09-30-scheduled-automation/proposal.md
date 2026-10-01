# Proposal: scheduled-automation

## Why
Los movimientos programados de importe fijo (alquiler, suscripciones, nómina) hay que registrarlos a mano cada vez y no hay avisos antes de que venzan.

## What Changes
- Opción "Registrar automáticamente" en programados de importe fijo: un job de base de datos (pg_cron, cada hora) los asienta al llegar su fecha en la zona horaria del usuario, recuperando vencimientos atrasados.
- Campo "Recordar N días antes" (0–30) editable en web y móvil.
- La app móvil programa notificaciones locales con esos recordatorios.

## Impact
- Specs: `scheduled-transactions` (ADDED).
- DB: columna `auto_post`, check `not (auto_post and is_estimated)`, función `post_due_scheduled()` (solo para el job) y extensión/job pg_cron.
- Shared: campos `autoPost` y `reminderDaysBefore` en `scheduledSchema`, `reminderDate()`.
- Web y móvil: nuevos campos en formularios y etiqueta "Automático" en la lista; móvil: sincronización de notificaciones locales.
