import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateTransitionRisk, isCurrentSnapshot,
  type BasepackEvidence, type ClearanceEvidence, type DepotStockEvidence,
  type NetworkEvidence, type RequestEvidence,
} from "./transition-risk-demo";

const today = new Date().toISOString().slice(0, 10);
const basepack: BasepackEvidence = {
  basepackCode: "BP-READY", basepackName: "Ready pack",
  effectiveStatus: "Draft", derivedStatus: "Draft",
};
const entry: NetworkEvidence = {
  id: "entry-1", basepack: "BP-READY", cbuCode: "CBU-1",
  networkChangeDate: today, networkStatus: "Pricing Updated",
  depot: ["DLGH"], mstnPercentage: 92, mstnByDepot: { DLGH: 92 },
  predecessorDoh: 4, successorDoh: 8, slobRisk: false,
};
const mapped: DepotStockEvidence = {
  id: "stock-1", basepackCode: "BP-READY", cbuCode: "CBU-1",
  depotCode: "DLGH", quantityCases: 96, snapshotDate: today,
};
const clearance: ClearanceEvidence = {
  criteriaMet: true, mstnCoverage: 100,
  materials: [{ code: "CBU-1", mstnCleared: true, mstnByDepot: { DLGH: 92 } }],
};

test("current explicit mapped stock and clearance support a pending activation request", () => {
  const review = evaluateTransitionRisk(entry, basepack, [mapped], [], clearance);
  assert.equal(review.activationReady, true);
  assert.deepEqual(review.unmappedStock, []);
  assert.equal(review.agents[2].evidence.status, "pass");
});

test("stock outside the network is based on quantities, not MSTN or DOH", () => {
  const outside = { ...mapped, id: "stock-2", depotCode: "ERKH", quantityCases: 75 };
  const review = evaluateTransitionRisk(entry, basepack, [mapped, outside], [], clearance);
  assert.deepEqual(review.unmappedStock.map(row => row.depotCode), ["ERKH"]);
  assert.match(review.agents[2].evidence.detail, /ERKH: 75 cases/);
  assert.deepEqual(evaluateTransitionRisk(entry, basepack, [], [], clearance).unmappedStock, []);
  assert.deepEqual(evaluateTransitionRisk(entry, basepack, [{ ...outside, quantityCases: 0 }], [], clearance).unmappedStock, []);
});

test("stale or missing stock and failed clearance block automatic actions", () => {
  const stale = { ...mapped, depotCode: "ERKH", snapshotDate: "2020-01-01" };
  assert.equal(isCurrentSnapshot(stale.snapshotDate), false);
  const review = evaluateTransitionRisk(entry, basepack, [stale], [], clearance);
  assert.equal(review.activationReady, false);
  assert.deepEqual(review.unmappedStock, []);
  assert.equal(review.assessment.level, "Insufficient evidence");
  assert.equal(evaluateTransitionRisk(entry, basepack, [mapped], [], { ...clearance, criteriaMet: false }).activationReady, false);
});

test("every CBU and mapped depot needs its own stock evidence for basepack activation", () => {
  const second: NetworkEvidence = {
    ...entry, id: "entry-2", cbuCode: "CBU-2", depot: ["DLGH", "MMDH"],
    mstnByDepot: { DLGH: 90, MMDH: 91 },
  };
  assert.equal(evaluateTransitionRisk(entry, basepack, [mapped], [], clearance, [entry, second]).activationReady, false);
  const complete = [
    mapped,
    { ...mapped, id: "stock-2", cbuCode: "CBU-2" },
    { ...mapped, id: "stock-3", cbuCode: "CBU-2", depotCode: "MMDH" },
  ];
  assert.equal(evaluateTransitionRisk(entry, basepack, complete, [], clearance, [entry, second]).activationReady, true);
});

test("pending approval prevents repeating activation and detects an existing amendment", () => {
  const pending: RequestEvidence[] = [
    { id: "SR-1", srType: "basepack-status-change", status: "pending", targetStatus: "Active Pack", basepackCode: "BP-READY" },
    { id: "SR-2", srType: "sourcing-amendment", status: "pending", cbuCode: "CBU-1", addedDepots: ["ERKH"] },
  ];
  const review = evaluateTransitionRisk(entry, basepack, [mapped], pending, clearance);
  assert.equal(review.activationReady, false);
  assert.equal(review.pendingActivation?.id, "SR-1");
  assert.equal(review.pendingAmendments[0].id, "SR-2");
  assert.equal(evaluateTransitionRisk(entry, basepack, [mapped], [{ ...pending[0], status: "approved" }], clearance).activationReady, true);
});