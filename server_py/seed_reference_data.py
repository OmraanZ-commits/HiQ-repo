"""
Seed data for channels_master, clusters_master and depots_master tables.

Mirrors the static data that was previously defined only on the front-end
in client/src/lib/distribution-data.ts.
"""

CHANNEL_SEEDS = [
    {"code": "GT", "name": "General Trade", "type": "Core"},
    {"code": "RD", "name": "Rural Distribution", "type": "Core"},
    {"code": "CSD", "name": "Canteen Stores Department", "type": "Traditional"},
    {"code": "MT", "name": "Modern Trade", "type": "Modern Trade"},
    {"code": "Ecom", "name": "E-Commerce", "type": "Modern Trade", "parentCode": "MT"},
    {"code": "Qcom", "name": "Quick Commerce", "type": "Modern Trade", "parentCode": "MT"},
    {"code": "MT Retail", "name": "MT Retail", "type": "Modern Trade", "parentCode": "MT"},
    {"code": "KA", "name": "Key Accounts", "type": "Traditional"},
    {"code": "CNC", "name": "Cash & Carry", "type": "Modern Trade", "parentCode": "MT"},
]

# Geography to Depot mapping - defines which depots are valid for each geography
# Some depots can belong to multiple geographies (e.g., VABH in GUJARAT, MUMBAI-PUNE, GREATER MAHARASHTRA)
# This is the single source of truth for geography-depot relationships
GEOGRAPHY_DEPOT_MAP = {
    "TAMIL NADU": ["MMDH", "CB1H"],
    "KARNATAKA": ["CHKH"],
    "KERALA": ["TCRH", "TSRH"],
    "ANDHRA PRADESH": ["VJDH"],
    "TELANGANA": ["HBDH"],
    "GUJARAT": ["ABDH", "VABH"],
    "UTTAR PRADESH": ["SHKH", "VNSH", "GZBH"],
    "MUMBAI-PUNE": ["VABH", "BNDH"],
    "GREATER MAHARASHTRA": ["KOPH", "NGRH", "BNDH", "VABH"],
    "DELHI-GREATER DELHI": ["DLGH"],
    "PUNJAB-HARYANA-HILLS": ["HARH", "RJ2H", "RJPH"],
    "WEST BENGAL": ["SHAH", "XULH"],
    "NESA": ["GAUH"],
    "ORISSA-JHARKHAND": ["XPTH", "CUTH"],
    "BIHAR": ["PATH"],
    "MADHYA PRADESH": ["INDH"],
    "CHHATISGARH": ["RAIH"],
    "RAJASTHAN": ["JPRH"],
}

# Base cluster data without depotCount (will be derived from GEOGRAPHY_DEPOT_MAP)
_CLUSTER_BASE_DATA = [
    {"name": "TAMIL NADU", "region": "South", "stateIds": ["TN"], "pinX": 52, "pinY": 82},
    {"name": "KARNATAKA", "region": "South", "stateIds": ["KA"], "pinX": 42, "pinY": 74},
    {"name": "KERALA", "region": "South", "stateIds": ["KL"], "pinX": 40, "pinY": 85},
    {"name": "ANDHRA PRADESH", "region": "South", "stateIds": ["AP"], "pinX": 54, "pinY": 70},
    {"name": "TELANGANA", "region": "South", "stateIds": ["TG"], "pinX": 50, "pinY": 62},
    {"name": "GUJARAT", "region": "West", "stateIds": ["GJ"], "pinX": 24, "pinY": 44},
    {"name": "UTTAR PRADESH", "region": "North", "stateIds": ["UP"], "pinX": 54, "pinY": 32},
    {"name": "MUMBAI-PUNE", "region": "West", "stateIds": ["MH"], "pinX": 30, "pinY": 56},
    {"name": "GREATER MAHARASHTRA", "region": "West", "stateIds": ["MH"], "pinX": 38, "pinY": 58},
    {"name": "DELHI-GREATER DELHI", "region": "North", "stateIds": ["DL", "HR"], "pinX": 44, "pinY": 24},
    {"name": "PUNJAB-HARYANA-HILLS", "region": "North", "stateIds": ["PB", "HR", "HP"], "pinX": 38, "pinY": 18},
    {"name": "WEST BENGAL", "region": "East", "stateIds": ["WB"], "pinX": 76, "pinY": 46},
    {"name": "NESA", "region": "East", "stateIds": ["AS", "ML", "MN", "MZ", "NL", "TR", "AR", "SK"], "pinX": 88, "pinY": 30},
    {"name": "ORISSA-JHARKHAND", "region": "East", "stateIds": ["OD", "JH"], "pinX": 68, "pinY": 52},
    {"name": "BIHAR", "region": "East", "stateIds": ["BR"], "pinX": 68, "pinY": 36},
    {"name": "MADHYA PRADESH", "region": "North", "stateIds": ["MP"], "pinX": 48, "pinY": 46},
    {"name": "CHHATISGARH", "region": "East", "stateIds": ["CT"], "pinX": 58, "pinY": 52},
    {"name": "RAJASTHAN", "region": "North", "stateIds": ["RJ"], "pinX": 32, "pinY": 32},
]

