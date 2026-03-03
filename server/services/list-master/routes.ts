import { Router } from "express";
import { insertNetworkEntrySchema } from "@shared/schema";
import type { IListMasterStorage } from "./storage";

export function createListMasterRouter(storage: IListMasterStorage): Router {
  const router = Router();

  router.get("/", async (_req, res) => {
    try {
      const entries = await storage.getAll();
      res.json(entries);
    } catch (error) {
      res.status(500).json({ service: "list-master", message: "Failed to fetch entries" });
    }
  });

  router.get("/:id", async (req, res) => {
    try {
      const entry = await storage.getById(req.params.id);
      if (!entry) {
        return res.status(404).json({ service: "list-master", message: "Entry not found" });
      }
      res.json(entry);
    } catch (error) {
      res.status(500).json({ service: "list-master", message: "Failed to fetch entry" });
    }
  });

  router.post("/", async (req, res) => {
    try {
      const parsed = insertNetworkEntrySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ service: "list-master", message: "Validation failed", errors: parsed.error.flatten() });
      }
      const entry = await storage.create(parsed.data);
      res.status(201).json(entry);
    } catch (error) {
      res.status(500).json({ service: "list-master", message: "Failed to create entry" });
    }
  });

  router.patch("/:id", async (req, res) => {
    try {
      const partialSchema = insertNetworkEntrySchema.partial();
      const parsed = partialSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ service: "list-master", message: "Validation failed", errors: parsed.error.flatten() });
      }
      const entry = await storage.update(req.params.id, parsed.data);
      if (!entry) {
        return res.status(404).json({ service: "list-master", message: "Entry not found" });
      }
      res.json(entry);
    } catch (error) {
      res.status(500).json({ service: "list-master", message: "Failed to update entry" });
    }
  });

  router.delete("/:id", async (req, res) => {
    try {
      const success = await storage.delete(req.params.id);
      if (!success) {
        return res.status(404).json({ service: "list-master", message: "Entry not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ service: "list-master", message: "Failed to delete entry" });
    }
  });

  return router;
}
