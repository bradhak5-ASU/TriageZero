from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()
api_router = APIRouter()


class Product(BaseModel):
    id: int
    name: str
    description: str
    price: float
    stock: int
    image_url: str


PRODUCTS: list[Product] = [
    Product(
        id=1,
        name='Aster Pro 14 Laptop',
        description='14-inch performance laptop with all-day battery life.',
        price=1299.00,
        stock=12,
        image_url='https://images.unsplash.com/photo-1517336714739-489689fd1ca8?auto=format&fit=crop&w=900&q=80',
    ),
    Product(
        id=2,
        name='NovaView 27 4K Monitor',
        description='Color-accurate 27-inch UHD display for work and play.',
        price=499.00,
        stock=8,
        image_url='https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=900&q=80',
    ),
    Product(
        id=3,
        name='Pulse ANC Headphones',
        description='Wireless over-ear headphones with adaptive noise canceling.',
        price=249.00,
        stock=18,
        image_url='https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80',
    ),
    Product(
        id=4,
        name='Orbit Mechanical Keyboard',
        description='Low-profile tactile keyboard with white backlighting.',
        price=149.00,
        stock=24,
        image_url='https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&w=900&q=80',
    ),
    Product(
        id=5,
        name='Arc Wireless Mouse',
        description='Ergonomic precision mouse with silent clicks.',
        price=79.00,
        stock=31,
        image_url='https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=900&q=80',
    ),
    Product(
        id=6,
        name='Flux USB-C Dock',
        description='11-in-1 aluminum dock for modern workstation setups.',
        price=119.00,
        stock=16,
        image_url='https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=80',
    ),
]


@router.get('/health')
def health() -> dict[str, str]:
    return {'status': 'ok'}


@router.get('/products', response_model=list[Product])
def list_products() -> list[Product]:
    return PRODUCTS


@router.get('/products/{product_id}', response_model=Product)
def get_product(product_id: int) -> Product:
    for product in PRODUCTS:
        if product.id == product_id:
            return product
    raise HTTPException(status_code=404, detail='Product not found')


api_router.include_router(router)
