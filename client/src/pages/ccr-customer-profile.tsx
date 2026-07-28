import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { UnileverHeader } from "@/components/unilever-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Building2, Download, GitBranch, Mail, Package, Settings,
  ShieldCheck, SlidersHorizontal, Truck, Users, Zap, Eye,
  AlertCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type CcrAccount = {
  id: string;
  accountName: string;
  ccrAction: string;
  sbmListingBased: string;
};

type CcrCustomer = {
  customerChain: string;
  coverageType: string;
  behaviourType: string;
  cseId?: string;
};

// ─── Shared empty-state component ─────────────────────────────────────────────

function EmptySection({
  icon: Icon,
  title,
  message = "No data configured yet. This section will be populated once master data is available.",
  columns,
}: {
  icon: React.ElementType;
  title: string;
  message?: string;
  columns: string[];
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs" disabled>
            <Download className="h-3 w-3 mr-1" /> Export
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" disabled>
            <Settings className="h-3 w-3 mr-1" /> Configure
          </Button>
        </div>
      </div>
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              {columns.map(col => (
                <TableHead key={col} className="text-xs font-semibold">{col}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={columns.length} className="h-20 text-center text-xs text-muted-foreground">
                <div className="flex flex-col items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-muted-foreground/50" />
                  {message}
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── BSS level sub-tab ────────────────────────────────────────────────────────

const BSS_LEVELS = [
  {
    id: "l1",
    label: "Chain Level",
    description: "Customer chain × Sorting Rule × Freshness",
    columns: ["Customer Chain", "Sorting Rule", "Valid Days from Prod Date", "Min Shelf Life (%)", "Freshness Criteria", "Status"],
  },
  {
    id: "l2",
    label: "Chain × BG",
    description: "Customer chain × Business Group × Sorting Rule × Freshness",
    columns: ["Customer Chain", "Business Group", "Sorting Rule", "Valid Days from Prod Date", "Min Shelf Life (%)", "Freshness Criteria", "Status"],
  },
  {
    id: "l3",
    label: "Chain × BG × CBU",
    description: "Customer chain × Business Group × CBU Pricelot × Sorting Rule × Freshness",
    columns: ["Customer Chain", "Business Group", "CBU / Pricelot", "Sorting Rule", "Valid Days from Prod Date", "Fresh ATP Threshold", "Status"],
  },
  {
    id: "l4",
    label: "Code × BG × CBU",
    description: "Customer Code × Business Group × CBU Pricelot — most granular level",
    columns: ["Customer Code", "Business Group", "CBU / Pricelot", "Sorting Rule", "Valid Days from Prod Date", "Fresh ATP Threshold", "Override Reason", "Status"],
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CcrCustomerProfilePage() {
  const [selectedChain, setSelectedChain] = useState<string>("");

  const { data: accounts = [] } = useQuery<CcrAccount[]>({
    queryKey: ["/api/reference-data/ccr-accounts"],
    select: (data: any) => (Array.isArray(data) ? data : data?.accounts ?? []),
  });

  const { data: customers = [] } = useQuery<CcrCustomer[]>({
    queryKey: ["/api/ccr/customers"],
    select: (data: any) => (Array.isArray(data) ? data : data?.customers ?? []),
  });

  // Unified chain list — accounts table is the broader one (19 chains)
  const chains = useMemo(
    () => accounts.map(a => a.accountName).sort(),
    [accounts],
  );

  const selectedAccount  = accounts.find(a => a.accountName === selectedChain);
  const selectedCustomer = customers.find(c =>
    c.customerChain.toUpperCase() === selectedChain,
  );

  const hasChain = !!selectedChain;

  return (
    <div className="min-h-screen bg-background">
      <UnileverHeader module="ccr" />

      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-5">

        {/* Page header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Customer Profile Master</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Consolidated master data for each customer chain — hierarchy, operations, BSS rules and data visibility
            </p>
          </div>
          <Badge variant="outline" className="text-xs mt-1">Skeletal — data pending</Badge>
        </div>

        {/* Chain selector */}
        <Card>
          <CardContent className="px-4 py-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Customer Chain</span>
              </div>
              <Select value={selectedChain} onValueChange={setSelectedChain}>
                <SelectTrigger className="h-8 text-xs w-64" data-testid="select-customer-chain">
                  <SelectValue placeholder="Select a customer chain…" />
                </SelectTrigger>
                <SelectContent>
                  {chains.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedAccount && (
                <div className="flex items-center gap-2 ml-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {selectedAccount.ccrAction}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      selectedAccount.sbmListingBased === "Non-Listing"
                        ? "border-amber-300 text-amber-700 bg-amber-50"
                        : selectedAccount.sbmListingBased === "Listing Based"
                        ? "border-violet-300 text-violet-700 bg-violet-50"
                        : "border-blue-300 text-blue-700 bg-blue-50"
                    }`}
                  >
                    {selectedAccount.sbmListingBased}
                  </Badge>
                  {selectedCustomer && (
                    <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-600">
                      {selectedCustomer.coverageType}
                    </Badge>
                  )}
                </div>
              )}

              {chains.length > 0 && !selectedChain && (
                <span className="text-xs text-muted-foreground ml-auto">
                  {chains.length} chains available
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Prompt when no chain selected */}
        {!hasChain && (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Select a customer chain above to view its profile master.
          </div>
        )}

        {/* ── Main content ───────────────────────────────────────── */}
        {hasChain && (
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  {selectedChain} — Profile Master
                </span>
                <Button variant="outline" size="sm" className="h-7 text-xs" disabled>
                  <Download className="h-3 w-3 mr-1" /> Export All Masters
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <Tabs defaultValue="hierarchy">
                <TabsList className="h-8 mb-4">
                  <TabsTrigger value="hierarchy"   className="text-xs h-7 px-3 gap-1.5">
                    <GitBranch className="h-3 w-3" /> Customer Hierarchy
                  </TabsTrigger>
                  <TabsTrigger value="operational" className="text-xs h-7 px-3 gap-1.5">
                    <Package className="h-3 w-3" /> Operational Masters
                  </TabsTrigger>
                  <TabsTrigger value="bss"         className="text-xs h-7 px-3 gap-1.5">
                    <SlidersHorizontal className="h-3 w-3" /> BSS Master
                  </TabsTrigger>
                  <TabsTrigger value="visibility"  className="text-xs h-7 px-3 gap-1.5">
                    <Eye className="h-3 w-3" /> Data Visibility
                  </TabsTrigger>
                </TabsList>

                {/* ── Tab 1: Customer Hierarchy ──────────────────── */}
                <TabsContent value="hierarchy" className="space-y-5 mt-0">

                  {/* Chain-level overview */}
                  <EmptySection
                    icon={Building2}
                    title="Chain Details"
                    columns={["Account Name", "Channel", "Coverage Type", "Behaviour Type", "CCR Action", "CSE Owner", "Status"]}
                  />

                  {/* Sub-channel & codes */}
                  <EmptySection
                    icon={GitBranch}
                    title="Sub-Channel & Customer Codes"
                    message="Customer code hierarchy — chain, sub-channel and individual ship-to codes."
                    columns={["Customer Code", "Sub-Channel", "Trade Channel", "Depot / Plant", "Listing Based", "CLOT", "Active"]}
                  />

                  {/* Mapping Master */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Download className="h-4 w-4 text-muted-foreground" />
                        Mapping Master
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="h-7 text-xs" disabled>
                          <Download className="h-3 w-3 mr-1" /> Download (.xlsx)
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs" disabled>
                          Amend
                        </Button>
                      </div>
                    </div>
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            {["Customer Code", "CBU Code", "CIC", "Channel", "Depot", "Mapped Date", "Status"].map(c => (
                              <TableHead key={c} className="text-xs font-semibold">{c}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell colSpan={7} className="h-20 text-center text-xs text-muted-foreground">
                              <div className="flex flex-col items-center gap-1.5">
                                <AlertCircle className="h-4 w-4 text-muted-foreground/50" />
                                Download the Excel template to view or amend the mapping master.
                              </div>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </TabsContent>

                {/* ── Tab 2: Operational Masters ─────────────────── */}
                <TabsContent value="operational" className="space-y-5 mt-0">

                  <EmptySection
                    icon={Package}
                    title="PO, Lead Time & Logistics"
                    message="PO validity, lead time, rounding profile, vendor code, FSSAI validity and PDP."
                    columns={["Customer Code", "PO Validity (Days)", "Lead Time (Days)", "Rounding Profile", "Vendor Code", "FSSAI Validity", "PDP Flag", "Effective Date"]}
                  />

                  <EmptySection
                    icon={Zap}
                    title="EDI Master & Conditions"
                    message="EDI integration setup, message types and active conditions per customer code."
                    columns={["Customer Code", "EDI Type", "Message Type", "Condition Set", "Direction", "Partner ID", "Status", "Last Synced"]}
                  />

                  {/* Delivery Type */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      Delivery Type
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: "One PO → One Delivery",              desc: "Each PO generates a single delivery document." },
                        { label: "One PO → Multiple Deliveries",        desc: "A single PO can split into multiple deliveries." },
                        { label: "One PO → One Line → One Delivery",    desc: "Each PO line creates one time-bound delivery." },
                      ].map(opt => (
                        <div
                          key={opt.label}
                          className="border rounded-md p-3 text-xs bg-muted/20 opacity-60 cursor-not-allowed"
                        >
                          <p className="font-semibold text-foreground mb-1">{opt.label}</p>
                          <p className="text-muted-foreground">{opt.desc}</p>
                          <Badge variant="outline" className="mt-2 text-[10px]">Not configured</Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <EmptySection
                    icon={Mail}
                    title="Auto-Mailer Email IDs"
                    message="Email addresses for each automated notification type."
                    columns={["Mailer Type", "Email ID", "CC", "Trigger Event", "Frequency", "Active"]}
                  />
                  <div className="text-xs text-muted-foreground pl-1">
                    Mailer types: Error Log · Exception Report · Appointment Portal · SOB Trigger
                  </div>

                  <EmptySection
                    icon={ShieldCheck}
                    title="CSS Master"
                    message="Customer-specific CSS applicability: Pre-shipment, Post-shipment or Not Applicable."
                    columns={["Customer Code", "CSS Type", "Applicability", "CSS Reference", "Effective Date", "Status"]}
                  />
                </TabsContent>

                {/* ── Tab 3: BSS Master ──────────────────────────── */}
                <TabsContent value="bss" className="space-y-5 mt-0">

                  {/* BSS type overview */}
                  <div className="flex items-start gap-3 text-xs bg-blue-50 border border-blue-100 rounded-md px-4 py-3">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
                    <span className="text-blue-700">
                      BSS Master controls the sorting rule and freshness criteria applied at allocation.
                      Data is maintained at four levels of granularity — each lower level overrides the one above it.
                      Any amendment at Chain level auto-replicates to sub-levels unless an override exists.
                    </span>
                  </div>

                  {/* 4-level BSS tabs */}
                  <Tabs defaultValue="l1">
                    <TabsList className="h-7">
                      {BSS_LEVELS.map(l => (
                        <TabsTrigger key={l.id} value={l.id} className="text-[11px] h-6 px-2.5">
                          {l.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {BSS_LEVELS.map(l => (
                      <TabsContent key={l.id} value={l.id} className="mt-3">
                        <p className="text-xs text-muted-foreground mb-3">{l.description}</p>
                        <EmptySection
                          icon={SlidersHorizontal}
                          title={`BSS — ${l.label}`}
                          columns={l.columns}
                        />
                      </TabsContent>
                    ))}
                  </Tabs>

                  {/* BSS Exception List */}
                  <EmptySection
                    icon={AlertCircle}
                    title="BSS Exception List"
                    message="CBUs or customer codes explicitly excluded from standard BSS sorting rules."
                    columns={["Customer Code", "CBU / Material", "Exception Type", "Reason", "Override Sorting Rule", "Valid From", "Valid To", "Raised By"]}
                  />

                  {/* Auto BSS Maintenance */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Zap className="h-4 w-4 text-muted-foreground" />
                        Auto BSS Maintenance
                      </div>
                      <Button variant="outline" size="sm" className="h-7 text-xs" disabled>
                        Run Check
                      </Button>
                    </div>
                    <div className="border rounded-md bg-muted/10 px-4 py-4 text-xs text-muted-foreground space-y-2">
                      <p>
                        Validates that every mapped CBU for this customer chain adheres to its BSS sorting rule criteria.
                        Non-compliant CBUs are automatically corrected to sorting rule <span className="font-mono font-semibold text-foreground">916</span>.
                      </p>
                      <div className="grid grid-cols-3 gap-3 mt-3">
                        {[
                          { label: "Last Run",          value: "—" },
                          { label: "CBUs Checked",      value: "—" },
                          { label: "Corrections Made",  value: "—" },
                        ].map(s => (
                          <div key={s.label} className="bg-background border rounded-md px-3 py-2">
                            <p className="text-[10px] text-muted-foreground">{s.label}</p>
                            <p className="font-semibold text-foreground mt-0.5">{s.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* ── Tab 4: Data Visibility ─────────────────────── */}
                <TabsContent value="visibility" className="space-y-5 mt-0">

                  <div className="flex items-start gap-3 text-xs bg-amber-50 border border-amber-100 rounded-md px-4 py-3">
                    <Eye className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span className="text-amber-700">
                      Data visibility rules apply only to <span className="font-semibold">Listed CBUs</span>.
                      Four levels of visibility are supported — each level controls which users / roles can see allocation and ATP data for that scope.
                    </span>
                  </div>

                  {[
                    {
                      level: "Level 1",
                      scope: "Customer Chain",
                      desc:  "Visibility scoped to the entire customer chain — all codes, all BGs.",
                      columns: ["Customer Chain", "User / Role", "Visibility Scope", "Access Type", "Valid From", "Status"],
                    },
                    {
                      level: "Level 2",
                      scope: "Customer Chain × Business Group",
                      desc:  "Visibility restricted to a specific BG within the chain.",
                      columns: ["Customer Chain", "Business Group", "User / Role", "Access Type", "Valid From", "Status"],
                    },
                    {
                      level: "Level 3",
                      scope: "Customer Chain × BG × CBU",
                      desc:  "Granular visibility down to individual CBU within a BG.",
                      columns: ["Customer Chain", "Business Group", "CBU", "User / Role", "Access Type", "Valid From", "Status"],
                    },
                    {
                      level: "Level 4",
                      scope: "Customer Code × BG × CBU",
                      desc:  "Most granular — per ship-to code, BG and CBU.",
                      columns: ["Customer Code", "Business Group", "CBU", "User / Role", "Access Type", "Valid From", "Status"],
                    },
                  ].map(vis => (
                    <div key={vis.level} className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px] px-1.5">{vis.level}</Badge>
                        <span className="text-xs font-semibold text-foreground">{vis.scope}</span>
                        <span className="text-xs text-muted-foreground">— {vis.desc}</span>
                      </div>
                      <div className="border rounded-md overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                              {vis.columns.map(c => (
                                <TableHead key={c} className="text-xs font-semibold">{c}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell colSpan={vis.columns.length} className="h-12 text-center text-xs text-muted-foreground">
                                No visibility rules configured for {vis.level}.
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ))}
                </TabsContent>

              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
