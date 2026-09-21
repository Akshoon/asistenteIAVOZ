/**
 * Aura Analytics - Gestor de Autenticación y Control de Acceso
 * Protección perimetral con clave ejecutiva y token criptográfico
 */
class AuthManager {
  constructor() {
    this.token = null;
    this.lockScreenEl = document.getElementById('auth-lock-screen');
    this.passwordForm = document.getElementById('auth-password-form');
    this.passwordInput = document.getElementById('auth-password-input');
    this.toggleVisBtn = document.getElementById('auth-toggle-visibility');
    this.submitBtn = document.getElementById('auth-submit-btn');
    this.errorMsgEl = document.getElementById('auth-error-msg');
    this.rememberCheckbox = document.getElementById('auth-remember-checkbox');
    this.lockBtn = document.getElementById('btn-lock-session');

    this.onAuthenticated = null;
    this.onLocked = null;

    this.initEvents();
  }

  init() {
    const storedToken = localStorage.getItem('aura_auth_token') || sessionStorage.getItem('aura_auth_token');
    if (storedToken) {
      this.token = storedToken;
      this.verifyStoredToken(storedToken);
    } else {
      this.showLockScreen();
    }
  }

  initEvents() {
    if (this.passwordForm) {
      this.passwordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitPassword();
      });
    }

    if (this.toggleVisBtn && this.passwordInput) {
      this.toggleVisBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const isPassword = this.passwordInput.type === 'password';
        this.passwordInput.type = isPassword ? 'text' : 'password';
        this.toggleVisBtn.classList.toggle('is-visible', isPassword);
        this.toggleVisBtn.setAttribute('title', isPassword ? 'Ocultar contraseña' : 'Ver contraseña');
        this.passwordInput.focus();
      });
    }

    if (this.lockBtn) {
      this.lockBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.lock('Has cerrado sesión.');
      });
    }

    if (this.passwordInput) {
      this.passwordInput.addEventListener('input', () => {
        this.clearError();
      });
    }
  }

  async verifyStoredToken(token) {
    try {
      const res = await fetch('/api/auth/check', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.authenticated) {
        this.unlockScreen();
        if (typeof this.onAuthenticated === 'function') {
          this.onAuthenticated(token);
        }
      } else {
        this.clearStorage();
        this.showLockScreen();
      }
    } catch (err) {
      console.warn('[AURA AUTH] Error al verificar credencial almacenada:', err);
      this.showLockScreen();
    }
  }

  async submitPassword() {
    const password = this.passwordInput ? this.passwordInput.value.trim() : '';
    if (!password) {
      this.showError('Por favor introduce tu contraseña.');
      if (this.passwordInput) this.passwordInput.focus();
      return;
    }

    const remember = this.rememberCheckbox ? this.rememberCheckbox.checked : true;
    this.setLoading(true);
    this.clearError();

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();

      if (res.ok && data.success && data.token) {
        this.token = data.token;
        if (remember) {
          localStorage.setItem('aura_auth_token', this.token);
          sessionStorage.removeItem('aura_auth_token');
        } else {
          sessionStorage.setItem('aura_auth_token', this.token);
          localStorage.removeItem('aura_auth_token');
        }

        if (this.passwordInput) this.passwordInput.value = '';
        this.unlockScreen();

        if (typeof this.onAuthenticated === 'function') {
          this.onAuthenticated(this.token);
        }
      } else {
        this.showError(data.error || 'Contraseña incorrecta. Inténtalo de nuevo.');
        this.shakeCard();
        if (this.passwordInput) {
          this.passwordInput.select();
          this.passwordInput.focus();
        }
      }
    } catch (err) {
      console.error('[AURA AUTH] Error en solicitud de login:', err);
      this.showError('Error de conexión con el servidor.');
    } finally {
      this.setLoading(false);
    }
  }

  showLockScreen() {
    if (this.lockScreenEl) {
      this.lockScreenEl.classList.remove('unlocked');
      this.lockScreenEl.classList.remove('hidden');
      document.body.classList.remove('is-authenticated');
      setTimeout(() => {
        if (this.passwordInput) this.passwordInput.focus();
      }, 120);
    }
  }

  unlockScreen() {
    if (this.lockScreenEl) {
      this.lockScreenEl.classList.add('unlocked');
      document.body.classList.add('is-authenticated');
      setTimeout(() => {
        this.lockScreenEl.classList.add('hidden');
      }, 350);
    }
  }

  lock(reason = null) {
    this.clearStorage();
    this.token = null;
    this.showLockScreen();
    if (this.passwordInput) {
      this.passwordInput.value = '';
      this.passwordInput.focus();
    }
    if (reason) {
      this.showError(reason, true);
    }
    if (typeof this.onLocked === 'function') {
      this.onLocked();
    }
  }

  clearStorage() {
    localStorage.removeItem('aura_auth_token');
    sessionStorage.removeItem('aura_auth_token');
  }

  getToken() {
    return this.token || localStorage.getItem('aura_auth_token') || sessionStorage.getItem('aura_auth_token');
  }

  getAuthHeaders() {
    const t = this.getToken();
    return t ? { 'Authorization': `Bearer ${t}` } : {};
  }

  async fetch(url, options = {}) {
    const headers = options.headers ? { ...options.headers } : {};
    const t = this.getToken();
    if (t) {
      headers['Authorization'] = `Bearer ${t}`;
    }
    options.headers = headers;

    const res = await fetch(url, options);
    if (res.status === 401) {
      this.lock('Tu sesión ha expirado. Introduce la contraseña nuevamente.');
    }
    return res;
  }

  showError(msg, isNotice = false) {
    if (!this.errorMsgEl) return;
    this.errorMsgEl.textContent = msg;
    this.errorMsgEl.className = isNotice ? 'auth-error-banner is-notice' : 'auth-error-banner is-error';
    this.errorMsgEl.classList.remove('hidden');
  }

  clearError() {
    if (!this.errorMsgEl) return;
    this.errorMsgEl.textContent = '';
    this.errorMsgEl.classList.add('hidden');
  }

  shakeCard() {
    const card = document.querySelector('.auth-card');
    if (card) {
      card.classList.remove('shake');
      void card.offsetWidth;
      card.classList.add('shake');
    }
  }

  setLoading(isLoading) {
    if (!this.submitBtn) return;
    this.submitBtn.disabled = isLoading;
    const btnLabel = this.submitBtn.querySelector('.btn-label');
    const spinner = this.submitBtn.querySelector('.btn-spinner');
    if (btnLabel) btnLabel.textContent = isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión';
    if (spinner) spinner.classList.toggle('hidden', !isLoading);
  }
}

window.AuthManager = AuthManager;
