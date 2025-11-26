// ===== State Management =====
const state = {
  services: [],
  prices: [],
  collections: [],
  currentService: null,
  currentPrice: null,
  isEditing: false,
  // Pagination state
  servicesPagination: { page: 1, limit: 15, total: 0, totalPages: 0 },
  pricesPagination: { page: 1, limit: 15, total: 0, totalPages: 0 }
};

// Pagination config
const PAGINATION_CONFIG = {
  defaultLimit: 15,
  limitOptions: [10, 15, 25, 50, 100]
};

// ===== LocalStorage Cache =====
const CACHE_CONFIG = {
  keys: {
    services: 'firestore_services_cache',
    prices: 'firestore_prices_cache',
    servicesAll: 'firestore_services_all_cache',
    pricesAll: 'firestore_prices_all_cache'
  },
  ttl: 5 * 60 * 1000, // 5 minutos em milissegundos
  enabled: true
};

const cacheService = {
  /**
   * Salva dados no localStorage com timestamp
   */
  set(key, data, params = {}) {
    if (!CACHE_CONFIG.enabled) return;
    
    try {
      const cacheKey = this.buildCacheKey(key, params);
      const cacheData = {
        timestamp: Date.now(),
        data: data,
        params: params
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log(`[Cache] Saved: ${cacheKey}`);
    } catch (error) {
      console.warn('[Cache] Error saving to localStorage:', error);
      // Se o localStorage estiver cheio, limpar caches antigos
      this.clearOldCaches();
    }
  },

  /**
   * Recupera dados do cache se ainda válidos
   */
  get(key, params = {}) {
    if (!CACHE_CONFIG.enabled) return null;
    
    try {
      const cacheKey = this.buildCacheKey(key, params);
      const cached = localStorage.getItem(cacheKey);
      
      if (!cached) return null;
      
      const cacheData = JSON.parse(cached);
      const age = Date.now() - cacheData.timestamp;
      
      if (age > CACHE_CONFIG.ttl) {
        console.log(`[Cache] Expired: ${cacheKey} (age: ${Math.round(age / 1000)}s)`);
        localStorage.removeItem(cacheKey);
        return null;
      }
      
      console.log(`[Cache] Hit: ${cacheKey} (age: ${Math.round(age / 1000)}s)`);
      return cacheData.data;
    } catch (error) {
      console.warn('[Cache] Error reading from localStorage:', error);
      return null;
    }
  },

  /**
   * Constrói chave única baseada nos parâmetros
   */
  buildCacheKey(baseKey, params = {}) {
    const paramString = Object.keys(params)
      .sort()
      .map(k => `${k}=${params[k]}`)
      .join('&');
    return paramString ? `${baseKey}_${paramString}` : baseKey;
  },

  /**
   * Invalida cache de uma collection específica
   */
  invalidate(collection) {
    try {
      const prefix = CACHE_CONFIG.keys[collection] || collection;
      const keysToRemove = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`[Cache] Invalidated: ${key}`);
      });
      
      // Também invalidar o cache "all"
      if (collection === 'services') {
        this.invalidateByPrefix(CACHE_CONFIG.keys.servicesAll);
      } else if (collection === 'prices') {
        this.invalidateByPrefix(CACHE_CONFIG.keys.pricesAll);
      }
    } catch (error) {
      console.warn('[Cache] Error invalidating cache:', error);
    }
  },

  /**
   * Invalida cache por prefixo
   */
  invalidateByPrefix(prefix) {
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('[Cache] Error invalidating by prefix:', error);
    }
  },

  /**
   * Limpa todos os caches do Firestore
   */
  clearAll() {
    try {
      Object.values(CACHE_CONFIG.keys).forEach(prefix => {
        this.invalidateByPrefix(prefix);
      });
      console.log('[Cache] All caches cleared');
    } catch (error) {
      console.warn('[Cache] Error clearing all caches:', error);
    }
  },

  /**
   * Limpa caches antigos quando localStorage está cheio
   */
  clearOldCaches() {
    try {
      const allCaches = [];
      Object.values(CACHE_CONFIG.keys).forEach(prefix => {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(prefix)) {
            const data = localStorage.getItem(key);
            if (data) {
              try {
                const parsed = JSON.parse(data);
                allCaches.push({ key, timestamp: parsed.timestamp || 0 });
              } catch (e) {
                allCaches.push({ key, timestamp: 0 });
              }
            }
          }
        }
      });
      
      // Ordena por timestamp e remove os mais antigos (metade)
      allCaches.sort((a, b) => a.timestamp - b.timestamp);
      const toRemove = allCaches.slice(0, Math.ceil(allCaches.length / 2));
      toRemove.forEach(item => localStorage.removeItem(item.key));
      
      console.log(`[Cache] Cleared ${toRemove.length} old caches`);
    } catch (error) {
      console.warn('[Cache] Error clearing old caches:', error);
    }
  },

  /**
   * Retorna estatísticas do cache
   */
  getStats() {
    const stats = { services: 0, prices: 0, totalSize: 0 };
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const data = localStorage.getItem(key);
          if (data) {
            stats.totalSize += data.length;
            if (key.startsWith(CACHE_CONFIG.keys.services)) stats.services++;
            if (key.startsWith(CACHE_CONFIG.keys.prices)) stats.prices++;
          }
        }
      }
      stats.totalSizeKB = Math.round(stats.totalSize / 1024);
    } catch (error) {
      console.warn('[Cache] Error getting stats:', error);
    }
    
    return stats;
  }
};

