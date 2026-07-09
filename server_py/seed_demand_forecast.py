"""
Seed data generator for the Demand Visibility (Dynamic Forecast) feature.

Real-world value ranges below were derived from the two source files provided
for this feature (MT dynamic-forecast workbook and the Non-MT UDLV forecast
export) so the demo numbers look representative, while the actual rows are
generated deterministically and linked to the existing demo CBUs' placeholder
basepack codes (per user preference — no remapping of demo basepacks).
"""

import hashlib
from typing import List

MOC_MONTHS = ["2026-07", "2026-08", "2026-09", "2026-10", "2026-11", "2026-12"]

# Forecast-channel labels observed in the Non-MT source file, with their
# approximate relative share, used to pick a realistic label per Non-MT row.
NON_MT_CHANNELS = ["GT", "CSD", "OH", "FR"]

# Sub-channel labels observed in the MT source file's "Sub Channel 1" column.
MT_SUB_CHANNELS = ["CNC", "Retail", "QCom", "ECom"]


def _seeded_rand(*parts: str) -> float:
    """Deterministic pseudo-random float in [0, 1) based on the given parts."""
    key = "|".join(parts).encode("utf-8")
    digest = hashlib.sha256(key).hexdigest()
    return int(digest[:8], 16) / 0xFFFFFFFF


def generate_demand_forecast_seeds(entries: List[dict]) -> List[dict]:
    """
    Build demand_forecast_entries rows for CBU x Depot x MOC, MT + Non-MT,
    for every network entry that is past the Draft stage (i.e. activated),
    since Demand Visibility is only meaningful post-activation.
    """
    rows: List[dict] = []
    seen: set = set()

    for entry in entries:
        status = entry.get("networkStatus") or "Draft"
        if status == "Draft":
            continue

        basepack = entry.get("basepack")
        depots = entry.get("depot") or []
        if not basepack or not depots:
            continue

        for depot in depots:
            dedupe_key = (basepack, depot)
            if dedupe_key in seen:
                continue
            seen.add(dedupe_key)

            for moc_month in MOC_MONTHS:
                # ── MT dynamic forecast row (Cases / RPM / Units) ──
                r1 = _seeded_rand(basepack, depot, moc_month, "mt-cases")
                mt_cases = round(5 + r1 * 115, 2)
                mt_rpm = round(mt_cases * (0.005 + _seeded_rand(basepack, depot, moc_month, "mt-rpm") * 0.02), 4)
                mt_units = round(mt_cases * (8 + _seeded_rand(basepack, depot, moc_month, "mt-units") * 12), 2)
                sc_idx = int(_seeded_rand(basepack, depot, moc_month, "mt-subchannel") * len(MT_SUB_CHANNELS))
                mt_sub_channel = MT_SUB_CHANNELS[min(sc_idx, len(MT_SUB_CHANNELS) - 1)]

                rows.append({
                    "basepack": basepack,
                    "depot": depot,
                    "mocMonth": moc_month,
                    "channelType": "MT",
                    "forecastChannel": "MT",
                    "subChannel": mt_sub_channel,
                    "qtyCases": mt_cases,
                    "qtyRpm": mt_rpm,
                    "qtyUnits": mt_units,
                })

                # ── Non-MT dynamic forecast row (Cases / RPM / Units) ──
                idx = int(_seeded_rand(basepack, depot, moc_month, "nm-channel") * len(NON_MT_CHANNELS))
                nm_channel = NON_MT_CHANNELS[min(idx, len(NON_MT_CHANNELS) - 1)]

                r2 = _seeded_rand(basepack, depot, moc_month, "nm-cases")
                nm_cases = round(10 + r2 * 260, 2)
                nm_rpm = round(nm_cases * (0.01 + _seeded_rand(basepack, depot, moc_month, "nm-rpm") * 0.03), 4)
                nm_units = round(nm_cases * (8 + _seeded_rand(basepack, depot, moc_month, "nm-units") * 12), 2)

                rows.append({
                    "basepack": basepack,
                    "depot": depot,
                    "mocMonth": moc_month,
                    "channelType": "Non-MT",
                    "forecastChannel": nm_channel,
                    "qtyCases": nm_cases,
                    "qtyRpm": nm_rpm,
                    "qtyUnits": nm_units,
                })

    return rows
