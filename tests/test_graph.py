from langchain_core.language_models.fake_chat_models import FakeListChatModel

from app.agents.graph import MAX_REVIEW_ROUNDS, build_graph, plan_trip

TRIP = {"destination": "Lisbon", "days": 3, "budget_usd": 1500, "interests": ["food"]}


def _graph(*replies: str):
    return build_graph(FakeListChatModel(responses=list(replies)))


def test_approved_plan_runs_each_agent_once():
    graph = _graph("research notes", "Day 1: Alfama", "lodging 300 USD", "APPROVE: realistic")

    result = plan_trip(graph, **TRIP)

    assert result["research"] == "research notes"
    assert result["itinerary"] == "Day 1: Alfama"
    assert result["budget"] == "lodging 300 USD"
    assert result["approved"] is True
    assert result["review_rounds"] == 1


def test_rejected_itinerary_goes_back_to_planner_once():
    graph = _graph(
        "research notes",
        "itinerary v1",
        "budget v1",
        "REVISE: too packed on day 2",
        "itinerary v2",
        "budget v2",
        "APPROVE",
    )

    result = plan_trip(graph, **TRIP)

    assert result["itinerary"] == "itinerary v2"
    assert result["approved"] is True
    assert result["review_rounds"] == 2


def test_gives_up_after_max_review_rounds():
    graph = _graph(
        "research notes",
        "itinerary v1",
        "budget v1",
        "REVISE: a",
        "itinerary v2",
        "budget v2",
        "REVISE: b",
    )

    result = plan_trip(graph, **TRIP)

    assert result["approved"] is False
    assert result["review_rounds"] == MAX_REVIEW_ROUNDS
    assert result["itinerary"] == "itinerary v2"
