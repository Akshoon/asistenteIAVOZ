/**
 * Gestor de Archivos y Datasets (Aura)
 */
class FilesManager {
  constructor(options = {}) {
    this.onDatasetChanged = options.onDatasetChanged || (() => {});
    
    this.dropzone = document.getElementById('file-dropzone');
    this.fileInput = document.getElementById('file-input');
    this.browseTrigger = document.getElementById('btn-browse-trigger');
    this.listContainer = document.getElementById('datasets-list');
    this.badgeCount = document.getElementById('files-badge-count');
    this.activeDatasetName = document.getElementById('active-dataset-name');
    this.btnClearDataset = document.getElementById('btn-clear-dataset');
    
    this.datasets = [];
    this.activeId = null;

    this.initEvents();
    if (!window.authManager || window.authManager.getToken()) {
      this.fetchDatasets();
    }
  }

  initEvents() {
    // Botón deseleccionar dataset activo
    if (this.btnClearDataset) {
      this.btnClearDataset.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setActiveDataset(null);
      });
    }

    // Botón explícito "Examinar archivos"
    if (this.browseTrigger && this.fileInput) {
      this.browseTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        this.fileInput.click();
      });
    }

    // Click en dropzone para abrir selector
    if (this.dropzone && this.fileInput) {
      this.dropzone.addEventListener('click', (e) => {
        if (e.target.closest('#btn-browse-trigger')) return;
        this.fileInput.click();
      });

      this.fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          this.uploadFile(e.target.files[0]);
        }
      });

      // Drag and Drop
      this.dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        this.dropzone.classList.add('dragover');
      });

      this.dropzone.addEventListener('dragleave', () => {
        this.dropzone.classList.remove('dragover');
      });

      this.dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        this.dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
          this.uploadFile(e.dataTransfer.files[0]);
        }
      });
    }
  }

  async fetchDatasets() {
    try {
      const fetchFn = (window.authManager && window.authManager.fetch) ? window.authManager.fetch.bind(window.authManager) : window.fetch;
      const res = await fetchFn('/api/files');
      if (!res.ok) return;
      const data = await res.json();
      this.datasets = data.datasets || [];
      this.activeId = data.activeId || null;

      if (this.badgeCount) this.badgeCount.textContent = this.datasets.length;
      
      const active = this.datasets.find(d => d.id === this.activeId);
      if (active && this.activeDatasetName) {
        this.activeDatasetName.textContent = active.name;
        if (this.btnClearDataset) this.btnClearDataset.classList.remove('hidden');
      } else if (this.activeDatasetName) {
        this.activeDatasetName.textContent = 'Ningún dataset seleccionado (Modo Demostración)';
        if (this.btnClearDataset) this.btnClearDataset.classList.add('hidden');
      }

      this.renderList();
    } catch (err) {
      console.error('Error al obtener datasets:', err);
    }
  }

  renderList() {
    if (!this.listContainer) return;
    this.listContainer.innerHTML = '';

    if (this.datasets.length === 0) {
      this.listContainer.innerHTML = '<p class="empty-list-hint">No hay datasets cargados aún. Suba un archivo CSV, Excel o JSON para comenzar.</p>';
      return;
    }

    this.datasets.forEach(d => {
      const item = document.createElement('div');
      item.className = `dataset-card ${d.isActive ? 'is-active' : ''}`;
      
      // Determinar extensión/icono
      const isExcel = d.name.endsWith('.xlsx') || d.name.endsWith('.xls');
      const isJson = d.name.endsWith('.json');
      const fileTypeTag = isExcel ? 'XLSX' : (isJson ? 'JSON' : 'CSV');
      
      const columnsList = d.columns || [];
      const visibleCols = columnsList.slice(0, 5);
      const remainingCols = columnsList.length - 5;

      item.innerHTML = `
        <div class="dataset-card-header">
          <div class="dataset-type-badge">${fileTypeTag}</div>
          <div class="dataset-card-info">
            <h5 class="dataset-card-name" title="${d.name}">${d.name}</h5>
            <div class="dataset-card-meta">${d.rowCount} filas • ${columnsList.length} columnas</div>
          </div>
          <button class="dataset-select-btn ${d.isActive ? 'is-active' : ''}" type="button">
            ${d.isActive ? 'Activo ✓' : 'Seleccionar'}
          </button>
        </div>
        ${visibleCols.length > 0 ? `
          <div class="dataset-card-columns">
            ${visibleCols.map(c => `<span class="col-pill">${c}</span>`).join('')}
            ${remainingCols > 0 ? `<span class="col-pill more">+${remainingCols}</span>` : ''}
          </div>
        ` : ''}
      `;

      item.addEventListener('click', (e) => {
        if (d.isActive) {
          this.setActiveDataset(null);
        } else {
          this.setActiveDataset(d.id);
        }
      });

      this.listContainer.appendChild(item);
    });
  }

  async setActiveDataset(id) {
    try {
      const fetchFn = (window.authManager && window.authManager.fetch) ? window.authManager.fetch.bind(window.authManager) : window.fetch;
      const res = await fetchFn('/api/files/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        this.activeId = data.activeId;
        await this.fetchDatasets();
        this.onDatasetChanged(data.dataset);
      }
    } catch (err) {
      console.error('Error al cambiar dataset:', err);
    }
  }

  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const primaryTextEl = this.dropzone ? this.dropzone.querySelector('.dropzone-primary') : null;
    const prevText = primaryTextEl ? primaryTextEl.innerHTML : '';
    if (primaryTextEl) {
      primaryTextEl.textContent = `Analizando y subiendo "${file.name}"...`;
    }

    try {
      const fetchFn = (window.authManager && window.authManager.fetch) ? window.authManager.fetch.bind(window.authManager) : window.fetch;
      const res = await fetchFn('/api/files/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        await this.fetchDatasets();
        this.onDatasetChanged(data.dataset);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      console.error('Error al subir archivo:', err);
      alert('Error de conexión al subir archivo.');
    } finally {
      if (primaryTextEl) primaryTextEl.innerHTML = prevText;
      if (this.fileInput) this.fileInput.value = '';
    }
  }
}

window.FilesManager = FilesManager;
