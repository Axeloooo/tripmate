import re
from collections.abc import Callable
from typing import Any

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage

from app.agents.state import TripState

RESEARCH_SYSTEM = (
    "You are the research agent of a travel planning team. Summarize what a traveler needs "
    "to know about the destination: highlights, best time to visit, local transport and "
    "practical tips. Keep it under 200 words."
)
ITINERARY_SYSTEM = (
    "You are the itinerary agent. Build a day-by-day plan that fits the number of days and "
    "the traveler's interests. Reply with JSON only, no prose and no code fences, shaped as "
    '{"days": [{"label": "Day 1, arrival", "stops": [{"time": "09:30", "title": "...", '
    '"detail": "one short line", "kind": "flight|transit|food|stay|activity", "cost_usd": 40}]}]}. '
    "Use 24-hour HH:MM times in order within each day, 3 to 6 stops per day, and whole-dollar "
    "costs for what each stop costs the traveler in total."
)
BUDGET_SYSTEM = (
    "You are the budget agent. Estimate the cost of the itinerary in USD, split into lodging, "
    "food, activities and transport, and say whether it fits the stated budget."
)
REVIEWER_SYSTEM = (
    "You are the reviewer agent. Check the itinerary and budget for realism, pacing and budget "
    "fit. Reply with one line starting with APPROVE, or with REVISE followed by the changes needed."
)


def _ask(llm: BaseChatModel, system: str, human: str) -> str:
    reply = llm.invoke([SystemMessage(content=system), HumanMessage(content=human)])
    return str(reply.content).strip()


def _trip_brief(state: TripState) -> str:
    interests = ", ".join(state["interests"]) or "general sightseeing"
    return (
        f"Destination: {state['destination']}\n"
        f"Days: {state['days']}\n"
        f"Budget (USD): {state['budget_usd']}\n"
        f"Interests: {interests}"
    )


def make_nodes(llm: BaseChatModel) -> dict[str, Callable[..., dict[str, Any]]]:
    def research_agent(state: TripState) -> dict:
        return {"research": _ask(llm, RESEARCH_SYSTEM, _trip_brief(state))}

    def itinerary_agent(state: TripState) -> dict:
        human = f"{_trip_brief(state)}\n\nResearch notes:\n{state['research']}"
        if state.get("review"):
            human += (
                f"\n\nPrevious itinerary:\n{state['itinerary']}"
                f"\n\nReviewer feedback to address:\n{state['review']}"
            )
        return {"itinerary": _ask(llm, ITINERARY_SYSTEM, human)}

    def budget_agent(state: TripState) -> dict:
        human = f"{_trip_brief(state)}\n\nItinerary:\n{state['itinerary']}"
        return {"budget_breakdown": _ask(llm, BUDGET_SYSTEM, human)}

    def reviewer_agent(state: TripState) -> dict:
        human = (
            f"{_trip_brief(state)}\n\nItinerary:\n{state['itinerary']}\n\n"
            f"Budget:\n{state['budget_breakdown']}"
        )
        review = _ask(llm, REVIEWER_SYSTEM, human)
        return {
            "review": review,
            "approved": bool(re.match(r"^\W*APPROVE", review, re.IGNORECASE)),
            "revision_count": state.get("revision_count", 0) + 1,
        }

    return {
        "research_agent": research_agent,
        "itinerary_agent": itinerary_agent,
        "budget_agent": budget_agent,
        "reviewer_agent": reviewer_agent,
    }
