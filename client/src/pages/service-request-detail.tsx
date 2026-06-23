import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, ListChecks, CheckCircle2, XCircle, LayoutDashboard, GitBranch, FileEdit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import { UnileverHeader } from "@/components/unilever-header";
import { SrStatusBadge, ApproverChain } from "@/components/sr-detail-components";
import { useSrStore, approveStep, rejectStep, SR_TYPE_META, CBU_SR_TYPES } from "@/lib/sr-store";
import { CbuDetailSection } from "@/components/basepack-cbu-sections";
import type { CbuSectionRecord } from "@/components/basepack-cbu-sections";

function FieldCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3 min-w-0 border-b last:border-b-0">
      <span className="w-40 flex-shrink-0 text-sm text-muted-foreground pt-0.5">{label}</span>
      <span className="flex-1 text-sm font-medium text-foreground">{children}</span>
    </div>
  );
}

export default function ServiceRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const { requests } = useSrStore();
  const request = requests.find(r => r.id === id);

  // Hooks must be called unconditionally — before any early return
  const bpCode = request?.basepackCode;
  const { data: bpProfile } = useQuery<{ cbus: CbuSectionRecord[] }>({
    queryKey: ["/api/paid-bible/basepacks", bpCode],
    queryFn: async () => {
      const r = await fetch(`/api/paid-bible/basepacks/${bpCode}`);
      if (!r.ok) throw new Error("failed");
      return r.json();
    },
    enabled: !!bpCode,
  });

  const { data: geoDepotMap } = useQuery<Record<string, string[]>>({
    queryKey: ["/api/reference-data/geography-depot-map"],
    enabled: request?.srType === "geo-extension",
  });

  if (!request) {
    return (
      <div className="min-h-screen bg-background">
        <UnileverHeader module="paid-bible" activeTab="service-requests"
          onTabChange={tab => navigate(`/paid-bible?tab=${tab}`)} />
        <div className="flex items-center justify-center py-40 flex-col gap-4">
          <ListChecks className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-muted-foreground">Service request not found.</p>
          <Button variant="outline" onClick={() => navigate("/paid-bible?tab=service-requests")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Service Requests
          </Button>
        </div>
      </div>
    );
  }

  const isCbu           = CBU_SR_TYPES.includes(request.srType);
  const meta            = SR_TYPE_META[request.srType];
  const doneSteps       = request.approvers.filter(a => a.status === "approved").length;
  const pct             = request.approvers.length > 0 ? (doneSteps / request.approvers.length) * 100 : 0;
  const pendingApprovals = request.approvers.filter(a => a.status === "pending").length;
  const pendingApprover = request.approvers.find(a => a.status === "pending");
  const pendingWith     = pendingApprover?.label ?? "—";

  const allCbus: CbuSectionRecord[] = bpProfile?.cbus ?? [];
  const relevantCbus = isCbu && request.cbuCode
    ? allCbus.filter(c => c.cbuCode === request.cbuCode)
    : allCbus;

  const pageTitle  = isCbu ? (request.cbuDescription || request.cbuCode || "—") : request.basepackName;
  const pageSubtitle = isCbu ? request.cbuCode : request.basepackCode;

  return (
    <div className="min-h-screen bg-background">
      <UnileverHeader module="paid-bible" activeTab="service-requests"
        onTabChange={tab => navigate(`/paid-bible?tab=${tab}`)} />

      <main className="max-w-[1100px] mx-auto px-6 py-6">

        {/* ── Page header ───────────────────────────────────────────────────── */}
        <div className="flex items-start gap-4 mb-6">
          <Button
            variant="ghost" size="icon"
            onClick={() => navigate("/paid-bible?tab=service-requests")}
            data-testid="button-back-to-requests"
            className="mt-0.5 flex-shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-mono font-semibold text-slate-400">{request.id}</span>
              <Badge variant="secondary" className={`text-xs h-5 border ${meta.colorClass}`}>
                <FileEdit className="h-3 w-3 mr-1" /> {meta.label}
              </Badge>
            </div>
            <h1 className="text-xl font-bold">
              {pageTitle}
              <span className="ml-2 text-sm font-mono text-muted-foreground font-normal">{pageSubtitle}</span>
            </h1>
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-6">
            <TabsList className="justify-start bg-muted/50 p-1">
              <TabsTrigger value="overview" className="gap-2" data-testid="tab-overview">
                <LayoutDashboard className="h-4 w-4" /> Overview
              </TabsTrigger>
              <TabsTrigger value="approval" className="gap-2" data-testid="tab-approval">
                <GitBranch className="h-4 w-4" /> Approval Chain
                {pendingApprovals > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                    {pendingApprovals}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
            <SrStatusBadge status={request.overallStatus} />
          </div>

          {/* ── Overview tab ─────────────────────────────────────────────── */}
          <TabsContent value="overview" className="space-y-6">

            {/* Approval progress summary */}
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                Request Summary
              </h2>
              <span className="flex items-center gap-2.5">
                <span className="text-sm text-muted-foreground" data-testid="text-approval-progress">
                  {doneSteps}/{request.approvers.length} approved
                </span>
                <div className="w-28 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#1f36c7] to-[#0d8ecf] rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </span>
            </div>

            {/* ── CBU SR: two-card summary + change table + justification ── */}
            {isCbu && (
              <>
                {/* Two side-by-side cards */}
                <div className="grid grid-cols-2 gap-5">
                  {/* Left card — CBU + basepack identity */}
                  <div className="rounded-xl border bg-white shadow-sm px-5 py-4 divide-y divide-border/60">
                    <FieldCell label="CBU Code">
                      <span className="font-mono">{request.cbuCode || "—"}</span>
                    </FieldCell>
                    <FieldCell label="CBU Description">{request.cbuDescription || "—"}</FieldCell>
                    <FieldCell label="Basepack Name">{request.basepackName || "—"}</FieldCell>
                    <FieldCell label="Basepack Code">
                      <span className="font-mono">{request.basepackCode || "—"}</span>
                    </FieldCell>
                    <FieldCell label="Brand">{request.brand || "—"}</FieldCell>
                    <FieldCell label="Business Group">{request.bg || "—"}</FieldCell>
                  </div>

                  {/* Right card — request meta + justification */}
                  <div className="rounded-xl border bg-white shadow-sm px-5 py-4 divide-y divide-border/60">
                    <FieldCell label="Raised By">{request.raisedBy}</FieldCell>
                    <FieldCell label="Created On">{request.raisedAt}</FieldCell>
                    <FieldCell label="Pending With">
                      <div>
                        <div className="font-medium">{pendingApprover?.assignedTo ?? pendingApprover?.label ?? "—"}</div>
                        {pendingApprover?.label && (
                          <div className="text-xs text-muted-foreground mt-0.5">{pendingApprover.label}</div>
                        )}
                      </div>
                    </FieldCell>
                    {request.justification && (
                      <FieldCell label="Business Justification">
                        <span className="leading-relaxed whitespace-pre-wrap">{request.justification}</span>
                      </FieldCell>
                    )}
                  </div>
                </div>

                {/* Current → Requested change table */}
                <div>
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                    Change Details
                  </h2>

                  {request.srType === "geo-extension" && ((request.addedGeos?.length ?? 0) > 0 || (request.removedGeos?.length ?? 0) > 0 || (request.removedDepots?.length ?? 0) > 0) ? (
                    /* Geo-extension: additions + removals */
                    <div className="space-y-3">
                      {(request.addedGeos?.length ?? 0) > 0 && (
                        <div className="rounded-xl border bg-white shadow-sm overflow-hidden" data-testid="section-geo-extension">
                          <div className="grid grid-cols-[1fr_1fr] px-5 py-2.5 bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                            <span>Adding Geography</span>
                            <span>Depots</span>
                          </div>
                          <div className="divide-y divide-slate-100">
                            {request.addedGeos!.map(geo => {
                              const refDepots   = geoDepotMap?.[geo] ?? [];
                              const addedDepots = request.addedDepots ?? [];
                              const matched = addedDepots.filter(d => refDepots.includes(d));
                              const depots = matched.length > 0 ? matched : addedDepots;
                              return (
                                <div
                                  key={geo}
                                  className="grid grid-cols-[1fr_1fr] items-center px-5 py-3"
                                  data-testid={`geo-row-${geo}`}
                                >
                                  <Badge
                                    className="bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs font-normal w-fit"
                                    data-testid={`badge-geo-${geo}`}
                                  >
                                    {geo}
                                  </Badge>
                                  <div className="flex flex-wrap gap-1.5" data-testid={`depots-for-${geo}`}>
                                    {depots.length > 0 ? depots.map(d => (
                                      <Badge key={d} variant="outline" className="text-xs font-mono" data-testid={`badge-depot-${d}`}>{d}</Badge>
                                    )) : (
                                      <span className="text-xs text-muted-foreground italic">—</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {((request.removedGeos?.length ?? 0) > 0 || (request.removedDepots?.length ?? 0) > 0) && (
                        <div className="rounded-xl border border-red-200 bg-red-50/40 shadow-sm overflow-hidden" data-testid="section-geo-removals">
                          <div className="grid grid-cols-[1fr_1fr] px-5 py-2.5 bg-red-100/60 border-b border-red-200 text-[10px] font-semibold text-red-700 uppercase tracking-widest">
                            <span>Removing Geography</span>
                            <span>Depots Removed</span>
                          </div>
                          <div className="divide-y divide-red-100">
                            {(() => {
                              const allRemovedDepots = request.removedDepots ?? [];
                              const removedGeoList   = request.removedGeos ?? [];
                              // For each removed geo, find which removed depots belong to it
                              const geoDepotPairs = removedGeoList.map(geo => {
                                const refDepots = geoDepotMap?.[geo] ?? [];
                                const matched   = allRemovedDepots.filter(d => refDepots.includes(d));
                                return { geo, depots: matched };
                              });
                              // Depots not covered by any removed geo (retained-geo depot removals)
                              const coveredDepots  = new Set(geoDepotPairs.flatMap(p => p.depots));
                              const unmatchedDepots = allRemovedDepots.filter(d => !coveredDepots.has(d));
                              return (
                                <>
                                  {/* Per-geo rows (whole geo removed) */}
                                  {geoDepotPairs.map(({ geo, depots }) => (
                                    <div
                                      key={geo}
                                      className="grid grid-cols-[1fr_1fr] items-center px-5 py-3"
                                      data-testid={`geo-removal-row-${geo}`}
                                    >
                                      <Badge
                                        className="bg-red-100 text-red-700 border border-red-300 text-xs font-normal w-fit line-through"
                                        data-testid={`badge-removed-geo-${geo}`}
                                      >
                                        {geo}
                                      </Badge>
                                      <div className="flex flex-wrap gap-1.5" data-testid={`removed-depots-for-${geo}`}>
                                        {depots.length > 0 ? depots.map(d => (
                                          <Badge key={d} className="text-xs font-mono bg-red-50 text-red-600 border-red-200 line-through" data-testid={`badge-removed-depot-${d}`}>{d}</Badge>
                                        )) : (
                                          <span className="text-xs text-muted-foreground italic">—</span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                  {/* Depot-only row: depots removed from retained geos */}
                                  {unmatchedDepots.length > 0 && (
                                    <div
                                      className="grid grid-cols-[1fr_1fr] items-start px-5 py-3"
                                      data-testid="geo-depot-only-removal-row"
                                    >
                                      <span className="text-xs text-muted-foreground italic">Depot-level only</span>
                                      <div className="flex flex-wrap gap-1.5" data-testid="removed-depots-flat">
                                        {unmatchedDepots.map(d => (
                                          <Badge key={d} className="text-xs font-mono bg-red-50 text-red-600 border-red-200 line-through" data-testid={`badge-removed-depot-${d}`}>{d}</Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : request.srType === "channel-extension" && (request.addedChannels?.length ?? 0) > 0 ? (
                    /* Structured channel-extension view */
                    <div className="rounded-xl border bg-white shadow-sm divide-y divide-border/60">
                      <div className="px-5 py-4 space-y-1.5">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Adding Channels
                        </p>
                        <div className="flex flex-wrap gap-1.5 pt-1" data-testid="section-added-channels">
                          {request.addedChannels!.map(c => (
                            <Badge key={c} className="bg-violet-100 text-violet-700 border border-violet-300 text-xs font-normal" data-testid={`badge-channel-${c}`}>
                              {c}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : request.srType === "sourcing-amendment" && request.sourcingMode ? (
                    /* Structured sourcing-amendment view */
                    <div className="rounded-xl border bg-white shadow-sm divide-y divide-border/60">
                      <div className="px-5 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Current Mode
                            </p>
                            <Badge className="bg-blue-100 text-blue-700 border border-blue-300 text-xs font-normal" data-testid="badge-sourcing-current-mode">
                              Decentralized
                            </Badge>
                          </div>
                          <div className="space-y-1.5">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Requested Mode
                            </p>
                            <Badge
                              className={request.sourcingMode === "centralized"
                                ? "bg-amber-100 text-amber-700 border border-amber-300 text-xs font-normal"
                                : "bg-blue-100 text-blue-700 border border-blue-300 text-xs font-normal"}
                              data-testid="badge-sourcing-requested-mode"
                            >
                              {request.sourcingMode === "centralized" ? "Centralized" : "Decentralized"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      {request.sourcingMode === "centralized" && request.sourcingDepotMapping && Object.keys(request.sourcingDepotMapping).length > 0 && (
                        <div className="px-5 py-4 space-y-1.5" data-testid="section-depot-mapping">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Depot Sourcing Mapping
                          </p>
                          <div className="border rounded-lg overflow-hidden mt-2">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-muted/50 border-b">
                                  <th className="text-left py-1.5 px-3 font-medium w-[140px]">Depot</th>
                                  <th className="text-left py-1.5 px-3 font-medium">Sourcing Depot</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.entries(request.sourcingDepotMapping).map(([depot, sourcing], idx) => (
                                  <tr key={depot} className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                                    <td className="py-1.5 px-3 font-mono border-r" data-testid={`row-depot-${depot}`}>{depot}</td>
                                    <td className="py-1.5 px-3 font-mono text-amber-700" data-testid={`row-sourcing-${depot}`}>{sourcing}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Plain-text fallback — only if no structured data available */
                    <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40">
                            <TableHead className="w-1/2 py-3 text-xs">Current</TableHead>
                            <TableHead className="w-1/2 py-3 text-xs">Requested</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="py-4 text-sm align-top whitespace-pre-wrap text-muted-foreground">
                              {request.currentValue || "—"}
                            </TableCell>
                            <TableCell className="py-4 text-sm align-top whitespace-pre-wrap font-medium">
                              {request.requestedValue || "—"}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── Basepack SR: two-card summary + MSTN table ── */}
            {!isCbu && (
              <>
                <div className="grid grid-cols-2 gap-5">
                  {/* Left card */}
                  <div className="rounded-xl border bg-white shadow-sm px-5 py-4 divide-y divide-border/60">
                    <FieldCell label="Base Pack Name">{request.basepackName}</FieldCell>
                    <FieldCell label="Basepack Code">
                      <span className="font-mono">{request.basepackCode}</span>
                    </FieldCell>
                    <FieldCell label="Brand">{request.brand}</FieldCell>
                    <FieldCell label="Business Group">{request.bg}</FieldCell>
                    <FieldCell label="Request Type">
                      <Badge variant="secondary" className={`border ${meta.colorClass}`}>{meta.label}</Badge>
                    </FieldCell>
                  </div>

                  {/* Right card */}
                  <div className="rounded-xl border bg-white shadow-sm px-5 py-4 divide-y divide-border/60">
                    <FieldCell label="Requested Status">{request.targetStatus ?? "—"}</FieldCell>
                    <FieldCell label="Raised By">{request.raisedBy}</FieldCell>
                    <FieldCell label="Created On">{request.raisedAt}</FieldCell>
                    <FieldCell label="Pending With">{pendingWith}</FieldCell>
                    <FieldCell label="Exception">
                      {request.criteriaMetAtRaise
                        ? <span className="text-muted-foreground font-normal">None</span>
                        : <span className="text-amber-700 font-medium">MSTN criteria not met</span>}
                    </FieldCell>
                  </div>
                </div>

                {/* MSTN table */}
                {request.materials && request.materials.length > 0 && (
                  <div>
                    <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                      MSTN Status at Time of Request Creation
                    </h2>
                    <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40">
                            <TableHead className="py-3 text-xs">CBU Code</TableHead>
                            <TableHead className="py-3 text-xs">Description</TableHead>
                            <TableHead className="py-3 text-xs text-center">MSTN Cleared</TableHead>
                            <TableHead className="py-3 text-xs text-center">Last Updated</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {request.materials.map(m => (
                            <TableRow key={m.code}>
                              <TableCell className="py-3.5 font-mono font-medium text-blue-600 whitespace-nowrap">{m.code}</TableCell>
                              <TableCell className="py-3.5 text-sm text-muted-foreground">{m.description}</TableCell>
                              <TableCell className="py-3.5 text-center">
                                {m.mstnCleared
                                  ? <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600 font-semibold"><CheckCircle2 className="h-4 w-4" />Yes</span>
                                  : <span className="inline-flex items-center gap-1.5 text-sm text-red-500 font-semibold"><XCircle className="h-4 w-4" />No</span>}
                              </TableCell>
                              <TableCell className="py-3.5 text-center text-sm text-muted-foreground">{m.lastUpdated}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </>
            )}
            {/* ── CBU Detail section ── */}
            {relevantCbus.length > 0 && (
              <div className="pt-2">
                <CbuDetailSection
                  cbus={relevantCbus}
                  pendingSrs={requests.filter(r =>
                    (CBU_SR_TYPES as readonly string[]).includes(r.srType) &&
                    r.overallStatus === "pending" &&
                    r.cbuCode === request.cbuCode
                  )}
                />
              </div>
            )}

          </TabsContent>

          {/* ── Approval Chain tab ───────────────────────────────────────── */}
          <TabsContent value="approval">
            <div className="rounded-xl border bg-white shadow-sm p-6">
              <ApproverChain
                approvers={request.approvers}
                requestId={request.id}
                onApprove={(reqId, idx, comment) => approveStep(reqId, idx, comment)}
                onReject={(reqId, idx, reason) => rejectStep(reqId, idx, reason)}
              />
            </div>
          </TabsContent>
        </Tabs>

      </main>
    </div>
  );
}
