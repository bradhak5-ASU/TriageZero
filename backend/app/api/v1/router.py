from __future__ import annotations

from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import asc, desc, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.db.session import SessionLocal
from app.models import Order, OrderItem, Product
from app.schemas.order import OrderCreate, OrderRead
from app.schemas.product import ProductRead

router = APIRouter()
api_router = APIRouter()
ALLOWED_SORTS = {"featured", "price_asc", "price_desc", "rating"}


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def stock_label(stock: int) -> str:
    if stock == 0:
        return "Out of Stock"
    if stock <= 10:
        return f"Only {stock} left"
    return "In Stock"


def product_to_read(product: Product) -> ProductRead:
    return ProductRead(
        id=product.id,
        sku=product.sku,
        name=product.name,
        brand=product.brand,
        category=product.category,
        short_description=product.short_description,
        description=product.description,
        price=product.price,
        original_price=product.original_price,
        stock=product.stock,
        image_url=product.image_url,
        rating=product.rating,
        review_count=product.review_count,
        featured=product.featured,
        availability=stock_label(product.stock),
        specifications=product.specifications or {},
        created_at=product.created_at,
    )


def order_to_read(order: Order) -> OrderRead:
    return OrderRead(
        id=order.id,
        order_number=order.order_number,
        customer_name=order.customer_name,
        customer_email=order.customer_email,
        address=order.address,
        city=order.city,
        state=order.state,
        zip_code=order.zip_code,
        subtotal=order.subtotal,
        shipping=order.shipping,
        total=order.total,
        status=order.status,
        created_at=order.created_at,
        items=order.items,
    )


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/categories", response_model=list[str])
def list_categories(db: Session = Depends(get_db)) -> list[str]:
    categories = db.scalars(select(Product.category).distinct().order_by(Product.category)).all()
    return list(categories)


@router.get("/products", response_model=list[ProductRead])
def list_products(
    category: str | None = None,
    search: str | None = None,
    featured: bool | None = None,
    sort: Literal["featured", "price_asc", "price_desc", "rating"] = "featured",
    db: Session = Depends(get_db),
) -> list[ProductRead]:
    statement = select(Product)

    if category:
        statement = statement.where(Product.category == category)
    if search:
        term = f"%{search.strip()}%"
        statement = statement.where(
            or_(
                Product.name.ilike(term),
                Product.brand.ilike(term),
                Product.category.ilike(term),
                Product.short_description.ilike(term),
                Product.description.ilike(term),
                Product.sku.ilike(term),
            )
        )
    if featured is not None:
        statement = statement.where(Product.featured.is_(featured))

    if sort == "price_asc":
        statement = statement.order_by(asc(Product.price), desc(Product.rating), Product.name)
    elif sort == "price_desc":
        statement = statement.order_by(desc(Product.price), desc(Product.rating), Product.name)
    elif sort == "rating":
        statement = statement.order_by(desc(Product.rating), desc(Product.review_count), Product.name)
    else:
        statement = statement.order_by(desc(Product.featured), desc(Product.rating), Product.name)

    products = db.scalars(statement).all()
    return [product_to_read(product) for product in products]


@router.get("/products/{product_id}", response_model=ProductRead)
def get_product(product_id: int, db: Session = Depends(get_db)) -> ProductRead:
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")
    return product_to_read(product)


@router.post("/orders", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
def create_order(order_in: OrderCreate, db: Session = Depends(get_db)) -> OrderRead:
    if settings.novacart_defect_scenario == "checkout_500":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="We couldn't place your order. Please try again.",
        )

    if not order_in.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cart cannot be empty.")

    product_ids = [item.product_id for item in order_in.items]
    products = db.scalars(select(Product).where(Product.id.in_(product_ids))).all()
    product_map = {product.id: product for product in products}

    if len(product_map) != len(set(product_ids)):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or more products were not found.")

    subtotal = 0.0
    snapshot_items: list[OrderItem] = []

    for item in order_in.items:
        product = product_map[item.product_id]
        if item.quantity > product.stock:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Not enough stock for {product.name}.",
            )

        line_total = round(product.price * item.quantity, 2)
        subtotal += line_total
        product.stock -= item.quantity
        snapshot_items.append(
            OrderItem(
                product_id=product.id,
                sku=product.sku,
                product_name=product.name,
                brand=product.brand,
                category=product.category,
                image_url=product.image_url,
                unit_price=product.price,
                quantity=item.quantity,
                subtotal=line_total,
            )
        )

    subtotal = round(subtotal, 2)
    shipping = 0.0
    total = round(subtotal + shipping, 2)

    order = Order(
        order_number=f"NC-{uuid4().hex[:10].upper()}",
        customer_name=order_in.customer.full_name,
        customer_email=order_in.customer.email,
        address=order_in.customer.address,
        city=order_in.customer.city,
        state=order_in.customer.state,
        zip_code=order_in.customer.zip_code,
        subtotal=subtotal,
        shipping=shipping,
        total=total,
        status="processing",
        items=snapshot_items,
    )

    db.add(order)
    db.commit()
    db.refresh(order)
    return order_to_read(order)


@router.get("/orders/{order_id}", response_model=OrderRead)
def get_order(order_id: int, db: Session = Depends(get_db)) -> OrderRead:
    statement = select(Order).options(selectinload(Order.items)).where(Order.id == order_id)
    order = db.scalars(statement).first()
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")
    return order_to_read(order)


api_router.include_router(router)
