# Spec Delta

## MODIFIED Requirements

### Requirement: Presupuesto mensual por categoría
El sistema SHALL permitir crear un presupuesto para una categoría propia de gasto, con importe positivo (hasta 2 decimales) expresado en la moneda base del perfil y modalidad de periodo único, mensual recurrente o anual recurrente. Un periodo único MUST aplicarse solo al mes elegido; los periodos mensuales MUST seguir el calendario mensual y los anuales MUST abarcar el año natural. La vigencia SHALL admitir fecha inicial y final opcional. Una categoría MUST NOT tener modalidades presupuestarias activas con periodos solapados. Los informes SHALL seguir excluyendo transferencias y ajustes internos y SHALL respetar las reglas existentes de conversión monetaria y movimientos divididos.

#### Scenario: Alta válida
- **WHEN** el usuario presupuesta 300 € para "Alimentación" en septiembre de 2026 como periodo único
- **THEN** el presupuesto aparece para septiembre y no genera un periodo en octubre

#### Scenario: Presupuesto mensual recurrente
- **WHEN** el usuario crea un presupuesto mensual recurrente de 300 € desde septiembre de 2026 sin fecha final
- **THEN** se genera un periodo de 300 € por cada mes natural mientras siga vigente

#### Scenario: Presupuesto anual recurrente
- **WHEN** el usuario crea un presupuesto anual de 3600 € vigente desde 2026
- **THEN** cada periodo anual agrega los gastos de esa categoría entre el 1 de enero y el 31 de diciembre del año correspondiente

#### Scenario: Duplicado
- **WHEN** el usuario intenta crear un segundo presupuesto que se solapa con el periodo ya presupuestado para esa categoría
- **THEN** el sistema rechaza la operación y conserva la modalidad existente

#### Scenario: Categoría de ingresos
- **WHEN** se intenta presupuestar una categoría de ingresos o de otro usuario
- **THEN** el sistema lo rechaza

## ADDED Requirements

### Requirement: Equivalencias, proyección y planificación anual del presupuesto mensual
El sistema SHALL mostrar para un presupuesto anual su equivalente mensual, calculado como el importe anual dividido entre 12 sin alterar el importe guardado. Para un presupuesto mensual recurrente, SHALL mostrar la estimación anual (importe mensual por 12), el gasto real acumulado del año y el presupuesto esperado hasta la fecha. El esperado MUST sumar los meses completos transcurridos y la fracción del presupuesto mensual correspondiente a los días transcurridos del mes actual. En la vista anual, el usuario SHALL poder planificar un límite superior para un mes futuro dentro de esa misma modalidad mensual; el sistema SHALL calcular una reducción igual en los meses completos aún no transcurridos anteriores al mes objetivo, manteniendo el total anual planificado. Los meses pasados MUST NOT modificarse. Si no es posible compensar el aumento dentro del límite anual o no quedan meses anteriores disponibles, el sistema MUST rechazar el plan e indicar la diferencia no cubierta.

La vista anual SHALL comparar el gasto real acumulado con el presupuesto esperado hasta la fecha y mostrar cuánto se debería reducir el gasto mensual medio restante para terminar el año dentro del límite anual. Las cantidades SHALL conservar su precisión en unidades menores enteras; el límite anual original MUST seguir siendo el total autoritativo.

#### Scenario: Equivalente mensual del presupuesto anual
- **WHEN** el usuario consulta un presupuesto anual de 3600 €
- **THEN** ve 300 € como referencia mensual y 3600 € como límite anual

#### Scenario: Estimación anual del presupuesto mensual
- **WHEN** el usuario tiene un presupuesto mensual de 300 €
- **THEN** ve una estimación anual de 3600 €

#### Scenario: Gasto frente al esperado anual hasta la fecha
- **WHEN** han transcurrido dos meses completos y 15 de los 30 días del mes actual en un año no bisiesto, con un presupuesto mensual de 300 €
- **THEN** el esperado acumulado es 750 € y el sistema compara con él el gasto real acumulado del año

#### Scenario: Periodo único sin proyección
- **WHEN** el usuario consulta un presupuesto de un solo mes
- **THEN** el sistema muestra el límite de ese mes sin presentarlo como una recurrencia anual

