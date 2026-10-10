from app.itinerary import parse_itinerary

STRUCTURED = """Day 1: Arrival
09:00 | flight | Flight to Lisbon | Gate 24, bag included | 148
13:00 | food | Lunch at Cervejaria | Grilled prawns | 40
Day 2: Old town
10:00 | activity | Alfama walk | Free walking tour |
20:30 | food | Dinner at Belcanto | Tasting menu | 260
"""


def test_parses_structured_lines_into_days():
    days = parse_itinerary(STRUCTURED, budget_usd=5000)

    assert [d.label for d in days] == ["Day 1, Arrival", "Day 2, Old town"]
    first = days[0].stops[0]
    assert (first.time, first.kind, first.title, first.cost_usd) == (
        "09:00",
        "flight",
        "Flight to Lisbon",
        148,
    )
    assert days[1].stops[0].cost_usd is None
    assert all(s.state == "next" for d in days for s in d.stops)


def test_stop_that_crosses_the_budget_needs_a_decision():
    days = parse_itinerary(STRUCTURED, budget_usd=400)

    flagged = [s for d in days for s in d.stops if s.state == "decision"]
    assert [s.title for s in flagged] == ["Dinner at Belcanto"]
    assert flagged[0].detail.startswith("$48 over budget")


def test_accepts_plain_bullets_and_parts_of_the_day():
    text = """**Day 1 - Arrival**
- Morning: Walk the old town
- 14:30 Lunch at the market
* Check in at the hotel
"""
    days = parse_itinerary(text, budget_usd=1000)

    assert days[0].label == "Day 1, Arrival"
    stops = {s.title: s for s in days[0].stops}
    assert stops["Walk the old town"].time == "09:00"
    assert stops["Lunch at the market"].time == "14:30"
    assert stops["Lunch at the market"].kind == "food"
    assert stops["Check in at the hotel"].kind == "stay"


def test_unstructured_text_yields_no_days():
    assert parse_itinerary("itinerary", budget_usd=500) == []
    assert parse_itinerary("", budget_usd=500) == []


def test_stops_before_any_heading_go_into_day_one():
    days = parse_itinerary("- Visit the castle", budget_usd=500)

    assert [d.label for d in days] == ["Day 1"]
