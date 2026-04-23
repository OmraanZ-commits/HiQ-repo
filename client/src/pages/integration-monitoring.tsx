import { useState } from "react";
import {
  CheckCircle2, AlertTriangle, XCircle, ChevronLeft, ExternalLink,
  Clock, Database, Activity,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type RunStatus = "SUCCESS" | "PARTIAL" | "FAILED";

interface IntegrationRun {
  runId: string;
  integrationName: string;
  source: string;
  runDate: string;
  lastRunTimestamp: string;
  startTime: string;
  endTime: string;
  recordsReceived: number;
  recordsSuccessful: number;
  recordsFailed: number;
  status: RunStatus;
  lifecycleStage: string;
}

interface FailedRecord {
  recordId: string;
  dataObject: string;
  lifecycleStage: string;
  errorCode: string;
  errorMessage: string;
  failureTimestamp: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_RUNS: IntegrationRun[] = [
  {
    runId: "RUN-2026-04-23-001",
    integrationName: "CBU Master Data Ingestion",
    source: "WPC",
    runDate: "2026-04-23",
    lastRunTimestamp: "2026-04-23T02:15:00Z",
    startTime: "2026-04-23T02:00:00Z",
    endTime: "2026-04-23T02:15:00Z",
    recordsReceived: 124,
    recordsSuccessful: 119,
    recordsFailed: 5,
    status: "PARTIAL",
    lifecycleStage: "Draft",
  },
  {
    runId: "RUN-2026-04-23-002",
    integrationName: "Pricing Tables Sync",
    source: "SAP ECC",
    runDate: "2026-04-23",
    lastRunTimestamp: "2026-04-23T03:10:00Z",
    startTime: "2026-04-23T03:00:00Z",
    endTime: "2026-04-23T03:10:00Z",
    recordsReceived: 82,
    recordsSuccessful: 82,
    recordsFailed: 0,
    status: "SUCCESS",
    lifecycleStage: "Price Circular Updated",
  },
  {
    runId: "RUN-2026-04-23-003",
    integrationName: "Production Booking Status",
    source: "SAP ECC",
    runDate: "2026-04-23",
    lastRunTimestamp: "2026-04-23T04:30:00Z",
    startTime: "2026-04-23T04:00:00Z",
    endTime: "2026-04-23T04:30:00Z",
    recordsReceived: 40,
    recordsSuccessful: 32,
    recordsFailed: 8,
    status: "FAILED",
    lifecycleStage: "Production Started",
  },
  {
    runId: "RUN-2026-04-23-004",
    integrationName: "Stock Transfer Initiation",
    source: "UDL",
    runDate: "2026-04-23",
    lastRunTimestamp: "2026-04-23T05:45:00Z",
    startTime: "2026-04-23T05:30:00Z",
    endTime: "2026-04-23T05:45:00Z",
    recordsReceived: 60,
    recordsSuccessful: 60,
    recordsFailed: 0,
    status: "SUCCESS",
    lifecycleStage: "Stock Movement Initiated",
  },
  {
    runId: "RUN-2026-04-23-005",
    integrationName: "Customer Invoice Sync",
    source: "UDL",
    runDate: "2026-04-23",
    lastRunTimestamp: "2026-04-23T06:20:00Z",
    startTime: "2026-04-23T06:00:00Z",
    endTime: "2026-04-23T06:20:00Z",
    recordsReceived: 95,
    recordsSuccessful: 93,
    recordsFailed: 2,
    status: "PARTIAL",
    lifecycleStage: "Network Transition Complete",
  },
  {
    runId: "RUN-2026-04-22-001",
    integrationName: "CBU Master Data Ingestion",
    source: "WPC",
    runDate: "2026-04-22",
    lastRunTimestamp: "2026-04-22T02:15:00Z",
    startTime: "2026-04-22T02:00:00Z",
    endTime: "2026-04-22T02:15:00Z",
    recordsReceived: 120,
    recordsSuccessful: 115,
    recordsFailed: 5,
    status: "PARTIAL",
    lifecycleStage: "Draft",
  },
  {
    runId: "RUN-2026-04-22-002",
    integrationName: "Pricing Tables Sync",
    source: "SAP ECC",
    runDate: "2026-04-22",
    lastRunTimestamp: "2026-04-22T03:10:00Z",
    startTime: "2026-04-22T03:00:00Z",
    endTime: "2026-04-22T03:10:00Z",
    recordsReceived: 80,
    recordsSuccessful: 80,
    recordsFailed: 0,
    status: "SUCCESS",
    lifecycleStage: "Price Circular Updated",
  },
  {
    runId: "RUN-2026-04-22-003",
    integrationName: "Production Booking Status",
    source: "SAP ECC",
    runDate: "2026-04-22",
    lastRunTimestamp: "2026-04-22T04:30:00Z",
    startTime: "2026-04-22T04:00:00Z",
    endTime: "2026-04-22T04:30:00Z",
    recordsReceived: 40,
    recordsSuccessful: 32,
    recordsFailed: 8,
    status: "FAILED",
    lifecycleStage: "Production Started",
  },
];

const MOCK_FAILED_RECORDS: FailedRecord[] = [
  {
    recordId: "MAT-100234",
    dataObject: "material.xlsx",
    lifecycleStage: "Draft",
    errorCode: "MANDATORY_FIELD_MISSING",
    errorMessage: "Basepack Description is missing",
    failureTimestamp: "2026-04-22T02:16:12Z",
  },
  {
    recordId: "A939-889234",
    dataObject: "A939 Pricing Table",
    lifecycleStage: "Price Circular Updated",
    errorCode: "INVALID_MRP",
    errorMessage: "MRP value is not matching pricing lot",
    failureTimestamp: "2026-04-22T03:11:45Z",
  },
  {
    recordId: "MAT-554321",
    dataObject: "YMMSTNRECPT",
    lifecycleStage: "Stock Movement Initiated",
    errorCode: "DEPOT_MAPPING_NOT_FOUND",
    errorMessage: "Depot not mapped to cluster",
    failureTimestamp: "2026-04-22T04:34:18Z",
  },
  {
    recordId: "INV-889911",
    dataObject: "VRPMA",
    lifecycleStage: "Network Transition Complete",
    errorCode: "INVALID_VTWEG",
    errorMessage: "VTWEG value 'ST' is excluded from completion logic",
    failureTimestamp: "2026-04-22T05:02:09Z",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTs(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function RunStatusBadge({ status }: { status: RunStatus }) {
  const cfg: Record<RunStatus, { icon: typeof CheckCircle2; label: string; className: string }> = {
    SUCCESS: { icon: CheckCircle2, label: "Success",  className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    PARTIAL: { icon: AlertTriangle, label: "Partial",  className: "bg-amber-50 text-amber-700 border-amber-200" },
    FAILED:  { icon: XCircle,      label: "Failed",   className: "bg-red-50 text-red-700 border-red-200" },
  };
  const { icon: Icon, label, className } = cfg[status];
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border", className)}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

// ─── Error Code Badge ─────────────────────────────────────────────────────────

function ErrorBadge({ code }: { code: string }) {
  return (
    <code className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 text-xs font-mono border border-red-200">
      {code}
    </code>
  );
}

// ─── Run Detail View ──────────────────────────────────────────────────────────

function RunDetailView({ run, onBack }: { run: IntegrationRun; onBack: () => void }) {
  const failedRecords = run.recordsFailed > 0 ? MOCK_FAILED_RECORDS.slice(0, run.recordsFailed) : [];
  const successRate = Math.round((run.recordsSuccessful / run.recordsReceived) * 100);

  return (
    <div className="space-y-5" data-testid="integration-run-detail">
      {/* Back nav */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-1 text-muted-foreground hover:text-foreground -ml-1"
          data-testid="button-back-to-runs"
        >
          <ChevronLeft className="h-4 w-4" />
          Integration Monitoring
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium truncate">{run.runId}</span>
      </div>

      {/* Summary panel */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{run.integrationName}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{run.runId}</p>
          </div>
          <RunStatusBadge status={run.status} />
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <MetaRow label="Source System" value={run.source} />
          <MetaRow label="Run Date" value={run.runDate} />
          <MetaRow label="Start Time" value={formatTime(run.startTime)} />
          <MetaRow label="End Time" value={formatTime(run.endTime)} />
          <MetaRow label="Lifecycle Stage" value={run.lifecycleStage} />
          <MetaRow label="Last Run Timestamp" value={formatTs(run.lastRunTimestamp)} />
        </div>

        {/* Record counts */}
        <div className="grid grid-cols-3 gap-3 pt-2 border-t">
          <CountCard label="Total Records" value={run.recordsReceived} color="blue" />
          <CountCard label="Successful" value={run.recordsSuccessful} color="green" />
          <CountCard label="Failed" value={run.recordsFailed} color={run.recordsFailed > 0 ? "red" : "green"} />
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Success rate</span>
            <span className={cn(successRate === 100 ? "text-emerald-600" : successRate >= 80 ? "text-amber-600" : "text-red-600")}>
              {successRate}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", successRate === 100 ? "bg-emerald-500" : successRate >= 80 ? "bg-amber-500" : "bg-red-500")}
              style={{ width: `${successRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Failed records */}
      {failedRecords.length > 0 && (
        <div className="rounded-lg border bg-card overflow-hidden" data-testid="failed-records-section">
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-red-50/50">
            <XCircle className="h-4 w-4 text-red-500" />
            <h3 className="text-sm font-semibold text-red-700">
              Failed Records ({failedRecords.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs">Record ID</TableHead>
                  <TableHead className="text-xs">Data Object / Table</TableHead>
                  <TableHead className="text-xs">Lifecycle Stage</TableHead>
                  <TableHead className="text-xs">Error Code</TableHead>
                  <TableHead className="text-xs">Error Message</TableHead>
                  <TableHead className="text-xs">Failure Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failedRecords.map((rec) => (
                  <TableRow key={rec.recordId} data-testid={`row-failed-${rec.recordId}`}>
                    <TableCell className="font-mono text-xs font-medium">{rec.recordId}</TableCell>
                    <TableCell className="text-xs">{rec.dataObject}</TableCell>
                    <TableCell className="text-xs">
                      <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-[11px] font-medium">
                        {rec.lifecycleStage}
                      </span>
                    </TableCell>
                    <TableCell><ErrorBadge code={rec.errorCode} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[240px] truncate" title={rec.errorMessage}>
                      {rec.errorMessage}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatTs(rec.failureTimestamp)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Footer note */}
      <div className="rounded-md border border-muted bg-muted/30 px-4 py-3">
        <p className="text-xs text-muted-foreground italic">
          All ingestion logic, validation, retries, and audit persistence are handled by backend systems.
          This screen is for monitoring only.
        </p>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function CountCard({ label, value, color }: { label: string; value: number; color: "blue" | "green" | "red" }) {
  const colorMap = {
    blue:  "text-blue-700 bg-blue-50 border-blue-200",
    green: "text-emerald-700 bg-emerald-50 border-emerald-200",
    red:   value === 0 ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-red-700 bg-red-50 border-red-200",
  };
  return (
    <div className={cn("rounded-lg border px-4 py-3 text-center", colorMap[color])}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-[11px] font-medium mt-0.5 opacity-80">{label}</p>
    </div>
  );
}

// ─── Runs Table (List View) ───────────────────────────────────────────────────

function RunsTable({ onViewDetails }: { onViewDetails: (run: IntegrationRun) => void }) {
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const dates = [...new Set(MOCK_RUNS.map(r => r.runDate))].sort((a, b) => b.localeCompare(a));

  const filtered = MOCK_RUNS.filter(r => {
    if (dateFilter !== "all" && r.runDate !== dateFilter) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    return true;
  });

  const totals = {
    runs: filtered.length,
    success: filtered.filter(r => r.status === "SUCCESS").length,
    partial: filtered.filter(r => r.status === "PARTIAL").length,
    failed: filtered.filter(r => r.status === "FAILED").length,
  };

  return (
    <div className="space-y-4" data-testid="integration-runs-table">
      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Runs",  value: totals.runs,    cls: "text-foreground" },
          { label: "Success",     value: totals.success, cls: "text-emerald-700" },
          { label: "Partial",     value: totals.partial, cls: "text-amber-600" },
          { label: "Failed",      value: totals.failed,  cls: "text-red-600" },
        ].map(k => (
          <div key={k.label} className="rounded-lg border bg-card px-4 py-3 text-center">
            <p className={cn("text-2xl font-bold", k.cls)}>{k.value}</p>
            <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
          className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          data-testid="select-date-filter"
        >
          <option value="all">All Dates</option>
          {dates.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          data-testid="select-status-filter"
        >
          <option value="all">All Statuses</option>
          <option value="SUCCESS">Success</option>
          <option value="PARTIAL">Partial</option>
          <option value="FAILED">Failed</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="text-xs">Run Date</TableHead>
              <TableHead className="text-xs">Integration Name</TableHead>
              <TableHead className="text-xs">Source System</TableHead>
              <TableHead className="text-xs text-center">Received</TableHead>
              <TableHead className="text-xs text-center">Successful</TableHead>
              <TableHead className="text-xs text-center">Failed</TableHead>
              <TableHead className="text-xs">Run Status</TableHead>
              <TableHead className="text-xs">Last Run Timestamp</TableHead>
              <TableHead className="text-xs text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-10 text-sm">
                  No runs match the selected filters.
                </TableCell>
              </TableRow>
            ) : filtered.map(run => (
              <TableRow key={run.runId} data-testid={`row-run-${run.runId}`} className="hover:bg-muted/30 transition-colors">
                <TableCell className="text-sm font-medium">{run.runDate}</TableCell>
                <TableCell className="text-sm">
                  <div className="flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    {run.integrationName}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-xs font-medium">
                    {run.source}
                  </span>
                </TableCell>
                <TableCell className="text-center text-sm">{run.recordsReceived}</TableCell>
                <TableCell className="text-center text-sm text-emerald-700 font-medium">{run.recordsSuccessful}</TableCell>
                <TableCell className="text-center text-sm">
                  <span className={run.recordsFailed > 0 ? "text-red-600 font-semibold" : "text-muted-foreground"}>
                    {run.recordsFailed}
                  </span>
                </TableCell>
                <TableCell><RunStatusBadge status={run.status} /></TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTs(run.lastRunTimestamp)}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewDetails(run)}
                    className="h-7 text-xs gap-1"
                    data-testid={`button-view-details-${run.runId}`}
                  >
                    View Details
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Footer note */}
      <div className="rounded-md border border-muted bg-muted/30 px-4 py-3">
        <p className="text-xs text-muted-foreground italic">
          All ingestion logic, validation, retries, and audit persistence are handled by backend systems.
          This screen is for monitoring only.
        </p>
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function IntegrationMonitoringContent() {
  const [selectedRun, setSelectedRun] = useState<IntegrationRun | null>(null);

  return (
    <div className="rounded-lg border bg-card p-5 space-y-5 min-h-[600px]">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-2 rounded-md">
            <Database className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Integration Monitoring</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Read-only view of ingestion health across source systems
            </p>
          </div>
        </div>
        <span className="text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
          Admin Only
        </span>
      </div>

      {/* Content: list or detail */}
      {selectedRun
        ? <RunDetailView run={selectedRun} onBack={() => setSelectedRun(null)} />
        : <RunsTable onViewDetails={setSelectedRun} />
      }
    </div>
  );
}
