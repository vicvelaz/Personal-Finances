# Tasks

## 1. Contratos de dominio compartido

- [x] 1.1 Sustituir el mapeo CSV libre por validación de cabecera canónica, resolución de `type` y normalización exacta de importes; añadir pruebas para orden/capitalización, columnas ausentes o extra, importes y errores `INVALID_CSV_HEADER`, verificadas con `pnpm --filter @fin/shared test`.
- [x] 1.2 Modelar en `@fin/shared` los periodos `once`, `monthly` y `annual`, la exclusión de periodos solapados, la prorrata anual mensual y el cálculo de planes con límite anual; cubrirlo con pruebas de un mes, año bisiesto, distribución por meses futuros y presupuesto restante.
- [x] 1.3 Añadir validación y conversión compartidas para importe positivo estricto y fecha manual `DD/MM/YYYY` a ISO; documentar las APIs en `packages/shared/src/README.md` y probar escritura/pega inválidas, separador repetido, unidades menores, fechas inexistentes y cambios de mes/año.

## 2. Persistencia y operaciones atómicas

- [x] 2.1 Extender Drizzle y crear una migración aditiva para ajustes internos, modalidades y vigencias presupuestarias, planes mensuales y registros idempotentes de cierre; documentar el cambio en `packages/db/README.md`, mantener los presupuestos existentes como `once`, generar SQL y revisar que no se modifiquen migraciones ya aplicadas.
- [ ] 2.2 Añadir políticas/funciones de base de datos para que solo la conciliación pueda crear ajustes y para aplicar cierres, reasignaciones, rollover y sweep a metas atómicamente; probar propiedad, idempotencia, fallos sin cambios parciales y ejecutar `pnpm db:verify-rls`.

## 3. Conciliación de cuentas

- [x] 3.1 Añadir en web y móvil el flujo para consultar el saldo real y conciliarlo mediante la operación protegida; probar diferencias positivas, negativas, cero y cuenta ajena, y confirmar que la interfaz conserva las acciones actuales de cuenta.
- [x] 3.2 Excluir ajustes de los cálculos de gasto/ingreso, presupuestos, divisiones y exportaciones ordinarias, etiquetarlos en el historial y actualizar `docs/architecture.md`; verificar saldo, informes y listado con un ajuste de cada signo.

## 4. Importación CSV revisable

- [ ] 4.1 Actualizar el staging web con cabecera estricta, cuenta predeterminada, mapeo de cuentas/categorías, paginación de 10/25/50, edición de categoría, selección/borrado y plantilla descargable; validar manualmente límites, errores por fila y recuento de filas válidas.
- [ ] 4.2 Implementar `POST /api/v1/transactions/batch` con sesión autenticada y RLS; probar gastos/ingresos normalizados, cuentas desconocidas o ambiguas, destinos no válidos, rechazo de transferencias entre monedas, duplicados y atomicidad de las dos patas.
- [ ] 4.3 Alinear la exportación CSV con la cabecera canónica, exportar transferencias una sola vez y omitir ajustes; probar el ciclo exportar-importar y actualizar `docs/architecture.md` sobre el contrato CSV y sus exclusiones.

## 5. Presupuestos y análisis

- [ ] 5.1 Actualizar alta, edición y progreso de presupuestos en web y móvil para periodo único, mensual o anual, fechas de vigencia y exclusión de modalidades solapadas; probar unicidad, conversión de moneda y preservación del comportamiento de periodo único.
- [ ] 5.2 Añadir equivalencias y proyecciones anual/mensual, distribución de límites para un mes futuro dentro del total anual, gasto real acumulado y reducción media necesaria para el resto del año; probar prorrata, redondeo en unidades menores y rechazo de planes que excedan el límite.
- [ ] 5.3 Ampliar el detalle de categoría con estado del presupuesto, gráfico de doce meses y distribución de sobrantes sin quitar edición/borrado; actualizar `docs/architecture.md` y verificar datos vacíos, presupuestos superados y equivalencia de cifras entre web y móvil.

## 6. Cierre mensual y metas

- [ ] 6.1 Conectar los destinos virtuales del cierre con el saldo de metas activas en una sola operación; probar meta ajena/archivada, moneda incompatible, reintento idempotente y ausencia de movimientos bancarios.
- [ ] 6.2 Implementar el asistente de cierre para presupuestos mensuales con reasignación, sweep, rollover, reset y reglas por categoría; probar periodos sin cerrar, cierre parcial, límites de remanente y reanudación sin duplicados en web y móvil.
- [ ] 6.3 Añadir la ruta programada protegida por `CRON_SECRET` para ejecutar reglas vencidas el día 1, documentar la configuración del scheduler en `docs/development.md` y probar autorización, reintento, errores explícitos e idempotencia.

## 7. Controles accesibles y móviles

- [ ] 7.1 Corregir estilos de selectores web en tema claro/oscuro y estados de foco/selección/error; verificar contraste de texto normal de al menos 4.5:1 y navegación por teclado.
- [ ] 7.2 Incorporar controles de importe y fecha en los formularios compatibles de ambas apps sin cambiar los campos que admiten importes negativos; probar formato local, valor entero menor, máscara `DD/MM/YYYY`, calendario, teclado y fecha ISO.
- [ ] 7.3 Reemplazar selectores móviles tipo etiquetas por control compacto con búsqueda y hoja inferior en vistas menores de 768 px; comprobar lector accesible, filtrado, cierre tras seleccionar y altura táctil mínima de 44 px, conservando el desplegable de escritorio desde 768 px.

## 8. Integración

- [ ] 8.1 Ejecutar `pnpm test`, `pnpm typecheck`, `pnpm lint`, build de web y `pnpm db:verify-rls`; completar un recorrido de conciliación, importación CSV, planificación presupuestaria y cierre, y resolver cualquier regresión entre web y móvil.