# CLUSTER_SEEDS with depotCount derived from GEOGRAPHY_DEPOT_MAP
CLUSTER_SEEDS = [
    {**cluster, "depotCount": len(GEOGRAPHY_DEPOT_MAP.get(cluster["name"], []))}
    for cluster in _CLUSTER_BASE_DATA
]

DEPOT_SEEDS = [
    # Tamil Nadu
    {"code": "MMDH", "name": "Chennai", "cluster": "TAMIL NADU"},
    {"code": "CB1H", "name": "Coimbatore", "cluster": "TAMIL NADU"},
    # Karnataka
    {"code": "CHKH", "name": "Bangalore", "cluster": "KARNATAKA"},
    # Kerala
    {"code": "TCRH", "name": "Trivandrum-Cochin", "cluster": "KERALA"},
    {"code": "TSRH", "name": "Thrissur", "cluster": "KERALA"},
    # Andhra Pradesh
    {"code": "VJDH", "name": "Vijayawada", "cluster": "ANDHRA PRADESH"},
    # Telangana
    {"code": "HBDH", "name": "Hyderabad", "cluster": "TELANGANA"},
    # Gujarat
    {"code": "ABDH", "name": "Ahmedabad", "cluster": "GUJARAT"},
    {"code": "VABH", "name": "Vadodara", "cluster": "GUJARAT"},
    # Uttar Pradesh
    {"code": "SHKH", "name": "Lucknow", "cluster": "UTTAR PRADESH"},
    {"code": "VNSH", "name": "Varanasi", "cluster": "UTTAR PRADESH"},
    {"code": "GZBH", "name": "Ghaziabad", "cluster": "UTTAR PRADESH"},
    # Mumbai-Pune (shares VABH and BNDH)
    {"code": "BNDH", "name": "Pune", "cluster": "MUMBAI-PUNE"},
    # Greater Maharashtra (shares BNDH, VABH)
    {"code": "KOPH", "name": "Kolhapur", "cluster": "GREATER MAHARASHTRA"},
    {"code": "NGRH", "name": "Nagpur", "cluster": "GREATER MAHARASHTRA"},
    # Delhi-Greater Delhi
    {"code": "DLGH", "name": "Delhi", "cluster": "DELHI-GREATER DELHI"},
    # Punjab-Haryana-Hills
    {"code": "HARH", "name": "Chandigarh", "cluster": "PUNJAB-HARYANA-HILLS"},
    {"code": "RJ2H", "name": "Rohtak", "cluster": "PUNJAB-HARYANA-HILLS"},
    {"code": "RJPH", "name": "Rajpura", "cluster": "PUNJAB-HARYANA-HILLS"},
    # West Bengal
    {"code": "SHAH", "name": "Siliguri", "cluster": "WEST BENGAL"},
    {"code": "XULH", "name": "Kolkata", "cluster": "WEST BENGAL"},
    # NESA
    {"code": "GAUH", "name": "Guwahati", "cluster": "NESA"},
    # Orissa-Jharkhand
    {"code": "XPTH", "name": "Bhubaneswar", "cluster": "ORISSA-JHARKHAND"},
    {"code": "CUTH", "name": "Cuttack", "cluster": "ORISSA-JHARKHAND"},
    # Bihar
    {"code": "PATH", "name": "Patna", "cluster": "BIHAR"},
    # Madhya Pradesh
    {"code": "INDH", "name": "Indore", "cluster": "MADHYA PRADESH"},
    # Chhatisgarh
    {"code": "RAIH", "name": "Raipur", "cluster": "CHHATISGARH"},
    # Rajasthan
    {"code": "JPRH", "name": "Jaipur", "cluster": "RAJASTHAN"},
]

