import { useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  ArrowLeft, ListChecks, CheckCircle2, XCircle, ShieldCheck, ShieldAlert, TrendingUp,
  ClipboardList, GitBranch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import { UnileverHeader } from "@/components/unilever-header";
import { SrStatusBadge, ApproverChain } from "@/components/sr-detail-components";
import { useSrStore, approveStep, rejectStep } from "@/lib/sr-store";

export default function ServiceRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("criteria");
  const { requests } = useSrStore();
  const request = requests.find(r => r.id === id);

  if (!request) {
    return (
      <div className="min-h-screen bg-background">
        <UnileverHeader module="paid-bible" activeTab="service-requests" />
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

  const mstnPassed = request.mstnCoverage >= 80;
  const doneSteps  = request.approvers.filter(a => a.status === "approved").length;
  const pct        = request.approvers.length > 0
    ? (doneSteps / request.approvers.length) * 100
    : 0;
  const pendingApprovals = request.approvers.filter(a => a.status === "pending").length;

  return (
    <div className="min-h-screen bg-background">
      <UnileverHeader module="paid-bible" activeTab="service-requests" />

      <main className="max-w-[900px] mx-auto px-6 py-6">

        {/* ── Page header ────────────────────────────────────────────────── */}
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
            {/* SR ID + type + status */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-mono font-semibold text-slate-400">{request.id}</span>
              <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                {request.requestType}
              </span>
              <SrStatusBadge status={request.overallStatus} />
            </div>

            {/* Title */}
            <h1 className="text-xl font-bold">
              {request.basepackName}
              <span className="ml-2 text-sm font-mono text-muted-foreground font-normal">{request.basepackCode}</span>
            </h1>

            {/* Meta */}
            <p className="text-sm text-muted-foreground mt-0.5">
              {request.brand} · {request.bg} · Raised by{" "}
              <span className="font-medium text-foreground">{request.raisedBy}</span>
              {" "}· {request.raisedAt}
            </p>

            {/* Pills + progress */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${mstnPassed ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}`}>
                {mstnPassed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                MSTN {request.mstnCoverage}%
              </span>
              <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${request.criteriaMetAtRaise ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                {request.criteriaMetAtRaise ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                {request.criteriaMetAtRaise ? "Criteria Met" : "Criteria Not Met at Raise"}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium bg-slate-50 text-slate-600 border-slate-200">
                <TrendingUp className="h-3.5 w-3.5" /> Target: {request.targetStatus}
              </span>
              <span className="ml-auto flex items-center gap-2.5">
                <span className="text-sm text-muted-foreground">{doneSteps}/{request.approvers.length} approved</span>
                <div className="w-28 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#1f36c7] to-[#0d8ecf] rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </span>
            </div>
          </div>
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start mb-6 bg-muted/50 p-1">
            <TabsTrigger value="criteria" className="gap-2" data-testid="tab-criteria">
              <ClipboardList className="h-4 w-4" /> Material Criteria
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

          {/* Material Criteria tab */}
          <TabsContent value="criteria">
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
                          : <span className="inline-flex items-center gap-1.5 text-sm text-red-500 font-semibold"><XCircle className="h-4 w-4" />No</span>
                        }
                      </TableCell>
                      <TableCell className="py-3.5 text-center text-sm text-muted-foreground">{m.lastUpdated}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Approval Chain tab */}
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
