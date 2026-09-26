// Self-contained, deterministic presentation fixtures. Never read or write CCR data.
export type Coverage = "National" | "Regional";
export type Behaviour = "Listing" | "Non-Listing";
export type Decision = "approve" | "reject" | "escalate";
export type Outcome = "Retain" | "Switch" | "Defer" | "Escalate";

export interface DemoScenario {
  id: string;
  title: string;
  customer: string;
  customerCode: string;
  depot: string;
  coverage?: Coverage;
  behaviour?: Behaviour;
  changeType: string;
  rule?: { newCicRequired: boolean; rundownRequired: boolean; autoCcr: boolean };
  cic: string;
  predecessor: string;
  successor: string;
  alternate: string;
  predecessorAtp: number;
  successorAtp: number;
  alternateAtp: number;
  alternateEligible: boolean;
  predecessorDoh: number;
  successorDoh: number;
  clotTop70: boolean;
  summary: string;
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "regional-listing", title: "Regional listing · coexist", customer: "Metro Cash & Carry",
    customerCode: "MCC-DL-001", depot: "DLGH", coverage: "Regional", behaviour: "Listing",
    changeType: "Artwork Change", rule: { newCicRequired: false, rundownRequired: false, autoCcr: true },
    cic: "CIC-MCC2-MCC", predecessor: "CBU-50018922", successor: "CBU-50019022", alternate: "CBU-50019024",
    predecessorAtp: 420, successorAtp: 620, alternateAtp: 880, alternateEligible: false,
    predecessorDoh: 2, successorDoh: 8, clotTop70: true,
    summary: "ATP favours the successor, but listing rules keep both CBUs mapped to the same CIC. The higher-ATP alternate serves a different depot.",
  },
  {
    id: "regional-nonlisting", title: "Regional non-listing · switch", customer: "DMart",
    customerCode: "DMT-MH-001", depot: "VABH", coverage: "Regional", behaviour: "Non-Listing",
    changeType: "Artwork Change", rule: { newCicRequired: false, rundownRequired: false, autoCcr: true },
    cic: "CIC-DMT-014", predecessor: "CBU-50021010", successor: "CBU-50021011", alternate: "CBU-50021012",
    predecessorAtp: 95, successorAtp: 570, alternateAtp: 760, alternateEligible: false,
    predecessorDoh: 2, successorDoh: 9, clotTop70: true,
    summary: "The successor has usable ATP at this depot. Regional non-listing rules retire the predecessor for this customer code only.",
  },
  {
    id: "national-defer", title: "National non-listing · defer", customer: "BigBasket",
    customerCode: "BBK-MH-001", depot: "VABH", coverage: "National", behaviour: "Non-Listing",
    changeType: "Artwork Change", rule: { newCicRequired: false, rundownRequired: false, autoCcr: true },
    cic: "CIC-BBK-040", predecessor: "CBU-50022010", successor: "CBU-50022011", alternate: "CBU-50022012",
    predecessorAtp: 320, successorAtp: 810, alternateAtp: 970, alternateEligible: true,
    predecessorDoh: 5, successorDoh: 9, clotTop70: false,
    summary: "High successor ATP cannot override the national DOH/CLOT gate. This is a manual, full-depot decision; keep the current mapping until the gate is met.",
  },
  {
    id: "national-new-cic", title: "National · new CIC required", customer: "Amazon",
    customerCode: "AMZ-IN-001", depot: "HBDH", coverage: "National", behaviour: "Listing",
    changeType: "Formulation Change", rule: { newCicRequired: true, rundownRequired: true, autoCcr: false },
    cic: "CIC-AMZ-018", predecessor: "CBU-50023010", successor: "CBU-50023011", alternate: "CBU-50023012",
    predecessorAtp: 110, successorAtp: 690, alternateAtp: 810, alternateEligible: true,
    predecessorDoh: 2, successorDoh: 8, clotTop70: true,
    summary: "The change type requires a new CIC and rundown. ATP cannot authorize reuse of the predecessor's CIC; hand off for manual CIC assignment.",
  },
  {
    id: "missing-rules", title: "Unknown rules · escalate", customer: "Unclassified account",
    customerCode: "UNK-001", depot: "SRDH", changeType: "Artwork Change",
    cic: "CIC-UNK-003", predecessor: "CBU-50024010", successor: "CBU-50024011", alternate: "CBU-50024012",
    predecessorAtp: 150, successorAtp: 900, alternateAtp: 980, alternateEligible: true,
    predecessorDoh: 1, successorDoh: 10, clotTop70: true,
    summary: "Customer coverage and behaviour are missing. The agent cannot infer national or regional rules from ATP or a chain name.",
  },
];

