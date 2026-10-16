# Especificaciones Técnicas y Plan de Tareas SDD
## Aplicación de Gestión de Finanzas Personales

Este documento recoge las decisiones de arquitectura de dominio, el modelo de datos y el desglose de tareas técnicas orientadas a **Spec-Driven Development (SDD)** para la implementación iterativa de los nuevos requerimientos.

---

## 1. Decisiones de Arquitectura y Dominio (DDD)

### 1.1. Gestión de Cuentas: Conciliación en lugar de Eliminación
* **Problema:** Forzar la conciliación al céntimo en una app orientada a flujos y presupuestos provoca abandono por fricción (efectivo, descuidos, pagos compartidos). Sin embargo, eliminar las cuentas destruye la utilidad de saber el saldo real acumulado en cada entidad.
* **Decisión:** Mantener la entidad `Account`, pero introducir el concepto de **Ajuste de Saldo (*Reconciliation Adjustment*)**:
  * El usuario puede fijar periódicamente el balance real de una cuenta (ej. "En Efectivo tengo 50 €").
  * El sistema calcula la diferencia entre el saldo calculado y el real, generando una transacción interna de tipo `ADJUSTMENT` atribuida a una categoría comodín (*"Ajuste de Saldo / No contabilizado"*).
* **Transferencias entre cuentas propias:** Se modelan como movimientos de tipo `TRANSFER` (`origin_account_id` $\rightarrow$ `destination_account_id`). No computan como gasto de consumo ni ingreso en los presupuestos mensuales.
* **Columna CSV vs. Selector Previo:**
  * El selector previo sirve como **cuenta por defecto (*fallback*)**.
  * Si el CSV incluye la columna `account` y tiene un valor válido, prevalece sobre el selector. Si viene vacía o no existe, se aplica la cuenta del selector.

### 1.2. Unificación: Presupuestos de Gasto y Metas de Ahorro
* **Presupuesto de Gasto (`CategoryBudget`):** Límite máximo establecido para una categoría de gasto en un periodo dado.
* **Meta de Ahorro (`SavingGoal`):** Hucha virtual acumulativa asociada a un objetivo financiero (ej. "Amortización Hipoteca", "Vacaciones").
* **Cierre de Mes y Sobrantes (*Rollover*):**
  * La transferencia de sobrantes no requiere una transferencia bancaria ficticia; se gestiona como una **reasignación de saldo virtual**.
  * Al cierre del periodo ($Mes_N$), el remanente positivo ($Presupuesto - Gasto Real$) puede:
    1. **Acumularse** (*Rollover*) en la misma categoría para el mes siguiente.
    2. **Desviarse** (*Sweep*) a una Meta de Ahorro (`SavingGoal`).
    3. **Traspasarse** a otra categoría con déficit.
    4. **Expirar** (*Reset* a cero).

---

## 2. Matriz de Épicas y Tareas SDD

| ID | Épica / Tarea | Prioridad | Complejidad |
| :--- | :--- | :--- | :--- |
| **EP-1** | **Pipeline de Importación y Staging CSV** | | |
| T-1.1 | Parser de fichero, validación de cabecera y normalización de signos | Crítica | Baja |
| T-1.2 | Descarga de plantilla CSV de ejemplo | Media | Baja |
| T-1.3 | Tabla de Staging con paginación, edición de categoría y borrado en bloque | Alta | Media |
| **EP-2** | **Presupuestos, Metas y Asistente de Cierre** | | |
| T-2.1 | Modelo de Dominio: Presupuestos recurrentes y Metas de Ahorro | Alta | Alta |
| T-2.2 | Visualización analítica en detalle de categoría (Histórico y Objetivos) | Media | Media |
| T-2.3 | Asistente de cierre de mes y reglas automáticas de sobrante (*Rollover*) | Alta | Alta |
| **EP-3** | **Sistema de Diseño y Componentes de Entrada (Inputs)** | | |
| T-3.1 | Corrección de contraste y accesibilidad en componentes Select | Crítica | Baja |
| T-3.2 | Componente Numeric/Currency Input con validación estricta en tiempo real | Alta | Baja |
| T-3.3 | Componente Híbrido DatePicker (Input manual con máscara + Popover) | Media | Media |
| **EP-4** | **Optimización Mobile** | | |
| T-4.1 | Sustitución de Selectores por Tags por Bottom Sheet / Selects compactos | Alta | Media |

