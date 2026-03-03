import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, listMasterStorage, stateStorage } from "./storage";
import { createListMasterRouter } from "./services/list-master/routes";
import { createStateRouter } from "./services/state-management/routes";
import { insertNetworkEntrySchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const listMasterRouter = createListMasterRouter(listMasterStorage);
  app.use("/api/list-master", listMasterRouter);

  const stateRouter = createStateRouter(stateStorage, listMasterStorage);
  app.use("/api/state", stateRouter);

  app.get("/api/network-entries", async (_req, res) => {
    try {
      const entries = await storage.getAllNetworkEntries();
      res.json(entries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch entries" });
    }
  });

  app.get("/api/network-entries/:id", async (req, res) => {
    try {
      const entry = await storage.getNetworkEntry(req.params.id);
      if (!entry) {
        return res.status(404).json({ message: "Entry not found" });
      }
      res.json(entry);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch entry" });
    }
  });

  app.post("/api/network-entries", async (req, res) => {
    try {
      const parsed = insertNetworkEntrySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten() });
      }
      const entry = await storage.createNetworkEntry(parsed.data);
      res.status(201).json(entry);
    } catch (error) {
      res.status(500).json({ message: "Failed to create entry" });
    }
  });

  app.patch("/api/network-entries/:id", async (req, res) => {
    try {
      const partialSchema = insertNetworkEntrySchema.partial();
      const parsed = partialSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten() });
      }
      const entry = await storage.updateNetworkEntry(req.params.id, parsed.data);
      if (!entry) {
        return res.status(404).json({ message: "Entry not found" });
      }
      res.json(entry);
    } catch (error) {
      res.status(500).json({ message: "Failed to update entry" });
    }
  });

  app.delete("/api/network-entries/:id", async (req, res) => {
    try {
      const success = await storage.deleteNetworkEntry(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Entry not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete entry" });
    }
  });

  return httpServer;
}
