from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ProductRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sku: str
    name: str
    brand: str
    category: str
    short_description: str
    description: str
    price: float
    original_price: float | None = None
    stock: int
    image_url: str
    rating: float
    review_count: int
    featured: bool
    availability: str
    specifications: dict[str, str]
    created_at: datetime