---

## 3. Especificaciones Detalladas por Tarea

```
======================================================================
TAREA T-1.1: Parser de fichero, validación de cabecera y regla de signos
======================================================================
```
### Objetivo
Normalizar la ingesta de archivos CSV garantizando la coherencia de los importes según el tipo de transacción y eliminando la ambigüedad en la cabecera.

### Especificación Funcional y Técnica
1. **Cabecera Obligatoria:**
   * La primera línea del archivo debe contener estrictamente las columnas esperadas (insensible a mayúsculas/minúsculas):
     `date,amount,type,category,account,description`
   * Si la cabecera no coincide o falta una columna obligatoria (`date`, `amount`, `type`), el parser rechaza el fichero con error: `INVALID_CSV_HEADER`.
2. **Normalización del Signo del Importe:**
   * La app ya no dependerá de que el usuario escriba signos negativos en el CSV.
   * Regla de transformación:
     $$\text{amount\_normalized} = \begin{cases} -|\text{amount}| & \text{si } \text{type} = \text{EXPENSE} \\ +|\text{amount}| & \text{si } \text{type} = \text{INCOME} \\ \text{amount} & \text{si } \text{type} = \text{TRANSFER} \end{cases}$$
3. **Mapeo de Cuenta:**
   * Si la fila no contiene valor en la columna `account`, asignar el `fallback_account_id` enviado en el contexto del modal.

### Casos de Prueba (Gherkin)
```gherkin
Escenario: Normalización de gasto con importe positivo en CSV
  Dado que el usuario sube un CSV con la fila: "2026-10-15,45.50,EXPENSE,Restaurante,Cuenta Principal,Cena"
  Cuando el parser procesa la fila
  Entonces el importe normalizado debe ser -45.50
  Y el tipo de transacción debe ser EXPENSE

Escenario: Fichero sin cabecera válida
  Dado que el usuario sube un fichero donde la primera fila son datos directos sin nombres de columna
  Cuando se inicia el parseo
  Entonces el proceso se cancela con código de error "INVALID_CSV_HEADER"
```

---

```
======================================================================
TAREA T-1.2: Descarga de plantilla CSV
======================================================================
```
### Objetivo
Proveer un archivo CSV modelo para que el usuario conozca la estructura esperada de importación.

### Especificación Técnica
* **UI:** Botón secundario en el modal de importación: *"Descargar plantilla CSV"*.
* **Contenido estático generado (`template.csv`):**
```csv
date,amount,type,category,account,description
2026-10-01,1500.00,INCOME,Nómina,Cuenta Nómina,Salario mensual
2026-10-02,45.20,EXPENSE,Supermercado,Tarjeta Débito,Compra semanal
2026-10-05,12.00,EXPENSE,Transporte,Efectivo,Billete de metro
```

---

```
======================================================================
TAREA T-1.3: Tabla de Staging con Paginación y Edición
======================================================================
```
### Objetivo
Proporcionar una pantalla intermedia de revisión de movimientos antes de guardarlos definitivamente en base de datos.

### Especificación de UI / Estado
1. **Paginación:** Configurable a 10, 25 o 50 filas por página (procesamiento en memoria del cliente antes de enviar el lote).
2. **Edición de Categoría en Fila:**
   * Cada celda de categoría muestra un `<Select>`.
   * Si el valor del CSV coincide con un nombre de categoría existente, se preselecciona automáticamente.
   * Si no existe o viene en blanco, el `<Select>` queda vacío con estado de advertencia visual.
   * El usuario puede cambiar la categoría en cualquier momento.
