/**
 * VAPOR CLUB - DASHBOARD LOGÍSTICO Y SEGUIMIENTO DE ENTREGAS
 * Motor de Interactividad, Analítica y Filtros en Tiempo Real
 */

(function () {
  'use strict';

  // --- ESTADO GLOBAL DE LA APLICACIÓN ---
  let orders = [];
  let filteredOrders = [];
  let currentSort = { column: 'fechaPedido', ascending: false };
  let currentPage = 1;
  const pageSize = 10;

  // Chart instances
  let chartDaily = null;
  let chartDonut = null;
  let chartSellersInstance = null;
  let chartDestInstance = null;

  // --- INICIALIZACIÓN ---
  document.addEventListener('DOMContentLoaded', () => {
    loadOrdersData();
    initClock();
    initFilters();
    initTabs();
    initModals();
    initTableSorting();
    initExportAndPrint();
    initSmartTooltip();
    
    // Primer renderizado completo
    applyFilters();
  });

  // --- CARGA DE DATOS (LocalStorage con fallback a INITIAL_ORDERS) ---
  function loadOrdersData() {
    const saved = localStorage.getItem('vapor_club_orders_v1');
    if (saved) {
      try {
        orders = JSON.parse(saved);
      } catch (e) {
        orders = [...INITIAL_ORDERS];
      }
    } else {
      orders = [...INITIAL_ORDERS];
      saveOrdersToStorage();
    }
  }

  function saveOrdersToStorage() {
    localStorage.setItem('vapor_club_orders_v1', JSON.stringify(orders));
  }

  // --- RELOJ EN VIVO ---
  function initClock() {
    const clockEl = document.getElementById('liveClock');
    const updateTime = () => {
      const now = new Date();
      if (clockEl) {
        clockEl.textContent = now.toLocaleTimeString('es-PE', { hour12: false });
      }
    };
    updateTime();
    setInterval(updateTime, 1000);
  }

  // --- GESTIÓN DE VISTAS (TABS) ---
  function initTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const views = document.querySelectorAll('.view-content');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const viewId = tab.getAttribute('data-view');
        
        tabs.forEach(t => t.classList.remove('active'));
        views.forEach(v => v.classList.remove('active'));

        tab.classList.add('active');
        const targetView = document.getElementById(`view-${viewId}`);
        if (targetView) {
          targetView.classList.add('active');
        }

        // Redimensionar gráficos al cambiar a vista analítica
        if (viewId === 'analytics') {
          setTimeout(updateCharts, 50);
        }
      });
    });

    // Toggle de panel de filtros
    const toggleBtn = document.getElementById('toggleFiltersBtn');
    const filtersPanel = document.getElementById('filtersPanel');
    if (toggleBtn && filtersPanel) {
      toggleBtn.addEventListener('click', () => {
        const isHidden = window.getComputedStyle(filtersPanel).display === 'none';
        filtersPanel.style.display = isHidden ? 'block' : 'none';
      });
    }
  }

  // --- FILTROS EN TIEMPO REAL ---
  function initFilters() {
    const searchInput = document.getElementById('filterSearch');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const statusSelect = document.getElementById('filterStatus');
    const prioritySelect = document.getElementById('filterPriority');
    const destSelect = document.getElementById('filterDestination');
    const sellerSelect = document.getElementById('filterSeller');
    const stockSelect = document.getElementById('filterStock');
    const dateRangeSelect = document.getElementById('filterDateRange');
    const resetFiltersBtn = document.getElementById('btnResetFilters');

    // Búsqueda en vivo con debounce
    searchInput.addEventListener('input', () => {
      clearSearchBtn.style.display = searchInput.value ? 'block' : 'none';
      applyFilters();
    });

    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearSearchBtn.style.display = 'none';
      applyFilters();
    });

    // Eventos select
    [statusSelect, prioritySelect, destSelect, sellerSelect, stockSelect, dateRangeSelect].forEach(select => {
      select.addEventListener('change', () => applyFilters());
    });

    // Resetear filtros
    resetFiltersBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearSearchBtn.style.display = 'none';
      statusSelect.value = 'ALL';
      prioritySelect.value = 'ALL';
      destSelect.value = 'ALL';
      sellerSelect.value = 'ALL';
      stockSelect.value = 'ALL';
      dateRangeSelect.value = 'OCT_MONTH';
      applyFilters();
    });
  }

  function applyFilters() {
    const q = (document.getElementById('filterSearch').value || '').trim().toLowerCase();
    const status = document.getElementById('filterStatus').value;
    const priority = document.getElementById('filterPriority').value;
    const dest = document.getElementById('filterDestination').value;
    const seller = document.getElementById('filterSeller').value;
    const stock = document.getElementById('filterStock').value;
    const dateRange = document.getElementById('filterDateRange').value;

    // Conteo de filtros activos para indicador
    let activeFilterCount = 0;
    if (q) activeFilterCount++;
    if (status !== 'ALL') activeFilterCount++;
    if (priority !== 'ALL') activeFilterCount++;
    if (dest !== 'ALL') activeFilterCount++;
    if (seller !== 'ALL') activeFilterCount++;
    if (stock !== 'ALL') activeFilterCount++;
    if (dateRange !== 'OCT_MONTH') activeFilterCount++;

    const badgeIndicator = document.getElementById('filterActiveBadge');
    if (badgeIndicator) {
      if (activeFilterCount > 0) {
        badgeIndicator.style.display = 'inline-block';
        badgeIndicator.textContent = activeFilterCount;
      } else {
        badgeIndicator.style.display = 'none';
      }
    }

    // Filtrar dataset
    filteredOrders = orders.filter(item => {
      // 1. Buscador global (Nº Pedido, Docs, Cliente, Destino, Observaciones)
      if (q) {
        const textTarget = `${item.numPedido} ${item.docsRelacionados} ${item.cliente} ${item.destino} ${item.vendedor} ${item.transportista} ${item.observaciones}`.toLowerCase();
        if (!textTarget.includes(q)) return false;
      }

      // 2. Estado
      if (status !== 'ALL') {
        if (status === 'INCIDENCIA') {
          if (item.estadoFinal !== 'INCIDENCIA' && item.stockCompleto !== 'INCOMPLETO') return false;
        } else if (item.estadoFinal !== status) {
          return false;
        }
      }

      // 3. Prioridad
      if (priority !== 'ALL' && item.prioridad !== priority) {
        return false;
      }

      // 4. Destino
      if (dest !== 'ALL') {
        if (dest === 'ALMACEN' && item.tipoDestino !== 'ALMACEN') return false;
        if (dest === 'LIMA' && item.tipoDestino !== 'LIMA') return false;
        if (dest === 'PROVINCIA' && item.tipoDestino !== 'PROVINCIA') return false;
      }

      // 5. Vendedor
      if (seller !== 'ALL' && item.vendedor !== seller) {
        return false;
      }

      // 6. Stock
      if (stock !== 'ALL' && item.stockCompleto !== stock) {
        return false;
      }

      // 7. Rango de Fechas
      if (dateRange === 'TODAY') {
        if (item.fechaPedido !== '2026-10-19') return false;
      } else if (dateRange === 'OCT_WEEK') {
        if (item.fechaPedido < '2026-10-15' || item.fechaPedido > '2026-10-19') return false;
      } else if (dateRange === 'OCT_MONTH') {
        if (!item.fechaPedido.startsWith('2026-10')) return false;
      }

      return true;
    });

    // Ordenar dataset
    sortOrdersArray();

    // Actualizar todas las secciones
    updateKPICards();
    renderDataGrid();
    renderKanban();
    renderWarehouseView();
    updateCharts();
    renderIncidentsFeed();
  }

  // --- CÁLCULO Y ACTUALIZACIÓN DE KPIS ---
  function updateKPICards() {
    const total = filteredOrders.length;
    const delivered = filteredOrders.filter(o => o.estadoFinal === 'ENTREGADO').length;
    const inTransit = filteredOrders.filter(o => o.estadoFinal === 'EN RUTA').length;
    const inPrep = filteredOrders.filter(o => o.estadoFinal === 'EN PREPARACION' || o.estadoFinal === 'LISTO PARA RECOJO').length;
    const stockIssues = filteredOrders.filter(o => o.stockCompleto === 'INCOMPLETO' || o.estadoFinal === 'INCIDENCIA').length;

    // Cumplimiento SLA: pedidos entregados en <= 48H o prioritarios en tiempo
    const validDeliveries = filteredOrders.filter(o => o.estadoFinal === 'ENTREGADO');
    let slaSuccessCount = 0;
    validDeliveries.forEach(o => {
      if (o.sla === '<5 H' || o.sla === '<12 H' || o.sla === '24 H' || o.sla === '48 H') {
        slaSuccessCount++;
      }
    });

    const slaPct = validDeliveries.length > 0 
      ? Math.round((slaSuccessCount / validDeliveries.length) * 100) 
      : 100;

    const deliveredPct = total > 0 ? Math.round((delivered / total) * 100) : 0;

    // Animar contadores
    animateNumber('kpiTotal', total);
    animateNumber('kpiDelivered', delivered);
    animateNumber('kpiInTransit', inTransit);
    animateNumber('kpiInPrep', inPrep);
    animateNumber('kpiStockIssues', stockIssues);

    const slaRateEl = document.getElementById('kpiSlaRate');
    if (slaRateEl) slaRateEl.textContent = `${slaPct}%`;
    const slaBarEl = document.getElementById('kpiSlaBar');
    if (slaBarEl) slaBarEl.style.width = `${slaPct}%`;

    const delPctEl = document.getElementById('kpiDeliveredPct');
    if (delPctEl) delPctEl.textContent = `${deliveredPct}% del total`;

    // Conteo en tab
    const tabCount = document.getElementById('tabGridCount');
    if (tabCount) tabCount.textContent = total;
  }

  function animateNumber(elementId, targetVal) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const startVal = parseInt(el.textContent.replace(/\D/g, '') || 0, 10);
    const duration = 400;
    const startTime = performance.now();

    const step = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const current = Math.floor(startVal + (targetVal - startVal) * progress);
      el.textContent = current;
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = targetVal;
      }
    };
    requestAnimationFrame(step);
  }

  // --- RENDERIZADO: MATRIZ DE SEGUIMIENTO (TABLA) ---
  function renderDataGrid() {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const total = filteredOrders.length;
    const startIdx = (currentPage - 1) * pageSize;
    const endIdx = Math.min(startIdx + pageSize, total);
    const pagedItems = filteredOrders.slice(startIdx, endIdx);

    if (pagedItems.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="12" style="text-align:center; padding: 3rem 1rem; color: var(--text-muted);">
            <i class="fa-solid fa-magnifying-glass" style="font-size: 2rem; margin-bottom: 0.8rem; display:block; opacity:0.4;"></i>
            No se encontraron pedidos que coincidan con los filtros seleccionados.
          </td>
        </tr>`;
      renderPagination(0, 0, 0);
      return;
    }

    pagedItems.forEach(item => {
      const tr = document.createElement('tr');
      tr.className = 'table-row-item';
      tr.setAttribute('data-order-id', item.id);

      // Status Badge
      let statusBadge = '';
      if (item.estadoFinal === 'ENTREGADO') {
        statusBadge = `<span class="badge badge-entregado"><i class="fa-solid fa-circle-check"></i> ENTREGADO</span>`;
      } else if (item.estadoFinal === 'EN RUTA') {
        statusBadge = `<span class="badge badge-en-ruta"><i class="fa-solid fa-truck-fast"></i> EN RUTA</span>`;
      } else if (item.estadoFinal === 'LISTO PARA RECOJO') {
        statusBadge = `<span class="badge badge-recojo"><i class="fa-solid fa-box-archive"></i> RECOJO ALM.</span>`;
      } else if (item.estadoFinal === 'INCIDENCIA') {
        statusBadge = `<span class="badge badge-alerta"><i class="fa-solid fa-triangle-exclamation"></i> ALERTA</span>`;
      } else {
        statusBadge = `<span class="badge badge-prep"><i class="fa-solid fa-clock"></i> EN PREP.</span>`;
      }

      // Priority Badge
      let priorityBadge = '';
      if (item.prioridad === 'PRIORITARIO') {
        priorityBadge = `<span class="badge badge-prioritario"><i class="fa-solid fa-bolt"></i> PRIORITARIO</span>`;
      } else if (item.prioridad === '24 H') {
        priorityBadge = `<span class="badge badge-24h">24 H</span>`;
      } else {
        priorityBadge = `<span class="badge badge-48h">48 H</span>`;
      }

      // Stock Badge
      const isStockOk = item.stockCompleto === 'COMPLETO';
      const stockBadge = isStockOk 
        ? `<span class="badge-stock-ok"><i class="fa-solid fa-check"></i> Completo</span>`
        : `<span class="badge-stock-fail"><i class="fa-solid fa-xmark"></i> Incompleto</span>`;

      // Formato Fecha
      const displayDate = item.fechaPedido ? item.fechaPedido.split('-').reverse().join('/') : '--';

      tr.innerHTML = `
        <td><span class="order-badge-id">#${item.numPedido}</span></td>
        <td>
          <div style="font-weight:600;">${displayDate}</div>
          <div style="font-size:0.7rem; color:var(--text-muted);">${item.horaPedido || '--'}</div>
        </td>
        <td><span class="doc-pill">${item.docsRelacionados}</span></td>
        <td><span class="client-name-cell">${item.cliente}</span></td>
        <td><span style="font-size:0.78rem; font-weight:600; color:var(--orange-vapor);">${item.vendedor}</span></td>
        <td>
          <div style="font-weight:600; font-size:0.78rem;">${item.destino}</div>
          <div style="font-size:0.68rem; color:var(--text-muted);"><i class="fa-solid fa-truck"></i> ${item.transportista || 'Pendiente'}</div>
        </td>
        <td>${priorityBadge}</td>
        <td>
          <div style="font-size:0.74rem;"><strong>Pick:</strong> ${item.picking || '--'}</div>
          <div style="font-size:0.74rem; color:var(--text-muted);"><strong>Pack:</strong> ${item.packing || '--'}</div>
        </td>
        <td>${stockBadge}</td>
        <td>${statusBadge}</td>
        <td><strong style="color:${item.sla === '<5 H' ? 'var(--turquoise-digital)' : 'inherit'}; font-size:0.75rem;">${item.sla || 'Pendiente'}</strong></td>
        <td>
          <div class="actions-cell">
            <button class="btn-action-icon btn-view-detail" title="Ver detalle completo" data-id="${item.id}">
              <i class="fa-solid fa-eye"></i>
            </button>
            <button class="btn-action-icon btn-status-next" title="Cambiar a siguiente fase" data-id="${item.id}">
              <i class="fa-solid fa-forward-step"></i>
            </button>
          </div>
        </td>
      `;

      // Eventos clic
      tr.addEventListener('click', (e) => {
        if (!e.target.closest('.btn-action-icon')) {
          showOrderDetailModal(item.id);
        }
      });

      tbody.appendChild(tr);
    });

    // Botones de acción dentro de la tabla
    document.querySelectorAll('.btn-view-detail').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        showOrderDetailModal(btn.getAttribute('data-id'));
      });
    });

    document.querySelectorAll('.btn-status-next').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        advanceOrderStatus(btn.getAttribute('data-id'));
      });
    });

    renderPagination(total, startIdx + 1, endIdx);

    const metaEl = document.getElementById('tableFilterMeta');
    if (metaEl) {
      metaEl.textContent = `Mostrando ${filteredOrders.length} pedidos según criterios activos`;
    }
  }

  function advanceOrderStatus(orderId) {
    const item = orders.find(o => o.id === orderId);
    if (!item) return;

    if (item.estadoFinal === 'EN PREPARACION') {
      item.estadoFinal = 'EN RUTA';
      item.fechaDespacho = '2026-10-19';
      item.horaDespacho = '15:00 pm';
    } else if (item.estadoFinal === 'EN RUTA' || item.estadoFinal === 'LISTO PARA RECOJO') {
      item.estadoFinal = 'ENTREGADO';
      item.sla = '24 H';
    } else if (item.estadoFinal === 'INCIDENCIA') {
      item.stockCompleto = 'COMPLETO';
      item.estadoFinal = 'EN PREPARACION';
      item.observaciones += ' [Stock regularizado desde sedes]';
    }
    saveOrdersToStorage();
    applyFilters();
  }

  function renderPagination(total, start, end) {
    const infoEl = document.getElementById('paginationInfo');
    const controlsEl = document.getElementById('paginationControls');
    if (!infoEl || !controlsEl) return;

    if (total === 0) {
      infoEl.textContent = '0 pedidos';
      controlsEl.innerHTML = '';
      return;
    }

    infoEl.textContent = `Mostrando ${start} - ${end} de ${total} pedidos`;
    const totalPages = Math.ceil(total / pageSize);
    controlsEl.innerHTML = '';

    if (totalPages <= 1) return;

    const group = document.createElement('div');
    group.className = 'pagination-btn-group';

    for (let p = 1; p <= totalPages; p++) {
      const btn = document.createElement('button');
      btn.className = `btn-page ${p === currentPage ? 'active' : ''}`;
      btn.textContent = p;
      btn.addEventListener('click', () => {
        currentPage = p;
        renderDataGrid();
      });
      group.appendChild(btn);
    }
    controlsEl.appendChild(group);
  }

  // --- ORDENAMIENTO DE TABLA ---
  function initTableSorting() {
    const headers = document.querySelectorAll('.vapor-table th[data-sort]');
    headers.forEach(th => {
      th.addEventListener('click', () => {
        const col = th.getAttribute('data-sort');
        if (currentSort.column === col) {
          currentSort.ascending = !currentSort.ascending;
        } else {
          currentSort.column = col;
          currentSort.ascending = true;
        }
        sortOrdersArray();
        renderDataGrid();
      });
    });
  }

  function sortOrdersArray() {
    const { column, ascending } = currentSort;
    filteredOrders.sort((a, b) => {
      let valA = a[column] || '';
      let valB = b[column] || '';

      if (column === 'numPedido') {
        valA = parseFloat(valA) || 0;
        valB = parseFloat(valB) || 0;
      }

      if (valA < valB) return ascending ? -1 : 1;
      if (valA > valB) return ascending ? 1 : -1;
      return 0;
    });
  }

  // --- RENDERIZADO: PIPELINE (KANBAN BOARD) ---
  function renderKanban() {
    const stages = {
      'VALIDADO': [],
      'PICKING': [],
      'PACKING': [],
      'EN RUTA': [],
      'ENTREGADO': []
    };

    filteredOrders.forEach(o => {
      if (o.estadoFinal === 'ENTREGADO') {
        stages['ENTREGADO'].push(o);
      } else if (o.estadoFinal === 'EN RUTA') {
        stages['EN RUTA'].push(o);
      } else if (o.estadoFinal === 'LISTO PARA RECOJO') {
        stages['PACKING'].push(o);
      } else if (o.estadoFinal === 'EN PREPARACION') {
        if (!o.packing || o.packing === 'Pendiente') {
          stages['PICKING'].push(o);
        } else {
          stages['PACKING'].push(o);
        }
      } else {
        stages['VALIDADO'].push(o);
      }
    });

    const colKeys = [
      { key: 'VALIDADO', countId: 'count-validado', cardsId: 'cards-validado' },
      { key: 'PICKING', countId: 'count-picking', cardsId: 'cards-picking' },
      { key: 'PACKING', countId: 'count-packing', cardsId: 'cards-packing' },
      { key: 'EN RUTA', countId: 'count-enruta', cardsId: 'cards-enruta' },
      { key: 'ENTREGADO', countId: 'count-entregado', cardsId: 'cards-entregado' }
    ];

    colKeys.forEach(col => {
      const countEl = document.getElementById(col.countId);
      const cardsEl = document.getElementById(col.cardsId);
      if (countEl) countEl.textContent = stages[col.key].length;
      if (cardsEl) {
        cardsEl.innerHTML = '';
        stages[col.key].forEach(order => {
          const card = document.createElement('div');
          card.className = 'kanban-card';
          card.setAttribute('data-order-id', order.id);

          const isStockOk = order.stockCompleto === 'COMPLETO';
          const stockDot = isStockOk 
            ? `<span style="color:var(--green-success);"><i class="fa-solid fa-check"></i></span>`
            : `<span style="color:var(--red-alert);"><i class="fa-solid fa-triangle-exclamation"></i></span>`;

          card.innerHTML = `
            <div class="card-top-row">
              <span class="card-order-id">#${order.numPedido} • ${order.docsRelacionados.split('/')[0]}</span>
              <span class="card-dest-badge">${order.tipoDestino}</span>
            </div>
            <div class="card-client-name">${order.cliente}</div>
            <div style="font-size:0.72rem; color:var(--text-muted); margin-bottom:0.25rem;">
              <i class="fa-solid fa-location-dot"></i> ${order.destino}
            </div>
            <div class="card-meta-row">
              <div class="card-operator-tag">
                <i class="fa-solid fa-user-gear"></i> ${order.picking || 'Almacén'}
              </div>
              <div>${stockDot} ${order.prioridad}</div>
            </div>
          `;

          card.addEventListener('click', () => showOrderDetailModal(order.id));
          cardsEl.appendChild(card);
        });
      }
    });
  }

  // --- RENDERIZADO: OPERARIOS & ALMACÉN ---
  function renderWarehouseView() {
    const tbody = document.getElementById('operatorsTableBody');
    if (!tbody) return;

    // Calcular estadísticas por operario
    const operators = {};
    const defaultOps = ['Yampier G.', 'Gsús U.', 'Gerardo V.', 'Rafael L.'];
    defaultOps.forEach(op => {
      operators[op] = { picking: 0, packing: 0, total: 0 };
    });

    filteredOrders.forEach(o => {
      if (o.picking && operators[o.picking]) {
        operators[o.picking].picking++;
        operators[o.picking].total++;
      }
      if (o.packing && operators[o.packing]) {
        operators[o.packing].packing++;
        operators[o.packing].total++;
      }
    });

    tbody.innerHTML = '';
    Object.keys(operators).forEach(opName => {
      const stats = operators[opName];
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong style="color:#FFF;">${opName}</strong></td>
        <td><span class="badge badge-prep">${stats.picking} pedidos</span></td>
        <td><span class="badge badge-24h">${stats.packing} pedidos</span></td>
        <td><strong>${stats.total}</strong></td>
        <td><span style="color:var(--turquoise-digital); font-size:0.74rem;"><i class="fa-solid fa-circle"></i> Activo en Almacén</span></td>
      `;
      tbody.appendChild(tr);
    });

    // Transportistas
    const couriersListEl = document.getElementById('couriersList');
    if (couriersListEl) {
      const couriersCount = {};
      filteredOrders.forEach(o => {
        const c = o.transportista || 'Sin Asignar';
        couriersCount[c] = (couriersCount[c] || 0) + 1;
      });

      couriersListEl.innerHTML = '';
      Object.keys(couriersCount).forEach(cName => {
        const item = document.createElement('div');
        item.className = 'courier-item';
        item.innerHTML = `
          <div class="courier-name">
            <i class="fa-solid fa-truck text-yellow"></i>
            <span>${cName}</span>
          </div>
          <div class="courier-orders">
            ${couriersCount[cName]} envíos registrados
          </div>
        `;
        couriersListEl.appendChild(item);
      });
    }
  }

  // --- BITÁCORA OPERATIVA DE OBSERVACIONES ---
  function renderIncidentsFeed() {
    const feedContainer = document.getElementById('feedListContainer');
    if (!feedContainer) return;

    const ordersWithObs = filteredOrders.filter(o => o.observaciones && o.observaciones.trim().length > 0);

    feedContainer.innerHTML = '';
    if (ordersWithObs.length === 0) {
      feedContainer.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:1.5rem; color:var(--text-muted); font-size:0.8rem;">No hay observaciones registradas en los pedidos filtrados.</div>`;
      return;
    }

    ordersWithObs.forEach(o => {
      const item = document.createElement('div');
      const isAlert = o.stockCompleto === 'INCOMPLETO' || o.estadoFinal === 'INCIDENCIA';
      const isPriority = o.prioridad === 'PRIORITARIO';

      item.className = `feed-item ${isAlert ? 'feed-alert' : (isPriority ? 'feed-priority' : '')}`;
      item.innerHTML = `
        <div class="feed-item-top">
          <span class="feed-item-client">#${o.numPedido} • ${o.cliente}</span>
          <span class="feed-item-badge">${o.docsRelacionados.split('/')[0]}</span>
        </div>
        <div class="feed-item-desc">${o.observaciones}</div>
      `;
      feedContainer.appendChild(item);
    });
  }

  // --- ACTUALIZACIÓN DE GRÁFICOS (CHART.JS) ---
  function updateCharts() {
    if (typeof Chart === 'undefined') return;

    // Configuración global de fuentes y colores Chart.js
    Chart.defaults.color = '#9E9EA8';
    Chart.defaults.font.family = "'Inter', sans-serif";

    // 1. Chart Flujo Diario (Recepción vs Despacho)
    const ctxDaily = document.getElementById('chartDailyOrders');
    if (ctxDaily) {
      const dates = ['14/10', '15/10', '16/10', '17/10', '18/10', '19/10'];
      const ordersReceived = [2, 2, 2, 1, 0, 5];
      const ordersDispatched = [1, 1, 0, 3, 0, 2];

      if (chartDaily) chartDaily.destroy();

      chartDaily = new Chart(ctxDaily, {
        type: 'bar',
        data: {
          labels: dates,
          datasets: [
            {
              label: 'Pedidos Recibidos',
              data: ordersReceived,
              backgroundColor: 'rgba(243, 107, 33, 0.75)',
              borderColor: '#F36B21',
              borderRadius: 6,
              borderWidth: 1.5
            },
            {
              label: 'Pedidos Despachados',
              data: ordersDispatched,
              backgroundColor: 'rgba(0, 207, 203, 0.75)',
              borderColor: '#00CFCB',
              borderRadius: 6,
              borderWidth: 1.5
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: {
                boxWidth: 12,
                font: { weight: '600', size: 11 }
              }
            }
          },
          scales: {
            x: {
              grid: { color: 'rgba(255, 255, 255, 0.05)' }
            },
            y: {
              beginAtZero: true,
              ticks: { stepSize: 1 },
              grid: { color: 'rgba(255, 255, 255, 0.05)' }
            }
          }
        }
      });
    }

    // 2. Chart Donut de Estados
    const ctxDonut = document.getElementById('chartStatusDonut');
    if (ctxDonut) {
      let ent = 0, ruta = 0, prep = 0, alerta = 0;
      filteredOrders.forEach(o => {
        if (o.estadoFinal === 'ENTREGADO') ent++;
        else if (o.estadoFinal === 'EN RUTA') ruta++;
        else if (o.estadoFinal === 'INCIDENCIA' || o.stockCompleto === 'INCOMPLETO') alerta++;
        else prep++;
      });

      if (chartDonut) chartDonut.destroy();

      chartDonut = new Chart(ctxDonut, {
        type: 'doughnut',
        data: {
          labels: ['Entregados', 'En Ruta', 'En Preparación', 'Alertas / Stock'],
          datasets: [{
            data: [ent, ruta, prep, alerta],
            backgroundColor: [
              '#10B981', // green
              '#3B82F6', // blue
              '#F36B21', // orange
              '#FF4D4D'  // red
            ],
            borderColor: '#141418',
            borderWidth: 3,
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                boxWidth: 10,
                font: { weight: '600', size: 10 }
              }
            }
          },
          cutout: '70%'
        }
      });
    }

    // 3. Chart Rendimiento Asesores
    const ctxSellers = document.getElementById('chartSellers');
    if (ctxSellers) {
      const sellers = { 'FRANCISCO V.': 0, 'ORIANA S.': 0, 'LUCIA C.': 0 };
      filteredOrders.forEach(o => {
        if (sellers[o.vendedor] !== undefined) sellers[o.vendedor]++;
      });

      if (chartSellersInstance) chartSellersInstance.destroy();

      chartSellersInstance = new Chart(ctxSellers, {
        type: 'bar',
        data: {
          labels: Object.keys(sellers),
          datasets: [{
            label: 'Pedidos Gestionados',
            data: Object.values(sellers),
            backgroundColor: [
              'rgba(255, 198, 41, 0.8)',
              'rgba(243, 107, 33, 0.8)',
              'rgba(0, 207, 203, 0.8)'
            ],
            borderRadius: 6
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: {
              beginAtZero: true,
              ticks: { stepSize: 1 },
              grid: { color: 'rgba(255, 255, 255, 0.05)' }
            },
            y: {
              grid: { display: false }
            }
          }
        }
      });
    }

    // 4. Chart Destinos
    const ctxDest = document.getElementById('chartDestinations');
    if (ctxDest) {
      const destCounts = {
        'Agencias Provincia': 0,
        'Lima (Oficina/Domicilio)': 0,
        'Recojo Almacén': 0
      };

      filteredOrders.forEach(o => {
        if (o.tipoDestino === 'PROVINCIA') destCounts['Agencias Provincia']++;
        else if (o.tipoDestino === 'LIMA') destCounts['Lima (Oficina/Domicilio)']++;
        else destCounts['Recojo Almacén']++;
      });

      if (chartDestInstance) chartDestInstance.destroy();

      chartDestInstance = new Chart(ctxDest, {
        type: 'bar',
        data: {
          labels: Object.keys(destCounts),
          datasets: [{
            data: Object.values(destCounts),
            backgroundColor: [
              'rgba(243, 107, 33, 0.75)',
              'rgba(0, 207, 203, 0.75)',
              'rgba(255, 198, 41, 0.75)'
            ],
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { stepSize: 1 },
              grid: { color: 'rgba(255, 255, 255, 0.05)' }
            },
            x: {
              grid: { display: false }
            }
          }
        }
      });
    }
  }

  // --- SMART FLOATING TOOLTIP CON INFORMACIÓN ENRIQUECIDA ---
  function initSmartTooltip() {
    const tooltip = document.getElementById('smartTooltip');
    if (!tooltip) return;

    let currentHoverTarget = null;

    document.addEventListener('mouseover', (e) => {
      const target = e.target.closest('[data-order-id]');
      if (target && target !== currentHoverTarget) {
        currentHoverTarget = target;
        const orderId = target.getAttribute('data-order-id');
        const order = orders.find(o => o.id === orderId);
        if (order) {
          renderTooltipContent(tooltip, order);
          tooltip.classList.add('active');
        }
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (tooltip.classList.contains('active')) {
        const offset = 18;
        let left = e.clientX + offset;
        let top = e.clientY + offset;

        // Limitar dentro del viewport
        const tipRect = tooltip.getBoundingClientRect();
        if (left + tipRect.width > window.innerWidth - 10) {
          left = e.clientX - tipRect.width - offset;
        }
        if (top + tipRect.height > window.innerHeight - 10) {
          top = e.clientY - tipRect.height - offset;
        }

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
      }
    });

    document.addEventListener('mouseout', (e) => {
      const target = e.target.closest('[data-order-id]');
      if (target && (!e.relatedTarget || !target.contains(e.relatedTarget))) {
        currentHoverTarget = null;
        tooltip.classList.remove('active');
      }
    });
  }

  function renderTooltipContent(tooltip, o) {
    const obsHtml = o.observaciones 
      ? `<div class="tip-obs-box"><i class="fa-solid fa-triangle-exclamation"></i> ${o.observaciones}</div>` 
      : '';

    tooltip.innerHTML = `
      <div class="tip-header">
        <span class="tip-id">#${o.numPedido} • ${o.id}</span>
        <span class="tip-sla-badge">${o.prioridad}</span>
      </div>
      <div class="tip-client">${o.cliente}</div>
      <div class="tip-row">
        <span class="tip-label">Documento:</span>
        <span class="tip-value">${o.docsRelacionados}</span>
      </div>
      <div class="tip-row">
        <span class="tip-label">Destino:</span>
        <span class="tip-value">${o.destino}</span>
      </div>
      <div class="tip-row">
        <span class="tip-label">Vendedor:</span>
        <span class="tip-value" style="color:var(--orange-vapor);">${o.vendedor}</span>
      </div>
      <div class="tip-row">
        <span class="tip-label">Picking / Packing:</span>
        <span class="tip-value">${o.picking || '-'} / ${o.packing || '-'}</span>
      </div>
      <div class="tip-row">
        <span class="tip-label">Stock:</span>
        <span class="tip-value" style="color:${o.stockCompleto === 'COMPLETO' ? 'var(--green-success)' : 'var(--red-alert)'}; font-weight:700;">
          ${o.stockCompleto}
        </span>
      </div>
      <div class="tip-row">
        <span class="tip-label">Transportista:</span>
        <span class="tip-value">${o.transportista || 'En Espera'}</span>
      </div>
      ${obsHtml}
    `;
  }

  // --- MODALS (DETALLE DE PEDIDO Y NUEVO PEDIDO) ---
  function initModals() {
    // Modal Detalle
    const detailModal = document.getElementById('orderDetailModal');
    const closeBtn = document.getElementById('modalCloseBtn');
    const closeBtnFooter = document.getElementById('modalCloseBtnFooter');
    const printOrderBtn = document.getElementById('modalPrintOrderBtn');

    [closeBtn, closeBtnFooter].forEach(btn => {
      if (btn) btn.addEventListener('click', () => detailModal.classList.remove('active'));
    });

    if (printOrderBtn) {
      printOrderBtn.addEventListener('click', () => window.print());
    }

    // Modal Nuevo Pedido
    const newOrderModal = document.getElementById('newOrderModal');
    const btnNewOrder = document.getElementById('btnNewOrder');
    const newOrderCloseBtn = document.getElementById('newOrderCloseBtn');
    const cancelNewOrderBtn = document.getElementById('cancelNewOrderBtn');
    const newOrderForm = document.getElementById('newOrderForm');

    if (btnNewOrder) {
      btnNewOrder.addEventListener('click', () => {
        // Pre-calcular correlativo
        const nextNum = orders.length + 1;
        document.getElementById('formNumPedido').value = nextNum;
        newOrderModal.classList.add('active');
      });
    }

    [newOrderCloseBtn, cancelNewOrderBtn].forEach(btn => {
      if (btn) btn.addEventListener('click', () => newOrderModal.classList.remove('active'));
    });

    if (newOrderForm) {
      newOrderForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveNewOrder();
        newOrderModal.classList.remove('active');
        newOrderForm.reset();
      });
    }

    // Cerrar con Escape o clic fuera
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        detailModal.classList.remove('active');
        newOrderModal.classList.remove('active');
      }
    });

    [detailModal, newOrderModal].forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
      });
    });

    // Botón restaurar datos originales
    const resetDataBtn = document.getElementById('btnResetData');
    if (resetDataBtn) {
      resetDataBtn.addEventListener('click', () => {
        if (confirm('¿Restablecer los datos originales del archivo Excel?')) {
          localStorage.removeItem('vapor_club_orders_v1');
          loadOrdersData();
          applyFilters();
        }
      });
    }
  }

  function showOrderDetailModal(orderId) {
    const o = orders.find(item => item.id === orderId);
    if (!o) return;

    const modal = document.getElementById('orderDetailModal');
    document.getElementById('modalOrderId').textContent = `${o.id} • Pedido #${o.numPedido}`;
    document.getElementById('modalClientName').textContent = o.cliente;

    const body = document.getElementById('modalDetailBody');

    // Determinar etapas activas para el timeline
    const isCompleted = o.estadoFinal === 'ENTREGADO';
    const isInRoute = isCompleted || o.estadoFinal === 'EN RUTA';
    const isPacked = isInRoute || o.packing && o.packing !== 'Pendiente';
    const isPicked = isPacked || o.picking && o.picking !== 'Pendiente';

    body.innerHTML = `
      <div class="timeline-flow">
        <div class="timeline-step completed">
          <div class="step-circle"><i class="fa-solid fa-file-invoice"></i></div>
          <span class="step-title">1. Recibido</span>
        </div>
        <div class="timeline-step completed">
          <div class="step-circle"><i class="fa-solid fa-shield-check"></i></div>
          <span class="step-title">2. Validado</span>
        </div>
        <div class="timeline-step ${isPicked ? 'completed' : 'active'}">
          <div class="step-circle"><i class="fa-solid fa-dolly"></i></div>
          <span class="step-title">3. Picking</span>
        </div>
        <div class="timeline-step ${isPacked ? 'completed' : (isPicked ? 'active' : '')}">
          <div class="step-circle"><i class="fa-solid fa-box-open"></i></div>
          <span class="step-title">4. Packing</span>
        </div>
        <div class="timeline-step ${isInRoute ? 'completed' : (isPacked ? 'active' : '')}">
          <div class="step-circle"><i class="fa-solid fa-truck"></i></div>
          <span class="step-title">5. En Ruta</span>
        </div>
        <div class="timeline-step ${isCompleted ? 'completed' : ''}">
          <div class="step-circle"><i class="fa-solid fa-circle-check"></i></div>
          <span class="step-title">6. Entregado</span>
        </div>
      </div>

      <div class="order-detail-grid">
        <div class="detail-item-box">
          <span class="detail-label">Documentos Relacionados</span>
          <div class="detail-value" style="color:var(--orange-vapor); font-family:monospace;">${o.docsRelacionados}</div>
        </div>

        <div class="detail-item-box">
          <span class="detail-label">Destino y Modalidad</span>
          <div class="detail-value">${o.destino} (${o.tipoDestino})</div>
        </div>

        <div class="detail-item-box">
          <span class="detail-label">Asesor Comercial (Vendedor)</span>
          <div class="detail-value">${o.vendedor}</div>
        </div>

        <div class="detail-item-box">
          <span class="detail-label">Prioridad y SLA Pactado</span>
          <div class="detail-value">${o.prioridad} • SLA: ${o.sla || 'Pendiente'}</div>
        </div>

        <div class="detail-item-box">
          <span class="detail-label">Operador Picking</span>
          <div class="detail-value">${o.picking || 'No asignado'}</div>
        </div>

        <div class="detail-item-box">
          <span class="detail-label">Operador Packing</span>
          <div class="detail-value">${o.packing || 'No asignado'}</div>
        </div>

        <div class="detail-item-box">
          <span class="detail-label">Supervisor de Validación</span>
          <div class="detail-value" style="color:var(--turquoise-digital);">${o.validado || 'Rafael L.'}</div>
        </div>

        <div class="detail-item-box">
          <span class="detail-label">Transportista & Despacho</span>
          <div class="detail-value">${o.transportista || 'Por asignar'} • ${o.fechaDespacho ? o.fechaDespacho + ' ' + o.horaDespacho : 'En espera'}</div>
        </div>
      </div>

      ${o.observaciones ? `
        <div style="background:rgba(255, 77, 77, 0.08); border-left:3px solid var(--red-alert); padding:1rem; border-radius:8px;">
          <strong style="color:var(--red-alert); display:block; margin-bottom:0.3rem;"><i class="fa-solid fa-triangle-exclamation"></i> Observaciones Operativas:</strong>
          <span style="color:#FFF; font-size:0.85rem;">${o.observaciones}</span>
        </div>
      ` : ''}
    `;

    modal.classList.add('active');
  }

  function saveNewOrder() {
    const num = document.getElementById('formNumPedido').value.trim();
    const doc = document.getElementById('formDoc').value.trim();
    const cliente = document.getElementById('formCliente').value.trim();
    const vendedor = document.getElementById('formVendedor').value;
    const destino = document.getElementById('formDestino').value.trim();
    const tipoDestino = document.getElementById('formTipoDestino').value;
    const prioridad = document.getElementById('formPrioridad').value;
    const picking = document.getElementById('formPicking').value;
    const packing = document.getElementById('formPacking').value;
    const stock = document.getElementById('formStock').value;
    const transportista = document.getElementById('formTransportista').value;
    const estado = document.getElementById('formEstado').value;
    const obs = document.getElementById('formObs').value.trim();

    const newId = `PED-2026-${String(orders.length + 1).padStart(3, '0')}`;
    const todayStr = '2026-10-19';

    const newObj = {
      id: newId,
      numPedido: num,
      fechaPedido: todayStr,
      horaPedido: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
      docsRelacionados: doc,
      cliente: cliente,
      vendedor: vendedor,
      destino: destino,
      tipoDestino: tipoDestino,
      prioridad: prioridad,
      picking: picking,
      validado: 'Si, Rafael L',
      stockCompleto: stock,
      packing: packing,
      fechaDespacho: estado === 'ENTREGADO' || estado === 'EN RUTA' ? todayStr : '',
      horaDespacho: estado === 'ENTREGADO' || estado === 'EN RUTA' ? '16:00 pm' : '',
      transportista: transportista,
      estadoFinal: estado,
      sla: prioridad === 'PRIORITARIO' ? '<12 H' : prioridad,
      slaHoras: null,
      observaciones: obs
    };

    orders.unshift(newObj);
    saveOrdersToStorage();
    applyFilters();
  }

  // --- EXPORTAR A EXCEL / CSV E IMPRIMIR ---
  function initExportAndPrint() {
    const exportBtn = document.getElementById('btnExportCSV');
    const printBtn = document.getElementById('btnPrintReport');

    if (exportBtn) {
      exportBtn.addEventListener('click', exportToCSV);
    }
    if (printBtn) {
      printBtn.addEventListener('click', () => window.print());
    }
  }

  function exportToCSV() {
    if (filteredOrders.length === 0) {
      alert('No hay pedidos para exportar con los filtros actuales.');
      return;
    }

    const headers = [
      'Nº Pedido', 'Fecha Pedido', 'Hora Pedido', 'Docs Relacionados',
      'Cliente', 'Vendedor', 'Destino', 'Tipo Destino', 'Prioridad',
      'Picking', 'Validado', 'Stock', 'Packing', 'Fecha Despacho',
      'Hora Despacho', 'Transportista', 'Estado Final', 'SLA', 'Observaciones'
    ];

    const rows = filteredOrders.map(o => [
      `"${o.numPedido}"`,
      `"${o.fechaPedido}"`,
      `"${o.horaPedido || ''}"`,
      `"${o.docsRelacionados.replace(/"/g, '""')}"`,
      `"${o.cliente.replace(/"/g, '""')}"`,
      `"${o.vendedor}"`,
      `"${o.destino}"`,
      `"${o.tipoDestino}"`,
      `"${o.prioridad}"`,
      `"${o.picking || ''}"`,
      `"${o.validado || ''}"`,
      `"${o.stockCompleto}"`,
      `"${o.packing || ''}"`,
      `"${o.fechaDespacho || ''}"`,
      `"${o.horaDespacho || ''}"`,
      `"${o.transportista || ''}"`,
      `"${o.estadoFinal}"`,
      `"${o.sla || ''}"`,
      `"${(o.observaciones || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Vapor_Club_Seguimiento_Entregas_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

})();