CLUSTER_REGION_STATE_SEEDS = [
    {"cluster": "Mumbai_Pune",          "regionCode": "Z3",   "state": "Mumbai +Pune (maharastra B) (mum CHN DEPOT)", "sortOrder": 1},
    {"cluster": "GREATER_MAHARASHTRA",  "regionCode": "5",    "state": "Goa",                                         "sortOrder": 2},
    {"cluster": "GREATER_MAHARASHTRA",  "regionCode": "13",   "state": "Maharashtra (A) Bhiwandi depot",              "sortOrder": 3},
    {"cluster": "Gujarat",              "regionCode": "28",   "state": "Dadra and nagar haveli",                      "sortOrder": 4},
    {"cluster": "Gujarat",              "regionCode": "29",   "state": "Daman und Diu",                               "sortOrder": 5},
    {"cluster": "Gujarat",              "regionCode": "6",    "state": "Gujarat",                                     "sortOrder": 6},
    {"cluster": "DELHI-GREATER DELHI",  "regionCode": "30",   "state": "Delhi",                                       "sortOrder": 7},
    {"cluster": "DELHI-GREATER DELHI",  "regionCode": "Z4",   "state": "Haryana (Gurgoan Faridabad) (B)",             "sortOrder": 8},
    {"cluster": "DELHI-GREATER DELHI",  "regionCode": "Z5",   "state": "Uttar Pradesh (Ghaziabad) B",                 "sortOrder": 9},
    {"cluster": "PUNJAB-HILLS-HARYANA", "regionCode": "27",   "state": "Chandigarh",                                  "sortOrder": 10},
    {"cluster": "PUNJAB-HILLS-HARYANA", "regionCode": "7",    "state": "Haryana (Excl Gurgoon) (A)",                  "sortOrder": 11},
    {"cluster": "PUNJAB-HILLS-HARYANA", "regionCode": "8",    "state": "Himachal Pradesh",                            "sortOrder": 12},
    {"cluster": "PUNJAB-HILLS-HARYANA", "regionCode": "9",    "state": "Jammu und Kashmir",                           "sortOrder": 13},
    {"cluster": "PUNJAB-HILLS-HARYANA", "regionCode": "19",   "state": "Punjab",                                      "sortOrder": 14},
    {"cluster": "PUNJAB-HILLS-HARYANA", "regionCode": "35",   "state": "Uttaranchal/ Uttarakhand",                    "sortOrder": 15},
    {"cluster": "PUNJAB-HILLS-HARYANA", "regionCode": "38",   "state": "Ladakh",                                      "sortOrder": 16},
    {"cluster": "Rajasthan Clust",      "regionCode": "20",   "state": "Rajasthan",                                   "sortOrder": 17},
    {"cluster": "UTTAR_PRADESH",        "regionCode": "24",   "state": "Uttar Pradesh (Excl Ghaziabad)",              "sortOrder": 18},
    {"cluster": "Bihar_Clust",          "regionCode": None,   "state": None,                                          "sortOrder": 19},
    {"cluster": "Bihar",                "regionCode": "4",    "state": "Bihar",                                       "sortOrder": 20},
    {"cluster": "MADHYA PRADESH",       "regionCode": "33",   "state": "Chattisgarh",                                 "sortOrder": 21},
    {"cluster": "MADHYA PRADESH",       "regionCode": "12",   "state": "Madhya Pradesh",                              "sortOrder": 22},
    {"cluster": "ANDHRA_PRADESH",       "regionCode": "1, 76","state": "Andra Pradesh incd pondy b",                  "sortOrder": 23},
    {"cluster": "ANDHRA_PRADESH",       "regionCode": "37",   "state": "Residuary AP State",                          "sortOrder": 24},
    {"cluster": "ANDHRA_PRADESH",       "regionCode": "36",   "state": "Telangana",                                   "sortOrder": 25},
    {"cluster": "ANDHRA_PRADESH",       "regionCode": "26",   "state": "Pondicherry b / yanam",                       "sortOrder": 26},
    {"cluster": "KERALA-KARNATAKA",     "regionCode": "10",   "state": "Karnataka",                                   "sortOrder": 27},
    {"cluster": "KERALA-KARNATAKA",     "regionCode": "11",   "state": "Kerala",                                      "sortOrder": 28},
    {"cluster": "KERALA-KARNATAKA",     "regionCode": "Z7",   "state": "pondicherry C mahe",                          "sortOrder": 29},
    {"cluster": "Tamil Nadu",           "regionCode": "26",   "state": "Andaman and Nico.In.",                        "sortOrder": 30},
    {"cluster": "Tamil Nadu",           "regionCode": "22",   "state": "Tamil Nadu",                                  "sortOrder": 31},
    {"cluster": "Tamil Nadu",           "regionCode": "32",   "state": "pondicherry A",                               "sortOrder": 32},
    {"cluster": "West Bengal",          "regionCode": "25",   "state": "West Bengal",                                 "sortOrder": 33},
    {"cluster": "ORISSA-JHARKHAND",     "regionCode": "34",   "state": "Jharkhand",                                   "sortOrder": 34},
    {"cluster": "ORISSA-JHARKHAND",     "regionCode": "18",   "state": "Orissa/Odisha",                               "sortOrder": 35},
    {"cluster": "NESA",                 "regionCode": "2",    "state": "Arunachal Pradesh",                           "sortOrder": 36},
    {"cluster": "NESA",                 "regionCode": "3",    "state": "Assam",                                       "sortOrder": 37},
    {"cluster": "NESA",                 "regionCode": "14",   "state": "Manipur",                                     "sortOrder": 38},
    {"cluster": "NESA",                 "regionCode": "15",   "state": "Megalaya",                                    "sortOrder": 39},
    {"cluster": "NESA",                 "regionCode": "16",   "state": "Mizoram",                                     "sortOrder": 40},
    {"cluster": "NESA",                 "regionCode": "17",   "state": "Nagaland",                                    "sortOrder": 41},
    {"cluster": "NESA",                 "regionCode": "21",   "state": "Sikkim",                                      "sortOrder": 42},
    {"cluster": "NESA",                 "regionCode": "21",   "state": "Bhutan",                                      "sortOrder": 43},
    {"cluster": "NESA",                 "regionCode": "23",   "state": "Tripura",                                     "sortOrder": 44},
]

