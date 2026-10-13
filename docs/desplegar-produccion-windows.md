# Desplegar fin en producción desde Windows

Esta guía describe una ruta concreta para publicar el stack de este repositorio desde un PC Windows:

- **Backend:** Supabase Cloud (Postgres, Auth y Data API).
- **Web principal:** Vercel (Next.js en `apps/web`).
- **Móvil nativo:** Expo Application Services (EAS Build/Submit) para Google Play y Apple App Store.
- **Tareas:** `pg_cron` dentro de Supabase para transacciones programadas y Vercel Cron para actualizar tipos de cambio.

La ruta está pensada para una primera publicación manual desde PowerShell. Después puede automatizarse con GitHub Actions o EAS Workflows. No hace falta un Mac para compilar ni subir la aplicación iOS si se usa EAS en la nube; Apple sí exige una cuenta del Apple Developer Program.

> **Importante:** publicar código no basta para tener una aplicación operativa. Auth, correos reales, redirects, variables, migraciones, cron y fichas de tienda también se configuran.

## 1. Preparación y cuentas

Antes de desplegar, ten a mano:

1. El repositorio subido a GitHub y una rama de producción identificada, normalmente `main`.
2. Una cuenta de Supabase y un proyecto de producción nuevo.
3. Una cuenta de Vercel conectada a GitHub.
4. Una cuenta de Expo (`expo.dev`) para crear el proyecto EAS.
5. Si vas a publicar para móviles, cuentas de Google Play Console y Apple Developer/App Store Connect.
6. Un dominio propio, recomendado para la web y los enlaces de Auth.
7. Un proveedor SMTP de correo transaccional, por ejemplo Resend, Brevo, Postmark, SendGrid o AWS SES.
8. Opcionalmente, un proyecto de Google Cloud para habilitar Google OAuth.

El proyecto fija Node `>=20.19` y pnpm `10.15.0`. En Windows instala Node, Git y Corepack; para las instrucciones locales y las comprobaciones usa PowerShell. EAS construye los binarios en sus servidores, por lo que no necesitas instalar Xcode en Windows.

## 2. Mapa de claves y dónde van

Obtén las claves directamente de sus paneles y pégalas en los destinos indicados. No las envíes por chat ni las confirmes en commits.

| Nombre en este repositorio | Dónde se obtiene | Dónde se introduce | ¿Se puede publicar? |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Cloud: botón **Connect** del proyecto o datos del proyecto; forma `https://<project-ref>.supabase.co`. | Vercel, entorno **Production**. | Sí, es URL pública. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase **Settings → API Keys** o botón **Connect**: usa la **Publishable key** `sb_publishable_...`; la legacy `anon` también es pública. | Vercel, entorno **Production**. | Sí. El nombre de variable se mantiene por compatibilidad del código actual. |
| `EXPO_PUBLIC_SUPABASE_URL` | La misma URL del proyecto Supabase. | Expo/EAS: variable de entorno **production** del proyecto móvil. | Sí; quedará en el cliente. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | La misma Publishable key/legacy `anon`. | Expo/EAS: variable de entorno **production**. | Sí; quedará en el cliente. RLS sigue siendo obligatoria. |
| `NEXT_PUBLIC_SITE_URL` | La URL definitiva de la web, por ejemplo `https://fin.example.com`. | Vercel, entorno **Production**. | Sí. |
| `EXPO_PUBLIC_WEB_URL` | La URL definitiva de la web principal. | Expo/EAS, entorno **production**. | Sí. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase **Settings → API Keys**: preferentemente una **Secret key** `sb_secret_...`; la legacy `service_role` es elevada. | Vercel solamente, como variable **Sensitive/Secret** de **Production**. | **No.** Omítela de Vercel si no se habilita el cron de FX; jamás va a Expo, al navegador o al repo. |
| `CRON_SECRET` | Genérala tú con un generador criptográfico aleatorio; no la da ningún proveedor. | Vercel, variable **Sensitive/Secret** de **Production**; el Cron la envía al endpoint. | **No.** |
| `DATABASE_URL` | Supabase **Connect → Connection string → URI**; inserta la contraseña de base de datos que elegiste al crear el proyecto. | Temporalmente en la sesión de PowerShell que ejecuta la migración. No es necesaria para el cliente ni se debe añadir a Expo. | **No.** No añadir a Vercel salvo que una operación de servidor concreta la necesite. |
| SMTP host, user y password | En la cuenta del proveedor de correo, sección de credenciales SMTP. | Supabase **Authentication → Emails → SMTP Settings**. | **No.** Solo en el panel de Supabase. |
| Google OAuth Client ID y Client Secret | Google Cloud Console, credenciales OAuth tipo aplicación web. | Supabase **Authentication → Sign In / Providers → Google**. | Client ID es público; Client Secret no. No confundirlo con la clave Supabase. |

