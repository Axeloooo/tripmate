from app.agents.progress import advance, finished_progress, hold_working, initial_progress


def _statuses(progress):
    return [p["status"] for p in progress]


def test_revision_puts_reviewer_on_hold_and_sends_work_back():
    progress = finished_progress()
    progress[3]["status"] = "working"

    after = advance(progress, "reviewer_agent", {"approved": False, "revision_count": 1})

    assert _statuses(after) == ["done", "working", "waiting", "hold"]


def test_approval_or_last_round_finishes_the_reviewer():
    working = initial_progress()

    approved = advance(working, "reviewer_agent", {"approved": True, "revision_count": 1})
    exhausted = advance(working, "reviewer_agent", {"approved": False, "revision_count": 2})

    assert approved[3]["status"] == exhausted[3]["status"] == "done"


def test_hold_working_only_touches_the_active_agent():
    assert _statuses(hold_working(initial_progress())) == ["hold", "waiting", "waiting", "waiting"]
