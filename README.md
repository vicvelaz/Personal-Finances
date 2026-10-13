# fin

Gestor de finanzas personales con aplicaciones web y móvil. Ambas usan Supabase Auth y Postgres; las reglas y validaciones compartidas viven en paquetes TypeScript del monorepo.

## Requisitos

- Node.js `>=20.19` y pnpm `10` (el repositorio fija `pnpm@10.15.0`; habilita Corepack con `corepack enable`).
- Docker Desktop activo para ejecutar Supabase local.
- Para emuladores/dispositivos nativos: Android Studio o Xcode, según plataforma. La app móvil también se puede probar en web.

## Arranque local desde cero

Desde la raíz del repositorio:

1. Instala dependencias: `pnpm install`.
2. Crea `.env` a partir de `.env.example` y `apps/mobile/.env` a partir de `apps/mobile/.env.example`. No subas estos archivos ni claves reales al repositorio.
3. Arranca los servicios locales: `pnpm supabase:start`. Supabase requiere Docker.
4. Obtén las claves locales con `pnpm supabase:status`. Copia la URL y la clave `anon` a ambos archivos de entorno: `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` en el `.env` raíz y sus equivalentes `EXPO_PUBLIC_*` en `apps/mobile/.env`.
5. Aplica el esquema y las migraciones: `pnpm db:migrate`.
6. En terminales separadas, ejecuta `pnpm web` y `pnpm mobile`.

La web queda en <http://localhost:3000>. Expo muestra el QR y los comandos disponibles; usa `w` para abrir la versión web, o `a` / `i` para un emulador compatible. También puedes ejecutar `pnpm --filter @fin/mobile web`, `pnpm --filter @fin/mobile android` o `pnpm --filter @fin/mobile ios` directamente. iOS Simulator requiere macOS.

Para un dispositivo físico, el móvil y el ordenador deben estar en la misma red. Cambia `EXPO_PUBLIC_SUPABASE_URL` en `apps/mobile/.env` a la IP LAN del ordenador (puerto `54321`) y, si se usa OAuth, configura también `EXPO_PUBLIC_WEB_URL` con una URL accesible desde el dispositivo. `localhost` en un teléfono apunta al propio teléfono, no al ordenador.

## Servicios locales

| Servicio            | Dirección                | Uso                                        |
| ------------------- | ------------------------ | ------------------------------------------ |
| Web                 | <http://localhost:3000>  | Aplicación Next.js                         |
| Expo                | <http://localhost:8081>  | Metro y versión web de la aplicación móvil |
| Supabase API / Auth | <http://127.0.0.1:54321> | API y autenticación                        |
| Postgres            | `127.0.0.1:54322`        | Base de datos local                        |
| Supabase Studio     | <http://127.0.0.1:54323> | Inspección de tablas y configuración local |
| Mailpit             | <http://127.0.0.1:54324> | Emails de confirmación y recuperación      |

## Comandos de desarrollo

| Comando                                       | Descripción                                                                        |
| --------------------------------------------- | ---------------------------------------------------------------------------------- |
| `pnpm dev`                                    | Ejecuta los targets `dev` de las aplicaciones mediante Turbo                       |
| `pnpm web` / `pnpm mobile`                    | Arranca web o Expo individualmente                                                 |
| `pnpm build`                                  | Compila los proyectos que definen target `build`                                   |
| `pnpm typecheck` / `pnpm lint` / `pnpm test`  | Verificaciones del monorepo; los paquetes aplican los targets que tengan definidos |
| `pnpm db:generate`                            | Genera una migración Drizzle a partir del esquema TypeScript                       |
| `pnpm db:migrate`                             | Aplica migraciones a `DATABASE_URL`                                                |
| `pnpm db:verify-rls`                          | Verifica RLS y reglas de base contra Supabase local; termina con rollback          |
| `pnpm supabase:status` / `pnpm supabase:stop` | Consulta el estado o detiene Supabase local                                        |

## Mapa de documentación

- [Arquitectura y decisiones técnicas](docs/architecture.md)
- [Flujo de trabajo para desarrollar](docs/development.md)
- [Inicializar toda la aplicación en local en Windows](docs/inicializar-local-windows.md)
- [Desplegar web y móvil en producción desde Windows](docs/desplegar-produccion-windows.md)
- [Aplicación web](apps/web/README.md) · [rutas y flujos web](apps/web/src/app/README.md) · [servicios web](apps/web/src/lib/README.md)
- [Aplicación móvil](apps/mobile/README.md) · [rutas móviles](apps/mobile/src/app/README.md) · [servicios móviles](apps/mobile/src/lib/README.md)
- [Base de datos](packages/db/README.md) · [esquema](packages/db/src/schema/README.md)
- [Reglas compartidas](packages/shared/README.md) · [módulos de dominio](packages/shared/src/README.md)
- [Supabase local, Auth y correo](supabase/README.md)
- Requisitos de producto y cambios funcionales: [OpenSpec](openspec/README.md) y `openspec/specs/`.
