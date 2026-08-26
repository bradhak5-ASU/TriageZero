from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class FailurePackageCreate(BaseModel):
    schema_version: Literal["1.0"]
    source: str = Field(min_length=1, max_length=120)
    run: dict[str, Any]
    repository: dict[str, Any]
    environment: dict[str, Any]
    test: dict[str, Any]
    failure: dict[str, Any]
    network_evidence: list[dict[str, Any]]
    console_errors: list[str]
    artifacts: dict[str, Any]

    @field_validator("source")
    @classmethod
    def validate_source(cls, value: str) -> str:
        if value != "novacart-playwright":
            raise ValueError("Unsupported failure package source.")
        return value


class InvestigationCreateAck(BaseModel):
    investigation_id: str
    status: str
    received_at: datetime


class InvestigationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    investigation_id: str
    status: str
    received_at: datetime
    package: dict[str, Any]
