from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum, Q
from rest_framework.pagination import PageNumberPagination
from django.utils import timezone
from datetime import datetime, timedelta

from .models import Order, OrderItem
from .serializers import OrderSerializer, OrderItemSerializer
from cart.models import Cart
from accounts.models import Address, User
from accounts.permissions import IsAdmin
from products.models import Category, Product


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_order(request):

    # Get the logged-in user's cart
    try:
        cart = Cart.objects.get(user=request.user)
    except Cart.DoesNotExist:
        return Response(
            {"error": "Cart not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Get all items from the cart
    cart_items = cart.items.all()

    # Check whether the cart is empty
    if not cart_items.exists():
        return Response(
            {"error": "Your cart is empty."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check stock before creating the order
    for item in cart_items:

        # Use variant stock when the cart item has a variant
        if item.variant:
            available_stock = item.variant.stock
        else:
            # Otherwise use the main product stock
            available_stock = item.product.stock

        # Check whether enough stock is available
        if item.quantity > available_stock:
            return Response(
                {
                    "error": f"Not enough stock for {item.product.product_name}."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

    # Calculate subtotal
    subtotal = 0

    for item in cart_items:

        # Get the product price
        if item.variant and item.variant.price is not None:
            price = item.variant.price
        else:
            price = item.product.base_price

        # Add item total to subtotal
        subtotal += price * item.quantity

    # Create a simple order number
    order_number = f"ORD-{request.user.id}-{Order.objects.count() + 1}"

    # Get the shipping address selected by the user
    shipping_address_id = request.data.get("shipping_address_id")

    # Check whether an address was provided
    if not shipping_address_id:
        return Response(
            {"error": "Shipping address is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check that the address belongs to the logged-in user
    try:
        shipping_address = Address.objects.get(
            id=shipping_address_id,
            user=request.user
        )
    except Address.DoesNotExist:
        return Response(
            {"error": "Invalid shipping address."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Create the order
    order = Order.objects.create(
        user=request.user,
        order_number=order_number,
        shipping_address_id=shipping_address.id,
        subtotal=subtotal,
        discount_amount=0,
        shipping_amount=0,
        tax_amount=0,
        total_amount=subtotal,
        status="pending",
        payment_status="pending"
    )

    # Create order items
    for item in cart_items:

        # Get the product price
        if item.variant and item.variant.price is not None:
            price = item.variant.price
            variant_name = item.variant.variant_name
            product_variant = item.variant
        else:
            price = item.product.base_price
            variant_name = ""
            product_variant = None

        # Create the order item
        OrderItem.objects.create(
            order=order,
            product_variant=product_variant,
            product_name=item.product.product_name,
            variant_name=variant_name,
            sku=item.product.sku,
            quantity=item.quantity,
            unit_price=price,
            discount_amount=0,
            tax_amount=0,
            total_amount=price * item.quantity,
            item_status="pending"
        )

    for item in cart_items:
        if item.variant:
            item.variant.stock -= item.quantity
            item.variant.save()
        else:
        # Otherwise reduce the main product stock
            item.product.stock -= item.quantity
            item.product.save()

    # Clear the cart after creating the order
    cart_items.delete()

    # Convert the order into JSON format
    serializer = OrderSerializer(order)

    # Return the created order
    return Response(
        {
            "message": "Order created successfully.",
            "order": serializer.data
        },
        status=status.HTTP_201_CREATED
    )

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_orders(request):

    # Get orders belonging to the logged-in user
    orders = Order.objects.filter(
        user=request.user
    ).order_by("-created_at")

    # Convert orders into JSON format
    serializer = OrderSerializer(orders, many=True)

    # Return customer's orders
    return Response(
        {
            "orders": serializer.data
        },
        status=status.HTTP_200_OK
    )

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def order_detail(request, order_id):
    # Get the order only if it belongs to the logged-in user
    try:
        order = Order.objects.get(
            id=order_id,
            user=request.user
        )
    except Order.DoesNotExist:
        return Response(
            {"error": "Order not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Convert the order into JSON
    serializer = OrderSerializer(order)

    # Return the order details
    return Response(
        {"order": serializer.data},
        status=status.HTTP_200_OK
    )

@api_view(["PUT"])
@permission_classes([IsAdmin])
def update_order_status(request, order_id):

    # Get the order
    try:
        order = Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        return Response(
            {"error": "Order not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Get the new status from the request
    new_status = request.data.get("status")

    # Check whether status was provided
    if not new_status:
        return Response(
            {"error": "Status is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Allowed order statuses
    allowed_statuses = [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled"
    ]

    # Check whether the status is valid
    if new_status not in allowed_statuses:
        return Response(
            {"error": "Invalid order status."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Update the order status
    order.status = new_status
    order.save()

    # Return the updated order
    serializer = OrderSerializer(order)

    return Response(
        {
            "message": "Order status updated successfully.",
            "order": serializer.data
        },
        status=status.HTTP_200_OK
    )
@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def cancel_order(request, order_id):
    # Find the order belonging to the logged-in user
    try:
        order = Order.objects.get(
            id=order_id,
            user=request.user
        )
    except Order.DoesNotExist:
        return Response(
            {"error": "Order not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Only pending orders can be cancelled
    if order.status != "pending":
        return Response(
            {"error": "Only pending orders can be cancelled."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Change the order status
    order.status = "cancelled"
    order.save()

    # Return the updated order
    serializer = OrderSerializer(order)

    return Response(
        {
            "message": "Order cancelled successfully.",
            "order": serializer.data
        },
        status=status.HTTP_200_OK
    )
@api_view(["GET"])
@permission_classes([IsAdmin])
def admin_orders(request):
    orders = (
        Order.objects.all()
        .select_related("user")
        .prefetch_related("items")
        .order_by("-created_at")
    )

    # 1. Search by order number, customer name, email, or item product name
    search = request.query_params.get("search", "").strip()
    if search:
        orders = orders.filter(
            Q(order_number__icontains=search)
            | Q(user__full_name__icontains=search)
            | Q(user__email__icontains=search)
            | Q(items__product_name__icontains=search)
        ).distinct()

    # 2. Filter by status
    status_param = request.query_params.get("status", "").strip().lower()
    if status_param and status_param != "all":
        orders = orders.filter(status=status_param)

    # 3. Pagination
    page = request.query_params.get("page")
    page_size = request.query_params.get("page_size")
    paginate = request.query_params.get("paginate", "").strip().lower() in ["true", "1"]

    if page or page_size or paginate:
        paginator = PageNumberPagination()
        if page_size and page_size.isdigit():
            paginator.page_size = int(page_size)
        else:
            paginator.page_size = 8

        result_page = paginator.paginate_queryset(orders, request)
        serializer = OrderSerializer(result_page, many=True)
        return paginator.get_paginated_response(serializer.data)

    serializer = OrderSerializer(orders, many=True)
    return Response(
        {
            "orders": serializer.data,
            "results": serializer.data,
            "count": orders.count(),
        },
        status=status.HTTP_200_OK
    )

@api_view(["GET"])
@permission_classes([IsAdmin])
def admin_order_detail(request, order_id):

    # Get the selected order
    try:
        order = Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        return Response(
            {"error": "Order not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Convert the order into JSON format
    serializer = OrderSerializer(order)

    # Return the order details
    return Response(
        {
            "order": serializer.data
        },
        status=status.HTTP_200_OK
    )


@api_view(["GET"])
@permission_classes([IsAdmin])
def admin_dashboard_stats(request):
    """
    Consolidated analytics endpoint for Corvun Admin Dashboard.
    Uses PostgreSQL as single source of truth.
    Never returns hardcoded sample numbers.
    """
    # 1. Total Revenue (Sum of non-cancelled orders)
    revenue_agg = Order.objects.exclude(status="cancelled").aggregate(total=Sum("total_amount"))
    total_revenue = float(revenue_agg["total"]) if revenue_agg["total"] is not None else 0.0

    # 2. Total Orders (Total non-cancelled orders)
    total_orders = Order.objects.exclude(status="cancelled").count()

    # 3. Active Users (Active customer accounts)
    active_users = User.objects.filter(is_active=True, status="active", role="customer").count()

    # 4. Conversion Rate (Unique customers who placed a non-cancelled order / active users)
    paying_users = Order.objects.exclude(status="cancelled").values("user").distinct().count()
    conversion_rate = round((paying_users / active_users * 100), 2) if active_users > 0 else 0.0

    # 5. Sales Overview (Previous 6 calendar months including current month)
    now = timezone.now()
    sales_overview = []
    for i in range(5, -1, -1):
        year = now.year
        month = now.month - i
        while month <= 0:
            month += 12
            year -= 1

        month_label = datetime(year, month, 1).strftime("%b")
        start_date = timezone.make_aware(datetime(year, month, 1, 0, 0, 0))
        if month == 12:
            end_date = timezone.make_aware(datetime(year + 1, 1, 1, 0, 0, 0))
        else:
            end_date = timezone.make_aware(datetime(year, month + 1, 1, 0, 0, 0))

        m_rev = Order.objects.filter(
            created_at__gte=start_date,
            created_at__lt=end_date
        ).exclude(status="cancelled").aggregate(total=Sum("total_amount"))["total"]

        sales_overview.append({
            "month": month_label,
            "year": year,
            "revenue": float(m_rev) if m_rev is not None else 0.0
        })

    # 6. Sales by Category (Top hardware categories with real sales from OrderItems)
    categories = Category.objects.filter(status=True)[:5]
    sales_by_category = []
    for cat in categories:
        # Sum total_amount from OrderItem where product_variant.product.category == cat
        cat_sales = OrderItem.objects.filter(
            order__status__in=["pending", "confirmed", "processing", "shipped", "delivered"],
            product_variant__product__category=cat
        ).aggregate(total=Sum("total_amount"))["total"]

        if cat_sales is None:
            cat_sales = OrderItem.objects.filter(
                order__status__in=["pending", "confirmed", "processing", "shipped", "delivered"],
                sku__in=Product.objects.filter(category=cat).values_list("sku", flat=True)
            ).aggregate(total=Sum("total_amount"))["total"]

        sales_by_category.append({
            "category": cat.name,
            "sales": float(cat_sales) if cat_sales is not None else 0.0
        })

    # 7. Recent Orders (Latest 5 orders)
    orders_qs = Order.objects.select_related("user").prefetch_related("items").order_by("-created_at")[:5]
    recent_orders = []
    for o in orders_qs:
        first_item = o.items.first()
        prod_name = first_item.product_name if first_item else "Direct Order"
        item_count = o.items.count()
        if item_count > 1:
            prod_name += f" +{item_count - 1} more"

        recent_orders.append({
            "id": o.id,
            "order_number": o.order_number,
            "customer": o.user.full_name or o.user.email,
            "product": prod_name,
            "amount": float(o.total_amount),
            "status": o.status,
            "created_at": o.created_at.strftime("%d/%m/%Y")
        })

    return Response({
        "total_revenue": total_revenue,
        "total_orders": total_orders,
        "active_users": active_users,
        "conversion_rate": conversion_rate,
        "sales_overview": sales_overview,
        "sales_by_category": sales_by_category,
        "recent_orders": recent_orders
    }, status=status.HTTP_200_OK)


# ============================================================
# ADMIN SALES REPORT
# GET /api/orders/admin/sales-report/?period=last_30_days
# Protected: IsAdmin only
# ============================================================
@api_view(["GET"])
@permission_classes([IsAdmin])
def admin_sales_report(request):
    """
    Sales performance report matching Corvun Figma design.
    Dynamically computes KPIs, trend chart, top products,
    sales by category, and recent transactions from PostgreSQL.
    """
    period = request.query_params.get("period", "last_30_days").strip().lower()
    now = timezone.now()

    # Determine date ranges based on period
    if period == "last_7_days":
        start_date = now - timedelta(days=7)
        end_date = now
        prev_start = now - timedelta(days=14)
        prev_end = now - timedelta(days=7)
        period_label = "Last 7 Days"
        comp_label = "from last week"
    elif period == "this_year":
        start_date = timezone.make_aware(datetime(now.year, 1, 1, 0, 0, 0))
        end_date = now
        prev_start = timezone.make_aware(datetime(now.year - 1, 1, 1, 0, 0, 0))
        prev_end = timezone.make_aware(datetime(now.year, 1, 1, 0, 0, 0))
        period_label = "This Year"
        comp_label = "from last year"
    elif period == "fixed":
        # Fixed 90-day period
        start_date = now - timedelta(days=90)
        end_date = now
        prev_start = now - timedelta(days=180)
        prev_end = now - timedelta(days=90)
        period_label = "Fixed Period"
        comp_label = "from previous period"
    else:  # default "last_30_days"
        period = "last_30_days"
        start_date = now - timedelta(days=30)
        end_date = now
        prev_start = now - timedelta(days=60)
        prev_end = now - timedelta(days=30)
        period_label = "Last 30 Days"
        comp_label = "from last month"

    # Current period valid orders
    current_orders = Order.objects.filter(
        created_at__gte=start_date,
        created_at__lte=end_date
    ).exclude(status="cancelled")

    # Previous period valid orders
    prev_orders = Order.objects.filter(
        created_at__gte=prev_start,
        created_at__lt=prev_end
    ).exclude(status="cancelled")

    # 1. Total Sales
    sales_agg = current_orders.aggregate(total=Sum("total_amount"))
    total_sales = float(sales_agg["total"]) if sales_agg["total"] is not None else 0.0

    prev_sales_agg = prev_orders.aggregate(total=Sum("total_amount"))
    prev_total_sales = float(prev_sales_agg["total"]) if prev_sales_agg["total"] is not None else 0.0

    # 2. Orders count
    orders_count = current_orders.count()
    prev_orders_count = prev_orders.count()

    # 3. Average Order Value
    avg_order_value = round(total_sales / orders_count, 2) if orders_count > 0 else 0.0
    prev_avg_order_value = round(prev_total_sales / prev_orders_count, 2) if prev_orders_count > 0 else 0.0

    # 4. Products Sold
    items_agg = OrderItem.objects.filter(
        order__in=current_orders
    ).aggregate(total_units=Sum("quantity"))
    products_sold = items_agg["total_units"] if items_agg["total_units"] is not None else 0

    prev_items_agg = OrderItem.objects.filter(
        order__in=prev_orders
    ).aggregate(total_units=Sum("quantity"))
    prev_products_sold = prev_items_agg["total_units"] if prev_items_agg["total_units"] is not None else 0

    # Comparisons
    def format_pct_change(curr, prev):
        if prev == 0:
            return "+100%" if curr > 0 else "0%"
        diff_pct = ((curr - prev) / prev) * 100
        sign = "+" if diff_pct > 0 else ""
        return f"{sign}{diff_pct:.1f}%"

    sales_change = format_pct_change(total_sales, prev_total_sales)
    orders_change = format_pct_change(orders_count, prev_orders_count)
    products_change = format_pct_change(products_sold, prev_products_sold)

    aov_diff = avg_order_value - prev_avg_order_value
    aov_sign = "+" if aov_diff > 0 else ""
    aov_diff_formatted = f"{aov_sign}₹{abs(aov_diff):,.0f}" if aov_diff != 0 else "₹0"

    comparison = {
        "sales_text": f"↑ {sales_change} {comp_label}" if total_sales >= prev_total_sales else f"↓ {sales_change} {comp_label}",
        "orders_text": f"↑ {orders_change} {comp_label}" if orders_count >= prev_orders_count else f"↓ {orders_change} {comp_label}",
        "aov_text": f"↑ {aov_diff_formatted} {comp_label}" if avg_order_value >= prev_avg_order_value else f"↓ {aov_diff_formatted} {comp_label}",
        "products_text": f"↑ {products_change} {comp_label}" if products_sold >= prev_products_sold else f"↓ {products_change} {comp_label}",
        "sales_positive": total_sales >= prev_total_sales,
        "orders_positive": orders_count >= prev_orders_count,
        "aov_positive": avg_order_value >= prev_avg_order_value,
        "products_positive": products_sold >= prev_products_sold,
    }

    # 5. Sales Trend Data
    sales_trend = []
    if period == "this_year":
        # 12 calendar months (Jan to Dec) - matching Figma screenshot
        for m in range(1, 13):
            month_label = datetime(now.year, m, 1).strftime("%b")
            m_start = timezone.make_aware(datetime(now.year, m, 1, 0, 0, 0))
            if m == 12:
                m_end = timezone.make_aware(datetime(now.year + 1, 1, 1, 0, 0, 0))
            else:
                m_end = timezone.make_aware(datetime(now.year, m + 1, 1, 0, 0, 0))

            m_sales = Order.objects.filter(
                created_at__gte=m_start,
                created_at__lt=m_end
            ).exclude(status="cancelled").aggregate(total=Sum("total_amount"))["total"]

            sales_trend.append({
                "label": month_label,
                "sales": float(m_sales) if m_sales is not None else 0.0
            })
    elif period == "last_7_days":
        # 7 individual days
        for i in range(6, -1, -1):
            day_dt = now - timedelta(days=i)
            d_start = timezone.make_aware(datetime(day_dt.year, day_dt.month, day_dt.day, 0, 0, 0))
            d_end = d_start + timedelta(days=1)
            day_label = d_start.strftime("%a %d")

            d_sales = Order.objects.filter(
                created_at__gte=d_start,
                created_at__lt=d_end
            ).exclude(status="cancelled").aggregate(total=Sum("total_amount"))["total"]

            sales_trend.append({
                "label": day_label,
                "sales": float(d_sales) if d_sales is not None else 0.0
            })
    else:
        # last_30_days or fixed: 6 evenly spaced intervals across the period
        num_intervals = 6
        step_days = 30 // num_intervals if period == "last_30_days" else 90 // num_intervals
        for i in range(num_intervals):
            int_start = start_date + timedelta(days=i * step_days)
            int_end = int_start + timedelta(days=step_days)
            int_label = int_start.strftime("%b %d")

            int_sales = Order.objects.filter(
                created_at__gte=int_start,
                created_at__lt=int_end
            ).exclude(status="cancelled").aggregate(total=Sum("total_amount"))["total"]

            sales_trend.append({
                "label": int_label,
                "sales": float(int_sales) if int_sales is not None else 0.0
            })

    # 6. Top Selling Products (Top 5)
    top_items = (
        OrderItem.objects.filter(order__in=current_orders)
        .values("product_name")
        .annotate(
            units_sold=Sum("quantity"),
            sales_amount=Sum("total_amount")
        )
        .order_by("-sales_amount")[:5]
    )

    top_products = []
    for rank, item in enumerate(top_items, start=1):
        top_products.append({
            "rank": rank,
            "product_name": item["product_name"],
            "units_sold": item["units_sold"],
            "sales_amount": float(item["sales_amount"]) if item["sales_amount"] is not None else 0.0
        })

    # 7. Sales by Category
    categories = Category.objects.filter(status=True)[:5]
    category_data = []
    for cat in categories:
        cat_sales = OrderItem.objects.filter(
            order__in=current_orders,
            product_variant__product__category=cat
        ).aggregate(total=Sum("total_amount"))["total"]

        if cat_sales is None:
            cat_sales = OrderItem.objects.filter(
                order__in=current_orders,
                sku__in=Product.objects.filter(category=cat).values_list("sku", flat=True)
            ).aggregate(total=Sum("total_amount"))["total"]

        val = float(cat_sales) if cat_sales is not None else 0.0
        pct = round((val / total_sales * 100), 1) if total_sales > 0 else 0.0

        category_data.append({
            "category": cat.name,
            "sales_amount": val,
            "percentage": pct
        })

    # Sort categories by sales descending
    category_data.sort(key=lambda x: x["sales_amount"], reverse=True)

    # 8. Recent Transactions (5 Latest valid orders)
    recent_qs = (
        Order.objects.exclude(status="cancelled")
        .select_related("user")
        .prefetch_related("items")
        .order_by("-created_at")[:5]
    )
    recent_transactions = []
    for o in recent_qs:
        first_item = o.items.first()
        prod_name = first_item.product_name if first_item else "Direct Order"
        item_count = o.items.count()
        if item_count > 1:
            prod_name += f" +{item_count - 1} more"

        recent_transactions.append({
            "order_id": f"#{o.id}" if o.id else o.order_number,
            "order_number": o.order_number,
            "customer": o.user.full_name or o.user.email,
            "product": prod_name,
            "date": o.created_at.strftime("%Y-%m-%d"),
            "price": float(o.total_amount)
        })

    return Response({
        "period": period,
        "period_label": period_label,
        "summary": {
            "total_sales": total_sales,
            "orders": orders_count,
            "average_order_value": avg_order_value,
            "products_sold": products_sold
        },
        "comparison": comparison,
        "sales_trend": sales_trend,
        "top_products": top_products,
        "sales_by_category": category_data,
        "recent_transactions": recent_transactions
    }, status=status.HTTP_200_OK)


