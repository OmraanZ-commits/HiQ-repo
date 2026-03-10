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
    {"code": "KA", "name": "Key Accounts", "type": "Modern Trade", "parentCode": "MT"},
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
