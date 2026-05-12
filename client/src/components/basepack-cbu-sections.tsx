import { useState } from "react";
import { Link } from "wouter";
import {
  BarChart2, CheckCircle2, XCircle, ChevronDown,
  Globe, MapPin, Radio, Network, IndianRupee, Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PriceLot {
  id: string;
  priceLot: string;
  mrp: number;
  currency: string;
  validFrom: string;
  validTo: string;
  allIndia: boolean;
  regions: string[];
  channels: string[];
  regionChannelPairs: { region: string; channels: string[] }[];
}

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
  priceLots?: PriceLot[];
}

export interface PendingSrRef {
  id: string;
  srType: string;
  status: string;
  cbuCode?: string;
}

const SR_TYPE_LABEL: Record<string, string> = {
  "geo-extension":      "Geo Extension",
  "channel-extension":  "Channel Extension",
  "sourcing-amendment": "Sourcing Amendment",
};

const SR_TYPE_COLOR: Record<string, string> = {
  "geo-extension":      "bg-emerald-100 text-emerald-700 border-emerald-300",
  "channel-extension":  "bg-violet-100 text-violet-700 border-violet-300",
  "sourcing-amendment": "bg-amber-100 text-amber-700 border-amber-300",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function NwStatusPill({ status }: { status: string }) {
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

export function fmtDateStr(val?: string | null): string {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function getDepots(cbu: CbuSectionRecord): string[] {
  const raw = cbu.depots ?? cbu.depot;
  return Array.isArray(raw) ? (raw as string[]) : [];
}

const FALLBACK_LOTS: PriceLot[] = [
  {
    id: "lot-01", priceLot: "01", mrp: 199.00, currency: "INR",
    validFrom: "2024-01-01", validTo: "9999-12-31",
    allIndia: true, regions: [], channels: [], regionChannelPairs: [],
  },
  {
    id: "lot-02", priceLot: "02", mrp: 215.00, currency: "INR",
    validFrom: "2024-07-01", validTo: "9999-12-31",
    allIndia: false, channels: [], regionChannelPairs: [],
    regions: ["Kerala", "Rajasthan", "Tamil Nadu", "Punjab", "Gujarat", "West Bengal"],
  },
  {
    id: "lot-03", priceLot: "03", mrp: 229.00, currency: "INR",
    validFrom: "2025-01-01", validTo: "9999-12-31",
    allIndia: false, regions: [], regionChannelPairs: [],
    channels: ["GT", "CSD", "MT Retail", "KA"],
  },
  {
    id: "lot-04", priceLot: "04", mrp: 245.00, currency: "INR",
    validFrom: "2025-07-01", validTo: "9999-12-31",
    allIndia: false,
    regions: ["Maharashtra B", "Delhi", "Tamil Nadu", "West Bengal"],
    channels: ["GT", "Ecom"],
    regionChannelPairs: [
      { region: "Maharashtra B", channels: ["GT", "MT Retail"] },
      { region: "Delhi", channels: ["KA", "Ecom"] },
      { region: "Tamil Nadu", channels: ["GT", "CSD"] },
      { region: "West Bengal", channels: ["MT Retail"] },
    ],
  },
];

type ScopePill = { label: string; icon: React.ReactNode; bg: string; text: string; border: string };

function getScopePills(lot: PriceLot): ScopePill[] {
  if (lot.allIndia) return [
    { label: "All India", icon: <Globe className="h-3 w-3" />, bg: "bg-[#00b0d7]", text: "text-white", border: "" },
  ];
  const pills: ScopePill[] = [];
  if (lot.regions.length > 0)
    pills.push({ label: "Region", icon: <MapPin className="h-3 w-3" />, bg: "bg-[#1f36c7]/10", text: "text-[#1f36c7]", border: "border border-[#1f36c7]/30" });
  if (lot.channels.length > 0)
    pills.push({ label: "Channel", icon: <Radio className="h-3 w-3" />, bg: "bg-amber-50", text: "text-amber-700", border: "border border-amber-300" });
  if (lot.regionChannelPairs.length > 0)
    pills.push({ label: "Reg×Ch", icon: <Network className="h-3 w-3" />, bg: "bg-violet-50", text: "text-violet-700", border: "border border-violet-300" });
  return pills;
}

// ─── Unified Collapsible CBU Detail Section ───────────────────────────────────

export function CbuDetailSection({ cbus, pendingSrs = [] }: { cbus: CbuSectionRecord[]; pendingSrs?: PendingSrRef[] }) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  if (!cbus.length) return null;

  const toggle = (id: string) =>
    setOpenIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
        <BarChart2 className="h-3.5 w-3.5 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-slate-700">CBU Detail</h3>
        <span className="ml-auto text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-medium">
          {cbus.length} CBU{cbus.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* CBU rows */}
      <div className="divide-y divide-slate-100">
        {cbus.map(cbu => {
          const isOpen = openIds.has(cbu.id);
          const depots = getDepots(cbu);
          const mstnByDepot = cbu.mstnByDepot ?? {};
          const depotEntries = depots
            .filter(d => mstnByDepot[d] != null)
            .map(d => ({ depot: d, pct: mstnByDepot[d] }));
          const lots = cbu.priceLots ?? FALLBACK_LOTS;

          return (
            <div key={cbu.id}>
              {/* ── Collapsed summary row ── */}
              <button
                type="button"
                onClick={() => toggle(cbu.id)}
                data-testid={`cbu-row-${cbu.id}`}
                className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-slate-50/70 transition-colors select-none"
              >
                <span className="font-mono text-xs font-semibold text-[#1f36c7] shrink-0 w-[110px]">
                  {cbu.cbuCode || cbu.id?.slice(0, 8)}
                </span>
                <span
                  className="text-xs text-muted-foreground truncate flex-1"
                  title={cbu.materialDescription}
                >
                  {cbu.materialDescription || "—"}
                </span>

                {/* Status + summary chips — pushed right */}
                <div className="flex items-center gap-2.5 ml-auto shrink-0 flex-wrap justify-end">
                  {cbu.networkStatus && <NwStatusPill status={cbu.networkStatus} />}

                  <span
                    className={`text-xs font-bold tabular-nums ${
                      cbu.mstnPercentage == null
                        ? "text-muted-foreground"
                        : cbu.mstnPercentage >= 80
                          ? "text-emerald-600"
                          : "text-amber-600"
                    }`}
                    data-testid={`cbu-mstn-pct-${cbu.id}`}
                  >
                    {cbu.mstnPercentage != null ? `${cbu.mstnPercentage}%` : "—"}
                    <span className="font-normal text-muted-foreground"> MSTN</span>
                  </span>

                  {cbu.priceActive != null && (
                    cbu.priceActive ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Price Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
                        <XCircle className="h-3.5 w-3.5" /> Price Inactive
                      </span>
                    )
                  )}

                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                  />
                </div>
              </button>

              {/* ── Expanded panel ── */}
              {isOpen && (
                <div className="px-5 pb-6 pt-4 bg-slate-50/40 border-t border-slate-100 space-y-5">

                  {/* Pending Amendments */}
                  {(() => {
                    const matches = pendingSrs.filter(
                      sr => sr.cbuCode === cbu.cbuCode && sr.status === "pending"
                    );
                    if (!matches.length) return null;
                    return (
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <Clock className="h-3 w-3 text-amber-500" />
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600">
                            Pending Amendments ({matches.length})
                          </p>
                        </div>
                        <div className="rounded-lg border border-amber-200 bg-amber-50/60 overflow-hidden divide-y divide-amber-100">
                          {matches.map(sr => (
                            <div key={sr.id} className="flex items-center gap-3 px-3 py-2.5">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ${SR_TYPE_COLOR[sr.srType] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}
                                data-testid={`pending-sr-type-${sr.id}`}
                              >
                                {SR_TYPE_LABEL[sr.srType] ?? sr.srType}
                              </span>
                              <Link
                                href={`/paid-bible/requests/${sr.id}`}
                                className="font-mono text-[11px] text-[#1f36c7] hover:underline truncate flex-1"
                                data-testid={`pending-sr-link-${sr.id}`}
                              >
                                {sr.id}
                              </Link>
                              <Badge className="bg-amber-100 text-amber-700 border border-amber-300 text-[10px] px-1.5 py-0 shrink-0 font-normal">
                                Pending
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* MSTN by Depot */}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                      MSTN by Depot
                    </p>
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
                      <p className="text-xs text-muted-foreground italic">No depot-level MSTN data available</p>
                    )}
                  </div>

                  {/* Price Lots */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <IndianRupee className="h-3.5 w-3.5 text-[#00b0d7]" />
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Price Lots
                      </p>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {lots.length} lots
                      </Badge>
                      <span className="ml-auto text-[10px] text-muted-foreground">Click a row to see applicability details</span>
                    </div>

                    <PriceLotsTable lots={lots} cbuCode={cbu.cbuCode} />
                  </div>

                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Price Lots expandable table ──────────────────────────────────────────────

function PriceLotsTable({ lots, cbuCode }: { lots: PriceLot[]; cbuCode?: string }) {
  const [expandedLots, setExpandedLots] = useState<Set<string>>(new Set());

  const toggleLot = (id: string) =>
    setExpandedLots(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
      {/* Table header */}
      <div className="grid grid-cols-[1fr_160px_90px_72px_100px_100px_28px] px-4 py-2 bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
        <span>Price Lot</span>
        <span>Scope</span>
        <span className="text-right">MRP</span>
        <span className="text-center">Currency</span>
        <span className="text-center">Valid From</span>
        <span className="text-center">Valid To</span>
        <span />
      </div>

      {lots.map((lot, idx) => {
        const isLotOpen = expandedLots.has(lot.id);
        const isLast = idx === lots.length - 1;
        const pills = getScopePills(lot);
        const hasRegions = lot.regions.length > 0;
        const hasChannels = lot.channels.length > 0;
        const hasRxC = lot.regionChannelPairs.length > 0;
        const lotId = cbuCode ? `${cbuCode}-${lot.priceLot.padStart(2, "0")}` : lot.priceLot;

        return (
          <div key={lot.id} className={!isLast ? "border-b border-slate-100" : ""}>
            {/* Summary row — clickable */}
            <button
              type="button"
              onClick={() => toggleLot(lot.id)}
              data-testid={`price-lot-row-${lot.id}`}
              className="w-full grid grid-cols-[1fr_160px_90px_72px_100px_100px_28px] items-center px-4 py-3 text-left hover:bg-slate-50/70 transition-colors select-none"
            >
              <span className="font-mono text-xs font-semibold text-[#1f36c7]">{lotId}</span>
              <span className="flex items-center gap-1 flex-wrap">
                {pills.map(p => (
                  <span
                    key={p.label}
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${p.bg} ${p.text} ${p.border}`}
                  >
                    {p.icon}{p.label}
                  </span>
                ))}
              </span>
              <span className="text-right font-semibold text-xs tabular-nums">
                {lot.mrp.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-center text-xs text-muted-foreground">{lot.currency}</span>
              <span className="text-center text-xs">{fmtDateStr(lot.validFrom)}</span>
              <span className="text-center text-xs">{fmtDateStr(lot.validTo)}</span>
              <span className="flex items-center justify-center text-muted-foreground">
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isLotOpen ? "rotate-180" : ""}`} />
              </span>
            </button>

            {/* Expanded applicability detail */}
            {isLotOpen && (
              <div className="px-4 pb-4 pt-2 bg-[#00b0d7]/[0.03] border-t border-slate-100">

                {lot.allIndia && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#00b0d7] text-white text-xs font-medium">
                      <Globe className="h-3.5 w-3.5" /> All India
                    </span>
                    <p className="text-xs text-muted-foreground italic">Applicable across all states and all channels in India.</p>
                  </div>
                )}

                {(hasRegions || hasChannels || hasRxC) && (
                  <div className={`grid gap-4 ${[hasRegions, hasChannels, hasRxC].filter(Boolean).length === 1 ? "grid-cols-1 max-w-sm" : [hasRegions, hasChannels, hasRxC].filter(Boolean).length === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-3"}`}>

                    {hasRegions && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <MapPin className="h-3 w-3 text-[#1f36c7]" />
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                            States <span className="normal-case text-muted-foreground/60">({lot.regions.length})</span>
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {lot.regions.map(r => (
                            <Badge key={r} variant="outline" className="text-[10px] px-2 py-0.5 font-normal border-[#1f36c7]/30 text-[#1f36c7] bg-[#1f36c7]/5">
                              <MapPin className="h-2.5 w-2.5 mr-1 shrink-0" />{r}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {hasChannels && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Radio className="h-3 w-3 text-amber-600" />
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                            Channels <span className="normal-case text-muted-foreground/60">({lot.channels.length})</span>
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {lot.channels.map(ch => (
                            <Badge key={ch} variant="outline" className="text-[10px] px-2 py-0.5 font-normal border-amber-300 text-amber-700 bg-amber-50">
                              {ch}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {hasRxC && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Network className="h-3 w-3 text-violet-600" />
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                            Region × Channel <span className="normal-case text-muted-foreground/60">({lot.regionChannelPairs.length} pairs)</span>
                          </p>
                        </div>
                        <div className="space-y-1">
                          {lot.regionChannelPairs.map(pair => (
                            <div key={pair.region} className="flex items-start gap-2 text-[10px]">
                              <span className="text-[#1f36c7] font-medium min-w-[90px]">{pair.region}</span>
                              <div className="flex flex-wrap gap-1">
                                {pair.channels.map(ch => (
                                  <span key={ch} className="px-1.5 py-0.5 rounded bg-violet-50 border border-violet-200 text-violet-700 font-medium">{ch}</span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Legacy named exports (kept for backward compatibility) ───────────────────
// Both pages now render <CbuDetailSection> instead; these are no-ops.
export function CbuMstnSection({ cbus }: { cbus: CbuSectionRecord[] }) {
  return <CbuDetailSection cbus={cbus} />;
}
export function CbuPricingSection(_: { cbus: CbuSectionRecord[] }) {
  return null;
}
