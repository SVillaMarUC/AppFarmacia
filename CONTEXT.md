# Contexto del Proyecto: AppFarmacia / Farma Ya

## 1. Visión General
- **Propósito:** Aplicación móvil multiplataforma para gestionar y automatizar el ciclo completo de consulta, solicitud, validación médica, preparación, despacho y entrega de medicamentos de una farmacia en tiempo real.
- **Alcance por Roles:**
  - **Afiliado:** Registro e inicio de sesión (por Cédula o Correo), catálogo en tiempo real con validación de stock, creación de pedidos de medicamentos (recetas vía carga por cámara/galería o digitación manual), extracción OCR de recetas médicas, seguimiento de pedidos y recetas, gestión de múltiples direcciones y contactos de emergencia.
  - **Despachador:** Gestión integral de catálogo e inventario (creación, edición, activación/desactivación, stock actual, stock mínimo, lote, fecha de vencimiento, requerimiento de fórmula médica), revisión de fórmulas médicas mediante visor seguro con URLs firmadas temporales, validación/corrección de OCR, aprobación/rechazo de recetas, preparación de pedidos con **descuento atómico de stock** (`runTransaction`) y asignación de domiciliarios disponibles.
  - **Domiciliario:** Visualización de pedidos asignados, cambio de estado de entrega en tiempo real y transmisión de coordenadas de geolocalización. Base arquitectónica preparada para `DeliveryEvidence` (evidencias fotográficas futuras).
  - **Administrador:** Panel de control y monitoreo global con métricas en vivo (pedidos pendientes, recetas por validar, alertas de stock bajo y medicamentos por vencer), visualización de trazabilidad y gestión de usuarios.
- **Fuera de alcance en esta fase:** Pasarela de pagos directos dentro de la app (los costos se gestionan bajo pólizas de EPS/afiliación o no cobro directo en esta versión).

---

## 2. Stack Tecnológico
- **Lenguaje / Framework:** TypeScript (estricto), React Native, Expo SDK 57, Expo Router (enrutamiento basado en archivos).
- **Autenticación & Base de Datos:**
  - **Firebase Auth:** Autenticación de usuarios con persistencia nativa en `AsyncStorage` / `SecureStore`.
  - **Cloud Firestore:** Base de datos documental NoSQL para usuarios, pedidos, catálogo/inventario, metadatos de recetas y tracking geográfico.
- **Almacenamiento de Archivos (Object Storage Desacoplado):**
  - **Supabase Storage:** Almacenamiento seguro de imágenes de recetas médicas y futuras evidencias de entrega mediante URLs firmadas privadas temporales (eliminando costos de Firebase Storage).
  - **Fallback Storage Provider:** Adaptador local de respaldo para desarrollo offline y testing.
- **Bibliotecas / Dependencias Clave:**
  - `@supabase/supabase-js`: Cliente para interacción segura con Supabase Storage.
  - `react-native-maps`: Visualización de mapas y rastreo geográfico.
  - `react-hook-form` & `@hookform/resolvers` + `zod`: Validación de formularios y esquemas de datos estructurados.
  - `expo-image-picker`: Captura desde cámara y selección de galería para recetas con manejo completo de permisos (`granted`, `denied`, `blocked`, `canceled`).
  - `expo-location`: Geoposicionamiento del domiciliario en tiempo real.
  - `expo-notifications`: Notificaciones nativas.
  - `@react-native-async-storage/async-storage` & `expo-secure-store`: Almacenamiento persistente de sesión y preferencias de tema.
- **Herramientas de Build / Despliegue:** EAS CLI (Expo Application Services) para builds preview (`.apk` / `.ipa`) en organización `farma-team`.

---

## 3. Arquitectura y Estructura del Proyecto

