/**
 * Controlador de Visualizaciones Analíticas (Dashboard Ejecutivo)
 * Sin emojis, diseño sobrio de nivel empresarial
 */
class DashboardController {
  constructor() {
    this.overlay = document.getElementById('dashboard-overlay');
    this.backdrop = document.getElementById('dashboard-backdrop');
    this.closeBtn = document.getElementById('btn-close-dashboard');
    this.exportBtn = document.getElementById('btn-export-chart');
    
    this.titleEl = document.getElementById('dashboard-title');
    this.subtitleEl = document.getElementById('dashboard-subtitle');
    this.vizIconEl = document.getElementById('dashboard-viz-icon');
    this.timestampEl = document.getElementById('dashboard-timestamp');
    this.explanationEl = document.getElementById('chart-explanation');
    
    this.chartCanvas = document.getElementById('main-chart-canvas');
    this.chartCard = document.getElementById('chart-card');
    this.emptyState = document.getElementById('dashboard-empty-state');
    this.kpiContainer = document.getElementById('kpi-container');
    this.kpiGrid = document.getElementById('kpi-cards-grid');
    this.kpiTitle = document.getElementById('kpi-section-title');
    
    this.tableContainer = document.getElementById('table-container');
    this.tableHead = document.getElementById('data-table-head');
    this.tableBody = document.getElementById('data-table-body');
    this.tableTitle = document.getElementById('table-section-title');

    this.chartInstance = null;
    this.initEvents();
  }

  hideAllSections() {
    if (this.emptyState) this.emptyState.classList.add('hidden');
    if (this.chartCard) this.chartCard.classList.add('hidden');
    if (this.kpiContainer) this.kpiContainer.classList.add('hidden');
    if (this.tableContainer) this.tableContainer.classList.add('hidden');
  }

