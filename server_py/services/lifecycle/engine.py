import hashlib
from typing import Optional


def _stub_doh(entry_id: str) -> int:
    digest = hashlib.md5(str(entry_id).encode()).hexdigest()
    return 5 + int(digest[:8], 16) % 41


def compute_lifecycle(entry: dict) -> dict:
    status = entry.get("networkStatus", "Draft")

    color_flag: Optional[str] = None
    flag_label: Optional[str] = None
    urgency_level: int = 0
    doh: Optional[int] = None

    if status in ("Production Started",):
        color_flag = "amber"
        flag_label = "Production Underway"
        urgency_level = 1

    elif status in ("FTR Approved",):
        color_flag = "amber"
        flag_label = "FTR Complete — Awaiting Stock Movement"
        urgency_level = 1

    elif status in ("Stock Movement Initiated",):
        color_flag = "red"
        flag_label = "Stock In Motion"
        urgency_level = 2

    elif status in ("CBU Ready for Transition",):
        color_flag = "blinking-red"
        flag_label = "Ready for Transition"
        urgency_level = 3
        doh = _stub_doh(entry.get("id", ""))

    return {
        "entryId": entry.get("id"),
        "colorFlag": color_flag,
        "flagLabel": flag_label,
        "urgencyLevel": urgency_level,
        "doh": doh,
        "currentStatus": status,
    }