NETWORK_CHANGE_TYPE_SEEDS = [
    {"code": "CP_VALUE", "name": "Consumer Promotion (Value)", "category": "Promotion"},
    {"code": "CP_VOLUME", "name": "Consumer Promotion (Volume)", "category": "Promotion"},
    {"code": "RL_ART_PKG", "name": "Relaunch – Artwork and Packaging Change", "category": "Relaunch"},
    {"code": "RL_ART", "name": "Relaunch – Artwork Change", "category": "Relaunch"},
    {"code": "RL_ART_FORM", "name": "Relaunch – Artwork and Formulation Change", "category": "Relaunch"},
    {"code": "RL_FORM", "name": "Relaunch – Formulation Change", "category": "Relaunch"},
    {"code": "RL_PKG", "name": "Relaunch – Packaging Change", "category": "Relaunch"},
    {"code": "RL_PKG_FORM", "name": "Relaunch – Packaging and Formulation Change", "category": "Relaunch"},
    {"code": "RL_PRICE", "name": "Relaunch – Pricing Change", "category": "Relaunch"},
    {"code": "NEW_LAUNCH", "name": "New Launch", "category": "Launch"},
    {"code": "RTD", "name": "RTD", "category": "Other"},
    {"code": "SAMPLING", "name": "Sampling", "category": "Other"},
    {"code": "TRANSIT", "name": "Transit", "category": "Other"},
    {"code": "TRIAL", "name": "Trial", "category": "Other"},
    {"code": "DELISTING", "name": "Delisting", "category": "Other"},
    {"code": "OTHERS", "name": "Others", "category": "Other"},
]


# ── CCR Ruleset seed data ─────────────────────────────────────────────────────
# 19 customer accounts with their CCR properties

