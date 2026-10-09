import pytest
from langchain_core.language_models.fake_chat_models import FakeListChatModel

from app.agents.graph import MAX_REVIEW_ROUNDS, build_graph, plan_trip
from app.agents.nodes import make_nodes

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


class _RecordingModel(FakeListChatModel):
    prompts: list[str] = []

    def _call(self, messages, *args, **kwargs):
        self.prompts.append(messages[-1].content)
        return super()._call(messages, *args, **kwargs)


def test_revision_prompt_includes_previous_itinerary_and_feedback():
    model = _RecordingModel(
        responses=[
            "research notes",
            "itinerary v1",
            "budget v1",
            "REVISE: too packed on day 2",
            "itinerary v2",
            "budget v2",
            "APPROVE",
        ],
        prompts=[],
    )

    plan_trip(build_graph(model), **TRIP)

    revision_prompt = model.prompts[4]
    assert "Previous itinerary:\nitinerary v1" in revision_prompt
    assert "Reviewer feedback to address:\nREVISE: too packed on day 2" in revision_prompt


@pytest.mark.parametrize(
    ("review", "approved"),
    [
        ("APPROVE: fine", True),
        ("**APPROVE**", True),
        ("\n APPROVE", True),
        ("approve", True),
        ("Verdict: APPROVE", False),
        ("REVISE: not an APPROVE", False),
    ],
)
def test_reviewer_approval_parsing(review, approved):
    reviewer = make_nodes(FakeListChatModel(responses=[review]))["reviewer_agent"]
    state = {
        "destination": "Lisbon",
        "days": 3,
        "budget_usd": 1500,
        "interests": [],
        "itinerary": "i",
        "budget_breakdown": "b",
    }

    assert reviewer(state)["approved"] is approved
