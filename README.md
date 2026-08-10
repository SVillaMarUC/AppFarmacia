# AppFarmacia (Farma Ya)

App móvil Expo + React Native para flujos de afiliado, despachador, domiciliario y administrador con Firebase Auth/Firestore/Storage.

## Requisitos

- Node.js 20+
- npm 10+
- Expo SDK 57
- Cuenta Firebase configurada
- Herramienta EAS CLI (`npx eas-cli` o instalado globalmente vía `npm install -g eas-cli`)

## Configuración local y Trabajo en Equipo

1. **Clonar e instalar dependencias:** 
   Ejecuta `npm install` en la raíz del proyecto.
2. **Variables de entorno:**
   Crea el archivo `.env` basándote en `.env.example`.
   Completa las variables `EXPO_PUBLIC_FIREBASE_*` con las credenciales del proyecto (deben ser compartidas por el equipo de forma segura).
3. **Servicios de terceros:** 
   Si no usarás servicios pagos locales, deja activados:
   - `EXPO_PUBLIC_DISABLE_STORAGE_UPLOADS=true`
   - `EXPO_PUBLIC_DISABLE_GOOGLE_VISION=true`
4. **Configuración de cuenta para compilar (EAS Build):**
   El proyecto pertenece a la organización **`farma-team`** en Expo. Si eres un nuevo colaborador y necesitas generar versiones compiladas (APKs o iOS), sigue estos pasos desde cero:
   - **Paso 1:** Crea una cuenta gratuita en [expo.dev/signup](https://expo.dev/signup) si no tienes una.
   - **Paso 2:** Solicita al administrador del proyecto que te envíe una invitación para unirte a la organización `farma-team`.
   - **Paso 3:** Acepta la invitación recibida en tu correo o panel de notificaciones de Expo.
   - **Paso 4:** En esta misma terminal, instala la herramienta oficial de Expo globalmente (recomendado):
     ```bash
     npm install -g eas-cli
     ```
   - **Paso 5:** Inicia sesión en la terminal con tu cuenta ejecutando:
     ```bash
     npx eas-cli login
     ```
   Una vez logueado, EAS reconocerá que perteneces a `farma-team` y podrás ejecutar los comandos de compilación libremente.

## Comandos principales

- `npm run start` - Levanta el servidor local de Expo (para probar con Expo Go).
- `npm run typecheck` - Valida los tipos de TypeScript sin compilar.
- `npm run eas:build:preview:android` - Genera un APK de prueba en la nube usando EAS.
- `npm run eas:build:preview:ios` - Genera un build de iOS de prueba en la nube.

## Flujo recomendado antes de pruebas en dispositivo

1. Ejecutar `npm run typecheck`.
2. Levantar app con `npm run start`.
3. Validar login y redirección por rol.
4. Generar build preview con EAS para pruebas internas usando el comando de `package.json`.

## Notas de seguridad y Despliegue

- `.env` **no** debe subirse al repositorio de Git.
- Si ejecutas una build de EAS desde la nube, recuerda configurar tus *secrets* en el panel de Expo, ya que `.env` no viaja al servidor.
- Las reglas `firestore.rules` y `storage.rules` se deben versionar y desplegar junto con cambios de permisos de la base de datos.
