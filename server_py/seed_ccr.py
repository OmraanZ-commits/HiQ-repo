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

CCR_CODE_MAPPING_SEEDS = [
    # Blinkit — Qcom, depot coverage across North + South
    {"customer_chain": "Blinkit", "customer_code": "BLK-DL-001", "depot": "DLGH", "sub_channel": "Blinkit", "channel": "Qcom"},
    {"customer_chain": "Blinkit", "customer_code": "BLK-DL-002", "depot": "JPRH", "sub_channel": "Blinkit", "channel": "Qcom"},
    {"customer_chain": "Blinkit", "customer_code": "BLK-MH-001", "depot": "MMDH", "sub_channel": "Blinkit", "channel": "Qcom"},
    {"customer_chain": "Blinkit", "customer_code": "BLK-MH-002", "depot": "SHAH", "sub_channel": "Blinkit", "channel": "Qcom"},
    {"customer_chain": "Blinkit", "customer_code": "BLK-KA-001", "depot": "BNDH", "sub_channel": "Blinkit", "channel": "Qcom"},
    {"customer_chain": "Blinkit", "customer_code": "BLK-TN-001", "depot": "CHKH", "sub_channel": "Blinkit", "channel": "Qcom"},
    # Swiggy Instamart
    {"customer_chain": "Swiggy Instamart", "customer_code": "SWG-DL-001", "depot": "DLGH", "sub_channel": "Swiggy", "channel": "Qcom"},
    {"customer_chain": "Swiggy Instamart", "customer_code": "SWG-MH-001", "depot": "MMDH", "sub_channel": "Swiggy", "channel": "Qcom"},
    {"customer_chain": "Swiggy Instamart", "customer_code": "SWG-KA-001", "depot": "BNDH", "sub_channel": "Swiggy", "channel": "Qcom"},
    {"customer_chain": "Swiggy Instamart", "customer_code": "SWG-TN-001", "depot": "CHKH", "sub_channel": "Swiggy", "channel": "Qcom"},
    {"customer_chain": "Swiggy Instamart", "customer_code": "SWG-WB-001", "depot": "KOPH", "sub_channel": "Swiggy", "channel": "Qcom"},
    # DMart — MT Retail
    {"customer_chain": "DMart", "customer_code": "DMT-DL-001", "depot": "DLGH", "sub_channel": "DMart", "channel": "MT Retail"},
    {"customer_chain": "DMart", "customer_code": "DMT-MH-001", "depot": "MMDH", "sub_channel": "DMart", "channel": "MT Retail"},
    {"customer_chain": "DMart", "customer_code": "DMT-GJ-001", "depot": "VJDH", "sub_channel": "DMart", "channel": "MT Retail"},
    {"customer_chain": "DMart", "customer_code": "DMT-TN-001", "depot": "CHKH", "sub_channel": "DMart", "channel": "MT Retail"},
    {"customer_chain": "DMart", "customer_code": "DMT-KA-001", "depot": "BNDH", "sub_channel": "DMart", "channel": "MT Retail"},
    {"customer_chain": "DMart", "customer_code": "DMT-UP-001", "depot": "VABH", "sub_channel": "DMart", "channel": "MT Retail"},
    {"customer_chain": "DMart", "customer_code": "DMT-RJ-001", "depot": "RJ2H", "sub_channel": "DMart", "channel": "MT Retail"},
    # Reliance Smart — MT
    {"customer_chain": "Reliance Smart", "customer_code": "RLI-DL-001", "depot": "DLGH", "sub_channel": "Reliance Smart", "channel": "MT"},
    {"customer_chain": "Reliance Smart", "customer_code": "RLI-MH-001", "depot": "MMDH", "sub_channel": "Reliance Smart", "channel": "MT"},
    {"customer_chain": "Reliance Smart", "customer_code": "RLI-GJ-001", "depot": "VJDH", "sub_channel": "Reliance Smart", "channel": "MT"},
    {"customer_chain": "Reliance Smart", "customer_code": "RLI-TN-001", "depot": "CHKH", "sub_channel": "Reliance Smart", "channel": "MT"},
    {"customer_chain": "Reliance Smart", "customer_code": "RLI-KA-001", "depot": "BNDH", "sub_channel": "Reliance Smart", "channel": "MT"},
    # BigBasket — Ecom
    {"customer_chain": "BigBasket", "customer_code": "BBK-DL-001", "depot": "DLGH", "sub_channel": "BigBasket", "channel": "Ecom"},
    {"customer_chain": "BigBasket", "customer_code": "BBK-MH-001", "depot": "MMDH", "sub_channel": "BigBasket", "channel": "Ecom"},
    {"customer_chain": "BigBasket", "customer_code": "BBK-KA-001", "depot": "BNDH", "sub_channel": "BigBasket", "channel": "Ecom"},
    {"customer_chain": "BigBasket", "customer_code": "BBK-TN-001", "depot": "CHKH", "sub_channel": "BigBasket", "channel": "Ecom"},
    {"customer_chain": "BigBasket", "customer_code": "BBK-WB-001", "depot": "KOPH", "sub_channel": "BigBasket", "channel": "Ecom"},
]

