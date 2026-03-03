import { type NetworkEntry, type InsertNetworkEntry } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IListMasterStorage {
  getAll(): Promise<NetworkEntry[]>;
  getById(id: string): Promise<NetworkEntry | undefined>;
  create(entry: InsertNetworkEntry): Promise<NetworkEntry>;
  update(id: string, entry: Partial<InsertNetworkEntry>): Promise<NetworkEntry | undefined>;
  delete(id: string): Promise<boolean>;
}

export class ListMasterMemStorage implements IListMasterStorage {
  private entries: Map<string, NetworkEntry>;

  constructor() {
    this.entries = new Map();
  }

  seedEntries(seeds: InsertNetworkEntry[]) {
    seeds.forEach(seed => {
      const id = randomUUID();
      this.entries.set(id, {
        ...seed,
        id,
        createdAt: new Date(),
      } as NetworkEntry);
    });
  }

  async getAll(): Promise<NetworkEntry[]> {
    return Array.from(this.entries.values()).sort(
      (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
    );
  }

  async getById(id: string): Promise<NetworkEntry | undefined> {
    return this.entries.get(id);
  }

  async create(entry: InsertNetworkEntry): Promise<NetworkEntry> {
    const id = randomUUID();
    const networkEntry: NetworkEntry = {
      ...entry,
      id,
      createdAt: new Date(),
    } as NetworkEntry;
    this.entries.set(id, networkEntry);
    return networkEntry;
  }

  async update(id: string, entry: Partial<InsertNetworkEntry>): Promise<NetworkEntry | undefined> {
    const existing = this.entries.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...entry } as NetworkEntry;
    this.entries.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.entries.delete(id);
  }
}
