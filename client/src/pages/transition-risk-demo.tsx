import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  AlertTriangle, ArrowLeft, ArrowRight, Bot, CalendarDays, Check, ChevronRight,
  CircleCheck, CircleHelp, ClipboardCheck, Database, FileCheck2, GitCompareArrows,
  MapPin, Package, Pause, Play, RotateCcw, ShieldAlert, ShieldCheck, Sparkles, Users,
} from "lucide-react";
import { UnileverHeader } from "@/components/unilever-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AGENT_ORDER, TRANSITION_RISK_SCENARIOS, evaluateTransitionRisk,
  type AgentFinding, type FindingStatus, type ReviewChoice, type RiskLevel,
} from "@/lib/transition-risk-demo";

const STAGES = [
  { title: "Intake", caption: "Frame the dummy case" },
  { title: "Orchestrator", caption: "Dispatch specialist agents" },
  { title: "Data quality", caption: "Check freshness and completeness" },
  { title: "Lifecycle", caption: "Check transition timing" },
  { title: "Stock health", caption: "Compare DOH and SLOB" },
  { title: "Depot readiness", caption: "Review MSTN by DC" },
  { title: "SR / approvals", caption: "Find open blockers" },
  { title: "Risk synthesis", caption: "Explain level and confidence" },
  { title: "Human review", caption: "Choose a simulated response" },
  { title: "Outcome", caption: "Close and replay" },
] as const;

const REVIEW_CHOICES: { value: ReviewChoice; label: string; description: string }[] = [
  { value: "accept", label: "Accept recommendation", description: "Accept the advisory outcome for this simulated case." },
  { value: "challenge", label: "Challenge evidence", description: "Request another evidence review before deciding." },
  { value: "escalate", label: "Escalate for investigation", description: "Hand off for manual investigation." },
];

function Kicker({ children }: { children: string }) {
  return <p className="text-[11px] font-bold uppercase tracking-[0.17em] text-cyan-700">{children}</p>;
}