# CIC mappings for relaunch CBUs (CBU-50019001..7 are relaunch/successor CBUs from seed_data)
# These cover predecessor → successor pairs already in the system
CCR_CIC_MAPPING_SEEDS = [
    # CBU-50003456 (Lipton Green Tea RL_PKG) — Production Started
    {"cbu_code": "CBU-50003456", "basepack": "BP-300", "customer_chain": "DMart",          "customer_code": "DMT-TN-001", "cic": "CIC-BP300-TN-DMT", "sales_org": "1000", "channel": "MT Retail", "depot": "CHKH", "status": "Mapped",      "sourcing_depot": "CHKH", "sourcing_type": "Decentralized", "pricing_status": "Available"},
    {"cbu_code": "CBU-50003456", "basepack": "BP-300", "customer_chain": "DMart",          "customer_code": "DMT-KA-001", "cic": "CIC-BP300-KA-DMT", "sales_org": "1000", "channel": "MT Retail", "depot": "BNDH", "status": "Mapped",      "sourcing_depot": "BNDH", "sourcing_type": "Decentralized", "pricing_status": "Available"},
    {"cbu_code": "CBU-50003456", "basepack": "BP-300", "customer_chain": "BigBasket",      "customer_code": "BBK-TN-001", "cic": "CIC-BP300-TN-BBK", "sales_org": "1000", "channel": "Ecom",     "depot": "CHKH", "status": "Mapped",      "sourcing_depot": "CHKH", "sourcing_type": "Decentralized", "pricing_status": "Available"},
    {"cbu_code": "CBU-50003456", "basepack": "BP-300", "customer_chain": "Swiggy Instamart","customer_code": "SWG-TN-001", "cic": None,               "sales_org": "1000", "channel": "Qcom",     "depot": "CHKH", "status": "Non-Mapped",  "sourcing_depot": None,   "sourcing_type": "Decentralized", "pricing_status": "Not Available"},

    # CBU-50005678 (Knorr Soupy Noodles) — FTR Approved
    {"cbu_code": "CBU-50005678", "basepack": "BP-500", "customer_chain": "DMart",          "customer_code": "DMT-DL-001", "cic": "CIC-BP500-DL-DMT", "sales_org": "1000", "channel": "MT Retail", "depot": "DLGH", "status": "Mapped",      "sourcing_depot": "DLGH", "sourcing_type": "Decentralized", "pricing_status": "Available"},
    {"cbu_code": "CBU-50005678", "basepack": "BP-500", "customer_chain": "DMart",          "customer_code": "DMT-MH-001", "cic": "CIC-BP500-MH-DMT", "sales_org": "1000", "channel": "MT Retail", "depot": "MMDH", "status": "Mapped",      "sourcing_depot": "MMDH", "sourcing_type": "Decentralized", "pricing_status": "Available"},
    {"cbu_code": "CBU-50005678", "basepack": "BP-500", "customer_chain": "Reliance Smart", "customer_code": "RLI-DL-001", "cic": "CIC-BP500-DL-RLI", "sales_org": "1000", "channel": "MT",        "depot": "DLGH", "status": "Mapped",      "sourcing_depot": "DLGH", "sourcing_type": "Decentralized", "pricing_status": "Available"},
    {"cbu_code": "CBU-50005678", "basepack": "BP-500", "customer_chain": "Blinkit",        "customer_code": "BLK-DL-001", "cic": "CIC-BP500-DL-BLK", "sales_org": "1000", "channel": "Qcom",     "depot": "DLGH", "status": "Mapped",      "sourcing_depot": "DLGH", "sourcing_type": "Decentralized", "pricing_status": "Available"},
    {"cbu_code": "CBU-50005678", "basepack": "BP-500", "customer_chain": "BigBasket",      "customer_code": "BBK-DL-001", "cic": "CIC-BP500-DL-BBK", "sales_org": "1000", "channel": "Ecom",     "depot": "DLGH", "status": "Mapped",      "sourcing_depot": "DLGH", "sourcing_type": "Decentralized", "pricing_status": "Partial"},
    {"cbu_code": "CBU-50005678", "basepack": "BP-500", "customer_chain": "Swiggy Instamart","customer_code": "SWG-DL-001", "cic": None,               "sales_org": "1000", "channel": "Qcom",     "depot": "DLGH", "status": "Non-Mapped",  "sourcing_depot": None,   "sourcing_type": "Decentralized", "pricing_status": "Not Available"},

    # CBU-50006789 (Vim Dishwash Gel) — Pricing Updated
    {"cbu_code": "CBU-50006789", "basepack": "BP-600", "customer_chain": "DMart",          "customer_code": "DMT-TN-001", "cic": "CIC-BP600-TN-DMT", "sales_org": "1000", "channel": "MT Retail", "depot": "CHKH", "status": "Mapped",      "sourcing_depot": "CHKH", "sourcing_type": "Decentralized", "pricing_status": "Available"},
    {"cbu_code": "CBU-50006789", "basepack": "BP-600", "customer_chain": "BigBasket",      "customer_code": "BBK-KA-001", "cic": "CIC-BP600-KA-BBK", "sales_org": "1000", "channel": "Ecom",     "depot": "BNDH", "status": "Mapped",      "sourcing_depot": "BNDH", "sourcing_type": "Decentralized", "pricing_status": "Available"},
    {"cbu_code": "CBU-50006789", "basepack": "BP-600", "customer_chain": "Reliance Smart", "customer_code": "RLI-TN-001", "cic": "CIC-BP600-TN-RLI", "sales_org": "1000", "channel": "MT",        "depot": "CHKH", "status": "Inactive",    "sourcing_depot": "CHKH", "sourcing_type": "Decentralized", "pricing_status": "Not Available"},

    # CBU-50007890 (Brooke Bond Red Label) — Stock Movement Initiated
    {"cbu_code": "CBU-50007890", "basepack": "BP-700", "customer_chain": "DMart",          "customer_code": "DMT-DL-001", "cic": "CIC-BP700-DL-DMT", "sales_org": "1000", "channel": "MT Retail", "depot": "DLGH", "status": "Mapped",      "sourcing_depot": "DLGH", "sourcing_type": "Decentralized", "pricing_status": "Available"},
    {"cbu_code": "CBU-50007890", "basepack": "BP-700", "customer_chain": "Reliance Smart", "customer_code": "RLI-DL-001", "cic": "CIC-BP700-DL-RLI", "sales_org": "1000", "channel": "MT",        "depot": "DLGH", "status": "Mapped",      "sourcing_depot": "DLGH", "sourcing_type": "Decentralized", "pricing_status": "Available"},
    {"cbu_code": "CBU-50007890", "basepack": "BP-700", "customer_chain": "Blinkit",        "customer_code": "BLK-DL-001", "cic": "CIC-BP700-DL-BLK", "sales_org": "1000", "channel": "Qcom",     "depot": "DLGH", "status": "Stock Base Delisted", "sourcing_depot": "DLGH", "sourcing_type": "Decentralized", "pricing_status": "Not Available"},
    {"cbu_code": "CBU-50007890", "basepack": "BP-700", "customer_chain": "BigBasket",      "customer_code": "BBK-DL-001", "cic": "CIC-BP700-DL-BBK", "sales_org": "1000", "channel": "Ecom",     "depot": "DLGH", "status": "Delisted",    "sourcing_depot": None,   "sourcing_type": "Decentralized", "pricing_status": "Not Available"},
    {"cbu_code": "CBU-50007890", "basepack": "BP-700", "customer_chain": "Swiggy Instamart","customer_code": "SWG-DL-001", "cic": None,               "sales_org": "1000", "channel": "Qcom",     "depot": "DLGH", "status": "Non-Mapped",  "sourcing_depot": None,   "sourcing_type": "Decentralized", "pricing_status": "Not Available"},
]

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
        "new_cic_required": True,
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