// Expor para debug no console
window.cacheService = cacheService;

// Brazilian states for price inputs
const BRAZILIAN_STATES = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN',
  'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'
];

// ===== DOM Elements =====
const elements = {
  // Views
  dashboardView: document.getElementById('dashboard-view'),
  servicesView: document.getElementById('services-view'),
  pricesView: document.getElementById('prices-view'),
  collectionsView: document.getElementById('collections-view'),

  // Stats
  servicesCount: document.getElementById('services-count'),
  pricesCount: document.getElementById('prices-count'),
  collectionsCount: document.getElementById('collections-count'),

  // Tables
  servicesTableBody: document.getElementById('services-table-body'),
  pricesTableBody: document.getElementById('prices-table-body'),
  collectionsGrid: document.getElementById('collections-grid'),

  // Empty states
  servicesEmpty: document.getElementById('services-empty'),
  pricesEmpty: document.getElementById('prices-empty'),

  // Filters
  servicesSearch: document.getElementById('services-search'),
  servicesFilterCategoria: document.getElementById('services-filter-categoria'),
  servicesFilterSegmento: document.getElementById('services-filter-segmento'),
  pricesSearch: document.getElementById('prices-search'),
  pricesFilterEnv: document.getElementById('prices-filter-env'),

  // Modals
  serviceModal: document.getElementById('service-modal'),
  serviceModalTitle: document.getElementById('service-modal-title'),
  serviceForm: document.getElementById('service-form'),
  productsContainer: document.getElementById('products-container'),

  priceModal: document.getElementById('price-modal'),
  priceModalTitle: document.getElementById('price-modal-title'),
  priceForm: document.getElementById('price-form'),
  pricesHmlContainer: document.getElementById('prices-hml-container'),
  pricesPrdContainer: document.getElementById('prices-prd-container'),

  confirmModal: document.getElementById('confirm-modal'),
  confirmMessage: document.getElementById('confirm-message'),

  // Misc
  loading: document.getElementById('loading'),
  toastContainer: document.getElementById('toast-container'),
  pageTitle: document.getElementById('page-title'),
  sidebar: document.querySelector('.sidebar'),
  menuToggle: document.getElementById('menu-toggle'),
  globalSearch: document.getElementById('global-search')
};

// ===== Utility Functions =====
function showLoading(show = true) {
  elements.loading.classList.toggle('hidden', !show);
}

