# Seed data for the CCR (Customer Change Request) module.
# CSE IDs reference users by email (resolved at runtime via UsersStorage lookup).
# Customer chains cover the 5 major MT chains in India.

CCR_CUSTOMER_SEEDS = [
    {
        # BRD §1: Regional, SBM/Listing Based = No → Non-Listing
        "customer_chain": "Blinkit",
        "coverage_type": "Regional",
        "behaviour_type": "Non-Listing",
        "cse_id": "priya.patel@unilever.com",
    },
    {
        # BRD §1: National, SBM/Listing Based = No → Non-Listing
        "customer_chain": "Swiggy Instamart",
        "coverage_type": "National",
        "behaviour_type": "Non-Listing",
        "cse_id": "ankit.verma@unilever.com",
    },
    {
        # Physical MT Retail; listing_based=False on all codes → Non-Listing
        "customer_chain": "DMart",
        "coverage_type": "National",
        "behaviour_type": "Non-Listing",
        "cse_id": "priya.patel@unilever.com",
    },
    {
        # Physical MT Retail; listing_based=False on all codes → Non-Listing
        "customer_chain": "Reliance Smart",
        "coverage_type": "National",
        "behaviour_type": "Non-Listing",
        "cse_id": "vikram.singh@unilever.com",
    },
    {
        # BRD §1: National, SBM/Listing Based = No → Non-Listing
        "customer_chain": "BigBasket",
        "coverage_type": "National",
        "behaviour_type": "Non-Listing",
        "cse_id": "ankit.verma@unilever.com",
    },
    {
        # SBM / Listing Based = Yes → ATP Criteria tab unlocked for this chain
        "customer_chain": "Metro Cash & Carry",
        "coverage_type": "Regional",
        "behaviour_type": "Listing Based",
        "cse_id": "ankit.verma@unilever.com",
    },
]

