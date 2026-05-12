import { Fragment } from "react";
import { BarChart2, CircleDollarSign, CheckCircle2, XCircle } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export interface CbuSectionRecord {
  id: string;
  cbuCode?: string;
  materialDescription?: string;
  networkStatus?: string;
  depots?: string[] | string;
  depot?: string[] | string;
  mstnPercentage?: number;
  mstnByDepot?: Record<string, number>;
  priceActive?: boolean;
  startDate?: string;
  endDate?: string;
  priceUpdatedAt?: string;
}

function NwStatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    "Draft":                       "bg-slate-100 text-slate-600",
    "Active":                      "bg-emerald-100 text-emerald-700",
    "Pricing Updated":             "bg-blue-100 text-blue-700",
    "Production Started":          "bg-amber-100 text-amber-700",
    "FTR Approved":                "bg-cyan-100 text-cyan-700",
    "Stock Movement Initiated":    "bg-violet-100 text-violet-700",
    "Network transition complete": "bg-emerald-100 text-emerald-800",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${map[status] ?? "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}

function fmtDateStr(val?: string | null): string {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function getDepots(cbu: CbuSectionRecord): string[] {
  const raw = cbu.depots ?? cbu.depot;
  return Array.isArray(raw) ? raw as string[] : [];
}

// ─── CBU & MSTN by Depot ─────────────────────────────────────────────────────

export function CbuMstnSection({ cbus }: { cbus: CbuSectionRecord[] }) {
  if (!cbus.length) return null;
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
        <BarChart2 className="h-3.5 w-3.5 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-slate-700">CBU Overview & MSTN by Depot</h3>
        <span className="ml-auto text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-medium">
          {cbus.length} CBU{cbus.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="divide-y divide-slate-100">
        {cbus.map(cbu => {
          const depots = getDepots(cbu);
          const mstnByDepot = cbu.mstnByDepot ?? {};
          const depotEntries = depots
            .filter(d => mstnByDepot[d] != null)
            .map(d => ({ depot: d, pct: mstnByDepot[d] }));
          return (
            <div key={cbu.id} className="px-5 py-4">
              {/* CBU header row */}
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <span className="font-mono text-sm font-semibold text-[#1f36c7]">
                  {cbu.cbuCode || cbu.id?.slice(0, 8)}
                </span>
                <span
                  className="text-xs text-muted-foreground truncate max-w-xs"
                  title={cbu.materialDescription}
                >
                  {cbu.materialDescription || "—"}
                </span>
                {cbu.networkStatus && <NwStatusPill status={cbu.networkStatus} />}
                {cbu.mstnPercentage != null && (
                  <span className={`ml-auto text-sm font-bold tabular-nums ${cbu.mstnPercentage >= 80 ? "text-emerald-600" : "text-amber-600"}`}>
                    {cbu.mstnPercentage}%
                    <span className="text-xs font-normal text-muted-foreground ml-1">overall</span>
                  </span>
                )}
              </div>
              {/* Depot grid */}
              {depotEntries.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {depotEntries.map(({ depot, pct }) => (
                    <div key={depot} className="flex flex-col gap-1" data-testid={`depot-mstn-${cbu.id}-${depot}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-medium text-slate-600">{depot}</span>
                        <span className={`text-[11px] font-bold ${pct >= 80 ? "text-emerald-600" : "text-amber-600"}`}>
                          {pct}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${pct >= 80 ? "bg-emerald-500" : "bg-amber-400"}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic pl-1">No depot-level MSTN data available</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Pricing Information by CBU ───────────────────────────────────────────────

export function CbuPricingSection({ cbus }: { cbus: CbuSectionRecord[] }) {
  if (!cbus.length) return null;
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
        <CircleDollarSign className="h-3.5 w-3.5 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-slate-700">Pricing Information by CBU</h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
            <TableHead className="text-xs py-3 font-semibold text-slate-600">CBU Code</TableHead>
            <TableHead className="text-xs py-3 font-semibold text-slate-600">Description</TableHead>
            <TableHead className="text-xs py-3 font-semibold text-slate-600">Price Active</TableHead>
            <TableHead className="text-xs py-3 font-semibold text-slate-600">Price End Date</TableHead>
            <TableHead className="text-xs py-3 font-semibold text-slate-600">Last Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cbus.map(cbu => (
            <TableRow
              key={cbu.id}
              data-testid={`pricing-row-${cbu.id}`}
              className="text-xs border-b border-slate-100 last:border-0 hover:bg-slate-50/40"
            >
              <TableCell className="font-mono font-semibold text-[#1f36c7] py-3">
                {cbu.cbuCode || cbu.id?.slice(0, 8)}
              </TableCell>
              <TableCell className="py-3 max-w-52 truncate text-slate-600" title={cbu.materialDescription}>
                {cbu.materialDescription || "—"}
              </TableCell>
              <TableCell className="py-3">
                {cbu.priceActive == null ? (
                  <span className="text-muted-foreground">—</span>
                ) : cbu.priceActive ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Yes
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
                    <XCircle className="h-3.5 w-3.5" /> No
                  </span>
                )}
              </TableCell>
              <TableCell className="py-3 font-medium text-slate-700">
                {fmtDateStr(cbu.endDate)}
              </TableCell>
              <TableCell className="py-3 text-muted-foreground">
                {fmtDateStr(cbu.priceUpdatedAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