3. **Selección Múltiple y Borrado:**
   * Checkbox en la cabecera para "Seleccionar todas las filas de la página / del archivo".
   * Checkbox individual por fila.
   * Botón de acción: *"Eliminar seleccionados ($n$)"*.
   * Botón de borrado directo por fila (icono papelera).
4. **Confirmación:**
   * Botón *"Confirmar e Importar ($n$ filas válidas)"* que envía la carga final a la API (`POST /api/v1/transactions/batch`).

---

```
======================================================================
TAREA T-2.1: Modelo de Presupuestos y Metas
======================================================================
```
### Objetivo
Soportar límites presupuestarios por categoría y metas de ahorro con recurrencia y vigencia.

### Esquema Relacional de Referencia
```
+-----------------------------------+        +-----------------------------------+
|              Budget               |        |            SavingGoal             |
+-----------------------------------+        +-----------------------------------+
| id: UUID (PK)                     |        | id: UUID (PK)                     |
| category_id: UUID (FK)            |        | name: VARCHAR(100)                |
| amount_limit: DECIMAL(12,2)       |        | target_amount: DECIMAL(12,2)      |
| period: ENUM('MONTHLY', 'ANNUAL') |        | current_balance: DECIMAL(12,2)    |
| starts_at: DATE                   |        | target_date: DATE (NULLABLE)      |
| ends_at: DATE (NULLABLE)          |        | status: ENUM('ACTIVE','ACHIEVED') |
| rollover_mode: ENUM(              |        +-----------------------------------+
|   'RESET',                        |
|   'ROLLOVER_CATEGORY',            |
|   'SWEEP_TO_GOAL'                 |
| )                                 |
| target_goal_id: UUID (FK, NULL)   |
+-----------------------------------+
```

### Reglas de Negocio
* Si `ends_at` es nulo, el presupuesto se renueva indefinidamente cada mes/año.
* Las transacciones con fecha comprendida en el periodo activo y asociadas a `category_id` se agregan para calcular el consumo:
  $$\text{spent} = \sum |\text{transaction.amount}| \quad \text{donde } \text{type} = \text{EXPENSE}$$
  $$\% \text{ Progreso} = \left(\frac{\text{spent}}{\text{amount\_limit}}\right) \times 100$$

---

```
======================================================================
TAREA T-2.2: Vista Detalle de Categoría y Gráficas
======================================================================
```
### Objetivo
Exponer métricas de cumplimiento histórico de objetivos en la vista detallada de cada categoría (`/categories/:id`).

### Especificación de Vista
1. **Panel Superior:** Tarjeta de objetivo activo (Límite presupuestado, consumido actual, restante y barra de progreso de color semafórico: verde $<80\%$, amarillo $80-100\%$, rojo $>100\%$).
2. **Gráfico Histórico Mes a Mes (Últimos 12 meses):**
   * Tipo: Gráfico de barras combinadas con línea de corte.
   * Barra: Gasto real ejecutado en el mes.
   * Línea de referencia: Límite presupuestado para ese periodo.
3. **Distribución de Sobrantes:** Desglose acumulado de sobrantes generados y hacia qué destinos se han enviado (ahorro, arrastre o absorción por desfase).

---

```
======================================================================
TAREA T-2.3: Asistente y Automatización de Cierre Mensual
======================================================================
```
### Objetivo
Permitir la liquidación de remanentes presupuestarios entre categorías y metas de ahorro al concluir un mes natural.

### Especificación Funcional
1. **Detección de Cierre:** Al iniciar sesión en el primer acceso del mes $M$, si el mes $M-1$ tiene presupuestos activos sin cerrar, se sugiere el asistente *"Cierre de Mes"*.
2. **Flujo del Asistente:**
   * Lista todas las categorías con presupuesto del mes cerrado indicando el remanente:
     $$\Delta = \text{Presupuesto} - \text{Gasto Real}$$
   * Por cada categoría con sobrante ($\Delta > 0$):
     * [Opción A] Traspasar a una categoría en negativo ($\Delta < 0$).
     * [Opción B] Asignar a una Meta de Ahorro (`SavingGoal`).
     * [Opción C] Acumular al presupuesto del mes actual (`rollover`).
   * Checkbox opcional: *"Aplicar siempre esta regla para esta categoría (Automático)"*.
