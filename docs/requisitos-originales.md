Construye una aplicación web completa para la administración interna de academias de artes marciales, inicialmente para una academia de jiu jitsu llamada Renegades.

Quiero que implementes el sistema, su base de datos, interfaz, procesos, pruebas y documentación en este repositorio. El resultado debe quedar funcional y preparado para desplegarse en Vercel, con Supabase como backend y GitHub como control de versiones.

**1. Objetivo y alcance**

El sistema es para el propietario y el personal de la academia. Su prioridad es controlar pagos de estudiantes, cuentas por cobrar, ingresos, egresos y saldos de dinero, con los demás módulos integrados.

Debe permitir administrar varias academias independientes y varias sucursales por academia. Renegades será la primera configuración, pero su nombre, marca y reglas no deben quedar fijos en el código.

Los estudiantes y empleados son registros administrativos; no necesitan tener una cuenta de acceso. Prepara la estructura para vincular cuentas a estudiantes y responsables en el futuro, pero no construyas todavía el portal estudiantil, el autorregistro ni los pagos en línea.

Implementa todos los módulos descritos. Las etapas son el orden de construcción, no una reducción del alcance a un MVP.

**2. Forma de trabajar**

- Inspecciona primero el repositorio, las instrucciones aplicables y las herramientas disponibles.
- Conserva los cambios existentes y reutiliza componentes útiles.
- Si el proyecto está vacío, inicialízalo.
- Consulta documentación oficial actual para las integraciones y versiones utilizadas.
- Mantén una lista de requisitos con estado: pendiente, implementado, probado o bloqueado.
- Construye por etapas funcionales y continúa hasta completar el alcance.
- Toma decisiones técnicas razonables y documenta los supuestos. Pregunta únicamente por información que bloquee el trabajo o decisiones irreversibles.
- No termines entregando solo una propuesta, un esquema de tablas, pantallas de demostración o botones sin funcionamiento.
- Si faltan credenciales, continúa con código, migraciones y pruebas locales que puedas ejecutar. Explica después qué falta para verificar la conexión real.
- No presentes como probada una función que no pudiste ejecutar.

**3. Tecnología y arquitectura**

Utiliza:

- Next.js con App Router y TypeScript estricto.
- Supabase PostgreSQL, Auth y Storage.
- Integración de autenticación de servidor compatible con la versión elegida de Next.js.
- Tailwind CSS y componentes accesibles, preferiblemente shadcn/ui.
- Validación de entradas en servidor; puedes utilizar Zod.
- Pruebas de lógica, integración con base de datos y flujos completos de navegador.
- GitHub Actions para las verificaciones automáticas.
- Vercel como destino de despliegue.

Selecciona versiones estables compatibles y guarda el archivo de bloqueo de dependencias.

Organiza el código por dominios: estudiantes, membresías, cobros, tesorería, ventas, inventario, gastos, clases, personal, reportes y configuración.

Centraliza las reglas de negocio y reutilízalas desde todas las interfaces. Usa transacciones de PostgreSQL para operaciones que deban completarse juntas; varias solicitudes consecutivas a Supabase no equivalen a una transacción.

La aplicación no debe depender del disco local del servidor para guardar archivos ni de procesos permanentes para ejecutar trabajos.

**4. Diseño y experiencia de uso**

Toda la interfaz debe estar en español.

Diseña un panel administrativo profesional, legible y rápido, adecuado para computadora, tablet y teléfono. Usa una identidad inicial sobria para Renegades, con marca y color principal configurables.

Prioriza:

- Buscar un estudiante.
- Consultar su deuda.
- Cobrar y emitir recibo.
- Registrar asistencia.
- Vender un producto.
- Registrar un gasto.
- Consultar y cerrar caja.

Incluye navegación consistente, filtros, paginación, búsqueda, formularios validados, estados vacíos útiles, estados de carga y mensajes de error comprensibles.

Los importes deben mostrar moneda y los estados no deben depender exclusivamente del color. Permite navegación por teclado y utiliza etiquetas accesibles.

Menú principal:

1. Inicio.
2. Estudiantes.
3. Membresías y cobros.
4. Cajas y cuentas.
5. Punto de venta.
6. Inventario y compras.
7. Gastos y cuentas por pagar.
8. Calendario y asistencia.
9. Personal y remuneraciones.
10. Reportes.
11. Configuración.

Las acciones y secciones visibles deben corresponder a los permisos reales del usuario.

**5. Academias, sucursales, usuarios y seguridad**

Implementa academias independientes con aislamiento de información desde la base de datos.

