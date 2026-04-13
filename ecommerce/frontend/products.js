/* ══════════════════════════════════════════════
   products.js — Listado, búsqueda y detalle
══════════════════════════════════════════════ */

let allProducts   = [];
let currentPage   = 1;
const PAGE_SIZE   = 12;
let searchTimeout = null;

// ── Cargar productos destacados (home) ──
async function loadFeaturedProducts() {
  try {
    const data = await API.getFeatured();
    renderProductGrid('featuredProducts', data.results || data);
  } catch {
    document.getElementById('featuredProducts').innerHTML =
      '<p style="color:var(--gray-400);grid-column:1/-1">No se pudieron cargar los productos.</p>';
  }
}

// ── Cargar todos los productos (categorías) ──
async function loadProducts(params = {}) {
  try {
    const data = await API.getProducts({ ...params, page: currentPage, page_size: PAGE_SIZE });
    const products = data.results || data;
    allProducts = products;
    renderProductGrid('productsGrid', products);
    document.getElementById('resultsCount').textContent =
      `${data.count || products.length} resultado${(data.count || products.length) !== 1 ? 's' : ''}`;
    renderPagination(data.count || products.length);
  } catch {
    document.getElementById('productsGrid').innerHTML =
      '<p style="color:var(--gray-400);grid-column:1/-1">Error al cargar productos.</p>';
  }
}

// ── Cargar promociones ──
async function loadPromos() {
  try {
    const data = await API.getPromos();
    renderProductGrid('promoProducts', data.results || data);
  } catch {}
}

// ── Render grid de productos ──
function renderProductGrid(containerId, products) {
  const container = document.getElementById(containerId);
  if (!products || products.length === 0) {
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 0;color:var(--gray-400)">
        <div style="font-size:2.5rem;margin-bottom:12px">📦</div>
        <p>No se encontraron productos</p>
      </div>`;
    return;
  }

  container.innerHTML = products.map(p => createProductCard(p)).join('');
}

// ── Tarjeta de producto ──
function createProductCard(p) {
  const hasDiscount = p.discount_percent > 0;
  const finalPrice  = hasDiscount
    ? p.price * (1 - p.discount_percent / 100)
    : p.price;
  const imgContent  = p.image_url
    ? `<img src="${p.image_url}" alt="${escHtml(p.name)}" loading="lazy">`
    : getCategoryEmoji(p.category);

  return `
    <div class="product-card" onclick="openProductDetail(${p.id})">
      ${hasDiscount ? `<span class="discount-badge">-${p.discount_percent}%</span>` : ''}
      <div class="product-card__img">${imgContent}</div>
      <div class="product-card__body">
        <p class="product-card__brand">${escHtml(p.brand || '')}</p>
        <p class="product-card__name">${escHtml(p.name)}</p>
        <div class="product-card__pricing">
          <span class="price-final">${formatCOP(finalPrice)}</span>
          ${hasDiscount ? `<span class="price-original">${formatCOP(p.price)}</span>` : ''}
        </div>
      </div>
      <div class="product-card__footer">
        <button class="btn-add-cart ${p.stock === 0 ? 'out-of-stock' : ''}"
          onclick="event.stopPropagation(); ${p.stock > 0 ? `addToCart(${JSON.stringify(p).replace(/"/g,"'")})` : ''}"
          ${p.stock === 0 ? 'disabled' : ''}>
          ${p.stock === 0 ? 'Agotado' : '+ Agregar'}
        </button>
      </div>
    </div>`;
}

