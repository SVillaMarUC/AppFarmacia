# Guía de Configuración, Puesta en Marcha y Resolución de Problemas (SETUP.md)
## AppFarmacia / Farma Ya (Expo SDK 57)

Bienvenido al equipo de desarrollo de **AppFarmacia / Farma Ya**. Esta guía contiene todos los pasos necesarios para que cualquier colaborador clone el repositorio, instale las dependencias y ejecute la aplicación sin inconvenientes, ya sea en un dispositivo físico con **Expo Go** o en la versión **Web como fallback**.

---

## 1. Requisitos del Entorno

Antes de comenzar, asegúrate de tener instaladas las siguientes herramientas en tu máquina de desarrollo:

* **Node.js**: Versión **22.x LTS** (compatible con Node 20+ y 24; el repositorio incluye archivo [.nvmrc](file:///c:/Users/santi/OneDrive/Desktop/AppFarmacia/.nvmrc) fijado en `22`).
  * Si utilizas `nvm` (Node Version Manager):
    ```bash
    nvm use
    ```
* **npm**: Versión **10.x** u **11.x**.
* **Git**: Para el control de versiones y flujo Gitflow.
* **Dispositivo Móvil**:
  * Teléfono **Android** o **iOS** con la aplicación **Expo Go** instalada desde la Google Play Store o App Store.
  * **Muy importante**: Asegúrate de que **Expo Go esté actualizado a la última versión disponible** compatible con Expo SDK 57.
* **Navegador Web** (Google Chrome, Edge, Safari, Firefox) para pruebas y fallback web.

---

## 2. Instalación Paso a Paso

### Paso 2.1: Clonar el Repositorio
```bash
git clone https://github.com/SVillaMarUC/AppFarmacia.git
cd AppFarmacia
```

### Paso 2.2: Cambiar a la rama de desarrollo
El proyecto utiliza **Gitflow**. El trabajo colaborativo y las pruebas activas se realizan sobre la rama `develop`:
```bash
git checkout develop
git pull origin develop
```

### Paso 2.3: Instalar Dependencias
Instala las dependencias oficiales compatibles con Expo SDK 57:
```bash
npm install
```

### Paso 2.4: Configurar Variables de Entorno (`.env`)
El repositorio contiene una plantilla con todas las variables requeridas en [.env.example](file:///c:/Users/santi/OneDrive/Desktop/AppFarmacia/.env.example).

1. Crea tu archivo `.env` a partir de la plantilla:
   * **En Linux / macOS / PowerShell**:
     ```bash
     cp .env.example .env
     ```
   * **En Windows (CMD)**:
     ```cmd
     copy .env.example .env
     ```

2. Solicita al líder del equipo las credenciales del proyecto de desarrollo para Firebase y Supabase, o introduce las tuyas en el archivo `.env`.

> [!NOTE]
> El archivo `.env` está ignorado en [.gitignore](file:///c:/Users/santi/OneDrive/Desktop/AppFarmacia/.gitignore) y nunca debe ser subido al repositorio para evitar comprometer claves de acceso.

---

## 3. Comandos de Ejecución

Hemos configurado scripts simplificados en [package.json](file:///c:/Users/santi/OneDrive/Desktop/AppFarmacia/package.json) para que no tengas que memorizar parámetros técnicos:

| Comando | Método | Cuándo Usarlo |
| :--- | :--- | :--- |
| `npm run start` | Estándar / QR | Inicio rápido por defecto de Expo CLI con servidor Metro. |
| `npm run start:lan` | Red Local (LAN) | Cuando tu PC y tu teléfono están en la misma red Wi-Fi hogareña sin restricciones. |
| `npm run start:tunnel` | **Túnel Remoto** | **La opción más confiable.** Úsala si estás en la universidad, oficina, si usas datos móviles o si Expo Go no carga el QR. |
| `npm run web` | **Web (Fallback)** | Abre la versión web en el navegador. Ideal cuando no tengas un teléfono a la mano o haya problemas de red. |
| `npm run start:clear` | Limpieza de caché | Úsalo si Metro se queda congelado o muestra errores raros de empaquetado. |
| `npm run typecheck` | TypeScript | Valida el tipado estricto del proyecto sin emitir archivos (`tsc --noEmit`). |
| `npm run doctor` | Expo Doctor | Diagnóstico de salud e integridad de dependencias de Expo SDK 57. |

---

## 4. Cómo Probar la Aplicación en tu Teléfono (Expo Go)

1. Abre tu terminal en la carpeta del proyecto.
2. Ejecuta:
   ```bash
   npm run start
   ```
3. En la terminal se mostrará un código QR y las instrucciones de Metro Bundler.
4. **En Android**: Abre la aplicación **Expo Go**, presiona en *"Scan QR Code"* y enfoca el código QR de tu terminal.
5. **En iOS**: Abre la aplicación de **Cámara** nativa de iPhone, enfoca el código QR y pulsa en la notificación para abrirlo en Expo Go.
6. La aplicación compilará el bundle JavaScript y se iniciará en tu teléfono.

---

## 5. Diagnóstico de Problemas: "¿Por qué Expo Go no conecta?"

Si un colaborador del equipo puede abrir el proyecto y otro no, el 99% de las veces se debe a restricciones de red local o firewall. Sigue estos pasos ordenados de menor a mayor complejidad:

### Causa 1: PC y Teléfono en Redes Distintas o con Datos Móviles
* **Problema**: El teléfono está conectado a datos móviles (4G/5G) o a una red Wi-Fi diferente a la de la computadora. En modo LAN, no pueden verse directamente.
* **Solución Rápida**: Ejecuta el modo **Tunnel**:
  ```bash
  npm run start:tunnel
  ```
  Expo creará un túnel público seguro (vía ngrok / Cloudflare), permitiendo que el teléfono se conecte sin importar qué conexión a internet tenga.

### Causa 2: Aislamiento de Clientes Wi-Fi (Universidades, Oficinas, Cafés)
* **Problema**: Las redes Wi-Fi institucionales o empresariales suelen tener activado el *"AP Client Isolation"*, una política de seguridad que impide que dos dispositivos conectados a la misma Wi-Fi se comuniquen entre sí (bloqueando el puerto 8081).
* **Solución**:
  1. Usa **Tunnel**: `npm run start:tunnel`.
  2. O comparte conexión Wi-Fi (zona portátil/hotspot) desde el teléfono móvil a la computadora y conéctate en modo LAN (`npm run start:lan`).

### Causa 3: Firewall de Windows Bloqueando el Puerto 8081
* **Problema**: El Firewall de Windows Defender bloquea las peticiones entrantes de red a `node.exe`.
* **Solución**:
  1. Al iniciar `npm run start` por primera vez en Windows, suele aparecer una ventana de advertencia de Firewall. Asegúrate de marcar **"Redes privadas"** y hacer clic en **"Permitir acceso"**.
  2. Si no apareció la ventana, verifica que el perfil de red de Windows esté en **"Red Privada"** y no en "Red Pública".
  3. Puedes autorizar el puerto 8081 en Windows PowerShell como Administrador:
     ```powershell
     netsh advfirewall firewall add rule name="Expo Metro Bundler" dir=in action=allow protocol=TCP localport=8081
     ```

### Causa 4: VPN Activa
* **Problema**: Una VPN activa en la PC o en el móvil altera las tablas de enrutamiento locales y bloquea las direcciones de subred privada (ej: `192.168.x.x`).
* **Solución**: Desactiva temporalmente las VPNs en la computadora y en el teléfono, o ejecuta en modo túnel con `npm run start:tunnel`.

### Causa 5: Versión de Expo Go Desactualizada
* **Problema**: Si el colaborador tiene instalada una versión vieja de Expo Go (por ejemplo, correspondiente a SDK 52 o 54), la app mostrará un mensaje indicando que la versión del SDK no es compatible.
* **Solución**: Abre Google Play Store o App Store en el dispositivo y actualiza **Expo Go** a la versión más reciente disponible (compatible con SDK 57).

### Causa 6: Caché Corrupta de Metro Bundler
* **Problema**: Mensajes de error como `Unable to resolve module`, cambios que no se reflejan o pantallas en blanco.
* **Solución**: Detén el servidor con `Ctrl + C` y ejecuta:
  ```bash
  npm run start:clear
  ```

---

## 6. Ejecución Web (Método de Respaldo / Fallback)

Si por alguna razón no tienes acceso a tu teléfono o hay una restricción insalvable de red, puedes ejecutar la aplicación directamente en tu navegador web:

```bash
npm run web
```

### Consideraciones sobre la versión Web:
* **Finalidad**: Sirve como **visualizador y entorno de pruebas de respaldo**. La prioridad técnica del proyecto sigue siendo la aplicación móvil Android/iOS.
* **Almacenamiento**: En Web se utiliza automáticamente `AsyncStorage` como fallback transparente para no generar errores por la ausencia de `SecureStore` nativo.
* **Mapas**: Para evitar dependencias nativas incompatibles con el navegador, en Web se utiliza el componente [PlatformMap.tsx](file:///c:/Users/santi/OneDrive/Desktop/AppFarmacia/components/shared/PlatformMap.tsx), que proporciona coordenadas interactivas y un botón directo para abrir Google Maps en una nueva pestaña.
* **Recetas médicas**: En Web puedes seleccionar la imagen de la receta médica directamente desde los archivos de tu computadora; las imágenes se procesan y se almacenan en Supabase Storage de la misma forma que en móvil.

---

## 7. Reglas de Git y Flujo Gitflow para Colaboradores

1. **Nunca trabajes directamente sobre `main` ni `develop`**.
2. Crea una rama descriptiva a partir de `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/nombre-de-tu-funcionalidad
   # o bien:
   git checkout -b fix/nombre-del-error
   ```
3. Realiza commits claros siguiendo Conventional Commits (`feat: ...`, `fix: ...`, `chore: ...`).
4. Antes de subir tus cambios, verifica que no haya errores de compilación ni advertencias:
   ```bash
   npm run typecheck
   npm run doctor
   ```
5. Abre un **Pull Request (PR)** hacia la rama `develop` para revisión de código.
