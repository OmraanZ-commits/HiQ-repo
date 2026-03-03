import { type User, type InsertUser, type NetworkEntry, type InsertNetworkEntry } from "@shared/schema";
import { randomUUID } from "crypto";
import { ListMasterMemStorage } from "./services/list-master/storage";
import { StateMemStorage } from "./services/state-management/storage";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllNetworkEntries(): Promise<NetworkEntry[]>;
  getNetworkEntry(id: string): Promise<NetworkEntry | undefined>;
  createNetworkEntry(entry: InsertNetworkEntry): Promise<NetworkEntry>;
  updateNetworkEntry(id: string, entry: Partial<InsertNetworkEntry>): Promise<NetworkEntry | undefined>;
  deleteNetworkEntry(id: string): Promise<boolean>;
}

export const listMasterStorage = new ListMasterMemStorage();
export const stateStorage = new StateMemStorage();

const SEEDS: InsertNetworkEntry[] = [
  {
    cbuCreatedDate: "2026-01-15",
    networkChangeDate: "2026-02-01",
    annexureNumber: "ANN-2026-001",
    basepack: "BP-100",
    basepackDescription: "Dove Soap Bar 100g",
    bg: "Beauty & Personal Care",
    profitCentre: "PC-BPC-01",
    salesCategory: "Skin Cleansing",
    smallC: "SC-001",
    brand: "Dove",
    format: "Bar",
    cbuCode: "CBU-50001234",
    materialDescription: "Dove Beauty Bar Original 100g",
    typeOfNetwork: "New Launch",
    copyCbu: "CBU-50001200",
    year: 2026,
    networkStatus: "Active",
    startDate: "2026-02-01",
    endDate: "2026-12-31",
    caseConfig: "48x1",
    ean: "8901030729881",
    netWeight: 100,
    grossWeight: 115,
    length: 85,
    width: 55,
    height: 30,
    itf: "18901030729888",
    ftrImagesLink: null,
    predecessorCode: null,
    successorCode: "CBU-50001234",
    headerCode: null,
    csdIndexNo: "CSD-4421",
    pcAtChannelState: "PC-2026-Q1-North",
    sourcingMatrixSection: "Updated",
    assignedPerson: "Rajesh Sharma",
    geography: ["DELHI-GREATER DELHI", "PUNJAB-HARYANA-HILLS", "UTTAR PRADESH"],
    depot: ["DLGH", "JPRH", "VABH"],
    channel: ["GT", "MT", "MT Retail"],
  },
  {
    cbuCreatedDate: "2026-01-20",
    networkChangeDate: null,
    annexureNumber: "ANN-2026-002",
    basepack: "BP-200",
    basepackDescription: "Surf Excel Matic Top Load 2kg",
    bg: "Home Care",
    profitCentre: "PC-HC-02",
    salesCategory: "Fabric Cleaning",
    smallC: "SC-002",
    brand: "Surf Excel",
    format: "Powder",
    cbuCode: "CBU-50002345",
    materialDescription: "Surf Excel Matic Top Load Detergent Powder 2kg",
    typeOfNetwork: "Relaunch",
    copyCbu: "CBU-50002300",
    year: 2026,
    networkStatus: "Draft",
    startDate: null,
    endDate: null,
    caseConfig: "6x1",
    ean: "8901030865312",
    netWeight: 2000,
    grossWeight: 2150,
    length: 300,
    width: 200,
    height: 120,
    itf: "18901030865319",
    ftrImagesLink: null,
    predecessorCode: "CBU-50002300",
    successorCode: "CBU-50002345",
    headerCode: null,
    csdIndexNo: "CSD-5567",
    pcAtChannelState: null,
    sourcingMatrixSection: null,
    assignedPerson: "Priya Patel",
    geography: [],
    depot: [],
    channel: [],
  },
  {
    cbuCreatedDate: "2025-11-10",
    networkChangeDate: "2026-01-05",
    annexureNumber: "ANN-2025-089",
    basepack: "BP-300",
    basepackDescription: "Lipton Green Tea 25 bags",
    bg: "Foods & Refreshment",
    profitCentre: "PC-FR-03",
    salesCategory: "Tea",
    smallC: "SC-003",
    brand: "Lipton",
    format: "Tea Bag",
    cbuCode: "CBU-50003456",
    materialDescription: "Lipton Green Tea Pure & Light 25 Tea Bags",
    typeOfNetwork: "Pack Change",
    copyCbu: "CBU-50003400",
    year: 2026,
    networkStatus: "Production Started",
    startDate: "2026-01-05",
    endDate: "2026-06-30",
    caseConfig: "24x1",
    ean: "8901030741296",
    netWeight: 37.5,
    grossWeight: 55,
    length: 120,
    width: 70,
    height: 65,
    itf: "18901030741293",
    ftrImagesLink: null,
    predecessorCode: "CBU-50003400",
    successorCode: "CBU-50003456",
    headerCode: null,
    csdIndexNo: "CSD-6678",
    pcAtChannelState: "PC-2026-Q1-Pan",
    sourcingMatrixSection: "Updated",
    assignedPerson: "Ankit Verma",
    geography: ["TAMIL NADU", "KARNATAKA", "MUMBAI-PUNE", "DELHI-GREATER DELHI", "WEST BENGAL", "BIHAR"],
    depot: ["CHKH", "BNDH", "MMDH", "DLGH", "KOPH", "PATH"],
    channel: ["GT", "MT", "Ecom", "Qcom", "KA"],
  },
  {
    cbuCreatedDate: "2026-02-05",
    networkChangeDate: null,
    annexureNumber: "ANN-2026-015",
    basepack: "BP-400",
    basepackDescription: "Lux Soft Touch Body Wash 250ml",
    bg: "Beauty & Personal Care",
    profitCentre: "PC-BPC-04",
    salesCategory: "Skin Cleansing",
    smallC: "SC-004",
    brand: "Lux",
    format: "Liquid",
    cbuCode: "CBU-50004567",
    materialDescription: "Lux Soft Touch French Rose Body Wash 250ml",
    typeOfNetwork: "New Launch",
    copyCbu: "CBU-50004500",
    year: 2026,
    networkStatus: "Draft",
    startDate: null,
    endDate: null,
    caseConfig: "12x1",
    ean: "8901030622489",
    netWeight: 250,
    grossWeight: 290,
    length: 65,
    width: 45,
    height: 180,
    itf: "18901030622486",
    ftrImagesLink: null,
    predecessorCode: null,
    successorCode: "CBU-50004567",
    headerCode: null,
    csdIndexNo: null,
    pcAtChannelState: null,
    sourcingMatrixSection: "Not Updated",
    assignedPerson: "Sneha Gupta",
    geography: [],
    depot: [],
    channel: [],
  },
  {
    cbuCreatedDate: "2025-12-20",
    networkChangeDate: "2026-01-15",
    annexureNumber: "ANN-2025-095",
    basepack: "BP-500",
    basepackDescription: "Knorr Soupy Noodles 300g",
    bg: "Foods & Refreshment",
    profitCentre: "PC-FR-05",
    salesCategory: "Savoury",
    smallC: "SC-005",
    brand: "Knorr",
    format: "Noodles",
    cbuCode: "CBU-50005678",
    materialDescription: "Knorr Soupy Noodles Mast Masala 300g Pack",
    typeOfNetwork: "Extension",
    copyCbu: "CBU-50005600",
    year: 2026,
    networkStatus: "FTR Approved",
    startDate: "2026-01-15",
    endDate: "2026-09-30",
    caseConfig: "24x1",
    ean: "8901030919527",
    netWeight: 300,
    grossWeight: 330,
    length: 200,
    width: 150,
    height: 40,
    itf: "18901030919524",
    ftrImagesLink: null,
    predecessorCode: "CBU-50005600",
    successorCode: "CBU-50005678",
    headerCode: "HDR-KN-01",
    csdIndexNo: "CSD-7789",
    pcAtChannelState: "PC-2026-Q1-Pan",
    sourcingMatrixSection: "Updated",
    assignedPerson: "Vikram Singh",
    geography: ["DELHI-GREATER DELHI", "PUNJAB-HARYANA-HILLS", "UTTAR PRADESH", "RAJASTHAN", "MADHYA PRADESH", "GUJARAT", "MUMBAI-PUNE", "GREATER MAHARASHTRA", "TAMIL NADU", "KARNATAKA", "WEST BENGAL", "BIHAR"],
    depot: ["DLGH", "JPRH", "VABH", "RJ2H", "INDH", "VJDH", "MMDH", "SHAH", "CHKH", "BNDH", "KOPH", "PATH"],
    channel: ["GT", "RD", "KA", "MT", "MT Retail", "Ecom"],
  },
];

listMasterStorage.seedEntries(SEEDS);

async function initStateService() {
  const entries = await listMasterStorage.getAll();
  stateStorage.seedStatuses(
    entries.map(e => ({ id: e.id, status: e.networkStatus || "Draft" }))
  );
}
initStateService();

export class MemStorage implements IStorage {
  private users: Map<string, User>;

  constructor() {
    this.users = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAllNetworkEntries(): Promise<NetworkEntry[]> {
    return listMasterStorage.getAll();
  }

  async getNetworkEntry(id: string): Promise<NetworkEntry | undefined> {
    return listMasterStorage.getById(id);
  }

  async createNetworkEntry(entry: InsertNetworkEntry): Promise<NetworkEntry> {
    return listMasterStorage.create(entry);
  }

  async updateNetworkEntry(id: string, entry: Partial<InsertNetworkEntry>): Promise<NetworkEntry | undefined> {
    return listMasterStorage.update(id, entry);
  }

  async deleteNetworkEntry(id: string): Promise<boolean> {
    return listMasterStorage.delete(id);
  }
}

export const storage = new MemStorage();