#### Scenario: Planificar un mes con mayor presupuesto
- **WHEN** el usuario aumenta el límite planificado de un mes futuro dentro de un presupuesto mensual recurrente
- **THEN** el sistema reparte por igual la reducción necesaria entre los meses completos aún no transcurridos anteriores al objetivo y mantiene el total anual planificado

#### Scenario: Plan imposible por límite anual
- **WHEN** el aumento del mes objetivo excede lo que puede compensarse reduciendo los meses disponibles
- **THEN** el sistema no guarda el plan y muestra el importe que excede el límite anual

#### Scenario: Reducir gasto para alcanzar el límite anual
- **WHEN** el gasto real acumulado supera el presupuesto esperado a mitad de año
- **THEN** la vista muestra el promedio máximo que se puede gastar por mes durante el resto del año para terminar dentro del límite anual

### Requirement: Detalle analítico de categoría presupuestada
El sistema SHALL mostrar en el detalle de una categoría el límite activo, gasto del periodo, importe restante y porcentaje consumido. SHALL mostrar los últimos 12 meses con gasto real frente al límite de cada periodo y un desglose de los sobrantes distribuidos por destino. El progreso MUST seguir marcando en riesgo desde el 80 % y superado por encima del 100 %.

#### Scenario: Ver objetivo activo
- **WHEN** el usuario abre una categoría con presupuesto activo
- **THEN** ve el límite, el gasto actual, el restante y el progreso con el estado correspondiente

#### Scenario: Histórico de doce meses
- **WHEN** hay presupuestos y gastos en los últimos 12 meses
- **THEN** el detalle compara el gasto real de cada mes con su límite presupuestado

#### Scenario: Ver distribución de sobrantes
- **WHEN** se han cerrado periodos con sobrantes
- **THEN** el detalle muestra los importes reasignados a metas, arrastrados, traspasados a otras categorías o expirados

### Requirement: Cierre mensual y distribución de sobrantes
El sistema SHALL ofrecer el cierre de un mes natural con presupuestos mensuales pendientes, mostrando para cada categoría el remanente `presupuesto - gasto real`. Para cada remanente positivo, el usuario SHALL poder reasignarlo a una categoría con déficit, aportarlo virtualmente a una meta de ahorro, arrastrarlo al presupuesto del mes siguiente o dejarlo expirar. Las reasignaciones MUST ser movimientos de presupuesto virtuales y MUST NOT crear transferencias bancarias. El usuario SHALL poder guardar una regla automática por categoría; el cierre SHALL aplicar esas reglas el día 1 del mes siguiente sin duplicar operaciones y SHALL permitir completar manualmente los casos sin regla. Los presupuestos anuales MUST NOT liquidarse en este cierre mensual.

#### Scenario: Sugerencia de cierre pendiente
- **WHEN** el usuario abre la aplicación durante un nuevo mes y el mes anterior tiene presupuestos mensuales sin cerrar
- **THEN** el sistema ofrece el asistente de cierre para el mes pendiente

#### Scenario: Reasignar sobrante a una categoría deficitaria
- **WHEN** una categoría tiene remanente positivo y otra categoría tiene déficit en el periodo cerrado
- **THEN** el usuario puede mover virtualmente hasta el importe sobrante al presupuesto de la categoría deficitaria sin crear movimientos bancarios

#### Scenario: Aportar sobrante a una meta
- **WHEN** el usuario elige una meta activa compatible para el sobrante de una categoría
- **THEN** el importe se transfiere virtualmente al saldo de la meta y queda reflejado como destino del sobrante

#### Scenario: Arrastrar o expirar sobrante
- **WHEN** el usuario selecciona rollover o reset para un sobrante
- **THEN** el importe se agrega al presupuesto mensual siguiente o se marca como expirado, respectivamente

#### Scenario: Regla automática idempotente
- **WHEN** el proceso del día 1 se ejecuta más de una vez para la misma categoría y periodo
- **THEN** la regla automática produce una sola liquidación y los casos sin regla siguen pendientes para revisión
