# Sistema Academia

Administración interna de academias con Next.js, TypeScript y Supabase. Los once módulos comparten operaciones transaccionales en PostgreSQL, permisos por academia/sucursal y archivos privados. La primera instalación usa la configuración de Renegades en Nicaragua: NIO y America/Managua.

El acceso real del propietario todavía requiere la clave secreta de servidor, la invitación de Auth y completar el asistente con sucursal, caja y precios reales. No se ha publicado producción. Consulta [resultados y límites de verificación](docs/pruebas.md) y [matriz de requisitos](docs/requisitos.md).

## Inicio local

Requiere Node.js 24 LTS, npm y un proyecto Supabase separado para cada entorno.

```powershell
npm ci
Copy-Item .env.example .env.local
# Completa las variables del proyecto de desarrollo.
npm run dev
```

Abre http://localhost:3000. La aplicación no permite autorregistro ni tiene una contraseña inicial.

## Base de datos y propietario

Las migraciones de `supabase/migrations` son la fuente de instalación y se aplican en orden. No se ejecutan al compilar. En el proyecto Supabase vinculado se aplicaron las nueve migraciones durante la construcción; el historial local coincide con el remoto. Los detalles están en `docs/pruebas.md`.

```powershell
npx supabase --help
npx supabase login
npx supabase link --project-ref TU_PROYECTO_DE_DESARROLLO
npx supabase db push --dry-run
npx supabase db push
```

Configura `SUPABASE_SECRET_KEY` solamente en `.env.local` del operador. En este equipo, el correo y los datos acordados están en `config/renegades.local.json`, excluido de Git. Para una instalación nueva copia `config/renegades.example.json` a ese archivo y configura el correo real:

```powershell
npm run bootstrap -- config=config/renegades.local.json
```

Este comando usa Admin Auth para invitar al correo definido en el archivo local; la función de creación de academia solo admite `service_role`. No expone una ruta pública. El propietario define su contraseña desde el enlace de invitación. El comando conserva el usuario ya creado si se reintenta tras un fallo y evita crear otra academia para el mismo propietario. El envío depende de Supabase Auth y su proveedor de correo; no se simula.

Después entra en Configuración y completa el asistente. No se incluyen precios, cajas, fondos ni sucursales ficticios en la instalación real.

## Verificaciones

```powershell
npm run typecheck
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

Las pruebas de PostgreSQL embebido instalan las migraciones completas desde cero e incluyen dos academias ficticias. `TEST_DATABASE_URL` habilita pruebas de concurrencia con conexiones PostgreSQL independientes y solo admite una base local cuyo nombre empiece por `academia_test`. Usa una base nueva para cada ejecución; estas pruebas instalan esquemas propios. GitHub Actions proporciona PostgreSQL 17 y ejecuta todos los comandos anteriores. Las pruebas del navegador usan un adaptador exclusivo de pruebas: PostgreSQL, permisos y RLS son reales; Auth se simula. No verifican entrega de correo ni Storage alojado.

## Demostración aislada

```powershell
npm run demo
```

Abre http://localhost:3100 e ingresa con `owner@test.invalid` y `test-only-password-123`. Este comando inicia datos ficticios en memoria y un transporte Auth exclusivo de pruebas, con las migraciones y políticas reales. Al detenerlo se descartan los datos. No usa credenciales ni tablas del proyecto Supabase vinculado. Los puertos 3100 y 54321 deben estar libres.

## Estructura del proyecto

- `src/domains/catalog.ts`: contratos de formularios, recursos y operaciones por dominio.
- `src/app/api`: validación, identidad de servidor, permisos y acceso mediante RLS.
- `src/components`: panel, formularios accesibles, calendario, importación y expediente.
- `supabase/migrations`: esquema, restricciones, RLS y motor transaccional.
- `src/lib/supabase/database.types.ts`: tipos generados del proyecto vinculado.
- `tests`: lógica, instalación, integridad, concurrencia y recorridos de navegador.
- `config/renegades.local.json`: configuración inicial no secreta.

Los saldos se derivan de movimientos. Los clientes no pueden escribir directamente en tablas financieras. Las versiones de precios y condiciones conservan el historial. `operate` serializa reintentos usando una clave UUID y comprueba identidad/permisos en PostgreSQL.

## Guías

- [Vercel, variables y entornos](docs/despliegue.md)
- [Manual para propietario y recepción](docs/manual.md)
- [Roles y permisos](docs/roles.md)
- [Reglas financieras](docs/finanzas.md)
- [Pruebas y verificaciones externas](docs/pruebas.md)
- [Requisitos y cobertura](docs/requisitos.md)
- [Solicitud original completa](docs/requisitos-originales.md)