```text
AppFarmacia/
├── app/                  # Rutas y vistas de Expo Router (carpetas por rol)
│   ├── (administrador)/  # Dashboard y herramientas de administración
│   │   ├── dashboard.tsx # Métricas de pedidos, recetas y alertas de stock
│   │   ├── reportes.tsx  # Reportes operativos
│   │   ├── pqrs.tsx      # Gestión de peticiones y reclamos
│   │   └── perfil.tsx    # Perfil y preferencias de tema
│   ├── (afiliado)/       # Vistas de usuario afiliado
│   │   ├── inicio.tsx    # Pedido activo y accesos rápidos
│   │   ├── nueva-solicitud.tsx # Catálogo en vivo, captura de receta, OCR y confirmación
│   │   ├── rastreo.tsx   # Seguimiento geográfico en vivo
│   │   ├── historial.tsx # Histórico de pedidos y estados
│   │   └── perfil.tsx    # Direcciones, datos y selector de tema
│   ├── (auth)/           # Flujos de login y registro
│   │   ├── login.tsx     # Acceso por Cédula o Correo
│   │   ├── registro.tsx  # Registro con validación Zod
│   │   └── recuperar.tsx # Recuperación de contraseña
│   ├── (despachador)/    # Gestión de inventario y preparación
│   │   ├── inventario.tsx# Catálogo, stock, lotes, vencimiento, filtros y modal CRUD
│   │   ├── despachar.tsx # Revisión de recetas, aprobación/rechazo, preparación atómica y asignación
│   │   └── perfil.tsx    # Perfil y tema
│   ├── (domiciliario)/   # Pedidos asignados y tracking
│   │   ├── pedidos-asignados.tsx # Lista de entregas y cambio de disponibilidad
│   │   ├── navegacion.tsx# Mapa y ruta
│   │   └── perfil.tsx    # Perfil y tema
│   ├── _layout.tsx       # Layout principal, fuentes, providers y Guardia de navegación por roles
│   └── index.tsx         # Punto de entrada
├── components/           # Componentes visuales reutilizables
│   ├── afiliado/         # Badges de estado y formularios de medicamentos
│   ├── auth/             # Guardia de roles (RoleGate)
│   ├── domiciliario/     # Componentes de tracking/mapas
│   ├── shared/           # StockIndicator (stock + alertas de vencimiento)
│   └── ui/               # Botones, Input, Card, LoadingOverlay, ThemeSelector, ScreenHeader
├── constants/            # Colores, temas accesibles (claro/oscuro), ciudades y roles
├── context/              # Contextos globales (AuthContext, PedidoContext, ThemeContext)
├── hooks/                # Hooks personalizados (useAuth, useTheme, etc.)
├── services/             # Lógica de negocio y servicios externos
│   ├── firebase/         # Auth, Firestore, Config
│   ├── storage/          # Capa abstracta IStorageProvider, SupabaseStorageProvider, FallbackProvider
│   ├── medication.service.ts # Catálogo, inventario y transacciones atómicas de stock
│   ├── prescription.service.ts # Recetas médicas, subida a Supabase, URLs firmadas
│   ├── order.service.ts  # Creación y preparación de pedidos con snapshots inmutables
│   └── ocr.service.ts    # Procesamiento OCR de recetas con Google Vision API
├── types/                # Definiciones TypeScript (Medicamento, ItemInventario, RecetaMedica, Pedido, etc.)
├── firestore.rules       # Reglas de seguridad para Firestore (usuarios, inventario, recetas, pedidos)
└── storage.rules         # Reglas de seguridad para Firebase Storage (retrocompatibilidad)
```

---

## 4. Accesibilidad y Sistema de Temas (Claro / Oscuro / Sistema)

- **Modos Soportados:**
  - `light` (Modo Claro): Superficies limpias con fondos `#f1f5f9`, texto de alto contraste `#0f172a` y acentos verde azulado `#0f766e`.
  - `dark` (Modo Oscuro): Fondo oscuro `#0b1120`, superficies `#151f32` y texto de alto contraste `#f8fafc`.
  - `system` (Automático): Sincronización en tiempo real con las preferencias del sistema operativo mediante `Appearance.addChangeListener`.
- **Persistencia:** Almacenamiento de preferencia en `AsyncStorage` / `SecureStore` bajo la clave `farmaya_theme_mode`.
- **Componente `ThemeSelector`:** Permite al usuario alternar entre modos en su perfil con respuesta visual inmediata.

---

## 5. Ciclo de Datos y Reglas de Negocio

1. **Medicamentos e Inventario:**
   - Cada medicamento cuenta con `nombre`, `principioActivo`, `concentracion`, `presentacion`, `unidad`, `requiereReceta`, `stock`, `stockMinimo`, `lote`, `fechaVencimiento` y `activo`.
   - **Control Atómico de Stock:** Al preparar un pedido, `medicationService.descontarStockAtomico` ejecuta una transacción en Firestore (`runTransaction`). Si el stock disponible es menor a la cantidad solicitada, la transacción aborta automáticamente impidiendo existencias negativas y carreras entre despachos.
   - **Indicadores de Vencimiento:** Alertas configuradas a 30 días (`DIAS_ALERTA_PROXIMO_VENCIMIENTO`).
2. **Recetas Médicas:**
   - Las imágenes **NUNCA se guardan como Base64 en Firestore**. Se suben a **Supabase Storage** (`recetas/{usuarioId}/{recetaId}.jpg`).
   - Firestore almacena metadatos en la colección `recetas` (`usuarioId`, `storagePath`, `estado`, `ocr`).
   - El despachador visualiza la receta mediante **URLs firmadas privadas temporales**.
   - Estados de receta: `pendiente` -> `revision` -> `aprobada` / `rechazada`.
3. **Pedidos con Snapshot Inmutable:**
   - Cada ítem del pedido almacena una copia inmutable (`PedidoItem`) de los datos del medicamento al momento de la compra.
   - Si un pedido tiene ítems con `requiereReceta: true`, el despachador no puede marcar el pedido como preparado hasta que la receta esté aprobada.
4. **Seguridad y Roles:**
   - La navegación en `_layout.tsx` redirige automáticamente según el rol en Firestore (`afiliado`, `despachador`, `domiciliario`, `administrador`).
   - `firestore.rules` restringe la lectura y escritura por rol y por pertenencia de usuario.
