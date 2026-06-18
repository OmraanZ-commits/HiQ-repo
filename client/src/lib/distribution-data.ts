export interface ChannelDef {
  code: string;
  type: "Core" | "Traditional" | "Modern Trade";
  parent?: string;
}

export const TOP_CHANNELS: ChannelDef[] = [
  { code: "GT", type: "Core" },
  { code: "RD", type: "Core" },
  { code: "CSD", type: "Traditional" },
];

export const MT_SUB_CHANNELS: ChannelDef[] = [
  { code: "Ecom", type: "Modern Trade", parent: "MT" },
  { code: "Qcom", type: "Modern Trade", parent: "MT" },
  { code: "MT Retail", type: "Modern Trade", parent: "MT" },
  { code: "KA", type: "Modern Trade", parent: "MT" },
  { code: "CNC", type: "Modern Trade", parent: "MT" },
];

export const CHANNELS: ChannelDef[] = [
  ...TOP_CHANNELS,
  { code: "MT", type: "Modern Trade" },
  ...MT_SUB_CHANNELS,
];

// Geography to Depot mapping - defines which depots are valid for each geography
export const GEOGRAPHY_DEPOT_MAP: Record<string, string[]> = {
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
};

export interface ClusterDef {
  name: string;
  region: "South" | "West" | "North" | "East";
  depotCount: number;
  stateIds: string[];
  pinX: number;
  pinY: number;
}

// Base cluster data without depotCount (will be derived from GEOGRAPHY_DEPOT_MAP)
const CLUSTER_BASE_DATA: Omit<ClusterDef, 'depotCount'>[] = [
  { name: "TAMIL NADU", region: "South", stateIds: ["TN"], pinX: 52, pinY: 82 },
  { name: "KARNATAKA", region: "South", stateIds: ["KA"], pinX: 42, pinY: 74 },
  { name: "KERALA", region: "South", stateIds: ["KL"], pinX: 40, pinY: 85 },
  { name: "ANDHRA PRADESH", region: "South", stateIds: ["AP"], pinX: 54, pinY: 70 },
  { name: "TELANGANA", region: "South", stateIds: ["TG"], pinX: 50, pinY: 62 },
  { name: "GUJARAT", region: "West", stateIds: ["GJ"], pinX: 24, pinY: 44 },
  { name: "UTTAR PRADESH", region: "North", stateIds: ["UP"], pinX: 54, pinY: 32 },
  { name: "MUMBAI-PUNE", region: "West", stateIds: ["MH"], pinX: 30, pinY: 56 },
  { name: "GREATER MAHARASHTRA", region: "West", stateIds: ["MH"], pinX: 38, pinY: 58 },
  { name: "DELHI-GREATER DELHI", region: "North", stateIds: ["DL", "HR"], pinX: 44, pinY: 24 },
  { name: "PUNJAB-HARYANA-HILLS", region: "North", stateIds: ["PB", "HR", "HP"], pinX: 38, pinY: 18 },
  { name: "WEST BENGAL", region: "East", stateIds: ["WB"], pinX: 76, pinY: 46 },
  { name: "NESA", region: "East", stateIds: ["AS", "ML", "MN", "MZ", "NL", "TR", "AR", "SK"], pinX: 88, pinY: 30 },
  { name: "ORISSA-JHARKHAND", region: "East", stateIds: ["OD", "JH"], pinX: 68, pinY: 52 },
  { name: "BIHAR", region: "East", stateIds: ["BR"], pinX: 68, pinY: 36 },
  { name: "MADHYA PRADESH", region: "North", stateIds: ["MP"], pinX: 48, pinY: 46 },
  { name: "CHHATISGARH", region: "East", stateIds: ["CT"], pinX: 58, pinY: 52 },
  { name: "RAJASTHAN", region: "North", stateIds: ["RJ"], pinX: 32, pinY: 32 },
];

// CLUSTERS with depotCount derived from GEOGRAPHY_DEPOT_MAP
export const CLUSTERS: ClusterDef[] = CLUSTER_BASE_DATA.map(cluster => ({
  ...cluster,
  depotCount: (GEOGRAPHY_DEPOT_MAP[cluster.name] || []).length,
}));