CCR_ACCOUNT_SEEDS = [
    {"accountName": "BIGBASKET",         "ccrAction": "National", "sbmListingBased": "Non-Listing",   "pixelRequired": "Y", "contentRequired": "Y", "customerUpdateTimeline": "4 weeks"},
    {"accountName": "CLOUD TAIL",        "ccrAction": "National", "sbmListingBased": "Listing Based", "pixelRequired": "Y", "contentRequired": "Y", "customerUpdateTimeline": "4 weeks"},
    {"accountName": "FLIPKART",          "ccrAction": "National", "sbmListingBased": "Listing Based", "pixelRequired": "Y", "contentRequired": "Y", "customerUpdateTimeline": "4 weeks"},
    {"accountName": "AMAZON",            "ccrAction": "National", "sbmListingBased": "Listing Based", "pixelRequired": "Y", "contentRequired": "Y", "customerUpdateTimeline": "4 weeks"},
    {"accountName": "JIOMART",           "ccrAction": "National", "sbmListingBased": "Listing Based", "pixelRequired": "Y", "contentRequired": "Y", "customerUpdateTimeline": "3 weeks"},
    {"accountName": "BLINKIT",           "ccrAction": "Regional", "sbmListingBased": "Non-Listing",   "pixelRequired": "Y", "contentRequired": "N", "customerUpdateTimeline": "2 weeks"},
    {"accountName": "ZEPTO",             "ccrAction": "National", "sbmListingBased": "SBM",           "pixelRequired": "Y", "contentRequired": "N", "customerUpdateTimeline": "2 weeks"},
    {"accountName": "SWIGGY INSTAMART",  "ccrAction": "National", "sbmListingBased": "Non-Listing",   "pixelRequired": "Y", "contentRequired": "N", "customerUpdateTimeline": "2 weeks"},
    {"accountName": "D-MART",            "ccrAction": "Regional", "sbmListingBased": "Non-Listing",   "pixelRequired": "N", "contentRequired": "N", "customerUpdateTimeline": "6 weeks"},
    {"accountName": "MORE RETAIL",       "ccrAction": "Regional", "sbmListingBased": "Non-Listing",   "pixelRequired": "N", "contentRequired": "N", "customerUpdateTimeline": "4 weeks"},
    {"accountName": "STAR BAZAAR",       "ccrAction": "Regional", "sbmListingBased": "Listing Based", "pixelRequired": "N", "contentRequired": "Y", "customerUpdateTimeline": "5 weeks"},
    {"accountName": "SPENCERS",          "ccrAction": "Regional", "sbmListingBased": "Listing Based", "pixelRequired": "N", "contentRequired": "Y", "customerUpdateTimeline": "4 weeks"},
    {"accountName": "NATURES BASKET",    "ccrAction": "Regional", "sbmListingBased": "Listing Based", "pixelRequired": "Y", "contentRequired": "Y", "customerUpdateTimeline": "4 weeks"},
    {"accountName": "LULU HYPERMARKET",  "ccrAction": "Regional", "sbmListingBased": "Listing Based", "pixelRequired": "Y", "contentRequired": "Y", "customerUpdateTimeline": "6 weeks"},
    {"accountName": "METRO C&C",         "ccrAction": "National", "sbmListingBased": "Non-Listing",   "pixelRequired": "N", "contentRequired": "N", "customerUpdateTimeline": "3 weeks"},
    {"accountName": "RELIANCE FRESH",    "ccrAction": "Regional", "sbmListingBased": "Non-Listing",   "pixelRequired": "N", "contentRequired": "N", "customerUpdateTimeline": "4 weeks"},
    {"accountName": "RELIANCE SMART",    "ccrAction": "National", "sbmListingBased": "Non-Listing",   "pixelRequired": "N", "contentRequired": "N", "customerUpdateTimeline": "4 weeks"},
    {"accountName": "BIG BAZAAR",        "ccrAction": "National", "sbmListingBased": "Non-Listing",   "pixelRequired": "N", "contentRequired": "N", "customerUpdateTimeline": "5 weeks"},
    {"accountName": "SPAR",              "ccrAction": "Regional", "sbmListingBased": "Listing Based", "pixelRequired": "N", "contentRequired": "Y", "customerUpdateTimeline": "4 weeks"},
]

