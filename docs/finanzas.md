# Reglas financieras

## Importes y fechas

PostgreSQL almacena dinero en `numeric(14,2)`, cantidades en `numeric(14,3)` y costo promedio en `numeric(14,4)`. Los importes recibidos deben tener hasta dos decimales; el servidor rechaza redondeos implícitos. Los cálculos derivados usan `round(...,2)` (mitades alejadas de cero); Decimal.js usa HALF_UP. El descuento de una venta se distribuye proporcionalmente y la última línea recibe el residuo, para conservar el total exacto.

Los instantes se almacenan como `timestamptz`; fechas de vigencia/vencimiento como `date`. Los formularios convierten fecha/hora local con la zona IANA de la academia y rechazan horarios ambiguos. Períodos, asistencia semanal y cobros recurrentes se evalúan en esa zona.

## Fórmulas

| Magnitud | Fórmula |
|---|---|
| Saldo de cargo | Original + ajustes − aplicaciones confirmadas + reembolsos aplicados |
| Deuda | Suma de saldos positivos de cargos emitidos |
| Deuda vencida | Saldo positivo cuyo vencimiento ya pasó; asistencia aplica además días de gracia |
| Anticipo disponible | Pago confirmado − aplicaciones − reembolsos de su importe sin aplicar |
| Saldo de cuenta | Suma de movimientos firmados, incluidos fondo/aportes/ajustes explícitos |
| Caja esperada | Fondo registrado + movimientos del turno |
| Diferencia | Contado − esperado |
| Obligación pendiente | Importe original + ajustes − pagos de la obligación + dinero devuelto por proveedor |
| Precio neto de venta | Suma de líneas recalculadas − descuento autorizado |
| Costo promedio tras entrada | (Cantidad anterior × costo anterior + entrada × costo entrada) / nueva cantidad |
| Margen de productos | Venta neta después de devoluciones − costo histórico de unidades vendidas no devueltas |
| Resultado operativo administrativo | Cargos de servicios + ajustes de servicios + margen de productos − obligaciones operativas/recurrentes/personal − comisiones de medios de pago |

Cobros, cargos emitidos, ventas y resultado operativo son indicadores distintos. Cobros se agrupan por fecha de registro de pagos confirmados; las transferencias pendientes todavía no afectan saldo de cuenta ni deuda. El resultado es administrativo por devengo: incluye servicios facturados aunque no se hayan cobrado y gastos incurridos aunque no estén pagados. No representa un cálculo tributario ni legal.

Las transferencias internas producen dos movimientos atómicos que suman cero; los aportes/retiros del propietario se distinguen del ingreso operativo. Una compra de inventario es obligación y entrada de existencias; su importe completo no vuelve a descontarse como gasto al reconocer el costo vendido. El reporte de margen conserva el costo de cada línea; las devoluciones ajustan sus unidades. Los reportes históricos de venta reflejan devoluciones posteriores sobre la venta de origen.

## Recurrencia y condiciones

Aniversario conserva el día inicial y lo limita al último día del mes. El siguiente mes recupera el día ancla, incluidos años bisiestos. Fecha fija usa `fixed_day`. Los planes recurrentes admiten 1, 3, 6 y 12 meses. Paquetes/visitas usan su vigencia y cantidad configuradas.

Prorrateo de primera mensualidad fija: precio × días entre ingreso y primer cobro fijo / días del intervalo mensual o multimensual configurado, redondeado a dos decimales. Se puede desactivar. Congelamiento omite períodos o extiende vigencia según regla configurada; cancelación inmediata o al fin de período queda registrada. La reactivación y el cambio de plan dejan eventos. Cambiar de plan emite el nuevo cargo y conserva el anterior; un crédito por período no usado exige un ajuste autorizado.

Las tarifas se seleccionan por vigencia al generar cada nuevo período. El cargo original conserva su importe. Becas/descuentos se registran con autorización: una beca total puede dejar el cargo original y reducirlo a cero mediante ajuste, preservando evidencia.

## Transacciones y concurrencia

`operate` ejecuta una transacción de PostgreSQL. Una clave UUID guarda acción, datos y resultado. Repetirla devuelve el resultado; reutilizarla con otros datos se rechaza. Cargos de período, numeración, actividades y consumos tienen restricciones únicas. Se bloquean filas de cargos, cuentas, existencias, clases y condiciones de pago. La aplicación rechaza pagos superiores a deuda disponible, reembolsos superiores a lo cobrable y stock negativo. Las transferencias pendientes reservan su aplicación para evitar prometer el mismo saldo a otro pago.

Pagos, ventas, devoluciones, transferencias y pagos de liquidaciones no admiten escritura directa del cliente. No se borra información financiera confirmada. Un cierre con diferencia se aprueba mediante movimiento de ajuste separado y auditado. El ajuste no cambia silenciosamente la sesión cerrada.

## Remuneraciones

Cada actividad conserva su condición histórica. Hora/clase: unidades × tarifa; venta/privada: base neta × porcentaje; anticipo: importe negativo; ajuste: importe aprobado. Comisión de venta por devengo en venta usa su total neto; por cobro usa lo aplicado y confirmado. Una devolución revierte la proporción del devengo correspondiente. Los descuentos reducen la base. La actividad automática por clase y las bases privadas requieren aprobación antes de liquidarse.

Liquidación = fijo vigente en la fecha inicial del período + actividades aprobadas aún no liquidadas del período. El fijo es un importe configurado por período; no se calculan prestaciones ni prorrateos laborales de un país por inferencia. Se rechazan períodos solapados y reutilizar actividades. Aprobar crea/habilita la obligación existente; pagarla registra una sola salida y marca la liquidación pagada cuando se cubre el total.
