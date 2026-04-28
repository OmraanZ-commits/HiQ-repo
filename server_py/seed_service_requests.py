"""
Seed Service Requests for the Paid Bible module.
Mirrors the SEED_REQUESTS constant from client/src/lib/sr-store.ts
so the backend DB starts with realistic demo data.
"""

APPROVERS_APPROVED = [
    {"label": "Network Planner",      "assignedTo": "Meera Nair",   "subLabel": "Network Review",        "status": "approved", "actionedAt": "2026-01-12T10:15:00Z", "rejectionReason": None},
    {"label": "Supply Planner",       "assignedTo": "Rohan Das",    "subLabel": "Production Activities", "status": "approved", "actionedAt": "2026-01-13T14:30:00Z", "rejectionReason": None},
    {"label": "Distribution Planner", "assignedTo": "Anita Rao",    "subLabel": "Distribution Review",   "status": "approved", "actionedAt": "2026-01-14T11:00:00Z", "rejectionReason": None},
    {"label": "NCSM",                 "assignedTo": "Suresh Kumar", "subLabel": "Final Approval",        "status": "approved", "actionedAt": "2026-01-15T09:45:00Z", "rejectionReason": None},
]

SR_SEEDS = [
    # ── BP-1800 Lakme: Status Change → Active Pack (Approved) ─────────────────
    {
        "id": "SR-SEED-001",
        "srType": "basepack-status-change",
        "status": "approved",
        "raisedBy": "Meera Nair",
        "businessGroup": "Beauty and Wellness",
        "brand": "Lakme",
        "basepackCode": "BP-1800",
        "basepackName": "Lakme 9to5 Weightless Mousse Foundation 25ml",
        "targetStatus": "Active Pack",
        "requestedValue": "Active Pack",
        "currentValue": "Draft",
        "businessJustification": "MSTN criteria met — activating for market release.",
        "criteriaMetAtRaise": True,
        "mstnCoverageAtRaise": 92,
        "approvers": APPROVERS_APPROVED,
    },

    # ── BP-1800 Lakme: Geo Extension, CBU-50018001 (Pending — 1/4 done) ───────
    {
        "id": "SR-SEED-002",
        "srType": "geo-extension",
        "status": "pending",
        "raisedBy": "Meera Nair",
        "businessGroup": "Beauty and Wellness",
        "brand": "Lakme",
        "basepackCode": "BP-1800",
        "basepackName": "Lakme 9to5 Weightless Mousse Foundation 25ml",
        "cbuId": "CBU-50018001",
        "cbuCode": "CBU-50018001",
        "cbuDescription": "Lakme 9to5 Weightless Mousse Foundation Ivory 25ml",
        "addedGeos": ["HYDERABAD-A", "HYDERABAD-B"],
        "addedDepots": ["HYD-01"],
        "businessJustification": "Expanding to Hyderabad cluster per Q2 distribution plan.",
        "approvers": [
            {"label": "Network Planner",      "assignedTo": "Meera Nair",   "subLabel": "Network Review",        "status": "approved", "actionedAt": "2026-04-04T09:30:00Z", "rejectionReason": None},
            {"label": "Supply Planner",       "assignedTo": "Rohan Das",    "subLabel": "Production Activities", "status": "pending",  "actionedAt": None,                    "rejectionReason": None},
            {"label": "Distribution Planner", "assignedTo": "Anita Rao",    "subLabel": "Distribution Review",   "status": "waiting",  "actionedAt": None,                    "rejectionReason": None},
            {"label": "NCSM",                 "assignedTo": "Suresh Kumar", "subLabel": "Final Approval",        "status": "waiting",  "actionedAt": None,                    "rejectionReason": None},
        ],
    },

    # ── BP-1700 Pepsodent: Status Change → Active Pack (Approved) ────────────
    {
        "id": "SR-SEED-003",
        "srType": "basepack-status-change",
        "status": "approved",
        "raisedBy": "Vikram Singh",
        "businessGroup": "Personal Care",
        "brand": "Pepsodent",
        "basepackCode": "BP-1700",
        "basepackName": "Pepsodent Germi Check Toothpaste 150g",
        "targetStatus": "Active Pack",
        "requestedValue": "Active Pack",
        "currentValue": "Draft",
        "businessJustification": "MSTN threshold cleared — activating.",
        "criteriaMetAtRaise": True,
        "mstnCoverageAtRaise": 88,
        "approvers": [
            {"label": "Network Planner",      "assignedTo": "Vikram Singh", "subLabel": "Network Review",        "status": "approved", "actionedAt": "2025-11-20T14:00:00Z", "rejectionReason": None},
            {"label": "Supply Planner",       "assignedTo": "Rohan Das",    "subLabel": "Production Activities", "status": "approved", "actionedAt": "2025-11-21T10:30:00Z", "rejectionReason": None},
            {"label": "Distribution Planner", "assignedTo": "Anita Rao",    "subLabel": "Distribution Review",   "status": "approved", "actionedAt": "2025-11-22T09:00:00Z", "rejectionReason": None},
            {"label": "NCSM",                 "assignedTo": "Suresh Kumar", "subLabel": "Final Approval",        "status": "approved", "actionedAt": "2025-11-24T11:45:00Z", "rejectionReason": None},
        ],
    },

    # ── BP-1700 Pepsodent: Channel Extension, CBU-50017001 (Approved) ─────────
    {
        "id": "SR-SEED-004",
        "srType": "channel-extension",
        "status": "approved",
        "raisedBy": "Vikram Singh",
        "businessGroup": "Personal Care",
        "brand": "Pepsodent",
        "basepackCode": "BP-1700",
        "basepackName": "Pepsodent Germi Check Toothpaste 150g",
        "cbuId": "CBU-50017001",
        "cbuCode": "CBU-50017001",
        "cbuDescription": "Pepsodent Germi Check Toothpaste GT Pack 150g",
        "addedChannels": ["Ecom", "KA"],
        "businessJustification": "Listing on Ecom and Key Accounts as part of D2C push.",
        "approvers": [
            {"label": "Network Planner",      "assignedTo": "Vikram Singh", "subLabel": "Network Review",        "status": "approved", "actionedAt": "2026-02-06T09:00:00Z", "rejectionReason": None},
            {"label": "Supply Planner",       "assignedTo": "Rohan Das",    "subLabel": "Production Activities", "status": "approved", "actionedAt": "2026-02-07T11:30:00Z", "rejectionReason": None},
            {"label": "Distribution Planner", "assignedTo": "Anita Rao",    "subLabel": "Distribution Review",   "status": "approved", "actionedAt": "2026-02-08T15:00:00Z", "rejectionReason": None},
            {"label": "NCSM",                 "assignedTo": "Suresh Kumar", "subLabel": "Final Approval",        "status": "approved", "actionedAt": "2026-02-10T10:15:00Z", "rejectionReason": None},
        ],
    },

    # ── BP-700 Brooke Bond: Status Change → Active Pack (Rejected at step 0) ──
    {
        "id": "SR-SEED-005",
        "srType": "basepack-status-change",
        "status": "rejected",
        "raisedBy": "Arun Mehta",
        "businessGroup": "Foods",
        "brand": "Brooke Bond",
        "basepackCode": "BP-700",
        "basepackName": "Brooke Bond Red Label 500g",
        "targetStatus": "Active Pack",
        "requestedValue": "Active Pack",
        "currentValue": "Draft",
        "businessJustification": "Requesting activation — MSTN check at 65%.",
        "criteriaMetAtRaise": False,
        "mstnCoverageAtRaise": 65,
        "rejectionReason": "Insufficient MSTN coverage (< 80%)",
        "approvers": [
            {"label": "Network Planner",      "assignedTo": "Arun Mehta",   "subLabel": "Network Review",        "status": "rejected", "actionedAt": "2026-03-15T16:00:00Z", "rejectionReason": "Insufficient MSTN coverage (< 80%)"},
            {"label": "Supply Planner",       "assignedTo": "Rohan Das",    "subLabel": "Production Activities", "status": "waiting",  "actionedAt": None,                    "rejectionReason": None},
            {"label": "Distribution Planner", "assignedTo": "Anita Rao",    "subLabel": "Distribution Review",   "status": "waiting",  "actionedAt": None,                    "rejectionReason": None},
            {"label": "NCSM",                 "assignedTo": "Suresh Kumar", "subLabel": "Final Approval",        "status": "waiting",  "actionedAt": None,                    "rejectionReason": None},
        ],
    },

    # ── BP-700 Brooke Bond: Geo Extension, CBU-50007890 (Approved) ───────────
    {
        "id": "SR-SEED-006",
        "srType": "geo-extension",
        "status": "approved",
        "raisedBy": "Arun Mehta",
        "businessGroup": "Foods",
        "brand": "Brooke Bond",
        "basepackCode": "BP-700",
        "basepackName": "Brooke Bond Red Label 500g",
        "cbuId": "CBU-50007890",
        "cbuCode": "CBU-50007890",
        "cbuDescription": "Brooke Bond Red Label Natural Care Tea 500g",
        "addedGeos": ["PUNE-A", "PUNE-B", "NASHIK-A"],
        "addedDepots": ["PUNE-01", "NAS-01"],
        "businessJustification": "West Maharashtra expansion as per NSM directive.",
        "approvers": [
            {"label": "Network Planner",      "assignedTo": "Arun Mehta",   "subLabel": "Network Review",        "status": "approved", "actionedAt": "2026-01-09T10:00:00Z", "rejectionReason": None},
            {"label": "Supply Planner",       "assignedTo": "Rohan Das",    "subLabel": "Production Activities", "status": "approved", "actionedAt": "2026-01-10T14:00:00Z", "rejectionReason": None},
            {"label": "Distribution Planner", "assignedTo": "Anita Rao",    "subLabel": "Distribution Review",   "status": "approved", "actionedAt": "2026-01-12T09:30:00Z", "rejectionReason": None},
            {"label": "NCSM",                 "assignedTo": "Suresh Kumar", "subLabel": "Final Approval",        "status": "approved", "actionedAt": "2026-01-13T11:15:00Z", "rejectionReason": None},
        ],
    },

    # ── BP-800 Closeup: Sourcing Amendment, CBU-50008901 (Pending — 0/4 done) ─
    {
        "id": "SR-SEED-007",
        "srType": "sourcing-amendment",
        "status": "pending",
        "raisedBy": "Deepa Krishnan",
        "businessGroup": "Personal Care",
        "brand": "Closeup",
        "basepackCode": "BP-800",
        "basepackName": "Closeup Ever Fresh Gel 150g",
        "cbuId": "CBU-50008901",
        "cbuCode": "CBU-50008901",
        "cbuDescription": "Closeup Ever Fresh Red Hot Gel Toothpaste 150g",
        "sourcingMode": "centralized",
        "centralizedGeo": ["DELHI-A", "DELHI-B", "MUMBAI-A"],
        "centralizedDepots": ["DEL-01", "MUM-02"],
        "businessJustification": "Centralised sourcing for cost efficiency in North+West clusters.",
        "approvers": [
            {"label": "Network Planner",      "assignedTo": "Deepa Krishnan", "subLabel": "Network Review",        "status": "pending",  "actionedAt": None, "rejectionReason": None},
            {"label": "Supply Planner",       "assignedTo": "Rohan Das",      "subLabel": "Production Activities", "status": "waiting",  "actionedAt": None, "rejectionReason": None},
            {"label": "Distribution Planner", "assignedTo": "Anita Rao",      "subLabel": "Distribution Review",   "status": "waiting",  "actionedAt": None, "rejectionReason": None},
            {"label": "NCSM",                 "assignedTo": "Suresh Kumar",   "subLabel": "Final Approval",        "status": "waiting",  "actionedAt": None, "rejectionReason": None},
        ],
    },

    # ── BP-800 Closeup: Geo Extension, CBU-50008902 (Pending — 0/4 done) ─────
    {
        "id": "SR-SEED-008",
        "srType": "geo-extension",
        "status": "pending",
        "raisedBy": "Deepa Krishnan",
        "businessGroup": "Personal Care",
        "brand": "Closeup",
        "basepackCode": "BP-800",
        "basepackName": "Closeup Ever Fresh Gel 150g",
        "cbuId": "CBU-50008902",
        "cbuCode": "CBU-50008902",
        "cbuDescription": "Closeup Ever Fresh Gel Whitening Toothpaste 150g",
        "addedGeos": ["BANGALORE-A", "BANGALORE-B"],
        "addedDepots": ["BLR-01"],
        "businessJustification": "South India expansion — Bangalore cluster prioritisation.",
        "approvers": [
            {"label": "Network Planner",      "assignedTo": "Deepa Krishnan", "subLabel": "Network Review",        "status": "pending",  "actionedAt": None, "rejectionReason": None},
            {"label": "Supply Planner",       "assignedTo": "Rohan Das",      "subLabel": "Production Activities", "status": "waiting",  "actionedAt": None, "rejectionReason": None},
            {"label": "Distribution Planner", "assignedTo": "Anita Rao",      "subLabel": "Distribution Review",   "status": "waiting",  "actionedAt": None, "rejectionReason": None},
            {"label": "NCSM",                 "assignedTo": "Suresh Kumar",   "subLabel": "Final Approval",        "status": "waiting",  "actionedAt": None, "rejectionReason": None},
        ],
    },
]