# ── Explicit CCR rules matrix — per account, per change type, per EAN scenario ─
#
# Each entry: (newCicRequired, contentUpdateRequired, rundown)
# No EAN Change row:  (newCicRequired, contentUpdateRequired, rundown, newPoRequired)
# Conditional string values (e.g. "Y if >10% change") indicate business conditions.
#
# Account groups used to avoid pure repetition:
#   NAT_LIST  = national listing-based   (BigBasket, Cloud Tail, Flipkart, Amazon, JioMart)
#   SBM       = quick-commerce SBM       (Blinkit, Zepto, Swiggy Instamart)
#   REG_LIST  = regional listing-based   (Star Bazaar, Spencers, Natures Basket, Lulu, Spar)
#   NON_LIST  = non-listing              (D-Mart, More Retail, Metro C&C, Reliance Fresh,
#                                         Reliance Smart, Big Bazaar)
#
# Per-account deviations from the group matrix are expressed inline below.

def _r(nc, cu, rd, po=None):
    """Shorthand row builder. Returns a dict of rule fields."""
    d = {"newCicRequired": nc, "contentUpdateRequired": cu, "rundown": rd}
    if po is not None:
        d["newPoRequired"] = po
    return d


# ── Group matrices ────────────────────────────────────────────────────────────
# changeType → { "with_ean": (...), "without_ean": (...) }   (or "na" for No EAN Change)

_NAT_LIST = {
    "CP callout on FOP":              {"with_ean": _r("Y","Y","N"), "without_ean": _r("N","Y","N")},
    "Grammage change":                {"with_ean": _r("Y","Y","Y"), "without_ean": _r("Y","Y","Y")},
    "Pricing change <10%":            {"with_ean": _r("N","N","N"), "without_ean": _r("N","N","N")},
    "Pricing change >10%":            {"with_ean": _r("Y","N","N"), "without_ean": _r("Y","N","N")},
    "Artwork change":                 {"with_ean": _r("Y","Y","N"), "without_ean": _r("N","Y","N")},
    "Packaging change":               {"with_ean": _r("Y","Y","Y"), "without_ean": _r("Y","Y","Y")},
    "Formulation change":             {"with_ean": _r("Y","Y","N"), "without_ean": _r("N","Y if claims change","N")},
    "New launch":                     {"with_ean": _r("Y","Y","N"), "without_ean": _r("Y","Y","N")},
    "Relaunch \u2013 Artwork and Packaging": {"with_ean": _r("Y","Y","Y"), "without_ean": _r("Y","Y","Y")},
    "Brand extension":                {"with_ean": _r("Y","Y","N"), "without_ean": _r("Y","Y","N")},
    "No EAN Change":                  {"na": _r("N","N","N","Y")},
}

_SBM = {
    "CP callout on FOP":              {"with_ean": _r("Y","N","N"), "without_ean": _r("N","N","N")},
    "Grammage change":                {"with_ean": _r("Y","N","Y"), "without_ean": _r("Y","N","Y")},
    "Pricing change <10%":            {"with_ean": _r("N","N","N"), "without_ean": _r("N","N","N")},
    "Pricing change >10%":            {"with_ean": _r("Y","N","N"), "without_ean": _r("Y","N","N")},
    "Artwork change":                 {"with_ean": _r("Y","N","N"), "without_ean": _r("N","N","N")},
    "Packaging change":               {"with_ean": _r("Y","N","Y"), "without_ean": _r("Y","N","Y")},
    "Formulation change":             {"with_ean": _r("Y","N","N"), "without_ean": _r("N","N","N")},
    "New launch":                     {"with_ean": _r("Y","N","N"), "without_ean": _r("Y","N","N")},
    "Relaunch \u2013 Artwork and Packaging": {"with_ean": _r("Y","N","Y"), "without_ean": _r("Y","N","Y")},
    "Brand extension":                {"with_ean": _r("Y","N","N"), "without_ean": _r("Y","N","N")},
    "No EAN Change":                  {"na": _r("N","N","N","Y")},
}

