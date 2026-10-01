# Spec Delta

## Purpose

Permite trabajar con cuentas en varias monedas mostrando totales coherentes en la moneda base del usuario.

## ADDED Requirements

### Requirement: Tipos de cambio
El sistema SHALL guardar tipos de cambio diarios con base EUR para las monedas publicadas por el BCE (USD, GBP, CHF, MXN). Una ruta de servidor protegida con un secreto SHALL descargarlos y guardarlos; sin el secreto correcto MUST responder 401 y sin secreto configurado 503. Los usuarios autenticados SHALL poder leerlos pero no modificarlos.

#### Scenario: Actualización autorizada
- **WHEN** el job llama a la ruta con el secreto correcto
- **THEN** se guardan los tipos del día sin duplicar fechas existentes

#### Scenario: Sin autorización
- **WHEN** se llama a la ruta sin el secreto
- **THEN** responde 401 y no se guarda nada

### Requirement: Conversión a moneda base
Los totales mensuales, el gasto por categoría, el progreso de presupuestos y el patrimonio SHALL convertir cada importe a la moneda base con el tipo de su fecha o, si no existe, el más cercano disponible. Los importes en monedas sin tipo disponible MUST excluirse y el panel MUST indicar qué monedas faltan.

#### Scenario: Gasto en dólares
- **WHEN** el usuario con base EUR gasta 11 USD y el tipo es 1,10 USD/EUR
- **THEN** los informes cuentan 10 € de gasto

#### Scenario: Moneda sin tipo
- **WHEN** tiene una cuenta en ARS
- **THEN** el panel muestra "Sin tipo de cambio para: ARS" y el patrimonio no incluye esa cuenta

### Requirement: Transferencias entre monedas
El sistema SHALL permitir transferir entre cuentas de distinta moneda indicando el importe recibido en la moneda destino. Si falta, MUST mostrarse "Indica el importe recibido en la moneda destino".

#### Scenario: Transferencia EUR→USD
- **WHEN** transfiere 100 € a una cuenta en USD indicando 108 US$ recibidos
- **THEN** la cuenta origen baja 100 € y la destino sube 108 US$
