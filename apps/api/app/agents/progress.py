"""Per-agent progress for a planning run, stored on the trip so the UI can poll it."""

from typing import Literal

from app.agents.graph import route_after_review
from app.agents.state import TripState

AgentId = Literal["research", "itinerary", "budget", "reviewer"]
AgentStatus = Literal["waiting", "working", "done", "hold"]

AGENT_IDS: tuple[AgentId, ...] = ("research", "itinerary", "budget", "reviewer")
NODE_AGENT: dict[str, AgentId] = {
    "research_agent": "research",
    "itinerary_agent": "itinerary",
    "budget_agent": "budget",
    "reviewer_agent": "reviewer",
}

Progress = list[dict[str, str]]


def _build(statuses: dict[AgentId, AgentStatus]) -> Progress:
    return [{"id": agent, "status": statuses[agent]} for agent in AGENT_IDS]


def initial_progress() -> Progress:
    """Research starts as soon as the trip is created."""
    statuses: dict[AgentId, AgentStatus] = dict.fromkeys(AGENT_IDS, "waiting")
    statuses["research"] = "working"
    return _build(statuses)


def finished_progress() -> Progress:
    return _build(dict.fromkeys(AGENT_IDS, "done"))


def advance(progress: Progress, node: str, state: TripState) -> Progress:
    """Progress after `node` finished. A reviewer that sends the plan back is shown as on hold."""
    statuses: dict[AgentId, AgentStatus] = {p["id"]: p["status"] for p in progress}  # type: ignore[misc]
    agent = NODE_AGENT[node]
    index = AGENT_IDS.index(agent)
    if agent == "reviewer":
        if route_after_review(state) == "done":
            statuses["reviewer"] = "done"
        else:
            statuses["reviewer"] = "hold"
            statuses["itinerary"] = "working"
            statuses["budget"] = "waiting"
    else:
        statuses[agent] = "done"
        statuses[AGENT_IDS[index + 1]] = "working"
    return _build(statuses)


def hold_working(progress: Progress) -> Progress:
    """Mark whichever agent was working as on hold, after a failed run."""
    return [{**p, "status": "hold" if p["status"] == "working" else p["status"]} for p in progress]