_REG_LIST = {
    "CP callout on FOP":              {"with_ean": _r("Y","Y","N"), "without_ean": _r("N","Y","N")},
    "Grammage change":                {"with_ean": _r("Y","Y","Y"), "without_ean": _r("Y","Y","Y")},
    "Pricing change <10%":            {"with_ean": _r("N","N","N"), "without_ean": _r("N","N","N")},
    "Pricing change >10%":            {"with_ean": _r("Y if national price change","N","N"), "without_ean": _r("Y if national price change","N","N")},
    "Artwork change":                 {"with_ean": _r("Y","Y","N"), "without_ean": _r("N","Y","N")},
    "Packaging change":               {"with_ean": _r("Y","Y","Y"), "without_ean": _r("Y","Y","N")},
    "Formulation change":             {"with_ean": _r("Y","Y","N"), "without_ean": _r("N","Y if claims change","N")},
    "New launch":                     {"with_ean": _r("Y","Y","N"), "without_ean": _r("Y","Y","N")},
    "Relaunch \u2013 Artwork and Packaging": {"with_ean": _r("Y","Y","Y"), "without_ean": _r("Y","Y","N")},
    "Brand extension":                {"with_ean": _r("Y","Y","N"), "without_ean": _r("Y","Y","N")},
    "No EAN Change":                  {"na": _r("N","N","N","Y")},
}

_NON_LIST = {
    "CP callout on FOP":              {"with_ean": _r("Y","N","N"), "without_ean": _r("N","N","N")},
    "Grammage change":                {"with_ean": _r("Y","N","Y"), "without_ean": _r("Y","N","Y")},
    "Pricing change <10%":            {"with_ean": _r("N","N","N"), "without_ean": _r("N","N","N")},
    "Pricing change >10%":            {"with_ean": _r("Y","N","N"), "without_ean": _r("Y","N","N")},
    "Artwork change":                 {"with_ean": _r("Y","N","N"), "without_ean": _r("N","N","N")},
    "Packaging change":               {"with_ean": _r("Y","N","Y"), "without_ean": _r("Y","N","N")},
    "Formulation change":             {"with_ean": _r("Y","N","N"), "without_ean": _r("N","N","N")},
    "New launch":                     {"with_ean": _r("Y","N","N"), "without_ean": _r("Y","N","N")},
    "Relaunch \u2013 Artwork and Packaging": {"with_ean": _r("Y","N","Y"), "without_ean": _r("Y","N","N")},
    "Brand extension":                {"with_ean": _r("Y","N","N"), "without_ean": _r("Y","N","N")},
    "No EAN Change":                  {"na": _r("N","N","N","Y")},
}

# ── Per-account matrices (base group + explicit overrides) ────────────────────
# Each account uses its group matrix as the base, with individual deviations noted.

