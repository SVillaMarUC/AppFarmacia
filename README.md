# AppFarmacia

App móvil Expo + React Native para flujos de afiliado, despachador, domiciliario y administrador con Firebase Auth/Firestore/Storage.

## Requisitos

- Node.js 20+
- npm 10+
- Cuenta Firebase configurada
- Expo CLI / EAS CLI (vía `npx`)

## Configuración local

1. Crea el archivo `.env` usando `.env.example`.
2. Completa las variables `EXPO_PUBLIC_FIREBASE_*` con tu proyecto.
3. Si no usarás servicios pagos, deja activados:
	- `EXPO_PUBLIC_DISABLE_STORAGE_UPLOADS=true`
	- `EXPO_PUBLIC_DISABLE_GOOGLE_VISION=true`

## Comandos principales

- `npm run start`
- `npm run typecheck`
- `npm run eas:build:preview:android`
- `npm run eas:build:preview:ios`

## Flujo recomendado antes de pruebas en dispositivo

1. Ejecutar `npm run typecheck`.
2. Levantar app con `npm run start`.
3. Validar login y redirección por rol.
4. Generar build preview con EAS para pruebas internas.

## Notas de seguridad

- `.env` no debe subirse al repositorio.
- Las reglas `firestore.rules` y `storage.rules` se deben versionar y desplegar junto con cambios de permisos.
