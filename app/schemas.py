from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field


class TripRequest(BaseModel):
    destination: str = Field(min_length=2, max_length=200)
    days: int = Field(ge=1, le=14)
    budget_usd: int = Field(ge=100, le=100_000)
    interests: list[Annotated[str, Field(min_length=1, max_length=50)]] = Field(
        default_factory=list, max_length=10
    )


class TripOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    destination: str
    days: int
    budget_usd: int
    interests: list[str]
    plan: dict
    created_at: datetime
