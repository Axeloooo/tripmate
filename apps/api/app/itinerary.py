"""Turn the itinerary agent's text into the day and stop structure the UI shows.

The agent is asked for one stop per line as `HH:MM | kind | title | detail | cost_usd`, but model
output drifts, so the parser also accepts plain bullet lines and guesses the missing parts.
"""

import re
from dataclasses import dataclass

KINDS = ("flight", "transit", "food", "stay", "activity")
DAY_RE = re.compile(r"^\W*day\s+(\d+)\b\W*(.*)$", re.IGNORECASE)
TIME_RE = re.compile(r"^\W*(\d{1,2}):(\d{2})\b\W*(.*)$")
BULLET_RE = re.compile(r"^\s*(?:[-*•]|\d+[.)])\s+(.*)$")
COST_RE = re.compile(r"^\$?\s*(\d[\d,]*)(?:\.\d+)?\s*(?:usd)?$", re.IGNORECASE)
PART_RE = re.compile(r"^\W*(morning|afternoon|evening)\b", re.IGNORECASE)
PART_OF_DAY = {"morning": "09:00", "afternoon": "14:00", "evening": "19:00"}
KIND_WORDS = {
    "flight": ("flight", "airport", "fly "),
    "transit": ("train", "bus", "metro", "subway", "taxi", "ferry", "transfer", "tram"),
    "food": ("breakfast", "lunch", "dinner", "brunch", "restaurant", "cafe", "market", "eat"),
    "stay": ("hotel", "hostel", "check in", "check-in", "check out", "lodging"),
}


@dataclass
class Stop:
    time: str
    title: str
    detail: str
    kind: str
    cost_usd: int | None
    state: str = "next"


@dataclass
class Day:
    label: str
    stops: list[Stop]


def _clean(text: str) -> str:
    return text.replace("**", "").replace("__", "").strip(" \t*_#")


def _guess_kind(text: str) -> str:
    lowered = text.lower()
    for kind, words in KIND_WORDS.items():
        if any(word in lowered for word in words):
            return kind
    return "activity"


def _parse_cost(text: str) -> int | None:
    match = COST_RE.match(text.strip())
    return int(match.group(1).replace(",", "")) if match else None


def _time(hours: str, minutes: str) -> str:
    return f"{min(int(hours), 23):02d}:{min(int(minutes), 59):02d}"


def _parse_stop(line: str) -> Stop | None:
    body = BULLET_RE.sub(r"\1", line)
    parts = [_clean(p) for p in body.split("|")]
    if len(parts) >= 3:
        timed = TIME_RE.match(parts[0])
        if timed:
            kind = parts[1].lower()
            cost = _parse_cost(parts[4]) if len(parts) > 4 else None
            return Stop(
                time=_time(timed.group(1), timed.group(2)),
                title=parts[2] or "Untitled stop",
                detail=parts[3] if len(parts) > 3 else "",
                kind=kind if kind in KINDS else _guess_kind(parts[2]),
                cost_usd=cost,
            )
    text = _clean(body)
    timed = TIME_RE.match(text)
    time = None
    if timed:
        time, text = _time(timed.group(1), timed.group(2)), _clean(timed.group(3))
    else:
        label, _, rest = text.partition(":")
        if label.strip().lower() in PART_OF_DAY and rest.strip():
            time, text = PART_OF_DAY[label.strip().lower()], _clean(rest)
    if not text:
        return None
    return Stop(time=time or "09:00", title=text, detail="", kind=_guess_kind(text), cost_usd=None)


def parse_itinerary(text: str, budget_usd: int) -> list[Day]:
    """Parse into days. The stop that first pushes the running cost over budget needs a decision."""
    days: list[Day] = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        heading = DAY_RE.match(line) if not BULLET_RE.match(line) else None
        if heading:
            suffix = _clean(heading.group(2)).lstrip(":-\u2013\u2014 ").strip()
            label = f"Day {heading.group(1)}" + (f", {suffix}" if suffix else "")
            days.append(Day(label=label, stops=[]))
            continue
        is_stop = (
            bool(BULLET_RE.match(line))
            or "|" in line
            or bool(TIME_RE.match(line))
            or bool(PART_RE.match(line))
        )
        if not is_stop:
            continue
        stop = _parse_stop(line)
        if stop is None:
            continue
        if not days:
            days.append(Day(label="Day 1", stops=[]))
        days[-1].stops.append(stop)

    days = [d for d in days if d.stops]
    for day in days:
        day.stops.sort(key=lambda s: s.time)
    spent = 0
    flagged = False
    for stop in (s for d in days for s in d.stops):
        spent += stop.cost_usd or 0
        if not flagged and spent > budget_usd:
            flagged = True
            stop.state = "decision"
            stop.detail = f"${spent - budget_usd:,} over budget" + (
                f" · {stop.detail}" if stop.detail else ""
            )
    return days
