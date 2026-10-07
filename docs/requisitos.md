# Matriz de requisitos

Estados: **implementado** significa que existe el flujo conectado a persistencia y autorización; **probado** agrega una verificación ejecutada y descrita; **bloqueado** identifica una dependencia externa que impide verificar o activar el flujo. Las pruebas locales no equivalen a validación de producción. La solicitud completa está en [requisitos-originales.md](requisitos-originales.md).

| Área | Entrega | Estado | Verificación o límite |
|---|---|---|---|
| Arquitectura | Next App Router, TypeScript estricto, Tailwind, Zod, once dominios, lockfile | Probado | Tipos, lint y build |
| Academias y sucursales | Academia en entidades, FK compuestas, identidad interna y selección de sucursal | Probado | Instalación, RLS y llamadas directas entre dos academias |
| Autorización | Roles combinables, sucursales permitidas, usuario activo, permisos de servidor y DB | Probado | Rechazos directos y pérdida de acceso con la misma identidad |
| Roles y usuarios | Crear/editar roles, impedir autoasignación y edición del propio rol; activar/desactivar usuarios | Probado | Pruebas de autorización; invitación externa pendiente |
| Primer propietario | Consola Admin Auth y función exclusiva de service_role; sin contraseña predeterminada | Bloqueado | Falta clave secreta local para enviar invitación real |
| Auth | Login, logout, callback PKCE, recuperación, definición de contraseña | Implementado | Navegación probada con Auth simulado; servicio real pendiente |
| Seguridad | RLS, vistas invoker, operaciones protegidas, historial inmutable al cliente | Probado | Pruebas SQL y asesor de seguridad remoto sin observaciones |
| Storage | Bucket privado, tamaños/tipos, comprobación del contenido, documentos y enlaces temporales | Implementado | Aislamiento SQL probado; transporte alojado pendiente |
| Diseño | Español, marca configurable, escritorio/móvil, teclado, etiquetas, filtros, paginación y errores | Probado | Recorridos y capturas de navegador; no auditoría integral de accesibilidad |
| Panel | Cobros por concepto, cargos, deuda, dinero, gastos, ventas/margen y resultado separados | Probado | Consultas y visualización de datos persistidos; enlaces a detalle |
| Panel operativo | Comunidad, vencimientos, clases, stock bajo, aprobaciones y diferencias | Implementado | Fuentes reales con permisos; no todos los indicadores tienen aserción numérica automatizada |
| Estudiantes | Expediente, contactos, responsables, emergencia, disciplina/grupo y estado con motivo | Probado | Alta y persistencia desde navegador; DB exige motivo de pausa/retiro |
| Expediente extendido | Foto, tutores, cinturones/grados/ascensos, notas, documentos, asistencias e historial | Implementado | Recursos tipados autorizados; fotografías reales dependen de Storage |
| Interesados | Contacto, fecha de prueba y conversión transaccional a estudiante | Implementado | Operación de conversión evita repetir al mismo interesado |
| CSV e inactividad | Plantilla, vista previa, duplicados, errores por fila, importación atómica y último registro de asistencia | Probado | Pruebas de CSV y validación; interfaz incluida |
| Planes | Ilimitado, semanal, paquete, visita, privada, familiar, servicio y períodos de varios meses | Probado | Tarifas versionadas, recurrencia y consumo de paquetes |
| Cobros | Cargos/pagos/aplicaciones separados; parcial, varios cargos, familia y anticipos | Probado | Pruebas SQL y cobro desde navegador |
| Transferencia pendiente | Conserva deuda hasta verificar; confirma dinero una vez | Probado | Prueba antes/después de verificación |
| Recurrencia | Fecha fija/aniversario, fin de mes, congelamiento, prorrateo, recuperación y lotes | Probado | Reintentos, meses omitidos, fin de mes; cron alojado pendiente |
| Acuerdos y cambios | Descuentos/becas, compromisos, pausa/cancelación/reactivación/cambio de plan | Implementado | Operaciones autorizadas; beca completa y tarifas históricas probadas |
| Reembolsos y ajustes | Motivo, permisos, límite a importe reembolsable y movimientos trazables | Probado | Devoluciones y rechazo de importes excesivos |
| Recibos y estados | Numeración histórica, impresión/guardar PDF, deuda derivada | Probado | Recibo abierto en escritorio/móvil; numeración no reutilizable |
| Tesorería | Medio/destino/turno separados, fondo explícito, caja chica y banco | Probado | Cobro, gasto y turno persistidos |
| Movimientos | Transferencia atómica, aportes/retiros, comisiones, ajustes y conciliación manual | Probado | Transferencia sin ingreso duplicado; saldos derivados |
| Cierre | Esperado/contado/diferencia, justificación y aprobación trazable | Probado | Rechaza cobros en turno cerrado; cierre también por formulario |
| POS | Productos/servicios, líneas, código/nombre, variantes, descuento, pagos combinados y crédito | Probado | Venta desde formulario y recalculo de precio en DB |
| POS y membresía | Aplicar cobro a deuda existente sin emitir otro cargo | Probado | Caso con producto y mensualidad existente |
| POS devoluciones | Retorno/cambio, stock, dinero y reversión de comisión en una transacción | Probado | Retorno y cambio con rollback si falla la venta nueva |
| Inventario | Categorías, variantes/códigos, unidades, costos, precios y mínimo | Probado | Código y stock protegidos; precios y costos históricos |
| Compras | Proveedores, obligación, recepción parcial y devolución | Probado | Promedio ponderado, devolución pagada y no pagada |
| Sucursales de inventario | Existencias por sucursal, envío/recepción y movimientos con actor/origen | Implementado | Transferencia transaccional con dos estados |
| Conteo y equipo | Ajuste autorizado por diferencia de conteo/daño/pérdida; equipo con ubicación y mantenimiento | Implementado | Ajustes iniciales probados; conteo se registra como diferencia justificada |
| Concurrencia | Bloqueos de existencias y claves de operación | Probado | Dos conexiones vendiendo la última unidad; una sola venta para la misma clave |
| Gastos | Categoría/beneficiario, vencimiento, comprobante, aprobación, estados y pagos parciales | Probado | Obligación y pagos SQL; registro/pago desde formulario |
| Gastos recurrentes | Plantillas y generación manual/programada con período único | Implementado | Mismo proceso de DB; cron real pendiente |
| Integración de obligaciones | Compras y personal vinculados; no doble egreso ni gasto de inventario duplicado | Probado | Pruebas de compras, liquidación y pagos |
| Calendario | Día/semana/mes; disciplina, nivel, grupo, espacio, horario/capacidad y sustituto | Probado | Clase persistida por formulario; consultas paginadas del calendario |
| Repetición y excepciones | Plantillas, feriados, reprogramación, cancelación y modalidades de clase | Implementado | Validación central de conflictos y generación idempotente |
| Reservas y asistencia | Espera/promoción, ausencia/cancelación, límites y consumo único | Probado | Cupo, conflicto y paquete; asistencia desde formulario |
| Excepciones de acceso a clase | Deuda o vencimiento exige permiso y motivo | Probado | Rechazos y auditoría en pruebas SQL |
| Personal | Expediente, puesto, sucursal, estado y cuenta interna opcional del vendedor | Implementado | Datos independientes de Auth |
| Remuneración | Fijo/hora/clase/comisiones/anticipos/ajustes, versiones y base documentada | Probado | Comisión de venta/devuelta y tarifa histórica |
| Liquidación | Cálculo, revisión/aprobación, obligación y pago, actividad no repetida | Probado | Prueba de liquidación y egreso único |
| Reportes | Fuentes de deuda, caja, ventas/costos, obligaciones, personal/asistencia y estados | Implementado | RLS probado; exportación CSV por recurso |
| Comparaciones | Períodos equivalentes y sucursales autorizadas | Implementado | Consulta autorizada; no recorrido dedicado de navegador |
| Avisos y cobranza | Vencimientos, deuda, mínimo y aprobaciones; plantilla manual | Implementado | Persistencia y consulta con permisos; sin envío automático ficticio |
| Auditoría | Actor, academia/sucursal, entidad, acción, motivo y fecha | Probado | Escritura directa denegada y operaciones auditadas |
| Configuración | Marca/contacto/recibo, moneda/zona/formato, numeración, maestros y reglas tipadas | Probado | Cambio de límite/umbral/prefijo se refleja; moneda no cambia tras movimientos |
| Configuración de catálogo | Tallas/colores/unidades, puestos y ubicaciones descriptivos; conceptos activos/inactivos | Implementado | Campos persistentes, sin borrar históricos |
| Asistente | Academia, sucursal, moneda/zona, primera caja/plan y confirmación de pasos | Implementado | Precios y fondos reales pendientes del propietario |
| Integridad financiera | Decimal exacto, fechas locales, FK, transacción/idempotencia, reversos y saldos por movimientos | Probado | Pruebas de pago, venta, devolución, traslado y personal |
| Migraciones | Nueve archivos inmutables, restricciones/índices/RLS/RPC y tipos generados | Probado | Instalación vacía y coincidencia de contenido con Supabase |
| Datos ficticios | Demostración explícita y pruebas con dos academias | Probado | Fixture aislado; ningún dato demo cargado en proyecto real |
| GitHub | Rama codex/, commits, lockfile y CI con PostgreSQL/navegador | Implementado | Resultado remoto del workflow pendiente |
| Vercel | Variables/entornos, cron protegido, lotes, URLs de Auth y procedimiento de diagnóstico | Implementado | Build aprobado; publicación autorizada y ensayo alojado pendientes |
| Respaldo | Exportación/Storage/restauración documentados según plan | Implementado | Ensayo de restauración externo pendiente |

