/**
 * Gestor de PWA e Instalabilidad en iOS y Android
 */
(function() {
  // 1. Registro del Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('[PWA] Service Worker registrado con éxito:', reg.scope))
        .catch((err) => console.warn('[PWA] Error al registrar Service Worker:', err));
    });
  }

  let deferredPrompt = null;
  const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
  const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('[PWA] Evento beforeinstallprompt capturado');
    
    // Mostrar botón de instalación si existe en la interfaz
    const installBtn = document.getElementById('btn-install-pwa');
    if (installBtn && !isInStandaloneMode) {
      installBtn.classList.remove('hidden');
      installBtn.addEventListener('click', () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
              console.log('[PWA] Usuario aceptó la instalación');
            }
            deferredPrompt = null;
            installBtn.classList.add('hidden');
          });
        }
      });
    }
  });

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] Aplicación instalada con éxito');
    const installBtn = document.getElementById('btn-install-pwa');
    if (installBtn) installBtn.classList.add('hidden');
  });

  // Haptic Feedback en dispositivos móviles
  window.triggerHaptic = function(ms = 12) {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {}
    }
  };
})();
