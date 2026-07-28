# Seed data for the CCR (Customer Change Request) module.
# CSE IDs reference users by email (resolved at runtime via UsersStorage lookup).
# Customer chains cover the 5 major MT chains in India.

CCR_CUSTOMER_SEEDS = [
    {
        "customer_chain": "Blinkit",
        "coverage_type": "National",
        "behaviour_type": "Listing",
        "cse_id": "priya.patel@unilever.com",
    },
    {
        "customer_chain": "Swiggy Instamart",
        "coverage_type": "National",
        "behaviour_type": "Listing",
        "cse_id": "ankit.verma@unilever.com",
    },
    {
        "customer_chain": "DMart",
        "coverage_type": "National",
        "behaviour_type": "Listing",
        "cse_id": "priya.patel@unilever.com",
    },
    {
        "customer_chain": "Reliance Smart",
        "coverage_type": "National",
        "behaviour_type": "Listing",
        "cse_id": "vikram.singh@unilever.com",
    },
    {
        "customer_chain": "BigBasket",
        "coverage_type": "National",
        "behaviour_type": "Non-Listing",
        "cse_id": "ankit.verma@unilever.com",
    },
]

# Customer code + depot mappings. channel="MT" per task specification;
# sub_channel carries the customer-specific identity for display purposes.
CCR_CODE_MAPPING_SEEDS = [
    # Blinkit — quick-commerce arm, mapped under MT umbrella
    {"customer_chain": "Blinkit", "customer_code": "BLK-DL-001", "depot": "DLGH", "sub_channel": "Blinkit",  "channel": "MT"},
    {"customer_chain": "Blinkit", "customer_code": "BLK-JP-001", "depot": "JPRH", "sub_channel": "Blinkit",  "channel": "MT"},
    {"customer_chain": "Blinkit", "customer_code": "BLK-MH-001", "depot": "MMDH", "sub_channel": "Blinkit",  "channel": "MT"},
    {"customer_chain": "Blinkit", "customer_code": "BLK-MH-002", "depot": "SHAH", "sub_channel": "Blinkit",  "channel": "MT"},
    {"customer_chain": "Blinkit", "customer_code": "BLK-KA-001", "depot": "BNDH", "sub_channel": "Blinkit",  "channel": "MT"},
    {"customer_chain": "Blinkit", "customer_code": "BLK-TN-001", "depot": "CHKH", "sub_channel": "Blinkit",  "channel": "MT"},
    # Swiggy Instamart
    {"customer_chain": "Swiggy Instamart", "customer_code": "SWG-DL-001", "depot": "DLGH", "sub_channel": "Swiggy", "channel": "MT"},
    {"customer_chain": "Swiggy Instamart", "customer_code": "SWG-MH-001", "depot": "MMDH", "sub_channel": "Swiggy", "channel": "MT"},
    {"customer_chain": "Swiggy Instamart", "customer_code": "SWG-KA-001", "depot": "BNDH", "sub_channel": "Swiggy", "channel": "MT"},
    {"customer_chain": "Swiggy Instamart", "customer_code": "SWG-TN-001", "depot": "CHKH", "sub_channel": "Swiggy", "channel": "MT"},
    {"customer_chain": "Swiggy Instamart", "customer_code": "SWG-WB-001", "depot": "KOPH", "sub_channel": "Swiggy", "channel": "MT"},
    # DMart — MT Retail
    {"customer_chain": "DMart", "customer_code": "DMT-DL-001", "depot": "DLGH", "sub_channel": "DMart", "channel": "MT"},
    {"customer_chain": "DMart", "customer_code": "DMT-MH-001", "depot": "MMDH", "sub_channel": "DMart", "channel": "MT"},
    {"customer_chain": "DMart", "customer_code": "DMT-GJ-001", "depot": "VJDH", "sub_channel": "DMart", "channel": "MT"},
    {"customer_chain": "DMart", "customer_code": "DMT-TN-001", "depot": "CHKH", "sub_channel": "DMart", "channel": "MT"},
    {"customer_chain": "DMart", "customer_code": "DMT-KA-001", "depot": "BNDH", "sub_channel": "DMart", "channel": "MT"},
    {"customer_chain": "DMart", "customer_code": "DMT-UP-001", "depot": "VABH", "sub_channel": "DMart", "channel": "MT"},
    {"customer_chain": "DMart", "customer_code": "DMT-RJ-001", "depot": "RJ2H", "sub_channel": "DMart", "channel": "MT"},
    # Reliance Smart
    {"customer_chain": "Reliance Smart", "customer_code": "RLI-DL-001", "depot": "DLGH", "sub_channel": "Reliance Smart", "channel": "MT"},
    {"customer_chain": "Reliance Smart", "customer_code": "RLI-MH-001", "depot": "MMDH", "sub_channel": "Reliance Smart", "channel": "MT"},
    {"customer_chain": "Reliance Smart", "customer_code": "RLI-GJ-001", "depot": "VJDH", "sub_channel": "Reliance Smart", "channel": "MT"},
    {"customer_chain": "Reliance Smart", "customer_code": "RLI-TN-001", "depot": "CHKH", "sub_channel": "Reliance Smart", "channel": "MT"},
    {"customer_chain": "Reliance Smart", "customer_code": "RLI-KA-001", "depot": "BNDH", "sub_channel": "Reliance Smart", "channel": "MT"},
    # BigBasket
    {"customer_chain": "BigBasket", "customer_code": "BBK-DL-001", "depot": "DLGH", "sub_channel": "BigBasket", "channel": "MT"},
    {"customer_chain": "BigBasket", "customer_code": "BBK-MH-001", "depot": "MMDH", "sub_channel": "BigBasket", "channel": "MT"},
    {"customer_chain": "BigBasket", "customer_code": "BBK-KA-001", "depot": "BNDH", "sub_channel": "BigBasket", "channel": "MT"},
    {"customer_chain": "BigBasket", "customer_code": "BBK-TN-001", "depot": "CHKH", "sub_channel": "BigBasket", "channel": "MT"},
    {"customer_chain": "BigBasket", "customer_code": "BBK-WB-001", "depot": "KOPH", "sub_channel": "BigBasket", "channel": "MT"},
]