Usa identificadores de academia en todas las entidades correspondientes y restricciones que impidan relacionar registros de academias distintas. No confíes únicamente en filtros de la interfaz.

Roles iniciales configurables:

- Propietario.
- Administrador.
- Recepción/cajero.
- Instructor.
- Inventario.
- Contabilidad.

Permite combinar roles y limitar acceso por sucursal.

Implementa inicio y cierre de sesión, recuperación de contraseña, invitación de usuarios internos y desactivación de accesos. Define un procedimiento seguro para crear el primer propietario, sin contraseñas predeterminadas ni una ruta pública que permita apropiarse de una academia.

Requisitos de seguridad:

- RLS en todas las tablas expuestas y políticas según academia, sucursal y permisos.
- Autorización tanto en operaciones de servidor como en acceso directo a datos.
- Políticas de lectura y escritura que impidan cambiar la academia de un registro para eludir permisos.
- Los usuarios no pueden asignarse privilegios ni editar sus propios permisos.
- No uses metadatos editables por el usuario como fuente de autorización.
- Usa las claves publicables para clientes y mantén cualquier clave secreta exclusivamente en servidor.
- Las operaciones normales deben respetar la identidad del usuario; no uses una clave privilegiada para evitar resolver RLS.
- Protege también vistas, funciones, exportaciones, búsquedas y reportes.
- Las funciones privilegiadas, si son necesarias, deben tener permisos mínimos, contexto controlado y validaciones explícitas.
- Archivos privados en Storage con políticas de acceso y enlaces temporales cuando corresponda.
- Restricción de tipo y tamaño de archivos.
- Historial de acciones sensibles protegido contra modificación desde el cliente.
- Un usuario desactivado o sin membresía interna activa debe perder acceso a los datos aunque conserve una sesión.

**6. Panel del propietario**

Construye indicadores basados en datos reales, filtrables por período y sucursal:

- Cobros recibidos por concepto.
- Cargos pendientes y deuda vencida.
- Gastos y pagos efectuados.
- Saldos en cajas y cuentas.
- Ventas y margen de productos.
- Estudiantes nuevos, activos, pausados y retirados.
- Membresías próximas a vencer.
- Clases del día.
- Productos con existencias bajas.
- Aprobaciones pendientes y diferencias de caja.

Cada indicador debe permitir consultar su detalle. Distingue ventas, cargos emitidos, dinero recibido y resultado operativo; no los presentes como equivalentes.

**7. Estudiantes**

Implementa creación, edición, búsqueda, filtros y expediente con:

- Fotografía, datos personales y contacto.
- Fecha de ingreso y sucursal.
- Disciplinas y grupo.
- Contacto de emergencia.
- Responsables y tutores.
- Responsable de pago, que puede cubrir a varios estudiantes.
- Estado: activo, pausado o retirado.
- Membresías e historial.
- Estado de cuenta y recibos.
- Asistencias.
- Cinturón, grados y ascensos.
- Documentos y notas internas con permisos.
- Motivos de pausa y retiro.

Separa el estado administrativo del estudiante de su situación de pago.

Agrega gestión sencilla de interesados y clases de prueba, con conversión a estudiante sin duplicar información, y filtros para detectar inactividad.

Incluye importación CSV con plantilla, validación previa, detección de posibles duplicados e informe de errores.

**8. Membresías, cargos y cobranza**

Permite configurar y asignar:

- Mensualidades ilimitadas.
- Planes con límite de clases por semana.
- Paquetes de clases.
- Visitas individuales.
- Clases privadas.
- Planes familiares.
- Planes trimestrales, semestrales y anuales.
- Inscripciones y otros servicios.

Cada plan define precio, vigencia, disciplinas, sucursales, límites y reglas de renovación.

Modela por separado cargos, pagos y aplicaciones de pagos. Soporta:

- Pago completo o parcial.
- Un pago aplicado a varios cargos.
- Pago familiar distribuido entre estudiantes.
- Anticipos y saldos a favor.
- Descuentos, becas y acuerdos de pago.
- Transferencias pendientes de verificación.
- Recibos imprimibles y descargables.
- Congelamientos, cancelaciones, reactivaciones y cambios de plan.
- Reembolsos y ajustes con autorización.
- Historial de cobranza y compromisos.

Una transferencia pendiente no salda la deuda hasta ser confirmada.

La generación recurrente debe permitir fecha fija o aniversario de inscripción. Define el comportamiento para fines de mes, años bisiestos, pausas, prorrateos y cambios de plan.

