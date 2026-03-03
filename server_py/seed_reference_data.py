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

CLUSTER_SEEDS = [
    {"name": "TAMIL NADU", "region": "South", "depotCount": 2, "stateIds": ["TN"], "pinX": 52, "pinY": 82},
    {"name": "KARNATAKA", "region": "South", "depotCount": 2, "stateIds": ["KA"], "pinX": 42, "pinY": 74},
    {"name": "KERALA", "region": "South", "depotCount": 1, "stateIds": ["KL"], "pinX": 40, "pinY": 85},
    {"name": "ANDHRA PRADESH", "region": "South", "depotCount": 2, "stateIds": ["AP"], "pinX": 54, "pinY": 70},
    {"name": "TELANGANA", "region": "South", "depotCount": 1, "stateIds": ["TG"], "pinX": 50, "pinY": 62},
    {"name": "GUJARAT", "region": "West", "depotCount": 2, "stateIds": ["GJ"], "pinX": 24, "pinY": 44},
    {"name": "UTTAR PRADESH", "region": "North", "depotCount": 3, "stateIds": ["UP"], "pinX": 54, "pinY": 32},
    {"name": "MUMBAI-PUNE", "region": "West", "depotCount": 2, "stateIds": ["MH"], "pinX": 30, "pinY": 56},
    {"name": "GREATER MAHARASHTRA", "region": "West", "depotCount": 2, "stateIds": ["MH"], "pinX": 38, "pinY": 58},
    {"name": "DELHI-GREATER DELHI", "region": "North", "depotCount": 2, "stateIds": ["DL", "HR"], "pinX": 44, "pinY": 24},
    {"name": "PUNJAB-HARYANA-HILLS", "region": "North", "depotCount": 2, "stateIds": ["PB", "HR", "HP"], "pinX": 38, "pinY": 18},
    {"name": "WEST BENGAL", "region": "East", "depotCount": 2, "stateIds": ["WB"], "pinX": 76, "pinY": 46},
    {"name": "NESA", "region": "East", "depotCount": 2, "stateIds": ["AS", "ML", "MN", "MZ", "NL", "TR", "AR", "SK"], "pinX": 88, "pinY": 30},
    {"name": "ORISSA-JHARKHAND", "region": "East", "depotCount": 2, "stateIds": ["OD", "JH"], "pinX": 68, "pinY": 52},
    {"name": "BIHAR", "region": "East", "depotCount": 2, "stateIds": ["BR"], "pinX": 68, "pinY": 36},
    {"name": "MADHYA PRADESH", "region": "North", "depotCount": 2, "stateIds": ["MP"], "pinX": 48, "pinY": 46},
    {"name": "CHHATISGARH", "region": "East", "depotCount": 1, "stateIds": ["CT"], "pinX": 58, "pinY": 52},
    {"name": "RAJASTHAN", "region": "North", "depotCount": 2, "stateIds": ["RJ"], "pinX": 32, "pinY": 32},
]

DEPOT_SEEDS = [
    {"code": "DLGH", "name": "Delhi Ghaziabad"},
    {"code": "CHKH", "name": "Chandigarh"},
    {"code": "HBDH", "name": "Hyderabad"},
    {"code": "MMDH", "name": "Mumbai"},
    {"code": "JPRH", "name": "Jaipur"},
    {"code": "BNDH", "name": "Bangalore"},
    {"code": "RJPH", "name": "Rajpur"},
    {"code": "NGRH", "name": "Nagpur"},
    {"code": "VJDH", "name": "Vijayawada"},
    {"code": "VABH", "name": "Varanasi"},
    {"code": "SHAH", "name": "Shahjahanpur"},
    {"code": "SHKH", "name": "Shimla-Kullu"},
    {"code": "KOPH", "name": "Kolkata Port"},
    {"code": "TCRH", "name": "Trivandrum-Cochin"},
    {"code": "ABDH", "name": "Ahmedabad"},
    {"code": "INDH", "name": "Indore"},
    {"code": "HARH", "name": "Haridwar"},
    {"code": "PATH", "name": "Patna"},
    {"code": "CUTH", "name": "Cuttack"},
    {"code": "CB1H", "name": "Coimbatore"},
    {"code": "GZBH", "name": "Guwahati"},
    {"code": "GAUH", "name": "Goa"},
    {"code": "VNSH", "name": "Visakhapatnam"},
    {"code": "RJ2H", "name": "Rajkot"},
]