# NOTE: CIC mappings for CBU-50019001 through CBU-50019007 are intentionally NOT
# hardcoded here. These CBUs are real Master Maintenance network entries, and their
# Posting Status must reflect genuine configuration (via the Configure page) or
# genuine trigger-engine evaluation — not pre-seeded demo data that never went
# through either path. Only seed mappings below that represent completeness data
# for other relaunch CBUs unrelated to the master maintenance demo set.
CCR_CIC_MAPPING_SEEDS = []

# 9 ruleset rows from BRD section 12
CCR_RULESET_SEEDS = [
    {
        "network_change_type": "Artwork Change",
        "new_cic_required": False,
        "content_update_required": True,
        "rundown_required": False,
        "auto_ccr": True,
        "notes": "Content update only; existing CIC valid; auto-CCR triggered on FTR Approved.",
    },
    {
        "network_change_type": "Packaging Change",
        "new_cic_required": True,
        "content_update_required": True,
        "rundown_required": True,
        "auto_ccr": False,
        "notes": "New CIC required due to EAN/case config change; manual CCR with rundown.",
    },
    {
        "network_change_type": "Formulation Change",
        "new_cic_required": False,
        "content_update_required": True,
        "rundown_required": False,
        "auto_ccr": True,
        "notes": "No EAN change; content update required; auto-CCR on Production Started.",
    },
    {
        "network_change_type": "Grammage Change",
        "new_cic_required": True,
        "content_update_required": True,
        "rundown_required": True,
        "auto_ccr": False,
        "notes": "Weight change implies new EAN; new CIC and predecessor rundown mandatory.",
    },
    {
        "network_change_type": "Case Config Change",
        "new_cic_required": True,
        "content_update_required": False,
        "rundown_required": True,
        "auto_ccr": False,
        "notes": "Case count or ITF change; new CIC needed; manual rundown coordination.",
    },
    {
        "network_change_type": "Pricing Change >10%",
        "new_cic_required": False,
        "content_update_required": False,
        "rundown_required": False,
        "auto_ccr": True,
        "notes": "Price-only change >10%; auto-CCR sent for customer acknowledgment.",
    },
    {
        "network_change_type": "Pricing Change ≤10%",
        "new_cic_required": False,
        "content_update_required": False,
        "rundown_required": False,
        "auto_ccr": True,
        "notes": "Minor price change; auto-CCR with no rundown requirement.",
    },
    {
        "network_change_type": "Artwork + Packaging Change",
        "new_cic_required": False,  # Relaunch: successor inherits predecessor CIC — reuse is the default
        "content_update_required": True,
        "rundown_required": True,
        "auto_ccr": False,
        "notes": "Combined change; most complex; full manual CCR with new CIC and rundown.",
    },
    {
        "network_change_type": "Formulation + Artwork Change",
        "new_cic_required": False,
        "content_update_required": True,
        "rundown_required": False,
        "auto_ccr": False,
        "notes": "Dual change but EAN unchanged; content update mandatory; semi-auto CCR.",
    },
]

