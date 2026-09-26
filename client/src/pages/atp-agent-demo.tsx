import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, ArrowRight, Check, ChevronRight, CircleAlert, ClipboardCheck,
  Database, GitCompareArrows, Pause, Play, RotateCcw, ShieldCheck, Sparkles, Zap,
} from "lucide-react";
import { UnileverHeader } from "@/components/unilever-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DEMO_SCENARIOS, evaluateScenario, type Decision } from "@/lib/atp-agent-demo";

const STAGES = [
  { title: "Intake", caption: "Frame the exception" },
  { title: "Evidence", caption: "Gather dummy ATP" },
  { title: "Ruleset", caption: "Classify the customer" },
  { title: "Gates", caption: "Apply hard constraints" },
  { title: "Compare", caption: "Evaluate candidates" },
  { title: "Proposal", caption: "Prepare mapping diff" },
  { title: "Explain", caption: "Present recommendation" },
  { title: "Human review", caption: "Choose a response" },
  { title: "Outcome", caption: "Close the demo" },
] as const;

const MAX_STAGE = STAGES.length - 1;

function Kicker({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-bold uppercase tracking-[0.17em] text-cyan-700">{children}</p>;
}

function EvidenceValue({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
      {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
    </div>
  );
}

export default function AtpAgentDemoPage() {
  const [scenarioId, setScenarioId] = useState(DEMO_SCENARIOS[0].id);
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [decision, setDecision] = useState<Decision | null>(null);
  const scenario = DEMO_SCENARIOS.find(s => s.id === scenarioId)!;
  const result = useMemo(() => evaluateScenario(scenario), [scenario]);

  useEffect(() => {
    if (!playing) return;
    if (stage >= 7) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => setStage(current => Math.min(current + 1, 7)), 2300);
    return () => window.clearTimeout(timer);
  }, [playing, stage]);

  function chooseScenario(id: string) {
    setPlaying(false);
    setStage(0);
    setDecision(null);
    setScenarioId(id);
  }

  function reset() {
    setPlaying(false);
    setStage(0);
    setDecision(null);
  }

  function goBack() {
    setPlaying(false);
    if (stage === MAX_STAGE) setDecision(null);
    setStage(s => Math.max(0, s - 1));
  }

  function next() {
    setPlaying(false);
    setStage(s => Math.min(MAX_STAGE, s + 1));
  }

  const statusTone = result.outcome === "Escalate" ? "bg-rose-50 text-rose-700 border-rose-200"
    : result.outcome === "Defer" ? "bg-amber-50 text-amber-800 border-amber-200"
    : "bg-emerald-50 text-emerald-700 border-emerald-200";

  return (
    <div className="min-h-screen bg-[#f3f6f9] text-slate-900">
      <UnileverHeader module="ccr" />
      <main className="mx-auto max-w-[1500px] px-4 pb-16 pt-4 sm:px-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <Link href="/ccr/mt-listing" className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-blue-700">
            <ArrowLeft className="h-4 w-4" /> Back to MT Listing
          </Link>
          <Badge variant="outline" className="border-amber-300 bg-amber-50 px-3 py-1 text-amber-800">
            DEMO ONLY · No live data or writes
          </Badge>
        </div>

        <section className="relative overflow-hidden rounded-2xl bg-[#092b55] px-6 py-5 text-white shadow-sm sm:px-9">
          <div className="absolute -right-16 -top-28 h-80 w-80 rounded-full border-[50px] border-cyan-400/10" aria-hidden="true" />
          <div className="relative max-w-4xl">
            <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200"><Sparkles className="h-4 w-4" /> Guided simulation</p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">ATP mapping exception agent</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-blue-100">
              Follow an agent from intake to human review. It checks customer rules before ATP, compares eligible CBUs,
              and prepares a proposal—without touching the real CCR or SAP workflows.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-medium text-blue-100">
              <span className="rounded-full bg-white/10 px-3 py-1.5">5 repeatable stories</span>
              <span className="rounded-full bg-white/10 px-3 py-1.5">National + regional rules</span>
              <span className="rounded-full bg-white/10 px-3 py-1.5">Human decision required</span>
            </div>
          </div>
        </section>

        <div className="mt-4 grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <Kicker>01 / Choose a story</Kicker>
              <p className="mb-4 mt-1 text-sm text-slate-500">Select a case to replay from the start.</p>
              <div className="space-y-2" role="group" aria-label="Demo scenarios">
                {DEMO_SCENARIOS.map((s, i) => (
                  <button
                    key={s.id} type="button" onClick={() => chooseScenario(s.id)}
                    aria-pressed={scenarioId === s.id}
                    data-testid={`scenario-${s.id}`}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${scenarioId === s.id ? "border-cyan-500 bg-cyan-50 ring-1 ring-cyan-500" : "border-slate-200 hover:border-cyan-300 hover:bg-slate-50"}`}
                  >
                    <span className="flex items-start gap-3">
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${scenarioId === s.id ? "bg-[#0a759f] text-white" : "bg-slate-100 text-slate-500"}`}>{i + 1}</span>
                      <span>
                        <span className="block text-sm font-semibold leading-tight">{s.title}</span>
                        <span className="mt-1 block text-xs text-slate-500">{s.customer} · {s.depot}</span>
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-xs leading-relaxed text-blue-900">
              <div className="mb-2 flex items-center gap-2 font-bold"><ShieldCheck className="h-4 w-4" /> Safety boundary</div>
              This is a deterministic, local simulation—not a connected AI model. Every ATP number, mapping and reviewer action is dummy data. Approve never sends a request to a server.
            </div>
          </aside>

          <div className="min-w-0 space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Kicker>02 / The agent&apos;s path</Kicker>
                  <h2 className="mt-1 text-lg font-bold">{scenario.customer} <span className="font-normal text-slate-400">/</span> {scenario.customerCode}</h2>
                  <p className="mt-1 text-xs text-slate-500">Predecessor {scenario.predecessor} → successor {scenario.successor} · {scenario.depot}</p>
                </div>
                <Badge variant="outline" className={statusTone}>{result.outcome} proposed</Badge>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5 xl:grid-cols-9" aria-label="Simulation workflow">
                {STAGES.map((item, i) => (
                  <div key={item.title} className={`rounded-lg border px-2 py-2 ${i === stage ? "border-cyan-500 bg-cyan-50" : i < stage ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-slate-50"}`}>
                    <div className={`mb-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${i === stage ? "bg-cyan-700 text-white" : i < stage ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"}`}>{i < stage ? <Check className="h-3 w-3" /> : i + 1}</div>
                    <p className="text-[11px] font-semibold leading-tight">{item.title}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                <Button size="sm" variant="outline" onClick={goBack} disabled={stage === 0} data-testid="demo-back"><ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back</Button>
                <Button size="sm" onClick={next} disabled={stage >= 7} data-testid="demo-next">Next <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="outline" onClick={() => setPlaying(v => !v)} disabled={stage >= 7} data-testid="demo-autoplay">
                  {playing ? <><Pause className="mr-1.5 h-3.5 w-3.5" /> Pause</> : <><Play className="mr-1.5 h-3.5 w-3.5" /> Auto-play</>}
                </Button>
                <Button size="sm" variant="ghost" onClick={reset} data-testid="demo-reset"><RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset</Button>
                <span className="ml-auto text-xs font-medium text-slate-500">Stage {stage + 1} of {STAGES.length} · {STAGES[stage].caption}</span>
              </div>
            </section>

            <section className="min-h-[310px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7" aria-live="polite" data-testid="demo-stage">
              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
                  {stage < 2 ? <Database className="h-5 w-5" /> : stage < 5 ? <ShieldCheck className="h-5 w-5" /> : stage < 7 ? <GitCompareArrows className="h-5 w-5" /> : <ClipboardCheck className="h-5 w-5" />}
                </div>
                <div><Kicker>Stage {String(stage + 1).padStart(2, "0")} / {STAGES.length}</Kicker><h2 className="mt-0.5 text-xl font-bold">{STAGES[stage].title}</h2></div>
              </div>

              {stage === 0 && <div className="space-y-4">
                <p className="max-w-3xl text-sm leading-relaxed text-slate-600">{scenario.summary}</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <EvidenceValue label="Customer" value={scenario.customer} note={scenario.customerCode} />
                  <EvidenceValue label="Location" value={scenario.depot} note="Dummy depot in this story" />
                  <EvidenceValue label="Exception" value="ATP-led review" note="No live record is opened" />
                </div>
                <p className="text-xs text-slate-500">Agent objective: assess whether an ATP-based mapping action is allowed under this customer&apos;s ruleset.</p>
              </div>}

              {stage === 1 && <div className="space-y-4">
                <p className="text-sm text-slate-600">Read the fixture&apos;s customer code, current CIC mapping and dummy ATP at this depot. These values are not retrieved from ECC or SAP.</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <EvidenceValue label="Predecessor ATP" value={`${scenario.predecessorAtp} cases`} note={scenario.predecessor} />
                  <EvidenceValue label="Successor ATP" value={`${scenario.successorAtp} cases`} note={scenario.successor} />
                  <EvidenceValue label="Alternate ATP" value={`${scenario.alternateAtp} cases`} note={scenario.alternate} />
                </div>
                <p className="text-xs text-slate-500">Current mapping: {scenario.predecessor} is Mapped to {scenario.cic}; {scenario.successor} is not mapped.</p>
              </div>}

              {stage === 2 && <div className="space-y-4">
                <p className="text-sm text-slate-600">Classification and change-type rules come first. A high ATP value cannot create a missing rule or override a mandatory CIC decision.</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <EvidenceValue label="Coverage" value={scenario.coverage ?? "Unknown"} />
                  <EvidenceValue label="Customer behaviour" value={scenario.behaviour ?? "Unknown"} />
                  <EvidenceValue label="Matched change rule" value={scenario.rule ? scenario.changeType : "No match"} />
                </div>
                <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <b>Execution mode:</b> {result.mode} · <b>New CIC:</b> {scenario.rule?.newCicRequired ? "required" : scenario.rule ? "not required" : "unknown"} · <b>Rundown:</b> {scenario.rule?.rundownRequired ? "required" : scenario.rule ? "not required" : "unknown"}
                </div>
              </div>}

              {stage === 3 && <div className="space-y-3">
                <p className="text-sm text-slate-600">Hard constraints are checked before ranking candidates. A failed mandatory gate means the agent cannot propose a switch.</p>
                {result.checks.map(check => (
                  <div key={check.name} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm">
                    <span className="flex items-center gap-2 font-medium">{check.passed ? <Check className="h-4 w-4 text-emerald-600" /> : <CircleAlert className="h-4 w-4 text-amber-600" />}{check.name}</span>
                    <span className="text-slate-600">{check.result}</span>
                  </div>
                ))}
              </div>}

              {stage === 4 && <div className="space-y-4">
                <p className="text-sm text-slate-600">The highest ATP is not always eligible. Candidate selection happens only after the customer rules and gate checks.</p>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[520px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-3">Candidate</th><th className="px-4 py-3">CBU</th><th className="px-4 py-3">Dummy ATP</th><th className="px-4 py-3">Disposition</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr><td className="px-4 py-3">Predecessor</td><td className="px-4 py-3 font-mono text-xs">{scenario.predecessor}</td><td className="px-4 py-3">{scenario.predecessorAtp}</td><td className="px-4 py-3">Current mapping</td></tr>
                      <tr><td className="px-4 py-3">Successor</td><td className="px-4 py-3 font-mono text-xs">{scenario.successor}</td><td className="px-4 py-3">{scenario.successorAtp}</td><td className="px-4 py-3">Subject to ruleset</td></tr>
                      <tr><td className="px-4 py-3">Alternate</td><td className="px-4 py-3 font-mono text-xs">{scenario.alternate}</td><td className="px-4 py-3">{scenario.alternateAtp}</td><td className="px-4 py-3">{scenario.alternateEligible ? "Eligible; not automatically selected" : "Excluded for this depot"}</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>}

              {stage === 5 && <div className="space-y-4">
                <p className="text-sm text-slate-600">Proposed change for {scenario.customerCode} · {scenario.depot}. This is a preview, not a write.</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(["before", "after"] as const).map(side => (
                    <div key={side} className={`rounded-xl border p-4 ${side === "after" ? "border-cyan-200 bg-cyan-50/60" : "border-slate-200 bg-slate-50"}`}>
                      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">{side === "before" ? "Current · dummy" : "Proposed · simulated"}</p>
                      <div className="space-y-2 text-sm">
                        <p><span className="text-slate-500">Predecessor:</span> <b>{result[side].predecessor}</b></p>
                        <p><span className="text-slate-500">Successor:</span> <b>{result[side].successor}</b></p>
                        <p><span className="text-slate-500">CIC:</span> <b className="font-mono">{result[side].cic}</b></p>
                      </div>
                    </div>
                  ))}
                </div>
                {result.outcome === "Defer" || result.outcome === "Escalate" ? <p className="text-xs text-amber-800">No mapping difference: the rule blocks a change.</p> : null}
              </div>}

              {stage === 6 && <div className="space-y-4">
                <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-bold ${statusTone}`}><Zap className="h-4 w-4" /> {result.outcome} recommendation</div>
                <p className="max-w-3xl text-lg font-semibold leading-relaxed">{result.reason}</p>
                <p className="text-sm text-slate-600">Evidence: {scenario.coverage ?? "unclassified"} {scenario.behaviour ?? "behaviour unknown"} · {scenario.changeType} · successor ATP {scenario.successorAtp} dummy cases. Human review is required even when the live ruleset would allow an automatic path.</p>
              </div>}

              {stage === 7 && <div className="space-y-5">
                <p className="text-sm text-slate-600">The presenter acts as the reviewer. This choice is recorded only in the current page session and cannot update a real CBU.</p>
                <div className={`rounded-xl border p-4 text-sm ${statusTone}`}><b>Agent proposal: {result.outcome}.</b> {result.reason}</div>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => { setDecision("approve"); setStage(MAX_STAGE); }} data-testid="demo-approve">Simulate approve <ChevronRight className="ml-1.5 h-4 w-4" /></Button>
                  <Button variant="outline" onClick={() => { setDecision("reject"); setStage(MAX_STAGE); }} data-testid="demo-reject">Simulate reject</Button>
                  <Button variant="outline" onClick={() => { setDecision("escalate"); setStage(MAX_STAGE); }} data-testid="demo-escalate">Simulate escalate</Button>
                </div>
                <p className="text-xs text-slate-500">Approving a defer or escalation accepts that no mapping change is proposed.</p>
              </div>}

              {stage === 8 && <div className="space-y-5">
                <div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-50 p-3 text-emerald-700"><ClipboardCheck className="h-6 w-6" /></div><div><Kicker>Simulation complete</Kicker><h3 className="text-xl font-bold">Reviewer chose: {decision}</h3></div></div>
                <p className="max-w-3xl text-sm leading-relaxed text-slate-700">
                  {decision === "approve" ? (result.outcome === "Defer" || result.outcome === "Escalate"
                    ? `The reviewer accepted the ${result.outcome.toLowerCase()} recommendation. The hypothetical mapping stays unchanged.`
                    : `The reviewer accepted the ${result.outcome.toLowerCase()} proposal. The previewed mapping would be ${result.after.predecessor.toLowerCase()} for the predecessor and ${result.after.successor.toLowerCase()} for the successor.`)
                    : decision === "reject" ? "The proposal was rejected. The hypothetical mapping stays as it was."
                      : "The case was escalated for manual investigation. The hypothetical mapping stays as it was."}
                </p>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm"><b>Why the agent proposed {result.outcome.toLowerCase()}:</b> {result.reason}</div>
                <p className="text-xs font-medium text-amber-800">Nothing was saved or submitted. All values and decisions in this walkthrough are simulated.</p>
                <Button onClick={reset} data-testid="demo-replay"><RotateCcw className="mr-2 h-4 w-4" /> Replay this story</Button>
              </div>}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}