Implementa ejecución programada y ejecución manual autorizada del mismo proceso. Ambas deben ser idempotentes: un reintento no puede duplicar cargos. Deben recuperar períodos pendientes después de una interrupción y dejar registro de resultados.

Los cambios de tarifa se aplican mediante versiones y fechas de vigencia. Conserva las condiciones históricas de las operaciones.

**9. Cajas, cuentas y tesorería**

Distingue:

- Medio de pago: efectivo, transferencia, tarjeta u otro.
- Destino del dinero: caja o cuenta.
- Sesión de caja: turno de un cajero.

Implementa:

- Cajas por sucursal y responsable.
- Caja de recepción y caja chica.
- Cuentas bancarias.
- Apertura con fondo inicial.
- Ingresos, egresos, retiros y depósitos.
- Transferencias entre cajas y cuentas.
- Cierre con importe esperado, contado y diferencia.
- Justificación y aprobación de diferencias.
- Conciliación manual de movimientos y depósitos.
- Registro de comisiones de medios de pago.
- Aportes y retiros del propietario separados de ingresos y gastos operativos.

Una transferencia interna debe registrar sus dos partes atómicamente y no aumentar los ingresos del negocio.

No permitas editar directamente el saldo de una cuenta. Los saldos deben derivarse de movimientos y ajustes autorizados.

Las sesiones cerradas no reciben modificaciones silenciosas; las correcciones deben tener un procedimiento trazable.

**10. Punto de venta**

Implementa ventas a estudiantes y clientes externos con:

- Búsqueda por nombre o código.
- Productos por talla, color y variante.
- Carrito.
- Descuentos según permisos.
- Servicios y productos en una misma operación.
- Cobro de cargos de membresía existentes sin duplicarlos.
- Pagos combinados.
- Venta a crédito autorizada.
- Recibos.
- Vendedor responsable.
- Cambios, devoluciones y reembolsos.

Una venta debe conectar correctamente sus líneas, deuda o pago, caja, inventario y comisión aplicable.

Diferencia el efectivo entregado del efectivo retenido cuando se da cambio.

Calcula importes y descuentos nuevamente en servidor; no confíes en totales enviados por el navegador.

**11. Inventario, proveedores y compras**

Implementa:

- Productos, categorías y variantes.
- Códigos únicos dentro de la academia.
- Costos y precios.
- Proveedores.
- Ubicaciones y existencias por sucursal.
- Compras y recepciones parciales.
- Cuentas por pagar asociadas.
- Transferencias entre sucursales con estados de envío y recepción.
- Conteos físicos.
- Ajustes por daño, pérdida u otras causas.
- Devoluciones.
- Existencias mínimas y alertas.

Todo movimiento debe tener origen, fecha y responsable.

Impide existencias negativas por defecto, incluso cuando dos personas venden simultáneamente la última unidad.

Utiliza un método de costo explícito y consistente, preferiblemente promedio ponderado, y conserva el costo aplicado a cada venta para calcular márgenes históricos.

Separa productos para venta, consumibles y equipo interno. Para equipo basta un registro de ubicación, estado y mantenimiento; no se requiere contabilidad de depreciación.

**12. Gastos y cuentas por pagar**

Implementa:

- Categorías y conceptos.
- Proveedor o beneficiario.
- Sucursal, fecha, vencimiento y comprobante.
- Estados pendiente, parcialmente pagado, pagado y anulado.
- Pagos parciales.
- Gastos recurrentes.
- Aprobaciones por permiso o importe.
- Caja o cuenta de salida.

Las compras y liquidaciones de personal deben vincularse con sus obligaciones y pagos, evitando egresos duplicados.

Una obligación pendiente todavía no es una salida de dinero. Una compra de inventario no debe volver a descontarse como gasto operativo completo al reconocer el costo de venta.

**13. Calendario y asistencia**

Implementa calendario diario, semanal y mensual con:

- Disciplina, nivel y grupo de edad.
- Sucursal y espacio.
- Instructor titular y sustituto.
- Horario, duración y capacidad.
- Clases recurrentes y excepciones.
- Feriados, cancelaciones y cambios.
- Clases privadas, pruebas, eventos y seminarios.
- Reservas internas y lista de espera.
- Asistencia manual por personal autorizado.

Detecta conflictos de espacio e instructor.

Distingue reserva, asistencia, ausencia y cancelación. Aplica límites de membresía y consumo de paquetes sin descontar dos veces por reintentos o registros duplicados.

Las excepciones por deuda o membresía vencida deben requerir el permiso correspondiente y quedar registradas.

**14. Personal y remuneraciones**

