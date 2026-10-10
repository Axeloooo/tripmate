import json
import re
from typing import Literal

from pydantic import BaseModel, Field, ValidationError

StopKind = Literal["flight", "transit", "food", "stay", "activity"]


class Stop(BaseModel):
    time: str = Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    title: str = Field(min_length=1, max_length=200)
    detail: str = Field(default="", max_length=400)
    kind: StopKind = "activity"
    cost_usd: int | None = Field(default=None, ge=0)


class Day(BaseModel):
    label: str = Field(min_length=1, max_length=100)
    stops: list[Stop] = Field(min_length=1)


class StructuredItinerary(BaseModel):
    days: list[Day] = Field(min_length=1)


def parse_itinerary(text: str) -> list[dict] | None:
    """Return the days from the itinerary agent's JSON reply, or None if it is not usable."""
    candidate = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip())
    start, end = candidate.find("{"), candidate.rfind("}")
    if start == -1 or end <= start:
        return None
    try:
        parsed = StructuredItinerary.model_validate(json.loads(candidate[start : end + 1]))
    except (ValueError, ValidationError):
        return None
    return [day.model_dump() for day in parsed.days]
