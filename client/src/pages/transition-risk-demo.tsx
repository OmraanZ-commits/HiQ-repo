import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  AlertTriangle, ArrowLeft, ArrowRight, Bot, CalendarDays, Check, CircleCheck,
  CircleHelp, ClipboardCheck, Database, FileCheck2, GitCompareArrows, MapPin,
  Package, RotateCcw, ShieldCheck, Sparkles,
} from "lucide-react";
import { UnileverHeader } from "@/components/unilever-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AGENT_ORDER, evaluateTransitionRisk,
  type AgentFinding, type BasepackEvidence, type ClearanceEvidence,
  type DepotStockEvidence, type FindingStatus, type NetworkEvidence,
  type RequestEvidence, type RiskLevel,
} from "@/lib/transition-risk-demo";

const STAGES = [
  "Intake", "Orchestrator", "Data quality", "Lifecycle", "Stock health",
  "Depot readiness", "SR / approvals", "Risk synthesis", "Action review", "Outcome",
] as const;

type ActionResponse = { request: RequestEvidence; existing: boolean };

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(typeof body?.detail === "string" ? body.detail : `${response.status} ${response.statusText}`);
  }
  return response.json();
}

function tomorrow(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function Kicker({ children }: { children: ReactNode }) {
  return <p className="text-[11px] font-bold uppercase tracking-[0.17em] text-cyan-700">{children}</p>;
}

function Metric({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
    <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
    {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
  </div>;
}

function tone(status: FindingStatus) {
  if (status === "pass") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "concern") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "conflict") return "border-rose-200 bg-rose-50 text-rose-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function riskTone(level: RiskLevel) {
  if (level === "Low") return tone("pass");
  if (level === "Medium") return tone("concern");
  if (level === "High") return tone("conflict");
  return tone("unknown");
}

function Finding({ agent }: { agent: AgentFinding }) {
  const Icon = agent.id === "quality" ? Database : agent.id === "lifecycle" ? CalendarDays
    : agent.id === "stock" ? Package : agent.id === "depot" ? MapPin : FileCheck2;
  return <div className={`rounded-xl border p-5 ${tone(agent.evidence.status)}`}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 text-lg font-bold"><Icon className="h-5 w-5" />{agent.name}</h3>
      <Badge variant="outline" className="border-current bg-white/70 text-current">{agent.evidence.status}</Badge>
    </div>
    <p className="mt-2 text-sm">{agent.evidence.detail}</p>
    <p className="mt-4 text-xs font-semibold">Source: {agent.evidence.source}</p>
  </div>;
}

function RequestLink({ request }: { request: RequestEvidence }) {
  const next = request.approvers?.find(step => step.status === "pending");
  return <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="font-bold">{request.srType === "basepack-status-change" ? "Activation request" : "Sourcing amendment"} · {request.status}</span>
      <Link href={`/paid-bible/requests/${encodeURIComponent(request.id)}`} className="font-semibold text-blue-700 underline underline-offset-2">
        View {request.id}
      </Link>
    </div>
    <p className="mt-2">Next human review: {next?.assignedTo || next?.label || "Check the request detail"}. The agent has not changed basepack status or depot mapping.</p>
  </div>;
}

export default function TransitionRiskDemoPage() {
  const [basepackCode, setBasepackCode] = useState<string | null>(null);
  const [cbuCode, setCbuCode] = useState<string | null>(null);
  const [stage, setStage] = useState(0);
  const [effectiveDate, setEffectiveDate] = useState(tomorrow);
  const [sourcingMode, setSourcingMode] = useState("");
  const [sourcingDepotCode, setSourcingDepotCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [result, setResult] = useState<ActionResponse | null>(null);

  const entriesQuery = useQuery<NetworkEvidence[]>({
    queryKey: ["/api/network-entries"],
    queryFn: () => requestJson("/api/network-entries"),
    staleTime: 0, refetchOnMount: "always", refetchOnWindowFocus: true,
  });
  const basepacksQuery = useQuery<BasepackEvidence[]>({
    queryKey: ["/api/paid-bible/basepacks"],
    queryFn: () => requestJson("/api/paid-bible/basepacks"),
    staleTime: 0, refetchOnMount: "always", refetchOnWindowFocus: true,
  });
  const stockQuery = useQuery<DepotStockEvidence[]>({
    queryKey: ["/api/transition-risk/depot-stock"],
    queryFn: () => requestJson("/api/transition-risk/depot-stock"),
    staleTime: 0, refetchOnMount: "always", refetchOnWindowFocus: true,
  });
  const requestsQuery = useQuery<RequestEvidence[]>({
    queryKey: ["/api/service-requests"],
    queryFn: () => requestJson("/api/service-requests"),
    staleTime: 0, refetchOnMount: "always", refetchOnWindowFocus: true,
  });
  const entries = entriesQuery.data ?? [];
  const basepacks = useMemo(() => {
    const withEntries = (basepacksQuery.data ?? []).filter(bp =>
      entries.some(entry => entry.basepack === bp.basepackCode));
    return withEntries.sort((a, b) => {
      const aHasStock = stockQuery.data?.some(row => row.basepackCode === a.basepackCode) ? 1 : 0;
      const bHasStock = stockQuery.data?.some(row => row.basepackCode === b.basepackCode) ? 1 : 0;
      return bHasStock - aHasStock || a.basepackCode.localeCompare(b.basepackCode);
    });
  }, [entries, basepacksQuery.data, stockQuery.data]);
  const selectedBasepack = basepacks.find(bp => bp.basepackCode === basepackCode) ?? basepacks[0];
  const materials = entries.filter(entry => entry.basepack === selectedBasepack?.basepackCode);
  const selectedEntry = materials.find(entry => entry.cbuCode === cbuCode) ?? materials[0];
  const clearanceQuery = useQuery<ClearanceEvidence>({
    queryKey: ["/api/mstn-doh/clearance-check", selectedBasepack?.basepackCode, entriesQuery.dataUpdatedAt],
    enabled: !!selectedBasepack && materials.length > 0,
    queryFn: () => requestJson("/api/mstn-doh/clearance-check", {
      method: "POST",
      body: JSON.stringify({ materials: materials.map(entry => ({
        code: entry.cbuCode, description: entry.materialDescription,
        mstnPct: entry.mstnPercentage, mstnByDepot: entry.mstnByDepot ?? {},
        networkChangeDate: entry.networkChangeDate,
        typeOfNetworkCode: entry.typeOfNetwork,
        priceStart: entry.priceUpdatedAt,
      })) }),
    }),
    staleTime: 0, refetchOnMount: "always", refetchOnWindowFocus: true,
  });
  const review = selectedEntry && selectedBasepack && requestsQuery.data && stockQuery.data
    ? evaluateTransitionRisk(selectedEntry, selectedBasepack, stockQuery.data, requestsQuery.data, clearanceQuery.data ?? null, materials)
    : null;
  const activeAgentId = stage >= 2 && stage <= 6 ? AGENT_ORDER[stage - 2] : null;
  const activeAgent = review?.agents.find(agent => agent.id === activeAgentId);
  const pendingForDepot = (depotCode: string) => review?.pendingAmendments.find(sr =>
    sr.addedDepots?.includes(depotCode));
  const actionDateValid = !!effectiveDate && effectiveDate >= tomorrow();

  function resetReview() {
    setStage(0);
    setResult(null);
    setActionError(null);
    setSourcingMode("");
    setSourcingDepotCode("");
  }

  async function submitAction(kind: "activation" | "sourcing", depotCode?: string) {
    if (!selectedEntry || !selectedBasepack || !actionDateValid || submitting) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const url = kind === "activation"
        ? "/api/transition-risk/activation-requests"
        : "/api/transition-risk/sourcing-amendments";
      const body = kind === "activation"
        ? { basepackCode: selectedBasepack.basepackCode, effectiveDate }
        : {
          cbuCode: selectedEntry.cbuCode, depotCode, effectiveDate, sourcingMode,
          sourcingDepotCode: sourcingMode === "centralized" ? sourcingDepotCode : undefined,
        };
      const response = await requestJson<ActionResponse>(url, { method: "POST", body: JSON.stringify(body) });
      setResult(response);
      setStage(9);
      await Promise.all([
        requestsQuery.refetch(), basepacksQuery.refetch(),
        entriesQuery.refetch(), stockQuery.refetch(), clearanceQuery.refetch(),
      ]);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "The request could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  }

  const loading = [entriesQuery, basepacksQuery, stockQuery, requestsQuery].some(query => query.isLoading);
  const failed = [entriesQuery, basepacksQuery, stockQuery, requestsQuery].find(query => query.isError);

  return <div className="min-h-screen bg-[#f3f6f9] text-slate-900">
    <UnileverHeader />
    <main className="mx-auto max-w-[1480px] px-4 pb-16 pt-4 sm:px-8">
      <Link href="/network" className="mb-3 inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-blue-700">
        <ArrowLeft className="h-4 w-4" /> Back to Network Visibility
      </Link>
      <section className="rounded-2xl bg-[#092b55] px-6 py-6 text-white shadow-sm sm:px-9">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200"><Sparkles className="h-4 w-4" /> Seed-backed agent workflow</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Transition risk agent ecosystem</h1>
        <p className="mt-2 max-w-3xl text-sm text-blue-100">Review stored network, clearance, stock, and request evidence. The agent can raise pending activation and sourcing requests; human approvers decide the final changes.</p>
      </section>

      {loading ? <div className="mt-4 rounded-2xl border bg-white p-8 text-sm" role="status">Loading network, stock, and request records…</div>
        : failed ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-6" role="alert">
          <p className="font-semibold">Could not load current evidence.</p>
          <p className="mt-1 text-sm">{failed.error instanceof Error ? failed.error.message : "Please try again."}</p>
          <Button className="mt-4" onClick={() => { void entriesQuery.refetch(); void basepacksQuery.refetch(); void stockQuery.refetch(); void requestsQuery.refetch(); }}>Retry</Button>
        </div>
          : !selectedBasepack || !selectedEntry ? <div className="mt-4 rounded-2xl border bg-white p-8 text-sm">No stored network basepacks are available for review.</div>
            : <div className="mt-4 grid gap-4 lg:grid-cols-[310px_minmax(0,1fr)]">
              <aside className="space-y-4">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <Kicker>01 / Select stored records</Kicker>
                  <p className="mt-2 text-xs text-slate-500">Basepacks are loaded from Paid Bible and network entries. Stock is read from depot-level snapshots.</p>
                  <label htmlFor="risk-basepack" className="mt-4 block text-xs font-semibold">Basepack</label>
                  <select id="risk-basepack" data-testid="risk-basepack" value={selectedBasepack.basepackCode}
                    onChange={event => { setBasepackCode(event.target.value); setCbuCode(null); resetReview(); }}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                    {basepacks.map(bp => <option key={bp.basepackCode} value={bp.basepackCode}>{bp.basepackCode} · {bp.basepackName}</option>)}
                  </select>
                  <label htmlFor="risk-cbu" className="mt-4 block text-xs font-semibold">CBU</label>
                  <select id="risk-cbu" data-testid="risk-cbu" value={selectedEntry.cbuCode ?? ""}
                    onChange={event => { setCbuCode(event.target.value); resetReview(); }}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                    {materials.map(entry => <option key={entry.id} value={entry.cbuCode ?? ""}>{entry.cbuCode} · {entry.materialDescription}</option>)}
                  </select>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge variant="outline">{selectedBasepack.effectiveStatus}</Badge>
                    <Badge variant="outline">{selectedEntry.networkStatus ?? "Status unavailable"}</Badge>
                  </div>
                </section>
                <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-xs leading-relaxed text-blue-950">
                  <div className="mb-2 flex items-center gap-2 font-bold"><ShieldCheck className="h-4 w-4" /> Approval boundary</div>
                  This view uses stored application records, including representative seeded stock snapshots. Risk labels explain evidence; they are not a predictive model or a replacement for established clearance rules. Only pending service requests can be created here. Nothing is activated, approved, or sent to SAP automatically.
                </section>
              </aside>
              <div className="min-w-0 space-y-4">
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><Kicker>02 / Guided review</Kicker><h2 className="mt-1 text-lg font-bold">{selectedEntry.cbuCode} <span className="font-normal text-slate-400">/</span> {selectedBasepack.basepackName}</h2></div>
                    <Badge variant="outline" className={stage < 7 ? "border-cyan-200 bg-cyan-50 text-cyan-800" : riskTone(review?.assessment.level ?? "Insufficient evidence")} data-testid="risk-summary-badge">
                      {stage < 7 ? "Evidence review" : `${review?.assessment.level} · ${review?.assessment.confidence} confidence`}
                    </Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5 xl:grid-cols-10" aria-label="Agent workflow">
                    {STAGES.map((name, index) => <div key={name} className={`rounded-lg border px-2 py-2 ${index === stage ? "border-cyan-500 bg-cyan-50" : index < stage ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-slate-50"}`}>
                      <div className={`mb-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${index === stage ? "bg-cyan-700 text-white" : index < stage ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"}`}>{index < stage ? <Check className="h-3 w-3" /> : index + 1}</div>
                      <p className="text-[10px] font-semibold leading-tight">{name}</p>
                    </div>)}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                    <Button size="sm" variant="outline" onClick={() => setStage(value => Math.max(0, value - 1))} disabled={stage === 0}><ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back</Button>
                    <Button size="sm" onClick={() => setStage(value => Math.min(8, value + 1))} disabled={stage >= 8}>Next <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={resetReview}><RotateCcw className="mr-1 h-3.5 w-3.5" /> Start over</Button>
                    <span className="ml-auto text-xs text-slate-500">Stage {stage + 1} of {STAGES.length}</span>
                  </div>
                </section>
                <section className="min-h-[330px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7" aria-live="polite" data-testid="risk-demo-stage">
                  <div className="mb-5 flex items-start gap-3">
                    <div className="rounded-xl bg-cyan-50 p-2.5 text-cyan-700">{stage === 0 ? <Database className="h-5 w-5" /> : stage === 1 ? <Bot className="h-5 w-5" /> : stage === 7 ? <GitCompareArrows className="h-5 w-5" /> : <ClipboardCheck className="h-5 w-5" />}</div>
                    <div><Kicker>Stage {String(stage + 1).padStart(2, "0")} / {STAGES.length}</Kicker><h2 className="text-xl font-bold">{STAGES[stage]}</h2></div>
                  </div>
                  {stage === 0 && <div className="space-y-4">
                    <p className="text-sm text-slate-600">This review uses the selected stored CBU and its basepack. Actions are checked again against current server data when submitted.</p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Metric label="CBU" value={selectedEntry.cbuCode ?? "Not recorded"} note={selectedEntry.materialDescription ?? undefined} />
                      <Metric label="Network change" value={selectedEntry.networkChangeDate || "Not recorded"} note={`Current status: ${selectedEntry.networkStatus ?? "unknown"}`} />
                      <Metric label="Basepack" value={selectedBasepack.basepackCode} note={`Paid Bible: ${selectedBasepack.effectiveStatus}`} />
                    </div>
                  </div>}
                  {stage === 1 && <div className="space-y-4">
                    <p className="text-sm text-slate-600">The orchestrator collects five separate findings, then identifies which request paths are supported by verified evidence.</p>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {review?.agents.map(agent => <div key={agent.id} className="rounded-xl border border-slate-200 p-4">
                        <p className="font-semibold">{agent.name}</p><p className="mt-1 text-xs text-slate-500">{agent.role}</p>
                        <p className="mt-2 text-xs text-cyan-800">{agent.evidence.source}</p>
                      </div>)}
                    </div>
                  </div>}
                  {activeAgent && <Finding agent={activeAgent} />}
                  {stage === 7 && review && <div className="space-y-4">
                    <div className={`rounded-xl border p-5 ${riskTone(review.assessment.level)}`}>
                      <h3 className="text-2xl font-bold">{review.assessment.level}</h3>
                      <p className="mt-2 text-sm">{review.assessment.explanation}</p>
                      <p className="mt-2 text-xs font-semibold">{review.assessment.confidence} evidence confidence; no numeric prediction score</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-4">
                      <h4 className="font-semibold">Evidence requiring attention</h4>
                      {review.assessment.drivers.length ? <ul className="mt-2 space-y-2 text-sm">{review.assessment.drivers.map(driver => <li key={driver}>• {driver}</li>)}</ul>
                        : <p className="mt-2 text-sm text-slate-500">No concern was identified in the available evidence.</p>}
                    </div>
                  </div>}
                  {stage === 8 && review && <div className="space-y-5">
                    <p className="text-sm text-slate-600">The agent can submit an eligible pending request. Final activation or depot mapping still requires the existing human approvals. Missing choices must be supplied by a planner.</p>
                    {clearanceQuery.isError && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm" role="alert">Activation clearance could not be loaded. <Button size="sm" variant="ghost" onClick={() => void clearanceQuery.refetch()}>Retry</Button></p>}
                    <label htmlFor="risk-effective-date" className="block text-sm font-semibold">Requested effective date
                      <input id="risk-effective-date" type="date" min={tomorrow()} value={effectiveDate} onChange={event => setEffectiveDate(event.target.value)}
                        className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 font-normal" />
                    </label>
                    {!actionDateValid && <p className="text-xs text-rose-700">Choose a date after today.</p>}
                    <div className="rounded-xl border border-slate-200 p-4">
                      <h3 className="font-bold">Basepack activation · {selectedBasepack.basepackCode}</h3>
                      <p className="mt-2 text-sm text-slate-600">{review.activationReady ? `Current clearance meets the existing criteria (${clearanceQuery.data?.mstnCoverage}% CBU coverage), with positive current stock at every mapped depot.` : review.pendingActivation ? "A request already awaits approval." : "Current clearance, stock evidence for every mapped depot, or depot scores are insufficient. The agent will not submit this request."}</p>
                      {review.pendingActivation ? <div className="mt-3"><RequestLink request={review.pendingActivation} /></div>
                        : <Button className="mt-3" disabled={!review.activationReady || !actionDateValid || submitting} onClick={() => void submitAction("activation")} data-testid="risk-submit-activation">Submit activation request</Button>}
                    </div>
                    <div className="rounded-xl border border-slate-200 p-4">
                      <h3 className="font-bold">Stock at unmapped depots · {selectedEntry.cbuCode}</h3>
                      {review.unmappedStock.length ? <div className="mt-3 space-y-3">
                        {review.unmappedStock.map(row => <div key={row.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                          <p className="font-semibold">{row.depotCode}: {row.quantityCases} cases · snapshot {row.snapshotDate}</p>
                          {pendingForDepot(row.depotCode) ? <div className="mt-2"><RequestLink request={pendingForDepot(row.depotCode)!} /></div>
                            : <div className="mt-3 space-y-3">
                              <label className="block text-xs font-semibold">Planner choice: sourcing mode
                                <select value={sourcingMode} onChange={event => { setSourcingMode(event.target.value); setSourcingDepotCode(""); }}
                                  className="mt-1 block w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal">
                                  <option value="">Select a mode</option><option value="decentralized">Decentralized</option><option value="centralized">Centralized</option>
                                </select>
                              </label>
                              {sourcingMode === "centralized" && <label className="block text-xs font-semibold">Planner choice: sourcing depot
                                <select value={sourcingDepotCode} onChange={event => setSourcingDepotCode(event.target.value)}
                                  className="mt-1 block w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal">
                                  <option value="">Select a mapped depot</option>
                                  {(selectedEntry.depot ?? []).map(code => <option key={code} value={code}>{code}</option>)}
                                </select>
                              </label>}
                              <Button disabled={!actionDateValid || !sourcingMode || (sourcingMode === "centralized" && !sourcingDepotCode) || submitting}
                                onClick={() => void submitAction("sourcing", row.depotCode)} data-testid={`risk-submit-sourcing-${row.depotCode}`}>
                                Start sourcing amendment
                              </Button>
                            </div>}
                        </div>)}
                      </div> : <p className="mt-2 text-sm text-slate-500">No current positive depot-stock record is outside this CBU’s mapped network. No amendment will be submitted.</p>}
                    </div>
                    {actionError && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900" role="alert"><AlertTriangle className="mr-2 inline h-4 w-4" />{actionError}</div>}
                    {!review.activationReady && !review.unmappedStock.length && <div className="flex items-center gap-2 text-sm text-slate-600"><CircleHelp className="h-4 w-4" />Human investigation is needed before an action can be raised.</div>}
                  </div>}
                  {stage === 9 && result && <div className="space-y-4">
                    <div className="flex items-center gap-3"><CircleCheck className="h-8 w-8 text-emerald-600" />
                      <div><Kicker>{result.existing ? "Existing pending request" : "Request created"}</Kicker><h3 className="text-xl font-bold">Human approval is next</h3></div>
                    </div>
                    <RequestLink request={result.request} />
                    <p className="text-sm text-slate-600">The agent submitted a service request from verified stored evidence. It did not activate the basepack or change the CBU’s depot mapping.</p>
                    <Button variant="outline" onClick={() => setStage(8)}><ArrowLeft className="mr-2 h-4 w-4" /> Review other actions</Button>
                  </div>}
                </section>
                <p className="flex items-center gap-2 text-xs text-slate-500"><ShieldCheck className="h-4 w-4" />Source data may change; every submission is rechecked by the server.</p>
              </div>
            </div>}
    </main>
  </div>;
}