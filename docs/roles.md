# Roles y autorización

Los permisos se combinan entre roles activos. Una membresía interna activa puede acceder a todas las sucursales o a una lista específica. La base comprueba academia, sucursal, estado y permiso en cada lectura/operación, incluso con una sesión antigua. No utiliza `user_metadata` como autoridad. Los roles se editan mediante operación del propietario; nadie puede editar un rol que le concede acceso ni sus propios permisos. El rol propietario conserva sus permisos.

| Rol inicial | Facultades principales | Aprobaciones y límites |
|---|---|---|
| Propietario | Todas | Gestión de propietarios y roles |
| Administrador | Estudiantes, cobros, cajas, ventas, inventario, gastos, clases, configuración, usuarios y reportes | No administra propietarios; sin reembolsos ni aprobación de condiciones de personal por defecto |
| Recepción/cajero | Estudiantes, documentos, cobros, caja propia, venta, lectura de inventario y asistencia | Sin descuentos, crédito, reembolsos ni aprobaciones |
| Instructor | Lectura de estudiantes y clases; reservas/asistencia | Sin finanzas, nómina, documentos privados ni excepciones por deuda |
| Inventario | Productos, compras, recepciones, ajustes y existencias | Sin cobros ni pago de obligaciones |
| Contabilidad | Cobros/verificación/reembolsos, tesorería, gastos, personal y reportes | Sin operaciones normales de recepción; puede aprobar condiciones y obligaciones |

Los permisos exactos están en `supabase/migrations/*_setup.sql` y el selector de permisos en `src/domains/catalog.ts`. Reembolsar una venta requiere `sales.refund` y, cuando devuelve dinero, `billing.refund`. Devolver a proveedor requiere `inventory.approve` y `expenses.approve`; registrar dinero recibido además necesita `expenses.pay` y `treasury.write`. Contabilidad puede administrar beneficiarios sin acceso a inventario. Configura un rol combinado cuando la responsabilidad lo requiera.

Las secciones del panel requieren permiso de módulo; sus pestañas se filtran por el permiso de lectura de cada dominio. Un usuario con solo `reports.read` no obtiene por ello datos financieros: las fuentes del reporte conservan sus políticas. Notas y documentos tienen permisos distintos del expediente básico. Auditoría admite lectura autorizada y ninguna modificación del cliente.

La invitación necesita `users.manage`, crea una membresía inactiva sin roles y depende de Admin Auth en servidor. Asignar los roles y activar el acceso es un paso explícito. El primer propietario se crea por consola con clave secreta y función exclusiva de `service_role`.
