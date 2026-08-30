# Farma Ya (AppFarmacia)

Aplicación móvil multiplataforma desarrollada en **React Native / Expo SDK 54** para la gestión y automatización integral del despacho y entrega de medicamentos de una farmacia, conectando a **Afiliados**, **Despachadores**, **Domiciliarios** y **Administradores** en tiempo real.

---

## 🚀 Requisitos Previos

- **Node.js**: 20.x o superior
- **npm**: 10.x o superior
- **Expo SDK**: 54
- **Dispositivo de prueba**: Emulador Android/iOS o app **Expo Go** en tu smartphone.
- **Cuentas de Servicio**:
  - Proyecto de **Firebase** (Auth + Cloud Firestore).
  - Proyecto de **Supabase** (Storage para recetas médicas).

---

## ⚙️ Configuración Inicial del Proyecto (Paso a Paso)

### 1. Clonar e Instalar Dependencias
```bash
git clone <url-del-repositorio>
cd AppFarmacia
npm install
```

### 2. Configurar Variables de Entorno (`.env`)
Copia el archivo de ejemplo:
```bash
cp .env.example .env
```
Abre `.env` y completa las variables con tus credenciales:

```env
# --- FIREBASE (Autenticación y Base de Datos) ---
EXPO_PUBLIC_FIREBASE_API_KEY=tu_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=tu_proyecto_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=tu_app_id

# --- SUPABASE STORAGE (Almacenamiento de Recetas Médicas) ---
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET=recetas-medicas
EXPO_PUBLIC_DISABLE_STORAGE_UPLOADS=false

# --- GOOGLE SERVICES (Mapas & OCR) ---
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=tu_maps_key
EXPO_PUBLIC_GOOGLE_VISION_API_KEY=tu_vision_key
EXPO_PUBLIC_DISABLE_GOOGLE_VISION=false
```

> **Nota para desarrollo sin credenciales Cloud:** Si aún no has creado los proyectos en Firebase o Supabase, la app cuenta con un `FallbackStorageProvider` y modo degradado para que puedas navegar por las pantallas y probar la interfaz sin bloqueos.

### 3. Configurar el Bucket en Supabase Storage
1. Ingresa a tu panel de [Supabase](https://supabase.com/dashboard).
2. Ve a la sección **Storage** -> **Create a new bucket**.
3. Nómbralo `recetas-medicas`.
4. Configúralo como bucket **Privado** (las recetas se visualizarán de forma segura mediante Signed URLs temporales generadas por la app).

### 4. Desplegar Reglas de Seguridad en Firestore
Copia las reglas de `firestore.rules` en la consola de Firebase en **Firestore Database -> Reglas -> Publicar**.

---

## 📱 Cómo Poner en Marcha y Probar la Aplicación

### Paso 1: Iniciar el Servidor de Desarrollo
```bash
npm run start
```
- Presiona `a` para abrir en emulador de Android.
- Presiona `i` para abrir en simulador de iOS.
- O escanea el código QR con la app **Expo Go** desde tu teléfono.

### Paso 2: Crear el Primer Usuario (Rol Afiliado)
1. En la pantalla de login, toca en **"¿No tienes cuenta? Regístrate"**.
2. Completa los datos personales (Cédula, Nombre, Correo, EPS, Contraseña y Dirección).
3. Al registrarte, el sistema creará tu usuario en Firebase Auth y tu perfil en Firestore con el rol predeterminado `afiliado`.

### Paso 3: Probar Roles Especiales (Despachador / Administrador / Domiciliario)
Para cambiar el rol de un usuario registrado y acceder a los otros módulos:
1. Abre tu consola de [Firebase Firestore](https://console.firebase.google.com).
2. Ve a la colección `usuarios` y busca el documento correspondiente a tu UID.
3. Edita el campo `rol` con cualquiera de los siguientes valores:
   - `afiliado` -> Acceso a catálogo, creación de pedidos, recetas y rastreo.
   - `despachador` -> Acceso a inventario completo de medicamentos y módulo de despacho/preparación.
   - `domiciliario` -> Acceso a pedidos asignados, disponibilidad y mapa de entrega.
   - `administrador` -> Dashboard global con métricas en vivo y alertas.
4. Cierra sesión y vuelve a iniciar sesión en la app: el guardia de navegación (`_layout.tsx`) te redirigirá automáticamente a la pantalla de tu rol.

---

## 🎨 Accesibilidad y Sistema de Temas (Claro / Oscuro)

La aplicación cuenta con soporte completo de accesibilidad visual y temas:
- **Modo Claro (`light`)**: Tonos teal suaves `#f1f5f9` y texto de alto contraste `#0f172a`.
- **Modo Oscuro (`dark`)**: Tonos profundos `#0b1120`, tarjetas `#151f32` y texto `#f8fafc`.
- **Automático (`system`)**: Se adapta automáticamente al modo del sistema operativo.
- **Cómo cambiarlo**: Desde la pestaña **Perfil** de cualquier rol, usa el componente selector de tema para alternar tu preferencia en cualquier momento.

---

## 📦 Comandos del Proyecto

| Comando | Descripción |
| :--- | :--- |
| `npm run start` | Inicia el servidor de desarrollo de Expo. |
| `npm run typecheck` | Ejecuta el validador estático de TypeScript (`tsc --noEmit`). |
| `npm run android` | Ejecuta la app directamente en dispositivo/emulador Android. |
| `npm run ios` | Ejecuta la app directamente en simulador de iOS. |
| `npm run eas:build:preview:android` | Genera un archivo `.apk` de prueba en la nube vía EAS. |

---

## 🔒 Estructura y Seguridad de Datos

- **Cero Base64 en Firestore:** Las imágenes de recetas médicas se procesan, se comprimen y se almacenan en Supabase Storage. Firestore almacena únicamente los metadatos y la ruta segura.
- **Control Atómico de Inventario:** Las deducciones de stock se ejecutan mediante transacciones atómicas (`runTransaction`), garantizando que nunca se produzca stock negativo ni inconsistencias por solicitudes simultáneas.
- **Snapshots Inmutables de Pedidos:** Cada ítem solicitado conserva un snapshot de los datos del medicamento, protegiendo el histórico ante futuras modificaciones del catálogo.