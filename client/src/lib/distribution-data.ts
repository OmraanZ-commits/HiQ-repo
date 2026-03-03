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

export interface ClusterDef {
  name: string;
  region: "South" | "West" | "North" | "East";
  depotCount: number;
  stateIds: string[];
  pinX: number;
  pinY: number;
}

export const CLUSTERS: ClusterDef[] = [
  { name: "TAMIL NADU", region: "South", depotCount: 2, stateIds: ["TN"], pinX: 52, pinY: 82 },
  { name: "KARNATAKA", region: "South", depotCount: 2, stateIds: ["KA"], pinX: 42, pinY: 74 },
  { name: "KERALA", region: "South", depotCount: 1, stateIds: ["KL"], pinX: 40, pinY: 85 },
  { name: "ANDHRA PRADESH", region: "South", depotCount: 2, stateIds: ["AP"], pinX: 54, pinY: 70 },
  { name: "TELANGANA", region: "South", depotCount: 1, stateIds: ["TG"], pinX: 50, pinY: 62 },
  { name: "GUJARAT", region: "West", depotCount: 2, stateIds: ["GJ"], pinX: 24, pinY: 44 },
  { name: "UTTAR PRADESH", region: "North", depotCount: 3, stateIds: ["UP"], pinX: 54, pinY: 32 },
  { name: "MUMBAI-PUNE", region: "West", depotCount: 2, stateIds: ["MH"], pinX: 30, pinY: 56 },
  { name: "GREATER MAHARASHTRA", region: "West", depotCount: 2, stateIds: ["MH"], pinX: 38, pinY: 58 },
  { name: "DELHI-GREATER DELHI", region: "North", depotCount: 2, stateIds: ["DL", "HR"], pinX: 44, pinY: 24 },
  { name: "PUNJAB-HARYANA-HILLS", region: "North", depotCount: 2, stateIds: ["PB", "HR", "HP"], pinX: 38, pinY: 18 },
  { name: "WEST BENGAL", region: "East", depotCount: 2, stateIds: ["WB"], pinX: 76, pinY: 46 },
  { name: "NESA", region: "East", depotCount: 2, stateIds: ["AS", "ML", "MN", "MZ", "NL", "TR", "AR", "SK"], pinX: 88, pinY: 30 },
  { name: "ORISSA-JHARKHAND", region: "East", depotCount: 2, stateIds: ["OD", "JH"], pinX: 68, pinY: 52 },
  { name: "BIHAR", region: "East", depotCount: 2, stateIds: ["BR"], pinX: 68, pinY: 36 },
  { name: "MADHYA PRADESH", region: "North", depotCount: 2, stateIds: ["MP"], pinX: 48, pinY: 46 },
  { name: "CHHATISGARH", region: "East", depotCount: 1, stateIds: ["CT"], pinX: 58, pinY: 52 },
  { name: "RAJASTHAN", region: "North", depotCount: 2, stateIds: ["RJ"], pinX: 32, pinY: 32 },
];

export const DEPOTS = [
  "DLGH", "CHKH", "HBDH", "MMDH", "JPRH", "BNDH",
  "RJPH", "NGRH", "VJDH", "VABH", "SHAH", "SHKH",
  "KOPH", "TCRH", "ABDH", "INDH", "HARH", "PATH",
  "CUTH", "CB1H", "GZBH", "GAUH", "VNSH", "RJ2H",
];

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