_ACCOUNT_MATRICES: dict = {
    # ── National Listing ────────────────────────────────────────────────────
    "BIGBASKET": {
        **_NAT_LIST,
        # BigBasket enforces price-change CIC for any MRP change
        "Pricing change >10%": {"with_ean": _r("Y","N","N"), "without_ean": _r("Y","N","N")},
    },
    "AMAZON": {
        **_NAT_LIST,
        # Amazon requires content update for formulation without-EAN as well (ASIN hygiene)
        "Formulation change": {"with_ean": _r("Y","Y","N"), "without_ean": _r("N","Y","N")},
    },
    "FLIPKART": {
        **_NAT_LIST,
        # Flipkart: pricing >10% requires "Y if FASSAI/regulatory change" for content update
        "Pricing change >10%": {"with_ean": _r("Y","Y if FSSAI change","N"), "without_ean": _r("Y","Y if FSSAI change","N")},
    },
    "CLOUD TAIL": {
        **_NAT_LIST,
    },
    "JIOMART": {
        **_NAT_LIST,
        # JioMart: pricing <10% may need CIC if MSRP update published on platform
        "Pricing change <10%": {"with_ean": _r("Y if MSRP update","N","N"), "without_ean": _r("Y if MSRP update","N","N")},
        # JioMart: faster turnaround — no rundown required for packaging
        "Packaging change": {"with_ean": _r("Y","Y","N"), "without_ean": _r("Y","Y","N")},
    },

    # ── SBM (Quick Commerce) ─────────────────────────────────────────────────
    "BLINKIT": {
        **_SBM,
        # Blinkit requires content update for new launches (product description)
        "New launch": {"with_ean": _r("Y","Y","N"), "without_ean": _r("Y","Y","N")},
    },
    "ZEPTO": {
        **_SBM,
        # Zepto: brand extension needs content update for search discoverability
        "Brand extension": {"with_ean": _r("Y","Y","N"), "without_ean": _r("Y","Y","N")},
    },
    "SWIGGY INSTAMART": {
        **_SBM,
        # Swiggy: new launch and brand extension need content
        "New launch":    {"with_ean": _r("Y","Y","N"), "without_ean": _r("Y","Y","N")},
        "Brand extension": {"with_ean": _r("Y","Y","N"), "without_ean": _r("Y","Y","N")},
    },

    # ── Regional Listing ─────────────────────────────────────────────────────
    "STAR BAZAAR": {
        **_REG_LIST,
        # Star Bazaar: packaging change without-EAN still requires rundown (store planogram)
        "Packaging change": {"with_ean": _r("Y","Y","Y"), "without_ean": _r("Y","Y","Y")},
    },
    "SPENCERS": {
        **_REG_LIST,
        # Spencers: grammage without-EAN requires only category manager sign-off (no rundown)
        "Grammage change": {"with_ean": _r("Y","Y","Y"), "without_ean": _r("Y","Y","N")},
    },
    "NATURES BASKET": {
        **_REG_LIST,
        # Natures Basket (premium): pricing >10% requires content update (shelf talkers)
        "Pricing change >10%": {"with_ean": _r("Y","Y","N"), "without_ean": _r("Y","Y","N")},
    },
    "LULU HYPERMARKET": {
        **_REG_LIST,
        # Lulu: pricing >10% requires CIC + content update
        "Pricing change >10%": {"with_ean": _r("Y","Y","N"), "without_ean": _r("Y","Y","N")},
        # Lulu: relaunch without-EAN still needs rundown (POG reset)
        "Relaunch \u2013 Artwork and Packaging": {"with_ean": _r("Y","Y","Y"), "without_ean": _r("Y","Y","Y")},
    },
    "SPAR": {
        **_REG_LIST,
    },

    # ── Non-Listing ──────────────────────────────────────────────────────────
    "D-MART": {
        **_NON_LIST,
        # D-Mart: long lead time — rundown is always required for packaging/relaunch
        "Packaging change":               {"with_ean": _r("Y","N","Y"), "without_ean": _r("Y","N","Y")},
        "Relaunch \u2013 Artwork and Packaging": {"with_ean": _r("Y","N","Y"), "without_ean": _r("Y","N","Y")},
        "Grammage change":                {"with_ean": _r("Y","N","Y"), "without_ean": _r("Y","N","Y")},
    },
    "MORE RETAIL": {
        **_NON_LIST,
    },
    "METRO C&C": {
        **_NON_LIST,
        # Metro C&C (B2B): pricing changes always need CIC (trade price update)
        "Pricing change <10%": {"with_ean": _r("Y if trade price change","N","N"), "without_ean": _r("Y if trade price change","N","N")},
        "Pricing change >10%": {"with_ean": _r("Y","N","N"), "without_ean": _r("Y","N","N")},
    },
    "RELIANCE FRESH": {
        **_NON_LIST,
    },
    "RELIANCE SMART": {
        **_NON_LIST,
        # Reliance Smart (national): packaging rundown required
        "Packaging change": {"with_ean": _r("Y","N","Y"), "without_ean": _r("Y","N","Y")},
    },
    "BIG BAZAAR": {
        **_NON_LIST,
        # Big Bazaar: pricing >10% needs content update (in-store signage)
        "Pricing change >10%": {"with_ean": _r("Y","Y if in-store signage update","N"), "without_ean": _r("Y","Y if in-store signage update","N")},
    },
}

# Validate all 19 accounts are explicitly present
assert set(_ACCOUNT_MATRICES.keys()) == {a["accountName"] for a in CCR_ACCOUNT_SEEDS}, \
    "Mismatch between CCR_ACCOUNT_SEEDS and _ACCOUNT_MATRICES — add missing accounts"


def _build_ccr_rule_seeds() -> list:
    """Generate explicit CCR rule seed rows from the per-account matrix definitions."""
    rows = []
    for acct_name, matrix in _ACCOUNT_MATRICES.items():
        for change_type, scenarios in matrix.items():
            for scenario, fields in scenarios.items():
                rows.append({
                    "accountName": acct_name,
                    "changeType": change_type,
                    "eanScenario": scenario,
                    **fields,
                })
    assert len(rows) == len(CCR_ACCOUNT_SEEDS) * 21, (
        f"Expected {len(CCR_ACCOUNT_SEEDS) * 21} rule rows, got {len(rows)}"
    )
    return rows


CCR_RULE_SEEDS = _build_ccr_rule_seeds()
