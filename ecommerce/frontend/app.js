/* ══════════════════════════════════════════════
   app.js — Enrutamiento, modales, inicialización
══════════════════════════════════════════════ */

// ═══════════════════════════════════════
// NAVEGACIÓN ENTRE PÁGINAS
// ═══════════════════════════════════════
const pages = ['home', 'categories', 'promos', 'contact', 'profile', 'history', 'adminPanel'];

function showPage(pageName) {
  // Guard para páginas protegidas
  if (['profile', 'history'].includes(pageName) && !currentUser) {
    openModal('loginModal');
    return;
  }
  if (pageName === 'adminPanel' && currentUser?.role !== 'admin') {
    showToast('Acceso restringido a administradores', 'error');
    return;
  }

  // Desactivar todos, activar el solicitado
  pages.forEach(p => {
    const el = document.getElementById(`page-${p}`);
    if (el) el.classList.remove('active');
  });
  const target = document.getElementById(`page-${pageName}`);
  if (target) target.classList.add('active');

  // Actualizar links del navbar
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.page === pageName);
  });

  // Cerrar dropdown de usuario
  document.getElementById('userDropdown')?.classList.add('hidden');
  document.querySelector('.avatar-wrap')?.classList.remove('open');

  // Cargar datos según la página
  switch (pageName) {
    case 'home':       loadFeaturedProducts(); break;
    case 'categories': if (!allProducts.length) loadProducts(); break;
    case 'promos':     loadPromos(); break;
    case 'history':    loadOrderHistory(); break;
    case 'adminPanel': loadAdminClients(); break;
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Links del navbar
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    showPage(link.dataset.page);
  });
});

// ═══════════════════════════════════════
// MODALES
// ═══════════════════════════════════════
function openModal(modalId) {
  document.getElementById('modalOverlay').classList.remove('hidden');
  document.getElementById(modalId).classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeAllModals() {
  document.getElementById('modalOverlay').classList.add('hidden');
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  document.body.style.overflow = '';
}

function switchModal(fromId, toId) {
  document.getElementById(fromId).classList.add('hidden');
  document.getElementById(toId).classList.remove('hidden');
}

// Cerrar con ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeAllModals();
});

// ═══════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('collapsed');
}

// ═══════════════════════════════════════
// TOAST
// ═══════════════════════════════════════
let toastTimer;
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  toast.className = `toast show${type ? ` toast--${type}` : ''}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}

// ═══════════════════════════════════════
// CONTACTO
// ═══════════════════════════════════════
async function sendContact(e) {
  e.preventDefault();
  const form = e.target;
  const data = {
    name:    form.querySelector('input[type="text"]').value,
    email:   form.querySelector('input[type="email"]').value,
    subject: form.querySelector('select').value,
    message: form.querySelector('textarea').value,
  };
  try {
    await API.sendContact(data);
    showToast('Mensaje enviado. Te responderemos pronto.', 'success');
    form.reset();
  } catch {
    showToast('Error al enviar el mensaje. Intenta de nuevo.', 'error');
  }
}

// ═══════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  await initAuth();
  showPage('home');
  updatePriceLabel();
});