# CCR line items linking relaunch CBUs to seeded customers
# Trigger stages reflect the CBU's current network status
CCR_LINE_ITEM_SEEDS = [
    # CBU-50003456 (Production Started → 1st Amber trigger)
    {"predecessor_cbu_code": "CBU-50003400", "successor_cbu_code": "CBU-50003456", "customer_chain": "DMart",          "customer_code": "DMT-TN-001", "cic": "CIC-BP300-TN-DMT", "trigger_stage": "First",  "urgency_color": "Amber",        "ccr_status": "Action Required", "execution_type": "Manual"},
    {"predecessor_cbu_code": "CBU-50003400", "successor_cbu_code": "CBU-50003456", "customer_chain": "DMart",          "customer_code": "DMT-KA-001", "cic": "CIC-BP300-KA-DMT", "trigger_stage": "First",  "urgency_color": "Amber",        "ccr_status": "Action Required", "execution_type": "Manual"},
    {"predecessor_cbu_code": "CBU-50003400", "successor_cbu_code": "CBU-50003456", "customer_chain": "BigBasket",      "customer_code": "BBK-TN-001", "cic": "CIC-BP300-TN-BBK", "trigger_stage": "First",  "urgency_color": "Amber",        "ccr_status": "Upcoming",        "execution_type": "Semi-Auto"},
    {"predecessor_cbu_code": "CBU-50003400", "successor_cbu_code": "CBU-50003456", "customer_chain": "Swiggy Instamart","customer_code": "SWG-TN-001", "cic": None,               "trigger_stage": "None",   "urgency_color": "None",         "ccr_status": "Upcoming",        "execution_type": "None"},

    # CBU-50005678 (FTR Approved → 2nd Amber trigger)
    {"predecessor_cbu_code": "CBU-50005600", "successor_cbu_code": "CBU-50005678", "customer_chain": "DMart",          "customer_code": "DMT-DL-001", "cic": "CIC-BP500-DL-DMT", "trigger_stage": "Second", "urgency_color": "Amber",        "ccr_status": "Action Required", "execution_type": "Manual"},
    {"predecessor_cbu_code": "CBU-50005600", "successor_cbu_code": "CBU-50005678", "customer_chain": "DMart",          "customer_code": "DMT-MH-001", "cic": "CIC-BP500-MH-DMT", "trigger_stage": "Second", "urgency_color": "Amber",        "ccr_status": "Upcoming",        "execution_type": "Manual"},
    {"predecessor_cbu_code": "CBU-50005600", "successor_cbu_code": "CBU-50005678", "customer_chain": "Reliance Smart", "customer_code": "RLI-DL-001", "cic": "CIC-BP500-DL-RLI", "trigger_stage": "Second", "urgency_color": "Amber",        "ccr_status": "Action Required", "execution_type": "Semi-Auto"},
    {"predecessor_cbu_code": "CBU-50005600", "successor_cbu_code": "CBU-50005678", "customer_chain": "Blinkit",        "customer_code": "BLK-DL-001", "cic": "CIC-BP500-DL-BLK", "trigger_stage": "Second", "urgency_color": "Amber",        "ccr_status": "Upcoming",        "execution_type": "Auto"},
    {"predecessor_cbu_code": "CBU-50005600", "successor_cbu_code": "CBU-50005678", "customer_chain": "BigBasket",      "customer_code": "BBK-DL-001", "cic": "CIC-BP500-DL-BBK", "trigger_stage": "First",  "urgency_color": "Amber",        "ccr_status": "Completed",       "execution_type": "Auto"},
    {"predecessor_cbu_code": "CBU-50005600", "successor_cbu_code": "CBU-50005678", "customer_chain": "Swiggy Instamart","customer_code": "SWG-DL-001", "cic": None,               "trigger_stage": "None",   "urgency_color": "None",         "ccr_status": "Upcoming",        "execution_type": "None"},

    # CBU-50006789 (Pricing Updated → pre-trigger)
    {"predecessor_cbu_code": "CBU-50006700", "successor_cbu_code": "CBU-50006789", "customer_chain": "DMart",          "customer_code": "DMT-TN-001", "cic": "CIC-BP600-TN-DMT", "trigger_stage": "First",  "urgency_color": "Amber",        "ccr_status": "Upcoming",        "execution_type": "Manual"},
    {"predecessor_cbu_code": "CBU-50006700", "successor_cbu_code": "CBU-50006789", "customer_chain": "BigBasket",      "customer_code": "BBK-KA-001", "cic": "CIC-BP600-KA-BBK", "trigger_stage": "None",   "urgency_color": "None",         "ccr_status": "Upcoming",        "execution_type": "Auto"},
    {"predecessor_cbu_code": "CBU-50006700", "successor_cbu_code": "CBU-50006789", "customer_chain": "Reliance Smart", "customer_code": "RLI-TN-001", "cic": "CIC-BP600-TN-RLI", "trigger_stage": "None",   "urgency_color": "None",         "ccr_status": "Upcoming",        "execution_type": "Manual"},

    # CBU-50007890 (Stock Movement Initiated → 3rd Red trigger)
    {"predecessor_cbu_code": "CBU-50007800", "successor_cbu_code": "CBU-50007890", "customer_chain": "DMart",          "customer_code": "DMT-DL-001", "cic": "CIC-BP700-DL-DMT", "trigger_stage": "Third",  "urgency_color": "Red",          "ccr_status": "Action Required", "execution_type": "Manual"},
    {"predecessor_cbu_code": "CBU-50007800", "successor_cbu_code": "CBU-50007890", "customer_chain": "Reliance Smart", "customer_code": "RLI-DL-001", "cic": "CIC-BP700-DL-RLI", "trigger_stage": "Third",  "urgency_color": "Red",          "ccr_status": "Action Required", "execution_type": "Semi-Auto"},
    {"predecessor_cbu_code": "CBU-50007800", "successor_cbu_code": "CBU-50007890", "customer_chain": "Blinkit",        "customer_code": "BLK-DL-001", "cic": "CIC-BP700-DL-BLK", "trigger_stage": "Third",  "urgency_color": "Red",          "ccr_status": "Upcoming",        "execution_type": "Auto"},
    {"predecessor_cbu_code": "CBU-50007800", "successor_cbu_code": "CBU-50007890", "customer_chain": "BigBasket",      "customer_code": "BBK-DL-001", "cic": "CIC-BP700-DL-BBK", "trigger_stage": "Third",  "urgency_color": "Red",          "ccr_status": "Upcoming",        "execution_type": "None"},
    {"predecessor_cbu_code": "CBU-50007800", "successor_cbu_code": "CBU-50007890", "customer_chain": "Swiggy Instamart","customer_code": "SWG-DL-001", "cic": None,               "trigger_stage": "Second", "urgency_color": "Amber",        "ccr_status": "Completed",       "execution_type": "None"},
]
