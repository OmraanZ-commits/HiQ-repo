import { randomUUID } from "crypto";

export interface StateTransition {
  id: string;
  entryId: string;
  fromStatus: string;
  toStatus: string;
  transitionDate: string;
  triggeredBy: string | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
}

export interface IStateStorage {
  getStatusByEntryId(entryId: string): Promise<string | undefined>;
  setStatus(entryId: string, status: string): Promise<void>;
  getAllStatuses(): Promise<Map<string, string>>;
  getTransitionHistory(entryId: string): Promise<StateTransition[]>;
  addTransition(entryId: string, fromStatus: string, toStatus: string, triggeredBy?: string, metadata?: Record<string, any>): Promise<StateTransition>;
}

export class StateMemStorage implements IStateStorage {
  private statuses: Map<string, string>;
  private transitions: StateTransition[];

  constructor() {
    this.statuses = new Map();
    this.transitions = [];
  }

  seedStatuses(entries: Array<{ id: string; status: string }>) {
    entries.forEach(({ id, status }) => {
      this.statuses.set(id, status);
    });
  }

  async getStatusByEntryId(entryId: string): Promise<string | undefined> {
    return this.statuses.get(entryId);
  }

  async setStatus(entryId: string, status: string): Promise<void> {
    this.statuses.set(entryId, status);
  }

  async getAllStatuses(): Promise<Map<string, string>> {
    return new Map(this.statuses);
  }

  async getTransitionHistory(entryId: string): Promise<StateTransition[]> {
    return this.transitions
      .filter(t => t.entryId === entryId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async addTransition(
    entryId: string,
    fromStatus: string,
    toStatus: string,
    triggeredBy?: string,
    metadata?: Record<string, any>
  ): Promise<StateTransition> {
    const transition: StateTransition = {
      id: randomUUID(),
      entryId,
      fromStatus,
      toStatus,
      transitionDate: new Date().toISOString().split("T")[0],
      triggeredBy: triggeredBy || null,
      metadata: metadata || null,
      createdAt: new Date(),
    };
    this.transitions.push(transition);
    this.statuses.set(entryId, toStatus);
    return transition;
  }
}
