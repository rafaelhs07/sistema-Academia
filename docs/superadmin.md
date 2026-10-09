# Administración de plataforma

El panel `/superadmin` administra el servicio contratado por los negocios. Sus planes, cargos, pagos, aplicaciones, archivos y auditoría usan tablas `platform_*` independientes de la contabilidad estudiantil. El acceso a expedientes de estudiantes sigue limitado por las membresías internas de cada academia. No hay suplantación ni eliminación definitiva de negocios.

## Primer Superadministrador

El nombramiento se realiza desde el equipo de un operador autorizado, con el proyecto y la identidad revisados. No existe una opción en los roles de academia ni una ruta de navegador para nombrarlo. `private.platform_admins` está fuera del esquema expuesto; solo `bootstrap_superadmin`, concedida a `service_role`, puede registrar el nombramiento.

1. Aplica las migraciones a un proyecto de desarrollo o al entorno autorizado. No se ejecutan durante `next build`.
2. Configura `NEXT_PUBLIC_SUPABASE_URL`, la clave publicable, `NEXT_PUBLIC_APP_URL` y `SUPABASE_SECRET_KEY` en `.env.local`. La clave secreta pertenece únicamente al operador y al servidor. No se comparte ni se publica.
3. En Supabase Auth habilita TOTP, configura Site URL y las redirect URLs exactas de `/auth/callback`, deshabilita signup público y configura SMTP. La cuenta puede existir previamente; no se cambia su contraseña ni sus otras membresías.
4. Ejecuta el comando con la identidad verificada y la confirmación explícita del mismo correo:

```powershell
npm run superadmin -- email=propietario@example.com confirm=propietario@example.com reason="Nombramiento autorizado del propietario de plataforma" invite=true
```

`invite=true` permite enviar una invitación cuando la cuenta no existe o reenviarla mientras no esté confirmada. No genera contraseñas. Si la cuenta ya está confirmada se utiliza esa identidad sin enviar un restablecimiento. El comando no crea academias ni se ejecuta al arrancar la aplicación.

5. El destinatario establece su contraseña desde el enlace, inicia sesión y abre `/superadmin/mfa`. Inscribe su aplicación autenticadora y confirma un código TOTP. En sesiones posteriores se verifica el factor existente. Una sesión `aal1` no puede leer datos comerciales aunque la cuenta esté nombrada.

La base comprueba el registro activo, el nivel firmado `aal2` y la existencia actual de un factor verificado. Revocar el nombramiento o el último factor bloquea el panel incluso con un JWT anterior. La asignación no depende de correos enviados desde el navegador, `user_metadata`, orden de registro ni roles internos.

Para recuperación por pérdida del autenticador, un operador debe verificar la identidad fuera de la aplicación, desactivar temporalmente el nombramiento desde la consola autorizada, revocar sesiones y resolver el factor en Auth. Después registra el motivo, restablece el nombramiento y exige una nueva inscripción/verificación. No hay un bypass de MFA ni un botón de recuperación privilegiada en el panel. Conserva la auditoría de la intervención.

## Plantillas de correo

Admin Auth no utiliza el intercambio PKCE de una sesión iniciada desde ese navegador. La plantilla estándar de Supabase también está soportada: `/auth/callback` envía el fragmento de sesión a `/auth/complete`, el navegador lo valida con Supabase, establece las cookies y abre **Define tu contraseña**. El fragmento se retira del historial; nunca se envía como parámetros de consulta. La pantalla identifica el correo cuya contraseña se va a definir.

Como alternativa recomendada para SSR, configura la plantilla **Invite user** para verificar el hash directamente en el callback, con Site URL del entorno:

```html
<a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite&next=/auth/password">Aceptar invitación y establecer contraseña</a>
```

