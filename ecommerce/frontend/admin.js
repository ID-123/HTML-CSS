/* ══════════════════════════════════════════════
   admin.js — Panel de administración
══════════════════════════════════════════════ */

let allClients  = [];
let allAdminProducts = [];
let editingProductId = null;

// ═══════════════════════════════════════
// TABS
// ═══════════════════════════════════════
function switchAdminTab(tab, btn) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(`admin${tab.charAt(0).toUpperCase() + tab.slice(1)}`).classList.add('active');

  if (tab === 'clients')  loadAdminClients();
  if (tab === 'products') loadAdminProducts();
}

// ═══════════════════════════════════════
// GESTIÓN DE CLIENTES
// ═══════════════════════════════════════
async function loadAdminClients() {
  const tbody = document.getElementById('clientsBody');
  tbody.innerHTML = `<tr><td colspan="9" class="empty-row">Cargando…</td></tr>`;

  try {
    const data = await API.adminGetClients();
    allClients = data.results || data;
    document.getElementById('clientsCount').textContent = `${allClients.length} clientes`;
    renderClientsTable(allClients);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-row" style="color:var(--danger)">Error al cargar clientes.</td></tr>`;
  }
}

function renderClientsTable(clients) {
  const tbody = document.getElementById('clientsBody');
  if (!clients.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-row">No se encontraron clientes.</td></tr>`;
    return;
  }

  tbody.innerHTML = clients.map(c => {
    const statusClass = c.is_blocked ? 'badge--blocked' : 'badge--active';
    const statusLabel = c.is_blocked ? 'Bloqueado' : 'Activo';
    return `
      <tr>
        <td><code>${c.id}</code></td>
        <td>${escHtml(c.document || '—')}</td>
        <td>${escHtml(c.first_name || '—')}</td>
        <td>${escHtml(c.last_name  || '—')}</td>
        <td>${escHtml(c.phone   || '—')}</td>
        <td>${escHtml(c.address || '—')}</td>
        <td>${escHtml(c.email)}</td>
        <td>
          <span class="badge ${statusClass}">${statusLabel}</span>
          &nbsp;
          <button class="btn btn--sm btn--outline" onclick="openClientDetail(${c.id})" title="Ver compras">
            📋 ${c.order_count || 0} facturas
          </button>
        </td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn--sm ${c.is_blocked ? 'btn--primary' : 'btn--outline'}"
              onclick="toggleBlockClient(${c.id}, ${c.is_blocked})">
              ${c.is_blocked ? '🔓 Desbloquear' : '🔒 Bloquear'}
            </button>
            <button class="btn btn--sm btn--danger" onclick="deleteClient(${c.id}, '${escHtml(c.first_name)} ${escHtml(c.last_name)}')">
              🗑 Eliminar
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function filterClients(q) {
  const lower = q.toLowerCase();
  const filtered = allClients.filter(c =>
    (c.first_name + ' ' + c.last_name + ' ' + c.email + ' ' + (c.document || '')).toLowerCase().includes(lower)
  );
  renderClientsTable(filtered);
}

async function toggleBlockClient(id, isBlocked) {
  if (!confirm(isBlocked ? '¿Desbloquear este cliente?' : '¿Bloquear este cliente?')) return;
  try {
    await API.adminBlockClient(id);
    showToast(isBlocked ? 'Cliente desbloqueado' : 'Cliente bloqueado');
    loadAdminClients();
  } catch (err) {
    showToast(err.message || 'Error', 'error');
  }
}

async function deleteClient(id, name) {
  if (!confirm(`¿Eliminar permanentemente al cliente "${name}"?\nEsta acción no se puede deshacer.`)) return;
  try {
    await API.adminDeleteClient(id);
    showToast(`Cliente "${name}" eliminado`);
    loadAdminClients();
  } catch (err) {
    showToast(err.message || 'Error al eliminar', 'error');
  }
}

// ── Modal detalle de cliente ──
async function openClientDetail(clientId) {
  openModal('clientDetailModal');
  const content = document.getElementById('clientDetailContent');
  content.innerHTML = '<p style="padding:24px;color:var(--gray-400)">Cargando…</p>';

  try {
    const c = await API.adminGetClient(clientId);
    document.getElementById('clientDetailName').textContent =
      `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email;

    const orders = c.recent_orders || [];
    const ordersHTML = orders.length
      ? `<table class="admin-table" style="border-radius:var(--radius-md);overflow:hidden">
          <thead><tr><th>Factura</th><th>Fecha</th><th>Items</th><th>Total</th><th>Estado</th></tr></thead>
          <tbody>
            ${orders.map(o => `
              <tr>
                <td><span class="invoice-link" onclick="window.open('/invoice/${o.invoice_code}','_blank')">#${o.invoice_code}</span></td>
                <td>${formatDate(o.created_at)}</td>
                <td>${o.item_count || '—'}</td>
                <td>${formatCOP(o.total)}</td>
                <td><span class="badge ${{ completed:'badge--active', pending:'badge--hidden', cancelled:'badge--blocked' }[o.status] || 'badge--hidden'}">${translateStatus(o.status)}</span></td>
              </tr>`).join('')}
          </tbody>
        </table>`
      : '<p style="color:var(--gray-400);font-size:.88rem">Sin compras registradas.</p>';

    content.innerHTML = `
      <div style="padding:0 28px 28px">
        <div class="client-info-grid">
          <div class="client-info-item"><label>ID Cliente</label><span>${c.id}</span></div>
          <div class="client-info-item"><label>Documento</label><span>${escHtml(c.document || '—')}</span></div>
          <div class="client-info-item"><label>Correo</label><span>${escHtml(c.email)}</span></div>
          <div class="client-info-item"><label>Teléfono</label><span>${escHtml(c.phone || '—')}</span></div>
          <div class="client-info-item"><label>Dirección</label><span>${escHtml(c.address || '—')}</span></div>
          <div class="client-info-item"><label>Puntos</label><span>◆ ${c.points || 0}</span></div>
        </div>
        <div class="client-actions">
          <button class="btn btn--sm ${c.is_blocked ? 'btn--primary' : 'btn--outline'}" onclick="toggleBlockClient(${c.id}, ${c.is_blocked}); closeAllModals(); setTimeout(loadAdminClients, 500)">
            ${c.is_blocked ? '🔓 Desbloquear' : '🔒 Bloquear'}
          </button>
          <button class="btn btn--sm btn--danger" onclick="deleteClient(${c.id}, '${escHtml(c.first_name)} ${escHtml(c.last_name)}'); closeAllModals()">
            🗑 Eliminar cliente
          </button>
        </div>
        <p class="client-orders-title">Compras recientes</p>
        ${ordersHTML}
      </div>`;
  } catch (err) {
    content.innerHTML = `<p style="padding:24px;color:var(--danger)">Error al cargar datos del cliente.</p>`;
  }
}

// ═══════════════════════════════════════
// GESTIÓN DE PRODUCTOS
// ═══════════════════════════════════════
async function loadAdminProducts() {
  const tbody = document.getElementById('productsBody');
  tbody.innerHTML = `<tr><td colspan="8" class="empty-row">Cargando…</td></tr>`;

  try {
    const data = await API.adminGetProducts();
    allAdminProducts = data.results || data;
    renderAdminProductsTable(allAdminProducts);
  } catch {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-row" style="color:var(--danger)">Error al cargar productos.</td></tr>`;
  }
}

function renderAdminProductsTable(products) {
  const tbody = document.getElementById('productsBody');
  if (!products.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-row">No se encontraron productos.</td></tr>`;
    return;
  }

  tbody.innerHTML = products.map(p => {
    const hasDiscount = p.discount_percent > 0;
    const finalPrice  = hasDiscount ? p.price * (1 - p.discount_percent / 100) : p.price;
    const statusClass = !p.visible ? 'badge--hidden' : (hasDiscount ? 'badge--promo' : 'badge--active');
    const statusLabel = !p.visible ? 'Oculto' : (hasDiscount ? `Oferta -${p.discount_percent}%` : 'Activo');

    return `
      <tr>
        <td><code>${p.id}</code></td>
        <td>
          <strong>${escHtml(p.name)}</strong>
          <br><small style="color:var(--gray-400)">${escHtml(p.description || '').slice(0,60)}${(p.description||'').length>60?'…':''}</small>
        </td>
        <td>${escHtml(p.brand || '—')}</td>
        <td>${escHtml(p.supplier || '—')}</td>
        <td>
          <span style="font-weight:600;color:${p.stock === 0 ? 'var(--danger)' : p.stock < 5 ? 'var(--warning)' : 'inherit'}">
            ${p.stock}
          </span>
        </td>
        <td>
          ${formatCOP(finalPrice)}
          ${hasDiscount ? `<br><small style="color:var(--gray-400);text-decoration:line-through">${formatCOP(p.price)}</small>` : ''}
        </td>
        <td><span class="badge ${statusClass}">${statusLabel}</span></td>
        <td>
          <div class="actions-dropdown" id="dd-${p.id}">
            <button class="actions-btn" onclick="toggleActionsMenu(${p.id})">
              Acciones ▾
            </button>
            <div class="actions-menu" id="menu-${p.id}">
              <button onclick="openProductModal('new'); closeActionsMenu(${p.id})">
                ➕ Añadir nuevo producto
              </button>
              <button onclick="openAddStockModal(${p.id}, '${escHtml(p.name)}'); closeActionsMenu(${p.id})">
                📦 Añadir a existente
              </button>
              <button onclick="openProductModal('edit', ${p.id}); closeActionsMenu(${p.id})">
                ✏️ Editar producto
              </button>
              <button class="action-warning" onclick="toggleProductVisibility(${p.id}, ${p.visible}); closeActionsMenu(${p.id})">
                ${p.visible ? '👁 Ocultar producto' : '👁 Mostrar producto'}
              </button>
              <button class="action-danger" onclick="deleteAdminProduct(${p.id}, '${escHtml(p.name)}'); closeActionsMenu(${p.id})">
                🗑 Eliminar producto
              </button>
            </div>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function filterProducts(q) {
  const lower = q.toLowerCase();
  const filtered = allAdminProducts.filter(p =>
    (p.name + ' ' + (p.brand||'') + ' ' + (p.supplier||'')).toLowerCase().includes(lower)
  );
  renderAdminProductsTable(filtered);
}

// ── Dropdown de acciones ──
function toggleActionsMenu(id) {
  const menu = document.getElementById(`menu-${id}`);
  // Cerrar los demás
  document.querySelectorAll('.actions-menu.open').forEach(m => {
    if (m.id !== `menu-${id}`) m.classList.remove('open');
  });
  menu.classList.toggle('open');
}
function closeActionsMenu(id) {
  document.getElementById(`menu-${id}`)?.classList.remove('open');
}
document.addEventListener('click', (e) => {
  if (!e.target.closest('.actions-dropdown')) {
    document.querySelectorAll('.actions-menu.open').forEach(m => m.classList.remove('open'));
  }
});

// ── Modal crear/editar producto ──
function openProductModal(mode, productId = null) {
  editingProductId = productId;
  const modal = document.getElementById('adminProductModal');
  document.getElementById('adminModalTitle').textContent = mode === 'new' ? 'Nuevo producto' : 'Editar producto';
  document.getElementById('apSubmitBtn').textContent = mode === 'new' ? 'Crear producto' : 'Guardar cambios';
  document.getElementById('adminProductForm').reset();
  document.getElementById('apId').value = '';

  if (mode === 'edit' && productId) {
    const p = allAdminProducts.find(x => x.id === productId);
    if (p) {
      document.getElementById('apId').value          = p.id;
      document.getElementById('apName').value        = p.name || '';
      document.getElementById('apBrand').value       = p.brand || '';
      document.getElementById('apSupplier').value    = p.supplier || '';
      document.getElementById('apCategory').value    = p.category || '';
      document.getElementById('apPrice').value       = p.price || '';
      document.getElementById('apStock').value       = p.stock || '';
      document.getElementById('apDiscount').value    = p.discount_percent || 0;
      document.getElementById('apImage').value       = p.image_url || '';
      document.getElementById('apDescription').value = p.description || '';
    }
  }

  openModal('adminProductModal');
}

// ── Modal añadir stock ──
function openAddStockModal(productId, productName) {
  const qty = parseInt(prompt(`Añadir stock a "${productName}"\n\nCantidad a agregar:`));
  if (!qty || qty <= 0) return;
  addStockToProduct(productId, qty);
}

async function addStockToProduct(id, qty) {
  try {
    await API.adminAddStock(id, qty);
    showToast(`+${qty} unidades añadidas`);
    loadAdminProducts();
  } catch (err) {
    showToast(err.message || 'Error al añadir stock', 'error');
  }
}

async function saveProduct(e) {
  e.preventDefault();
  const id   = document.getElementById('apId').value;
  const data = {
    name:             document.getElementById('apName').value,
    brand:            document.getElementById('apBrand').value,
    supplier:         document.getElementById('apSupplier').value,
    category:         document.getElementById('apCategory').value,
    price:            parseFloat(document.getElementById('apPrice').value),
    stock:            parseInt(document.getElementById('apStock').value),
    discount_percent: parseInt(document.getElementById('apDiscount').value) || 0,
    image_url:        document.getElementById('apImage').value,
    description:      document.getElementById('apDescription').value,
    visible:          true,
  };

  try {
    if (id) {
      await API.adminUpdateProduct(id, data);
      showToast('Producto actualizado', 'success');
    } else {
      await API.adminCreateProduct(data);
      showToast('Producto creado', 'success');
    }
    closeAllModals();
    loadAdminProducts();
  } catch (err) {
    showToast(err.message || 'Error al guardar', 'error');
  }
}

async function toggleProductVisibility(id, currentlyVisible) {
  try {
    await API.adminToggleVisible(id, !currentlyVisible);
    showToast(currentlyVisible ? 'Producto ocultado' : 'Producto visible');
    loadAdminProducts();
  } catch (err) {
    showToast(err.message || 'Error', 'error');
  }
}

async function deleteAdminProduct(id, name) {
  if (!confirm(`¿Eliminar el producto "${name}"?\nEsta acción es permanente.`)) return;
  try {
    await API.adminDeleteProduct(id);
    showToast(`Producto "${name}" eliminado`);
    loadAdminProducts();
  } catch (err) {
    showToast(err.message || 'Error al eliminar', 'error');
  }
}
