# ══════════════════════════════════════════════
# views.py — Vistas DRF
# ══════════════════════════════════════════════

# ─────────────────────────────────────
# users/views.py
# ─────────────────────────────────────
from rest_framework import generics, status, permissions
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth import authenticate, get_user_model

User = get_user_model()


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_view(request):
    email    = request.data.get('email', '').lower().strip()
    password = request.data.get('password', '')

    user = authenticate(request, email=email, password=password)
    if not user:
        return Response({'detail': 'Credenciales incorrectas'}, status=401)

    if user.is_blocked:
        return Response({'detail': 'Tu cuenta ha sido bloqueada. Contacta soporte.'}, status=403)

    token, _ = Token.objects.get_or_create(user=user)
    from .serializers import UserSerializer
    return Response({'token': token.key, 'user': UserSerializer(user).data})


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register_view(request):
    from .serializers import RegisterSerializer, UserSerializer
    ser = RegisterSerializer(data=request.data)
    if ser.is_valid():
        user  = ser.save()
        token = Token.objects.create(user=user)
        return Response({'token': token.key, 'user': UserSerializer(user).data}, status=201)
    return Response(ser.errors, status=400)


@api_view(['POST'])
def logout_view(request):
    try:
        request.user.auth_token.delete()
    except Exception:
        pass
    return Response({'detail': 'Sesión cerrada'})


@api_view(['GET', 'PATCH'])
def profile_view(request):
    from .serializers import UserSerializer
    if request.method == 'GET':
        return Response(UserSerializer(request.user).data)

    ser = UserSerializer(request.user, data=request.data, partial=True)
    if ser.is_valid():
        ser.save()
        return Response(ser.data)
    return Response(ser.errors, status=400)


# ─────────────────────────────────────
# products/views.py
# ─────────────────────────────────────
from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Product
from .serializers import ProductSerializer


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Endpoint público: sólo lectura.
    Filtros: category, on_sale, featured, search, ordering, price_min, price_max
    """
    serializer_class   = ProductSerializer
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ['category', 'featured']
    search_fields      = ['name', 'brand', 'description']
    ordering_fields    = ['price', 'name', 'created_at']
    ordering           = ['-featured', '-created_at']

    def get_queryset(self):
        qs = Product.objects.filter(visible=True, stock__gt=0)

        on_sale   = self.request.query_params.get('on_sale')
        price_min = self.request.query_params.get('price_min')
        price_max = self.request.query_params.get('price_max')

        if on_sale:
            qs = qs.filter(discount_percent__gt=0)
        if price_min:
            qs = qs.filter(price__gte=price_min)
        if price_max:
            qs = qs.filter(price__lte=price_max)

        return qs


# ─────────────────────────────────────
# orders/views.py
# ─────────────────────────────────────
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from django.db import transaction
from .models import Order, OrderItem
from products.models import Product
from .serializers import OrderSerializer, OrderCreateSerializer


class OrderListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        return OrderCreateSerializer if self.request.method == 'POST' else OrderSerializer

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related('items')

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        ser = OrderCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        user = request.user

        # Validar puntos
        points_used = data.get('points_used', 0)
        if points_used > user.points:
            return Response({'detail': 'Puntos insuficientes'}, status=400)

        # Crear orden
        order = Order.objects.create(
            user            = user,
            subtotal        = data['subtotal'],
            discount_amount = data.get('discount_amount', 0),
            points_used     = points_used,
            total           = data['total'],
        )

        # Crear ítems y descontar stock
        for item_data in data['items']:
            product = Product.objects.select_for_update().get(id=item_data['product_id'])
            if product.stock < item_data['quantity']:
                raise ValueError(f"Stock insuficiente para '{product.name}'")

            product.stock -= item_data['quantity']
            product.save(update_fields=['stock'])

            OrderItem.objects.create(
                order            = order,
                product          = product,
                product_name     = product.name,
                quantity         = item_data['quantity'],
                unit_price       = item_data['unit_price'],
                discount_percent = item_data.get('discount_percent', 0),
            )

        # Actualizar puntos del usuario
        user.points = max(0, user.points - points_used) + order.points_earned
        user.save(update_fields=['points'])

        return Response(OrderSerializer(order).data, status=201)


class OrderDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class   = OrderSerializer

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)


# ─────────────────────────────────────
# admin_panel/views.py
# ─────────────────────────────────────
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from users.models import User
from products.models import Product


class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


class AdminClientViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    http_method_names  = ['get', 'delete', 'head', 'options']

    def get_queryset(self):
        qs = User.objects.filter(role='client').order_by('-date_joined')
        q  = self.request.query_params.get('search', '')
        if q:
            from django.db.models import Q
            qs = qs.filter(
                Q(first_name__icontains=q) | Q(last_name__icontains=q) |
                Q(email__icontains=q)      | Q(document__icontains=q)
            )
        return qs

    def get_serializer_class(self):
        if self.action == 'retrieve':
            from users.serializers import ClientDetailSerializer
            return ClientDetailSerializer
        from users.serializers import UserAdminSerializer
        return UserAdminSerializer

    @action(detail=True, methods=['post'])
    def block(self, request, pk=None):
        user = self.get_object()
        user.is_blocked = not user.is_blocked
        user.save(update_fields=['is_blocked'])
        state = 'bloqueado' if user.is_blocked else 'desbloqueado'
        return Response({'detail': f'Cliente {state}', 'is_blocked': user.is_blocked})

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminProductViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        qs = Product.objects.all()
        q  = self.request.query_params.get('search', '')
        if q:
            from django.db.models import Q
            qs = qs.filter(Q(name__icontains=q) | Q(brand__icontains=q) | Q(supplier__icontains=q))
        return qs

    def get_serializer_class(self):
        from products.serializers import ProductSerializer
        return ProductSerializer

    @action(detail=True, methods=['post'])
    def add_stock(self, request, pk=None):
        product  = self.get_object()
        quantity = int(request.data.get('quantity', 0))
        if quantity <= 0:
            return Response({'detail': 'Cantidad inválida'}, status=400)
        product.stock += quantity
        product.save(update_fields=['stock'])
        return Response({'detail': f'+{quantity} unidades añadidas', 'new_stock': product.stock})


# ─────────────────────────────────────
# contact/views.py
# ─────────────────────────────────────
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.core.mail import send_mail
from django.conf import settings


@api_view(['POST'])
@permission_classes([AllowAny])
def contact_view(request):
    name    = request.data.get('name', '')
    email   = request.data.get('email', '')
    subject = request.data.get('subject', 'Contacto web')
    message = request.data.get('message', '')

    if not all([name, email, message]):
        return Response({'detail': 'Todos los campos son obligatorios'}, status=400)

    try:
        send_mail(
            subject  = f'[Merkado] {subject} — {name}',
            message  = f'De: {name} <{email}>\n\n{message}',
            from_email = settings.DEFAULT_FROM_EMAIL,
            recipient_list = [settings.CONTACT_EMAIL],
        )
    except Exception as e:
        # Log error but don't fail
        print(f'Email error: {e}')

    return Response({'detail': 'Mensaje enviado correctamente'})


# ─────────────────────────────────────
# points/views.py
# ─────────────────────────────────────
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import permission_classes


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def points_view(request):
    return Response({
        'points':       request.user.points,
        'cop_per_point': 100,
        'max_discount_pct': 35,
    })
