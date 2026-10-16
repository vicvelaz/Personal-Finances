# Design

## Context

Véase `proposal.md` para la motivación y `specs/` para el contrato observable. Hoy el importador vive en `packages/shared/src/csv-import.ts` y en una pantalla web: detecta separadores, permite mapear columnas manualmente, infiere gasto/ingreso por el signo e ignora transferencias. La exportación actual usa otros encabezados. Los presupuestos son filas mensuales únicas, con importes enteros en unidades menores; las metas también guardan importes enteros. En móvil, `OptionPicker` muestra opciones como etiquetas; la web usa controles nativos con estilos básicos. El detalle actual de categoría también contiene su formulario de edición y borrado.

El sistema ya aplica RLS de propietario en Postgres, valida contratos compartidos con Zod y agrupa las transferencias en dos movimientos atómicos. Las rutas programadas de Next existentes autentican con `CRON_SECRET`; las claves privilegiadas permanecen solo en servidor.

## Goals / Non-Goals

**Goals:**
- Extender los contratos compartidos y la persistencia para que web, móvil, importación y tareas programadas apliquen las mismas reglas.
- Mantener la precisión monetaria, privacidad por propietario y atomicidad de transferencias y cierres.
- Conservar las capacidades actuales de editar categorías, presupuestos y metas mientras se incorporan los nuevos paneles y controles.

**Non-Goals:**
- Añadir importación CSV a móvil, conversión de moneda en transferencias CSV, cambios a los esquemas de moneda o movimientos divididos, ni una plataforma de servidor nueva.
- Modificar gastos, ingresos o movimientos bancarios al liquidar sobrantes presupuestarios.
- Sustituir el historial normal de movimientos por ajustes o asignaciones virtuales.

## Decisions

### Contratos de dominio y dinero

La validación y los cálculos compartidos residirán en `packages/shared`; los valores monetarios se mantendrán como enteros en unidades menores. El control estricto de importe se usará en campos de magnitud positiva. Los campos existentes cuyo dominio admite signo (por ejemplo, el saldo inicial de una cuenta) conservarán su comportamiento hasta que exista un requisito específico para ellos.

Los formatos de fecha de interfaz se convertirán a ISO como cadenas de calendario, validando con las funciones compartidas y sin convertir a instantes UTC. La fecha ISO seguirá siendo el contrato entre formularios, acciones y base de datos.

### Importación y transferencia CSV

El parser compartido validará nombres de cabecera en vez de exponer un mapeo manual; aceptará las seis columnas canónicas requeridas y `destination_account` como columna opcional. La detección puede ignorar mayúsculas y el orden, pero rechazará columnas repetidas o desconocidas. El staging seguirá siendo estado local del navegador para un máximo de 1000 filas, con páginas de 10/25/50; editar categoría y borrar filas no mutará datos persistidos hasta confirmar.

Los nombres de cuenta se resolverán contra las cuentas activas del usuario autenticado: cuenta origen vacía usa el fallback escogido, nombre no único o no encontrado es error, y destino de transferencia nunca usa fallback. El destino CSV no incluye importe recibido; por ello solo se aceptan transferencias entre cuentas de la misma moneda. Se conserva el importe positivo como magnitud de la cuenta origen. Las transferencias se crean por la función transaccional existente, no insertando directamente una sola pata.

La confirmación usará la nueva ruta autenticada `POST /api/v1/transactions/batch`, con el cliente Supabase de sesión y RLS. La función de base de datos verificará propiedad, estado activo, moneda, tipo de categoría y pares de transferencia. La clave de duplicado incluirá la identidad de ambas cuentas para no confundir operaciones distintas. La salida CSV se actualizará al mismo contrato, exportando una vez cada par; así se mantiene la reimportación sin duplicar patas. No se usará service role en la solicitud del cliente.

### Ajustes de conciliación

La conciliación se realizará mediante una operación de base de datos atómica que calcula el saldo actual y crea un movimiento `adjustment` solo si existe diferencia. El tipo será explícito y no una categoría de gasto/ingreso: la presentación usará la etiqueta virtual "Ajuste de saldo / No contabilizado". Esto evita crear categorías artificiales incompatibles con los tipos actuales. Los escritores ordinarios no podrán insertar ni modificar ajustes; informes, presupuestos, divisiones y exportaciones los excluirán explícitamente.

### Presupuestos, cierres y metas

Se extenderá el modelo de presupuesto con modalidad `once`, `monthly` o `annual`, inicio y fin opcional. Los periodos mensuales y anuales se resolverán por calendario natural; el periodo único seguirá siendo solo el mes escogido. Una categoría tendrá una sola modalidad activa y no se permitirán periodos solapados. El valor por defecto será `once`, por lo que las filas mensuales locales actuales conservan semántica de un solo mes sin código de migración especial. La interfaz de alta permitirá elegir la modalidad.

