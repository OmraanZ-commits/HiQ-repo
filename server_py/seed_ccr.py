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