function Metric({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
      {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
    </div>
  );
}

function statusStyle(status: FindingStatus) {
  switch (status) {
    case "pass": return { badge: "border-emerald-200 bg-emerald-50 text-emerald-700", panel: "border-emerald-200 bg-emerald-50/60", icon: "text-emerald-600" };
    case "concern": return { badge: "border-amber-200 bg-amber-50 text-amber-800", panel: "border-amber-200 bg-amber-50/60", icon: "text-amber-600" };
    case "conflict": return { badge: "border-rose-200 bg-rose-50 text-rose-700", panel: "border-rose-200 bg-rose-50/60", icon: "text-rose-600" };
    default: return { badge: "border-slate-300 bg-slate-100 text-slate-700", panel: "border-slate-300 bg-slate-50", icon: "text-slate-500" };
  }
}

function statusIcon(status: FindingStatus) {
  if (status === "pass") return <CircleCheck className="h-4 w-4" />;
  if (status === "concern") return <AlertTriangle className="h-4 w-4" />;
  if (status === "conflict") return <GitCompareArrows className="h-4 w-4" />;
  return <CircleHelp className="h-4 w-4" />;
}

function riskStyle(level: RiskLevel) {
  if (level === "Low") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (level === "Medium") return "border-amber-200 bg-amber-50 text-amber-800";
  if (level === "High") return "border-rose-200 bg-rose-50 text-rose-800";
  return "border-slate-300 bg-slate-100 text-slate-800";
}

export default function TransitionRiskDemoPage() {
  const [scenarioId, setScenarioId] = useState(TRANSITION_RISK_SCENARIOS[0].id);
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [decision, setDecision] = useState<ReviewChoice | null>(null);
  const scenario = TRANSITION_RISK_SCENARIOS.find(item => item.id === scenarioId)!;
  const { agents, assessment } = useMemo(() => evaluateTransitionRisk(scenario), [scenario]);
  const activeAgentId = stage >= 2 && stage <= 6 ? AGENT_ORDER[stage - 2] : null;
  const activeAgent = activeAgentId ? agents.find(agent => agent.id === activeAgentId) : undefined;

  useEffect(() => {
    if (!playing) return;
    if (stage >= 8) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => setStage(current => Math.min(current + 1, 8)), 2500);
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
    if (stage === 9) setDecision(null);
    setStage(current => Math.max(0, current - 1));
  }

  function next() {
    setPlaying(false);
    if (stage < 8) setStage(current => Math.min(8, current + 1));
  }

  function chooseReview(choice: ReviewChoice) {
    setDecision(choice);
    setPlaying(false);
    setStage(9);
  }

  const decisionText = decision === "accept"
    ? `The presenter accepted the ${assessment.level.toLowerCase()} advisory for this demo. No business action was taken.`
    : decision === "challenge"
      ? "The presenter challenged the evidence and requested another simulated review. No business action was taken."
      : "The presenter escalated the fictional case for manual investigation. No business action was taken.";

  return (
    <div className="min-h-screen bg-[#f3f6f9] text-slate-900">
      <UnileverHeader />
      <main className="mx-auto max-w-[1500px] px-4 pb-16 pt-4 sm:px-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <Link href="/network" className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-blue-700">
            <ArrowLeft className="h-4 w-4" /> Back to Network Visibility
          </Link>
          <Badge variant="outline" className="border-amber-300 bg-amber-50 px-3 py-1 text-amber-800">
            DEMO ONLY · Dummy cases · No live data or writes
          </Badge>
        </div>

        <section className="relative overflow-hidden rounded-2xl bg-[#092b55] px-6 py-5 text-white shadow-sm sm:px-9">
          <div className="absolute -right-16 -top-28 h-80 w-80 rounded-full border-[50px] border-cyan-400/10" aria-hidden="true" />
          <div className="relative max-w-4xl">
            <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200"><Sparkles className="h-4 w-4" /> Guided simulation</p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Transition risk agent ecosystem</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-blue-100">
              Watch an orchestrator route a fictional CBU through five specialist checks, explain the risk,
              then hand the recommendation to a Network Planner. Every value and action stays in this demo.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-medium text-blue-100">
              <span className="rounded-full bg-white/10 px-3 py-1.5">4 repeatable cases</span>
              <span className="rounded-full bg-white/10 px-3 py-1.5">5 specialist agents</span>
              <span className="rounded-full bg-white/10 px-3 py-1.5">Human review required</span>
            </div>
          </div>
        </section>

        <div className="mt-4 grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <Kicker>01 / Choose a story</Kicker>
              <p className="mb-4 mt-1 text-sm text-slate-500">Choose a case to replay from the beginning.</p>
              <div className="space-y-2" role="group" aria-label="Risk demo scenarios">
                {TRANSITION_RISK_SCENARIOS.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => chooseScenario(item.id)}
                    aria-pressed={scenarioId === item.id}
                    data-testid={`risk-scenario-${item.id}`}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${scenarioId === item.id ? "border-cyan-500 bg-cyan-50 ring-1 ring-cyan-500" : "border-slate-200 hover:border-cyan-300 hover:bg-slate-50"}`}
                  >
                    <span className="flex items-start gap-3">
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${scenarioId === item.id ? "bg-[#0a759f] text-white" : "bg-slate-100 text-slate-500"}`}>{index + 1}</span>
                      <span>
                        <span className="block text-sm font-semibold leading-tight">{item.title}</span>
                        <span className="mt-1 block text-xs text-slate-500">{item.cbu} · {item.changeDays} days to change</span>
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-xs leading-relaxed text-blue-900">
              <div className="mb-2 flex items-center gap-2 font-bold"><ShieldCheck className="h-4 w-4" /> Safety boundary</div>
              This page uses deterministic dummy fixtures, not live CBU/SR data or AI inference. Risk categories are illustrative, not production policy. Review buttons never call a server or change a record.
            </div>
          </aside>

          <div className="min-w-0 space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Kicker>02 / Agent workflow</Kicker>
                  <h2 className="mt-1 text-lg font-bold">{scenario.cbu} <span className="font-normal text-slate-400">/</span> Fictional transition review</h2>
                  <p className="mt-1 text-xs text-slate-500">Planned change: {scenario.changeDate} · {scenario.changeDays} days away</p>
                </div>
                <Badge variant="outline" className={riskStyle(assessment.level)} data-testid="risk-summary-badge">{assessment.level} · {assessment.confidence} confidence</Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5 xl:grid-cols-10" aria-label="Simulation workflow">
                {STAGES.map((item, index) => (
                  <div key={item.title} className={`rounded-lg border px-2 py-2 ${index === stage ? "border-cyan-500 bg-cyan-50" : index < stage ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-slate-50"}`}>
                    <div className={`mb-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${index === stage ? "bg-cyan-700 text-white" : index < stage ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"}`}>
                      {index < stage ? <Check className="h-3 w-3" /> : index + 1}
                    </div>
                    <p className="text-[10px] font-semibold leading-tight">{item.title}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                <Button size="sm" variant="outline" onClick={goBack} disabled={stage === 0} data-testid="risk-demo-back"><ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back</Button>
                <Button size="sm" onClick={next} disabled={stage >= 8} data-testid="risk-demo-next">Next <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="outline" onClick={() => setPlaying(value => !value)} disabled={stage >= 8} data-testid="risk-demo-autoplay">
                  {playing ? <><Pause className="mr-1.5 h-3.5 w-3.5" /> Pause</> : <><Play className="mr-1.5 h-3.5 w-3.5" /> Auto-play</>}
                </Button>
                <Button size="sm" variant="ghost" onClick={reset} data-testid="risk-demo-reset"><RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset</Button>
                <span className="ml-auto text-xs font-medium text-slate-500">Stage {stage + 1} of {STAGES.length} · {STAGES[stage].caption}</span>
              </div>
            </section>

            <section className="min-h-[330px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7" aria-live="polite" data-testid="risk-demo-stage">
              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
                  {stage === 0 ? <Database className="h-5 w-5" /> : stage === 1 ? <Bot className="h-5 w-5" /> : stage >= 2 && stage <= 6 ? <ShieldCheck className="h-5 w-5" /> : stage === 7 ? <GitCompareArrows className="h-5 w-5" /> : <ClipboardCheck className="h-5 w-5" />}
                </div>
                <div><Kicker>Stage {String(stage + 1).padStart(2, "0")} / {STAGES.length}</Kicker><h2 className="mt-0.5 text-xl font-bold">{STAGES[stage].title}</h2></div>
              </div>

              {stage === 0 && <div className="space-y-4">
                <p className="max-w-3xl text-sm leading-relaxed text-slate-600">{scenario.summary}</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Metric label="Fictional CBU" value={scenario.cbu} note="No live record is opened" />
                  <Metric label="Planned change" value={scenario.changeDate} note={`${scenario.changeDays} days away in this fixture`} />
                  <Metric label="Run mode" value="Local demo" note="No API or external service" />
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <b>Presenter note:</b> This walkthrough demonstrates a possible review pattern. Its labels and illustrative markers are not an approved risk policy.
                </div>
              </div>}

              {stage === 1 && <div className="space-y-5">
                <p className="max-w-3xl text-sm text-slate-600">The orchestrator assigns separate evidence checks, waits for each dummy finding, then passes the bundle to risk synthesis. No specialist can approve or change the fictional CBU.</p>
                <div className="grid gap-3 md:grid-cols-[190px_1fr]">
                  <div className="flex flex-col items-center justify-center rounded-xl bg-[#092b55] p-5 text-center text-white">
                    <Bot className="mb-2 h-7 w-7 text-cyan-200" />
                    <b>Orchestrator</b>
                    <span className="mt-1 text-xs text-blue-100">Dispatch · collect · explain</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {agents.map(agent => (
                      <div key={agent.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-sm font-semibold">{agent.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{agent.role}</p>
                        <p className="mt-2 text-[11px] font-medium text-cyan-800">{agent.evidence.source}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
                  <Users className="h-4 w-4 shrink-0" /> All five checks return before a recommendation is shown; unknown or conflicting evidence stays visible.
                </div>
              </div>}

              {activeAgent && <AgentStage agent={activeAgent} index={stage - 1} scenario={scenario} />}

              {stage === 7 && <div className="space-y-5">
                <div className={`rounded-2xl border p-5 ${riskStyle(assessment.level)}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><Kicker>Illustrative determination</Kicker><h3 className="mt-1 text-2xl font-bold">{assessment.level}</h3></div>
                    <Badge variant="outline" className="border-current bg-white/60 text-current">{assessment.confidence} confidence</Badge>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed">{assessment.explanation}</p>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-bold"><GitCompareArrows className="h-4 w-4 text-cyan-700" /> Drivers from agent evidence</h4>
                    {assessment.drivers.length
                      ? <ul className="space-y-2">{assessment.drivers.map((driver, index) => <li key={index} className="text-sm leading-relaxed text-slate-700">• {driver}</li>)}</ul>
                      : <p className="text-sm text-slate-600">No material concern was raised by the specialist checks.</p>}
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-bold"><FileCheck2 className="h-4 w-4 text-cyan-700" /> Suggested next checks</h4>
                    <ul className="space-y-2">{assessment.nextChecks.map((check, index) => <li key={index} className="text-sm leading-relaxed text-slate-700">• {check}</li>)}</ul>
                  </div>
                </div>
                <p className="text-xs text-slate-500">No numeric prediction score is calculated. Confidence describes whether the displayed dummy evidence is usable, not whether a real-world outcome is guaranteed.</p>
              </div>}

              {stage === 8 && <div className="space-y-5">
                <p className="max-w-3xl text-sm leading-relaxed text-slate-600">The Network Planner is the decision-maker. Choose how the presenter would respond to this recommendation; the choice is kept only in this page session.</p>
                <div className={`rounded-xl border p-4 text-sm ${riskStyle(assessment.level)}`}>
                  <b>Agent ecosystem proposes: {assessment.level}.</b> {assessment.explanation}
                </div>
                <div className="grid gap-3 lg:grid-cols-3">
                  {REVIEW_CHOICES.map(choice => (
                    <button
                      key={choice.value}
                      type="button"
                      onClick={() => chooseReview(choice.value)}
                      data-testid={`risk-review-${choice.value}`}
                      className="rounded-xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-cyan-400 hover:bg-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600"
                    >
                      <span className="flex items-center gap-2 text-sm font-bold"><ChevronRight className="h-4 w-4 text-cyan-700" />{choice.label}</span>
                      <span className="mt-2 block text-xs leading-relaxed text-slate-500">{choice.description}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs font-medium text-amber-800">These are presentation choices only. Nothing is saved, approved, or submitted.</p>
              </div>}

              {stage === 9 && <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700"><ClipboardCheck className="h-6 w-6" /></div>
                  <div><Kicker>Simulation complete</Kicker><h3 className="text-xl font-bold">Planner chose: {decision}</h3></div>
                </div>
                <p className="max-w-3xl text-sm leading-relaxed text-slate-700">{decisionText}</p>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  <b>Risk assessment:</b> {assessment.level} · {assessment.confidence} confidence<br />
                  <span className="text-slate-600">{assessment.explanation}</span>
                </div>
                <p className="text-xs font-medium text-amber-800">No CBU, SR, approval, network status, or SAP record was read or changed. This outcome is simulated only.</p>
                <Button onClick={reset} data-testid="risk-demo-replay"><RotateCcw className="mr-2 h-4 w-4" /> Replay this case</Button>
              </div>}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function AgentStage({ agent, index, scenario }: { agent: AgentFinding; index: number; scenario: typeof TRANSITION_RISK_SCENARIOS[number] }) {
  const tone = statusStyle(agent.evidence.status);
  const icon = index === 1 ? <CalendarDays className="h-4 w-4" />
    : index === 2 ? <Package className="h-4 w-4" />
      : index === 3 ? <MapPin className="h-4 w-4" />
        : index === 4 ? <FileCheck2 className="h-4 w-4" />
          : <Database className="h-4 w-4" />;

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-slate-600">{agent.role}. This specialist returns evidence to the orchestrator; it does not make the planner&apos;s decision.</p>
      <div className={`rounded-2xl border p-5 ${tone.panel}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white p-3 text-cyan-800">{icon}</div>
            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Specialist {index + 1} of 5</p><h3 className="text-lg font-bold">{agent.name}</h3></div>
          </div>
          <Badge variant="outline" className={tone.badge}>{statusIcon(agent.evidence.status)}<span className="ml-1">{agent.evidence.status}</span></Badge>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_230px]">
          <div className="rounded-xl border border-white/80 bg-white/80 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Finding</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-800">{agent.evidence.detail}</p>
          </div>
          <div className="rounded-xl border border-white/80 bg-white/80 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Dummy source</p>
            <p className="mt-2 text-sm font-semibold text-slate-800">{agent.evidence.source}</p>
            <p className="mt-2 text-xs text-slate-500">Fixture for {scenario.cbu}</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-500"><Bot className="h-4 w-4 text-cyan-700" /> Finding handed back to the orchestrator for transparent synthesis.</div>
    </div>
  );
}