// ── Detalle de producto (modal) ──
async function openProductDetail(productId) {
  openModal('productModal');
  const content = document.getElementById('productDetailContent');
  content.innerHTML = '<div style="padding:40px;text-align:center;color:var(--gray-400)">Cargando…</div>';

  try {
    const p = await API.getProduct(productId);
    const hasDiscount = p.discount_percent > 0;
    const finalPrice  = hasDiscount ? p.price * (1 - p.discount_percent / 100) : p.price;
    const imgContent  = p.image_url
      ? `<img src="${p.image_url}" alt="${escHtml(p.name)}">`
      : `<span>${getCategoryEmoji(p.category)}</span>`;

    document.getElementById('modalProductName').textContent = p.name;

    content.innerHTML = `
      <div class="product-detail-img">${imgContent}</div>
      <div class="product-detail-info">
        <p class="product-detail-brand">${escHtml(p.brand || '')} · ${getCategoryLabel(p.category)}</p>
        <h2 class="product-detail-name">${escHtml(p.name)}</h2>
        <p class="product-detail-desc">${escHtml(p.description || 'Sin descripción disponible.')}</p>
        <div class="product-detail-pricing">
          <span class="product-detail-price-final">${formatCOP(finalPrice)}</span>
          ${hasDiscount ? `<span class="product-detail-price-orig">${formatCOP(p.price)}</span>
          <span class="discount-badge" style="position:static">-${p.discount_percent}%</span>` : ''}
        </div>
        <p style="font-size:.82rem;color:var(--gray-400)">
          ${p.stock > 0 ? `${p.stock} unidades disponibles` : '<span style="color:var(--danger)">Sin stock</span>'}
        </p>
        <div class="product-qty-control">
          <div class="qty-large">
            <button onclick="changeDetailQty(-1)">−</button>
            <span id="detailQty">1</span>
            <button onclick="changeDetailQty(1)">+</button>
          </div>
          <button class="btn btn--primary ${p.stock === 0 ? 'out-of-stock' : ''}"
            id="detailAddBtn"
            data-product='${JSON.stringify(p)}'
            onclick="addDetailToCart()"
            ${p.stock === 0 ? 'disabled' : ''}>
            ${p.stock === 0 ? 'Agotado' : 'Agregar al carrito'}
          </button>
        </div>
        <p style="font-size:.78rem;color:var(--gray-400)">Proveedor: ${escHtml(p.supplier || '—')}</p>
      </div>`;
  } catch {
    content.innerHTML = '<p style="padding:40px;color:var(--danger)">Error al cargar el producto.</p>';
  }
}

let detailQty = 1;
function changeDetailQty(delta) {
  detailQty = Math.max(1, detailQty + delta);
  document.getElementById('detailQty').textContent = detailQty;
}
function addDetailToCart() {
  const btn     = document.getElementById('detailAddBtn');
  const product = JSON.parse(btn.dataset.product);
  addToCart(product, detailQty);
  closeAllModals();
  detailQty = 1;
}

// ── Búsqueda global (barra navbar) ──
async function searchProducts() {
  const q = document.getElementById('globalSearch').value.trim();
  if (!q) return;
  showPage('categories');
  document.getElementById('categoriesTitle').textContent = `Búsqueda: "${q}"`;
  currentPage = 1;
  await loadProducts({ search: q });
}

// ── Búsqueda con dropdown ──
document.getElementById('globalSearch')?.addEventListener('input', function() {
  clearTimeout(searchTimeout);
  const q = this.value.trim();
  const dd = document.getElementById('searchDropdown');
  if (q.length < 2) { dd.classList.remove('show'); return; }

  searchTimeout = setTimeout(async () => {
    try {
      const data = await API.searchProducts(q);
      const products = (data.results || data).slice(0, 5);
      if (!products.length) { dd.classList.remove('show'); return; }

      dd.innerHTML = products.map(p => {
        const price = p.discount_percent > 0
          ? p.price * (1 - p.discount_percent / 100) : p.price;
        return `
          <div class="search-result-item" onclick="openProductDetail(${p.id}); document.getElementById('searchDropdown').classList.remove('show')">
            <div class="search-result-img" style="width:40px;height:40px;background:var(--cream-dark);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;">
              ${p.image_url ? `<img src="${p.image_url}" style="width:100%;height:100%;object-fit:cover;border-radius:6px">` : getCategoryEmoji(p.category)}
            </div>
            <div class="search-result-info">
              <p>${escHtml(p.name)}</p>
              <span>${escHtml(p.brand || '')}</span>
            </div>
            <span class="search-result-price">${formatCOP(price)}</span>
          </div>`;
      }).join('');
      dd.classList.add('show');
    } catch {}
  }, 300);
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.navbar__search')) {
    document.getElementById('searchDropdown')?.classList.remove('show');
  }
});

