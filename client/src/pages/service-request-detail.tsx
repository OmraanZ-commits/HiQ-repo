import { useParams, useLocation } from "wouter";
import {
  ArrowLeft, ListChecks, CheckCircle2, XCircle, ShieldCheck, ShieldAlert, TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import { SrStatusBadge, ApproverChain } from "@/components/sr-detail-components";
import { useSrStore, approveStep, rejectStep } from "@/lib/sr-store";

export default function ServiceRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { requests } = useSrStore();
  const request = requests.find(r => r.id === id);

  if (!request) {
    return (
      <div className="h-screen flex items-center justify-center flex-col gap-4">
        <ListChecks className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Service request not found.</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/paid-bible")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Paid Bible
        </Button>
      </div>
    );
  }

  const mstnPassed = request.mstnCoverage >= 80;
  const doneSteps  = request.approvers.filter(a => a.status === "approved").length;
  const pct        = request.approvers.length > 0
    ? (doneSteps / request.approvers.length) * 100
    : 0;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top bar */}
      <div className="flex-shrink-0 border-b bg-white px-6 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate("/paid-bible")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          data-testid="button-back-to-requests"
        >
          <ArrowLeft className="h-4 w-4" />
          Service Requests
        </button>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-sm font-medium text-foreground">{request.id}</span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">

          {/* Header card */}
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            {/* Row 1: ID + badges */}
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-md bg-[#1f36c7]/10 flex items-center justify-center flex-shrink-0">
                <ListChecks className="h-4 w-4 text-[#1f36c7]" />
              </div>
              <span className="text-xs font-mono font-semibold text-slate-400">{request.id}</span>
              <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                {request.requestType}
              </span>
              <SrStatusBadge status={request.overallStatus} />
            </div>

            {/* Row 2: name */}
            <p className="text-lg font-semibold leading-tight">
              {request.basepackName}
              <span className="ml-2 text-sm font-mono text-muted-foreground font-normal">{request.basepackCode}</span>
            </p>

            {/* Row 3: meta */}
            <p className="text-sm text-muted-foreground mt-0.5">
              {request.brand} · {request.bg} · Raised by{" "}
              <span className="font-medium text-foreground">{request.raisedBy}</span>{" "}
              · {request.raisedAt}
            </p>

            {/* Row 4: pills + progress */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${mstnPassed ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}`}>
                {mstnPassed ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                MSTN {request.mstnCoverage}%
              </div>
              <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${request.criteriaMetAtRaise ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                {request.criteriaMetAtRaise ? <ShieldCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
                {request.criteriaMetAtRaise ? "Criteria Met" : "Criteria Not Met at Raise"}
              </div>
              <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium bg-slate-50 text-slate-600 border-slate-200">
                <TrendingUp className="h-3 w-3" /> Target: {request.targetStatus}
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{doneSteps}/{request.approvers.length} approved</span>
                <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#1f36c7] to-[#0d8ecf] rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Material Criteria */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Material Criteria at Time of Raise
            </p>
            <div className="rounded-xl border overflow-hidden bg-white shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs py-2.5">CBU Code</TableHead>
                    <TableHead className="text-xs py-2.5">Description</TableHead>
                    <TableHead className="text-xs py-2.5 text-center">MSTN Cleared</TableHead>
                    <TableHead className="text-xs py-2.5 text-center">Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {request.materials.map(m => (
                    <TableRow key={m.code} className="text-xs">
                      <TableCell className="font-mono font-medium text-blue-600 py-2.5 whitespace-nowrap">{m.code}</TableCell>
                      <TableCell className="py-2.5 text-muted-foreground">{m.description}</TableCell>
                      <TableCell className="py-2.5 text-center">
                        {m.mstnCleared
                          ? <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold"><CheckCircle2 className="h-3.5 w-3.5" />Yes</span>
                          : <span className="inline-flex items-center gap-1 text-red-500 font-semibold"><XCircle className="h-3.5 w-3.5" />No</span>
                        }
                      </TableCell>
                      <TableCell className="py-2.5 text-center text-muted-foreground">{m.lastUpdated}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Approval Chain */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Approval Chain
            </p>
            <div className="rounded-xl border bg-white shadow-sm p-4">
              <ApproverChain
                approvers={request.approvers}
                requestId={request.id}
                onApprove={(id, idx) => approveStep(id, idx)}
                onReject={(id, idx, reason) => rejectStep(id, idx, reason)}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