## Decisiones de operación

- Renegades usa la configuración acordada Nicaragua / NIO / America/Managua. El correo real está en el archivo local ignorado, sin incluirlo como dato inicial público.
- Una academia usa una sola moneda; las sucursales son las ubicaciones de stock. El equipo tiene además ubicación descriptiva. No se modelan conversiones de divisas ni depreciación.
- Becas y promociones se representan mediante tarifas con vigencia y descuento autorizado de la membresía/venta, sujetos al límite configurado. Tallas, colores, unidades y puestos se describen en sus registros, sin catálogos vacíos adicionales.
- El conteo físico se ingresa mediante un ajuste por diferencia con motivo, responsable y fecha. No incluye un flujo separado de escaneo ni múltiples almacenes dentro de una sucursal.
- El fijo se calcula por período de liquidación conforme a las condiciones documentadas. Las clases privadas pueden generar actividad sobre base aprobada registrada por personal autorizado; no se infieren impuestos ni obligaciones laborales.
- La descarga PDF se realiza con «Imprimir o guardar PDF» del navegador. Los comprobantes son administrativos; no se implementa facturación electrónica.
- Portal estudiantil, autorregistro, pago en línea y envíos automáticos de cobranza quedan fuera de esta solicitud, tal como indica el alcance original.

La activación real sigue bloqueada por la clave secreta para la invitación del propietario. Auth, Storage, cron/Vercel y restauración están pendientes de verificación externa. No se declara el sistema listo para producción.
