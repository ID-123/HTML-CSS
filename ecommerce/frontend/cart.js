/* ══════════════════════════════════════════════
   cart.js — Carrito de compras
══════════════════════════════════════════════ */

let cartItems = [];  // [{ product, quantity }]

// ── Toggle panel carrito ──
function toggleCart() {
  const panel   = document.getElementById('cartPanel');
  const overlay = document.getElementById('cartOverlay');
  panel.classList.toggle('hidden');
  overlay.classList.toggle('hidden');
}

// ── Agregar al carrito ──
function addToCart(product, qty = 1) {
  const existing = cartItems.find(ci => ci.product.id === product.id);
  if (existing) {
    existing.quantity = Math.min(existing.quantity + qty, product.stock);
  } else {
    cartItems.push({ product, quantity: qty });
  }
  renderCart();
  updateCartCount();
  showToast(`"${product.name}" agregado al carrito`, 'success');
}

// ── Render carrito ──
function renderCart() {
  const container = document.getElementById('cartItems');
  const footer    = document.getElementById('cartFooter');

  if (!cartItems.length) {
    container.innerHTML = `
      <div class="empty-cart">
        <span>🛒</span>
        <p>Tu carrito está vacío</p>
      </div>`;
    footer.style.display = 'none';
    return;
  }

  footer.style.display = 'block';

  container.innerHTML = cartItems.map((ci, idx) => {
    const p = ci.product;
    const hasDisc = p.discount_percent > 0;
    const finalPrice = hasDisc ? p.price * (1 - p.discount_percent / 100) : p.price;
    const imgContent = p.image_url
      ? `<img src="${p.image_url}" style="width:100%;height:100%;object-fit:cover;border-radius:6px">`
      : getCategoryEmoji(p.category);

    return `
      <div class="cart-item">
        <div class="cart-item__img">${imgContent}</div>
        <div class="cart-item__info">
          <p class="cart-item__name">${escHtml(p.name)}</p>
          <p class="cart-item__price">${formatCOP(finalPrice)} c/u</p>
        </div>
        <div class="cart-item__qty">
          <button class="qty-btn" onclick="changeCartQty(${idx}, -1)">−</button>
          <span class="qty-num">${ci.quantity}</span>
          <button class="qty-btn" onclick="changeCartQty(${idx}, 1)">+</button>
        </div>
        <button class="cart-item__remove" onclick="removeCartItem(${idx})" title="Eliminar">✕</button>
      </div>`;
  }).join('');

  updateCartTotals();
  updatePointsRedeemUI();
}

// ── Cambiar cantidad ──
function changeCartQty(idx, delta) {
  cartItems[idx].quantity += delta;
  if (cartItems[idx].quantity <= 0) {
    cartItems.splice(idx, 1);
  } else {
    const maxStock = cartItems[idx]?.product.stock || 99;
    cartItems[idx].quantity = Math.min(cartItems[idx].quantity, maxStock);
  }
  renderCart();
  updateCartCount();
}

// ── Eliminar item ──
function removeCartItem(idx) {
  cartItems.splice(idx, 1);
  renderCart();
  updateCartCount();
}

// ── Totales ──
function updateCartTotals() {
  const subtotal = calcSubtotal();
  const discount = calcPointsDiscount(subtotal);
  const total    = Math.max(0, subtotal - discount);

  document.getElementById('cartSubtotal').textContent = formatCOP(subtotal);
  document.getElementById('cartTotal').textContent    = formatCOP(total);

  const discountRow = document.getElementById('discountRow');
  if (discount > 0) {
    discountRow.classList.remove('hidden');
    document.getElementById('cartDiscount').textContent = `-${formatCOP(discount)}`;
  } else {
    discountRow.classList.add('hidden');
  }
}

function calcSubtotal() {
  return cartItems.reduce((sum, ci) => {
    const p = ci.product;
    const price = p.discount_percent > 0 ? p.price * (1 - p.discount_percent / 100) : p.price;
    return sum + price * ci.quantity;
  }, 0);
}

function updateCartCount() {
  const total = cartItems.reduce((s, ci) => s + ci.quantity, 0);
  document.getElementById('cartCount').textContent = total;
}

// ── Checkout ──
async function checkout() {
  if (!currentUser) {
    toggleCart();
    openModal('loginModal');
    return;
  }

  const subtotal   = calcSubtotal();
  const discount   = calcPointsDiscount(subtotal);
  const pointsUsed = getPointsToUse();
  const total      = Math.max(0, subtotal - discount);

  const orderData = {
    items: cartItems.map(ci => ({
      product_id: ci.product.id,
      quantity:   ci.quantity,
      unit_price: ci.product.price,
      discount_percent: ci.product.discount_percent || 0,
    })),
    subtotal,
    discount_amount: discount,
    points_used: pointsUsed,
    total,
  };

  try {
    const order = await API.createOrder(orderData);
    cartItems = [];
    renderCart();
    updateCartCount();
    toggleCart();

    // Actualizar puntos del usuario
    const newPoints = Math.floor(total / 100);
    currentUser.points = (currentUser.points || 0) - pointsUsed + newPoints;
    updatePointsUI(currentUser.points);
    document.getElementById('redeemPoints').checked = false;
    togglePointsRedeem();

    showToast(`✅ Pedido #${order.invoice_code} realizado. +${newPoints} puntos ganados`, 'success');
    showPage('history');
    loadOrderHistory();
  } catch (err) {
    showToast(err.message || 'Error al procesar el pedido', 'error');
  }
}