function showToast(message, type = 'info') {
  const icons = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="fas ${icons[type]}"></i>
    <div class="toast-content">
      <p>${escapeHtml(message)}</p>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">
      <i class="fas fa-times"></i>
    </button>
  `;

  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    if (toast.parentElement) {
      toast.remove();
    }
  }, 5000);
}

function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  return escapeHtml(String(value));
}

// ===== Confirm Dialog =====
let confirmCallback = null;

function showConfirm(message, callback) {
  elements.confirmMessage.textContent = message;
  elements.confirmModal.classList.remove('hidden');
  confirmCallback = callback;
}

document.getElementById('confirm-ok').addEventListener('click', () => {
  elements.confirmModal.classList.add('hidden');
  if (confirmCallback) {
    confirmCallback();
    confirmCallback = null;
  }
});

document.getElementById('confirm-cancel').addEventListener('click', () => {
  elements.confirmModal.classList.add('hidden');
  confirmCallback = null;
});

// ===== View Navigation =====
function showView(viewName) {
  // Update active nav item
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewName);
  });

  // Show/hide views
  document.querySelectorAll('.view').forEach(view => {
    view.classList.remove('active');
  });

  const viewElement = document.getElementById(`${viewName}-view`);
  if (viewElement) {
    viewElement.classList.add('active');
  }

  // Update page title
  const titles = {
    dashboard: 'Dashboard',
    services: 'Serviços',
    prices: 'Preços',
    collections: 'Collections'
  };
  elements.pageTitle.textContent = titles[viewName] || 'Dashboard';

  // Close sidebar on mobile
  elements.sidebar.classList.remove('open');
}

// Navigation event listeners
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    const view = item.dataset.view;
    if (view) {
      showView(view);
      if (view === 'services') loadServices();
      if (view === 'prices') loadPrices();
      if (view === 'collections') loadCollections();
    }
  });
});

// Stat cards navigation
document.querySelectorAll('.stat-card').forEach(card => {
  card.addEventListener('click', () => {
    const view = card.dataset.view;
    if (view) {
      showView(view);
      if (view === 'services') loadServices();
      if (view === 'prices') loadPrices();
      if (view === 'collections') loadCollections();
    }
  });
});

// Mobile menu toggle
elements.menuToggle.addEventListener('click', () => {
  elements.sidebar.classList.toggle('open');
});

// Quick action buttons
document.getElementById('quick-add-service').addEventListener('click', () => {
  showView('services');
  loadServices().then(() => openServiceModal());
});

document.getElementById('quick-add-price').addEventListener('click', () => {
  showView('prices');
  loadPrices().then(() => openPriceModal());
});

// ===== API Functions =====
async function fetchAPI(endpoint, options = {}) {
  try {
    const response = await fetch(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erro na requisição');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// ===== Services =====
async function loadServices(page = 1, forceRefresh = false) {
  showLoading(true);
  try {
    const search = elements.servicesSearch.value || '';
    const categoria = elements.servicesFilterCategoria.value || '';
    const segmento = elements.servicesFilterSegmento.value || '';
    const limit = state.servicesPagination.limit;
    
    const cacheParams = { page, limit, search, categoria, segmento };
    
    // Tentar carregar do cache primeiro
    if (!forceRefresh) {
      const cached = cacheService.get(CACHE_CONFIG.keys.services, cacheParams);
      if (cached) {
        if (cached.data && cached.pagination) {
          state.services = cached.data;
          state.servicesPagination = {
            ...state.servicesPagination,
            ...cached.pagination
          };
        } else {
          state.services = Array.isArray(cached) ? cached : [];
          state.servicesPagination.total = state.services.length;
          state.servicesPagination.totalPages = 1;
        }
        
        renderServices();
        renderServicesPagination();
        updateFilters();
        elements.servicesCount.textContent = state.servicesPagination.total;
        showToast('Carregado do cache', 'info');
        showLoading(false);
        return;
      }
    }
    
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
      ...(categoria && { categoria }),
      ...(segmento && { segmento })
    });
    
    const response = await fetchAPI(`/services?${params}`);
    
    // Salvar no cache
    cacheService.set(CACHE_CONFIG.keys.services, response, cacheParams);
    
    // Handle both paginated and non-paginated responses
    if (response.data && response.pagination) {
      state.services = response.data;
      state.servicesPagination = {
        ...state.servicesPagination,
        ...response.pagination
      };
    } else {
      // Fallback for non-paginated response
      state.services = Array.isArray(response) ? response : [];
      state.servicesPagination.total = state.services.length;
      state.servicesPagination.totalPages = 1;
    }
    
    renderServices();
    renderServicesPagination();
    updateFilters();
    elements.servicesCount.textContent = state.servicesPagination.total;
  } catch (error) {
    showToast('Erro ao carregar serviços', 'error');
    state.services = [];
    renderServices();
  } finally {
    showLoading(false);
  }
}

function renderServices() {
  const data = state.services;
  const tbody = elements.servicesTableBody;
  const emptyState = elements.servicesEmpty;
  const tableContainer = document.querySelector('#services-view .data-table-container');

  if (!data || data.length === 0) {
    tbody.innerHTML = '';
    tableContainer.classList.add('hidden');
    emptyState.classList.remove('hidden');
    return;
  }

  tableContainer.classList.remove('hidden');
  emptyState.classList.add('hidden');

  tbody.innerHTML = data.map(service => `
    <tr data-id="${escapeHtml(service.id)}">
      <td><span class="badge badge-primary">${formatValue(service.id)}</span></td>
      <td>${formatValue(service.tipo)}</td>
      <td>${formatValue(service.servico)}</td>
      <td>${formatValue(service.categoria)}</td>
      <td>${formatValue(service.segmento)}</td>
      <td>
        <div class="table-actions">
          <button class="btn-view" title="Visualizar" onclick="viewService('${escapeHtml(service.id)}')">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn-edit" title="Editar" onclick="editService('${escapeHtml(service.id)}')">
            <i class="fas fa-pen"></i>
          </button>
          <button class="btn-delete" title="Excluir" onclick="deleteService('${escapeHtml(service.id)}')">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderServicesPagination() {
  const container = document.getElementById('services-pagination');
  if (!container) return;
  
  const { page, totalPages, total, limit, hasNext, hasPrev } = state.servicesPagination;
  
  if (total === 0) {
    container.innerHTML = '';
    return;
  }
  
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);
  
  container.innerHTML = `
    <div class="pagination-info">
      Mostrando ${startItem}-${endItem} de ${total} itens
    </div>
    <div class="pagination-controls">
      <select class="pagination-limit" onchange="changeServicesLimit(this.value)">
        ${PAGINATION_CONFIG.limitOptions.map(opt => 
          `<option value="${opt}" ${opt === limit ? 'selected' : ''}>${opt} por página</option>`
        ).join('')}
      </select>
      <button class="btn btn-sm btn-secondary" onclick="loadServices(1)" ${page === 1 ? 'disabled' : ''}>
        <i class="fas fa-angle-double-left"></i>
      </button>
      <button class="btn btn-sm btn-secondary" onclick="loadServices(${page - 1})" ${!hasPrev ? 'disabled' : ''}>
        <i class="fas fa-angle-left"></i>
      </button>
      <span class="pagination-pages">Página ${page} de ${totalPages}</span>
      <button class="btn btn-sm btn-secondary" onclick="loadServices(${page + 1})" ${!hasNext ? 'disabled' : ''}>
        <i class="fas fa-angle-right"></i>
      </button>
      <button class="btn btn-sm btn-secondary" onclick="loadServices(${totalPages})" ${page === totalPages ? 'disabled' : ''}>
        <i class="fas fa-angle-double-right"></i>
      </button>
    </div>
  `;
}