Para **Reset password** puedes usar el mismo enlace con `type=recovery`. El callback acepta también `code` para flujos PKCE, limita el destino a `/auth/password` o `/panel/inicio` y rechaza enlaces vencidos. Si ya aceptaste una invitación pero no llegaste al formulario, usa **Olvidé mi contraseña** con el correo invitado y abre el enlace nuevo; no hace falta recrear el negocio ni el usuario. Verifica recepción y apertura desde otro navegador/dispositivo; un resultado de Admin Auth no confirma la entrega del correo. Referencias oficiales: [invitación de usuarios](https://supabase.com/docs/guides/auth/users), [flujo implícito](https://supabase.com/docs/guides/auth/sessions/implicit-flow), [MFA TOTP](https://supabase.com/docs/guides/auth/auth-mfa/totp).

## Planes y condiciones

En **Planes comerciales** crea nombre, descripción, precio, moneda ISO, ciclo mensual/anual, días de prueba, límites y módulos. No se incluyen planes ni importes ficticios en el proyecto real. Los planes inactivos permanecen en el historial y no se asignan a nuevos contratos.

**Punto de venta requiere Inventario y compras**. Calendario, Personal y Reportes avanzados son opcionales independientes. Cobros, tesorería, gastos, estudiantes y configuración son funciones básicas; se mantienen para conservar la integridad financiera. La aplicación y PostgreSQL filtran permisos, políticas y operaciones según los módulos vigentes. Desactivar un módulo conserva sus registros y reactivarlo vuelve a mostrarlos.

Desde una ficha, **Cambiar condiciones del contrato** permite elegir el plan y ajustar precio, prueba, límites o módulos. Exige motivo y confirmación. Cada cambio agrega un contrato histórico; modificar el catálogo no altera contratos existentes ni cargos emitidos. La recuperación de cargos elige las condiciones vigentes en la fecha de cada período. El ciclo es el del plan seleccionado; usa un plan mensual/anual separado si necesitas ambos ciclos.

Los límites cuentan sucursales activas, usuarios internos activos y estudiantes activos de todo el negocio. PostgreSQL serializa las altas para impedir que dos solicitudes excedan el último cupo. Un descenso conserva los registros existentes y bloquea nuevas altas o reactivaciones que excedan el límite. Actualizar una membresía que ya está activa no consume otro cupo. Vacío en estudiantes significa sin límite.

## Alta de un negocio

En **Negocios → Nuevo negocio** completa los siete pasos: datos comerciales; propietario; país, moneda y zona horaria; sucursal; plan y ciclo; inicio/prueba; revisión. La moneda operativa de la academia puede ser distinta de la moneda de su contrato de plataforma.

El alta es transaccional e idempotente: crea academia, sucursal, seis roles internos, ficha y contrato. Si no hay prueba y la fecha ya comenzó, emite los cargos de plataforma pendientes. No crea cajas, fondos, estudiantes ni precios de membresías. El propietario completa la configuración operativa desde el asistente existente de su academia.

Después se invita al propietario. Si su correo ya pertenece a una cuenta confirmada, se vincula la identidad verificada y se conserva todo acceso previo a otros negocios. Si no existe o está sin confirmar, Supabase envía una invitación sin contraseña compartida. Solo se consulta Admin Auth en el servidor y la vinculación se valida de nuevo en la base.

La ficha muestra `pendiente`, `enviando`, `enviada`, `vinculada` o `fallida`. El fallo conserva el negocio y el contrato. **Invitar o vincular al propietario** permite reintentar; marca reenviar para una invitación enviada que no se aceptó. Hay una reserva de dos minutos por intento y claves UUID para reintentos. Si Auth aceptó el envío pero falló la vinculación, revisa límites/permisos y repite después de vencer la reserva. No recrees la academia ni borres usuarios para recuperar un envío.

## Cargos y pagos

En **Configuración** crea los medios de pago que realmente utilizarás. Las transferencias siempre requieren verificación. No se configura una pasarela externa.

1. Abre la ficha y consulta **Cargos de plataforma**. **Generar cargos pendientes** recupera períodos hasta una fecha explícita. **Cargos y pagos → Generar períodos pendientes** atiende los siguientes 100 negocios con cargos pendientes; repite si queda acumulación. Los lotes están limitados y los períodos son únicos por negocio.
2. Registra un pago con medio, importe, moneda y aplicaciones a uno o varios cargos del mismo negocio y moneda. Puedes aplicar un importe parcial y luego pagar el saldo. Distribuye el importe completo: no se generan anticipos implícitos.
3. Para transferencias registra referencia y, si existe, sube un comprobante. Subir el archivo no registra ni confirma el pago. Un pago pendiente reserva su aplicación para impedir una doble utilización del saldo, pero conserva la deuda hasta confirmarse.
4. En **Pagos de plataforma**, confirma la recepción o rechaza el pago pendiente con motivo. El rechazo libera la reserva. Un pago rechazado no puede confirmarse después: registra un nuevo pago si corresponde.
5. **Registrar ajuste autorizado** permite descuentos negativos o incrementos positivos con motivo. No puede dejar un saldo negativo ni desconocer aplicaciones pendientes. Los originales permanecen intactos.
6. Abre **Comprobante** para imprimir o guardar PDF. Muestra negocio, referencia, medio, estado, aplicaciones e importe. Un comprobante pendiente o rechazado indica que no acredita dinero recibido. Es un documento administrativo.

El panorama separa NIO, USD y cualquier otra moneda. Cobrado corresponde a pagos confirmados en el período por su fecha de confirmación, con la zona comercial configurada; pendiente corresponde al saldo total vigente. Los indicadores abren sus listados filtrados. Las exportaciones descargan la página consultada, con columnas controladas y protección contra fórmulas CSV.

## Estado comercial y acceso

La regla central `private.business_access` consulta las condiciones vigentes en cada operación. La aplicación no toma la decisión de un valor guardado en el navegador.

| Estado efectivo | Regla |
|---|---|
| Sin contrato | Negocios anteriores conservan acceso hasta asignar condiciones explícitamente |
| Inicio futuro | No opera antes de la fecha de inicio |
| En prueba | Acceso antes de `trial_until`; esa fecha es exclusiva |
| Activa y al día | No hay cargos vencidos con saldo |
| Deuda en gracia | Hay deuda y está dentro de los días de tolerancia, inclusive |
| Con deuda, acceso activo | Hay deuda fuera de tolerancia, pero la suspensión automática está desactivada globalmente o para el negocio |
| Extensión temporal | Acceso hasta `extension_until`, inclusive, con motivo; conserva la deuda |
| Suspendida por impago | Deuda fuera de gracia, sin extensión vigente y automatización habilitada |
| Suspendida manualmente | Bloqueo explícito; un pago no lo levanta |
| Cancelada | Se conserva toda la información y se detiene la recurrencia del contrato |

**Suspender acceso** exige motivo, permite observación interna y un mensaje para el cliente, y pide confirmación. El propietario ve el mensaje de servicio, deuda de plataforma, instrucciones y contacto; el personal solo ve un aviso para contactar al propietario. Las observaciones internas no se muestran al negocio. Pueden autenticarse y consultar `/servicio`, pero las API, RLS, funciones, reportes, exportaciones y archivos operativos comprueban el estado vigente.

**Reactivar acceso** levanta el bloqueo manual o cancelación y conserva el historial. Si sigue habiendo deuda fuera de tolerancia y automatización habilitada, debe concederse una extensión temporal válida o saldarse la deuda: el resultado muestra el acceso efectivo, no un falso estado activo. La extensión tiene fecha y motivo; al vencer se vuelve a aplicar la regla central. Pagar deuda puede resolver impago, pero nunca levanta un bloqueo manual.

## Impago automático y trabajos

La suspensión automática está **desactivada inicialmente**. En **Configuración → Revisar suspensión automática** consulta los negocios que quedarían suspendidos, marca activación, registra motivo y confirma. El servidor valida una huella de la vista previa; si los afectados cambian, exige revisarla de nuevo. Los días de gracia y la habilitación por negocio se configuran en su ficha.

El endpoint de Vercel `/api/cron/billing` utiliza `CRON_SECRET` de al menos 32 caracteres y rechaza vistas previas. Ambas variables son independientes:

| Variable | Trabajo |
|---|---|
| `ENABLE_PLATFORM_BILLING_CRON=true` | Suscripciones de plataforma, incluso de negocios suspendidos; omite contratos cancelados |
| `ENABLE_BILLING_CRON=true` | Automatizaciones operativas de academias activas y revisadas |

El cron existente es diario a las 08:00 UTC. El trabajo comercial usa la zona horaria de plataforma, toma los 50 negocios pendientes más antiguos y genera hasta 100 períodos por negocio. Conserva una señal de períodos restantes en `platform_job_runs`. Repite desde el panel o programa más ejecuciones en un entorno autorizado si el volumen supera la capacidad diaria. Habilitar suspensión automática no configura por sí solo el cron: activa y verifica la generación recurrente para emitir los cargos sobre los que se calcula la deuda.

Academias suspendidas no generan automáticamente membresías ni gastos. Al reactivar, cambiar tolerancia o conceder excepciones se mantiene una pausa de recuperación. El propietario revisa hasta 100 membresías y 100 gastos afectados, con fechas e importes, registra motivo y autoriza reanudar. La revisión no genera cargos. Después el próximo cron habilitado recupera períodos usando tarifas históricas; un registro puede tener varios períodos pendientes. Las operaciones manuales explícitas de generación continúan disponibles para un propietario activo autorizado.

## Archivos privados y despliegue

Los buckets `academy-private` y `platform-private` son privados. Las sesiones de navegador no pueden descargarlos, subir directamente ni crear enlaces firmados reutilizables. Cada ruta de archivo verifica sesión, MFA o servicio, permisos y la fila correspondiente mediante el cliente RLS del solicitante. Solo después utiliza la clave de servidor para el objeto exacto permitido. El Superadministrador obtiene logos y comprobantes comerciales; no obtiene expedientes de estudiantes por este mecanismo.

Los archivos pasan por firma PNG/JPG/PDF, tamaño de 4 MB en los proxies y ruta construida en servidor. Las respuestas tienen caché desactivada. Los bytes que alguien descargó previamente permanecen en su dispositivo; la suspensión bloquea nuevas solicitudes. En instalaciones antiguas con URLs ya firmadas, revisa su caducidad antes de exigir revocación inmediata; el proyecto vinculado estaba vacío al aplicar estas migraciones.

Aplica migraciones antes del despliegue, configura SMTP/TOTP/redirects y secretos por entorno, registra el primer administrador y verifica cuentas reales. No habilites cron ni impago automático sin revisión. El código no publica producción, no crea una pasarela ni contrata servicios. Consulta [evidencia de pruebas de plataforma](superadmin-pruebas.md) y [preparación para Vercel](despliegue.md).

El límite de subida de 4 MB deja espacio al formulario dentro del [límite de payload de 4,5 MB de Vercel Functions](https://vercel.com/docs/functions/limitations). Storage y las restricciones de metadatos conservan su techo de 5 MB; la interfaz y las rutas usan el límite menor compatible con Vercel.
