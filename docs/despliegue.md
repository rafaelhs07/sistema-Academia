# Despliegue y recuperación

## Entornos

Usa tres proyectos Supabase distintos: desarrollo, pruebas y producción. En Vercel, cada conjunto de variables debe pertenecer a su entorno. Una vista previa nunca debe recibir las credenciales de producción. `ENABLE_BILLING_CRON=false` y `ENABLE_PLATFORM_BILLING_CRON=false` en desarrollo y vistas previas; el endpoint además rechaza `VERCEL_ENV=preview`.

Importa el repositorio en Vercel, elige Next.js, Node 24 y el comando `npm run build`. Aplica previamente las migraciones a la base seleccionada. Revisa `supabase db push --dry-run` y respalda antes de un cambio que afecte datos. Las migraciones aplicadas son inmutables; toda corrección se agrega en una nueva. No hay migraciones ni datos de demostración en el proceso de compilación.

## Variables

| Variable | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto del entorno |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave publicable; todos los datos siguen protegidos por RLS |
| `NEXT_PUBLIC_APP_URL` | URL canónica de este despliegue |
| `SUPABASE_SECRET_KEY` | Solo servidor: invitaciones y trabajo programado; operador para bootstrap |
| `CRON_SECRET` | Secreto aleatorio de al menos 32 caracteres |
| `ENABLE_PLATFORM_BILLING_CRON` | `true` para generar suscripciones de plataforma; independiente de las automatizaciones operativas |
| `ENABLE_BILLING_CRON` | `true` únicamente en el entorno donde deben generarse cargos |
| `TEST_DATABASE_URL` | Solo pruebas: PostgreSQL local aislado `academia_test*` |

No configures `ACADEMIA_E2E` en Vercel: es exclusivo del servidor de pruebas. No publiques `.env.local`. La clave secreta no se importa en componentes del navegador ni se usa para las operaciones normales.

## Auth y archivos

En Supabase Auth configura Site URL y las redirect URLs exactas de `/auth/callback` para cada entorno. Deshabilita las altas públicas y los accesos anónimos. Configura un proveedor SMTP antes de usar invitaciones y recuperación en producción; verifica recepción, enlaces, caducidad y contraseña nueva con cuentas reales. El código no sustituye la configuración del proveedor. `supabase/config.toml` desactiva el signup y el seed para desarrollo local.

Los buckets privados admiten PDF/JPEG/PNG y conservan un techo de 5 MB en Storage. Los proxies y formularios aceptan archivos de hasta 4 MB para dejar margen dentro del límite de payload de 4,5 MB de Vercel. Consulta [los límites de funciones](https://vercel.com/docs/functions/limitations). El servidor verifica firma del archivo y tamaño. Los buckets de academia y plataforma bloquean acceso directo y generación de enlaces firmados desde sesiones del navegador. Las rutas de subida/descarga verifican identidad, estado vigente, permisos y el registro con RLS del solicitante antes de usar Storage con la clave de servidor para el objeto autorizado. Descargas de documentos, fotos y logos desactivan caché. Configura la clave de servidor también para estos proxies.

## Cargos programados

`vercel.json` ejecuta `/api/cron/billing` diariamente a las 08:00 UTC, con `Authorization: Bearer CRON_SECRET`. Vercel Hobby permite cron diario, con una ventana de ejecución de hasta una hora; cron con intervalos menores exige el plan compatible correspondiente. Verifica los límites antes de activar el entorno: [documentación oficial de Vercel](https://vercel.com/docs/cron-jobs/usage-and-pricing).

La fecha se calcula por zona horaria de cada academia. Cada lote procesa hasta 100 cargos y gastos recurrentes; hay un límite de 50 academias por llamada y se priorizan las que llevan más tiempo sin ejecutar. Los períodos pendientes se recuperan por fecha, sin duplicarlos. El resultado queda en `job_runs`. Si existe acumulación, el propietario puede repetir «Generar cargos pendientes» y «Generar gastos recurrentes» desde la interfaz. Para volúmenes que superen la capacidad diaria, programa más ejecuciones en un plan compatible o un programador seleccionado y autorizado. No se creó ningún servicio de pago.

El endpoint devuelve 401 sin secreto, 403 si está deshabilitado, y 500 ante fallo. El registro de servidor solo contiene el código del error; revisa los logs de Vercel y `job_runs`, sin copiar tokens ni contraseñas. Los reintentos usan los mismos períodos y claves de operación. Verifica tiempo de ejecución con el volumen real antes de activar la automatización.

## Respaldo, restauración y diagnóstico

Confirma en el proyecto Supabase el plan, los respaldos disponibles, retención y posibilidad de recuperación a un punto en el tiempo. No se presume que el proyecto tenga PITR. Consulta [respaldos de Supabase](https://supabase.com/docs/guides/platform/backups).

Antes de producción, prueba restaurar a un proyecto aislado y aplicar el código compatible con el esquema restaurado. Verifica recuentos, saldos, aplicaciones, existencias y recibos. Los archivos de Storage requieren su propia estrategia de copia y restauración; un respaldo de PostgreSQL no sustituye el respaldo de los objetos. Guarda secretos aparte. Establece con el propietario la frecuencia y el tiempo de recuperación aceptables.

Para incidentes: desactiva cron, limita temporalmente escrituras mediante los accesos internos, conserva logs y auditoría, identifica la última migración y restaura en un entorno aislado antes de cambiar producción. No borres movimientos para corregir saldos. Usa ajustes, reembolsos y reversos autorizados.

La aplicación no depende del disco del servidor para archivos ni de un proceso permanente para facturación. La publicación de producción está pendiente de autorización y verificación del entorno.

## Administración de plataforma

Consulta [el manual de Superadministrador](superadmin.md) para el nombramiento controlado, MFA obligatorio, plantilla `token_hash`, planes, pagos y suspensión. La generación comercial continúa durante una suspensión; las automatizaciones operativas requieren revisión de recuperación después de reactivar. La suspensión automática está desactivada y exige una vista previa y confirmación. No publiques producción ni actives cron hasta revisar el entorno.