document.getElementById('globalSearch')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') searchProducts();
});

// ── Filtros de sidebar ──
function applyFilters() {
  const categories = [...document.querySelectorAll('#categoryFilter input:checked')]
    .map(cb => cb.value);
  const priceMin = document.getElementById('priceMin').value;
  const priceMax = document.getElementById('priceMax').value;
  const sortBy   = document.getElementById('sortBy').value;
  const onSale   = document.getElementById('onSaleOnly').checked;

  const params = {};
  if (categories.length) params.category = categories.join(',');
  if (priceMin > 0)       params.price_min = priceMin;
  if (priceMax < 5000000) params.price_max = priceMax;
  if (sortBy !== 'relevance') params.ordering = sortBy;
  if (onSale)             params.on_sale = true;

  currentPage = 1;
  showPage('categories');
  loadProducts(params);
}

function clearFilters() {
  document.querySelectorAll('#categoryFilter input').forEach(cb => cb.checked = false);
  document.getElementById('priceMin').value = 0;
  document.getElementById('priceMax').value = 5000000;
  document.getElementById('sortBy').value   = 'relevance';
  document.getElementById('onSaleOnly').checked = false;
  updatePriceLabel();
  loadProducts();
}

function updatePriceLabel() {
  const min = parseInt(document.getElementById('priceMin').value);
  const max = parseInt(document.getElementById('priceMax').value);
  document.getElementById('priceMinLabel').textContent = formatCOP(min);
  document.getElementById('priceMaxLabel').textContent = formatCOP(max);
}

function filterByCategory(cat) {
  document.querySelectorAll('#categoryFilter input').forEach(cb => cb.checked = false);
  const cb = document.querySelector(`#categoryFilter input[value="${cat}"]`);
  if (cb) cb.checked = true;
  document.getElementById('categoriesTitle').textContent = getCategoryLabel(cat);
  showPage('categories');
  currentPage = 1;
  loadProducts({ category: cat });
}

// ── Paginación ──
function renderPagination(total) {
  const pages = Math.ceil(total / PAGE_SIZE);
  const container = document.getElementById('pagination');
  if (pages <= 1) { container.innerHTML = ''; return; }

  let html = '';
  if (currentPage > 1)
    html += `<button onclick="goToPage(${currentPage-1})">‹</button>`;

  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - currentPage) <= 2) {
      html += `<button class="${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    } else if (Math.abs(i - currentPage) === 3) {
      html += `<button disabled>…</button>`;
    }
  }

  if (currentPage < pages)
    html += `<button onclick="goToPage(${currentPage+1})">›</button>`;

  container.innerHTML = html;
}

function goToPage(page) {
  currentPage = page;
  applyFilters();
  document.getElementById('page-categories').scrollIntoView({ behavior: 'smooth' });
}

// ── Helpers ──
function getCategoryEmoji(cat) {
  const map = { electronics:'📱', clothing:'👕', home:'🛋️', sports:'⚽', beauty:'💄', food:'🥗' };
  return map[cat] || '📦';
}
function getCategoryLabel(cat) {
  const map = { electronics:'Electrónica', clothing:'Ropa', home:'Hogar', sports:'Deportes', beauty:'Belleza', food:'Alimentos' };
  return map[cat] || cat;
}
function formatCOP(n) {
  return '$' + Math.round(n).toLocaleString('es-CO');
}
function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
