# Transition risk agent ecosystem — simulated demo

**Presentation only.** This is a deterministic, fictional walkthrough, not a connected AI model, a production risk policy, or a real CBU decision. It does not read or write a live record, approve a request, change network status, or submit anything to SAP. Values and outcomes are illustrative; no accuracy or savings claim is implied.

## Where to present it

Open the **Preview** tab and toggle on the canvas. The five numbered scenes are laid out vertically in a separate area to the right of existing content. Start at **00 / Simulated agent ecosystem**, then move down through cases **01**, **02**, **03**, and the **04 / Presenter guide**. The canvas scene IDs begin with `risk-140-`; this document is a portable, reviewable copy of the same presentation.

## The handoff

```text
Fictional CBU intake
    ↓
Orchestrator dispatches five independent checks
    ├─ Data-quality agent: freshness and completeness
    ├─ Lifecycle agent: transition timing
    ├─ Stock agent: predecessor/successor DOH and SLOB
    ├─ Depot-readiness agent: MSTN by DC
    └─ Blocker agent: open service requests and approvals
    ↓
Risk synthesis: show evidence → drivers → illustrative level and confidence
    ↓
Network Planner reviews: accept / challenge / escalate (hypothetical only)
```

Each specialist returns **pass**, **concern**, **unknown**, or **conflict**, alongside a dummy source label. The illustrative interpretation used in these three stories is: complete, recent evidence without blockers supports **low risk**; several concrete blockers and an imminent date support **high risk**; missing, stale, or contradictory critical evidence produces **insufficient evidence** and manual investigation, never a safe default. **Medium risk** is a possible category in the framework but is not claimed by these stories. These are demonstration rules, not approved operational thresholds.

## Scene 00 — Introduce the ecosystem

**On screen:** Orchestrator → five specialist agents → risk synthesis → human handoff, with a visible safety guardrail.

**Presenter says:** “We are following how a proposed agent ecosystem would investigate a transition. Each agent handles one kind of evidence; the orchestrator gathers their results. The final label is an explained suggestion for a Network Planner, not an automatic decision. If important evidence is stale or conflicts, the system must not call it safe.”

## Scene 01 — Healthy transition

**Case:** `DEMO-CBU-A` (fictional).

| Specialist | Dummy source and observation | Finding |
| --- | --- | --- |
| Data quality | Network Visibility snapshot, 25 Sep 2026; recent for this demo | Pass |
| Lifecycle | Network Visibility change date, 18 Oct 2026; 22 days from the illustrative 26 Sep presentation date | Pass |
| Stock | Paid Bible / stock: predecessor DOH 2, successor DOH 10, SLOB no | Pass |
| Depot readiness | Paid Bible / depot: 4 of 4 DCs at or above 80% MSTN | Pass |
| Blockers | SR queue: no open request or approval blocker | Pass |

**Synthesis:** **Low risk; high confidence** because all five critical signals are present, recent, and have no flagged blocker. This is not a prediction of zero risk.

**Human review:** The planner conceptually accepts routine monitoring. The demo does not update a CBU.

**Presenter says:** “Every specialist returned usable evidence. There is no immediate issue in these dummy inputs, so the proposed outcome is low risk with continued monitoring.”

## Scene 02 — Concrete blockers

**Case:** `DEMO-CBU-B` (fictional).

| Specialist | Dummy source and observation | Finding |
| --- | --- | --- |
| Data quality | Network Visibility snapshot, 25 Sep 2026; recent for this demo | Pass |
| Lifecycle | Network Visibility change date, 02 Oct 2026; 6 days away | Concern |
| Stock | Paid Bible / stock: predecessor DOH 18, successor DOH 2, SLOB yes | Concern |
| Depot readiness | Paid Bible / depot: only 1 of 4 DCs at or above 80% MSTN | Concern |
| Blockers | SR queue: request pending; price and sourcing incomplete | Concern |

**Synthesis:** **High risk; high confidence** in the *concern*, not the eventual outcome. The imminent change date, stock imbalance, three readiness gaps, and pending request all visibly support intervention. The fresh snapshot does not cancel the other findings.

**Human review:** The planner conceptually accepts the concern and asks stock and depot owners for recovery plans while checking the pending SR. No request is approved or submitted.

**Presenter says:** “This is not high risk simply because an AI said so. Four separately shown signals point to action, and a planner still decides what to do.”

## Scene 03 — Stale and conflicting evidence

**Case:** `DEMO-CBU-C` (fictional).

| Specialist | Dummy source and observation | Finding |
| --- | --- | --- |
| Data quality | Network Visibility stock snapshot, 10 Aug 2026; stale for this demo | Concern |
| Lifecycle | Network Visibility change date, 05 Oct 2026; 9 days away | Concern |
| Stock | Paid Bible / stock: predecessor DOH missing, successor DOH 7, SLOB unknown | Unknown |
| Depot readiness | Paid Bible / depot: aggregate MSTN 92%, but only 1 of 4 DCs cleared | Conflict |
| Blockers | SR queue: request status missing; approvals cannot be verified | Unknown |

**Synthesis:** **Insufficient evidence; low confidence.** An urgent date matters, but it cannot justify a confident risk level while stock, depot readiness, and approval evidence are unresolved. In particular, the aggregate MSTN must not override the contradictory DC-level view.

**Human review:** The planner conceptually escalates for a fresh stock snapshot, reconciliation of depot readiness, and an SR status check. No low-risk label or real action is issued.

**Presenter says:** “The useful result here is knowing not to guess. Specialist agents have surfaced the conflict and missing inputs, so the planner knows exactly which checks to request.”

## Scene 04 — Presenter run of show

1. **Frame:** Pick one fictional CBU and repeat that all figures are dummy.
2. **Dispatch:** Trace the orchestrator’s handoff through all five independent specialists.
3. **Inspect:** Read each source value and its pass, concern, unknown, or conflict finding.
4. **Synthesize:** Point from the source values to the drivers, confidence, and risk outcome; never imply the labels are a production scoring policy.
5. **Review:** Describe a hypothetical planner acceptance, challenge, or escalation. Remind the audience that no real business action occurred.

**Closing comparison:** Case A has complete and clear evidence → low risk / monitor. Case B has complete evidence with concrete blockers → high risk / intervene. Case C has incomplete and contradictory evidence → insufficient evidence / investigate. The distinction between **risk** and **confidence in the available evidence** is deliberate.