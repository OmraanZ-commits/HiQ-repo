export type FindingStatus = "pass" | "concern" | "unknown" | "conflict";
export type RiskLevel = "Low" | "Medium" | "High" | "Insufficient evidence";
export type Confidence = "High" | "Low";
export type ReviewChoice = "accept" | "challenge" | "escalate";

export interface AgentEvidence {
  status: FindingStatus;
  source: string;
  detail: string;
}

export interface RiskDemoScenario {
  id: string;
  title: string;
  cbu: string;
  changeDate: string;
  changeDays: number;
  snapshotAgeDays: number | null;
  predecessorDoh: number | null;
  successorDoh: number | null;
  slobRisk: boolean | null;
  aggregateMstn: number | null;
  readyDepots: number | null;
  totalDepots: number;
  srStatus: "none" | "pending" | "unknown";
  priceAndSourcingComplete: boolean | null;
  summary: string;
}

export interface AgentFinding {
  id: "quality" | "lifecycle" | "stock" | "depot" | "blockers";
  name: string;
  role: string;
  evidence: AgentEvidence;
}

export interface RiskAssessment {
  level: RiskLevel;
  confidence: Confidence;
  drivers: string[];
  nextChecks: string[];
  explanation: string;
}

export const TRANSITION_RISK_SCENARIOS: RiskDemoScenario[] = [
  {
    id: "healthy",
    title: "Healthy transition",
    cbu: "DEMO-CBU-A",
    changeDate: "18 Oct 2026",
    changeDays: 22,
    snapshotAgeDays: 1,
    predecessorDoh: 2,
    successorDoh: 10,
    slobRisk: false,
    aggregateMstn: 100,
    readyDepots: 4,
    totalDepots: 4,
    srStatus: "none",
    priceAndSourcingComplete: true,
    summary: "Recent evidence, no material blocker, and all four depots ready.",
  },
  {
    id: "blockers",
    title: "Concrete blockers",
    cbu: "DEMO-CBU-B",
    changeDate: "02 Oct 2026",
    changeDays: 6,
    snapshotAgeDays: 1,
    predecessorDoh: 18,
    successorDoh: 2,
    slobRisk: true,
    aggregateMstn: 25,
    readyDepots: 1,
    totalDepots: 4,
    srStatus: "pending",
    priceAndSourcingComplete: false,
    summary: "An imminent change date combines with a stock imbalance, depot gaps, and a pending request.",
  },
  {
    id: "uncertain",
    title: "Stale and conflicting evidence",
    cbu: "DEMO-CBU-C",
    changeDate: "05 Oct 2026",
    changeDays: 9,
    snapshotAgeDays: 47,
    predecessorDoh: null,
    successorDoh: 7,
    slobRisk: null,
    aggregateMstn: 92,
    readyDepots: 1,
    totalDepots: 4,
    srStatus: "unknown",
    priceAndSourcingComplete: null,
    summary: "The stock snapshot is stale, predecessor DOH is missing, and aggregate MSTN conflicts with depot detail.",
  },
  {
    id: "monitor",
    title: "Manageable concern",
    cbu: "DEMO-CBU-D",
    changeDate: "13 Oct 2026",
    changeDays: 17,
    snapshotAgeDays: 2,
    predecessorDoh: 5,
    successorDoh: 8,
    slobRisk: false,
    aggregateMstn: 50,
    readyDepots: 2,
    totalDepots: 4,
    srStatus: "none",
    priceAndSourcingComplete: true,
    summary: "Evidence is current; half the depots still need readiness follow-up, without another blocker.",
  },
];

export const AGENT_ORDER: AgentFinding["id"][] = [
  "quality",
  "lifecycle",
  "stock",
  "depot",
  "blockers",
];

function makeEvidence(status: FindingStatus, source: string, detail: string): AgentEvidence {
  return { status, source, detail };
}