window.changeServicesLimit = function(newLimit) {
  state.servicesPagination.limit = parseInt(newLimit);
  loadServices(1);
};

function updateFilters() {
  // Tentar usar cache primeiro para filtros
  const cached = cacheService.get(CACHE_CONFIG.keys.servicesAll, { limit: 1000 });
  
  if (cached) {
    const allServices = cached.data || cached || [];
    populateFilterOptions(allServices);
    return;
  }
  
  // Se não tiver cache, buscar do servidor
  fetchAPI('/services?limit=1000').then(response => {
    // Salvar no cache "all" separado
    cacheService.set(CACHE_CONFIG.keys.servicesAll, response, { limit: 1000 });
    
    const allServices = response.data || response || [];
    populateFilterOptions(allServices);
  }).catch(() => {});
}

function populateFilterOptions(allServices) {
  const categorias = [...new Set(allServices.map(s => s.categoria).filter(Boolean))];
  const segmentos = [...new Set(allServices.map(s => s.segmento).filter(Boolean))];
  
  const currentCategoria = elements.servicesFilterCategoria.value;
  const currentSegmento = elements.servicesFilterSegmento.value;

  elements.servicesFilterCategoria.innerHTML = '<option value="">Todas Categorias</option>' +
    categorias.map(c => `<option value="${escapeHtml(c)}" ${c === currentCategoria ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('');

  elements.servicesFilterSegmento.innerHTML = '<option value="">Todos Segmentos</option>' +
    segmentos.map(s => `<option value="${escapeHtml(s)}" ${s === currentSegmento ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('');
}

// Função para forçar refresh (acessível globalmente)
window.forceRefreshServices = function() {
  cacheService.invalidate('services');
  loadServices(1, true);
};

window.forceRefreshPrices = function() {
  cacheService.invalidate('prices');
  loadPrices(1, true);
};

window.clearAllCache = function() {
  cacheService.clearAll();
  showToast('Cache limpo com sucesso!', 'success');
};

window.getCacheStats = function() {
  const stats = cacheService.getStats();
  console.log('Cache Stats:', stats);
  showToast(`Cache: ${stats.services} services, ${stats.prices} prices (${stats.totalSizeKB}KB)`, 'info');
  return stats;
};

// Debounce function for search
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Filter event listeners with debounce for search
const debouncedServiceSearch = debounce(() => loadServices(1), 300);
elements.servicesSearch.addEventListener('input', debouncedServiceSearch);
elements.servicesFilterCategoria.addEventListener('change', () => loadServices(1));
elements.servicesFilterSegmento.addEventListener('change', () => loadServices(1));

// Service Modal Functions
function openServiceModal(service = null) {
  state.currentService = service;
  state.isEditing = !!service;

  elements.serviceModalTitle.textContent = service ? 'Editar Serviço' : 'Novo Serviço';
  elements.serviceForm.reset();
  elements.productsContainer.innerHTML = '';

  if (service) {
    document.getElementById('service-id').value = service.id || '';
    document.getElementById('service-codigo').value = service.codigo || '';
    document.getElementById('service-tipo').value = service.tipo || '';
    document.getElementById('service-servico').value = service.servico || '';
    document.getElementById('service-categoria').value = service.categoria || '';
    document.getElementById('service-subcategoria').value = service.subcategoria || '';
    document.getElementById('service-segmento').value = service.segmento || '';
    document.getElementById('service-versao').value = service.versao || '';
    document.getElementById('service-edicao').value = service.edicao || '';
    document.getElementById('service-imagem').value = service.imagem || '';

    // Load products
    if (Array.isArray(service.produto)) {
      service.produto.forEach(prod => addProductCard(prod));
    }
  }

  elements.serviceModal.classList.remove('hidden');
}

function addProductCard(product = null) {
  const index = elements.productsContainer.children.length;
  const card = document.createElement('div');
  card.className = 'product-card';
  card.innerHTML = `
    <button type="button" class="remove-product" onclick="this.parentElement.remove()">
      <i class="fas fa-times"></i>
    </button>
    <div class="form-row">
      <div class="form-group">
        <label>Nome do Produto</label>
        <input type="text" name="produto[${index}][nomeProduto]" value="${escapeHtml(product?.nomeProduto || '')}">
      </div>
      <div class="form-group">
        <label>Preço</label>
        <input type="number" step="0.01" name="produto[${index}][preco]" value="${product?.preco || ''}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Quantidade</label>
        <input type="number" name="produto[${index}][quantidade]" value="${product?.quantidade || 1}">
      </div>
      <div class="form-group" style="flex: 2">
        <label>Descrição</label>
        <input type="text" name="produto[${index}][descricao]" value="${escapeHtml(product?.descricao || '')}">
      </div>
    </div>
  `;
  elements.productsContainer.appendChild(card);
}

document.getElementById('add-product-btn').addEventListener('click', () => addProductCard());

document.getElementById('service-modal-close').addEventListener('click', () => {
  elements.serviceModal.classList.add('hidden');
});

document.getElementById('service-cancel-btn').addEventListener('click', () => {
  elements.serviceModal.classList.add('hidden');
});

elements.serviceForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(elements.serviceForm);
  const serviceData = {
    id: formData.get('id'),
    codigo: parseInt(formData.get('codigo')) || 0,
    tipo: formData.get('tipo'),
    servico: formData.get('servico'),
    categoria: formData.get('categoria'),
    subcategoria: formData.get('subcategoria') || '',
    segmento: formData.get('segmento'),
    versao: formData.get('versao') || '',
    edicao: formData.get('edicao') || '',
    imagem: formData.get('imagem') || '',
    produto: []
  };

  // Collect products
  const productCards = elements.productsContainer.querySelectorAll('.product-card');
  productCards.forEach((card, index) => {
    const nomeProduto = card.querySelector(`[name="produto[${index}][nomeProduto]"]`)?.value || '';
    const preco = parseFloat(card.querySelector(`[name="produto[${index}][preco]"]`)?.value) || 0;
    const quantidade = parseInt(card.querySelector(`[name="produto[${index}][quantidade]"]`)?.value) || 1;
    const descricao = card.querySelector(`[name="produto[${index}][descricao]"]`)?.value || '';

    if (nomeProduto) {
      serviceData.produto.push({ nomeProduto, preco, quantidade, descricao });
    }
  });

  showLoading(true);
  try {
    const method = state.isEditing ? 'PUT' : 'POST';
    const endpoint = state.isEditing ? `/services/${encodeURIComponent(serviceData.id)}` : '/services';
    
    await fetchAPI(endpoint, {
      method,
      body: JSON.stringify(serviceData)
    });

    // Invalidar cache de services após alteração
    cacheService.invalidate('services');
    
    showToast(state.isEditing ? 'Serviço atualizado com sucesso!' : 'Serviço criado com sucesso!', 'success');
    elements.serviceModal.classList.add('hidden');
    loadServices(state.servicesPagination.page, true); // Força refresh
  } catch (error) {
    showToast(error.message || 'Erro ao salvar serviço', 'error');
  } finally {
    showLoading(false);
  }
});

