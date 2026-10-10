from collections.abc import Callable, Mapping
from typing import Any

from langchain_core.language_models import BaseChatModel
from langgraph.graph import END, START, StateGraph
from langgraph.graph.state import CompiledStateGraph

from app.agents.itinerary import parse_itinerary
from app.agents.nodes import make_nodes
from app.agents.state import TripState

MAX_REVIEW_ROUNDS = 2


def _route_after_review(state: Mapping[str, Any]) -> str:
    if state.get("approved") or state.get("revision_count", 0) >= MAX_REVIEW_ROUNDS:
        return "done"
    return "revise"


def build_graph(llm: BaseChatModel) -> CompiledStateGraph:
    graph = StateGraph(TripState)
    for name, node in make_nodes(llm).items():
        graph.add_node(name, node)

    graph.add_edge(START, "research_agent")
    graph.add_edge("research_agent", "itinerary_agent")
    graph.add_edge("itinerary_agent", "budget_agent")
    graph.add_edge("budget_agent", "reviewer_agent")
    graph.add_conditional_edges(
        "reviewer_agent",
        _route_after_review,
        {"revise": "itinerary_agent", "done": END},
    )
    return graph.compile()


def _next_agent(node: str, update: Mapping[str, Any]) -> str | None:
    """The agent that runs after `node`, given what `node` returned. None when planning is done."""
    if node == "reviewer_agent":
        return None if _route_after_review(update) == "done" else "itinerary_agent"
    return {
        "research_agent": "itinerary_agent",
        "itinerary_agent": "budget_agent",
        "budget_agent": "reviewer_agent",
    }[node]


def plan_trip(
    graph: CompiledStateGraph,
    *,
    destination: str,
    days: int,
    budget_usd: int,
    interests: list[str],
    on_progress: Callable[[list[str], str | None], None] | None = None,
) -> dict[str, Any]:
    """Run the graph. `on_progress(completed_nodes, current_node)` fires as each agent finishes."""
    state: dict[str, Any] = {
        "destination": destination,
        "days": days,
        "budget_usd": budget_usd,
        "interests": interests,
        "revision_count": 0,
    }
    completed: list[str] = []
    if on_progress:
        on_progress([], "research_agent")
    for chunk in graph.stream(state, stream_mode="updates"):
        for node, update in chunk.items():
            state.update(update)
            completed.append(node)
            if on_progress:
                on_progress(list(completed), _next_agent(node, state))
    final = state
    return {
        "research": final["research"],
        "itinerary": final["itinerary"],
        "days": parse_itinerary(final["itinerary"]),
        "budget": final["budget_breakdown"],
        "review": final["review"],
        "approved": final["approved"],
        "review_rounds": final["revision_count"],
    }
