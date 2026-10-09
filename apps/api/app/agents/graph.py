from typing import Any

from langchain_core.language_models import BaseChatModel
from langgraph.graph import END, START, StateGraph
from langgraph.graph.state import CompiledStateGraph

from app.agents.nodes import make_nodes
from app.agents.state import TripState

MAX_REVIEW_ROUNDS = 2


def _route_after_review(state: TripState) -> str:
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


def plan_trip(
    graph: CompiledStateGraph,
    *,
    destination: str,
    days: int,
    budget_usd: int,
    interests: list[str],
) -> dict[str, Any]:
    final = graph.invoke(
        {
            "destination": destination,
            "days": days,
            "budget_usd": budget_usd,
            "interests": interests,
            "revision_count": 0,
        }
    )
    return {
        "research": final["research"],
        "itinerary": final["itinerary"],
        "budget": final["budget_breakdown"],
        "review": final["review"],
        "approved": final["approved"],
        "review_rounds": final["revision_count"],
    }
