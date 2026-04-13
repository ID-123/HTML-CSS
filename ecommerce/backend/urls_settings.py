# ══════════════════════════════════════════════
# urls.py — Enrutamiento principal
# ecommerce/urls.py
# ══════════════════════════════════════════════

from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter

# Importar vistas (ajustar nombres de app según tu proyecto)
from users.views      import login_view, register_view, logout_view, profile_view
from products.views   import ProductViewSet
from orders.views     import OrderListCreateView, OrderDetailView
from admin_panel.views import AdminClientViewSet, AdminProductViewSet
from contact.views    import contact_view
from points.views     import points_view

router = DefaultRouter()
router.register(r'products',        ProductViewSet,      basename='product')
router.register(r'admin/clients',   AdminClientViewSet,  basename='admin-client')
router.register(r'admin/products',  AdminProductViewSet, basename='admin-product')

urlpatterns = [
    path('admin/',      admin.site.urls),

    # Auth
    path('api/auth/login/',    login_view),
    path('api/auth/logout/',   logout_view),
    path('api/auth/register/', register_view),
    path('api/auth/profile/',  profile_view),

    # Orders
    path('api/orders/',       OrderListCreateView.as_view()),
    path('api/orders/<int:pk>/', OrderDetailView.as_view()),

    # Points
    path('api/points/',       points_view),

    # Contact
    path('api/contact/',      contact_view),

    # Router (products + admin)
    path('api/', include(router.urls)),
]


# ══════════════════════════════════════════════
# settings.py — Configuración principal
# ══════════════════════════════════════════════

SETTINGS_SNIPPET = """
# En ecommerce/settings.py, añade/modifica:

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Terceros
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'django_filters',

    # Tus apps
    'users',
    'products',
    'orders',
    'admin_panel',
    'contact',
    'points',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',   # DEBE ser el primero
    'django.middleware.security.SecurityMiddleware',
    # ... resto de middleware
]

AUTH_USER_MODEL = 'users.User'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 12,
}

# CORS: permite peticiones desde el frontend
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",    # React dev server (si usas)
    "http://127.0.0.1:5500",    # Live Server de VS Code
    "http://localhost:5500",
]
# En producción reemplaza con tu dominio real

CORS_ALLOW_CREDENTIALS = True

# Email (para formulario de contacto)
EMAIL_BACKEND   = 'django.core.mail.backends.console.EmailBackend'  # cambiar en prod
CONTACT_EMAIL   = 'soporte@merkado.co'
DEFAULT_FROM_EMAIL = 'noreply@merkado.co'

# Idioma y zona horaria
LANGUAGE_CODE = 'es-co'
TIME_ZONE     = 'America/Bogota'
USE_I18N      = True
USE_TZ        = True
"""


# ══════════════════════════════════════════════
# requirements.txt
# ══════════════════════════════════════════════

REQUIREMENTS = """
Django>=4.2,<5.0
djangorestframework>=3.14
djangorestframework-simplejwt>=5.3        # opcional, si prefieres JWT
django-cors-headers>=4.3
django-filter>=23.5
Pillow>=10.0                              # para subida de imágenes
python-decouple>=3.8                      # manejo de .env
psycopg2-binary>=2.9                      # PostgreSQL (recomendado para producción)
gunicorn>=21.2                            # servidor WSGI para producción
"""

print("Archivo de configuración generado.")
print("Ver SETTINGS_SNIPPET y REQUIREMENTS arriba.")
