# Entrega al equipo: frontend e identidad

Estado del 26 de noviembre de 2026. El modo integration pasó de una pantalla de
espera del BFF a un flujo de identidad real: registro, login, perfil, preferencias
y logout. El modo demo conserva las pantallas financieras originales en memoria.

## Qué puede probarse

1. Abrir http://127.0.0.1:8080 con el entorno conjunto levantado.
2. Usar Registrarme: nombre, correo y contraseña de 15 a 128 caracteres. El alta
   muestra confirmación y vuelve a login; no inicia sesión automáticamente.
3. Entrar y editar el nombre de perfil, zona IANA, monto máximo y frecuencia mínima.
4. Recargar: la sesión y los datos se recuperan desde los servicios.
5. Cerrar sesión: se revoca en Usuarios y se limpia el cliente; recargar no recupera esa sesión.

No hay usuario/contraseña predefinidos. El alcance de preferencias es el bloque
mínimo de Usuarios; no equivale a todas las opciones de Configuración de la demo.

## Cómo se implementó

| Archivo | Responsabilidad |
| --- | --- |
| [integration-root.tsx](../src/app/integration-root.tsx) | Formularios, estados de carga/error y sesión autenticada. |
| [auth-api.ts](../src/app/auth-api.ts) | Operaciones Apollo tipadas de identidad, perfil y preferencias. |
| [bff-client.ts](../src/app/bff-client.ts) | /graphql del mismo origen, cookies y cabecera exigida por BFF; limpieza de caché. |
| [nginx.integration.conf](../nginx.integration.conf) | Proxy de /graphql al BFF y archivos de la SPA. |
| [Dockerfile](../Dockerfile) | Selecciona modo y configuración Nginx durante la compilación. |

El navegador solo consume GraphQL. No conecta directamente a gRPC, PostgreSQL,
Kafka ni al LLM. La cookie es HttpOnly: la aplicación no lee el token ni lo guarda
en localStorage. Al salir se detiene el cliente Apollo, se vacía su caché y se crea
otro cliente. Los errores de sesión obligan a volver al acceso.

Perfil y preferencias llevan versiones independientes. Los formularios envían la
versión leída y muestran conflicto si otro cambio la dejó antigua. Los montos CLP
y las versiones se mantienen como cadenas para preservar la precisión. El usuario
puede volver a consultar los datos antes de reintentar una edición.

## Ejecución y modos

La [guía conjunta del BFF](../../billetera-bff-graphql/docs/INTEGRACION_LOCAL.md)
explica el entorno de tres clones hermanos. Solo npm run dev no levanta backend
ni crea el proxy de Nginx. Para el flujo real, usar el Compose indicado en esa guía.

VITE_DATA_MODE se fija al construir: demo es el valor por defecto e integration
selecciona identidad real. Cambiar el .env después de compilar no cambia la imagen;
se debe reconstruir. La imagen integration espera un servicio DNS Docker llamado bff.

```powershell
npm ci
npm run typecheck
npm run lint
npm run test:unit
npm run build
```

La prueba conjunta de navegador se versiona en el BFF:
node scripts/integration/test-identity-browser.mjs desde su raíz. Requiere las
dependencias Playwright del frontend y un navegador instalado; ver la guía conjunta.

## Validación y pendientes

Pasaron TypeScript/build, ESLint y las 37 pruebas unitarias existentes. Se comprobó
el flujo real en Edge, incluyendo credenciales incorrectas, edición persistida,
recarga, cookie HttpOnly y logout. Se revisaron escritorio y móvil sin desbordes.
Esto no equivale a haber ejecutado toda la suite E2E financiera ni GitHub Actions.

- Integrar los módulos financieros cuando estén listos Transacciones y sus contratos.
  Actualmente no aparecen como datos reales de la cuenta autenticada.
- Conectar avisos a Notificaciones. Los avisos de la demo no son notificaciones persistidas.
- Consentimiento IA pendiente: implementarlo con Usuarios/BFF al conectar el asistente;
  el consentimiento de la demo solo vive en memoria y no cubre esa integración.
- Preferencias visuales sincronizadas, campos avanzados de Configuración y funciones
  de cuenta fuera del alcance actual permanecen como propuestas futuras.

Continuar usando los adaptadores del dominio financiero; no sustituirlos por datos
demo dentro de una sesión real para aparentar que la integración está terminada.
