# 🛒 Merkado — Guía completa de desarrollo

## Estructura del proyecto

```
merkado/
├── backend/                    ← Django REST API
│   ├── ecommerce/              ← Proyecto principal
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── users/                  ← App: autenticación y perfiles
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── serializers.py
│   │   └── urls.py
│   ├── products/               ← App: catálogo
│   ├── orders/                 ← App: pedidos e historial
│   ├── admin_panel/            ← App: panel admin
│   ├── contact/                ← App: formulario contacto
│   └── manage.py
└── frontend/                   ← HTML/CSS/JS estático
    ├── index.html
    ├── css/styles.css
    └── js/
        ├── api.js              ← Comunicación con Django
        ├── auth.js             ← Login / registro / sesión
        ├── products.js         ← Listado, búsqueda, filtros
        ├── cart.js             ← Carrito de compras
        ├── points.js           ← Sistema de puntos + historial
        ├── admin.js            ← Panel administrador
        └── app.js              ← Router, modales, init
```

---

## Paso 1 — Crear el proyecto Django

```bash
# Crear entorno virtual
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Instalar dependencias
pip install django djangorestframework django-cors-headers \
            django-filter Pillow python-decouple psycopg2-binary

# Crear proyecto y apps
django-admin startproject ecommerce .
python manage.py startapp users
python manage.py startapp products
python manage.py startapp orders
python manage.py startapp admin_panel
python manage.py startapp contact
python manage.py startapp points
```

---

## Paso 2 — Configurar settings.py

```python
# ecommerce/settings.py

AUTH_USER_MODEL = 'users.User'

INSTALLED_APPS = [
    # ... apps de Django
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'django_filters',
    # Tus apps:
    'users', 'products', 'orders',
    'admin_panel', 'contact', 'points',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # PRIMERO
    # ... resto
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 12,
}

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5500",    # Live Server
    "http://127.0.0.1:5500",
]
CORS_ALLOW_CREDENTIALS = True
```

---

## Paso 3 — Copiar los modelos

Copia el contenido de `backend/models.py` en los archivos correspondientes:

| Clase            | App destino         |
|------------------|---------------------|
| `User`, `UserManager` | `users/models.py` |
| `Product`, `Category` | `products/models.py` |
| `Order`, `OrderItem`  | `orders/models.py` |

---

## Paso 4 — Migraciones

```bash
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser      # crear admin inicial
```

---

## Paso 5 — Copiar vistas y serializers

Distribuye el contenido de `backend/views.py` y `backend/serializers.py`
en cada app. El patrón es:

```
users/
  ├── models.py         ← class User
  ├── serializers.py    ← UserSerializer, RegisterSerializer, etc.
  └── views.py          ← login_view, register_view, etc.

products/
  ├── models.py         ← class Product
  ├── serializers.py    ← ProductSerializer
  └── views.py          ← ProductViewSet
...
```

---

## Paso 6 — URLs

En `ecommerce/urls.py`, usa el contenido de `backend/urls_settings.py`.

---

## Paso 7 — Ejecutar el servidor

```bash
python manage.py runserver
# API disponible en: http://localhost:8000/api/
```

---

## Paso 8 — Abrir el frontend

Abre `frontend/index.html` con un servidor estático, por ejemplo:

- **VS Code Live Server**: clic derecho → "Open with Live Server"
- **Python**: `python -m http.server 5500` dentro de la carpeta `frontend/`

Verifica que en `frontend/js/api.js` la constante `BASE` apunte a tu servidor Django:
```javascript
const BASE = 'http://localhost:8000/api';
```

---

## Referencia de Endpoints API

| Método | URL                             | Descripción                        | Auth    |
|--------|---------------------------------|------------------------------------|---------|
| POST   | `/api/auth/login/`              | Iniciar sesión                     | No      |
| POST   | `/api/auth/register/`           | Crear cuenta                       | No      |
| POST   | `/api/auth/logout/`             | Cerrar sesión                      | Sí      |
| GET    | `/api/auth/profile/`            | Obtener perfil                     | Sí      |
| PATCH  | `/api/auth/profile/`            | Actualizar perfil                  | Sí      |
| GET    | `/api/products/`                | Listar productos (filtros/búsqueda)| No      |
| GET    | `/api/products/{id}/`           | Detalle de producto                | No      |
| GET    | `/api/orders/`                  | Historial del usuario              | Sí      |
| POST   | `/api/orders/`                  | Crear pedido                       | Sí      |
| GET    | `/api/orders/{id}/`             | Detalle de pedido                  | Sí      |
| GET    | `/api/points/`                  | Saldo de puntos                    | Sí      |
| POST   | `/api/contact/`                 | Enviar mensaje de contacto         | No      |
| GET    | `/api/admin/clients/`           | Listar clientes (admin)            | Admin   |
| GET    | `/api/admin/clients/{id}/`      | Detalle cliente + historial        | Admin   |
| POST   | `/api/admin/clients/{id}/block/`| Bloquear/desbloquear               | Admin   |
| DELETE | `/api/admin/clients/{id}/`      | Eliminar cliente                   | Admin   |
| GET    | `/api/admin/products/`          | Listar todos los productos         | Admin   |
| POST   | `/api/admin/products/`          | Crear producto                     | Admin   |
| PATCH  | `/api/admin/products/{id}/`     | Editar producto                    | Admin   |
| DELETE | `/api/admin/products/{id}/`     | Eliminar producto                  | Admin   |
| POST   | `/api/admin/products/{id}/add_stock/` | Añadir stock                | Admin   |

---

## Sistema de puntos

| Regla                          | Valor                          |
|-------------------------------|-------------------------------|
| Puntos por cada $100 COP      | 1 punto                       |
| Valor de canje por punto      | $100 COP de descuento         |
| Descuento máximo por puntos   | 35% del total de la compra    |

**Ejemplo:**
- Compra total: $500.000 COP → gana 5.000 puntos
- Canje de 1.000 puntos = $100.000 descuento
- Descuento máximo permitido = $175.000 (35% de $500.000)

---

## Flujo de checkout

```
1. Usuario revisa carrito
2. (Opcional) activa "Redimir puntos" e ingresa cantidad
   → Sistema calcula descuento respetando el cap del 35%
3. Click "Finalizar compra"
   → POST /api/orders/ con items, subtotal, discount_amount, points_used, total
4. Django:
   → Valida puntos disponibles
   → Descuenta stock de cada producto
   → Crea Order + OrderItems
   → Descuenta puntos usados, suma puntos ganados
   → Retorna invoice_code
5. Frontend muestra confirmación y navega al historial
```

---

## Notas de producción

- Cambiar `DEBUG = False` y configurar `ALLOWED_HOSTS`
- Usar PostgreSQL en lugar de SQLite
- Configurar un servidor de correo real (SendGrid, SES)
- Servir archivos estáticos con Nginx o Whitenoise
- Usar HTTPS (certificado SSL)
- Considerar JWT en lugar de Token auth para mayor seguridad