  initEvents() {
    if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.close());
    if (this.backdrop) this.backdrop.addEventListener('click', () => this.close());
    if (this.exportBtn) this.exportBtn.addEventListener('click', () => this.exportImage());
  }

  open() {
    if (this.overlay) {
      this.overlay.classList.remove('hidden');
      document.body.classList.add('has-open-dashboard');
    }
  }

  close() {
    if (this.overlay) {
      this.overlay.classList.add('hidden');
      document.body.classList.remove('has-open-dashboard');
    }
  }

  toggle() {
    if (this.overlay) {
      const isHidden = this.overlay.classList.toggle('hidden');
      document.body.classList.toggle('has-open-dashboard', !isHidden);
    }
  }

  updateTimestamp() {
    const now = new Date();
    this.timestampEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  setVizIcon(type) {
    if (!this.vizIconEl) return;
    let svg = '';
    if (type === 'line') {
      svg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>`;
    } else if (type === 'pie' || type === 'doughnut') {
      svg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>`;
    } else if (type === 'table') {
      svg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>`;
    } else if (type === 'kpi') {
      svg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`;
    } else {
      svg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`;
    }
    this.vizIconEl.innerHTML = svg;
  }

  renderChart(args) {
    this.open();
    this.updateTimestamp();
    this.setVizIcon(args.type || 'bar');

    this.titleEl.textContent = args.title || 'Visualización de Datos';
    this.subtitleEl.textContent = `Gráfico: ${String(args.type || 'bar').toUpperCase()}`;

    this.explanationEl.textContent = args.description || 'Análisis computado a partir de los datos tabulares activos.';
    this.explanationEl.style.display = args.description ? 'block' : 'none';

    this.hideAllSections();
    this.chartCard.classList.remove('hidden');

    // Paleta ejecutiva sobria: Ice Steel, Indigo, Slate, Mint, Amber
    const executiveColors = [
      '#38bdf8', // Ice Blue
      '#818cf8', // Indigo
      '#94a3b8', // Slate
      '#34d399', // Mint
      '#f59e0b', // Amber
      '#64748b'  // Dark slate
    ];

    const ctx = this.chartCanvas.getContext('2d');
    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    const datasets = (args.datasets || []).map((ds, index) => {
      const color = ds.borderColor || executiveColors[index % executiveColors.length];
      const isLine = args.type === 'line';

      let bg = ds.backgroundColor;
      if (!bg) {
        if (args.type === 'bar') {
          bg = args.datasets.length === 1
            ? args.labels.map((_, i) => executiveColors[i % executiveColors.length] + 'b3')
            : color + '99';
        } else if (args.type === 'pie' || args.type === 'doughnut') {
          bg = args.labels.map((_, i) => executiveColors[i % executiveColors.length] + 'cc');
        } else if (isLine) {
          bg = color + '15';
        } else {
          bg = color + '33';
        }
      }

      return {
        label: ds.label || 'Serie ' + (index + 1),
        data: ds.data,
        borderColor: color,
        backgroundColor: bg,
        borderWidth: 1.5,
        tension: 0.25,
        fill: isLine,
        pointBackgroundColor: color,
        pointBorderColor: '#090a0d',
        pointBorderWidth: 1.5,
        pointRadius: 3.5,
        pointHoverRadius: 5
      };
    });

    const isCircular = args.type === 'pie' || args.type === 'doughnut';

    this.chartInstance = new Chart(ctx, {
      type: args.type || 'bar',
      data: {
        labels: args.labels || [],
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 600,
          easing: 'easeOutCubic'
        },
        plugins: {
          legend: {
            display: !isCircular && datasets.length > 1,
            labels: {
              color: '#94a3b8',
              font: { family: 'Inter', size: 11 },
              boxWidth: 12,
              padding: 14
            }
          },
          tooltip: {
            backgroundColor: '#131620',
            borderColor: 'rgba(255, 255, 255, 0.12)',
            borderWidth: 1,
            titleColor: '#f8fafc',
            bodyColor: '#94a3b8',
            padding: 10,
            cornerRadius: 6,
            titleFont: { family: 'Inter', weight: '600', size: 12 },
            bodyFont: { family: 'JetBrains Mono', size: 11 }
          }
        },
        scales: isCircular ? {} : {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 11 } }
          }
        }
      }
    });
  }

  renderKpiCards(args) {
    this.open();
    this.updateTimestamp();
    this.setVizIcon('kpi');

    if (args.title) {
      this.titleEl.textContent = args.title;
      this.kpiTitle.textContent = args.title;
    }

    this.hideAllSections();
    this.kpiContainer.classList.remove('hidden');
    this.kpiGrid.innerHTML = '';

    const cards = args.cards || [];
    cards.forEach(card => {
      const cardEl = document.createElement('div');
      cardEl.className = 'kpi-card';

      const trendClass = card.trend === 'down' ? 'down' : card.trend === 'up' ? 'up' : 'neutral';
      const trendSymbol = card.trend === 'down' ? '↓' : card.trend === 'up' ? '↑' : '—';

      cardEl.innerHTML = `
        <div class="kpi-header">${card.title || 'Métrica'}</div>
        <div class="kpi-value">${card.value || '0'}</div>
        <div class="kpi-footer">
          ${card.change ? `<span class="kpi-change ${trendClass}">${trendSymbol} ${card.change}</span>` : ''}
          ${card.subtitle ? `<span class="kpi-sub">${card.subtitle}</span>` : ''}
        </div>
      `;
      this.kpiGrid.appendChild(cardEl);
    });
  }

  renderDataTable(args) {
    this.open();
    this.updateTimestamp();
    this.setVizIcon('table');

    if (args.title) {
      this.titleEl.textContent = args.title;
      this.tableTitle.textContent = args.title;
    }

    this.hideAllSections();
    this.tableContainer.classList.remove('hidden');

    this.tableHead.innerHTML = '';
    const trHead = document.createElement('tr');
    (args.headers || []).forEach(h => {
      const th = document.createElement('th');
      th.textContent = h;
      trHead.appendChild(th);
    });
    this.tableHead.appendChild(trHead);

    this.tableBody.innerHTML = '';
    (args.rows || []).forEach(row => {
      const tr = document.createElement('tr');
      row.forEach(cell => {
        const td = document.createElement('td');
        td.textContent = cell;
        tr.appendChild(td);
      });
      this.tableBody.appendChild(tr);
    });
  }

  exportImage() {
    if (!this.chartCanvas) return;
    const link = document.createElement('a');
    link.download = `aura-report-${Date.now()}.png`;
    link.href = this.chartCanvas.toDataURL('image/png');
    link.click();
  }
}

window.DashboardController = DashboardController;