En el panel moderno de Supabase, las claves recomendadas son `sb_publishable_...` para clientes públicos y `sb_secret_...` para backend. Las claves antiguas `anon` y `service_role` son el formato anterior. Este repo conserva los nombres de variables `*_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`; introduce en ellas la clave compatible correspondiente, sin renombrar las variables. La clave secreta permite saltarse RLS: limítala al endpoint de servidor que la necesite.

## 3. Crear el proyecto de producción en Supabase

1. Entra en [Supabase Dashboard](https://supabase.com/dashboard) y selecciona **New project**.
2. Elige o crea una organización. Asigna un nombre identificable, por ejemplo `fin-production`.
3. Selecciona una región próxima a los usuarios y genera una contraseña de Postgres larga y única. Guárdala en un gestor de contraseñas; no la reutilices ni la introduzcas en el repo.
4. Crea el proyecto y espera a que termine el aprovisionamiento.
5. En **Connect**, copia el **Project URL** y la **Publishable key**. Si todavía solo tienes la clave legacy `anon`, se puede usar mientras se crea la publishable.
6. Abre **Settings → API Keys** y confirma que hay una Publishable key. En esa pantalla crea/consulta una Secret key únicamente si vas a activar el cron de actualización de FX.
7. Guarda URL y clave pública en un gestor temporal seguro para usarlas en Vercel y EAS. La clave de cliente no autoriza por sí sola a leer datos de otros usuarios: las políticas RLS son el límite de acceso.

### Configurar Auth y redirects

En el proyecto Supabase abre **Authentication → URL Configuration**:

- En **Site URL**, introduce el origen web canónico, por ejemplo `https://fin.example.com` (sin `/auth/...`).
- En **Redirect URLs**, añade los destinos concretos que utiliza la app:
  - `https://fin.example.com/auth/confirm`
  - `https://fin.example.com/auth/callback`
  - `fin://**` para retorno de OAuth en la app móvil instalada.
- Si vas a usar previews de Vercel, añade una regla wildcard de preview limitada al dominio/equipo real de Vercel, por ejemplo `https://*-<slug-del-equipo>.vercel.app/**`. No uses un wildcard abierto a cualquier dominio si no es necesario.
- Conserva también redirects locales necesarios para desarrollo; no sustituyas el Site URL de producción por `localhost`.

La web verifica los enlaces de email en `/auth/confirm` y devuelve OAuth a `/auth/callback`. En móvil el esquema `fin` ya está declarado en `apps/mobile/app.json`. No se debe registrar `http://localhost` como URL de producción.

### Configurar correo de Auth

El SMTP por defecto de Supabase sirve para pruebas, no para mandar emails a usuarios públicos. Para producción:

1. Crea un dominio de envío en un servicio SMTP transaccional.
2. En ese proveedor, verifica el dominio y publica los registros DNS SPF, DKIM y DMARC que indique.
3. Copia host, puerto, usuario, contraseña SMTP, dirección remitente y nombre remitente.
4. En Supabase abre **Authentication → Emails → SMTP Settings** (en algunas versiones del panel figura como **SMTP Settings** dentro de la configuración de Auth), activa SMTP personalizado y pega las credenciales del proveedor. Usa el puerto y TLS requeridos por ese proveedor, normalmente submission con STARTTLS.
5. Guarda y envía un email de prueba. No uses la API key de envío en un campo SMTP password salvo que el proveedor documente explícitamente ese modo.
6. Revisa **Authentication → Emails / Email Templates**. Las plantillas del repo están en `supabase/templates/`; al publicarlas en el panel, confirma que el enlace de confirmación apunta al Site URL correcto y a `/auth/confirm`.
7. Mantén habilitada la confirmación de emails. La plantilla de recuperación debe regresar a la web de producción.

### Google OAuth (opcional)

1. En [Google Cloud Console](https://console.cloud.google.com/), crea o elige un proyecto y configura **Google Auth Platform / OAuth consent screen** con nombre, emails de soporte y dominios autorizados.
2. Crea un OAuth Client ID del tipo **Web application**.
3. En el cliente de Google, añade como **Authorized redirect URI** el callback de Supabase, con formato `https://<project-ref>.supabase.co/auth/v1/callback`. No es el callback de Next.js.
4. Copia Client ID y Client Secret a **Supabase → Authentication → Sign In / Providers → Google**, activa el proveedor y guarda.
5. En Vercel añade `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`. En EAS añade `EXPO_PUBLIC_GOOGLE_AUTH_ENABLED=true` para el entorno production si también se quiere en móvil.
6. Comprueba que `https://fin.example.com/auth/callback` y `fin://**` están en los Redirect URLs permitidos de Supabase.

Si Google no está preparado, deja ambas banderas en `false`; es el valor por defecto del proyecto.

## 4. Aplicar las migraciones de la base de producción

Las migraciones del proyecto están versionadas en `packages/db/drizzle` y usan Drizzle. No uses el ejemplo genérico `supabase db push`: ese comando espera el formato habitual de `supabase/migrations`, que no es donde este repo guarda el historial Drizzle.

### Obtener una URI compatible

1. En el panel del proyecto abre **Connect → Connection string** y elige formato **URI**.
2. Copia la URI de Postgres e inserta la contraseña configurada al crear el proyecto en el lugar del marcador correspondiente.
3. La conexión directa suele ser preferible para cambios de esquema. Si la red Windows no tiene IPv6 y la conexión directa no resuelve, elige **Session pooler** en Connect. Evita el pooler en modo transacción para ejecutar migraciones.
4. No pegues la URI aquí, en tickets ni en logs: incluye credenciales administrativas.

### Ejecutar desde PowerShell

Primero prueba que el código está sano y que las migraciones locales están aplicadas en una base de prueba. No ejecutes `pnpm db:verify-rls` contra producción; es un verificador pensado para Supabase local.

En una ventana de PowerShell, desde la raíz del repo, asigna la URI solo a esa sesión y ejecuta la migración:

```powershell
$env:DATABASE_URL = "postgresql://postgres:<CONTRASENA>@db.<PROJECT-REF>.supabase.co:5432/postgres"
corepack pnpm db:migrate
Remove-Item Env:DATABASE_URL
```

Sustituye el ejemplo por la URI real copiada desde Connect; respeta usuario, host, puerto, parámetros SSL y cualquier encoding que el panel muestre. Si la URI incluye caracteres especiales en la contraseña, usa la cadena codificada que proporciona Supabase o codifica la contraseña para URL antes de insertarla. No guardes la URI en `.env` ni en un archivo versionado.

Revisa toda la salida: deben aplicarse las migraciones pendientes sin errores. Para diagnosticar el estado, usa la conexión adecuada y el panel de Supabase; no marques migraciones como aplicadas a mano ni edites una migración que ya se aplicó. En futuros cambios, genera y revisa una nueva migración, pruébala localmente y aplica esa nueva migración a producción.

## 5. Desplegar la web Next.js en Vercel

### Importar el monorepo

1. Sube y confirma en GitHub el commit que quieres publicar.
2. En [Vercel Dashboard](https://vercel.com/dashboard), pulsa **Add New… → Project** y concede acceso al repositorio GitHub.
3. Importa este repositorio. Si el asistente detecta Turborepo, deja activada su integración.
4. Configura **Root Directory** como `apps/web`, que es el paquete Next.js. Vercel soporta pnpm workspaces/Turborepo y enlaza las dependencias del monorepo como `@fin/shared` y `@fin/db`.
5. Deja **Framework Preset** en **Next.js**. Deja que Vercel detecte el comando de instalación, la compilación y el directorio de salida; no fuerces salida estática, porque la app usa SSR, Server Actions y rutas API.
6. El repo fija `pnpm@10.15.0` y conserva `pnpm-lock.yaml`. Mantén pnpm como gestor detectado. No cambies a npm ni borres el lockfile.
7. Antes de pulsar **Deploy**, configura las variables de entorno indicadas abajo, o espera al primer build fallido y agrégalas antes de **Redeploy**. Es mejor añadirlas antes del primer despliegue.

### Variables en Vercel

Dentro del proyecto Vercel abre **Settings → Environment Variables** y agrega una variable por fila. Selecciona **Production** como Environment para cada valor de producción. Las variables `NEXT_PUBLIC_*` deben existir durante el build, ya que Next las incorpora al bundle. Después de cambiar una variable hay que hacer un nuevo deployment.

| Name | Value | Environment | Tipo/uso |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL Supabase `https://<project-ref>.supabase.co` | Production | Pública, tipo Config. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_...` o legacy `anon` del proyecto correcto | Production | Pública, tipo Config. |
| `NEXT_PUBLIC_SITE_URL` | Origen web final `https://fin.example.com` | Production | Pública, tipo Config. |
| `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` | `true` solo si Google quedó configurado; si no, `false` | Production | Pública, tipo Config. |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_...` o legacy `service_role`, solo si se activa FX cron | Production | Sensible/Secret. Nunca `NEXT_PUBLIC_*`. |
| `CRON_SECRET` | Secreto aleatorio fuerte creado por ti, solo si se activa FX cron | Production | Sensible/Secret. |

No añadas `EXPO_PUBLIC_*` a Vercel para la web Next, y no añadas `DATABASE_URL` porque la web accede normalmente a los datos a través de Supabase con la sesión del usuario. Guarda cada variable. Vuelve a **Deployments** y ejecuta **Redeploy** si el proyecto ya tenía un build previo.

### Dominio y publicación

1. En Vercel, abre **Settings → Domains** y añade el dominio comprado.
2. Copia exactamente los registros DNS que Vercel muestra a tu proveedor de dominio. La configuración puede ser CNAME o A según el nombre y el DNS.
3. Espera a que Vercel valide el dominio y emita HTTPS.
4. Establece el dominio canónico en `NEXT_PUBLIC_SITE_URL` y en Supabase **Authentication → URL Configuration → Site URL**.
5. Comprueba el deployment de producción desde **Deployments** y abre su URL. La rama de producción de GitHub (normalmente `main`) hará deployments de producción en los siguientes pushes; otras ramas generan previews.

## 6. Programar la actualización diaria de tipos de cambio

La ruta `apps/web/src/app/api/cron/fx/route.ts` exige `Authorization: Bearer <CRON_SECRET>` y usa `SUPABASE_SERVICE_ROLE_KEY` para escribir `exchange_rates`. Los dos secretos solo deben estar en el runtime privado de Vercel. El repo todavía no contiene `apps/web/vercel.json`, así que hay que añadirlo para que Vercel ejecute la ruta según una programación.

Crea `apps/web/vercel.json` con una programación diaria en UTC; por ejemplo:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/cron/fx",
      "schedule": "0 6 * * *"
    }
  ]
}
```

Vercel Cron llama la ruta con GET. Configurando `CRON_SECRET` en el proyecto, Vercel envía el bearer token correspondiente. Despliega de nuevo y revisa **Settings / Cron Jobs** o la sección de cron del deployment para confirmar que aparece la programación. El endpoint devuelve `503` mientras falte alguno de los dos secretos y `401` si el token no coincide.

Para pruebas manuales, usa un cliente HTTP que pueda enviar un header `Authorization: Bearer ...`; no incluyas el token en la URL, porque las URLs pueden quedar en historial y logs. No llames el endpoint sin autorización ni compartas ese header.

## 7. Revisar la programación PostgreSQL

La migración `packages/db/drizzle/0017_post_due_scheduled.sql` instala `pg_cron` y programa `post-due-scheduled` cada hora. No se programa desde Vercel. Tras aplicar todas las migraciones, verifica en Supabase Studio/SQL Editor que el job exista:

```sql
select jobid, jobname, schedule, command, active
from cron.job
where jobname = 'post-due-scheduled';
```

Debe estar activo y ejecutar `public.post_due_scheduled()`. Revisa los logs de la base si la extensión o el job no aparece. No crees un segundo job con el mismo objetivo sin revisar primero el existente.

## 8. Preparar builds móviles con Expo EAS

La configuración Expo actual ya tiene slug `fin`, esquema `fin` e iconos, pero todavía hay que elegir identificadores permanentes de tienda. Esos identificadores no se pueden cambiar después de publicar una app.

### Configurar el proyecto EAS

1. Crea o inicia sesión en una cuenta de Expo en [expo.dev](https://expo.dev/).
2. En PowerShell, entra en el paquete Expo. EAS Build en monorepos se ejecuta desde la raíz de la app, que en este repo es `apps/mobile`:

```powershell
Set-Location apps\mobile
corepack pnpm dlx eas-cli@latest login
corepack pnpm dlx eas-cli@latest build:configure
```

3. Sigue el asistente para crear/vincular el proyecto Expo. Conserva el `projectId` que añada a la configuración.
4. El asistente generará `apps/mobile/eas.json`. Conserva los perfiles que cree y comprueba que el perfil `production` use el entorno EAS `production`.
5. En `apps/mobile/app.json`, elige identificadores permanentes y agrégalos a la configuración Expo:

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.tuempresa.fin"
    },
    "android": {
      "package": "com.tuempresa.fin"
    }
  }
}
```

Integra esos campos en el JSON existente; no reemplaces iconos, plugins ni el resto de `app.json`. Usa un dominio inverso que controles y que sea único. Android `package` e iOS `bundleIdentifier` deben coincidir con las apps creadas posteriormente en las tiendas.

### Variables de producción en Expo

Las variables del `.env` local **no se copian automáticamente** a EAS Build. En [Expo Dashboard](https://expo.dev/), abre el proyecto `fin` y ve a **Project settings → Environment variables** (o **Environment variables** en el menú del proyecto). Crea estas variables para el entorno `production`:

| Name | Value | Visibility |
| --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase de producción | Plain text o Sensitive; es pública. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Publishable key `sb_publishable_...` del mismo proyecto | Plain text o Sensitive; es pública. |
| `EXPO_PUBLIC_WEB_URL` | URL canónica de Vercel, por ejemplo `https://fin.example.com` | Plain text. |
| `EXPO_PUBLIC_GOOGLE_AUTH_ENABLED` | `true` si Google OAuth está preparado; si no, `false` | Plain text. |

Las variables que empiezan por `EXPO_PUBLIC_` se embeben en la app y son legibles por sus usuarios; nunca les asignes una clave `sb_secret`, `service_role`, una contraseña o un token privado. Guarda las variables antes de pedir un build y confirma que el perfil `production` de `eas.json` se asocia al environment `production`.

### Compilar en los servidores EAS

Desde `apps/mobile`, valida el proyecto y lanza builds de producción:

```powershell
corepack pnpm dlx eas-cli@latest build --platform android --profile production
corepack pnpm dlx eas-cli@latest build --platform ios --profile production
```

También se pueden pedir ambos con `--platform all`. Si pregunta por firma/credentials, se puede permitir que EAS genere y guarde las credenciales de Android e iOS. Protege el acceso a la cuenta Expo con MFA. Android para tienda produce un `.aab`; iOS produce un `.ipa`. Los builds se ejecutan en la nube de EAS, no en Windows.

Para probar antes de publicar, usa un perfil interno/de preview y una distribución de test. No confundas un APK de instalación directa con el `.aab` que Google Play espera para publicar.

## 9. Crear fichas y publicar en las tiendas

### Google Play Console

1. Crea la aplicación en [Google Play Console](https://play.google.com/console/) y elige nombre, idioma predeterminado y tipo de app.
2. Completa la ficha de tienda, icono, capturas, descripción, categoría, clasificación de contenido, audiencia, política de privacidad y declaraciones **Data safety**.
3. Confirma que el package ID coincide con `expo.android.package`.
4. Configura la firma de Play App Signing y prepara la pista de **Internal testing**.
5. Para que EAS Submit suba builds, crea una Google Service Account para Play Console, concede los permisos de publicación a esa cuenta desde Play Console y descarga su JSON.
6. Desde [Expo Dashboard → Credentials → Android → Service credentials](https://expo.dev/), selecciona **Google service account key for EAS Submit → Add a Google service account key → Upload new key**, sube el JSON y guárdalo en EAS. El JSON es secreto; no lo subas a Git ni a `apps/mobile`.
7. Desde `apps/mobile`, ejecuta `corepack pnpm dlx eas-cli@latest submit --platform android --profile production`, elige el build y confirma la pista. La primera subida suele quedar en pruebas internas; completa los requisitos de Play Console y promueve la versión a producción cuando esté aprobada.

### App Store Connect / TestFlight

1. En [App Store Connect](https://appstoreconnect.apple.com/), crea una app con el bundle ID que coincide con `expo.ios.bundleIdentifier`.
2. Completa nombre, SKU, idioma, descripción, categoría, clasificación por edad, política de privacidad, información de privacidad, soporte y capturas.
3. Desde `apps/mobile`, ejecuta `corepack pnpm dlx eas-cli@latest submit --platform ios --profile production` y sigue la autenticación de Apple/EAS. EAS puede generar y custodiar certificados y perfiles si se lo autorizas.
4. La subida aparece en TestFlight tras el procesamiento. Prueba el build con usuarios internos; para publicarlo, selecciona el build en App Store Connect, completa metadatos y envíalo a **App Review**.

Un upload no equivale a una publicación: ambas tiendas revisan la ficha y el binario, y requieren completar sus formularios. Para automatización no interactiva, configura las credenciales de servicio en EAS y no guardes archivos JSON, `.p8`, contraseñas o certificados en el repo.

## 10. (Opcional) Publicar también la web de Expo

La web principal recomendada es `apps/web` (Next.js). Además, `apps/mobile/app.json` define `web.output: "static"`, así que se puede publicar una versión web estática del cliente Expo como sitio separado, si el producto la necesita.

En Expo/EAS configura las mismas `EXPO_PUBLIC_*` públicas para `production`, exporta el sitio desde el paquete móvil y publica `apps/mobile/dist` en un hosting estático. En Vercel, sería un **segundo proyecto** con Root Directory `apps/mobile`, Framework Preset **Other**, Build Command `expo export --platform web` y Output Directory `dist`; verifica los comandos que presenta Vercel antes de desplegar. Esta versión estática no sustituye a la app Next.js y no debe recibir secretos de servidor.

## 11. Verificación de producción

Antes de anunciar el lanzamiento:

1. Abre el dominio HTTPS y confirma que Vercel indica **Ready** para el deployment de Production.
2. Registra un usuario con un email que puedas recibir, confirma el mensaje y prueba iniciar sesión y cerrar sesión.
3. Comprueba recuperación de contraseña y enlaces de email; deben volver a tu dominio, nunca a `localhost`.
4. Prueba Google OAuth en web/móvil solo si está habilitado.
5. En web y móvil, crea/edita datos propios y verifica que un usuario distinto no pueda verlos. Revisa Supabase **Database → Advisors / Security Advisor** y que RLS esté activa en todas las tablas expuestas.
6. Comprueba el job `post-due-scheduled` en `cron.job` y revisa sus ejecuciones en logs de Postgres.
7. Confirma que Vercel Cron lista `/api/cron/fx`, que no expone secretos y que la tabla de tipos de cambio se actualiza.
8. Prueba una build móvil en pista interna/TestFlight antes de solicitar lanzamiento público.
9. Configura monitorización, alertas de uso, copias de seguridad y un proceso para rotar secretos. Decide el plan de Supabase según la necesidad de disponibilidad, copias y ausencia de pausas por inactividad.

## 12. Lista de claves: resumen de seguridad

- `NEXT_PUBLIC_*` y `EXPO_PUBLIC_*`: configuración pública. Debe ser URL, clave Publishable/anon o bandera; no son un lugar para secretos.
- Publishable key de Supabase: se puede distribuir; su acceso depende de Auth, grants y RLS.
- Secret key / `service_role`: solo servidor. Omite del cliente móvil, del navegador y de los logs.
- `DATABASE_URL`: credencial administrativa de Postgres. Se usa temporalmente desde PowerShell para migrar, no desde apps cliente.
- `CRON_SECRET`: secreto de autorización HTTP de Vercel Cron para el endpoint FX.
- Password SMTP, Google Client Secret, JSON de Google Play, claves `.p8` y credenciales Apple: guárdalas en los gestores de secretos de sus proveedores, no en Git.

## Referencias oficiales

- [Checklist de producción de Supabase](https://supabase.com/docs/guides/deployment/going-into-prod)
- [Claves API de Supabase](https://supabase.com/docs/guides/api/api-keys)
- [Migraciones de base de datos Supabase](https://supabase.com/docs/guides/deployment/database-migrations)
- [Redirect URLs de Auth](https://supabase.com/docs/guides/auth/redirect-urls)
- [SMTP personalizado de Supabase Auth](https://supabase.com/docs/guides/auth/auth-smtp)
- [Monorepos en Vercel](https://vercel.com/docs/monorepos)
- [Variables de entorno Vercel](https://vercel.com/docs/environment-variables)
- [Cron Jobs Vercel](https://vercel.com/docs/cron-jobs)
- [Crear builds EAS](https://docs.expo.dev/build/setup/)
- [Variables EAS](https://docs.expo.dev/eas/environment-variables/)
- [Monorepos EAS](https://docs.expo.dev/build-reference/build-with-monorepos/)
- [Enviar a Google Play](https://docs.expo.dev/submit/android/)
- [Enviar a App Store](https://docs.expo.dev/submit/ios/)

## Referencias del repositorio

- [Variables raíz de ejemplo](../.env.example)
- [Variables móviles de ejemplo](../apps/mobile/.env.example)
- [Configuración de Supabase local](../supabase/config.toml)
- [Migraciones Drizzle](../packages/db/README.md)
- [Configuración de la app Expo](../apps/mobile/app.json)
- [Configuración de la web](../apps/web/README.md)