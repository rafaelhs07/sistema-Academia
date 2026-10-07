# Evidencia del panel de plataforma

Verificación del 7 de octubre de 2026. Se ejecutó la aplicación existente con las migraciones completas y los cambios de plataforma. No se desplegó producción ni se crearon precios o negocios ficticios en el proyecto vinculado.

| Comprobación | Resultado |
|---|---|
| TypeScript estricto | Sin errores |
| ESLint | Sin errores ni advertencias |
| Vitest con PostgreSQL independiente local | 52 aprobadas: 30 anteriores, 18 de plataforma y 4 de concurrencia |
| Playwright Chromium escritorio y Pixel 7 | 12 aprobadas: 6 anteriores y 6 nuevas |
| Compilación de producción | Correcta |
| Auditoría de dependencias de producción | 0 vulnerabilidades reportadas |
| Supabase | 13 migraciones aplicadas; 4 nuevas para plataforma; tipos regenerados |
| Asesor de seguridad de Supabase | Sin observaciones tras cerrar permisos y acceso directo a archivos |
| Asesor de rendimiento | Solo información de 218 índices sin uso en una instalación sin actividad; sin advertencias de claves foráneas o índices duplicados |

Las pruebas de base instalan las migraciones desde cero en PGlite y, para concurrencia, en PostgreSQL 18 local con conexiones independientes. GitHub Actions usa PostgreSQL 17, ejecuta la misma suite y la compilación. Cada ejecución nativa requiere una base nueva `academia_test*`; nunca apunta a Supabase real.

Las pruebas del navegador usan un servicio exclusivo en memoria: las operaciones SQL, restricciones, permisos y RLS son las de producción. Auth, el código TOTP, el transporte SMTP y los objetos binarios se simulan solamente en el adaptador de pruebas, que nunca se importa en la aplicación ni se despliega. El código de producción utiliza Supabase real y no acepta ese TOTP ficticio. El fallo de correo se simula una vez por destinatario y se recupera con un segundo envío.

## Los 16 escenarios requeridos

| # | Escenario | Evidencia ejecutada |
|---|---|---|
| 1 | Crear negocio, roles, sucursal, contrato e invitar/vincular | `platform.test.ts`; asistente de siete pasos y cuenta existente en navegador; nueva cuenta en prueba de reintento |
| 2 | Recuperar invitación fallida sin duplicar | Estado fallido persistente y reserva en DB; API, reintento desde ficha y una sola academia/contrato en navegador |
| 3 | Denegar panel a usuarios de academia | RPC, SELECT de tablas, API 403 y página restringida desde sesión de propietario |
| 4 | Impedir cambios directos de plan/acceso/rol plataforma | Grants, RLS y escritura en registro privado denegados |
| 5 | Pago parcial y completo | 40 + 60, saldo final cero, reintento sin duplicación; pago parcial y comprobante en navegador |
| 6 | Recurrencia idempotente | Enero/febrero/marzo, fin de mes, catálogo modificado y contrato histórico; misma clave concurrente de alta |
| 7 | Suspender sesión ya iniciada | Sesión de propietario en contexto de navegador independiente antes de la suspensión; después acceso limitado y API denegada |
| 8 | Datos y operaciones directos bloqueados | SELECT operativo vacío, RPC rechazado, API/exportación 403 con sesión vigente |
| 9 | Reactivar conservando información | Estudiante conservado y leído después; sin eliminación de movimientos |
| 10 | Pago mantiene bloqueo manual | Pago confirmado del saldo completo seguido de comprobación de `suspendida_manual` |
| 11 | Gracia y extensión vencen | Límite inclusivo de tres días y día siguiente bloqueado; extensión válida hoy y bloqueo al día siguiente |
| 12 | Módulos y dependencias | Venta sin inventario rechazada; desactivar conserva producto, bloquea lectura/alta y permisos; reactivar recupera producto |
| 13 | Límites sin borrar existentes | Altas de usuarios/estudiantes/sucursales denegadas; actualización de propietario permitida; último cupo probado con dos conexiones |
| 14 | Aislamiento entre negocios | Otra academia no obtiene datos ni aplicaciones cruzadas; vinculación de identidad mantiene membresías anteriores |
| 15 | Archivos y reportes protegidos | API de documentos y CSV 403 durante suspensión; RLS Storage bloquea acceso directo; subida/descarga de PNG por proxy autorizado, enlace directo denegado y rutas manipuladas de otra academia/sucursal rechazadas en navegador |
| 16 | MFA obligatorio | Administrador registrado `aal1` sin acceso; `aal2` sin factor vivo denegado; verificación TOTP del adaptador antes de panel en navegador |

Además: cancelación conserva cargos y detiene recurrencia; personal suspendido no recibe deuda/instrucciones privadas; pagos pendientes no saldan ni duplican reservas; rechazo libera reserva; monedas NIO/USD se muestran y filtran por separado; trabajos operativos se pausan y requieren revisión explícita, mientras continúa el trabajo comercial.

## Verificación en el proyecto vinculado

Se aplicaron `platform_foundation`, `platform_operations`, `platform_queries` y `platform_file_security` sin modificar las nueve migraciones anteriores. La suspensión automática está desactivada, el catálogo comercial está vacío y no hay academias reales creadas. El acceso de escritura directa del cliente a datos comerciales queda revocado; los cambios pasan por funciones con identidad, MFA, claves idempotentes y auditoría. Los registros privados tienen RLS denegatoria y cero grants de tablas al cliente.

La revisión de asesores no certifica por sí sola el flujo real de Auth. El proyecto todavía no tiene un primer Superadministrador inscrito y verificado. El nombramiento se entrega mediante un comando de operador con correo, confirmación y motivo; la identidad debe revisarse antes de ejecutarlo.

## Comprobaciones externas antes de producción

Pendientes: configurar y verificar SMTP, plantilla de invitación con `token_hash`, redirects exactos, alta de cuenta real y contraseña, MFA TOTP alojado, revocación de sesiones/factores, subida/descarga real en Storage, variables y límites de Vercel, ejecución de cron autorizado, restauración y carga representativa. Las pruebas locales cubren su lógica y los permisos, sin afirmar que esos servicios externos se hayan probado en producción.

Consulta el [procedimiento completo](superadmin.md). Los parámetros iniciales de Renegades se conservan en la configuración local: Nicaragua, NIO y America/Managua; no se utilizaron para crear una academia sin terminar el acceso real del propietario.

## Reproducir

```powershell
npm run typecheck
npm run lint
# TEST_DATABASE_URL opcional: base local nueva academia_test* para concurrencia.
npm test
npm run test:e2e
npm run build
```

Sin `TEST_DATABASE_URL`, las cuatro pruebas nativas se omiten expresamente; el resto se ejecuta con PGlite. Para navegador deben estar libres los puertos 3100 y 54321. El adaptador usa credenciales exclusivamente ficticias y el proceso de Next recibe la URL local; no lee la clave de servidor real de `.env.local`.