export interface DemoResult {
  outcome: Outcome;
  reason: string;
  mode: string;
  checks: { name: string; result: string; passed: boolean }[];
  before: { predecessor: string; successor: string; cic: string };
  after: { predecessor: string; successor: string; cic: string };
}

export function evaluateScenario(s: DemoScenario): DemoResult {
  const before = { predecessor: "Mapped", successor: "Not mapped", cic: s.cic };
  const checks: DemoResult["checks"] = [
    { name: "Customer classification", result: s.coverage && s.behaviour ? `${s.coverage} · ${s.behaviour}` : "Missing — stop", passed: !!(s.coverage && s.behaviour) },
    { name: "Matched change-type ruleset", result: s.rule ? s.changeType : "Missing — stop", passed: !!s.rule },
    { name: "Successor ATP", result: `${s.successorAtp} dummy cases at ${s.depot}`, passed: s.successorAtp > 0 },
    { name: "Alternate eligibility", result: s.alternateEligible ? "Eligible for this depot" : "Excluded: not eligible at this depot", passed: s.alternateEligible },
  ];
  const base = { before, checks, after: { ...before } };
  if (!s.coverage || !s.behaviour || !s.rule) {
    return { ...base, outcome: "Escalate", mode: "No execution mode", reason: "Customer classification or ruleset missing. No mapping can be proposed safely." };
  }
  const mode = s.rule.newCicRequired || s.rule.rundownRequired || (s.coverage === "National" && s.behaviour === "Non-Listing")
    ? "Manual" : s.rule.autoCcr && s.coverage === "Regional" ? "Auto (live rule; demo is always review-only)" : "Semi-Auto";
  if (s.successorAtp <= 0) {
    return { ...base, mode, outcome: "Escalate", reason: "Usable successor ATP is missing. The agent cannot recommend a mapping action from incomplete evidence." };
  }
  checks.push({ name: "New CIC / rundown", result: s.rule.newCicRequired ? "New CIC required" : s.rule.rundownRequired ? "Rundown required" : "Neither required", passed: !s.rule.newCicRequired && !s.rule.rundownRequired });
  if (s.rule.newCicRequired || s.rule.rundownRequired) {
    return { ...base, mode, outcome: "Escalate", reason: "Manual CIC/rundown process takes precedence over ATP. No new CIC is invented by the demo." };
  }
  if (s.coverage === "National" && s.behaviour === "Non-Listing") {
    const gate = s.successorDoh > 5 && s.predecessorDoh < 3 && s.clotTop70;
    checks.push({ name: "National DOH/CLOT gate", result: `Successor DOH ${s.successorDoh} > 5; predecessor DOH ${s.predecessorDoh} < 3; top-70% CLOT: ${s.clotTop70 ? "yes" : "no"}`, passed: gate });
    if (!gate) return { ...base, mode, outcome: "Defer", reason: "National non-listing full-depot shift is deferred until the DOH/CLOT gate passes, regardless of ATP." };
    return { ...base, mode, outcome: "Switch", after: { ...before, predecessor: "Inactive", successor: "Mapped" }, reason: "All national gates pass; propose a manual, full-depot predecessor-to-successor shift." };
  }
  if (s.behaviour === "Listing") {
    return { ...base, mode, outcome: "Retain", after: { ...before, successor: "Mapped" }, reason: "Listing customer: retain the predecessor and add the successor to the same CIC. ATP does not displace the listing rule." };
  }
  return { ...base, mode, outcome: "Switch", after: { ...before, predecessor: "Inactive", successor: "Mapped" }, reason: "Regional non-listing: propose retiring the predecessor and mapping the successor for this customer code and depot." };
}