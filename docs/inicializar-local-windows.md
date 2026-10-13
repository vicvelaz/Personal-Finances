# Inicializar toda la aplicación en local (Windows)

Esta guía prepara el monorepo completo en un PC Windows: Supabase local (Auth, PostgreSQL, API y correo de pruebas), las migraciones del proyecto y las aplicaciones web y móvil. Los comandos están escritos para PowerShell desde la raíz del repositorio.

## 1. Qué se ejecuta

El proyecto tiene dos clientes y un backend compartido:

- `apps/web`: Next.js, normalmente en `http://localhost:3000`.
- `apps/mobile`: Expo Router para Android, iOS y web; Metro suele usar el puerto `8081`.
- `supabase`: PostgreSQL, Auth y API local en contenedores Docker.
- `packages/db`: esquema Drizzle y migraciones SQL ordenadas que se aplican a PostgreSQL.
- `packages/shared`: validaciones y lógica de dominio usada por los dos clientes.

El flujo de arranque es: iniciar Docker, iniciar Supabase, aplicar las migraciones Drizzle y arrancar web y móvil. Los clientes no funcionarán de extremo a extremo si Supabase no está activo y si las variables `NEXT_PUBLIC_SUPABASE_*` y `EXPO_PUBLIC_SUPABASE_*` no apuntan al backend local.

## 2. Requisitos de Windows

Instala lo siguiente antes de empezar:

1. **Windows 10 u 11 de 64 bits**, con virtualización habilitada en BIOS/UEFI.
2. **Git for Windows**, para clonar el repositorio.
3. **Node.js 20.19 o posterior**. Se recomienda una versión LTS compatible con el proyecto.
4. **Corepack y pnpm 10**. El `package.json` raíz fija `pnpm@10.15.0`; Corepack selecciona esa versión automáticamente.
5. **Docker Desktop**, configurado para usar contenedores Linux con WSL 2.
6. VS Code, opcional pero recomendado.
7. Android Studio y un emulador Android, solo si se quiere probar la app móvil en un emulador. iOS Simulator y Xcode requieren macOS; en Windows se puede probar iOS usando EAS en la nube o un iPhone físico con Expo Go.

Abre una ventana nueva de PowerShell después de instalar Node y Git, y comprueba las herramientas:

```powershell
node --version
corepack --version
git --version
docker --version
```

Activa Corepack y confirma la versión de pnpm elegida por el repo:

```powershell
corepack enable
corepack pnpm --version
```

La última línea debería mostrar `10.15.0`. Si PowerShell dice que no encuentra `corepack`, comprueba que Node está en el `PATH`, cierra y vuelve a abrir PowerShell y vuelve a ejecutar la comprobación. Si no se encuentra Docker, instala Docker Desktop y reinicia Windows.

### Preparar Docker Desktop

1. Inicia Docker Desktop desde el menú Inicio y acepta sus pasos iniciales.
2. Si lo solicita, instala o actualiza WSL 2. Desde PowerShell como administrador se puede ejecutar `wsl --update`; reinicia si Windows lo pide.
3. En Docker Desktop, deja seleccionado el motor Linux basado en WSL 2. Supabase local necesita contenedores Linux.
4. Espera hasta que Docker Desktop indique que el motor está en ejecución.
5. Verifica desde PowerShell:

```powershell
docker info
```

Si `docker info` informa que no puede conectarse al daemon o a `dockerDesktopLinuxEngine`, Supabase todavía no puede arrancar. Resuelve primero el estado de Docker Desktop; abrir solo la ventana no siempre significa que el motor ya esté listo.

## 3. Obtener el código e instalar dependencias

Si todavía no tienes el repositorio, clónalo con la URL que te haya proporcionado el equipo y entra en su carpeta:

```powershell
git clone <URL-DEL-REPOSITORIO>
Set-Location fin
```

Si ya tienes el repositorio, usa `Set-Location` con su ruta real. Comprueba que estás en la raíz, donde están `package.json` y `pnpm-workspace.yaml`, e instala las dependencias:

```powershell
Get-Location
Test-Path .\package.json
Test-Path .\pnpm-workspace.yaml
corepack pnpm install
```

No cambies el gestor de paquetes ni generes otro lockfile: el proyecto usa pnpm y `pnpm-lock.yaml`.

## 4. Crear la configuración local

Los archivos locales no se deben subir al repositorio. Desde la raíz:

```powershell
Copy-Item .env.example .env
Copy-Item apps\mobile\.env.example apps\mobile\.env
```

Ábrelos para editarlos en VS Code:

```powershell
code .env
code apps\mobile\.env
```

No publiques ni compartas el contenido de estos archivos. Para el primer arranque, conserva los valores locales de `DATABASE_URL` y de las URLs de Supabase que vienen en los ejemplos; sustituirás las claves públicas después de iniciar Supabase.

### Variables del archivo raíz `.env`

