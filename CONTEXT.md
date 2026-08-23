# Contexto del Proyecto: AppFarmacia / Farma Ya

## 1. Visión General
- **Propósito:** Aplicación móvil multiplataforma para gestionar y automatizar el ciclo completo de despacho y entrega de medicamentos de una farmacia, conectando a afiliados, administradores, despachadores y domiciliarios en tiempo real.
- **Alcance:**
  - **Afiliado:** Registro, inicio de sesión, creación de pedidos de medicamentos (recetas vía carga manual u OCR), gestión de direcciones y contactos de emergencia.
  - **Despachador:** Gestión de inventario de medicamentos, preparación de pedidos, y control de stock.
  - **Domiciliario:** Visualización de pedidos asignados, reporte de entrega en tiempo real y transmisión de coordenadas de ubicación.
  - **Administrador:** Panel de control general y monitoreo de la operación.
  - **Fuera de alcance:** Pagos dentro de la aplicación (los costos son asumidos bajo políticas de EPS/afiliación o configurados para no cobro directo por pasarela en esta versión).

## 2. Stack Tecnológico
- **Lenguaje / Frameworks:** TypeScript, React Native, Expo (SDK 57), Expo Router para enrutamiento basado en archivos.
- **Base de Datos / Almacenamiento:** Firebase Suite (Firebase Auth para autenticación, Cloud Firestore para base de datos NoSQL, Firebase Storage para archivos/recetas médicas).
- **Bibliotecas / Dependencias Clave:**
  - `react-native-maps`: Visualización de mapas y rastreo geográfico.
  - `react-hook-form` & `@hookform/resolvers` + `zod`: Validación de formularios y esquemas de datos estructurados.
  - `expo-image-picker`: Captura y selección de imágenes para recetas médicas.
  - `expo-location`: Geoposicionamiento del domiciliario en tiempo real.
  - `expo-notifications`: Notificaciones push nativas.
- **Herramientas de Build / Despliegue:** EAS CLI (Expo Application Services) para generar compilaciones (.apk/.ipa) en perfiles de desarrollo y preview.

## 3. Arquitectura y Estructura
- **Patrón de Diseño / Arquitectura:** Arquitectura modular basada en roles con enrutamiento dinámico en Expo Router, inyección de estado mediante React Context API (Autenticación, Pedidos, Tema), y separación lógica de servicios de infraestructura (Firebase/OCR).
- **Estructura Principal de Directorios:**
```text
AppFarmacia/
├── app/                  # Rutas y vistas de Expo Router (carpetas por rol)
│   ├── (administrador)/  # Dashboard y herramientas de administración
│   ├── (afiliado)/       # Vistas de usuario afiliado (inicio, crear pedido, etc.)
│   ├── (auth)/           # Flujos de login y registro
│   ├── (despachador)/    # Gestión de inventario y preparación
│   ├── (domiciliario)/   # Pedidos asignados y tracking
│   ├── _layout.tsx       # Layout principal y Guardia de navegación por roles
│   └── index.tsx         # Punto de entrada
├── components/           # Componentes visuales reutilizables
│   ├── afiliado/         # Componentes específicos de afiliados
│   ├── auth/             # Formularios y componentes de autenticación
│   ├── domiciliario/     # Componentes de tracking/mapas
│   ├── shared/           # Componentes de UI compartidos
│   └── ui/               # Botones, campos de texto, overlays, etc.
├── constants/            # Colores, fuentes y constantes globales
├── context/              # Contextos globales (AuthContext, PedidoContext, ThemeContext)
├── hooks/                # Hooks personalizados (useAuth, useLocation, etc.)
├── services/             # Integración con servicios externos
│   ├── firebase/         # Clientes de Auth, Firestore, Storage y Config
│   └── ocr.service.ts    # Procesamiento OCR de recetas
├── types/                # Definición de interfaces TypeScript (index.ts)
├── firestore.rules       # Reglas de seguridad para Firestore
└── storage.rules         # Reglas de seguridad para Firebase Storage
```

## 4. Flujo de Datos y Reglas de Negocio
- **Entidades Clave / Modelos:**
  - `Usuario`: Registro de datos personales e identificación (`cedula`, `eps`, `direcciones`, `contactoEmergencia`, `rol` [administrador, afiliado, domiciliario, despachador]).
  - `Pedido`: Registro de transacciones (`medicamentos`, `estado` [pendiente, asignado, en_preparacion, listo, en_camino, entregado, cancelado], `modoEntrega` [domicilio, recogida], `recetaUrl`).
  - `ItemInventario`: Control de existencias (`stock`, `stockMinimo`, `lote`, `fechaVencimiento`).
  - `UbicacionDomiciliario`: Tracking geográfico (`latitud`, `longitud`, `pedidoActivoId`).
- **Reglas Principales:**
  - **Manejo de Roles:** El archivo `app/_layout.tsx` implementa un guardia de navegación (`Guard`) que intercepta la sesión y redirige automáticamente a los usuarios a la ruta correspondiente a su propiedad `rol` en Firestore.
  - **Validación Estricta:** Todos los formularios de entrada de datos son controlados y validados usando esquemas de validación de `zod`.
  - **Seguridad en Firebase:** Las reglas definidas en `firestore.rules` y `storage.rules` controlan el acceso a la base de datos y archivos según el UID autenticado y el rol del usuario.

## 5. Estado Actual y Próximos Pasos
- **Estado:** Prototipo funcional / Alpha con soporte multirrol básico e integración con Firebase.
- **Prioridades Actuales / Roadmap:**
  - Consolidar el flujo de OCR de recetas médicas y autocompletado en el formulario de creación de pedidos.
  - Implementar el seguimiento en tiempo real en mapa para afiliados cuando el domiciliario está en camino.
  - Configurar las notificaciones push automáticas para cambios en el estado del pedido.
  - Ajustar y pulir la consistencia visual y soporte de temas (claro/oscuro) en las interfaces. (IMPLEMENTADO)