Implementa expedientes de empleados e instructores con puesto, sucursal, estado y condiciones de pago.

Soporta:

- Salario fijo.
- Pago por hora aprobada.
- Pago por clase impartida.
- Comisión por venta.
- Comisión por clase privada.
- Combinaciones de las anteriores.
- Anticipos y ajustes.

Cada regla de comisión debe especificar base de cálculo, porcentaje o monto, momento de devengo y tratamiento de descuentos y devoluciones.

Incluye un flujo de cálculo, revisión, aprobación y pago. Evita liquidar dos veces la misma actividad.

Conserva versiones históricas de las condiciones. Los cambios salariales no modifican liquidaciones anteriores.

El alcance es control administrativo de remuneraciones; no inventes cálculos laborales obligatorios de un país aún no definido.

**15. Reportes, avisos y auditoría**

Implementa reportes con filtros y exportación CSV:

- Cobros y cargos.
- Deuda por estudiante y antigüedad.
- Ingresos y egresos.
- Movimientos y saldos por caja.
- Cierres y diferencias.
- Ventas, devoluciones, costos y márgenes.
- Inventario.
- Compras y cuentas por pagar.
- Remuneraciones.
- Asistencia e inactividad.
- Altas, pausas y retiros.
- Comparaciones por período y sucursal.

Incluye comprobantes y estados de cuenta con formato de impresión.

Implementa avisos internos para vencimientos, deuda, existencias mínimas y aprobaciones. Permite generar mensajes de cobranza desde plantillas para uso manual.

Email, WhatsApp, pasarelas de pago y facturación electrónica serán integraciones posteriores, salvo que exista un proveedor seleccionado y configurado. No simules envíos ni confirmaciones externas.

Registra actor, fecha, academia, entidad, acción y motivo en operaciones sensibles, sin guardar contraseñas, tokens ni información sensible innecesaria.

**16. Configuración integral**

Construye formularios funcionales, persistentes y autorizados para configurar:

- Nombre, logotipo, colores, contacto y datos de recibos.
- Sucursales, espacios y horarios.
- Moneda, zona horaria y formatos.
- Numeración de documentos.
- Disciplinas, cinturones, grados y grupos.
- Planes, tarifas, inscripciones y servicios.
- Fechas de cobro, períodos de gracia y renovaciones.
- Prorrateos, pausas, cancelaciones y reactivaciones.
- Descuentos, becas, promociones y límites.
- Tipos de caja, cajas físicas, cuentas y responsables.
- Medios de pago, referencias y verificación.
- Aperturas, cierres, retiros y diferencias.
- Categorías de productos, tallas, colores y unidades.
- Ubicaciones y reglas de inventario.
- Precios y vigencias.
- Categorías de ingresos y gastos.
- Puestos, modalidades de remuneración y comisiones.
- Reglas de clases, reservas y asistencia.
- Roles, permisos y acceso por sucursal.
- Aprobaciones.
- Plantillas, documentos y avisos.
- Parámetros no secretos de integraciones.

Cada configuración debe afectar realmente al proceso correspondiente. No crees controles decorativos.

Utiliza campos y tablas tipados para reglas financieras y relaciones críticas; no guardes toda la configuración en un único objeto sin validación.

Versiona reglas cuando afecten operaciones históricas. Desactiva conceptos usados en lugar de borrarlos. Advierte sobre el efecto de los cambios y registra quién los realizó.

Usa inicialmente una moneda operativa por academia y bloquea cambios incompatibles después de registrar movimientos. No implementes conversiones de divisas implícitas.

Incluye un asistente inicial para configurar academia, sucursal, moneda, zona horaria, primera caja y primer plan. El país y los precios reales deben configurarse; no los deduzcas.

**17. Integridad de datos y reglas financieras**

Estas condiciones son obligatorias:

- Importes con tipos decimales exactos y redondeo definido.
- Fechas operativas en la zona horaria de la academia y marcas temporales almacenadas consistentemente.
- Restricciones y claves foráneas que garanticen pertenencia a la academia.
- Transacciones atómicas para cobros, ventas, devoluciones, transferencias y pagos de liquidaciones.
- Idempotencia en operaciones que puedan repetirse.
- Protección frente a concurrencia en saldos, inventario, cupos y numeración.
- No aplicar a cargos un importe superior al pago disponible.
- No reembolsar más de lo efectivamente cobrado y aún reembolsable.
- No permitir que escrituras directas a tablas eviten las reglas de una operación.
- Operaciones financieras confirmadas corregidas mediante reversos o ajustes trazables, no borradas.
- Permisos de edición y eliminación diferentes para borradores y documentos confirmados.
- Saldos iniciales registrados explícitamente.
- Reportes derivados de fuentes consistentes, sin sumas duplicadas entre módulos.

