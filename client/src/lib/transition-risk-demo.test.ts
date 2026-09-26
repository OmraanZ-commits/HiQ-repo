import assert from "node:assert/strict";
import test from "node:test";
import {
  TRANSITION_RISK_SCENARIOS,
  evaluateTransitionRisk,
  type RiskDemoScenario,
} from "./transition-risk-demo";

function scenario(id: string): RiskDemoScenario {
  const found = TRANSITION_RISK_SCENARIOS.find(item => item.id === id);
  assert.ok(found, `Missing scenario ${id}`);
  return found;
}

test("the four repeatable stories produce low, medium, high, and insufficient evidence", () => {
  const levels = TRANSITION_RISK_SCENARIOS.map(item => evaluateTransitionRisk(item).assessment.level);
  assert.deepEqual(levels, ["Low", "High", "Insufficient evidence", "Medium"]);
});

test("each specialist returns a sourced finding and the expected agent handoff order", () => {
  const { agents } = evaluateTransitionRisk(scenario("healthy"));
  assert.deepEqual(agents.map(agent => agent.id), ["quality", "lifecycle", "stock", "depot", "blockers"]);
  assert.ok(agents.every(agent => agent.evidence.source.startsWith("Dummy ")));
  assert.ok(agents.every(agent => agent.evidence.detail.length > 0));
});

test("multiple concrete concerns produce a high-risk recommendation with cited drivers", () => {
  const { agents, assessment } = evaluateTransitionRisk(scenario("blockers"));
  assert.equal(assessment.level, "High");
  assert.equal(assessment.confidence, "High");
  assert.equal(agents.filter(agent => agent.evidence.status === "concern").length, 4);
  assert.ok(assessment.drivers.some(driver => driver.includes("SLOB yes")));
  assert.ok(assessment.drivers.some(driver => driver.includes("1/4 DCs")));
});

test("stale, missing, or conflicting critical data cannot be classified as low risk", () => {
  const base = scenario("healthy");
  const cases: RiskDemoScenario[] = [
    { ...base, snapshotAgeDays: 47 },
    { ...base, predecessorDoh: null },
    { ...base, aggregateMstn: 92, readyDepots: 1 },
    { ...base, aggregateMstn: 20, readyDepots: 4 },
    { ...base, srStatus: "unknown" },
  ];

  for (const item of cases) {
    const { assessment } = evaluateTransitionRisk(item);
    assert.equal(assessment.level, "Insufficient evidence");
    assert.equal(assessment.confidence, "Low");
  }
});

test("a single manageable concern becomes medium rather than high risk", () => {
  const result = evaluateTransitionRisk(scenario("monitor"));
  assert.equal(result.assessment.level, "Medium");
  assert.equal(result.assessment.confidence, "High");
  assert.deepEqual(result.assessment.nextChecks, [
    "Confirm the remaining depot readiness gaps.",
    "Recheck the evidence before the planned change.",
  ]);
});