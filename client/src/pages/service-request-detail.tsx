import { useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  ArrowLeft, ListChecks, CheckCircle2, XCircle, LayoutDashboard, GitBranch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import { UnileverHeader } from "@/components/unilever-header";
import { SrStatusBadge, ApproverChain } from "@/components/sr-detail-components";
import { useSrStore, approveStep, rejectStep } from "@/lib/sr-store";

function FieldCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-3 min-w-0">
      <span className="w-36 flex-shrink-0 text-sm text-muted-foreground">{label}</span>
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

  if (!request) {
    return (
      <div className="min-h-screen bg-background">
        <UnileverHeader module="paid-bible" activeTab="service-requests"
        onTabChange={tab => navigate(`/paid-bible?tab=${tab}`)} />
        <div className="flex items-center justify-center py-40 flex-col gap-4">
          <ListChecks className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-muted-foreground">Service request not found.</p>
          <Button variant="outline" onClick={() => navigate("/paid-bible")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Paid Bible
          </Button>
        </div>
      </div>
    );
  }

  const mstnPassed        = request.mstnCoverage >= 80;
  const doneSteps         = request.approvers.filter(a => a.status === "approved").length;
  const pct               = request.approvers.length > 0 ? (doneSteps / request.approvers.length) * 100 : 0;
  const pendingApprovals  = request.approvers.filter(a => a.status === "pending").length;
  const pendingWith       = request.approvers.find(a => a.status === "pending")?.label ?? "—";

  return (
    <div className="min-h-screen bg-background">
      <UnileverHeader module="paid-bible" activeTab="service-requests"
        onTabChange={tab => navigate(`/paid-bible?tab=${tab}`)} />

      <main className="max-w-[1100px] mx-auto px-6 py-6">

        {/* ── Slim page header ─────────────────────────────────────────────── */}
        <div className="flex items-start gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/paid-bible")}
            data-testid="button-back-to-requests"
            className="mt-0.5 flex-shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-mono font-semibold text-slate-400">{request.id}</span>
            </div>
            <h1 className="text-xl font-bold">
              {request.basepackName}
              <span className="ml-2 text-sm font-mono text-muted-foreground font-normal">{request.basepackCode}</span>
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

            {/* Section header: label + approval progress */}
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

            {/* Request Summary — two side-by-side cards */}
            <div className="grid grid-cols-2 gap-5">
              {/* Left card */}
              <div className="rounded-xl border bg-white shadow-sm px-5 py-4 space-y-0 divide-y divide-border/60">
                <FieldCell label="Base Pack Name">{request.basepackName}</FieldCell>
                <FieldCell label="Basepack Code">
                  <span className="font-mono">{request.basepackCode}</span>
                </FieldCell>
                <FieldCell label="Brand">{request.brand}</FieldCell>
                <FieldCell label="Business Group">{request.bg}</FieldCell>
                <FieldCell label="Request Type">{request.requestType}</FieldCell>
              </div>

              {/* Right card */}
              <div className="rounded-xl border bg-white shadow-sm px-5 py-4 space-y-0 divide-y divide-border/60">
                <FieldCell label="Request Description">Activate basepack</FieldCell>
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

            {/* Material Criteria table */}
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

          </TabsContent>

          {/* ── Approval Chain tab ────────────────────────────────────────── */}
          <TabsContent value="approval">
            <div className="rounded-xl border bg-white shadow-sm p-6">
              <ApproverChain
                approvers={request.approvers}
                requestId={request.id}
                onApprove={(reqId, idx) => approveStep(reqId, idx)}
                onReject={(reqId, idx, reason) => rejectStep(reqId, idx, reason)}
              />
            </div>
          </TabsContent>
        </Tabs>

      </main>
    </div>
  );
}