El progreso se calculará sobre las líneas de transacción, respetando divisiones, moneda base y exclusión de ajustes/transferencias. El presupuesto anual conservará su límite autoritativo y mostrará `límite / 12` como referencia mensual; el presupuesto mensual mostrará `límite * 12` como estimación anual. El esperado mensual acumulado hasta hoy sumará presupuestos de meses completos y una fracción redondeada a unidad menor para los días transcurridos del mes actual. La vista anual del presupuesto mensual permitirá planificar un límite excepcional para un mes futuro dentro de la misma modalidad; el importe adicional se compensará equitativamente entre meses completos futuros anteriores al objetivo, sin cambiar meses pasados ni el total anual. También mostrará el gasto mensual medio máximo restante para acabar el año dentro del límite.

Las liquidaciones se guardarán como operaciones virtuales con periodo de origen, destino, importe y una clave única que impida repetir un cierre. Una función transaccional aplicará reallocation, rollover, expiración o sweep; un sweep actualizará el saldo de la meta y su registro de origen en la misma transacción, sin tocar cuentas ni generar transferencias. El historial de cierres permitirá reconstruir los destinos para el análisis de categoría. Solo presupuestos mensuales participarán en el asistente; un cierre parcial debe poder completarse sin duplicar las reglas ya ejecutadas.

La operación diaria del primer día se expondrá en una ruta de servidor que valida `CRON_SECRET` y delega la ejecución a una función de base de datos restringida. La función aplicará reglas de cada usuario con comprobaciones de propiedad y será idempotente. La ruta también deberá devolver errores explícitos; una ejecución fallida no marcará cierres como completados. Las solicitudes iniciadas por una persona autenticada usarán RLS y el mismo dominio de liquidación.

El detalle analítico se añadirá al detalle actual de categoría, conservando sus acciones de edición y borrado. Mostrará objetivo, gasto, restante, histórico de doce meses y distribución de sobrantes. La web usará el sistema de gráficas existente; móvil presentará los mismos datos en una vista compacta.

### Controles multiplataforma

La web mantendrá controles HTML, con fondos, texto, borde y estados explícitos para tema claro/oscuro y pruebas de contraste. El importe se parseará con el helper compartido y emitirá unidades menores, nunca `float`. El selector móvil usará primitivas nativas disponibles (`Modal`, lista filtrable y controles accesibles), sin añadir una dependencia; en web estrecha se usará una hoja/modal equivalente y desde 768 px el desplegable de escritorio.

El selector de fecha compartirá validación y conversión a ISO. El calendario se construirá como componente de interfaz con navegación por mes/año, evitando depender de una fecha de entrada formateada por la zona horaria del dispositivo. Los controles existentes de etiquetas se sustituirán progresivamente en formularios que seleccionan categoría, cuenta, tipo u otra lista equivalente.

## Risks / Trade-offs

- [El encabezado estricto rompe CSV históricos con columnas arbitrarias] → Mostrar `INVALID_CSV_HEADER` con instrucciones y ofrecer la plantilla canónica; la sustitución es intencional.
- [Nombres de cuenta repetidos hacen ambiguo el enrutamiento] → Rechazar solo la fila afectada; no elegir una cuenta arbitrariamente ni ocultar el error con el fallback.
- [Un cierre automático duplicado puede alterar metas o presupuestos] → Guardar un identificador único por origen y destino y ejecutar cambios en una transacción idempotente.
- [Cambios monetarios pueden perder céntimos al prorratear] → Calcular en unidades menores enteras, definir redondeo consistente y conservar el importe original como límite autoritativo.
- [El tipo `adjustment` puede filtrarse en informes existentes] → Actualizar y probar vistas, funciones y consultas de gasto/ingreso antes de habilitar escrituras.
- [El cambio de modelo de presupuesto toca datos y restricciones únicas] → Aplicar migraciones aditivas, asignar modalidad `once` por defecto y verificar RLS/progreso antes de activar la UI nueva.
- [La ejecución programada puede no dispararse o fallar] → Autenticar la ruta, mantener pendientes las operaciones no confirmadas, permitir reintento manual y documentar la configuración del scheduler.
- [Los selectores nativos varían entre navegador y plataforma] → Probar controles en web, iOS y Android; mantener nombres accesibles, foco/teclado y tamaño táctil mínimo.

## Migration Plan

1. Añadir migraciones aditivas de esquema, restricciones, índices, políticas RLS y funciones atómicas para conciliación, transferencias CSV y liquidaciones. Generar SQL desde Drizzle cuando corresponda e inspeccionarlo antes de aplicarlo.
2. Mantener como `once` los presupuestos existentes mediante el valor por defecto; no convertir automáticamente los datos de prueba en recurrencias.
3. Publicar primero validación compartida y funciones de base de datos; después actualizar ruta, exportación, formularios y vistas.
4. Configurar la llamada del scheduler al endpoint del primer día con `CRON_SECRET`, probar idempotencia y reintentos, y verificar políticas RLS con la rutina del proyecto.
5. Validar con pruebas de dominio, typecheck, lint, build web y verificación de RLS antes de habilitar el flujo completo.

Rollback: revertir la aplicación y desactivar el scheduler. Las migraciones son aditivas; no borrar datos de conciliación/liquidación ni intentar retirar el valor enum `adjustment` durante un rollback. Mantener las columnas y tablas nuevas mientras la versión anterior siga desplegada.

## Open Questions

No quedan decisiones de producto bloqueantes. La configuración concreta del scheduler de producción se resolverá en el despliegue, manteniendo el contrato autenticado de la ruta.
