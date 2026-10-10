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


def test_progress_reports_each_finished_agent_and_who_is_next():
    graph = _graph("r", "i", "b", "REVISE: a", "i2", "b2", "APPROVE")
    events: list[tuple[list[str], str | None]] = []

    plan_trip(graph, **TRIP, on_progress=lambda done, current: events.append((done, current)))

    assert events[0] == ([], "research_agent")
    assert events[1] == (["research_agent"], "itinerary_agent")
    assert events[4][1] == "itinerary_agent"  # reviewer asked for a revision
    assert events[-1][1] is None
    assert events[-1][0].count("itinerary_agent") == 2


def test_structured_itinerary_is_parsed_and_fences_are_tolerated():
    body = '{"days": [{"label": "Day 1", "stops": [{"time": "08:00", "title": "Walk"}]}]}'
    reply = f"```json\n{body}\n```"
    result = plan_trip(_graph("r", reply, "b", "APPROVE"), **TRIP)

    assert result["days"] == [
        {
            "label": "Day 1",
            "stops": [
                {
                    "time": "08:00",
                    "title": "Walk",
                    "detail": "",
                    "kind": "activity",
                    "cost_usd": None,
                }
            ],
        }
    ]


@pytest.mark.parametrize(
    "reply",
    [
        "Day 1: Alfama",
        '{"days": []}',
        '{"days": [{"label": "Day 1", "stops": [{"time": "25:00", "title": "x"}]}]}',
        '{"days": [{"label": "Day 1", "stops": [{"time": "08:00", "title": "x", "kind": "spa"}]}]}',
    ],
)
def test_unusable_itinerary_leaves_days_empty(reply):
    result = plan_trip(_graph("r", reply, "b", "APPROVE"), **TRIP)

    assert result["days"] is None
    assert result["itinerary"] == reply