3. **Ejecución Automática:** Las categorías con regla predefinida guardada en `Budget.rollover_mode` se liquidan automáticamente en segundo plano el día 1 de cada mes sin necesidad de intervención manual.

---

```
======================================================================
TAREA T-3.1: Corrección de Contraste en Selects
======================================================================
```
### Objetivo
Corregir el defecto de legibilidad (texto blanco sobre fondo blanco) en los componentes de menú desplegable.

### Especificación Técnica
* **Root Cause:** El contenedor flotante del menú desplegable está perdiendo la clase de fondo del tema o heredando `color: white` en un fondo claro (`bg-white`).
* **Fix en Clases/Tokens CSS (Tailwind):**
```tsx
// Menú contenedor
className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg rounded-md"

// Items de la lista
className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
```
* **Criterio de Aceptación:** Contraste mínimo WCAG AA ($4.5:1$) verificado tanto en tema claro como oscuro en los componentes `<select>`, dropdowns personalizados y menús de staging.

---

```
======================================================================
TAREA T-3.2: Componente Input Numérico Estricto
======================================================================
```
### Objetivo
Impedir caracteres no numéricos durante la escritura del usuario (en vivo), no solo tras el evento de guardado.

### Especificación Técnica
* **Nombre de componente:** `<CurrencyInput />` o `<StrictNumberInput />`.
* **Comportamiento en Entrada (`onKeyDown` / `beforeInput`):**
  * Bloquear cualquier tecla que no sea dígito (`0-9`), tecla de control (`Backspace`, `Tab`, `ArrowLeft`, `ArrowRight`, `Delete`), o el separador decimal (`,`, `.`).
  * Solo se permite **un único** separador decimal.
* **Formateo en pérdida de foco (`onBlur`):**
  * Normalizar al formato local estándar (ej. `1.250,50 €`).
* **Valor interno:** Emite siempre un número primitivo de JavaScript (`float`) o `null` si está vacío.

---

```
======================================================================
TAREA T-3.3: Componente Híbrido DatePicker
======================================================================
```
### Objetivo
Facilitar la introducción rápida de fechas tanto por teclado directo como por selección visual en calendario.

### Especificación Técnica
* **Nombre de componente:** `<DatePicker />`.
* **Capacidades:**
  * **Input Manual con Máscara:** Permite escribir en formato `DD/MM/YYYY`. Valida que el día sea válido según el mes y año (ej. rechaza `31/02/2026`).
  * **Botón de Calendario:** Icono integrado a la derecha del campo que abre un Popover interactivo con el mes actual, navegación rápida de años/meses y selector de día.
  * Sincronización bidireccional inmediata: teclear en el input actualiza el calendario; pulsar en el calendario rellena el input y cierra el popover.

---

```
======================================================================
TAREA T-4.1: Optimización de Selectores en Mobile
======================================================================
```
### Objetivo
Eliminar la saturación de pantalla provocada por listas densas de badges/tags en dispositivos con pantalla reducida.

### Especificación de UX Responsiva
1. **Breakpoints:**
   * Dispositivos móviles (`< 768px`):
     * En lugar de mostrar todos los tags visibles, el campo se renderiza como un **botón selector compacto** mostrando únicamente el valor actual seleccionado o un placeholder:
       `[ Icono Categoría | "Restaurantes" | Chevron v ]`
     * Al pulsar, se despliega un **Bottom Sheet (Cajón inferior modal)** con:
       * Campo de búsqueda/filtrado en tiempo real.
       * Lista vertical de opciones con área táctil mínima de 44px de altura.
   * Dispositivos de escritorio (`>= 768px`):
     * Mantiene selector desplegable estándar con dropdown optimizado.