from typing import TypedDict


class TripState(TypedDict, total=False):
    destination: str
    days: int
    budget_usd: int
    interests: list[str]
    research: str
    itinerary: str
    budget_breakdown: str
    review: str
    approved: bool
    revision_count: int