Documenta las fórmulas de saldos, deuda, flujo de dinero y resultado operativo.

**18. Migraciones, datos iniciales y pruebas**

Entrega migraciones versionadas y reproducibles, índices, restricciones, políticas RLS, funciones necesarias y tipos TypeScript.

Separa la instalación real de los datos ficticios. Los datos de demostración solo se cargan explícitamente en desarrollo o pruebas.

Incluye dos academias ficticias para probar aislamiento.

Prueba al menos:

1. Inscripción, asignación de plan, cargo y pago.
2. Abono y liquidación del saldo restante.
3. Pago familiar repartido entre estudiantes.
4. Reintento de pago sin duplicación.
5. Transferencia pendiente y confirmación.
6. Generación recurrente repetida y recuperación de períodos omitidos.
7. Cambio de tarifa sin alterar el historial.
8. Venta que actualiza caja e inventario.
9. Dos ventas simultáneas de la última unidad.
10. Devolución con ajuste de stock, dinero y comisión.
11. Transferencia entre cajas sin duplicar ingresos.
12. Gasto pendiente, pago parcial y pago final.
13. Cierre de caja con diferencia.
14. Asistencia y consumo único de paquete.
15. Liquidación de empleado sin pago duplicado.
16. Rechazo de operaciones sin permiso.
17. Imposibilidad de leer o modificar datos de otra academia, incluyendo llamadas directas, archivos, funciones y reportes.
18. Desactivación de usuario con sesión existente.
19. Cambio de configuración reflejado en el flujo real.
20. Instalación desde una base vacía usando las migraciones.

Ejecuta comprobación de tipos, análisis estático, pruebas y compilación de producción. Corrige los errores encontrados.

Verifica visualmente los flujos principales en escritorio y móvil.

**19. GitHub y preparación para Vercel**

Prepara:

- Repositorio ordenado y archivo de bloqueo de dependencias.
- `.gitignore` que excluya secretos.
- `.env.example` con nombres y explicaciones, sin valores reales.
- Automatización de verificaciones en GitHub Actions.
- Instrucciones para configurar Supabase y Vercel.
- Entornos separados para desarrollo, pruebas y producción.
- URLs de autenticación y recuperación configurables.
- Estrategia de migraciones previa a activar código que las requiera.
- Configuración del trabajo programado para cargos recurrentes.
- Protección de cualquier endpoint programado.
- Registro de errores y procedimiento de diagnóstico.
- Procedimiento documentado de respaldo, restauración y recuperación según las capacidades del entorno.

Las vistas previas de Vercel no deben modificar la base de producción. El proceso de compilación no debe ejecutar migraciones destructivas ni cargar datos de demostración.

Comprueba los límites del servicio elegido para trabajos programados y documenta cualquier requisito de plan. Implementa lotes y reintentos cuando corresponda.

Usa ramas con prefijo `codex/`, commits descriptivos y conserva el historial existente. No sobrescribas trabajo ajeno ni fuerces cambios sobre la rama principal.

El objetivo es dejarlo listo para desplegar. No publiques producción ni crees servicios de pago sin autorización.

**20. Orden de implementación y entrega**

Trabaja en este orden:

1. Arquitectura, esquema, autenticación, aislamiento y configuración esencial.
2. Estudiantes, membresías, cargos y pagos.
3. Cajas, cuentas, gastos y reportes financieros.
4. Punto de venta, inventario y compras.
5. Calendario, asistencia, personal y remuneraciones.
6. Configuración restante, importaciones, avisos y auditoría.
7. Pruebas integrales, revisión visual y preparación de despliegue.

Al terminar entrega:

- Aplicación implementada.
- Migraciones y políticas de acceso.
- Datos ficticios opcionales.
- Pruebas y sus resultados reales.
- README de instalación y operación.
- Guía de despliegue en Vercel.
- Manual breve para propietario y recepción.
- Matriz de roles y permisos.
- Documentación de reglas financieras.
- Lista de variables de entorno.
- Matriz de requisitos implementados y probados.
- Dependencias externas o verificaciones pendientes claramente identificadas.

Considera una función terminada únicamente si funciona desde la interfaz hasta la persistencia, respeta los permisos y tiene verificación adecuada.

No declares el sistema listo para producción solo porque compila. Si algún requisito sigue pendiente, identifícalo con precisión.

Comienza inspeccionando el proyecto y continúa con la implementación.