# CCR line items linking CBU-50019001 through CBU-50019007 to seeded customers.
# All 7 CBUs are Production Started → 1st trigger (Amber) is active.
# Varied ccr_status and execution_type to represent realistic pipeline state.
CCR_LINE_ITEM_SEEDS = [
    # ── CBU-50019001 (Lifebuoy Soap 100g) ──
    {"predecessor_cbu_code": "CBU-50018900", "successor_cbu_code": "CBU-50019001", "customer_chain": "DMart",          "customer_code": "DMT-DL-001", "cic": "CIC-FTR1-DL-DMT", "trigger_stage": "First",  "urgency_color": "Amber", "ccr_status": "Action Required", "execution_type": "Manual"},
    {"predecessor_cbu_code": "CBU-50018900", "successor_cbu_code": "CBU-50019001", "customer_chain": "DMart",          "customer_code": "DMT-UP-001", "cic": "CIC-FTR1-UP-DMT", "trigger_stage": "First",  "urgency_color": "Amber", "ccr_status": "Upcoming",        "execution_type": "Manual"},
    {"predecessor_cbu_code": "CBU-50018900", "successor_cbu_code": "CBU-50019001", "customer_chain": "Reliance Smart", "customer_code": "RLI-DL-001", "cic": "CIC-FTR1-DL-RLI", "trigger_stage": "First",  "urgency_color": "Amber", "ccr_status": "Action Required", "execution_type": "Semi-Auto"},
    {"predecessor_cbu_code": "CBU-50018900", "successor_cbu_code": "CBU-50019001", "customer_chain": "Blinkit",        "customer_code": "BLK-DL-001", "cic": None,               "trigger_stage": "None",   "urgency_color": "None",  "ccr_status": "Upcoming",        "execution_type": "None"},

    # ── CBU-50019002 (Sunsilk Shampoo 340ml) — full set matching 12 predecessor CIC rows ──
    # CBU-50018901 (predecessor / BP-1901) has 12 CIC mappings:
    #   MT Retail — DMart  at MMDH / CHKH / BNDH   (Non-Listing: CIC transferred to successor)
    #   MT        — Reliance Smart at MMDH / CHKH / BNDH (Non-Listing)
    #   Ecom      — BigBasket at MMDH / CHKH / BNDH (Listing-Based: predecessor + successor coexist)
    #   Qcom      — Blinkit  at MMDH / CHKH / BNDH  (Listing-Based)
    # Most are "Action Required" so the evaluator can walk through the full CIC evaluation flow.
    # CIC values are the proposed successor codes derived from the predecessor's CIC.
    # ── MT Retail / DMart ────────────────────────────────────────────────────────
    {"predecessor_cbu_code": "CBU-50018901", "successor_cbu_code": "CBU-50019002", "customer_chain": "DMart",           "customer_code": "DMT-MH-001", "cic": "CIC-FTR2-MH-DMT", "trigger_stage": "First", "urgency_color": "Amber", "ccr_status": "Action Required", "execution_type": "Manual"},
    {"predecessor_cbu_code": "CBU-50018901", "successor_cbu_code": "CBU-50019002", "customer_chain": "DMart",           "customer_code": "DMT-TN-001", "cic": "CIC-FTR2-TN-DMT", "trigger_stage": "First", "urgency_color": "Amber", "ccr_status": "Completed",       "execution_type": "Auto"},
    {"predecessor_cbu_code": "CBU-50018901", "successor_cbu_code": "CBU-50019002", "customer_chain": "DMart",           "customer_code": "DMT-KA-001", "cic": "CIC-FTR2-KA-DMT", "trigger_stage": "First", "urgency_color": "Amber", "ccr_status": "Action Required", "execution_type": "Manual"},
    # ── MT / Reliance Smart ──────────────────────────────────────────────────────
    {"predecessor_cbu_code": "CBU-50018901", "successor_cbu_code": "CBU-50019002", "customer_chain": "Reliance Smart",  "customer_code": "RLI-MH-001", "cic": "CIC-FTR2-MH-RLI", "trigger_stage": "First", "urgency_color": "Amber", "ccr_status": "Action Required", "execution_type": "Manual"},
    {"predecessor_cbu_code": "CBU-50018901", "successor_cbu_code": "CBU-50019002", "customer_chain": "Reliance Smart",  "customer_code": "RLI-TN-001", "cic": "CIC-FTR2-TN-RLI", "trigger_stage": "First", "urgency_color": "Amber", "ccr_status": "Action Required", "execution_type": "Manual"},
    {"predecessor_cbu_code": "CBU-50018901", "successor_cbu_code": "CBU-50019002", "customer_chain": "Reliance Smart",  "customer_code": "RLI-KA-001", "cic": "CIC-FTR2-KA-RLI", "trigger_stage": "First", "urgency_color": "Amber", "ccr_status": "Action Required", "execution_type": "Semi-Auto"},
    # ── Ecom / BigBasket (Listing-Based — predecessor + successor CIC coexist) ───
    {"predecessor_cbu_code": "CBU-50018901", "successor_cbu_code": "CBU-50019002", "customer_chain": "BigBasket",       "customer_code": "BBK-MH-001", "cic": "CIC-FTR2-MH-BBK", "trigger_stage": "First", "urgency_color": "Amber", "ccr_status": "Action Required", "execution_type": "Auto"},
    {"predecessor_cbu_code": "CBU-50018901", "successor_cbu_code": "CBU-50019002", "customer_chain": "BigBasket",       "customer_code": "BBK-TN-001", "cic": "CIC-FTR2-TN-BBK", "trigger_stage": "First", "urgency_color": "Amber", "ccr_status": "Completed",       "execution_type": "Auto"},
    {"predecessor_cbu_code": "CBU-50018901", "successor_cbu_code": "CBU-50019002", "customer_chain": "BigBasket",       "customer_code": "BBK-KA-001", "cic": "CIC-FTR2-KA-BBK", "trigger_stage": "First", "urgency_color": "Amber", "ccr_status": "Action Required", "execution_type": "Auto"},
    # ── Qcom / Blinkit (Listing-Based) ───────────────────────────────────────────
    {"predecessor_cbu_code": "CBU-50018901", "successor_cbu_code": "CBU-50019002", "customer_chain": "Blinkit",         "customer_code": "BLK-MH-001", "cic": "CIC-FTR2-MH-BLK", "trigger_stage": "First", "urgency_color": "Amber", "ccr_status": "Action Required", "execution_type": "Auto"},
    {"predecessor_cbu_code": "CBU-50018901", "successor_cbu_code": "CBU-50019002", "customer_chain": "Blinkit",         "customer_code": "BLK-TN-001", "cic": "CIC-FTR2-TN-BLK", "trigger_stage": "First", "urgency_color": "Amber", "ccr_status": "Upcoming",        "execution_type": "Auto"},
    {"predecessor_cbu_code": "CBU-50018901", "successor_cbu_code": "CBU-50019002", "customer_chain": "Blinkit",         "customer_code": "BLK-KA-001", "cic": "CIC-FTR2-KA-BLK", "trigger_stage": "First", "urgency_color": "Amber", "ccr_status": "Upcoming",        "execution_type": "Auto"},

    # ── CBU-50019003 (Dove Shampoo 650ml) ──
    {"predecessor_cbu_code": "CBU-50018902", "successor_cbu_code": "CBU-50019003", "customer_chain": "DMart",          "customer_code": "DMT-MH-001", "cic": "CIC-FTR3-MH-DMT", "trigger_stage": "First",  "urgency_color": "Amber", "ccr_status": "Action Required", "execution_type": "Manual"},
    {"predecessor_cbu_code": "CBU-50018902", "successor_cbu_code": "CBU-50019003", "customer_chain": "DMart",          "customer_code": "DMT-DL-001", "cic": "CIC-FTR3-DL-DMT", "trigger_stage": "First",  "urgency_color": "Amber", "ccr_status": "Upcoming",        "execution_type": "Manual"},
    {"predecessor_cbu_code": "CBU-50018902", "successor_cbu_code": "CBU-50019003", "customer_chain": "Reliance Smart", "customer_code": "RLI-MH-001", "cic": "CIC-FTR3-MH-RLI", "trigger_stage": "First",  "urgency_color": "Amber", "ccr_status": "Action Required", "execution_type": "Semi-Auto"},
    {"predecessor_cbu_code": "CBU-50018902", "successor_cbu_code": "CBU-50019003", "customer_chain": "Blinkit",        "customer_code": "BLK-MH-001", "cic": "CIC-FTR3-MH-BLK", "trigger_stage": "First",  "urgency_color": "Amber", "ccr_status": "Upcoming",        "execution_type": "Auto"},
    {"predecessor_cbu_code": "CBU-50018902", "successor_cbu_code": "CBU-50019003", "customer_chain": "BigBasket",      "customer_code": "BBK-MH-001", "cic": None,               "trigger_stage": "None",   "urgency_color": "None",  "ccr_status": "Upcoming",        "execution_type": "None"},

    # ── CBU-50019004 (Surf Excel Liquid 1L) ──
    {"predecessor_cbu_code": "CBU-50018903", "successor_cbu_code": "CBU-50019004", "customer_chain": "DMart",          "customer_code": "DMT-DL-001", "cic": "CIC-FTR4-DL-DMT", "trigger_stage": "First",  "urgency_color": "Amber", "ccr_status": "Action Required", "execution_type": "Manual"},
    {"predecessor_cbu_code": "CBU-50018903", "successor_cbu_code": "CBU-50019004", "customer_chain": "DMart",          "customer_code": "DMT-MH-001", "cic": "CIC-FTR4-MH-DMT", "trigger_stage": "First",  "urgency_color": "Amber", "ccr_status": "Upcoming",        "execution_type": "Manual"},
    {"predecessor_cbu_code": "CBU-50018903", "successor_cbu_code": "CBU-50019004", "customer_chain": "Reliance Smart", "customer_code": "RLI-DL-001", "cic": "CIC-FTR4-DL-RLI", "trigger_stage": "First",  "urgency_color": "Amber", "ccr_status": "Action Required", "execution_type": "Semi-Auto"},
    {"predecessor_cbu_code": "CBU-50018903", "successor_cbu_code": "CBU-50019004", "customer_chain": "BigBasket",      "customer_code": "BBK-DL-001", "cic": None,               "trigger_stage": "None",   "urgency_color": "None",  "ccr_status": "Upcoming",        "execution_type": "None"},

    # ── CBU-50019005 (Knorr Soupy Noodles 68g) ──
    {"predecessor_cbu_code": "CBU-50018904", "successor_cbu_code": "CBU-50019005", "customer_chain": "DMart",          "customer_code": "DMT-DL-001", "cic": "CIC-FTR5-DL-DMT", "trigger_stage": "First",  "urgency_color": "Amber", "ccr_status": "Upcoming",        "execution_type": "Manual"},
    {"predecessor_cbu_code": "CBU-50018904", "successor_cbu_code": "CBU-50019005", "customer_chain": "Reliance Smart", "customer_code": "RLI-DL-001", "cic": "CIC-FTR5-DL-RLI", "trigger_stage": "First",  "urgency_color": "Amber", "ccr_status": "Action Required", "execution_type": "Manual"},
    {"predecessor_cbu_code": "CBU-50018904", "successor_cbu_code": "CBU-50019005", "customer_chain": "Blinkit",        "customer_code": "BLK-DL-001", "cic": None,               "trigger_stage": "None",   "urgency_color": "None",  "ccr_status": "Upcoming",        "execution_type": "None"},

    # ── CBU-50019006 (Lux Soap 150g) ──
    {"predecessor_cbu_code": "CBU-50018905", "successor_cbu_code": "CBU-50019006", "customer_chain": "DMart",          "customer_code": "DMT-TN-001", "cic": "CIC-FTR6-TN-DMT", "trigger_stage": "First",  "urgency_color": "Amber", "ccr_status": "Action Required", "execution_type": "Manual"},
    {"predecessor_cbu_code": "CBU-50018905", "successor_cbu_code": "CBU-50019006", "customer_chain": "DMart",          "customer_code": "DMT-KA-001", "cic": "CIC-FTR6-KA-DMT", "trigger_stage": "First",  "urgency_color": "Amber", "ccr_status": "Completed",       "execution_type": "Auto"},
    {"predecessor_cbu_code": "CBU-50018905", "successor_cbu_code": "CBU-50019006", "customer_chain": "BigBasket",      "customer_code": "BBK-TN-001", "cic": "CIC-FTR6-TN-BBK", "trigger_stage": "First",  "urgency_color": "Amber", "ccr_status": "Upcoming",        "execution_type": "Semi-Auto"},
    {"predecessor_cbu_code": "CBU-50018905", "successor_cbu_code": "CBU-50019006", "customer_chain": "Reliance Smart", "customer_code": "RLI-TN-001", "cic": None,               "trigger_stage": "None",   "urgency_color": "None",  "ccr_status": "Upcoming",        "execution_type": "None"},

    # ── CBU-50019007 (Domex Floor Cleaner 500ml) ──
    {"predecessor_cbu_code": "CBU-50018906", "successor_cbu_code": "CBU-50019007", "customer_chain": "DMart",          "customer_code": "DMT-MH-001", "cic": "CIC-FTR7-MH-DMT", "trigger_stage": "First",  "urgency_color": "Amber", "ccr_status": "Action Required", "execution_type": "Manual"},
    {"predecessor_cbu_code": "CBU-50018906", "successor_cbu_code": "CBU-50019007", "customer_chain": "DMart",          "customer_code": "DMT-GJ-001", "cic": "CIC-FTR7-GJ-DMT", "trigger_stage": "First",  "urgency_color": "Amber", "ccr_status": "Upcoming",        "execution_type": "Manual"},
    {"predecessor_cbu_code": "CBU-50018906", "successor_cbu_code": "CBU-50019007", "customer_chain": "Reliance Smart", "customer_code": "RLI-MH-001", "cic": "CIC-FTR7-MH-RLI", "trigger_stage": "First",  "urgency_color": "Amber", "ccr_status": "Action Required", "execution_type": "Semi-Auto"},
    {"predecessor_cbu_code": "CBU-50018906", "successor_cbu_code": "CBU-50019007", "customer_chain": "Swiggy Instamart","customer_code": "SWG-MH-001", "cic": None,               "trigger_stage": "None",   "urgency_color": "None",  "ccr_status": "Upcoming",        "execution_type": "None"},
]
