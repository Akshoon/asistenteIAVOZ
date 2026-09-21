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

## 🚀 Ejecución del Servidor

```bash
npm start
```

Acceso:
**http://localhost:3000**