// Add service button
document.getElementById('add-service-btn').addEventListener('click', () => openServiceModal());

// Service actions
window.viewService = function(id) {
  const service = state.services.find(s => s.id === id);
  if (service) {
    // For now, just open edit modal in view mode
    openServiceModal(service);
  }
};

window.editService = function(id) {
  const service = state.services.find(s => s.id === id);
  if (service) {
    openServiceModal(service);
  }
};

window.deleteService = function(id) {
  showConfirm('Tem certeza que deseja excluir este serviço?', async () => {
    showLoading(true);
    try {
      await fetchAPI(`/services/${encodeURIComponent(id)}`, { method: 'DELETE' });
      
      // Invalidar cache de services após exclusão
      cacheService.invalidate('services');
      
      showToast('Serviço excluído com sucesso!', 'success');
      loadServices(state.servicesPagination.page, true); // Força refresh
    } catch (error) {
      showToast(error.message || 'Erro ao excluir serviço', 'error');
    } finally {
      showLoading(false);
    }
  });
};

// ===== Prices =====
async function loadPrices(page = 1, forceRefresh = false) {
  showLoading(true);
  try {
    const search = elements.pricesSearch.value || '';
    const env = elements.pricesFilterEnv.value || '';
    const limit = state.pricesPagination.limit;
    
    const cacheParams = { page, limit, search, env };
    
    // Tentar carregar do cache primeiro
    if (!forceRefresh) {
      const cached = cacheService.get(CACHE_CONFIG.keys.prices, cacheParams);
      if (cached) {
        if (cached.data && cached.pagination) {
          state.prices = cached.data;
          state.pricesPagination = {
            ...state.pricesPagination,
            ...cached.pagination
          };
        } else {
          state.prices = Array.isArray(cached) ? cached : [];
          state.pricesPagination.total = state.prices.length;
          state.pricesPagination.totalPages = 1;
        }
        
        renderPrices();
        renderPricesPagination();
        elements.pricesCount.textContent = state.pricesPagination.total;
        showToast('Carregado do cache', 'info');
        showLoading(false);
        return;
      }
    }
    
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
      ...(env && { env })
    });
    
    const response = await fetchAPI(`/prices?${params}`);
    
    // Salvar no cache
    cacheService.set(CACHE_CONFIG.keys.prices, response, cacheParams);
    
    // Handle both paginated and non-paginated responses
    if (response.data && response.pagination) {
      state.prices = response.data;
      state.pricesPagination = {
        ...state.pricesPagination,
        ...response.pagination
      };
    } else {
      // Fallback for non-paginated response
      state.prices = Array.isArray(response) ? response : [];
      state.pricesPagination.total = state.prices.length;
      state.pricesPagination.totalPages = 1;
    }
    
    renderPrices();
    renderPricesPagination();
    elements.pricesCount.textContent = state.pricesPagination.total;
  } catch (error) {
    showToast('Erro ao carregar preços', 'error');
    state.prices = [];
    renderPrices();
  } finally {
    showLoading(false);
  }
}

