import { Router } from "express";
import { STATUS_FLOW } from "@shared/schema";
import type { IStateStorage } from "./storage";
import type { IListMasterStorage } from "../list-master/storage";

export function createStateRouter(stateStorage: IStateStorage, listStorage: IListMasterStorage): Router {
  const router = Router();

  router.get("/flow", (_req, res) => {
    res.json({
      service: "state-management",
      statuses: STATUS_FLOW,
      totalSteps: STATUS_FLOW.length,
    });
  });

  router.get("/:entryId", async (req, res) => {
    try {
      const status = await stateStorage.getStatusByEntryId(req.params.entryId);
      if (!status) {
        return res.status(404).json({ service: "state-management", message: "No status found for this entry" });
      }
      const currentIndex = STATUS_FLOW.indexOf(status as any);
      res.json({
        service: "state-management",
        entryId: req.params.entryId,
        currentStatus: status,
        currentStep: currentIndex + 1,
        totalSteps: STATUS_FLOW.length,
        canAdvance: currentIndex < STATUS_FLOW.length - 1,
        nextStatus: currentIndex < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIndex + 1] : null,
      });
    } catch (error) {
      res.status(500).json({ service: "state-management", message: "Failed to fetch status" });
    }
  });

  router.get("/:entryId/history", async (req, res) => {
    try {
      const history = await stateStorage.getTransitionHistory(req.params.entryId);
      res.json({
        service: "state-management",
        entryId: req.params.entryId,
        transitions: history,
      });
    } catch (error) {
      res.status(500).json({ service: "state-management", message: "Failed to fetch history" });
    }
  });

  router.post("/:entryId/transition", async (req, res) => {
    try {
      const { entryId } = req.params;
      const { toStatus, triggeredBy, metadata } = req.body;

      if (!toStatus) {
        return res.status(400).json({ service: "state-management", message: "toStatus is required" });
      }

      if (!STATUS_FLOW.includes(toStatus)) {
        return res.status(400).json({
          service: "state-management",
          message: `Invalid status: ${toStatus}. Valid statuses: ${STATUS_FLOW.join(", ")}`,
        });
      }

      const currentStatus = await stateStorage.getStatusByEntryId(entryId);
      if (!currentStatus) {
        return res.status(404).json({ service: "state-management", message: "No status found for this entry" });
      }

      const currentIndex = STATUS_FLOW.indexOf(currentStatus as any);
      const targetIndex = STATUS_FLOW.indexOf(toStatus as any);

      if (targetIndex <= currentIndex) {
        return res.status(400).json({
          service: "state-management",
          message: `Cannot transition from "${currentStatus}" to "${toStatus}". Status can only move forward.`,
          currentStep: currentIndex + 1,
          targetStep: targetIndex + 1,
        });
      }

      if (toStatus === "Active") {
        const entry = await listStorage.getById(entryId);
        if (entry) {
          const errors: string[] = [];
          if (!entry.networkChangeDate) errors.push("Network Change Date is required");
          if (!entry.startDate) errors.push("Start Date is required");
          if (!entry.endDate) errors.push("End Date is required");
          if (entry.startDate && entry.networkChangeDate && entry.startDate < entry.networkChangeDate) {
            errors.push("Start Date must be on or after Network Change Date");
          }
          if (entry.startDate && entry.endDate && entry.endDate < entry.startDate) {
            errors.push("End Date must be on or after Start Date");
          }
          const geo = entry.geography || [];
          const dep = entry.depot || [];
          const ch = (entry.channel || []).filter(c => c !== "MT");
          if (geo.length === 0) errors.push("At least one cluster must be selected");
          if (dep.length === 0) errors.push("At least one depot must be selected");
          if (ch.length === 0) errors.push("At least one channel must be selected");

          if (errors.length > 0) {
            return res.status(400).json({
              service: "state-management",
              message: "Validation failed for activation",
              errors,
            });
          }
        }
      }

      const transition = await stateStorage.addTransition(
        entryId,
        currentStatus,
        toStatus,
        triggeredBy,
        metadata
      );

      await listStorage.update(entryId, { networkStatus: toStatus });

      res.json({
        service: "state-management",
        transition,
        currentStatus: toStatus,
        previousStatus: currentStatus,
      });
    } catch (error) {
      res.status(500).json({ service: "state-management", message: "Failed to transition status" });
    }
  });

  return router;
}
