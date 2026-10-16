# Spec Delta

## ADDED Requirements

### Requirement: Ajustes internos de conciliación
El sistema SHALL admitir movimientos internos de tipo ajuste, creados únicamente por la conciliación de una cuenta. Un ajuste MUST tener cuenta propia, importe distinto de cero en unidades menores enteras y fecha; MUST NOT tener categoría, dividirse, editarse ni borrarse como un movimiento ordinario. SHALL afectar el saldo de la cuenta y MUST NOT incluirse en gasto, ingreso, presupuestos, informes de categorías ni exportaciones de movimientos ordinarios. En los listados SHALL identificarse como "Ajuste de saldo / No contabilizado".

#### Scenario: Ajuste positivo
- **WHEN** una conciliación crea un ajuste positivo de 30 € en una cuenta
- **THEN** el saldo de esa cuenta aumenta 30 € y el movimiento se identifica como ajuste no contabilizado

#### Scenario: Ajuste no editable por el usuario
- **WHEN** el usuario intenta cambiar o borrar directamente un ajuste interno
- **THEN** el sistema rechaza la operación sin cambiar el saldo

#### Scenario: Ajuste fuera de informes
- **WHEN** el sistema calcula gastos o ingresos por categoría
- **THEN** excluye los movimientos de tipo ajuste

## MODIFIED Requirements

### Requirement: Importación de CSV
El sistema SHALL permitir importar hasta 1000 filas desde un CSV de hasta 1 MB con cabecera válida. La cabecera MUST incluir exactamente una vez `date`, `amount`, `type`, `category`, `account` y `description`, sin distinguir mayúsculas/minúsculas y en cualquier orden; MUST NOT contener columnas desconocidas. `destination_account` MAY aparecer como columna adicional y MUST contener una cuenta válida en las filas `TRANSFER`. Si falta la cabecera o una columna requerida, el sistema MUST rechazar el archivo con `INVALID_CSV_HEADER`.

El campo `type` MUST ser `EXPENSE`, `INCOME` o `TRANSFER`, sin distinguir mayúsculas/minúsculas. Para `EXPENSE`, el importe SHALL normalizarse a `-|amount|`; para `INCOME`, a `+|amount|`; para `TRANSFER`, el importe SHALL ser una magnitud positiva sin conversión de signo. Los importes MUST convertirse a unidades menores enteras sin pérdida de precisión. Las filas de transferencia MUST identificar una cuenta origen en `account` y una cuenta destino en `destination_account`; ambas MUST ser propias, activas y de la misma moneda. Las transferencias entre monedas distintas MUST rechazarse en la vista previa.

El usuario SHALL elegir una cuenta predeterminada para las filas cuyo campo `account` esté vacío. Si el campo contiene un nombre, el sistema MUST resolverlo a una única cuenta propia activa, sin distinguir mayúsculas/minúsculas; MUST marcar como error la fila si no hay coincidencia única. El destino de una transferencia MUST resolverse del mismo modo, sin aplicar la cuenta predeterminada. Las categorías se SHALL resolver por nombre y tipo entre las categorías del usuario; una categoría vacía o no reconocida MUST quedar sin asignar y mostrarse con advertencia, pero no invalidará por sí sola la fila.

Antes de confirmar, el sistema SHALL mostrar una vista de staging editable con errores por fila, selección y borrado individual o múltiple, y paginación local de 10, 25 o 50 filas. El usuario SHALL poder cambiar la categoría de cada fila y seleccionar todas las filas de la página o del archivo. La confirmación SHALL enviar únicamente filas válidas y no eliminadas a `POST /api/v1/transactions/batch`; MUST indicar el número de filas importables. Las patas de cada transferencia MUST crearse de forma atómica. Las filas duplicadas SHALL omitirse y contabilizarse en el resultado; un fallo MUST mostrarse explícitamente y MUST NOT anunciar éxito para filas no creadas.

El sistema SHALL ofrecer una plantilla CSV descargable con la cabecera canónica y ejemplos de ingreso, gasto y transferencia. La exportación CSV de movimientos ordinarios SHALL conservar un formato que el importador pueda volver a leer; cada transferencia MUST exportarse una sola vez con sus cuentas origen y destino, y los ajustes internos MUST excluirse.

#### Scenario: Normalización de gasto con importe positivo
- **WHEN** el usuario importa una fila válida `2026-10-15,45.50,EXPENSE,Restaurante,Cuenta Principal,Cena`
- **THEN** la vista previa muestra un gasto de -45,50 € y la importación conserva el tipo `EXPENSE`

#### Scenario: Normalización de ingreso con importe negativo
- **WHEN** el usuario importa una fila válida de tipo `INCOME` con importe -45.50
- **THEN** la vista previa muestra un ingreso de +45,50 €

#### Scenario: Importación correcta
- **WHEN** el usuario importa tres filas válidas con la cabecera canónica y confirma el lote
- **THEN** se crean tres movimientos y el resultado informa "3 movimientos importados"

#### Scenario: Filas con errores
- **WHEN** una fila contiene una fecha inválida
- **THEN** la vista previa muestra el error de fecha y esa fila no se importa

#### Scenario: Cabecera inválida
- **WHEN** el archivo no incluye todos los nombres de columna requeridos o contiene una columna desconocida
- **THEN** el sistema rechaza el archivo con `INVALID_CSV_HEADER` antes de procesar sus filas

#### Scenario: Cuenta de origen vacía
- **WHEN** una fila de gasto tiene vacío el campo `account` y el usuario seleccionó una cuenta predeterminada
- **THEN** la fila se asigna a esa cuenta predeterminada

#### Scenario: Cuenta desconocida o ambigua
- **WHEN** una fila contiene un nombre de cuenta que no coincide con exactamente una cuenta propia activa
- **THEN** la vista previa marca esa fila como error y no la asigna a la cuenta predeterminada

#### Scenario: Transferencia CSV entre cuentas propias
- **WHEN** una fila `TRANSFER` indica cuentas origen y destino propias, activas y de la misma moneda, con importe positivo
- **THEN** se crean atómicamente las dos patas de la transferencia y no se contabiliza gasto ni ingreso

#### Scenario: Transferencia entre monedas distintas
- **WHEN** la cuenta origen y destino de una fila `TRANSFER` usan monedas distintas
- **THEN** la vista previa rechaza la fila e indica que la importación CSV solo admite transferencias en una moneda

#### Scenario: Revisión y borrado de staging
- **WHEN** el usuario revisa un archivo con más de 50 filas, cambia una categoría y elimina filas seleccionadas
- **THEN** puede paginar el staging, conservar los cambios y confirmar solo las filas válidas que no eliminó

#### Scenario: Duplicados
- **WHEN** el usuario vuelve a importar filas que ya existen en la misma cuenta o transferencia
- **THEN** no se duplican y el resultado informa cuántas filas fueron omitidas

#### Scenario: Re-importar una exportación
- **WHEN** el usuario importa un CSV de movimientos exportado por la aplicación
- **THEN** la cabecera se acepta y cada movimiento ordinario o transferencia se reconstruye una sola vez
