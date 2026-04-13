/* ══════════════════════════════════════════════
   points.js — Sistema de puntos de lealtad
   $100 COP = 1 punto
   Redención máxima: 35% del total
══════════════════════════════════════════════ */

const POINTS_PER_100   = 1;     // 1 punto por cada $100 gastados
const MAX_DISCOUNT_PCT = 0.35;  // máximo 35% de descuento por puntos
const COP_PER_POINT    = 100;   // 1 punto = $100 de descuento

// ── Actualizar UI de puntos en navbar y perfil ──
function updatePointsUI(points) {
  document.getElementById('pointsCount').textContent = points;
  document.getElementById('profilePoints').textContent = points;
  if (document.getElementById('totalPoints'))
    document.getElementById('totalPoints').textContent = `${points} ◆`;
}

// ── Mostrar/ocultar input de redención en carrito ──
function togglePointsRedeem() {
  const active   = document.getElementById('redeemPoints').checked;
  const inputWrap = document.getElementById('redeemInputWrap');
  const discountRow = document.getElementById('discountRow');

  if (active) {
    inputWrap.classList.remove('hidden');
    const avail = currentUser?.points || 0;
    document.getElementById('redeemablePoints').textContent = avail;
    document.getElementById('pointsToRedeem').max   = avail;
    document.getElementById('pointsToRedeem').value = '';
    document.getElementById('redeemHint').textContent = 'Descuento: $0';
  } else {
    inputWrap.classList.add('hidden');
    document.getElementById('pointsToRedeem').value = '';
    discountRow.classList.add('hidden');
  }
  updateCartTotals();
}

// ── Calcular descuento mientras el usuario escribe ──
function calcRedeem() {
  const subtotal  = calcSubtotal();
  const maxDiscount = subtotal * MAX_DISCOUNT_PCT;

  let pts  = parseInt(document.getElementById('pointsToRedeem').value) || 0;
  const avail = currentUser?.points || 0;

  // Limitar por puntos disponibles y por tope del 35%
  pts = Math.min(pts, avail);
  const discount = Math.min(pts * COP_PER_POINT, maxDiscount);

  document.getElementById('redeemHint').textContent = `Descuento: ${formatCOP(discount)}`;
  updateCartTotals();
}

// ── Obtener descuento calculado para checkout ──
function calcPointsDiscount(subtotal) {
  if (!document.getElementById('redeemPoints')?.checked) return 0;
  const pts = parseInt(document.getElementById('pointsToRedeem')?.value) || 0;
  const avail = currentUser?.points || 0;
  const effectivePts = Math.min(pts, avail);
  const maxDiscount  = subtotal * MAX_DISCOUNT_PCT;
  return Math.min(effectivePts * COP_PER_POINT, maxDiscount);
}

function getPointsToUse() {
  if (!document.getElementById('redeemPoints')?.checked) return 0;
  const pts   = parseInt(document.getElementById('pointsToRedeem')?.value) || 0;
  const avail = currentUser?.points || 0;
  return Math.min(pts, avail);
}

// ── Actualizar UI de puntos disponibles cuando se abre el carrito ──
function updatePointsRedeemUI() {
  if (!currentUser) return;
  document.getElementById('redeemablePoints').textContent = currentUser.points || 0;
  const maxDiscount = calcSubtotal() * MAX_DISCOUNT_PCT;
  const maxPoints   = Math.ceil(maxDiscount / COP_PER_POINT);
  const el = document.getElementById('pointsToRedeem');
  if (el) {
    el.max = Math.min(currentUser.points || 0, maxPoints);
    el.placeholder = `Máx ${el.max} pts (≤ 35%)`;
  }
}

// ── Historial: cargar compras ──
async function loadOrderHistory() {
  const tbody    = document.getElementById('historyBody');
  tbody.innerHTML = '<tr><td colspan="8" class="empty-row">Cargando…</td></tr>';

  try {
    const orders = await API.getOrders();
    if (!orders.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty-row">No hay compras registradas aún.</td></tr>';
      return;
    }

    let totalSpent = 0;
    let totalPts   = 0;

    // Expandir filas por cada ítem de cada orden
    const rows = [];
    orders.forEach(order => {
      totalSpent += order.total;
      totalPts   += order.points_earned || 0;
      const items = order.items || [{ product_name: '—', quantity: 1, unit_price: order.total, discount_percent: 0 }];
      const rowspan = items.length;

      items.forEach((item, i) => {
        const discVal = item.discount_percent > 0
          ? formatCOP(item.unit_price * item.discount_percent / 100) + ` (-${item.discount_percent}%)`
          : '—';
        const itemTotal = item.unit_price * item.quantity * (1 - (item.discount_percent || 0) / 100);
        const statusClass = { completed:'badge--active', pending:'badge--hidden', cancelled:'badge--blocked' }[order.status] || 'badge--hidden';

        if (i === 0) {
          rows.push(`
            <tr>
              <td rowspan="${rowspan}">
                <span class="invoice-link" onclick="openInvoice('${order.invoice_code}')">#${order.invoice_code}</span>
              </td>
              <td rowspan="${rowspan}">${formatDate(order.created_at)}</td>
              <td>${escHtml(item.product_name)}</td>
              <td>${item.quantity}</td>
              <td>${formatCOP(item.unit_price)}</td>
              <td>${discVal}</td>
              <td>${formatCOP(itemTotal)}</td>
              <td rowspan="${rowspan}">
                <span class="badge ${statusClass}">${translateStatus(order.status)}</span>
              </td>
            </tr>`);
        } else {
          rows.push(`
            <tr>
              <td>${escHtml(item.product_name)}</td>
              <td>${item.quantity}</td>
              <td>${formatCOP(item.unit_price)}</td>
              <td>${discVal}</td>
              <td>${formatCOP(itemTotal)}</td>
            </tr>`);
        }
      });

      // Fila de total de la orden
      rows.push(`
        <tr style="background:var(--cream)">
          <td colspan="5"></td>
          <td style="font-weight:700;color:var(--indigo)">Total factura:</td>
          <td style="font-weight:700;color:var(--indigo)">${formatCOP(order.total)}</td>
          <td></td>
        </tr>
        <tr><td colspan="8" style="padding:0;border-bottom:3px solid var(--cream-dark)"></td></tr>`);
    });

    tbody.innerHTML = rows.join('');
    document.getElementById('totalSpent').textContent = formatCOP(totalSpent);
    document.getElementById('totalPoints').textContent = `${totalPts} ◆`;
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-row" style="color:var(--danger)">Error al cargar historial.</td></tr>`;
  }
}

function openInvoice(code) {
  window.open(`/invoice/${code}`, '_blank');
}

function translateStatus(s) {
  return { completed:'Completado', pending:'Pendiente', cancelled:'Cancelado' }[s] || s;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' });
}
