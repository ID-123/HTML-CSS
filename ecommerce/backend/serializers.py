# ══════════════════════════════════════════════
# serializers.py — DRF Serializers
# ══════════════════════════════════════════════

# ─────────────────────────────────────
# users/serializers.py
# ─────────────────────────────────────
from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = [
            'id', 'email', 'first_name', 'last_name',
            'document', 'phone', 'address', 'role', 'points',
            'is_blocked', 'date_joined',
        ]
        read_only_fields = ['id', 'role', 'points', 'date_joined']


class UserAdminSerializer(serializers.ModelSerializer):
    """Para administrador: incluye order_count"""
    order_count = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = [
            'id', 'email', 'first_name', 'last_name',
            'document', 'phone', 'address', 'role',
            'points', 'is_blocked', 'date_joined', 'order_count',
        ]

    def get_order_count(self, obj):
        return obj.orders.count()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model  = User
        fields = ['email', 'password', 'first_name', 'last_name', 'document', 'phone']

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


# ─────────────────────────────────────
# products/serializers.py
# ─────────────────────────────────────
from rest_framework import serializers
# from .models import Product   ← importar en cada app


class ProductSerializer(serializers.ModelSerializer):
    final_price = serializers.ReadOnlyField()

    class Meta:
        model  = None   # reemplazar con: model = Product
        fields = [
            'id', 'name', 'description', 'brand', 'supplier',
            'category', 'price', 'final_price', 'stock',
            'discount_percent', 'image_url', 'visible', 'featured',
            'created_at',
        ]


# ─────────────────────────────────────
# orders/serializers.py
# ─────────────────────────────────────
from rest_framework import serializers
# from .models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    subtotal = serializers.ReadOnlyField()

    class Meta:
        model  = None   # reemplazar con: model = OrderItem
        fields = [
            'id', 'product', 'product_name',
            'quantity', 'unit_price', 'discount_percent', 'subtotal',
        ]


class OrderItemCreateSerializer(serializers.Serializer):
    product_id       = serializers.IntegerField()
    quantity         = serializers.IntegerField(min_value=1)
    unit_price       = serializers.DecimalField(max_digits=14, decimal_places=2)
    discount_percent = serializers.IntegerField(min_value=0, max_value=99, default=0)


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model  = None   # reemplazar con: model = Order
        fields = [
            'id', 'invoice_code', 'user', 'status',
            'subtotal', 'discount_amount', 'points_used',
            'points_earned', 'total', 'items', 'created_at',
        ]
        read_only_fields = ['id', 'invoice_code', 'points_earned', 'created_at']


class OrderCreateSerializer(serializers.Serializer):
    items           = OrderItemCreateSerializer(many=True)
    subtotal        = serializers.DecimalField(max_digits=14, decimal_places=2)
    discount_amount = serializers.DecimalField(max_digits=14, decimal_places=2, default=0)
    points_used     = serializers.IntegerField(min_value=0, default=0)
    total           = serializers.DecimalField(max_digits=14, decimal_places=2)


class OrderSummarySerializer(serializers.ModelSerializer):
    """Para mostrar en panel admin de cliente"""
    item_count = serializers.SerializerMethodField()

    class Meta:
        model  = None
        fields = ['id', 'invoice_code', 'status', 'total', 'item_count', 'created_at']

    def get_item_count(self, obj):
        return obj.items.count()


class ClientDetailSerializer(serializers.ModelSerializer):
    """Serializer especial para el admin: incluye últimas órdenes"""
    recent_orders = serializers.SerializerMethodField()

    class Meta:
        model  = None   # reemplazar con: model = User
        fields = [
            'id', 'email', 'first_name', 'last_name',
            'document', 'phone', 'address', 'points',
            'is_blocked', 'date_joined', 'recent_orders',
        ]

    def get_recent_orders(self, obj):
        # Retorna las últimas 10 órdenes
        from orders.serializers import OrderSummarySerializer  # ajustar import
        orders = obj.orders.all()[:10]
        return OrderSummarySerializer(orders, many=True).data