# Customer code + depot mappings.
# channel reflects the actual trade channel; listing_based=True only for SBM accounts (e.g. Metro, WalMart).
# BRD §1: BigBasket = National/No, Blinkit = Regional/No, Swiggy = National/No → all listing_based=False.
CCR_CODE_MAPPING_SEEDS = [
    # Blinkit — Qcom (quick-commerce), Regional, SBM=No → listing_based=False
    {"customer_chain": "Blinkit", "customer_code": "BLK-DL-001", "depot": "DLGH", "sub_channel": "Blinkit", "channel": "Qcom", "listing_based": False},
    {"customer_chain": "Blinkit", "customer_code": "BLK-JP-001", "depot": "JPRH", "sub_channel": "Blinkit", "channel": "Qcom", "listing_based": False},
    {"customer_chain": "Blinkit", "customer_code": "BLK-MH-001", "depot": "MMDH", "sub_channel": "Blinkit", "channel": "Qcom", "listing_based": False},
    {"customer_chain": "Blinkit", "customer_code": "BLK-MH-002", "depot": "SHAH", "sub_channel": "Blinkit", "channel": "Qcom", "listing_based": False},
    {"customer_chain": "Blinkit", "customer_code": "BLK-KA-001", "depot": "BNDH", "sub_channel": "Blinkit", "channel": "Qcom", "listing_based": False},
    {"customer_chain": "Blinkit", "customer_code": "BLK-TN-001", "depot": "CHKH", "sub_channel": "Blinkit", "channel": "Qcom", "listing_based": False},
    # Swiggy Instamart — Qcom, National, SBM=No → listing_based=False
    {"customer_chain": "Swiggy Instamart", "customer_code": "SWG-DL-001", "depot": "DLGH", "sub_channel": "Swiggy", "channel": "Qcom", "listing_based": False},
    {"customer_chain": "Swiggy Instamart", "customer_code": "SWG-MH-001", "depot": "MMDH", "sub_channel": "Swiggy", "channel": "Qcom", "listing_based": False},
    {"customer_chain": "Swiggy Instamart", "customer_code": "SWG-KA-001", "depot": "BNDH", "sub_channel": "Swiggy", "channel": "Qcom", "listing_based": False},
    {"customer_chain": "Swiggy Instamart", "customer_code": "SWG-TN-001", "depot": "CHKH", "sub_channel": "Swiggy", "channel": "Qcom", "listing_based": False},
    {"customer_chain": "Swiggy Instamart", "customer_code": "SWG-WB-001", "depot": "KOPH", "sub_channel": "Swiggy", "channel": "Qcom", "listing_based": False},
    # DMart — MT Retail (physical store), listing_based=False
    {"customer_chain": "DMart", "customer_code": "DMT-DL-001", "depot": "DLGH", "sub_channel": "DMart", "channel": "MT Retail", "listing_based": False},
    {"customer_chain": "DMart", "customer_code": "DMT-MH-001", "depot": "MMDH", "sub_channel": "DMart", "channel": "MT Retail", "listing_based": False},
    {"customer_chain": "DMart", "customer_code": "DMT-GJ-001", "depot": "VJDH", "sub_channel": "DMart", "channel": "MT Retail", "listing_based": False},
    {"customer_chain": "DMart", "customer_code": "DMT-TN-001", "depot": "CHKH", "sub_channel": "DMart", "channel": "MT Retail", "listing_based": False},
    {"customer_chain": "DMart", "customer_code": "DMT-KA-001", "depot": "BNDH", "sub_channel": "DMart", "channel": "MT Retail", "listing_based": False},
    {"customer_chain": "DMart", "customer_code": "DMT-UP-001", "depot": "VABH", "sub_channel": "DMart", "channel": "MT Retail", "listing_based": False},
    {"customer_chain": "DMart", "customer_code": "DMT-RJ-001", "depot": "RJ2H", "sub_channel": "DMart", "channel": "MT Retail", "listing_based": False},
    # Reliance Smart — MT, listing_based=False
    {"customer_chain": "Reliance Smart", "customer_code": "RLI-DL-001", "depot": "DLGH", "sub_channel": "Reliance Smart", "channel": "MT", "listing_based": False},
    {"customer_chain": "Reliance Smart", "customer_code": "RLI-MH-001", "depot": "MMDH", "sub_channel": "Reliance Smart", "channel": "MT", "listing_based": False},
    {"customer_chain": "Reliance Smart", "customer_code": "RLI-GJ-001", "depot": "VJDH", "sub_channel": "Reliance Smart", "channel": "MT", "listing_based": False},
    {"customer_chain": "Reliance Smart", "customer_code": "RLI-TN-001", "depot": "CHKH", "sub_channel": "Reliance Smart", "channel": "MT", "listing_based": False},
    {"customer_chain": "Reliance Smart", "customer_code": "RLI-KA-001", "depot": "BNDH", "sub_channel": "Reliance Smart", "channel": "MT", "listing_based": False},
    # BigBasket — Ecom, National, SBM=No → listing_based=False
    {"customer_chain": "BigBasket", "customer_code": "BBK-DL-001", "depot": "DLGH", "sub_channel": "BigBasket", "channel": "Ecom", "listing_based": False},
    {"customer_chain": "BigBasket", "customer_code": "BBK-MH-001", "depot": "MMDH", "sub_channel": "BigBasket", "channel": "Ecom", "listing_based": False},
    {"customer_chain": "BigBasket", "customer_code": "BBK-KA-001", "depot": "BNDH", "sub_channel": "BigBasket", "channel": "Ecom", "listing_based": False},
    {"customer_chain": "BigBasket", "customer_code": "BBK-TN-001", "depot": "CHKH", "sub_channel": "BigBasket", "channel": "Ecom", "listing_based": False},
    {"customer_chain": "BigBasket", "customer_code": "BBK-WB-001", "depot": "KOPH", "sub_channel": "BigBasket", "channel": "Ecom", "listing_based": False},
    # Metro Cash & Carry — Regional, SBM/Listing Based = Yes → listing_based=True
    # ATP Criteria tab is only shown for Listing-Based chains (SBM accounts).
    {"customer_chain": "Metro Cash & Carry", "customer_code": "MCC-DL-001", "depot": "DLGH", "sub_channel": "Metro C&C", "channel": "MT", "listing_based": True},
    {"customer_chain": "Metro Cash & Carry", "customer_code": "MCC-MH-001", "depot": "MMDH", "sub_channel": "Metro C&C", "channel": "MT", "listing_based": True},
    {"customer_chain": "Metro Cash & Carry", "customer_code": "MCC-KA-001", "depot": "BNDH", "sub_channel": "Metro C&C", "channel": "MT", "listing_based": True},
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
        # BRD §3.5: No for all Ecom/Qcom accounts; Yes only for SBM (Metro/WalMart — not in demo dataset)
        "network_change_type": "Case Config Change",
        "new_cic_required": False,
        "content_update_required": False,
        "rundown_required": True,
        "auto_ccr": False,
        "notes": "Case count or ITF change; no new CIC for Ecom/Qcom accounts; rundown required.",
    },
    {
        # BRD §3.9: Yes for BigBasket and SBM accounts; majority-Yes rule applied
        "network_change_type": "Pricing Change >10%",
        "new_cic_required": True,
        "content_update_required": True,
        "rundown_required": False,
        "auto_ccr": False,
        "notes": "Significant price change; new CIC required for most accounts; content update needed.",
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
        "notes": "Artwork and packaging relaunch — reuse existing CIC; content update and predecessor rundown required.",
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

# CCR line items — seven demo CBUs spread across all four trigger stages to show
# the full BRD §11.1 progression in the workspace.
#
# BRD rule: Action Required is only raised at Third stage (Stock Movement Initiated)
# and above, because only at that point does the CBU flow into Paid Bible and the
# basepack become active. Items at First / Second stage remain "Upcoming".
#
# Stage assignment per CBU:
#   CBU-50019001 / CBU-50019002 → First  (Production Started)  — Amber,  Upcoming
#   CBU-50019005 / CBU-50019006 → Second (Post FTR Clearance)  — Amber,  Upcoming
#   CBU-50019003 / CBU-50019007 → Third  (Stock Movement Initiated) — Red, Action Required
#   CBU-50019004                → Fourth (Inventory Threshold Breached) — Blinking Red, Action Required
CCR_LINE_ITEM_SEEDS = [
    # ── CBU-50019001 (Lifebuoy Soap 100g) — First / Production Started ──
    {"predecessor_cbu_code": "CBU-50018900", "successor_cbu_code": "CBU-50019001", "customer_chain": "DMart",          "customer_code": "DMT-DL-001", "cic": "CIC-FTR1-DL-DMT", "trigger_stage": "First",  "urgency_color": "Amber", "ccr_status": "Upcoming",  "execution_type": "Manual"},
    {"predecessor_cbu_code": "CBU-50018900", "successor_cbu_code": "CBU-50019001", "customer_chain": "DMart",          "customer_code": "DMT-UP-001", "cic": "CIC-FTR1-UP-DMT", "trigger_stage": "First",  "urgency_color": "Amber", "ccr_status": "Upcoming",  "execution_type": "Manual"},
    {"predecessor_cbu_code": "CBU-50018900", "successor_cbu_code": "CBU-50019001", "customer_chain": "Reliance Smart", "customer_code": "RLI-DL-001", "cic": "CIC-FTR1-DL-RLI", "trigger_stage": "First",  "urgency_color": "Amber", "ccr_status": "Upcoming",  "execution_type": "Semi-Auto"},
    {"predecessor_cbu_code": "CBU-50018900", "successor_cbu_code": "CBU-50019001", "customer_chain": "Blinkit",        "customer_code": "BLK-DL-001", "cic": None,               "trigger_stage": "None",   "urgency_color": "None",  "ccr_status": "Upcoming",  "execution_type": "None"},

    # ── CBU-50019002 (Sunsilk Shampoo 340ml) — Second / Post FTR Clearance ──
    # Full set matching 12 predecessor CIC rows (CBU-50018901 / BP-1901):
    #   MT Retail — DMart at MMDH / CHKH / BNDH   (Non-Listing)
    #   MT        — Reliance Smart at MMDH / CHKH / BNDH
    #   Ecom      — BigBasket at MMDH / CHKH / BNDH (Listing-Based)
    #   Qcom      — Blinkit  at MMDH / CHKH / BNDH  (Listing-Based)
    # All non-Completed rows stay "Upcoming" — FTR clearance is preparatory, not yet actionable.
    # ── MT Retail / DMart ────────────────────────────────────────────────────────
    {"predecessor_cbu_code": "CBU-50018901", "successor_cbu_code": "CBU-50019002", "customer_chain": "DMart",           "customer_code": "DMT-MH-001", "cic": "CIC-FTR2-MH-DMT", "trigger_stage": "Second", "urgency_color": "Amber", "ccr_status": "Upcoming",   "execution_type": "Manual"},
    {"predecessor_cbu_code": "CBU-50018901", "successor_cbu_code": "CBU-50019002", "customer_chain": "DMart",           "customer_code": "DMT-TN-001", "cic": "CIC-FTR2-TN-DMT", "trigger_stage": "Second", "urgency_color": "Amber", "ccr_status": "Completed",  "execution_type": "Auto"},
    {"predecessor_cbu_code": "CBU-50018901", "successor_cbu_code": "CBU-50019002", "customer_chain": "DMart",           "customer_code": "DMT-KA-001", "cic": "CIC-FTR2-KA-DMT", "trigger_stage": "Second", "urgency_color": "Amber", "ccr_status": "Upcoming",   "execution_type": "Manual"},
    # ── MT / Reliance Smart ──────────────────────────────────────────────────────
    {"predecessor_cbu_code": "CBU-50018901", "successor_cbu_code": "CBU-50019002", "customer_chain": "Reliance Smart",  "customer_code": "RLI-MH-001", "cic": "CIC-FTR2-MH-RLI", "trigger_stage": "Second", "urgency_color": "Amber", "ccr_status": "Upcoming",   "execution_type": "Manual"},
    {"predecessor_cbu_code": "CBU-50018901", "successor_cbu_code": "CBU-50019002", "customer_chain": "Reliance Smart",  "customer_code": "RLI-TN-001", "cic": "CIC-FTR2-TN-RLI", "trigger_stage": "Second", "urgency_color": "Amber", "ccr_status": "Upcoming",   "execution_type": "Manual"},
    {"predecessor_cbu_code": "CBU-50018901", "successor_cbu_code": "CBU-50019002", "customer_chain": "Reliance Smart",  "customer_code": "RLI-KA-001", "cic": "CIC-FTR2-KA-RLI", "trigger_stage": "Second", "urgency_color": "Amber", "ccr_status": "Upcoming",   "execution_type": "Semi-Auto"},
    # ── Ecom / BigBasket ─────────────────────────────────────────────────────────
    {"predecessor_cbu_code": "CBU-50018901", "successor_cbu_code": "CBU-50019002", "customer_chain": "BigBasket",       "customer_code": "BBK-MH-001", "cic": "CIC-FTR2-MH-BBK", "trigger_stage": "Second", "urgency_color": "Amber", "ccr_status": "Upcoming",   "execution_type": "Auto"},
    {"predecessor_cbu_code": "CBU-50018901", "successor_cbu_code": "CBU-50019002", "customer_chain": "BigBasket",       "customer_code": "BBK-TN-001", "cic": "CIC-FTR2-TN-BBK", "trigger_stage": "Second", "urgency_color": "Amber", "ccr_status": "Completed",  "execution_type": "Auto"},
    {"predecessor_cbu_code": "CBU-50018901", "successor_cbu_code": "CBU-50019002", "customer_chain": "BigBasket",       "customer_code": "BBK-KA-001", "cic": "CIC-FTR2-KA-BBK", "trigger_stage": "Second", "urgency_color": "Amber", "ccr_status": "Upcoming",   "execution_type": "Auto"},
    # ── Qcom / Blinkit ───────────────────────────────────────────────────────────
    {"predecessor_cbu_code": "CBU-50018901", "successor_cbu_code": "CBU-50019002", "customer_chain": "Blinkit",         "customer_code": "BLK-MH-001", "cic": "CIC-FTR2-MH-BLK", "trigger_stage": "Second", "urgency_color": "Amber", "ccr_status": "Upcoming",   "execution_type": "Auto"},
    {"predecessor_cbu_code": "CBU-50018901", "successor_cbu_code": "CBU-50019002", "customer_chain": "Blinkit",         "customer_code": "BLK-TN-001", "cic": "CIC-FTR2-TN-BLK", "trigger_stage": "Second", "urgency_color": "Amber", "ccr_status": "Upcoming",   "execution_type": "Auto"},
    {"predecessor_cbu_code": "CBU-50018901", "successor_cbu_code": "CBU-50019002", "customer_chain": "Blinkit",         "customer_code": "BLK-KA-001", "cic": "CIC-FTR2-KA-BLK", "trigger_stage": "Second", "urgency_color": "Amber", "ccr_status": "Upcoming",   "execution_type": "Auto"},

    # ── CBU-50019003 (Dove Shampoo 650ml) — Third / Stock Movement Initiated ──
    # Stock is physically moving → Paid Bible now active → Action Required enabled.
    {"predecessor_cbu_code": "CBU-50018902", "successor_cbu_code": "CBU-50019003", "customer_chain": "DMart",          "customer_code": "DMT-MH-001", "cic": "CIC-FTR3-MH-DMT", "trigger_stage": "Third",  "urgency_color": "Red", "ccr_status": "Action Required", "execution_type": "Manual"},
    {"predecessor_cbu_code": "CBU-50018902", "successor_cbu_code": "CBU-50019003", "customer_chain": "DMart",          "customer_code": "DMT-DL-001", "cic": "CIC-FTR3-DL-DMT", "trigger_stage": "Third",  "urgency_color": "Red", "ccr_status": "Action Required", "execution_type": "Manual"},
    {"predecessor_cbu_code": "CBU-50018902", "successor_cbu_code": "CBU-50019003", "customer_chain": "Reliance Smart", "customer_code": "RLI-MH-001", "cic": "CIC-FTR3-MH-RLI", "trigger_stage": "Third",  "urgency_color": "Red", "ccr_status": "Action Required", "execution_type": "Semi-Auto"},
    {"predecessor_cbu_code": "CBU-50018902", "successor_cbu_code": "CBU-50019003", "customer_chain": "Blinkit",        "customer_code": "BLK-MH-001", "cic": "CIC-FTR3-MH-BLK", "trigger_stage": "Third",  "urgency_color": "Red", "ccr_status": "Action Required", "execution_type": "Auto"},
    {"predecessor_cbu_code": "CBU-50018902", "successor_cbu_code": "CBU-50019003", "customer_chain": "BigBasket",      "customer_code": "BBK-MH-001", "cic": "CIC-FTR3-MH-BBK", "trigger_stage": "Third",  "urgency_color": "Red", "ccr_status": "Action Required", "execution_type": "Auto"},
    # Regional chain (Blinkit / BLK-KA-001) — existing CIC reused, CCR Completed → appears in Submitted tab
    # Regional chains skip DOH threshold; Stock Movement Initiated is sufficient for MT Listing release.
    {"predecessor_cbu_code": "CBU-50018902", "successor_cbu_code": "CBU-50019003", "customer_chain": "Blinkit",        "customer_code": "BLK-KA-001", "cic": "CIC-FTR3-KA-BLK", "trigger_stage": "Third",  "urgency_color": "Red", "ccr_status": "Completed",       "execution_type": "Auto", "new_cic_required": False, "content_update_required": True, "rundown_required": True},

    # ── CBU-50019004 (Surf Excel Liquid 1L) — Fourth / Inventory Threshold Breached ──
    # Predecessor DOH < 3 days, successor DOH > 5 → imminent risk, final CCR approval.
    {"predecessor_cbu_code": "CBU-50018903", "successor_cbu_code": "CBU-50019004", "customer_chain": "DMart",          "customer_code": "DMT-DL-001", "cic": "CIC-FTR4-DL-DMT", "trigger_stage": "Fourth", "urgency_color": "Blinking Red", "ccr_status": "Action Required", "execution_type": "Manual"},
    {"predecessor_cbu_code": "CBU-50018903", "successor_cbu_code": "CBU-50019004", "customer_chain": "DMart",          "customer_code": "DMT-MH-001", "cic": "CIC-FTR4-MH-DMT", "trigger_stage": "Fourth", "urgency_color": "Blinking Red", "ccr_status": "Action Required", "execution_type": "Manual"},
    {"predecessor_cbu_code": "CBU-50018903", "successor_cbu_code": "CBU-50019004", "customer_chain": "Reliance Smart", "customer_code": "RLI-DL-001", "cic": "CIC-FTR4-DL-RLI", "trigger_stage": "Fourth", "urgency_color": "Blinking Red", "ccr_status": "Action Required", "execution_type": "Semi-Auto"},
    {"predecessor_cbu_code": "CBU-50018903", "successor_cbu_code": "CBU-50019004", "customer_chain": "BigBasket",      "customer_code": "BBK-DL-001", "cic": "CIC-FTR4-DL-BBK", "trigger_stage": "Fourth", "urgency_color": "Blinking Red", "ccr_status": "Action Required", "execution_type": "Auto"},

    # ── CBU-50019005 (Knorr Soupy Noodles 68g) — Second / Post FTR Clearance ──
    {"predecessor_cbu_code": "CBU-50018904", "successor_cbu_code": "CBU-50019005", "customer_chain": "DMart",          "customer_code": "DMT-DL-001", "cic": "CIC-FTR5-DL-DMT", "trigger_stage": "Second",  "urgency_color": "Amber", "ccr_status": "Upcoming",  "execution_type": "Manual"},
    {"predecessor_cbu_code": "CBU-50018904", "successor_cbu_code": "CBU-50019005", "customer_chain": "Reliance Smart", "customer_code": "RLI-DL-001", "cic": "CIC-FTR5-DL-RLI", "trigger_stage": "Second",  "urgency_color": "Amber", "ccr_status": "Upcoming",  "execution_type": "Manual"},
    {"predecessor_cbu_code": "CBU-50018904", "successor_cbu_code": "CBU-50019005", "customer_chain": "Blinkit",        "customer_code": "BLK-DL-001", "cic": None,               "trigger_stage": "None",    "urgency_color": "None",  "ccr_status": "Upcoming",  "execution_type": "None"},

    # ── CBU-50019006 (Lux Soap 150g) — First / Production Started ──
    {"predecessor_cbu_code": "CBU-50018905", "successor_cbu_code": "CBU-50019006", "customer_chain": "DMart",          "customer_code": "DMT-TN-001", "cic": "CIC-FTR6-TN-DMT", "trigger_stage": "First",  "urgency_color": "Amber", "ccr_status": "Upcoming",   "execution_type": "Manual"},
    {"predecessor_cbu_code": "CBU-50018905", "successor_cbu_code": "CBU-50019006", "customer_chain": "DMart",          "customer_code": "DMT-KA-001", "cic": "CIC-FTR6-KA-DMT", "trigger_stage": "First",  "urgency_color": "Amber", "ccr_status": "Completed",  "execution_type": "Auto"},
    {"predecessor_cbu_code": "CBU-50018905", "successor_cbu_code": "CBU-50019006", "customer_chain": "BigBasket",      "customer_code": "BBK-TN-001", "cic": "CIC-FTR6-TN-BBK", "trigger_stage": "First",  "urgency_color": "Amber", "ccr_status": "Upcoming",   "execution_type": "Semi-Auto"},
    {"predecessor_cbu_code": "CBU-50018905", "successor_cbu_code": "CBU-50019006", "customer_chain": "Reliance Smart", "customer_code": "RLI-TN-001", "cic": None,               "trigger_stage": "None",   "urgency_color": "None",  "ccr_status": "Upcoming",   "execution_type": "None"},

    # ── CBU-50019007 (Domex Floor Cleaner 500ml) ──
    {"predecessor_cbu_code": "CBU-50018906", "successor_cbu_code": "CBU-50019007", "customer_chain": "DMart",          "customer_code": "DMT-MH-001", "cic": "CIC-FTR7-MH-DMT", "trigger_stage": "First",  "urgency_color": "Amber", "ccr_status": "Action Required", "execution_type": "Manual"},
    {"predecessor_cbu_code": "CBU-50018906", "successor_cbu_code": "CBU-50019007", "customer_chain": "DMart",          "customer_code": "DMT-GJ-001", "cic": "CIC-FTR7-GJ-DMT", "trigger_stage": "First",  "urgency_color": "Amber", "ccr_status": "Upcoming",        "execution_type": "Manual"},
    {"predecessor_cbu_code": "CBU-50018906", "successor_cbu_code": "CBU-50019007", "customer_chain": "Reliance Smart", "customer_code": "RLI-MH-001", "cic": "CIC-FTR7-MH-RLI", "trigger_stage": "First",  "urgency_color": "Amber", "ccr_status": "Action Required", "execution_type": "Semi-Auto"},

    # ── CBU-50017001 (Pepsodent RL_PKG) — Fourth / 2 days left ──────────────
    # Inventory threshold breached; successor stock available; 2-day SLA window.
    {"predecessor_cbu_code": "CBU-50018907", "successor_cbu_code": "CBU-50017001", "customer_chain": "BigBasket",       "customer_code": "BBK-DL-001", "cic": "CIC-P1-BBK-DL-F4", "trigger_stage": "Fourth", "urgency_color": "Blinking Red", "ccr_status": "Action Required", "execution_type": "Manual",    "escalation_due_days": 2},
    {"predecessor_cbu_code": "CBU-50018907", "successor_cbu_code": "CBU-50017001", "customer_chain": "BigBasket",       "customer_code": "BBK-MH-001", "cic": "CIC-P1-BBK-MH-F4", "trigger_stage": "Fourth", "urgency_color": "Blinking Red", "ccr_status": "Action Required", "execution_type": "Manual",    "escalation_due_days": 2},
    {"predecessor_cbu_code": "CBU-50018907", "successor_cbu_code": "CBU-50017001", "customer_chain": "Swiggy Instamart","customer_code": "SWG-DL-001", "cic": "CIC-P1-SWG-DL-F4", "trigger_stage": "Fourth", "urgency_color": "Blinking Red", "ccr_status": "Action Required", "execution_type": "Semi-Auto", "escalation_due_days": 2},

    # ── CBU-50017002 (Pepsodent RL_ART) — Fourth / 1 day left ───────────────
    {"predecessor_cbu_code": "CBU-50018908", "successor_cbu_code": "CBU-50017002", "customer_chain": "BigBasket",       "customer_code": "BBK-KA-001", "cic": "CIC-P2-BBK-KA-F4", "trigger_stage": "Fourth", "urgency_color": "Blinking Red", "ccr_status": "Action Required", "execution_type": "Semi-Auto", "escalation_due_days": 1},
    {"predecessor_cbu_code": "CBU-50018908", "successor_cbu_code": "CBU-50017002", "customer_chain": "Swiggy Instamart","customer_code": "SWG-MH-001", "cic": "CIC-P2-SWG-MH-F4", "trigger_stage": "Fourth", "urgency_color": "Blinking Red", "ccr_status": "Action Required", "execution_type": "Auto",      "escalation_due_days": 1},

    # ── CBU-50007892 (Brooke Bond RL_ART_PKG) — Fourth / Overdue, escalated ─
    # SLA breached 3 days ago; escalation already triggered.
    {"predecessor_cbu_code": "CBU-50018909", "successor_cbu_code": "CBU-50007892", "customer_chain": "BigBasket",       "customer_code": "BBK-TN-001", "cic": "CIC-BB-BBK-TN-F4", "trigger_stage": "Fourth", "urgency_color": "Blinking Red", "ccr_status": "Action Required", "execution_type": "Auto",      "escalation_due_days": -3, "escalated": True},
    {"predecessor_cbu_code": "CBU-50018909", "successor_cbu_code": "CBU-50007892", "customer_chain": "BigBasket",       "customer_code": "BBK-WB-001", "cic": "CIC-BB-BBK-WB-F4", "trigger_stage": "Fourth", "urgency_color": "Blinking Red", "ccr_status": "Action Required", "execution_type": "Auto",      "escalation_due_days": -3, "escalated": True},
    {"predecessor_cbu_code": "CBU-50018909", "successor_cbu_code": "CBU-50007892", "customer_chain": "Swiggy Instamart","customer_code": "SWG-KA-001", "cic": "CIC-BB-SWG-KA-F4", "trigger_stage": "Fourth", "urgency_color": "Blinking Red", "ccr_status": "Action Required", "execution_type": "Auto",      "escalation_due_days": -3, "escalated": True},

    # ── CBU-50015678 (Comfort RL_PKG) — Second / Actions to Start ────────────
    # Post FTR clearance; CCR action now required to update chain listings.
    {"predecessor_cbu_code": "CBU-50018910", "successor_cbu_code": "CBU-50015678", "customer_chain": "BigBasket",       "customer_code": "BBK-DL-001", "cic": "CIC-CF-BBK-DL-F2", "trigger_stage": "Second", "urgency_color": "Amber", "ccr_status": "Action Required", "execution_type": "Manual"},
    {"predecessor_cbu_code": "CBU-50018910", "successor_cbu_code": "CBU-50015678", "customer_chain": "BigBasket",       "customer_code": "BBK-MH-001", "cic": "CIC-CF-BBK-MH-F2", "trigger_stage": "Second", "urgency_color": "Amber", "ccr_status": "Action Required", "execution_type": "Manual"},
    {"predecessor_cbu_code": "CBU-50018910", "successor_cbu_code": "CBU-50015678", "customer_chain": "Swiggy Instamart","customer_code": "SWG-DL-001", "cic": "CIC-CF-SWG-DL-F2", "trigger_stage": "Second", "urgency_color": "Amber", "ccr_status": "Action Required", "execution_type": "Semi-Auto"},
    {"predecessor_cbu_code": "CBU-50018910", "successor_cbu_code": "CBU-50015678", "customer_chain": "Swiggy Instamart","customer_code": "SWG-MH-001", "cic": "CIC-CF-SWG-MH-F2", "trigger_stage": "Second", "urgency_color": "Amber", "ccr_status": "Action Required", "execution_type": "Semi-Auto"},

    # ── CBU-50012345 (Vaseline RL_FORM) — First / Upcoming ───────────────────
    {"predecessor_cbu_code": "CBU-50018911", "successor_cbu_code": "CBU-50012345", "customer_chain": "BigBasket",       "customer_code": "BBK-KA-001", "cic": "CIC-VS-BBK-KA-F1", "trigger_stage": "First",  "urgency_color": "Amber", "ccr_status": "Upcoming", "execution_type": "Semi-Auto"},
    {"predecessor_cbu_code": "CBU-50018911", "successor_cbu_code": "CBU-50012345", "customer_chain": "BigBasket",       "customer_code": "BBK-TN-001", "cic": "CIC-VS-BBK-TN-F1", "trigger_stage": "First",  "urgency_color": "Amber", "ccr_status": "Upcoming", "execution_type": "Semi-Auto"},
    {"predecessor_cbu_code": "CBU-50018911", "successor_cbu_code": "CBU-50012345", "customer_chain": "Swiggy Instamart","customer_code": "SWG-KA-001", "cic": "CIC-VS-SWG-KA-F1", "trigger_stage": "First",  "urgency_color": "Amber", "ccr_status": "Upcoming", "execution_type": "Auto"},

    # ── Metro Cash & Carry (Regional Listing) — relaunch CBUs across all stages ─
    # Metro C&C is a listing-based (SBM) regional chain; CIC assignment is manual.

    # Immediate Actions — Third / Stock Movement Initiated
    # RL_PKG → New CIC required (packaging change changes EAN for listing chains)
    {"predecessor_cbu_code": "CBU-50018921", "successor_cbu_code": "CBU-50019021", "customer_chain": "Metro Cash & Carry", "customer_code": "MCC-MH-001", "cic": "CIC-MCC1-MH-MCC", "trigger_stage": "Third", "urgency_color": "Red", "ccr_status": "Action Required", "execution_type": "Manual", "new_cic_required": True,  "content_update_required": True, "rundown_required": True},
    # RL_ART_PKG → Existing CIC reused (artwork-only relaunch for listing chain)
    {"predecessor_cbu_code": "CBU-50018922", "successor_cbu_code": "CBU-50019022", "customer_chain": "Metro Cash & Carry", "customer_code": "MCC-DL-001", "cic": "CIC-MCC2-DL-MCC", "trigger_stage": "Third", "urgency_color": "Red", "ccr_status": "Action Required", "execution_type": "Manual", "new_cic_required": False, "content_update_required": True, "rundown_required": True},
    # Submitted — existing CIC, regional listing, Stock Movement Initiated → "Ready to release → MT Listing"
    {"predecessor_cbu_code": "CBU-50018922", "successor_cbu_code": "CBU-50019022", "customer_chain": "Metro Cash & Carry", "customer_code": "MCC-KA-001", "cic": "CIC-MCC2-KA-MCC", "trigger_stage": "Third", "urgency_color": "Red", "ccr_status": "Completed", "execution_type": "Manual", "new_cic_required": False, "content_update_required": True, "rundown_required": True},

    # Upcoming — Second / FTR Approved
    {"predecessor_cbu_code": "CBU-50018901", "successor_cbu_code": "CBU-50019002", "customer_chain": "Metro Cash & Carry", "customer_code": "MCC-MH-001", "cic": "CIC-FTR2-MH-MCC", "trigger_stage": "Second", "urgency_color": "Amber", "ccr_status": "Upcoming", "execution_type": "Manual", "new_cic_required": False, "content_update_required": True, "rundown_required": True},
    # Upcoming — First / Production Started
    {"predecessor_cbu_code": "CBU-50018906", "successor_cbu_code": "CBU-50019007", "customer_chain": "Metro Cash & Carry", "customer_code": "MCC-DL-001", "cic": "CIC-FTR7-DL-MCC", "trigger_stage": "First",  "urgency_color": "Amber", "ccr_status": "Upcoming", "execution_type": "Manual", "new_cic_required": False, "content_update_required": True, "rundown_required": True},

]