function renderPrices() {
  const data = state.prices;
  const tbody = elements.pricesTableBody;
  const emptyState = elements.pricesEmpty;
  const tableContainer = document.querySelector('#prices-view .data-table-container');

  if (!data || data.length === 0) {
    tbody.innerHTML = '';
    tableContainer.classList.add('hidden');
    emptyState.classList.remove('hidden');
    return;
  }

  tableContainer.classList.remove('hidden');
  emptyState.classList.add('hidden');

  tbody.innerHTML = data.map(price => {
    const hmlSP = price.prices?.HML?.SP || '—';
    const prdSP = price.prices?.PRD?.SP || '—';

    return `
      <tr data-id="${escapeHtml(price.id)}">
        <td><span class="badge badge-success">${formatValue(price.code)}</span></td>
        <td>${formatValue(price.um)}</td>
        <td>R$ ${formatValue(hmlSP)}</td>
        <td>R$ ${formatValue(prdSP)}</td>
        <td>
          <div class="table-actions">
            <button class="btn-view" title="Visualizar" onclick="viewPrice('${escapeHtml(price.id)}')">
              <i class="fas fa-eye"></i>
            </button>
            <button class="btn-edit" title="Editar" onclick="editPrice('${escapeHtml(price.id)}')">
              <i class="fas fa-pen"></i>
            </button>
            <button class="btn-delete" title="Excluir" onclick="deletePrice('${escapeHtml(price.id)}')">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderPricesPagination() {
  const container = document.getElementById('prices-pagination');
  if (!container) return;
  
  const { page, totalPages, total, limit, hasNext, hasPrev } = state.pricesPagination;
  
  if (total === 0) {
    container.innerHTML = '';
    return;
  }
  
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);
  
  container.innerHTML = `
    <div class="pagination-info">
      Mostrando ${startItem}-${endItem} de ${total} itens
    </div>
    <div class="pagination-controls">
      <select class="pagination-limit" onchange="changePricesLimit(this.value)">
        ${PAGINATION_CONFIG.limitOptions.map(opt => 
          `<option value="${opt}" ${opt === limit ? 'selected' : ''}>${opt} por página</option>`
        ).join('')}
      </select>
      <button class="btn btn-sm btn-secondary" onclick="loadPrices(1)" ${page === 1 ? 'disabled' : ''}>
        <i class="fas fa-angle-double-left"></i>
      </button>
      <button class="btn btn-sm btn-secondary" onclick="loadPrices(${page - 1})" ${!hasPrev ? 'disabled' : ''}>
        <i class="fas fa-angle-left"></i>
      </button>
      <span class="pagination-pages">Página ${page} de ${totalPages}</span>
      <button class="btn btn-sm btn-secondary" onclick="loadPrices(${page + 1})" ${!hasNext ? 'disabled' : ''}>
        <i class="fas fa-angle-right"></i>
      </button>
      <button class="btn btn-sm btn-secondary" onclick="loadPrices(${totalPages})" ${page === totalPages ? 'disabled' : ''}>
        <i class="fas fa-angle-double-right"></i>
      </button>
    </div>
  `;
}

window.changePricesLimit = function(newLimit) {
  state.pricesPagination.limit = parseInt(newLimit);
  loadPrices(1);
};

// Filter event listeners with debounce for search
const debouncedPriceSearch = debounce(() => loadPrices(1), 300);
elements.pricesSearch.addEventListener('input', debouncedPriceSearch);
elements.pricesFilterEnv.addEventListener('change', () => loadPrices(1));

// Price Modal Functions
function renderPriceInputs() {
  const hmlContainer = elements.pricesHmlContainer;
  const prdContainer = elements.pricesPrdContainer;

  hmlContainer.innerHTML = BRAZILIAN_STATES.map(state => `
    <div class="price-input-group">
      <label>${state}</label>
      <input type="text" name="prices[HML][${state}]" placeholder="0.00">
    </div>
  `).join('');

  prdContainer.innerHTML = BRAZILIAN_STATES.map(state => `
    <div class="price-input-group">
      <label>${state}</label>
      <input type="text" name="prices[PRD][${state}]" placeholder="0.00">
    </div>
  `).join('');
}

function openPriceModal(price = null) {
  state.currentPrice = price;
  state.isEditing = !!price;

  elements.priceModalTitle.textContent = price ? 'Editar Preço' : 'Novo Preço';
  elements.priceForm.reset();
  
  renderPriceInputs();

  if (price) {
    document.getElementById('price-id').value = price.id || '';
    document.getElementById('price-code').value = price.code || '';
    document.getElementById('price-um').value = price.um || '';

    // Fill HML prices
    if (price.prices?.HML) {
      Object.entries(price.prices.HML).forEach(([state, value]) => {
        const input = document.querySelector(`[name="prices[HML][${state}]"]`);
        if (input) input.value = value || '';
      });
    }

    // Fill PRD prices
    if (price.prices?.PRD) {
      Object.entries(price.prices.PRD).forEach(([state, value]) => {
        const input = document.querySelector(`[name="prices[PRD][${state}]"]`);
        if (input) input.value = value || '';
      });
    }
  }

  // Show HML tab by default
  document.querySelectorAll('.env-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.env === 'HML');
  });
  elements.pricesHmlContainer.classList.remove('hidden');
  elements.pricesPrdContainer.classList.add('hidden');

  elements.priceModal.classList.remove('hidden');
}

// Environment tab switching
document.querySelectorAll('.env-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const env = tab.dataset.env;
    
    document.querySelectorAll('.env-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.env === env);
    });

    elements.pricesHmlContainer.classList.toggle('hidden', env !== 'HML');
    elements.pricesPrdContainer.classList.toggle('hidden', env !== 'PRD');
  });
});

document.getElementById('price-modal-close').addEventListener('click', () => {
  elements.priceModal.classList.add('hidden');
});

document.getElementById('price-cancel-btn').addEventListener('click', () => {
  elements.priceModal.classList.add('hidden');
});

elements.priceForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(elements.priceForm);
  const priceData = {
    id: formData.get('id'),
    code: formData.get('code'),
    um: formData.get('um'),
    prices: {
      HML: {},
      PRD: {}
    }
  };

  // Collect HML prices
  BRAZILIAN_STATES.forEach(state => {
    const value = formData.get(`prices[HML][${state}]`);
    if (value) priceData.prices.HML[state] = value.trim();
  });

  // Collect PRD prices
  BRAZILIAN_STATES.forEach(state => {
    const value = formData.get(`prices[PRD][${state}]`);
    if (value) priceData.prices.PRD[state] = value.trim();
  });

  showLoading(true);
  try {
    const method = state.isEditing ? 'PUT' : 'POST';
    const endpoint = state.isEditing ? `/prices/${encodeURIComponent(priceData.id)}` : '/prices';
    
    await fetchAPI(endpoint, {
      method,
      body: JSON.stringify(priceData)
    });

    // Invalidar cache de prices após alteração
    cacheService.invalidate('prices');
    
    showToast(state.isEditing ? 'Preço atualizado com sucesso!' : 'Preço criado com sucesso!', 'success');
    elements.priceModal.classList.add('hidden');
    loadPrices(state.pricesPagination.page, true); // Força refresh
  } catch (error) {
    showToast(error.message || 'Erro ao salvar preço', 'error');
  } finally {
    showLoading(false);
  }
});

// Add price button
document.getElementById('add-price-btn').addEventListener('click', () => openPriceModal());

// Price actions
window.viewPrice = function(id) {
  const price = state.prices.find(p => p.id === id);
  if (price) {
    openPriceModal(price);
  }
};

window.editPrice = function(id) {
  const price = state.prices.find(p => p.id === id);
  if (price) {
    openPriceModal(price);
  }
};

window.deletePrice = function(id) {
  showConfirm('Tem certeza que deseja excluir este preço?', async () => {
    showLoading(true);
    try {
      await fetchAPI(`/prices/${encodeURIComponent(id)}`, { method: 'DELETE' });
      
      // Invalidar cache de prices após exclusão
      cacheService.invalidate('prices');
      
      showToast('Preço excluído com sucesso!', 'success');
      loadPrices(state.pricesPagination.page, true); // Força refresh
    } catch (error) {
      showToast(error.message || 'Erro ao excluir preço', 'error');
    } finally {
      showLoading(false);
    }
  });
};

// ===== Collections =====
async function loadCollections() {
  showLoading(true);
  try {
    const data = await fetchAPI('/collections');
    state.collections = Array.isArray(data) ? data : [];
    renderCollections();
    elements.collectionsCount.textContent = state.collections.length;
  } catch (error) {
    showToast('Erro ao carregar collections', 'error');
    state.collections = [];
    renderCollections();
  } finally {
    showLoading(false);
  }
}

function renderCollections() {
  const grid = elements.collectionsGrid;

  if (!state.collections || state.collections.length === 0) {
    grid.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>Nenhuma collection encontrada</p></div>';
    return;
  }

  grid.innerHTML = state.collections.map(collection => `
    <div class="collection-card" onclick="viewCollectionDocuments('${escapeHtml(collection)}')">
      <div class="collection-icon">
        <i class="fas fa-folder"></i>
      </div>
      <div class="collection-info">
        <h3>${escapeHtml(collection)}</h3>
        <p>Clique para ver documentos</p>
      </div>
    </div>
  `).join('');
}

window.viewCollectionDocuments = async function(collectionId) {
  showLoading(true);
  try {
    const docs = await fetchAPI(`/collections/${encodeURIComponent(collectionId)}`);
    console.log('Collection documents:', docs);
    showToast(`${docs.length} documentos encontrados na collection ${collectionId}`, 'info');
  } catch (error) {
    showToast('Erro ao carregar documentos', 'error');
  } finally {
    showLoading(false);
  }
};

// ===== Dashboard Stats =====
async function loadDashboardStats() {
  showLoading(true);
  try {
    // Use count endpoints for efficiency
    const [servicesRes, pricesRes, collections] = await Promise.all([
      fetchAPI('/services?limit=1').catch(() => ({ pagination: { total: 0 } })),
      fetchAPI('/prices?limit=1').catch(() => ({ pagination: { total: 0 } })),
      fetchAPI('/collections').catch(() => [])
    ]);

    const servicesCount = servicesRes.pagination?.total || (Array.isArray(servicesRes) ? servicesRes.length : 0);
    const pricesCount = pricesRes.pagination?.total || (Array.isArray(pricesRes) ? pricesRes.length : 0);
    state.collections = Array.isArray(collections) ? collections : [];

    elements.servicesCount.textContent = servicesCount;
    elements.pricesCount.textContent = pricesCount;
    elements.collectionsCount.textContent = state.collections.length;
  } catch (error) {
    console.error('Error loading dashboard stats:', error);
  } finally {
    showLoading(false);
  }
}

// ===== Global Search =====
elements.globalSearch.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  
  // Search in current view
  const currentView = document.querySelector('.view.active');
  if (currentView.id === 'services-view') {
    elements.servicesSearch.value = query;
    filterServices();
  } else if (currentView.id === 'prices-view') {
    elements.pricesSearch.value = query;
    filterPrices();
  }
});

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
  showView('dashboard');
  loadDashboardStats();
});
