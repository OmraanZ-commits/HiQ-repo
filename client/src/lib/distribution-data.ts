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
