import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { UnileverHeader } from "@/components/unilever-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ChevronRight } from "lucide-react";
import type { NetworkEntry } from "@shared/schema";
import { NV_CODE_TO_CCR_CHAIN } from "@/lib/distribution-data";

// ─── Types ────────────────────────────────────────────────────────────────────

type Customer = {
  id: string;
  customerChain: string;
  coverageType: string;
  behaviourType: string;
};

type CicMapping = {
  id: string;
  cbuCode: string;
  customerChain: string;
  customerCode: string;
  cic: string | null;
  status: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_IDX: Record<string, number> = {
  "Draft": 0, "Active": 1, "Pricing Updated": 2, "Production Started": 3,
  "FTR Approved": 4, "Stock Movement Initiated": 5, "Network transition complete": 6,
};
const RELAUNCH_TYPES = new Set([
  "RL_ART_PKG", "RL_ART_FORM", "RL_PKG_FORM", "RL_ART", "RL_FORM", "RL_PKG", "RL_PRICE",
]);

// ─── Scenario configuration ───────────────────────────────────────────────────

type ChainScenario = "Regional Listing" | "Regional Non-Listing" | "National";

// National          → CCR Action = National; CSE selects No/No/No (CIC / Content / Rundown)
// Regional Listing  → CCR Action = Regional + SBM/Listing = Listing Based
// Regional Non-Listing → CCR Action = Regional + SBM/Listing = Non-Listing
const CHAIN_SCENARIO_MAP: Record<string, ChainScenario> = {
  // National accounts (CCR Action = National)
  "Amazon":           "National",
  "Big Bazaar":       "National",
  "BigBasket":        "National",
  "Cloud Tail":       "National",
  "Flipkart":         "National",
  "JioMart":          "National",
  "Metro C&C":        "National",
  "Swiggy Instamart": "National",
  // Regional Non-Listing (CCR Action = Regional, SBM = Non-Listing)
  "Blinkit":          "Regional Non-Listing",
  "DMart":            "Regional Non-Listing",
  "Reliance Smart":   "Regional Non-Listing",
  // Regional Listing Based (CCR Action = Regional, SBM = Listing Based)
  "Lulu Hypermarket": "Regional Listing",
};

function chainScenarioFromName(chain: string): ChainScenario {
  return CHAIN_SCENARIO_MAP[chain] ?? "Regional Non-Listing";
}

const SCENARIO_META: Record<ChainScenario, { badge: string; pill: string; desc: string }> = {
  "Regional Listing": {
    badge: "bg-violet-50 border-violet-200",
    pill:  "bg-violet-100 text-violet-700 border border-violet-200",
    desc:  "Both Successor and Predecessor are tagged to the same CIC and coexist in the listing",
  },
  "Regional Non-Listing": {
    badge: "bg-amber-50 border-amber-200",
    pill:  "bg-amber-100 text-amber-700 border border-amber-200",
    desc:  "Predecessor is deactivated as Successor activates — may vary by region",
  },
  "National": {
    badge: "bg-blue-50 border-blue-200",
    pill:  "bg-blue-100 text-blue-700 border border-blue-200",
    desc:  "No new CIC required — Successor inherits Predecessor's CIC nationally",
  },
};

// ─── Shared sub-components ────────────────────────────────────────────────────

function NetworkStatusBadge({ status }: { status: string | null | undefined }) {
  const s = status ?? "Draft";
  const high = ["FTR Approved", "Stock Movement Initiated", "Network transition complete"];
  const mid = ["Pricing Updated", "Production Started"];
  if (high.includes(s)) return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-xs">{s}</Badge>;
  if (mid.includes(s)) return <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 text-xs">{s}</Badge>;
  if (s === "Active") return <Badge className="bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-100 text-xs">{s}</Badge>;
  return <Badge variant="outline" className="text-slate-500 text-xs">{s}</Badge>;
}

function ChainAccordion({ chainName, expanded, onToggle, count, scenario, children }: {
  chainName: string; expanded: boolean; onToggle: () => void; count: number;
  scenario?: ChainScenario; children: React.ReactNode;
}) {
  const meta = scenario ? SCENARIO_META[scenario] : null;
  return (
    <div className={`border-b last:border-b-0 ${expanded && meta ? meta.badge + " border" : ""}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors text-left"
      >
        <ChevronRight
          className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${expanded ? "rotate-90" : ""}`}
        />
        <span className="text-sm font-semibold text-foreground">{chainName}</span>
        {meta && (
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${meta.pill}`}>
            {scenario}
          </span>
        )}
        <span className="ml-auto text-xs text-muted-foreground font-medium">{count} CBU{count !== 1 ? "s" : ""}</span>
      </button>
      {expanded && <div>{children}</div>}
    </div>
  );
}

// ─── CBU row — navigates to detail page on click ──────────────────────────────

function CbuMtRow({ entry, chain }: { entry: NetworkEntry; chain: string }) {
  const [, navigate] = useLocation();
  const cbuCode = entry.cbuCode ?? "";
  const predecessorCode = (entry as any).predecessorCode ?? "—";

  return (
    <TableRow
      onClick={() => navigate(`/ccr/mt-listing/${encodeURIComponent(cbuCode)}?chain=${encodeURIComponent(chain)}`)}
      className="cursor-pointer hover:bg-muted/20"
      data-testid={`row-cbu-${cbuCode}`}
    >
      <TableCell className="w-8 py-3 pl-6">
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
      </TableCell>
      <TableCell className="py-3">
        <span className="font-mono text-xs font-semibold text-foreground">{cbuCode}</span>
        <div className="text-[10px] text-muted-foreground mt-0.5">{entry.typeOfNetwork ?? "—"}</div>
      </TableCell>
      <TableCell className="py-3 max-w-[220px]">
        <span className="text-xs truncate block">{entry.materialDescription || (entry as any).basepackDescription || "—"}</span>
      </TableCell>
      <TableCell className="py-3 text-xs">{entry.brand || "—"}</TableCell>
      <TableCell className="py-3">
        <span className="font-mono text-xs text-muted-foreground">{predecessorCode}</span>
      </TableCell>
      <TableCell className="py-3 text-xs font-mono text-muted-foreground">{entry.basepack || "—"}</TableCell>
      <TableCell className="py-3">
        {/* CIC is shown on the detail page */}
        <span className="text-xs text-muted-foreground">View →</span>
      </TableCell>
      <TableCell className="py-3">
        <NetworkStatusBadge status={entry.networkStatus} />
      </TableCell>
    </TableRow>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CcrMtListingPage() {
  const [expandedTab1, setExpandedTab1] = React.useState<Set<string>>(new Set());

  const { data: networkEntries = [], isLoading: entriesLoading } = useQuery<NetworkEntry[]>({
    queryKey: ["/api/network-entries"],
  });
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/ccr/customers"],
  });
  const { data: cicMappings = [] } = useQuery<CicMapping[]>({
    queryKey: ["/api/ccr/cic-mappings"],
    queryFn: () => fetch("/api/ccr/cic-mappings").then(r => r.json()),
  });

  // Set of predecessor CBU codes that have at least one CIC mapping configured
  const cicConfiguredPreds = useMemo(
    () => new Set(cicMappings.map(m => m.cbuCode)),
    [cicMappings],
  );

  // Eligible relaunch CBUs — must have a predecessor with CIC configured
  const eligibleEntries = useMemo(
    () => networkEntries.filter(e => {
      if (!(RELAUNCH_TYPES.has(e.typeOfNetwork ?? "") || e.typeOfNetwork === "EXTENSION" || e.typeOfNetwork === "Extension")) return false;
      const pred = (e as any).predecessorCode;
      if (!pred) return false;
      if ((STATUS_IDX[e.networkStatus ?? ""] ?? 0) < STATUS_IDX["FTR Approved"]) return false;
      // Only show if predecessor has CIC configured
      return cicConfiguredPreds.has(pred);
    }),
    [networkEntries, cicConfiguredPreds],
  );

  // Group eligible entries by customer chain
  const eligibleByChain = useMemo(() => {
    const chainSet = new Set(customers.map(c => c.customerChain));
    const map: Record<string, NetworkEntry[]> = {};
    for (const entry of eligibleEntries) {
      const cm = (entry as any).customerMapping;
      const chains = new Set<string>();
      if (cm && typeof cm === "object") {
        for (const codes of Object.values(cm)) {
          if (Array.isArray(codes)) {
            for (const code of codes) {
              const ch = NV_CODE_TO_CCR_CHAIN[code as string];
              if (ch && chainSet.has(ch)) chains.add(ch);
            }
          }
        }
      }
      for (const chain of chains) {
        if (!map[chain]) map[chain] = [];
        map[chain].push(entry);
      }
    }
    return map;
  }, [eligibleEntries, customers]);

  function toggleAccordion(key: string) {
    setExpandedTab1(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  const totalCbus = eligibleEntries.length;

  return (
    <div className="min-h-screen bg-background">
      <UnileverHeader module="ccr" />

      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-5">
        <div>
          <h2 className="text-xl font-bold text-foreground">MT Listing</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Successor-predecessor CBU updates required as part of the CCR MT listing ruleset
          </p>
        </div>

        <Card>
          {/* Header bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b">
            <span className="text-sm font-semibold text-foreground">MT Listing Output</span>
            <span className="text-xs text-muted-foreground">
              {totalCbus} eligible CBU{totalCbus !== 1 ? "s" : ""} across {Object.keys(eligibleByChain).length} chain{Object.keys(eligibleByChain).length !== 1 ? "s" : ""}
            </span>
          </div>

          <CardContent className="p-0">
            {entriesLoading ? (
              <div className="p-6 space-y-2">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : Object.keys(eligibleByChain).length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                No eligible relaunch CBUs with CIC configured found.
              </div>
            ) : (
              Object.entries(eligibleByChain).map(([chain, entries]) => (
                <ChainAccordion
                  key={chain}
                  chainName={chain}
                  expanded={expandedTab1.has(chain)}
                  onToggle={() => toggleAccordion(chain)}
                  count={entries.length}
                  scenario={chainScenarioFromName(chain)}
                >
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableHead className="w-8 pl-6" />
                        <TableHead className="text-xs font-semibold">Successor CBU</TableHead>
                        <TableHead className="text-xs font-semibold">Description</TableHead>
                        <TableHead className="text-xs font-semibold">Brand</TableHead>
                        <TableHead className="text-xs font-semibold">Predecessor CBU</TableHead>
                        <TableHead className="text-xs font-semibold">Basepack</TableHead>
                        <TableHead className="text-xs font-semibold">CIC (Predecessor)</TableHead>
                        <TableHead className="text-xs font-semibold">Network Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map(entry => (
                        <CbuMtRow key={entry.cbuCode} entry={entry} chain={chain} />
                      ))}
                    </TableBody>
                  </Table>
                </ChainAccordion>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// React is needed for useState
import React from "react";