| Variable | Valor local | Para qué se usa |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `http://127.0.0.1:54321` | URL local de Supabase que usa la web. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública `anon` o `publishable` mostrada por Supabase local. | Acceso público del cliente web; los permisos reales dependen de Auth y RLS. |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | URL de la web local para enlaces y autenticación. |
| `DATABASE_URL` | URI local que viene en `.env.example`, normalmente `postgresql://postgres:postgres@127.0.0.1:54322/postgres`. | Conexión de Drizzle a PostgreSQL para ejecutar migraciones. |
| `SUPABASE_SERVICE_ROLE_KEY` | Déjala vacía para el uso habitual; usa la clave secreta local solo si vas a probar una operación de servidor que la requiera. | Acceso elevado del servidor; nunca se debe prefijar con `NEXT_PUBLIC_`. |
| `CRON_SECRET` | Déjalo vacío salvo que vayas a probar el endpoint local de tipos de cambio; en ese caso usa un valor aleatorio largo. | Protege `GET /api/cron/fx`. |
| `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` | `false` salvo que configures Google OAuth. | Muestra u oculta el acceso con Google en la web. |

### Variables de `apps/mobile/.env`

| Variable | Valor local | Para qué se usa |
| --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | `http://127.0.0.1:54321` para web local; para un dispositivo físico, sustituye `127.0.0.1` por la IP LAN del PC. | URL de Supabase que queda incluida en el cliente móvil. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | La misma clave pública local que usa la web. | Clave pública del cliente móvil. |
| `EXPO_PUBLIC_WEB_URL` | `http://localhost:3000` en el PC; usa una dirección accesible desde el dispositivo si pruebas allí un flujo que abre la web. | URL de la web usada en los flujos móviles que la necesitan. |
| `EXPO_PUBLIC_GOOGLE_AUTH_ENABLED` | `false`, salvo que Google OAuth esté configurado. | Activa o desactiva Google en el cliente móvil. |

`EXPO_PUBLIC_*` se incorpora a la app compilada. Solo debe contener valores públicos; nunca pongas ahí contraseñas, `DATABASE_URL`, `CRON_SECRET` ni claves secretas de Supabase.

## 5. Iniciar Supabase local

Comprueba primero que Docker está operativo. Después, desde la raíz del repo:

```powershell
corepack pnpm supabase:start
```

El primer inicio descarga imágenes y puede tardar varios minutos. Cuando termine, consulta las URLs y claves locales:

```powershell
corepack pnpm supabase:status
```

En la salida, localiza la API URL y la clave `anon` o `publishable`. Copia la URL y clave pública a `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` en `.env`, y a `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` en `apps/mobile/.env`. Guarda ambos archivos. No uses la clave `service_role` o `secret` como clave pública.

Servicios locales habituales:

| Servicio | Dirección | Uso |
| --- | --- | --- |
| Supabase API y Auth | `http://127.0.0.1:54321` | Conexión de las aplicaciones. |
| PostgreSQL | `127.0.0.1:54322` | Base de datos; la usa Drizzle. |
| Supabase Studio | `http://127.0.0.1:54323` | Inspeccionar el proyecto local. |
| Mailpit | `http://127.0.0.1:54324` | Ver emails locales de alta y recuperación. |

El correo local se captura en Mailpit; no se entrega al destinatario real. Auth está configurado para exigir confirmación de email, así que abre Mailpit para seguir el enlace recibido al registrar una cuenta local.

## 6. Aplicar el esquema y las migraciones

El esquema de aplicación está en `packages/db/drizzle`. Este repositorio usa Drizzle, por lo que el comando correcto es `db:migrate`; `supabase db push` no es el comando que aplica esta carpeta de migraciones.

Confirma que `DATABASE_URL` en el archivo raíz `.env` apunta a `127.0.0.1:54322`, no a una base remota. Luego:

```powershell
corepack pnpm db:migrate
```

Para comprobar políticas y reglas de acceso en el proyecto local:

```powershell
corepack pnpm db:verify-rls
```

Este verificador es una comprobación local. No lo ejecutes contra producción: el script realiza operaciones de prueba sobre datos de la base.

Si `db:migrate` da error de conexión, verifica que Supabase está arriba con `corepack pnpm supabase:status`, y revisa que `DATABASE_URL` use el puerto `54322` y la contraseña local configurada.

## 7. Arrancar web y móvil

Usa **dos terminales de PowerShell**, ambas en la raíz del repositorio. En la primera:

```powershell
corepack pnpm --filter @fin/web dev
```

