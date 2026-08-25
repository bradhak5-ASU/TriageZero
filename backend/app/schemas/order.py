from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class OrderCustomer(BaseModel):
    full_name: str = Field(min_length=2, max_length=160)
    email: str = Field(min_length=5, max_length=160)
    address: str | None = Field(default=None, max_length=200)
    city: str | None = Field(default=None, max_length=120)
    state: str | None = Field(default=None, max_length=120)
    zip_code: str | None = Field(default=None, max_length=20)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        if "@" not in value or value.startswith("@") or value.endswith("@"):
            raise ValueError("Enter a valid email address.")
        return value


class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(ge=1)


class OrderCreate(BaseModel):
    customer: OrderCustomer
    items: list[OrderItemCreate] = Field(min_length=1)


class OrderItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    product_id: int
    sku: str
    product_name: str
    brand: str
    category: str
    image_url: str
    unit_price: float
    quantity: int
    subtotal: float


class OrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_number: str
    customer_name: str
    customer_email: str
    address: str | None = None
    city: str | None = None
    state: str | None = None
    zip_code: str | None = None
    subtotal: float
    shipping: float
    total: float
    status: str
    created_at: datetime
    items: list[OrderItemRead]