// All unique depot codes derived from GEOGRAPHY_DEPOT_MAP
export const DEPOTS = Array.from(
  new Set(Object.values(GEOGRAPHY_DEPOT_MAP).flat())
).sort();

// Returns depots available for the selected geographies (union of all valid depots)
export function getAvailableDepots(selectedGeographies: string[]): string[] {
  if (selectedGeographies.length === 0) return [];
  const depotSet = new Set<string>();
  selectedGeographies.forEach(geo => {
    const depots = GEOGRAPHY_DEPOT_MAP[geo] || [];
    depots.forEach(d => depotSet.add(d));
  });
  return Array.from(depotSet).sort();
}

export function getSelectedRegions(selectedClusters: string[]): string[] {
  const stateIds = new Set<string>();
  for (const cluster of selectedClusters) {
    const def = CLUSTERS.find(c => c.name === cluster);
    if (def) {
      def.stateIds.forEach(s => stateIds.add(s));
    }
  }
  return Array.from(stateIds);
}

export interface CustomerChainDef {
  code: string;
  subChannel: string; // matches an MT_SUB_CHANNELS code
}

export const CUSTOMER_CHAINS: CustomerChainDef[] = [
  { code: "ASDS",  subChannel: "Ecom" },
  { code: "BTML",  subChannel: "Ecom" },
  { code: "BTMS",  subChannel: "Ecom" },
  { code: "CITI",  subChannel: "Ecom" },
  { code: "CLOT",  subChannel: "Ecom" },
  { code: "CRWL",  subChannel: "Ecom" },
  { code: "FKMT",  subChannel: "Ecom" },
  { code: "FKPT",  subChannel: "Ecom" },
  { code: "FLPT",  subChannel: "Ecom" },
  { code: "FRCY",  subChannel: "Ecom" },
  { code: "FTHP",  subChannel: "Ecom" },
  { code: "JRPL",  subChannel: "Ecom" },
  { code: "MRPL",  subChannel: "Ecom" },
  { code: "MYAN",  subChannel: "Ecom" },
  { code: "NSPL",  subChannel: "Ecom" },
  { code: "NYKA",  subChannel: "Ecom" },
  { code: "PRPE",  subChannel: "Ecom" },
  { code: "SLIK",  subChannel: "Ecom" },
  { code: "SMYT",  subChannel: "Ecom" },
  { code: "TCLQ",  subChannel: "Ecom" },
  { code: "WFLP",  subChannel: "Ecom" },
  { code: "ZIPE",  subChannel: "Ecom" },
  { code: "ASML",  subChannel: "MT Retail" },
  { code: "DNCP",  subChannel: "MT Retail" },
  { code: "FSNB",  subChannel: "MT Retail" },
  { code: "HNGL",  subChannel: "MT Retail" },
  { code: "LSIP",  subChannel: "MT Retail" },
  { code: "MAX",   subChannel: "MT Retail" },
  { code: "MORE",  subChannel: "MT Retail" },
  { code: "RELI",  subChannel: "MT Retail" },
  { code: "SPEN",  subChannel: "MT Retail" },
  { code: "STAR",  subChannel: "MT Retail" },
  { code: "TIRV",  subChannel: "MT Retail" },
  { code: "WIRL",  subChannel: "MT Retail" },
  { code: "WRRL",  subChannel: "MT Retail" },
  { code: "BIGB",  subChannel: "Qcom" },
  { code: "BLIT",  subChannel: "Qcom" },
  { code: "MOON",  subChannel: "Qcom" },
  { code: "SWIN",  subChannel: "Qcom" },
  { code: "ZPTO",  subChannel: "Qcom" },
  { code: "BIPL",  subChannel: "CNC" },
  { code: "CPWI",  subChannel: "CNC" },
  { code: "JBTL",  subChannel: "CNC" },
  { code: "METRO", subChannel: "CNC" },
  { code: "NYKB",  subChannel: "CNC" },
  { code: "SMGS",  subChannel: "CNC" },
  { code: "UDAN",  subChannel: "CNC" },
  { code: "WBWM",  subChannel: "CNC" },
  { code: "WMCC",  subChannel: "CNC" },
  { code: "WRMC",  subChannel: "CNC" },
];
