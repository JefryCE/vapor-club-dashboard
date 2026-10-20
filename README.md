# 🚀 VAPOR CLUB - Dashboard Logístico y Seguimiento de Entregas

Sistema interactivo web de alto impacto para el control, monitoreo y análisis en tiempo real de operaciones de despacho y entregas para **Vapor Club**, desarrollado bajo los lineamientos del **Manual de Identidad de Marca** y la estructura operativa del registro de despachos.

---

## 📸 Vista Previa del Sistema

* **Estética:** *Dark Mode* corporativo (`#111111`), acentos en Naranja Vapor (`#F36B21`), Amarillo Eléctrico (`#FFC629`) y Turquesa Digital (`#00CFCB`).
* **Tipografías:** **Montserrat** (Titulares, Identidad y Métricas Clave) + **Inter** (Data, Tablas y Tooltips).

---

## ✨ Características Principales

### 1. 📊 Tarjetas de KPIs Ejecutivos (Tiempo Real)
* **Total Pedidos:** Volumen consolidado del periodo con micro-animaciones.
* **Cumplimiento SLA (% On-Time):** Despachos en tiempo pactado (`<5H`, `<12H`, `24H`, `48H`).
* **Entregados con Éxito:** Conteo de clientes conformes y tasa porcentual.
* **En Ruta / Despacho:** Envíos con couriers y transportistas (`Italo B.`, express).
* **En Preparación:** Pedidos en cola de Picking & Packing.
* **Alertas & Quiebres de Stock:** Detección de pedidos con inventario incompleto y solicitudes a sedes VCG.

### 2. 🔍 Barra de Filtros Inteligentes Multi-Criterio
* Búsqueda global en vivo (por número de pedido, cliente, documento fiscal, transportista o destino).
* Filtros rápidos por Estado, Prioridad, Tipo de Destino (Almacén / Lima / Provincia), Vendedor, Stock e Intervalo de Fecha.
* Contador de filtros activos y botón de restablecimiento rápido.

### 3. 💬 Smart Floating Tooltips
* Al pasar el cursor sobre cualquier fila o tarjeta, un tooltip flotante con efecto *glassmorphism* muestra la trazabilidad completa: supervisor de validación, operarios de picking y packing, observaciones operativas y alertas de horario.

### 4. 📑 Múltiples Vistas Especializadas
* **Analítica & Rendimiento:** Gráficos interactivos en Chart.js (Flujo diario de pedidos vs despachos, donut de fases, desempeño de vendedores y destinos).
* **Pipeline de Despacho (Kanban):** Tablero visual interactivo dividido en *1. Validado ➔ 2. En Picking ➔ 3. En Packing ➔ 4. Con Transportista ➔ 5. Entregado*.
* **Matriz de Seguimiento (Data Grid Pro):** Tabla completa con ordenamiento por columnas, badges cromáticos, paginación dinámica y cambio de fases en un clic.
* **Operarios & Almacén:** Estadísticas de productividad por operario (`Yampier G.`, `Gsús U.`, `Gerardo V.`, `Rafael L.`) y protocolos logísticos.

### 5. 📥 Operaciones & Exportación
* **Nuevo Pedido:** Formulario modal para registrar nuevos envíos con guardado en `LocalStorage`.
* **Exportar a CSV/Excel:** Descarga inmediata de la data filtrada.
* **Impresión / PDF:** Vista optimizada para reportes ejecutivos.

---

## 🛠️ Tecnologías Utilizadas

* **HTML5 Semántico:** Estructura limpia y accesible.
* **Vanilla CSS (Design Tokens):** Paleta del manual de marca, degradados de neón y efecto *glassmorphism*.
* **JavaScript Moderno (ES6+):** Motor reactivo sin dependencias pesadas.
* **Chart.js:** Gráficos analíticos vectoriales responsivos.
* **Font Awesome 6:** Iconografía corporativa.
* **Google Fonts:** Montserrat e Inter.

---

## 🚀 Cómo Ejecutar Localmente

No requiere instalación de frameworks complejos. Simplemente abre `index.html` en tu navegador o levanta un servidor estático:

```bash
# Con Python
python -m http.server 8080

# O con npx serve
npx serve .
```

Luego accede a: `http://localhost:8080`

---

## 👥 Equipo y Operaciones

* **Empresa:** Vapor Club Perú
* **Validación & Calidad:** Rafael L.
* **Operaciones Almacén:** Gerardo V., Yampier G., Gsús U.
* **Comercial:** Francisco V., Oriana S., Lucia C.
