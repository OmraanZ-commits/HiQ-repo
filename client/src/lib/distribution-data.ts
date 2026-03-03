export interface ChannelDef {
  code: string;
  type: "Core" | "Traditional" | "Modern Trade" | "Institutional";
  parent?: string;
}

export const CHANNELS: ChannelDef[] = [
  { code: "GT", type: "Core" },
  { code: "RD", type: "Core" },
  { code: "CSD", type: "Traditional" },
  { code: "MT", type: "Modern Trade" },
  { code: "Ecom", type: "Modern Trade", parent: "MT" },
  { code: "Qcom", type: "Modern Trade", parent: "MT" },
  { code: "MT Retail", type: "Modern Trade", parent: "MT" },
  { code: "KA", type: "Modern Trade", parent: "MT" },
  { code: "CNC", type: "Modern Trade", parent: "MT" },
];

export interface ClusterDef {
  name: string;
  region: "South" | "West" | "North" | "East";
  depotCount: number;
  stateIds: string[];
}

export const CLUSTERS: ClusterDef[] = [
  { name: "TAMIL NADU", region: "South", depotCount: 2, stateIds: ["TN"] },
  { name: "KARNATAKA", region: "South", depotCount: 2, stateIds: ["KA"] },
  { name: "KERALA", region: "South", depotCount: 1, stateIds: ["KL"] },
  { name: "ANDHRA PRADESH", region: "South", depotCount: 2, stateIds: ["AP"] },
  { name: "TELANGANA", region: "South", depotCount: 1, stateIds: ["TG"] },
  { name: "GUJARAT", region: "West", depotCount: 2, stateIds: ["GJ"] },
  { name: "UTTAR PRADESH", region: "North", depotCount: 3, stateIds: ["UP"] },
  { name: "MUMBAI-PUNE", region: "West", depotCount: 2, stateIds: ["MH"] },
  { name: "GREATER MAHARASHTRA", region: "West", depotCount: 2, stateIds: ["MH"] },
  { name: "DELHI-GREATER DELHI", region: "North", depotCount: 2, stateIds: ["DL", "HR"] },
  { name: "PUNJAB-HARYANA-HILLS", region: "North", depotCount: 2, stateIds: ["PB", "HR", "HP"] },
  { name: "WEST BENGAL", region: "East", depotCount: 2, stateIds: ["WB"] },
  { name: "NESA", region: "East", depotCount: 2, stateIds: ["AS", "ML", "MN", "MZ", "NL", "TR", "AR", "SK"] },
  { name: "ORISSA-JHARKHAND", region: "East", depotCount: 2, stateIds: ["OD", "JH"] },
  { name: "BIHAR", region: "East", depotCount: 2, stateIds: ["BR"] },
  { name: "MADHYA PRADESH", region: "North", depotCount: 2, stateIds: ["MP"] },
  { name: "CHHATISGARH", region: "East", depotCount: 1, stateIds: ["CT"] },
  { name: "RAJASTHAN", region: "North", depotCount: 2, stateIds: ["RJ"] },
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
