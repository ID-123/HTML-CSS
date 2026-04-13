# ══════════════════════════════════════════════
# models.py — Modelos de base de datos
# Colocar cada clase en su app correspondiente
# ══════════════════════════════════════════════

# ─────────────────────────────────────
# users/models.py
# ─────────────────────────────────────
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra):
        if not email:
            raise ValueError('El correo es obligatorio')
        email = self.normalize_email(email)
        user  = self.model(email=email, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password, **extra):
        extra.setdefault('role', 'admin')
        extra.setdefault('is_staff', True)
        extra.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra)


class User(AbstractBaseUser, PermissionsMixin):
    ROLES = [('client', 'Cliente'), ('admin', 'Administrador')]

    email      = models.EmailField(unique=True)
    first_name = models.CharField(max_length=100, blank=True)
    last_name  = models.CharField(max_length=100, blank=True)
    document   = models.CharField(max_length=30, blank=True)   # CC / NIT
    phone      = models.CharField(max_length=20, blank=True)
    address    = models.TextField(blank=True)
    role       = models.CharField(max_length=10, choices=ROLES, default='client')
    points     = models.PositiveIntegerField(default=0)
    is_active  = models.BooleanField(default=True)
    is_blocked = models.BooleanField(default=False)
    is_staff   = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    objects  = UserManager()
    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = []

    class Meta:
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'

    def __str__(self):
        return f"{self.email} ({self.role})"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()


# ─────────────────────────────────────
# products/models.py
# ─────────────────────────────────────
class Category(models.Model):
    SLUGS = [
        ('electronics', 'Electrónica'),
        ('clothing',    'Ropa'),
        ('home',        'Hogar'),
        ('sports',      'Deportes'),
        ('beauty',      'Belleza'),
        ('food',        'Alimentos'),
    ]
    slug  = models.CharField(max_length=50, unique=True, choices=SLUGS)
    label = models.CharField(max_length=100)

    def __str__(self): return self.label


class Product(models.Model):
    name             = models.CharField(max_length=200)
    description      = models.TextField(blank=True)
    brand            = models.CharField(max_length=100, blank=True)
    supplier         = models.CharField(max_length=150, blank=True)
    category         = models.CharField(max_length=50, blank=True)
    price            = models.DecimalField(max_digits=14, decimal_places=2)
    stock            = models.PositiveIntegerField(default=0)
    discount_percent = models.PositiveSmallIntegerField(default=0)   # 0–99
    image_url        = models.URLField(blank=True)
    visible          = models.BooleanField(default=True)
    featured         = models.BooleanField(default=False)
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-featured', '-created_at']

    def __str__(self): return self.name

    @property
    def final_price(self):
        if self.discount_percent:
            return self.price * (1 - self.discount_percent / 100)
        return self.price


# ─────────────────────────────────────
# orders/models.py
# ─────────────────────────────────────
import uuid


def generate_invoice_code():
    return 'MRK-' + uuid.uuid4().hex[:8].upper()


class Order(models.Model):
    STATUS = [
        ('pending',   'Pendiente'),
        ('completed', 'Completado'),
        ('cancelled', 'Cancelado'),
    ]

    invoice_code    = models.CharField(max_length=20, unique=True, default=generate_invoice_code)
    user            = models.ForeignKey('users.User', on_delete=models.PROTECT, related_name='orders')
    status          = models.CharField(max_length=15, choices=STATUS, default='completed')
    subtotal        = models.DecimalField(max_digits=14, decimal_places=2)
    discount_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    points_used     = models.PositiveIntegerField(default=0)
    points_earned   = models.PositiveIntegerField(default=0)
    total           = models.DecimalField(max_digits=14, decimal_places=2)
    created_at      = models.DateTimeField(auto_now_add=True)
    notes           = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.invoice_code} — {self.user.email}"

    def save(self, *args, **kwargs):
        # Calcular puntos ganados: $100 COP = 1 punto
        self.points_earned = int(self.total // 100)
        super().save(*args, **kwargs)


class OrderItem(models.Model):
    order            = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product          = models.ForeignKey('products.Product', on_delete=models.PROTECT)
    product_name     = models.CharField(max_length=200)   # snapshot del nombre
    quantity         = models.PositiveIntegerField()
    unit_price       = models.DecimalField(max_digits=14, decimal_places=2)
    discount_percent = models.PositiveSmallIntegerField(default=0)

    @property
    def subtotal(self):
        return self.unit_price * self.quantity * (1 - self.discount_percent / 100)

    def __str__(self):
        return f"{self.product_name} x{self.quantity}"
