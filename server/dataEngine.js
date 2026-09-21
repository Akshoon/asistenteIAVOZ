const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const xlsx = require('xlsx');

class DataEngine {
  constructor(uploadsDir) {
    this.uploadsDir = uploadsDir;
    this.datasets = new Map();
    this.activeDatasetId = null;
    this.initSampleDatasets();
  }

  initSampleDatasets() {
    // Dataset 1: Ventas por Región y Categoría 2025
    const salesData = [
      { mes: 'Enero', region: 'Norte', categoria: 'Electrónica', ventas: 45000, unidades: 120, margen: 0.32 },
      { mes: 'Enero', region: 'Sur', categoria: 'Ropa', ventas: 28000, unidades: 340, margen: 0.45 },
      { mes: 'Enero', region: 'Centro', categoria: 'Hogar', ventas: 35000, unidades: 210, margen: 0.28 },
      { mes: 'Febrero', region: 'Norte', categoria: 'Electrónica', ventas: 52000, unidades: 145, margen: 0.34 },
      { mes: 'Febrero', region: 'Sur', categoria: 'Ropa', ventas: 31000, unidades: 380, margen: 0.46 },
      { mes: 'Febrero', region: 'Centro', categoria: 'Hogar', ventas: 42000, unidades: 250, margen: 0.30 },
      { mes: 'Marzo', region: 'Norte', categoria: 'Electrónica', ventas: 61000, unidades: 170, margen: 0.35 },
      { mes: 'Marzo', region: 'Sur', categoria: 'Ropa', ventas: 39000, unidades: 450, margen: 0.48 },
      { mes: 'Marzo', region: 'Centro', categoria: 'Hogar', ventas: 48000, unidades: 290, margen: 0.31 },
      { mes: 'Abril', region: 'Norte', categoria: 'Electrónica', ventas: 58000, unidades: 160, margen: 0.33 },
      { mes: 'Abril', region: 'Sur', categoria: 'Ropa', ventas: 34000, unidades: 410, margen: 0.44 },
      { mes: 'Abril', region: 'Centro', categoria: 'Hogar', ventas: 44000, unidades: 270, margen: 0.29 },
      { mes: 'Mayo', region: 'Norte', categoria: 'Electrónica', ventas: 72000, unidades: 195, margen: 0.37 },
      { mes: 'Mayo', region: 'Sur', categoria: 'Ropa', ventas: 46000, unidades: 520, margen: 0.49 },
      { mes: 'Mayo', region: 'Centro', categoria: 'Hogar', ventas: 53000, unidades: 320, margen: 0.32 },
      { mes: 'Junio', region: 'Norte', categoria: 'Electrónica', ventas: 85000, unidades: 230, margen: 0.38 },
      { mes: 'Junio', region: 'Sur', categoria: 'Ropa', ventas: 51000, unidades: 580, margen: 0.50 },
      { mes: 'Junio', region: 'Centro', categoria: 'Hogar', ventas: 62000, unidades: 370, margen: 0.33 }
    ];

    const salesId = 'sample-ventas-2025';
    this.registerDataset(salesId, 'Ventas_Comerciales_2025.csv', salesData, 'Dataset de ventas mensuales por región y categoría de producto');
    this.activeDatasetId = null; // Ningún dataset activo por defecto

    // Dataset 2: Métricas SaaS & KPIs
    const saasKpiData = [
      { mes: 'Ene', mrr: 125000, arr: 1500000, nuevos_clientes: 45, churn_rate: 0.024, ltv: 3200, cac: 450, nps: 68 },
      { mes: 'Feb', mrr: 138000, arr: 1656000, nuevos_clientes: 52, churn_rate: 0.021, ltv: 3350, cac: 430, nps: 71 },
      { mes: 'Mar', mrr: 154000, arr: 1848000, nuevos_clientes: 61, churn_rate: 0.019, ltv: 3500, cac: 410, nps: 74 },
      { mes: 'Abr', mrr: 169000, arr: 2028000, nuevos_clientes: 58, churn_rate: 0.018, ltv: 3620, cac: 395, nps: 76 },
      { mes: 'May', mrr: 188000, arr: 2256000, nuevos_clientes: 74, churn_rate: 0.016, ltv: 3780, cac: 380, nps: 79 },
      { mes: 'Jun', mrr: 212000, arr: 2544000, nuevos_clientes: 88, churn_rate: 0.015, ltv: 3950, cac: 360, nps: 82 }
    ];

    const saasId = 'sample-kpis-saas';
    this.registerDataset(saasId, 'Metricas_Financieras_SaaS.json', saasKpiData, 'Métricas clave de negocio: MRR, Churn, LTV, CAC, NPS');
  }

