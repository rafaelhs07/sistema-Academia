Implementa un panel de Superadministrador en el sistema existente. Este panel será utilizado por mí, como propietario de la plataforma, para administrar los negocios que contratan el sistema, gestionar sus suscripciones y controlar su acceso.

Integra esta funcionalidad con la arquitectura actual de Next.js, Supabase y Vercel. Inspecciona primero lo implementado y conserva las funcionalidades existentes.

**1. Separación entre plataforma y negocios**

Distingue claramente:

- Superadministrador: dueño de la plataforma, administra negocios, suscripciones y acceso.
- Propietario de academia: administra únicamente su negocio.
- Personal de academia: utiliza las funciones permitidas dentro de su negocio.

El rol de Superadministrador no debe ser un rol configurable por las academias. Ningún propietario o empleado puede asignárselo, invitar superadministradores ni acceder a información de otros negocios.

Crea una sección independiente, por ejemplo `/superadmin`, con navegación y autorización propias.

**2. Panel principal**

Muestra indicadores reales:

- Total de negocios.
- Negocios en prueba, activos, suspendidos y cancelados.
- Suscripciones próximas a vencer.
- Negocios con pagos vencidos.
- Importe cobrado durante el período.
- Importe pendiente de cobro.
- Nuevos negocios del mes.

Permite abrir el detalle desde cada indicador.

Los ingresos de este panel corresponden a lo que los negocios me pagan por utilizar la plataforma. No deben mezclarse con las mensualidades que los estudiantes pagan a las academias.

**3. Administración de negocios**

Implementa un listado con búsqueda, filtros y paginación.

Cada negocio debe mostrar:

- Nombre comercial y logotipo.
- Responsable y datos de contacto.
- Fecha de creación.
- Plan contratado.
- Estado de suscripción.
- Estado de acceso.
- Próximo vencimiento.
- Saldo pendiente.
- Cantidad de sucursales y usuarios internos.

Desde su ficha debo poder:

- Consultar y actualizar información comercial.
- Asignar o cambiar un plan.
- Configurar un período de prueba.
- Consultar cargos y pagos.
- Registrar pagos.
- Extender una fecha de vencimiento.
- Otorgar días de gracia.
- Suspender y reactivar el acceso.
- Cancelar el servicio conservando el historial.
- Consultar el historial de acciones administrativas.

No implementes eliminación definitiva de negocios en esta versión.

**4. Crear un nuevo negocio**

Construye un asistente funcional para dar de alta una academia:

1. Datos del negocio.
2. Nombre y correo de su propietario.
3. Moneda y zona horaria.
4. Sucursal inicial.
5. Plan y ciclo de cobro.
6. Fecha de inicio y período de prueba, si corresponde.
7. Revisión y confirmación.

Al finalizar:

- Crear el negocio y su configuración inicial.
- Crear la sucursal.
- Asignar la suscripción.
- Preparar los roles internos.
- Invitar al propietario de forma segura.
- Permitirle establecer su contraseña y completar la configuración inicial.

No generes contraseñas compartidas ni las muestres en el panel.

Si el correo ya pertenece a un usuario, vincúlalo mediante un flujo seguro, sin duplicarlo ni alterar sus accesos a otros negocios.

Evita altas duplicadas por doble clic o reintentos. Si falla la invitación, conserva un estado identificable y permite reenviarla sin volver a crear el negocio.

No crees precios de membresías estudiantiles ni datos comerciales ficticios en negocios reales.

**5. Planes comerciales de la plataforma**

Implementa un catálogo configurable de planes con:

- Nombre y descripción.
- Precio y moneda.
- Ciclo mensual o anual.
- Período de prueba.
- Límite de sucursales.
- Límite de usuarios internos.
- Límite de estudiantes activos, si se utiliza.
- Módulos incluidos.
- Estado activo o desactivado.

Permite condiciones particulares por negocio, como precio especial o módulos adicionales, dejando registro del motivo.

Los límites y módulos deben aplicarse realmente en servidor. Ocultar una opción del menú no es suficiente.

Si un negocio baja a un plan con límites inferiores a su uso actual, conserva sus registros y bloquea nuevas altas que excedan el límite. No borres información automáticamente.

Guarda las condiciones históricas de cada suscripción; modificar un plan no debe cambiar cargos ya emitidos.

**6. Suscripciones y cobros a negocios**

Implementa cargos, pagos y aplicaciones de pagos separados de la contabilidad interna de las academias.

Permite:

- Generar cargos por suscripción.
- Registrar pagos completos y parciales.
- Registrar efectivo, transferencia u otros medios configurados.
- Guardar referencia y comprobante.
- Confirmar o rechazar transferencias.
- Aplicar descuentos o ajustes autorizados.
- Consultar saldo y vencimientos.
- Emitir un comprobante administrativo.

La generación recurrente debe ser idempotente y recuperar períodos pendientes sin duplicar cargos.

No marques una suscripción como pagada únicamente por subir un comprobante.

La versión inicial debe funcionar con registro y verificación manual de pagos, sin depender de una pasarela externa.

Si existen varias monedas, muestra saldos e indicadores separados por moneda; no sumes importes incompatibles.

**7. Control de acceso y suspensión**

Separa el estado comercial de la suscripción del estado efectivo de acceso.

Permite distinguir:

- En prueba.
- Activa y al día.
- Con deuda dentro del período de gracia.
- Suspendida por impago.
- Suspendida manualmente.
- Cancelada.