Abre [http://localhost:3000](http://localhost:3000). En la segunda terminal:

```powershell
corepack pnpm --filter @fin/mobile start
```

Expo muestra un QR y la URL de Metro. Puedes abrir el QR con Expo Go, usar las teclas que muestre Expo para el emulador Android, o pulsar `w` para probar el cliente Expo en un navegador. Para iniciar solo la versión web de Expo:

```powershell
corepack pnpm --filter @fin/mobile web
```

La versión web principal del producto es Next.js en el puerto `3000`; la versión web de Expo es otra salida de `apps/mobile` y suele usar el puerto `8081`.

El repo también define `corepack pnpm web`, `corepack pnpm mobile` y `corepack pnpm dev`. Si `pnpm dev` falla con un mensaje de Turbo indicando que no encuentra el binario del gestor de paquetes, usa los dos comandos filtrados anteriores, uno por terminal. Así se ejecuta cada app sin que Turbo tenga que resolver pnpm.

### Usar un teléfono físico

El PC y el teléfono deben estar en la misma red. En Expo, usa el modo LAN y escanea el QR. `127.0.0.1` en el teléfono se refiere al teléfono, no al PC: cambia `EXPO_PUBLIC_SUPABASE_URL` por `http://<IP-LAN-DEL-PC>:54321` y reinicia Expo. Puedes obtener la IP del PC con:

```powershell
ipconfig
```

Busca la dirección IPv4 de la interfaz Wi-Fi o Ethernet conectada. Si Windows Firewall pregunta, permite el acceso privado a Node/Expo. Si Google OAuth se usa desde el dispositivo, configura también `EXPO_PUBLIC_WEB_URL` con una dirección accesible desde ese teléfono.

## 8. Verificar el flujo completo

1. Comprueba que la web carga en `http://localhost:3000` y que Metro muestra el QR sin errores.
2. Crea una cuenta de prueba desde la web y consulta `http://127.0.0.1:54324` para abrir el correo de confirmación.
3. Confirma la cuenta con el enlace del email y comprueba que puedes iniciar sesión.
4. Crea datos de prueba desde web y verifica que aparecen en la app móvil con el mismo usuario.
5. Cierra sesión y comprueba que las pantallas protegidas requieren autenticación.
6. Opcionalmente, desde la raíz ejecuta:

```powershell
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
```

## 9. Google OAuth y tareas opcionales

El proyecto oculta el botón de Google por defecto. Para probarlo hacen falta credenciales OAuth propias, un proveedor Google configurado en Supabase y los redirect URLs correctos. En local se permite el sitio web local y el esquema móvil `fin://`; sigue también la guía de [Supabase Auth](../supabase/README.md). No actives la bandera `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` o `EXPO_PUBLIC_GOOGLE_AUTH_ENABLED` sin terminar la configuración del proveedor.

La actualización de tipos de cambio de la web necesita `SUPABASE_SERVICE_ROLE_KEY` y `CRON_SECRET`. Para probarla localmente, obtén la clave secreta local de Supabase y genera un secreto aleatorio de al menos 32 bytes, por ejemplo con:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Guarda los valores solo en `.env` y reinicia Next.js. Llama el endpoint enviando `Authorization: Bearer <CRON_SECRET>`; no pegues la clave en URLs, commits o capturas. Las operaciones recurrentes de transacciones están programadas por una migración SQL que habilita `pg_cron` en PostgreSQL.

## 10. Parar el entorno

Para parar Next.js y Expo, vuelve a cada terminal y pulsa `Ctrl+C`. Para apagar los contenedores de Supabase cuando ya no los necesites:

```powershell
corepack pnpm supabase:stop
```

No borres volúmenes de Docker si quieres conservar la base local. Al siguiente día, abre Docker Desktop, espera a que el motor Linux esté listo y ejecuta otra vez `corepack pnpm supabase:start`.

## Problemas frecuentes

| Síntoma | Qué revisar |
| --- | --- |
| `pnpm` no se reconoce | Ejecuta `corepack enable`, abre una nueva terminal y prueba `corepack pnpm --version`. En las instrucciones de esta guía se puede usar siempre `corepack pnpm`. |
| `docker info` no conecta con el engine | Arranca Docker Desktop, confirma el motor Linux/WSL 2 y espera a que indique que está activo. |
| Supabase no inicia o un puerto está ocupado | Ejecuta `corepack pnpm supabase:status`; cierra otro stack Supabase o proceso que use los puertos `54321`-`54324` y `54322`, y reintenta. |
| La web muestra error de Supabase | Comprueba URL y clave pública en `.env`, reinicia Next y confirma que `corepack pnpm supabase:status` responde. |
| El móvil no conecta desde el teléfono | Cambia la URL de Supabase de loopback a la IP LAN del PC y permite Metro/API en la red privada del Firewall. |
| No llega el email de prueba | Abre Mailpit en el puerto `54324`; el SMTP local no envía emails a Internet. |
| La ruta de cron devuelve `503` | Solo esa ruta necesita `CRON_SECRET` y la clave elevada en `.env`; el uso normal de la app no requiere esas variables. |

## Referencias del repositorio

- [README raíz](../README.md)
- [Flujo de desarrollo](development.md)
- [Arquitectura](architecture.md)
- [Base de datos y migraciones](../packages/db/README.md)
- [Supabase local y Auth](../supabase/README.md)