  registerDataset(id, name, rows, description = '') {
    if (!rows || rows.length === 0) return null;

    const columns = Object.keys(rows[0]);
    const summary = this.computeSummary(rows, columns);

    const dataset = {
      id,
      name,
      rowCount: rows.length,
      columns,
      summary,
      description,
      rows: rows,
      preview: rows.slice(0, 5),
      createdAt: new Date().toISOString()
    };

    this.datasets.set(id, dataset);
    return dataset;
  }

  computeSummary(rows, columns) {
    const summary = {};

    for (const col of columns) {
      const values = rows.map(r => r[col]).filter(v => v !== null && v !== undefined && v !== '');
      const sample = values[0];
      const isNumber = values.every(v => typeof v === 'number' || !isNaN(Number(v)));

      if (isNumber && values.length > 0) {
        const numValues = values.map(v => Number(v));
        const min = Math.min(...numValues);
        const max = Math.max(...numValues);
        const sum = numValues.reduce((a, b) => a + b, 0);
        const avg = sum / numValues.length;

        summary[col] = {
          type: 'number',
          min: Math.round(min * 100) / 100,
          max: Math.round(max * 100) / 100,
          avg: Math.round(avg * 100) / 100,
          total: Math.round(sum * 100) / 100
        };
      } else {
        const uniqueValues = [...new Set(values.map(v => String(v)))];
        summary[col] = {
          type: 'string',
          uniqueCount: uniqueValues.length,
          sampleValues: uniqueValues.slice(0, 6)
        };
      }
    }

    return summary;
  }

  processUploadedFile(filePath, originalName) {
    const ext = path.extname(originalName).toLowerCase();
    const id = 'dataset_' + Date.now();
    let rows = [];

    if (ext === '.csv') {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      rows = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        cast: true
      });
    } else if (ext === '.xlsx' || ext === '.xls') {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    } else if (ext === '.json') {
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(content);
      rows = Array.isArray(parsed) ? parsed : [parsed];
    } else {
      throw new Error(`Formato no soportado: ${ext}. Usa .csv, .xlsx, o .json.`);
    }

    const dataset = this.registerDataset(id, originalName, rows, `Archivo subido: ${originalName}`);
    this.activeDatasetId = id;
    return dataset;
  }

  getActiveDataset() {
    if (!this.activeDatasetId) {
      return null;
    }
    return this.datasets.get(this.activeDatasetId);
  }

  setActiveDataset(id) {
    if (!id || id === 'none') {
      this.activeDatasetId = null;
      return { id: null, name: 'Ninguno' };
    }
    if (this.datasets.has(id)) {
      this.activeDatasetId = id;
      return this.datasets.get(id);
    }
    return null;
  }

  getAllDatasets() {
    return Array.from(this.datasets.values()).map(d => ({
      id: d.id,
      name: d.name,
      rowCount: d.rowCount,
      columns: d.columns,
      createdAt: d.createdAt,
      isActive: d.id === this.activeDatasetId
    }));
  }

  getPromptContext() {
    const active = this.getActiveDataset();
    if (!active) {
      return 'INFORMACIÓN DE FUENTES DE DATOS: Actualmente el usuario NO tiene ningún dataset ni archivo seleccionado. Si el usuario te pregunta por sus datos o archivos, indícale amablemente y en una frase que puede seleccionar o subir su dataset desde el menú de Configuración. Si te solicita un informe o gráfico de demostración general, puedes generar un gráfico ilustrativo con datos analíticos representativos.';
    }

    return `
### DATASET ACTIVO DISPONIBLE PARA ANÁLISIS:
- **Nombre:** ${active.name} (${active.rowCount} filas)
- **Descripción:** ${active.description || 'Datos de negocio'}
- **Columnas y Tipos:**
${Object.entries(active.summary).map(([col, s]) => {
  if (s.type === 'number') {
    return `  * \`${col}\` (Numérico): min=${s.min}, max=${s.max}, promedio=${s.avg}, total=${s.total}`;
  } else {
    return `  * \`${col}\` (Texto): valores únicos: [${s.sampleValues.join(', ')}]`;
  }
}).join('\n')}

- **Primeras filas de muestra (preview):**
\`\`\`json
${JSON.stringify(active.preview, null, 2)}
\`\`\`
Cuando el usuario pregunte sobre ventas, métricas, productos o gráficos, utiliza los datos reales de este dataset.
`;
  }
}

module.exports = DataEngine;
