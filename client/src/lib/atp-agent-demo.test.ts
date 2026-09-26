import assert from "node:assert/strict";
import test from "node:test";
import { DEMO_SCENARIOS, evaluateScenario } from "./atp-agent-demo";

const caseById = (id: string) => {
  const found = DEMO_SCENARIOS.find(s => s.id === id);
  assert.ok(found, `Missing fixture ${id}`);
  return found;
};

test("regional listing retains predecessor and maps successor to same CIC", () => {
  const result = evaluateScenario(caseById("regional-listing"));
  assert.equal(result.outcome, "Retain");
  assert.equal(result.after.predecessor, "Mapped");
  assert.equal(result.after.successor, "Mapped");
  assert.equal(result.after.cic, result.before.cic);
});

test("regional non-listing retires predecessor only in the proposed diff", () => {
  const result = evaluateScenario(caseById("regional-nonlisting"));
  assert.equal(result.outcome, "Switch");
  assert.equal(result.after.predecessor, "Inactive");
  assert.equal(result.after.successor, "Mapped");
});

test("national non-listing defers even if successor ATP is higher", () => {
  const s = caseById("national-defer");
  const result = evaluateScenario(s);
  assert.ok(s.successorAtp > s.predecessorAtp);
  assert.equal(result.outcome, "Defer");
  assert.equal(result.mode, "Manual");
  assert.deepEqual(result.after, result.before);
  assert.equal(result.checks.find(c => c.name === "National DOH/CLOT gate")?.passed, false);
});

test("national non-listing may propose full shift only if DOH and CLOT pass", () => {
  const s = { ...caseById("national-defer"), predecessorDoh: 2, clotTop70: true };
  const result = evaluateScenario(s);
  assert.equal(result.outcome, "Switch");
  assert.equal(result.mode, "Manual");
  assert.equal(result.after.predecessor, "Inactive");
});

test("mandatory new CIC or rundown cannot be bypassed by ATP", () => {
  const result = evaluateScenario(caseById("national-new-cic"));
  assert.equal(result.outcome, "Escalate");
  assert.deepEqual(result.after, result.before);
});

test("unknown classification and missing ATP escalate instead of guessing", () => {
  const missingRules = evaluateScenario(caseById("missing-rules"));
  assert.equal(missingRules.outcome, "Escalate");
  assert.deepEqual(missingRules.after, missingRules.before);
  const missingAtp = evaluateScenario({ ...caseById("regional-listing"), successorAtp: 0 });
  assert.equal(missingAtp.outcome, "Escalate");
  assert.deepEqual(missingAtp.after, missingAtp.before);
});