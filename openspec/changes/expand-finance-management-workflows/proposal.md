# Proposal

## Why

El documento SDD propone completar flujos financieros que hoy son parciales o no existen: la importación actual no puede revisar ni enrutar filas con precisión, los presupuestos son solo mensuales y las interfaces carecen de controles de entrada y selectores adecuados. Formalizar estos cambios en OpenSpec permite implementarlos respetando los contratos existentes de privacidad, transferencias, divisiones y precisión monetaria.

## What Changes

- **BREAKING** Sustituir la importación CSV con mapeo libre por un formato con cabecera definida, normalización según `type`, revisión paginada y editable, descarga de plantilla y detección de duplicados.
- Admitir transferencias CSV mediante cuentas origen y destino propias; rechazar filas con cuentas desconocidas o ambiguas y transferencias entre monedas distintas.
- Añadir conciliación de saldo de cuenta mediante ajustes internos que no se contabilicen como gasto ni ingreso.
- Ampliar presupuestos a periodos únicos, mensuales y anuales; mostrar equivalencias y proyecciones acumuladas, además del histórico y el cierre mensual con reasignación, rollover, sweep a metas y reglas automáticas.
- Incorporar controles de formulario accesibles: selección con contraste legible, importe numérico validado y fecha manual con calendario; sustituir selectores móviles tipo etiquetas por un selector compacto con hoja inferior y búsqueda.

## Capabilities

### New Capabilities

- `form-inputs`: comportamiento accesible y multiplataforma de los controles de selección, importe y fecha.

### Modified Capabilities

- `accounts`: conciliación del saldo con ajustes internos.
- `transactions`: formato y revisión de importación CSV, transferencia por CSV y tratamiento de ajustes.
- `budgets`: periodos únicos y recurrencias mensuales/anuales, equivalencias y proyecciones, detalle analítico y cierre con distribución de sobrantes.
- `savings-goals`: recepción de sobrantes de presupuestos como aportaciones atómicas.

## Impact

Afecta a `packages/shared` (parseo, validación y lógica de dominio), `packages/db` (esquema, funciones y migraciones con RLS), las vistas y acciones de `apps/web`, y los formularios de `apps/mobile`. La importación se mantiene limitada a 1000 filas y las cantidades siguen expresándose en unidades menores enteras. El contrato CSV añade `destination_account`, obligatorio en filas `TRANSFER`; dichas filas se limitan a cuentas de la misma moneda. Las reglas automáticas de cierre requieren ejecución autenticada del lado servidor. No se añaden dependencias ni un servidor propio.
