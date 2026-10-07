# Resultados de verificación de la primera entrega

La ampliación de Superadministrador tiene su [evidencia actualizada](superadmin-pruebas.md): 52 pruebas de base y 12 recorridos de navegador. Este documento conserva los resultados de la primera etapa.

Fecha: 7 de octubre de 2026. Ejecución local en Windows con Node 24. Las comprobaciones corresponden a las nueve migraciones entregadas; no certifican un despliegue de producción.

| Comprobación | Resultado observado |
|---|---|
| TypeScript estricto, `npm run typecheck` | Sin errores |
| ESLint, `npm run lint` | Sin errores ni advertencias |
| Vitest con PostgreSQL local independiente | 32 pruebas aprobadas: 18 de integración, 8 de procesos adicionales, 4 de lógica y 2 de concurrencia |
| Playwright Chromium de escritorio y Pixel 7 | 6 recorridos aprobados |
| Compilación de producción, `npm run build` | Compilación, tipos y generación de rutas correctos |
| `npm audit --omit=dev` | 0 vulnerabilidades reportadas |
| Supabase vinculado | 9 migraciones aplicadas; versiones, nombres y huellas de contenido sin espacios coinciden con los archivos locales |
| Asesor de seguridad de Supabase | Sin observaciones |
| Asesor de rendimiento de Supabase | Solo información sobre 194 índices todavía sin uso; sin avisos de índices duplicados ni claves foráneas sin índice |

El asesor informa sobre índices sin uso porque la instalación real todavía no tiene actividad operativa. Se conservaron los índices de aislamiento y relaciones; la decisión de retirarlos requiere carga representativa. Referencia: [diagnóstico de índices sin uso de Supabase](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

La auditoría completa incluye cinco avisos de severidad alta en dependencias de desarrollo de ESLint/Next, derivados de `braces` y patrones anidados. No están en el conjunto de dependencias de producción. El arreglo propuesto por npm cambia a una versión mayor anterior de `eslint-config-next`; no se aplicó ese cambio incompatible. Se mantiene como seguimiento de dependencias, sin declarar la auditoría completa limpia. [Aviso GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).

## Los veinte escenarios solicitados

| # | Escenario | Evidencia ejecutada |
|---|---|---|
| 1 | Inscripción, plan, cargo y pago | `database.test.ts`; alta y cobro también desde navegador |
| 2 | Abono y pago del saldo restante | `database.test.ts` |
| 3 | Pago familiar entre estudiantes | `database.test.ts` |
| 4 | Reintento sin duplicación | `database.test.ts`; misma clave concurrente en `concurrency.test.ts` |
| 5 | Transferencia pendiente y confirmación | `database.test.ts`; deuda y movimiento antes/después |
| 6 | Recurrencia repetida y recuperación | `database.test.ts`; meses omitidos y fin de mes |
| 7 | Nueva tarifa conserva historial | `database.test.ts` |
| 8 | Venta actualiza dinero e inventario | `database.test.ts`; formularios de navegador |
| 9 | Última unidad vendida simultáneamente | Dos conexiones PostgreSQL independientes en `concurrency.test.ts` |
| 10 | Devolución de stock, dinero y comisión | `database.test.ts` y `workflows.test.ts` |
| 11 | Transferencia interna sin ingreso duplicado | `database.test.ts`; dos movimientos y suma neta cero |
| 12 | Obligación, pago parcial y final | `database.test.ts`; gasto pagado desde navegador |
| 13 | Cierre con diferencia | `database.test.ts`; cierre de turno también desde navegador |
| 14 | Asistencia consume paquete una vez | `database.test.ts`; asistencia desde navegador |
| 15 | Liquidación y pago sin duplicación | `database.test.ts` |
| 16 | Operación sin permiso rechazada | `database.test.ts`; datos y cron anónimos en navegador |
| 17 | Aislamiento directo, archivos, funciones y reportes | Dos academias y usuarios en pruebas SQL/RLS; `database.test.ts` y `workflows.test.ts` |
| 18 | Desactivación con sesión vigente | Misma identidad SQL en `database.test.ts` |
| 19 | Configuración cambia el proceso | Umbral de aprobación, moneda bloqueada, descuento y numeración en pruebas de integración |
| 20 | Instalación desde base vacía | Cada grupo de integración instala todas las migraciones; PostgreSQL independiente también parte de base nueva |

Otros casos ejecutados: compra parcialmente recibida, promedio ponderado, beca del 100 %, devolución al proveedor con reembolso confirmado, cambio de producto con reversión completa si falla la venta nueva, aislamiento del logotipo, CSV y fechas con zona horaria.

## Reproducción y alcance

`npm test` funciona sin servicios externos con PGlite. Para las dos pruebas concurrentes, proporciona `TEST_DATABASE_URL` de una base PostgreSQL vacía en localhost cuyo nombre empiece por `academia_test`. La última ejecución usó PostgreSQL 18, puerto local aislado 55432, base `academia_test_release`. No usó la base de trabajo del usuario. GitHub Actions está preparado para repetir la suite con PostgreSQL 17; su resultado remoto depende de la ejecución del workflow.

Playwright usa exclusivamente `tests/e2e/supabase-fixture.mjs` y las migraciones reales en PostgreSQL embebido. RLS, permisos, consultas y operaciones transaccionales se ejecutan; el transporte Auth se simula para el usuario ficticio `owner@test.invalid`. El adaptador no forma parte de las rutas de producción. Las pruebas no usan la clave secreta real, no envían correo ni modifican Supabase alojado.

Las [capturas de escritorio y móvil](screenshots/) contienen exclusivamente datos ficticios. Se revisaron navegación, formularios, tablas con desplazamiento interno, indicadores, expediente, recibo y asistencia. Las pruebas incluyen apertura del recibo desde el teléfono y comprobación de que cabe en el ancho de pantalla. Guardar PDF utiliza el diálogo de impresión del navegador; no se probó cada controlador de impresora.

## Verificaciones externas pendientes

| Verificación | Estado y dependencia |
|---|---|
| Primer propietario real | Pendiente de completar Auth, invitación y cuenta real; datos acordados guardados en configuración local ignorada |
| Invitación, recuperación y sesión real de Supabase Auth | Código implementado; pendiente de usuario real, URLs de Auth y entrega de correo |
| Archivos reales y enlaces de Storage | Políticas instaladas y aislamiento SQL probado; carga/descarga alojada pendiente de sesión real |
| Configuración operativa inicial | Asistente implementado; pendiente de sucursal, cajas, fondos y precios reales del propietario |
| Vercel y cron alojado | Configuración implementada; pendiente de entorno autorizado, variables y prueba de invocación programada |
| Restauración de respaldo | Procedimiento documentado; pendiente de exportación y restauración en entorno elegido |

El código cubre los once módulos. Los recorridos automatizados de navegador cubren las tareas principales descritas arriba; no se afirma que cada combinación de configuración tenga una prueba de navegador ni que Auth, SMTP, Storage y Vercel hayan sido verificados de extremo a extremo en servicios alojados.
