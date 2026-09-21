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

## 🚀 Convivencia con más servicios en tu Servidor (con nip.io y HTTPS)

Si ya tienes otros servicios funcionando en tu servidor con `nip.io` (ej. `app.<IP>.nip.io`, `api.<IP>.nip.io`), a este asistente le asignamos el subdominio:

```text
aura.<TU_IP_PUBLICA>.nip.io
```

*Cualquier subdominio antes de la IP en `nip.io` resuelve automáticamente a tu mismo servidor.*

---

### Opción A: Despliegue con Docker (Recomendado junto a tus otros servicios)

1. En tu servidor, clona o actualiza el repositorio:
   ```bash
   git clone https://github.com/Akshoon/asistenteIAVOZ.git
   cd asistenteIAVOZ
   ```

2. Configura tu `.env`:
   ```bash
   cp .env.example .env
   nano .env
   ```
   *Si el puerto 3000 ya lo usa otro de tus contenedores, puedes definir `AURA_PORT=3005` (o el que tengas libre).*

3. Levanta el contenedor:
   ```bash
   docker compose up -d --build
   ```
   *Esto iniciará el contenedor `aura-voice-app` escuchando internamente en `127.0.0.1:3000` (o el `AURA_PORT` que hayas elegido).*

4. **Conéctalo a tu Nginx o Proxy inverso existente:**
   Agrega una configuración de servidor virtual para `aura.<TU_IP>.nip.io` (ver siguiente sección).

---

### Opción B: Integración en tu Nginx existente

Si ya tienes Nginx como proxy inverso para tus otros servicios:

1. **Crea la configuración para Aura:**
   ```bash
   sudo nano /etc/nginx/sites-available/aura
   ```

2. **Pega la configuración apuntando al subdominio `aura.<TU_IP>.nip.io`:**
   ```nginx
   server {
       server_name aura.TU_IP_PUBLICA.nip.io;

       location / {
           # Cambia 3000 si usaste otro AURA_PORT
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;

           # Tiempos de espera para sesiones de audio en tiempo real
           proxy_read_timeout 86400s;
           proxy_send_timeout 86400s;
       }
   }
   ```

3. **Habilita el sitio y genera el certificado SSL con Certbot:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/aura /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   sudo certbot --nginx -d aura.TU_IP_PUBLICA.nip.io
   ```

4. **Listo para usar:**
   Ingresa desde cualquier navegador a:
   **`https://aura.TU_IP_PUBLICA.nip.io`**


