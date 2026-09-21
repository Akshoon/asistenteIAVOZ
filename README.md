# Aura Analytics — Enterprise Voice BI

Plataforma de **Business Intelligence y Analítica Visual por Voz** de nivel corporativo, potenciada por **Google Gemini 2.5 Flash Native Audio Dialog**.

---

## 📱 Instalación en iOS y Android (Lógica PWA & Capacitor)

Siguiendo la arquitectura implementada en OpenGym / Capstone, la aplicación está completamente preparada para instalarse y ejecutarse en celulares como una app nativa:

### 1. Instalación Web PWA (Sin tiendas, directo desde el navegador)
* **En Android (Chrome / Edge):**
  1. Ingresa a `https://tu-dominio` (o `http://localhost:3000` si pruebas con túnel/IP local).
  2. Pulsa en el botón **"Instalar App"** de la barra superior, o en el menú de Chrome selecciona **"Instalar aplicación"** / **"Agregar a la pantalla principal"**.
* **En iOS (iPhone / iPad en Safari):**
  1. Abre la web en Safari.
  2. Presiona el botón **Compartir** (icono de cuadro con flecha hacia arriba).
  3. Selecciona **"Agregar a pantalla de inicio"** (*Add to Home Screen*).
  4. La aplicación se abrirá a pantalla completa (`standalone`) sin barras de navegador, con soporte para áreas seguras (*Safe Area Insets*).

### 2. Empaquetado Nativo con Capacitor (APK Android / Xcode iOS)
El proyecto cuenta con `capacitor.config.json` configurado:

```bash
# Agregar plataforma Android
npm run cap:add:android

# Sincronizar código web con Capacitor
npm run cap:sync

# Abrir en Android Studio para generar el APK
npm run cap:open:android

# (En macOS) Agregar y abrir en Xcode para iOS
npm run cap:add:ios
npm run cap:open:ios
```

---

## 📱 Adaptación y Diseño Responsivo Móvil

* **Diseño adaptado a celulares:** En pantallas táctiles, el panel analítico se proyecta como un **Bottom Sheet (Hoja Desplegable)** con tirador de arrastre táctil y altura adaptada (80vh).
* **Navegación táctil ergonómica:** Botones optimizados para el pulgar, carrusel horizontal deslizante con sugerencias analíticas e iconos compactos.
* **Respuesta háptica:** Vibración táctil sutil al interactuar con el micrófono o los botones en dispositivos móviles compatibles.
* **Orbe 3D escalable:** El orbe Three.js se ajusta automáticamente al ancho de pantalla (desde iPhone SE hasta pantallas ultra-wide).
* **Compatibilidad con Safe Area:** Márgenes dinámicos respetando el notch, Dynamic Island y barra inferior de gestos en iOS y Android (`env(safe-area-inset-*)`).

---

## 🚀 Despliegue en el Servidor (junto a GeoIgnis y OpenGym en nip.io)

Siguiendo la misma arquitectura que ya tienes en tu servidor Ubuntu con **Caddy**:
* **OpenGym**: Corriendo en `8080`
* **GeoIgnis**: Corriendo en `geoignis.148-116-106-10.nip.io` (puerto `8085`)
* **Aura (Asistente de Voz)**: Le asignamos el puerto local **`8088`** y el subdominio:
  ```text
  aura.148-116-106-10.nip.io
  ```

---

### PASO 1: Clonar y levantar en tu servidor

1. En tu servidor (en `/home/ubuntu`):
   ```bash
   cd /home/ubuntu
   git clone https://github.com/Akshoon/asistenteIAVOZ.git
   cd asistenteIAVOZ
   ```

2. Crea tu archivo `.env`:
   ```bash
   cp .env.example .env
   nano .env
   ```
   *Coloca tu `GEMINI_API_KEY` y revisa que `AURA_PORT=8088`.*

3. Levanta el contenedor con Docker Compose:
   ```bash
   docker compose up -d --build
   ```
   *El contenedor `aura-voice-app` quedará corriendo en segundo plano y escuchando en `127.0.0.1:8088`.*

4. Verifica que responda localmente:
   ```bash
   curl -I http://127.0.0.1:8088
   ```
   *(Debe responder `HTTP/1.1 200 OK`)*

---

### PASO 2: Agregar el subdominio a Caddy

1. Abre tu Caddyfile en el servidor:
   ```bash
   sudo nano /etc/caddy/Caddyfile
   ```

2. Verás los bloques que ya tienes para OpenGym y GeoIgnis. Al final, agrega este bloque:
   ```caddyfile
   aura.148-116-106-10.nip.io {
       reverse_proxy 127.0.0.1:8088
   }
   ```
   *(Guarda con `Ctrl + O`, `Enter` y sal con `Ctrl + X`)*.

3. Verifica la configuración de Caddy:
   ```bash
   caddy validate --config /etc/caddy/Caddyfile
   ```

4. Aplica los cambios en Caddy:
   ```bash
   sudo systemctl reload caddy
   ```

---

### PASO 3: Acceder con HTTPS y Probar

Abre en tu navegador o celular:
👉 **`https://aura.148-116-106-10.nip.io`**

Ingresa con tu contraseña de seguridad:
```text
Aura-Shield-2026!
```



