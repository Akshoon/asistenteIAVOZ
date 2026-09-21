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

## 🚀 Ejecución y Despliegue en Servidor (con nip.io y HTTPS)

> [!IMPORTANT]
> **¿Por qué nip.io y HTTPS?**
> Para que el navegador (Chrome, Safari, iOS, Android) permita capturar el micrófono con `navigator.mediaDevices.getUserMedia()`, es **obligatorio** usar HTTPS (salvo en `localhost`). Al usar `<TU_IP>.nip.io` se obtiene un dominio válido que resuelve a tu servidor y permite generar certificados SSL gratuitos de forma automática.

### Opción A: Despliegue con Docker y Caddy (Recomendado - SSL Automático)

1. En tu servidor, clona el repositorio:
   ```bash
   git clone https://github.com/Akshoon/asistenteIAVOZ.git
   cd asistenteIAVOZ
   ```

2. Configura tu archivo `.env` basándote en `.env.example`:
   ```bash
   cp .env.example .env
   nano .env
   ```
   *(Asegúrate de colocar tu `GEMINI_API_KEY` y tu `APP_PASSWORD`)*

3. Levanta los contenedores pasando tu IP pública con `nip.io`:
   ```bash
   DOMAIN="TU_IP_PUBLICA.nip.io" docker compose up -d
   ```
   *Caddy obtendrá automáticamente el certificado SSL gratuito y redirigirá HTTP a HTTPS.*

4. Accede desde cualquier celular o PC a:
   **`https://TU_IP_PUBLICA.nip.io`**

---

### Opción B: Despliegue directo con Node.js (PM2) + Nginx

1. **Clonar e instalar dependencias:**
   ```bash
   git clone https://github.com/Akshoon/asistenteIAVOZ.git
   cd asistenteIAVOZ
   npm install --omit=dev
   cp .env.example .env
   nano .env
   ```

2. **Iniciar el servidor con PM2:**
   ```bash
   npm install -g pm2
   pm2 start server/index.js --name aura-voice
   pm2 save
   ```

3. **Configuración de Nginx (`/etc/nginx/sites-available/aura`):**
   ```nginx
   server {
       server_name TU_IP_PUBLICA.nip.io;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;

           # Tiempos de espera para sesiones de voz prolongadas
           proxy_read_timeout 86400s;
           proxy_send_timeout 86400s;
       }
   }
   ```

4. **Habilitar sitio y generar SSL con Certbot:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/aura /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   sudo certbot --nginx -d TU_IP_PUBLICA.nip.io
   ```

5. **Acceso:**
   **`https://TU_IP_PUBLICA.nip.io`**