export function evaluateTransitionRisk(s: RiskDemoScenario): {
  agents: AgentFinding[];
  assessment: RiskAssessment;
} {
  const agents: AgentFinding[] = [
    {
      id: "quality",
      name: "Data quality",
      role: "Checks freshness and completeness",
      evidence: s.snapshotAgeDays == null
        ? makeEvidence("unknown", "Dummy Network Visibility snapshot", "Snapshot date is missing.")
        : s.snapshotAgeDays > 30
          ? makeEvidence("concern", "Dummy Network Visibility snapshot", `Snapshot is ${s.snapshotAgeDays} days old; treat critical stock evidence as stale.`)
          : makeEvidence("pass", "Dummy Network Visibility snapshot", `Snapshot is ${s.snapshotAgeDays} day${s.snapshotAgeDays === 1 ? "" : "s"} old; recent for this demo.`),
    },
    {
      id: "lifecycle",
      name: "Lifecycle",
      role: "Checks transition timing",
      evidence: s.changeDays <= 7
        ? makeEvidence("concern", "Dummy Network Visibility change date", `${s.changeDate} is ${s.changeDays} days away; confirm readiness before the planned change.`)
        : s.changeDays <= 21
          ? makeEvidence("concern", "Dummy Network Visibility change date", `${s.changeDate} is ${s.changeDays} days away; keep readiness checks visible.`)
          : makeEvidence("pass", "Dummy Network Visibility change date", `${s.changeDate} is ${s.changeDays} days away; no immediate timing concern in this story.`),
    },
    {
      id: "stock",
      name: "Stock health",
      role: "Compares predecessor/successor DOH and SLOB",
      evidence: s.predecessorDoh == null || s.successorDoh == null || s.slobRisk == null
        ? makeEvidence("unknown", "Dummy Paid Bible stock snapshot", `Predecessor DOH ${s.predecessorDoh ?? "missing"} · successor DOH ${s.successorDoh ?? "missing"} · SLOB ${s.slobRisk == null ? "unknown" : s.slobRisk ? "yes" : "no"}.`)
        : s.slobRisk || s.predecessorDoh - s.successorDoh >= 6
          ? makeEvidence("concern", "Dummy Paid Bible stock snapshot", `Predecessor DOH ${s.predecessorDoh} · successor DOH ${s.successorDoh} · SLOB ${s.slobRisk ? "yes" : "no"}; investigate stock imbalance.`)
          : makeEvidence("pass", "Dummy Paid Bible stock snapshot", `Predecessor DOH ${s.predecessorDoh} · successor DOH ${s.successorDoh} · SLOB no.`),
    },
    {
      id: "depot",
      name: "Depot readiness",
      role: "Checks MSTN coverage by DC",
      evidence: s.readyDepots == null || s.aggregateMstn == null
        ? makeEvidence("unknown", "Dummy Paid Bible depot view", "Depot-level readiness or aggregate MSTN is missing.")
        : s.aggregateMstn >= 80 && s.readyDepots / s.totalDepots < 0.7
          ? makeEvidence("conflict", "Dummy Paid Bible aggregate and depot views", `Aggregate MSTN ${s.aggregateMstn}% conflicts with only ${s.readyDepots}/${s.totalDepots} DCs ready.`)
          : s.readyDepots / s.totalDepots < 0.7
            ? makeEvidence("concern", "Dummy Paid Bible depot view", `${s.readyDepots}/${s.totalDepots} DCs meet the illustrative 80% MSTN readiness marker.`)
            : makeEvidence("pass", "Dummy Paid Bible depot view", `${s.readyDepots}/${s.totalDepots} DCs meet the illustrative 80% MSTN readiness marker.`),
    },
    {
      id: "blockers",
      name: "SR / approval blockers",
      role: "Checks the dummy request queue",
      evidence: s.srStatus === "unknown" || s.priceAndSourcingComplete == null
        ? makeEvidence("unknown", "Dummy SR queue", `Request ${s.srStatus}; price and sourcing ${s.priceAndSourcingComplete == null ? "not verified" : s.priceAndSourcingComplete ? "complete" : "incomplete"}.`)
        : s.srStatus === "pending" || !s.priceAndSourcingComplete
          ? makeEvidence("concern", "Dummy SR queue", `Request ${s.srStatus}; price and sourcing ${s.priceAndSourcingComplete ? "complete" : "incomplete"}.`)
          : makeEvidence("pass", "Dummy SR queue", "No open request; price and sourcing checks are complete in this story."),
    },
  ];

  const criticalEvidenceUnusable =
    s.snapshotAgeDays == null ||
    s.snapshotAgeDays > 30 ||
    s.predecessorDoh == null ||
    s.successorDoh == null ||
    s.slobRisk == null ||
    s.readyDepots == null ||
    s.aggregateMstn == null ||
    s.srStatus === "unknown" ||
    s.priceAndSourcingComplete == null ||
    agents.some(a => a.evidence.status === "conflict" || a.evidence.status === "unknown");

  const concerns = agents.filter(a => a.evidence.status === "concern");
  let level: RiskLevel;
  let confidence: Confidence;
  let explanation: string;

  if (criticalEvidenceUnusable) {
    level = "Insufficient evidence";
    confidence = "Low";
    explanation = "Critical evidence is stale, missing, or contradictory. The system cannot safely rank this case; send it for manual investigation.";
  } else if (concerns.length >= 3) {
    level = "High";
    confidence = "High";
    explanation = "Several independent, current signals identify concrete blockers. A planner should prioritize intervention.";
  } else if (concerns.length > 0) {
    level = "Medium";
    confidence = "High";
    explanation = "Evidence is current and usable, but at least one concern needs follow-up before the transition.";
  } else {
    level = "Low";
    confidence = "High";
    explanation = "The available evidence is current and no specialist found a material blocker. Continue routine monitoring.";
  }

  const drivers = concerns.map(a => `${a.name}: ${a.evidence.detail}`);
  if (level === "Insufficient evidence") {
    drivers.push(...agents
      .filter(a => a.evidence.status === "unknown" || a.evidence.status === "conflict")
      .map(a => `${a.name}: ${a.evidence.detail}`));
    if (s.snapshotAgeDays != null && s.snapshotAgeDays > 30) {
      drivers.push(`Data quality: stock snapshot is stale at ${s.snapshotAgeDays} days.`);
    }
  }

  const nextChecks = level === "Insufficient evidence"
    ? ["Request a fresh stock snapshot.", "Reconcile aggregate MSTN with DC-level readiness.", "Confirm the SR and approval status."]
    : level === "High"
      ? ["Ask stock and depot owners for recovery plans.", "Review the pending request before the planned change."]
      : level === "Medium"
        ? ["Confirm the remaining depot readiness gaps.", "Recheck the evidence before the planned change."]
        : ["Continue routine monitoring.", "Re-run the review if new blockers appear."];

  return {
    agents,
    assessment: { level, confidence, drivers, nextChecks, explanation },
  };
}