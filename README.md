# Farma Ya (AppFarmacia)

Aplicación móvil multiplataforma desarrollada en **React Native / Expo SDK 57 / TypeScript** para la gestión y automatización integral del ciclo de consulta, solicitud, validación médica, preparación, despacho y entrega de medicamentos de una farmacia, conectando a **Afiliados**, **Despachadores**, **Domiciliarios** y **Administradores** en tiempo real.

---

## 1. Arquitectura y Soluciones Implementadas

- **Autenticación y Persistencia:** Firebase Auth con soporte de acceso mediante Cédula o Correo electrónico y almacenamiento seguro de token de sesión.
- **Base de Datos NoSQL en Tiempo Real:** Cloud Firestore con listeners activos (`onSnapshot`) para pedidos, inventario, fórmulas médicas, checkpoints de entrega y PQRS.
- **Almacenamiento Seguro Desacoplado (Object Storage):** Supabase Storage para recetas médicas con URLs firmadas privadas temporales (cero Base64 en base de datos) y `FallbackStorageProvider` para desarrollo offline.
- **OCR Gratuito & Reconocimiento Heurístico de Recetas:** Motor de extracción local y gratuito que estructura medicamentos, concentraciones y dosis a partir de imágenes de recetas médicas sin dependencia de APIs de pago como Google Vision.
- **Mapas y Geolocalización Libres (OpenStreetMap):** Visualización de mapas interactivos y rastreo de domiciliarios mediante OpenStreetMap y `expo-location`, con costo cero y sin dependencia de Google Maps API.
- **Transacciones Atómicas de Stock:** Deducción y restauración de existencias de inventario mediante `runTransaction` de Firestore, previniendo stock negativo y condiciones de carrera en despachos concurrentes.

---

## 2. Requisitos Previos

- **Node.js**: 20.x, 22.x LTS o 24.x
- **npm**: 10.x o superior
- **Expo SDK**: 57
- **Dispositivo de prueba**: Emulador Android/iOS o app **Expo Go** en smartphone / Navegador Web.
- **Cuentas de Servicio Gratuitas**:
  - Proyecto de **Firebase** (Auth + Cloud Firestore).
  - Proyecto de **Supabase** (Bucket de Storage `recetas-medicas`).

---

## 3. Configuración Inicial del Proyecto

### 3.1. Clonar e Instalar Dependencias
```bash
git clone <url-del-repositorio>
cd AppFarmacia
npm install
```

### 3.2. Configurar Variables de Entorno (`.env`)
Copia el archivo de ejemplo:
```bash
cp .env.example .env
```
Edita `.env` con tus credenciales de Firebase y Supabase:
```env
# --- FIREBASE (Autenticación y Base de Datos) ---
EXPO_PUBLIC_FIREBASE_API_KEY=tu_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=tu_proyecto_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_proyecto.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=tu_app_id

# --- SUPABASE STORAGE (Almacenamiento de Recetas Médicas) ---
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET=recetas-medicas
EXPO_PUBLIC_DISABLE_STORAGE_UPLOADS=false
```

### 3.3. Configurar el Bucket en Supabase Storage
1. Ingresa a tu panel de [Supabase](https://supabase.com/dashboard).
2. Ve a **Storage** -> **New Bucket** -> Nómbralo `recetas-medicas`.
3. Configúralo como bucket **Privado** (las imágenes se visualizan con URLs firmadas temporales).

### 3.4. Reglas de Seguridad de Firestore
Publica el contenido de [firestore.rules](file:///c:/Users/santi/OneDrive/Desktop/AppFarmacia/firestore.rules) en tu consola de Firebase (**Firestore Database -> Reglas -> Publicar**).

---

## 4. Cómo Iniciar y Probar la Aplicación

### 4.1. Iniciar el Servidor Expo
```bash
npm start
```
- Presiona `a` para Android Emulator.
- Presiona `i` para iOS Simulator.
- Presiona `w` para versión Web en el navegador.
- O escanea el código QR con **Expo Go**.

### 4.2. Ejecutar la Suite de Pruebas Automáticas
```bash
npm test
```
Verifica 24 pruebas automatizadas de evaluación de stock, vencimiento, OCR heurístico, transacciones atómicas, validación de recetas y esquemas Zod.

### 4.3. Verificación de Tipos TypeScript
```bash
npm run typecheck
```

---

## 5. Módulos y Roles del Sistema

| Rol | Funcionalidades Principales |
| :--- | :--- |
| **Afiliado** | Catálogo en vivo, nueva solicitud con captura de receta (cámara/galería), OCR gratuito con corrección manual, seguimiento de pedidos en mapa (OpenStreetMap) con checkpoints en tiempo real, histórico de pedidos, direcciones de entrega y tema claro/oscuro. |
| **Despachador** | CRUD y filtros de inventario de medicamentos, revisión de fórmulas médicas mediante visor seguro con URLs firmadas, validación/corrección de OCR, aprobación/rechazo de recetas con motivo, preparación con descuento atómico de stock y asignación de domiciliarios disponibles. |
| **Domiciliario** | Control de disponibilidad, lista de pedidos asignados, transmisión de geolocalización GPS continua y registro de puntos de control (checkpoints: `pedido_recibido` -> `pedido_recogido` -> `en_camino` -> `cerca_destino` -> `pedido_entregado`). |
| **Administrador** | Dashboard con métricas globales en vivo (pedidos pendientes, recetas por validar, alertas de stock bajo y vencimiento a 30 días), reportes operativos, gestión de PQRS con módulo de respuesta formal y panel de inventario con herramienta de siembra inicial (Seeder). |

---

## 6. Comandos Disponibles

| Comando | Descripción |
| :--- | :--- |
| `npm start` | Inicia el servidor de desarrollo Expo / Metro. |
| `npm test` | Ejecuta la suite de pruebas unitarias y de lógica de negocio. |
| `npm run typecheck` | Validador estático de tipos TypeScript (`tsc --noEmit`). |
| `npm run doctor` | Diagnóstico de dependencias de Expo (`npx expo-doctor`). |
| `npm run web` | Inicia la app en navegador web. |
| `npm run eas:build:preview:android` | Genera build `.apk` de prueba en la nube vía EAS. |
