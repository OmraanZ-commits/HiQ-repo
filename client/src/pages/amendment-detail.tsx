import { useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  ArrowLeft, FileEdit, LayoutDashboard, GitBranch, ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import { UnileverHeader } from "@/components/unilever-header";
import { SrStatusBadge, ApproverChain } from "@/components/sr-detail-components";
import {
  useAmendmentStore, approveAmendmentStep, rejectAmendmentStep,
  AMENDMENT_TYPE_META,
} from "@/lib/amendment-store";

function FieldCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3 min-w-0 border-b last:border-b-0">
      <span className="w-40 flex-shrink-0 text-sm text-muted-foreground pt-0.5">{label}</span>
      <span className="flex-1 text-sm font-medium text-foreground">{children}</span>
    </div>
  );
}

export default function AmendmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const { amendments } = useAmendmentStore();
  const amendment = amendments.find(a => a.id === id);

  if (!amendment) {
    return (
      <div className="min-h-screen bg-background">
        <UnileverHeader module="paid-bible" activeTab="amendments"
          onTabChange={tab => navigate(`/paid-bible?tab=${tab}`)} />
        <div className="flex items-center justify-center py-40 flex-col gap-4">
          <ListChecks className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-muted-foreground">Amendment request not found.</p>
          <Button variant="outline" onClick={() => navigate("/paid-bible?tab=amendments")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Amendments
          </Button>
        </div>
      </div>
    );
  }

  const meta            = AMENDMENT_TYPE_META[amendment.amendmentType];
  const doneSteps       = amendment.approvers.filter(a => a.status === "approved").length;
  const pct             = amendment.approvers.length > 0
                          ? (doneSteps / amendment.approvers.length) * 100 : 0;
  const pendingApprovals = amendment.approvers.filter(a => a.status === "pending").length;
  const pendingWith      = amendment.approvers.find(a => a.status === "pending")?.label ?? "—";

  return (
    <div className="min-h-screen bg-background">
      <UnileverHeader module="paid-bible" activeTab="amendments"
        onTabChange={tab => navigate(`/paid-bible?tab=${tab}`)} />

      <main className="max-w-[1100px] mx-auto px-6 py-6">

        {/* ── Page header ───────────────────────────────────────────────── */}
        <div className="flex items-start gap-4 mb-6">
          <Button
            variant="ghost" size="icon"
            onClick={() => navigate("/paid-bible?tab=amendments")}
            data-testid="button-back-to-amendments"
            className="mt-0.5 flex-shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-mono font-semibold text-slate-400">{amendment.id}</span>
              <Badge variant="secondary" className="text-xs h-5">
                <FileEdit className="h-3 w-3 mr-1" />
                {meta.label}
              </Badge>
            </div>
            <h1 className="text-xl font-bold">
              {amendment.cbuDescription || amendment.cbuCode}
              <span className="ml-2 text-sm font-mono text-muted-foreground font-normal">
                {amendment.cbuCode}
              </span>
            </h1>
          </div>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────────── */}
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
            <SrStatusBadge status={amendment.overallStatus} />
          </div>

          {/* ── Overview ──────────────────────────────────────────────── */}
          <TabsContent value="overview" className="space-y-6">

            {/* Request summary */}
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                Request Summary
              </h2>
              <div className="rounded-xl border bg-card">
                <FieldCell label="Amendment ID">{amendment.id}</FieldCell>
                <FieldCell label="Amendment Type">
                  <Badge variant="secondary">{meta.label}</Badge>
                </FieldCell>
                <FieldCell label="CBU Code">
                  <span className="font-mono">{amendment.cbuCode}</span>
                </FieldCell>
                <FieldCell label="CBU Description">{amendment.cbuDescription || "—"}</FieldCell>
                <FieldCell label="Basepack">
                  <span className="font-mono">BP-{amendment.basepackCode}</span>
                </FieldCell>
                <FieldCell label="Brand">{amendment.brand || "—"}</FieldCell>
                <FieldCell label="BG / Category">{amendment.bg || "—"}</FieldCell>
                <FieldCell label="Raised By">{amendment.raisedBy}</FieldCell>
                <FieldCell label="Raised At">{amendment.raisedAt}</FieldCell>
              </div>
            </div>

            {/* Change details */}
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                Change Details
              </h2>
              <div className="rounded-xl border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="w-1/2">Current</TableHead>
                      <TableHead className="w-1/2">Requested</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="text-sm align-top whitespace-pre-wrap text-muted-foreground">
                        {amendment.currentValue}
                      </TableCell>
                      <TableCell className="text-sm align-top whitespace-pre-wrap font-medium">
                        {amendment.requestedValue}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Justification */}
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                Business Justification
              </h2>
              <div className="rounded-xl border bg-card px-5 py-4">
                <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                  {amendment.justification}
                </p>
              </div>
            </div>

            {/* Approval progress summary */}
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                Approval Progress
              </h2>
              <div className="rounded-xl border bg-card px-5 py-4 flex items-center gap-6">
                <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground flex-shrink-0" data-testid="text-approval-progress">
                  {doneSteps}/{amendment.approvers.length} approved
                </span>
                {amendment.overallStatus === "pending" && (
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    Pending: <span className="font-medium text-foreground">{pendingWith}</span>
                  </span>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── Approval Chain ────────────────────────────────────────── */}
          <TabsContent value="approval">
            <ApproverChain
              approvers={amendment.approvers}
              requestId={amendment.id}
              onApprove={(reqId, idx) => approveAmendmentStep(reqId, idx)}
              onReject={(reqId, idx, reason) => rejectAmendmentStep(reqId, idx, reason)}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
