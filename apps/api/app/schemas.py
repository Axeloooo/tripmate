from datetime import UTC, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator

from app.agents.progress import AgentId, AgentStatus
from app.itinerary import parse_itinerary


class TripRequest(BaseModel):
    destination: str = Field(min_length=2, max_length=200)
    days: int = Field(ge=1, le=14)
    budget_usd: int = Field(ge=100, le=100_000)
    interests: list[Annotated[str, Field(min_length=1, max_length=50)]] = Field(
        default_factory=list, max_length=10
    )


class StopOut(BaseModel):
    time: str
    title: str
    detail: str
    kind: Literal["flight", "transit", "food", "stay", "activity"]
    state: Literal["next", "decision"]
    cost_usd: int | None


class DayOut(BaseModel):
    label: str
    stops: list[StopOut]


class AgentProgressOut(BaseModel):
    id: AgentId
    status: AgentStatus


class TripOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    destination: str
    days: int
    budget_usd: int
    interests: list[str]
    plan: dict
    created_at: datetime
    status: Literal["planning", "ready", "failed"]
    error: str | None
    progress: list[AgentProgressOut] | None

    @field_validator("created_at")
    @classmethod
    def _assume_utc(cls, value: datetime) -> datetime:
        # SQLite hands back naive datetimes; the database stores UTC.
        return value if value.tzinfo else value.replace(tzinfo=UTC)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def itinerary(self) -> list[DayOut]:
        """The itinerary text parsed into days and stops for the board."""
        text = self.plan.get("itinerary")
        if not isinstance(text, str):
            return []
        return [
            DayOut.model_validate(d, from_attributes=True)
            for d in parse_itinerary(text, self.budget_usd)
        ]
