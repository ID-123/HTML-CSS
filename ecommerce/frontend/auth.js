/* ══════════════════════════════════════════════
   auth.js — Autenticación y sesión de usuario
══════════════════════════════════════════════ */

let currentUser = null;

// ── Inicializar sesión al cargar ──
async function initAuth() {
  const token = localStorage.getItem('authToken');
  if (!token) return;
  try {
    const user = await API.profile();
    setUser(user);
  } catch {
    localStorage.removeItem('authToken');
  }
}

// ── Configurar UI según usuario ──
function setUser(user) {
  currentUser = user;

  document.getElementById('authButtons').classList.add('hidden');
  document.getElementById('userMenu').classList.remove('hidden');

  const initial = (user.first_name?.[0] || user.email?.[0] || 'U').toUpperCase();
  document.getElementById('avatarInitial').textContent = initial;
  document.getElementById('profileAvatarLg').textContent = initial;
  document.getElementById('dropdownName').textContent =
    `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;

  const roleTag = document.getElementById('roleTag');
  roleTag.textContent = user.role === 'admin' ? 'administrador' : 'cliente';
  roleTag.style.background = user.role === 'admin' ? 'var(--coral)' : 'var(--indigo-soft)';

  // Mostrar/ocultar links de admin
  if (user.role === 'admin') {
    document.getElementById('adminLink').classList.remove('hidden');
    document.getElementById('historyLink').classList.add('hidden');
  } else {
    document.getElementById('adminLink').classList.add('hidden');
    document.getElementById('historyLink').classList.remove('hidden');
  }

  // Rellenar perfil
  document.getElementById('profileName').textContent =
    `${user.first_name || ''} ${user.last_name || ''}`.trim() || '—';
  document.getElementById('profileEmail').textContent = user.email || '—';
  document.getElementById('pfFirstName').value = user.first_name || '';
  document.getElementById('pfLastName').value  = user.last_name  || '';
  document.getElementById('pfDocument').value  = user.document   || '';
  document.getElementById('pfPhone').value     = user.phone      || '';
  document.getElementById('pfAddress').value   = user.address    || '';
  document.getElementById('pfEmail').value     = user.email      || '';

  updatePointsUI(user.points || 0);
}

// ── Login ──
async function login(e) {
  e.preventDefault();
  const email    = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const errEl    = document.getElementById('loginError');
  errEl.classList.add('hidden');

  try {
    const res = await API.login(email, password);
    localStorage.setItem('authToken', res.token);
    setUser(res.user);
    closeAllModals();
    showToast('¡Bienvenido de vuelta!', 'success');

    if (res.user.role === 'admin') {
      showPage('adminPanel');
    }
  } catch (err) {
    errEl.textContent = err.message || 'Credenciales incorrectas';
    errEl.classList.remove('hidden');
  }
}

// ── Registro ──
async function register(e) {
  e.preventDefault();
  const errEl = document.getElementById('registerError');
  errEl.classList.add('hidden');

  const data = {
    first_name: document.getElementById('regFirstName').value,
    last_name:  document.getElementById('regLastName').value,
    document:   document.getElementById('regDocument').value,
    email:      document.getElementById('regEmail').value,
    password:   document.getElementById('regPassword').value,
    phone:      document.getElementById('regPhone').value,
  };

  try {
    const res = await API.register(data);
    localStorage.setItem('authToken', res.token);
    setUser(res.user);
    closeAllModals();
    showToast('¡Cuenta creada exitosamente!', 'success');
  } catch (err) {
    const msg = err.data
      ? Object.values(err.data).flat().join(' ')
      : (err.message || 'Error al registrarse');
    errEl.textContent = msg;
    errEl.classList.remove('hidden');
  }
}

// ── Logout ──
async function logout() {
  try { await API.logout(); } catch {}
  localStorage.removeItem('authToken');
  currentUser = null;
  document.getElementById('authButtons').classList.remove('hidden');
  document.getElementById('userMenu').classList.add('hidden');
  document.getElementById('userDropdown').classList.add('hidden');
  cartItems = [];
  renderCart();
  showPage('home');
  showToast('Sesión cerrada');
}

// ── Actualizar perfil ──
async function updateProfile(e) {
  e.preventDefault();
  const data = {
    first_name: document.getElementById('pfFirstName').value,
    last_name:  document.getElementById('pfLastName').value,
    document:   document.getElementById('pfDocument').value,
    phone:      document.getElementById('pfPhone').value,
    address:    document.getElementById('pfAddress').value,
    email:      document.getElementById('pfEmail').value,
  };
  try {
    const updated = await API.updateProfile(data);
    setUser({ ...currentUser, ...updated });
    showToast('Perfil actualizado', 'success');
  } catch (err) {
    showToast(err.message || 'Error al guardar', 'error');
  }
}

// ── Dropdown usuario ──
function toggleUserDropdown() {
  const dd = document.getElementById('userDropdown');
  const wrap = document.querySelector('.avatar-wrap');
  dd.classList.toggle('hidden');
  wrap.classList.toggle('open');
}

// Cerrar dropdown al click fuera
document.addEventListener('click', (e) => {
  const wrap = document.querySelector('.avatar-wrap');
  const dd   = document.getElementById('userDropdown');
  if (wrap && !wrap.contains(e.target)) {
    dd?.classList.add('hidden');
    wrap?.classList.remove('open');
  }
});

// ── Guard: requiere login ──
function requireLogin(callback) {
  if (!currentUser) {
    openModal('loginModal');
    return false;
  }
  callback();
  return true;
}