Implementa una regla central para decidir si un negocio puede operar. Esa regla debe considerar suscripción, fechas, días de gracia y bloqueos manuales.

Desde el panel debo poder:

- Suspender inmediatamente un negocio.
- Registrar motivo y observación interna.
- Definir un mensaje visible para el cliente.
- Reactivar el acceso.
- Conceder una extensión temporal.
- Configurar suspensión automática por impago.

La suspensión automática debe estar desactivada inicialmente y poder habilitarse expresamente. Debe existir una vista previa de los negocios afectados.

Una suspensión manual debe permanecer vigente aunque se registre un pago. El pago puede resolver un bloqueo por impago, pero no debe levantar otros bloqueos.

La reactivación temporal debe tener vencimiento y motivo. Si al vencer sigue existiendo deuda fuera de tolerancia, debe volver a aplicarse la regla correspondiente.

**8. Comportamiento de un negocio suspendido**

Cuando un negocio esté suspendido:

- Sus usuarios pueden autenticarse.
- No pueden acceder a los módulos operativos ni ejecutar operaciones del negocio.
- El propietario puede consultar una pantalla limitada con motivo, deuda de la plataforma, instrucciones de pago y contacto.
- Los empleados ven un aviso general que les indique contactar al propietario, sin mostrar información comercial privada.
- Los datos permanecen intactos.
- Al reactivarse, el negocio recupera sus funciones según su plan y permisos.

La restricción debe aplicarse también a sesiones ya iniciadas, llamadas directas, archivos privados, exportaciones y funciones de base de datos.

No dependas únicamente de una redirección visual, del middleware o de un estado guardado en el navegador. Comprueba el estado vigente en servidor y en las políticas de acceso correspondientes.

Define el comportamiento de los trabajos automáticos:

- Continúa la gestión de suscripciones de la plataforma.
- Pausa las automatizaciones operativas de academias suspendidas.
- Al reactivar, informa de períodos pendientes y permite revisar su recuperación sin generar cargos estudiantiles inesperados.

**9. Módulos contratados**

Permite habilitar o deshabilitar por negocio módulos opcionales como:

- Punto de venta.
- Inventario y compras.
- Calendario y asistencia.
- Personal y remuneraciones.
- Reportes avanzados.

Define las dependencias entre módulos para evitar configuraciones incoherentes.

Deshabilitar un módulo conserva sus datos, bloquea su uso y ajusta la navegación. Al habilitarlo nuevamente, recupera la información anterior.

Las funciones necesarias para mantener la integridad financiera no deben poder desactivarse de forma que dañen operaciones existentes.

**10. Seguridad del Superadministrador**

Implementa:

- Registro de superadministradores controlado fuera de los roles de academia.
- Procedimiento seguro y documentado para crear el primer Superadministrador.
- Autenticación multifactor obligatoria para el panel.
- Autorización en cada acción sensible.
- RLS y permisos específicos para datos de plataforma.
- Registro de cambios de planes, pagos, suspensiones, reactivaciones e invitaciones.
- Motivo obligatorio para suspensiones, ajustes y excepciones.

No otorgues este rol automáticamente al primer usuario que se registre ni a quien coincida con un correo enviado desde el navegador.

No expongas claves privilegiadas de Supabase.

El panel debe acceder a la información comercial necesaria para administrar el servicio. No necesita mostrar expedientes, documentos privados o información sensible de estudiantes.

No implementes suplantación de usuarios en esta versión.

**11. Experiencia de uso**

Mantén la interfaz en español y compatible con móvil.

Incluye:

- Menú independiente.
- Estados claros.
- Filtros por plan, acceso y vencimiento.
- Formularios con validación.
- Historial cronológico por negocio.
- Confirmación antes de suspender, cancelar o cambiar condiciones importantes.
- Resultado visible de cada acción.

No uses datos simulados en indicadores de producción ni botones sin funcionalidad.

**12. Pruebas y entrega**

Verifica al menos:

1. Crear un negocio e invitar a su propietario.
2. Recuperar una invitación fallida sin duplicar el negocio.
3. Impedir acceso al panel a usuarios de academias.
4. Impedir que una academia modifique su plan o estado de acceso directamente.
5. Registrar pago parcial y pago completo.
6. Generar cargos recurrentes sin duplicarlos.
7. Suspender un negocio con usuarios que ya tienen sesiones abiertas.
8. Rechazar acceso directo a datos y operaciones durante la suspensión.
9. Reactivar sin perder información.
10. Mantener una suspensión manual después de registrar un pago.
11. Aplicar y vencer un período de gracia o extensión.
12. Habilitar y deshabilitar módulos respetando sus dependencias.
13. Aplicar límites del plan sin borrar registros existentes.
14. Mantener aislamiento entre negocios.
15. Proteger archivos y reportes.
16. Exigir autenticación multifactor al Superadministrador.

Entrega migraciones, interfaz funcional, pruebas ejecutadas y documentación para:

- Crear el primer Superadministrador.
- Dar de alta un negocio.
- Configurar planes.
- Registrar y verificar pagos.
- Suspender y reactivar accesos.
- Activar la automatización por impago.

Integra los cambios con las verificaciones del repositorio y la preparación para Vercel. No publiques producción sin autorización.

Implementa la funcionalidad completa y reporta con precisión qué quedó probado y qué depende de configuración externa.