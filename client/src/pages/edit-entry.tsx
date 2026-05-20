import { UnileverHeader } from "@/components/unilever-header";
import { StatusFlow } from "@/components/status-flow";
import { CLUSTERS as STATIC_CLUSTERS, TOP_CHANNELS as STATIC_TOP_CHANNELS, MT_SUB_CHANNELS as STATIC_MT_SUB_CHANNELS, GEOGRAPHY_DEPOT_MAP as STATIC_GEOGRAPHY_DEPOT_MAP } from "@/lib/distribution-data";
import { PeoplePicker } from "@/components/people-picker";
import { useNetworkEntryForm } from "@/controllers/useNetworkEntryForm";
import { useReferenceData, type ChannelDef, type ClusterRegionState } from "@/controllers/useReferenceData";
import { addDays, formatDateDisplay } from "@/lib/date-utils";
import { useLifecycleData, getLifecycleFlagClasses } from "@/controllers/useLifecycleData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Loader2, Save, Package, MapPin, Ruler, Info, Lock, Check, Globe, Building2, Radio, AlertTriangle, Tag, ChevronDown, ChevronRight, IndianRupee, Network, Boxes } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { PortalUser } from "@/lib/users-data";
import { RaiseAmendmentDialog } from "@/components/raise-amendment-dialog";
import { useSrStore } from "@/lib/sr-store";

// ─── Shared Price Lot types & data ────────────────────────────────────────────
type PriceLot = {
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
};

const MOCK_PRICE_LOTS: PriceLot[] = [
  {
    id: "pl-001", priceLot: "01", mrp: 199.00, currency: "INR",
    validFrom: "2024-01-01", validTo: "9999-12-31",
    allIndia: true, regions: [], channels: [], regionChannelPairs: [],
  },
  {
    id: "pl-002", priceLot: "02", mrp: 215.00, currency: "INR",
    validFrom: "2024-07-01", validTo: "9999-12-31",
    allIndia: false, channels: [], regionChannelPairs: [],
    regions: [
      "Kerala", "Rajasthan", "pondicherry C mahe", "Tamil Nadu",
      "Punjab", "Gujarat", "Nagaland", "Megalaya", "Goa",
      "Mizoram", "Uttar Pradesh (Ghaziabad) B", "Arunachal Pradesh",
      "Daman und Diu", "Sikkim", "Orissa/Odisha",
      "Haryana (Gurgoan Faridabad) (B)", "West Bengal", "Jammu und Kashmir",
    ],
  },
  {
    id: "pl-003", priceLot: "03", mrp: 229.00, currency: "INR",
    validFrom: "2025-01-01", validTo: "9999-12-31",
    allIndia: false, regions: [], regionChannelPairs: [],
    channels: ["GT", "CSD", "MT Retail", "KA"],
  },
  {
    id: "pl-004", priceLot: "04", mrp: 245.00, currency: "INR",
    validFrom: "2025-07-01", validTo: "9999-12-31",
    allIndia: false,
    regions: [
      "Mumbai +Pune (maharastra B) (mum CHN DEPOT)", "Delhi", "Tamil Nadu",
      "West Bengal", "Gujarat", "Chandigarh",
    ],
    channels: ["GT", "Ecom"],
    regionChannelPairs: [
      { region: "Mumbai +Pune (maharastra B) (mum CHN DEPOT)", channels: ["GT", "MT Retail"] },
      { region: "Delhi",       channels: ["KA", "Ecom"] },
      { region: "Tamil Nadu",  channels: ["GT", "CSD"] },
      { region: "West Bengal", channels: ["MT Retail"] },
      { region: "Gujarat",     channels: ["GT", "KA", "Ecom"] },
    ],
  },
];

/**
 * Resolves the applicable PriceLot for a geography (cluster) × channel pair.
 * Priority: AllIndia → RegionXChannel → ChannelOnly → RegionOnly
 */
function resolvePriceForGeoChannel(
  geo: string,
  channel: string,
  lots: PriceLot[],
  regionMap: ClusterRegionState[],
): PriceLot | null {
  const allIndiaLot = lots.find(l => l.allIndia);
  if (allIndiaLot) return allIndiaLot;

  const clusterStates = regionMap
    .filter(r => r.cluster === geo && r.state)
    .map(r => r.state as string);

  const rxcLot = lots.find(l =>
    l.regionChannelPairs.some(
      pair => clusterStates.includes(pair.region) && pair.channels.includes(channel),
    )
  );
  if (rxcLot) return rxcLot;

  const channelOnlyLot = lots.find(l =>
    l.channels.length > 0 &&
    l.regions.length === 0 &&
    l.regionChannelPairs.length === 0 &&
    l.channels.includes(channel),
  );
  if (channelOnlyLot) return channelOnlyLot;

  const regionOnlyLot = lots.find(l =>
    l.regions.length > 0 &&
    l.channels.length === 0 &&
    l.regionChannelPairs.length === 0 &&
    clusterStates.some(state => l.regions.includes(state)),
  );
  return regionOnlyLot ?? null;
}

function getStatusVariant(status: string | null): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "Active": return "default";
    case "Draft": return "secondary";
    case "Production Started": return "outline";
    case "Pricing Updated": return "outline";
    case "FTR Approved": return "default";
    case "Stock Movement Initiated": return "default";
    case "Network transition complete": return "default";
    default: return "secondary";
  }
}

export default function EditEntry() {
  // Fetch reference data from API
  const { 
    clusters: apiClusters, 
    geographyDepotMap: apiGeographyDepotMap, 
    topChannels: apiTopChannels,
    mtSubChannels: apiMtSubChannels,
    leafChannels: apiLeafChannels,
    clusterRegionMap,
    fetchViaSaga, 
    isLoading: refDataLoading 
  } = useReferenceData();

  // Fetch reference data on mount
  useEffect(() => {
    fetchViaSaga();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Use API data if available, fallback to static
  const hasApiData = apiClusters.length > 0;
  const CLUSTERS = hasApiData ? apiClusters.map(c => ({
    name: c.name,
    region: c.region as "South" | "West" | "North" | "East",
    depotCount: c.depotCount || 0,
    stateIds: c.stateIds || [],
    pinX: c.pinX || 0,
    pinY: c.pinY || 0,
  })) : STATIC_CLUSTERS;
  const GEOGRAPHY_DEPOT_MAP = Object.keys(apiGeographyDepotMap).length > 0 ? apiGeographyDepotMap : STATIC_GEOGRAPHY_DEPOT_MAP;
  
  // Use API channel data if available, fallback to static
  const TOP_CHANNELS: ChannelDef[] = apiTopChannels.length > 0 ? apiTopChannels : STATIC_TOP_CHANNELS;
  const MT_SUB_CHANNELS: ChannelDef[] = apiMtSubChannels.length > 0 ? apiMtSubChannels : STATIC_MT_SUB_CHANNELS;
  const LEAF_CHANNELS: ChannelDef[] = apiLeafChannels.length > 0 ? apiLeafChannels : [...STATIC_TOP_CHANNELS, ...STATIC_MT_SUB_CHANNELS];

  // Helper to get available depots using the current map
  const getAvailableDepots = (selectedGeographies: string[]): string[] => {
    if (selectedGeographies.length === 0) return [];
    const depotSet = new Set<string>();
    selectedGeographies.forEach(geo => {
      const depots = GEOGRAPHY_DEPOT_MAP[geo] || [];
      depots.forEach(d => depotSet.add(d));
    });
    return Array.from(depotSet).sort();
  };

  const {
    entry, form, isLoading, activeTab, setActiveTab,
    showConfirmDialog, setShowConfirmDialog,
    updateField, toggleArrayItem,
    toggleGeoChannel, toggleAllGeoChannels, toggleColumnChannel, toggleAllColumnsAllGeos, applyChannelsToAllGeos,
    toggleAllClusters, toggleAllDepots,
    handleSubmit, handleSaveDraft, handleConfirmSubmit, isPending, navigate,
    selectedGeo, selectedDepots, selectedChannels, channelMapping,
    allClustersSelected, allDepotsSelected,
    selectedLeafCount,
    computedYear, isDraft,
  } = useNetworkEntryForm({ 
    geographyDepotMap: GEOGRAPHY_DEPOT_MAP,
    topChannels: TOP_CHANNELS,
    mtSubChannels: MT_SUB_CHANNELS,
    clusters: CLUSTERS,
  });

  const { toast } = useToast();

  // Detect if opened from Paid Bible (view-only mode)
  const _pbParams = new URLSearchParams(window.location.search);
  const isPaidBibleView = _pbParams.get("source") === "paid-bible";
  const cbuStatusFromPaidBible = isPaidBibleView ? (_pbParams.get("cbuStatus") || "") : "";

  const [showAmendmentDialog, setShowAmendmentDialog] = useState(false);
  const { data: portalUsers = [] } = useQuery<PortalUser[]>({ queryKey: ["/api/users"] });
  const { channelOverrides, sourcingOverrides, geoRemovalOverrides, requests: allRequests } = useSrStore();
  const handleRaiseAmendment = () => setShowAmendmentDialog(true);

  const cbuPendingSrs = useMemo(() => {
    if (!entry) return [];
    return allRequests.filter(r =>
      r.overallStatus === "pending" &&
      (r.cbuId === entry.id || r.cbuCode === entry.cbuCode),
    );
  }, [allRequests, entry?.id, entry?.cbuCode]);

  const handleAmendmentSuccess = () => {
    toast({
      title: "Amendment request raised",
      description: `Your amendment request for ${entry?.cbuCode || "this CBU"} has been submitted for approval.`,
    });
    navigate("/paid-bible?tab=service-requests");
  };

  // Sourcing Matrix local state
  const [sourcingMode, setSourcingMode] = useState<"decentralized" | "centralized">("decentralized");
  const [centralizedGeo, setCentralizedGeo] = useState<string[]>([]);
  const [centralizedDepots, setCentralizedDepots] = useState<string[]>([]);
  const [showSourcingAllDialog, setShowSourcingAllDialog] = useState(false);

  // Detect when ALL distribution geos + depots are selected in centralized mode
  useEffect(() => {
    if (sourcingMode !== "centralized" || selectedGeo.length === 0) return;
    const allGeosSelected = selectedGeo.every(g => centralizedGeo.includes(g));
    const allDepotsSelected = selectedDepots.length > 0 && selectedDepots.every(d => centralizedDepots.includes(d));
    if (allGeosSelected && allDepotsSelected) setShowSourcingAllDialog(true);
  }, [centralizedGeo, centralizedDepots, sourcingMode, selectedGeo, selectedDepots]);

  const handleSourcingModeChange = (mode: "decentralized" | "centralized") => {
    setSourcingMode(mode);
    if (mode === "centralized") {
      setCentralizedGeo([]);
      setCentralizedDepots([]);
    }
  };

  // Wrapped submit — runs all cross-tab validations before the form's own submit
  const handleFormSubmit = (e?: React.FormEvent | React.MouseEvent) => {
    // 1. Distribution: every selected geo must have at least one depot
    const distGeoMissingDepot = selectedGeo.filter(geo => {
      const geoDepots = GEOGRAPHY_DEPOT_MAP[geo] || [];
      return !geoDepots.some(d => selectedDepots.includes(d));
    });
    if (distGeoMissingDepot.length > 0) {
      setActiveTab("distribution");
      toast({
        title: "Depot required for selected geography",
        description: `Please select at least one depot for: ${distGeoMissingDepot.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    // 2. Sourcing — centralized: must have at least one depot total
    if (sourcingMode === "centralized" && centralizedDepots.length === 0) {
      setActiveTab("sourcing");
      toast({
        title: "Sourcing depot required",
        description: "Please select at least one depot in Centralized sourcing mode before submitting.",
        variant: "destructive",
      });
      return;
    }

    // 3. Sourcing — centralized: every selected geo must have at least one depot
    if (sourcingMode === "centralized") {
      const sourcingGeoMissingDepot = centralizedGeo.filter(geo => {
        const availableDepots = (GEOGRAPHY_DEPOT_MAP[geo] || []).filter(d => selectedDepots.includes(d));
        return !availableDepots.some(d => centralizedDepots.includes(d));
      });
      if (sourcingGeoMissingDepot.length > 0) {
        setActiveTab("sourcing");
        toast({
          title: "Depot required for selected geography",
          description: `Please select at least one depot for: ${sourcingGeoMissingDepot.join(", ")}`,
          variant: "destructive",
        });
        return;
      }
    }

    if (e && "preventDefault" in e) handleSubmit(e as React.FormEvent);
    else handleSubmit();
  };

  const toggleCentralizedGeo = (geoName: string) => {
    setCentralizedGeo(prev => {
      const next = prev.includes(geoName) ? prev.filter(g => g !== geoName) : [...prev, geoName];
      // remove depots belonging to this geo if geo was deselected
      if (prev.includes(geoName)) {
        const geoDepots = GEOGRAPHY_DEPOT_MAP[geoName] || [];
        setCentralizedDepots(d => d.filter(dep => !geoDepots.includes(dep)));
      }
      return next;
    });
  };

  const toggleCentralizedDepot = (depot: string) => {
    setCentralizedDepots(prev =>
      prev.includes(depot) ? prev.filter(d => d !== depot) : [...prev, depot]
    );
  };

  const { lifecycleMap } = useLifecycleData();
  const lifecycle = entry ? lifecycleMap[entry.id] : undefined;


  // Apply approved channel-extension overrides
  const inMemChannelOverride = entry ? (channelOverrides[entry.id] ?? []) : [];
  const effectiveChannels = inMemChannelOverride.length > 0
    ? [...new Set([...selectedChannels, ...inMemChannelOverride])]
    : selectedChannels;
  const effectiveChannelMapping: Record<string, string[]> = inMemChannelOverride.length > 0
    ? Object.fromEntries(
        selectedGeo.map(geo => [
          geo,
          [...new Set([...(channelMapping[geo] || []), ...inMemChannelOverride])],
        ])
      )
    : channelMapping;

  // Apply approved geo-extension removal overrides
  const inMemGeoRemoval = entry ? (geoRemovalOverrides[entry.id] ?? { removedGeos: [], removedDepots: [] }) : { removedGeos: [], removedDepots: [] };
  const effectiveGeo = inMemGeoRemoval.removedGeos.length > 0
    ? selectedGeo.filter(g => !inMemGeoRemoval.removedGeos.includes(g))
    : selectedGeo;
  const effectiveDepots = inMemGeoRemoval.removedDepots.length > 0
    ? selectedDepots.filter(d => !inMemGeoRemoval.removedDepots.includes(d))
    : selectedDepots;

  // Apply approved sourcing-amendment overrides
  const inMemSourcingOverride = entry ? (sourcingOverrides[entry.id] ?? null) : null;
  useEffect(() => {
    if (!inMemSourcingOverride) return;
    setSourcingMode(inMemSourcingOverride.mode);
    if (inMemSourcingOverride.mode === "centralized") {
      setCentralizedGeo(inMemSourcingOverride.centralizedGeos);
      setCentralizedDepots(inMemSourcingOverride.centralizedDepots);
    } else {
      setCentralizedGeo([]);
      setCentralizedDepots([]);
    }
  }, [inMemSourcingOverride]);


  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <UnileverHeader />
        <main className="max-w-[1200px] mx-auto px-6 py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-[600px] w-full" />
        </main>
      </div>
    );
  }

  if (!entry || !form) {
    return (
      <div className="min-h-screen bg-background">
        <UnileverHeader />
        <main className="max-w-[1200px] mx-auto px-6 py-8">
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">Entry not found</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/network")}>
              Back to Dashboard
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <UnileverHeader />

      <main className="max-w-[1200px] mx-auto px-6 py-6">
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(isPaidBibleView ? "/paid-bible" : "/network")} data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold" data-testid="text-edit-title">
                  {entry.materialDescription || entry.cbuCode || "Edit Entry"}
                </h1>
                {lifecycle?.colorFlag && (
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${getLifecycleFlagClasses(lifecycle.colorFlag)}`} data-testid="flag-edit" />
                    <span className="text-xs text-muted-foreground">{lifecycle.flagLabel}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1 flex-wrap text-sm text-muted-foreground">
                <span>CBU Code: <span className="font-mono text-foreground">{entry.cbuCode}</span></span>
                <span className="text-muted-foreground/40">·</span>
                <span>
                  Network Status:{" "}
                  <Badge variant={getStatusVariant(entry.networkStatus)} className="ml-1 text-xs" data-testid="badge-edit-status">
                    {entry.networkStatus || "Draft"}
                  </Badge>
                </span>
                {isPaidBibleView && cbuStatusFromPaidBible && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span>
                      Material Status:{" "}
                      <Badge
                        variant="outline"
                        className={`ml-1 text-xs font-medium ${
                          cbuStatusFromPaidBible.toLowerCase() === "issue"
                            ? "border-red-300 text-red-600 bg-red-50"
                            : cbuStatusFromPaidBible.toLowerCase() === "ok"
                            ? "border-emerald-300 text-emerald-600 bg-emerald-50"
                            : ""
                        }`}
                        data-testid="badge-cbu-status"
                      >
                        {cbuStatusFromPaidBible}
                      </Badge>
                    </span>
                  </>
                )}
                {entry.assignedPerson && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span>Network Planner: <span className="font-medium text-foreground">{entry.assignedPerson}</span></span>
                  </>
                )}
              </div>
            </div>
          </div>
          {isPaidBibleView ? (
            <Button
              onClick={handleRaiseAmendment}
              variant="outline"
              className="gap-2 border-amber-400 text-amber-700 hover:bg-amber-50"
              data-testid="button-raise-amendment"
            >
              <AlertTriangle className="h-4 w-4" />
              Raise Amendment Request
            </Button>
          ) : isDraft ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={isPending}
                data-testid="button-save-draft"
              >
                {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Draft
              </Button>
              <Button onClick={handleFormSubmit} disabled={isPending} data-testid="button-activate">
                {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                Submit & Activate
              </Button>
            </div>
          ) : (
            <Button onClick={handleFormSubmit} disabled={isPending} data-testid="button-save">
              {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          )}
        </div>

        {!isPaidBibleView && (
          <StatusFlow currentStatus={entry.networkStatus} colorFlag={lifecycle?.colorFlag} />
        )}

        {isPaidBibleView ? (
          <div className="flex items-center gap-2 mb-5 px-1 py-2.5 rounded-md bg-amber-50 border border-amber-200">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-700">
              <span className="font-semibold">View only</span> — You are viewing this entry from the Paid Bible.
              To request a change, use <span className="font-semibold">Raise Amendment Request</span> above.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-5 px-1">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Fields sourced directly from data are read-only. Only manually entered fields can be edited.
            </p>
          </div>
        )}

        <form onSubmit={handleFormSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start mb-6 bg-muted/50 p-1" data-testid="tabs-edit">
              <TabsTrigger value="basic" className="gap-2" data-testid="tab-basic">
                <Info className="h-4 w-4" /> Basic Info
              </TabsTrigger>
              <TabsTrigger value="product" className="gap-2" data-testid="tab-product">
                <Package className="h-4 w-4" /> Product Details
              </TabsTrigger>
              <TabsTrigger value="dimensions" className="gap-2" data-testid="tab-dimensions">
                <Ruler className="h-4 w-4" /> Dimensions
              </TabsTrigger>
              <TabsTrigger value="distribution" className="gap-2" data-testid="tab-distribution">
                <MapPin className="h-4 w-4" /> Distribution
              </TabsTrigger>
              <TabsTrigger value="sourcing" className="gap-2" data-testid="tab-sourcing">
                <Boxes className="h-4 w-4" /> Sourcing Matrix
              </TabsTrigger>
              <TabsTrigger value="pricing" className="gap-2" data-testid="tab-pricing">
                <Tag className="h-4 w-4" /> Pricing
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-4">
                    <h3 className="text-sm font-semibold text-[#0d8ecf] dark:text-[#4db8e8]">Identification</h3>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ReadOnlyField label="CBU Code / Material ID" value={form.cbuCode} testId="input-cbu-code" />
                    <ReadOnlyField label="Material Description" value={form.materialDescription} testId="input-material-description" />
                    <ReadOnlyField label="Annexure Number" value={form.annexureNumber} testId="input-annexure-number" />
                    <ReadOnlyField label="Type of Network / Annexure" value={form.typeOfNetwork} testId="input-type-of-network" />
                    <ReadOnlyField label="Copy from Existing CBU" value={form.copyCbu} testId="input-copy-cbu" />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-4">
                    <h3 className="text-sm font-semibold text-[#0d8ecf] dark:text-[#4db8e8]">Dates & Timeline</h3>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ReadOnlyField label="CBU Created Date" value={form.cbuCreatedDate} testId="input-cbu-created-date" />
                    <ReadOnlyField label="Year (auto-calculated)" value={computedYear != null ? String(computedYear) : null} testId="input-year" />
                    <ReadOnlyField label="Network Status (calculated)" value={form.networkStatus} testId="input-network-status" />
                    <FormField label="Update Assignee" hint={form.bg ? `Showing active planners for ${form.bg}` : undefined}>
                      <PeoplePicker
                        value={form.assignedPerson}
                        onChange={(val) => updateField("assignedPerson", val)}
                        testId="input-assigned-person"
                        bg={form.bg}
                      />
                    </FormField>
                    <FormField label="Network Change Date" hint={form.cbuCreatedDate ? `Auto-calculated: CBU date + 15 days. Min: ${formatDateDisplay(addDays(form.cbuCreatedDate, 1))}` : undefined}>
                      <Input
                        type="date"
                        value={form.networkChangeDate || ""}
                        min={form.cbuCreatedDate ? addDays(form.cbuCreatedDate, 1) : undefined}
                        onChange={e => updateField("networkChangeDate", e.target.value)}
                        data-testid="input-network-change-date"
                      />
                    </FormField>
                    <FormField label="Start Date" hint={form.networkChangeDate ? `Must be on or after change date: ${formatDateDisplay(form.networkChangeDate)}` : undefined}>
                      <Input
                        type="date"
                        value={form.startDate || ""}
                        min={form.networkChangeDate || undefined}
                        onChange={e => updateField("startDate", e.target.value)}
                        data-testid="input-start-date"
                      />
                    </FormField>
                    <FormField label="End Date" hint={form.startDate ? `Must be on or after start date: ${formatDateDisplay(form.startDate)}` : undefined}>
                      <Input
                        type="date"
                        value={form.endDate || ""}
                        min={form.startDate || undefined}
                        onChange={e => updateField("endDate", e.target.value)}
                        data-testid="input-end-date"
                      />
                    </FormField>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="product" className="mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-4">
                    <h3 className="text-sm font-semibold text-[#0d8ecf] dark:text-[#4db8e8]">Product Classification</h3>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ReadOnlyField label="Basepack" value={form.basepack} testId="input-basepack" />
                    <ReadOnlyField label="Basepack Description" value={form.basepackDescription} testId="input-basepack-description" />
                    <ReadOnlyField label="BG" value={form.bg} testId="input-bg" />
                    <ReadOnlyField label="Profit Centre" value={form.profitCentre} testId="input-profit-centre" />
                    <ReadOnlyField label="Sales Category" value={form.salesCategory} testId="input-sales-category" />
                    <ReadOnlyField label="Small C" value={form.smallC} testId="input-small-c" />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-4">
                    <h3 className="text-sm font-semibold text-[#0d8ecf] dark:text-[#4db8e8]">Brand & References</h3>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ReadOnlyField label="Brand" value={form.brand} testId="input-brand" />
                    <ReadOnlyField label="Format" value={form.format} testId="input-format" />
                    <ReadOnlyField label="Predecessor Code" value={form.predecessorCode} testId="input-predecessor-code" />
                    <ReadOnlyField label="Successor Code" value={form.successorCode} testId="input-successor-code" />
                    <ReadOnlyField label="Header Code" value={form.headerCode} testId="input-header-code" />
                    <ReadOnlyField label="CSD Index No." value={form.csdIndexNo} testId="input-csd-index" />
                    <FormField label="FTR Images Link">
                      <Input value={form.ftrImagesLink || ""} onChange={e => updateField("ftrImagesLink", e.target.value)} placeholder="Enter FTR images link" data-testid="input-ftr-link" />
                    </FormField>
                    <ReadOnlyField label="PC at Channel/State Level" value={form.pcAtChannelState} testId="input-pc-channel" />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="dimensions" className="mt-0">
              <Card>
                <CardHeader className="pb-4">
                  <h3 className="text-sm font-semibold text-[#0d8ecf] dark:text-[#4db8e8]">Dimensions & Packaging</h3>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <ReadOnlyField label="Case Config" value={form.caseConfig} testId="input-case-config" />
                      <NewBadge updatedAt={entry.caseConfigUpdatedAt as string | null | undefined} />
                    </div>
                    <ReadOnlyField label="EAN" value={form.ean} testId="input-ean" />
                    <ReadOnlyField label="ITF" value={form.itf} testId="input-itf" />
                    <ReadOnlyField label="Net Weight (g)" value={form.netWeight != null ? String(form.netWeight) : null} testId="input-net-weight" />
                    <ReadOnlyField label="Gross Weight (g)" value={form.grossWeight != null ? String(form.grossWeight) : null} testId="input-gross-weight" />
                    <ReadOnlyField label="Length (mm)" value={form.length != null ? String(form.length) : null} testId="input-length" />
                    <ReadOnlyField label="Width (mm)" value={form.width != null ? String(form.width) : null} testId="input-width" />
                    <ReadOnlyField label="Height (mm)" value={form.height != null ? String(form.height) : null} testId="input-height" />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="distribution" className="mt-0">
              <Tabs defaultValue="geo-depot" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="geo-depot" className="text-xs">
                    <Building2 className="h-3.5 w-3.5 mr-1.5" />
                    Geo → Depot
                  </TabsTrigger>
                  <TabsTrigger value="geo-channel" className="text-xs">
                    <Radio className="h-3.5 w-3.5 mr-1.5" />
                    Geo → Channel
                  </TabsTrigger>
                  <TabsTrigger value="summary" className="text-xs">
                    <Info className="h-3.5 w-3.5 mr-1.5" />
                    Summary
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="geo-depot" className="mt-0">
                  <Card data-testid="distribution-geography-depot">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-primary" />
                          <h3 className="text-sm font-semibold">Geography & Depots</h3>
                          <Badge variant="secondary" className="text-[10px]">{selectedGeo.length}/{CLUSTERS.length} geo</Badge>
                          <Badge variant="outline" className="text-[10px]">{selectedDepots.length}/{getAvailableDepots(selectedGeo).length || 0} depots</Badge>
                        </div>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 cursor-pointer" data-testid="toggle-all-clusters">
                            <Checkbox
                              checked={allClustersSelected}
                              onCheckedChange={toggleAllClusters}
                            />
                            <span className="text-xs font-medium">All Clusters</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer" data-testid="toggle-all-depots">
                            <Checkbox
                              checked={allDepotsSelected}
                              onCheckedChange={toggleAllDepots}
                              disabled={selectedGeo.length === 0}
                            />
                            <span className="text-xs font-medium">All Depots</span>
                          </label>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="border rounded-lg overflow-hidden" data-testid="checkboxes-geography-depot">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted/50 border-b">
                              <th className="text-left py-2 px-3 font-medium text-xs w-[200px]">Geography</th>
                              <th className="text-left py-2 px-3 font-medium text-xs">Available Depots</th>
                            </tr>
                          </thead>
                          <tbody>
                            {CLUSTERS.map((cluster, idx) => {
                              const isGeoSelected = selectedGeo.includes(cluster.name);
                              const geoDepots = GEOGRAPHY_DEPOT_MAP[cluster.name] || [];
                              const allGeoDepotsSelected = geoDepots.length > 0 && geoDepots.every(d => selectedDepots.includes(d));
                              const someGeoDepotsSelected = geoDepots.some(d => selectedDepots.includes(d));
                              return (
                                <tr key={cluster.name} className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                                  <td className="py-2 px-3 border-r font-medium text-xs whitespace-nowrap align-middle">
                                    <label className={`flex items-center gap-2 rounded px-1 py-0.5 cursor-pointer ${isGeoSelected ? "bg-primary/10" : "hover:bg-muted/50"}`}>
                                      <Checkbox
                                        checked={isGeoSelected}
                                        onCheckedChange={() => toggleArrayItem("geography", cluster.name)}
                                        data-testid={`checkbox-geo-${cluster.name.toLowerCase().replace(/[\s-]+/g, "-")}`}
                                      />
                                      <span>{cluster.name}</span>
                                    </label>
                                  </td>
                                  <td className="py-2 px-3">
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                      {geoDepots.length > 1 && (
                                        <label className={`flex items-center gap-1.5 py-1 px-2 rounded transition-colors border ${!isGeoSelected ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${allGeoDepotsSelected ? "bg-primary/10 border-primary/30" : someGeoDepotsSelected ? "bg-muted/50 border-muted" : "hover:bg-muted/50 border-transparent"}`}>
                                          <Checkbox
                                            checked={allGeoDepotsSelected}
                                            disabled={!isGeoSelected}
                                            onCheckedChange={() => {
                                              geoDepots.forEach(depot => {
                                                const isCurrentlySelected = selectedDepots.includes(depot);
                                                if (allGeoDepotsSelected && isCurrentlySelected) {
                                                  toggleArrayItem("depot", depot);
                                                } else if (!allGeoDepotsSelected && !isCurrentlySelected) {
                                                  toggleArrayItem("depot", depot);
                                                }
                                              });
                                            }}
                                            data-testid={`checkbox-geo-depots-${cluster.name.toLowerCase().replace(/[\s-]+/g, "-")}`}
                                          />
                                          <span className="text-[10px] font-medium text-muted-foreground">All</span>
                                        </label>
                                      )}
                                      {geoDepots.map(depot => {
                                        const isChecked = selectedDepots.includes(depot);
                                        return (
                                          <label key={depot} className={`flex items-center gap-1.5 py-1 px-2 rounded transition-colors ${!isGeoSelected ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${isChecked ? "bg-primary/10" : "hover:bg-muted/50"}`}>
                                            <Checkbox
                                              checked={isChecked}
                                              disabled={!isGeoSelected}
                                              onCheckedChange={() => toggleArrayItem("depot", depot)}
                                              data-testid={`checkbox-depot-${depot.toLowerCase()}`}
                                            />
                                            <span className="text-xs font-mono">{depot}</span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="geo-channel" className="mt-0">
                  <Card data-testid="distribution-channel">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Radio className="h-4 w-4 text-primary" />
                          <h3 className="text-sm font-semibold">Channels by Geography</h3>
                          <Badge variant="secondary" className="text-[10px]">{selectedLeafCount} channel(s)</Badge>
                        </div>
                        {selectedGeo.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs px-3"
                            onClick={() => toggleAllColumnsAllGeos()}
                            data-testid="btn-apply-all-channels-all-geo"
                          >
                            Select all for all geographies
                          </Button>
                        )}
                      </div>
                      {selectedGeo.length === 0 && (
                        <p className="text-xs text-muted-foreground mt-1">Select geographies in the "Geo → Depot" tab first to configure channels.</p>
                      )}
                    </CardHeader>
                    {selectedGeo.length > 0 && (
                      <CardContent className="pt-0 px-0" data-testid="checkboxes-channel">
                        <div className="overflow-auto max-h-72">
                          <table className="w-full text-xs border-separate border-spacing-0">
                            <thead className="sticky top-0 z-10">
                              {(() => {
                                const allMtSubCodes = MT_SUB_CHANNELS.map(c => c.code);
                                const colState = (code: string) => {
                                  const codes = code === "MT" ? allMtSubCodes : [code];
                                  const all = selectedGeo.every(g => codes.every(c => (effectiveChannelMapping[g] || []).includes(c)));
                                  const some = selectedGeo.some(g => codes.some(c => (effectiveChannelMapping[g] || []).includes(c)));
                                  return all ? true : some ? ("indeterminate" as const) : false;
                                };
                                const allColState = (() => {
                                  const leafCodes = LEAF_CHANNELS.map(c => c.code);
                                  const all = selectedGeo.every(g => leafCodes.every(c => (effectiveChannelMapping[g] || []).includes(c)));
                                  const some = selectedGeo.some(g => leafCodes.some(c => (effectiveChannelMapping[g] || []).includes(c)));
                                  return all ? true : some ? ("indeterminate" as const) : false;
                                })();
                                // Pill component for column header toggles
                                const ColPill = ({ label, state }: { label: string; state: boolean | "indeterminate" }) => (
                                  <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap transition-all ${
                                    state === true
                                      ? "bg-[#00b0d7] border-[#00b0d7] text-white"
                                      : state === "indeterminate"
                                        ? "bg-[#00b0d7]/10 border-[#00b0d7]/30 text-[#00b0d7]"
                                        : "bg-white border-border text-muted-foreground hover:border-[#00b0d7]/40"
                                  }`}>
                                    {label}
                                  </div>
                                );

                                return (
                                  <>
                                    {/* Row 1: Cluster label + top-level channel pills + MT group label + All pill */}
                                    <tr>
                                      <th className="text-left py-3 pl-6 pr-4 text-muted-foreground font-medium w-40 bg-white border-b border-border/60">
                                        Cluster
                                      </th>
                                      {TOP_CHANNELS.map(ch => (
                                        <th
                                          key={ch.code}
                                          onClick={() => toggleColumnChannel(ch.code)}
                                          data-testid={`toggle-col-${ch.code.toLowerCase()}`}
                                          className="text-center py-3 px-3 bg-white border-b border-border/60 cursor-pointer select-none"
                                        >
                                          <ColPill label={ch.code} state={colState(ch.code)} />
                                        </th>
                                      ))}
                                      {/* MT group header — label only, not a toggle */}
                                      <th
                                        colSpan={MT_SUB_CHANNELS.length + 1}
                                        className="text-center py-3 px-4 font-semibold text-[#00b0d7] bg-[#e6f7fb] border-b-2 border-[#00b0d7]/40"
                                      >
                                        MT
                                      </th>
                                      {/* All — toggles every channel for every geo */}
                                      <th
                                        onClick={() => toggleAllColumnsAllGeos()}
                                        data-testid="toggle-col-all"
                                        className="text-center py-3 px-3 bg-white border-b border-border/60 cursor-pointer select-none"
                                      >
                                        <ColPill label="All" state={allColState} />
                                      </th>
                                    </tr>
                                    {/* Row 2: MT sub-channel pills */}
                                    <tr>
                                      <th className="py-2 pl-6 bg-white border-b border-border/50" />
                                      {TOP_CHANNELS.map(ch => <th key={ch.code} className="py-2 px-3 bg-white border-b border-border/50" />)}
                                      {/* MT All pill */}
                                      <th
                                        onClick={() => toggleColumnChannel("MT")}
                                        data-testid="toggle-col-mt"
                                        className="text-center py-2 px-3 bg-[#e6f7fb] border-b border-border/50 cursor-pointer select-none"
                                      >
                                        <ColPill label="All" state={colState("MT")} />
                                      </th>
                                      {/* MT sub-channel pills */}
                                      {MT_SUB_CHANNELS.map(ch => (
                                        <th
                                          key={ch.code}
                                          onClick={() => toggleColumnChannel(ch.code)}
                                          data-testid={`toggle-col-${ch.code.toLowerCase().replace(/\s/g, "-")}`}
                                          className="text-center py-2 px-3 bg-[#e6f7fb] border-b border-border/50 cursor-pointer select-none"
                                        >
                                          <ColPill label={ch.code} state={colState(ch.code)} />
                                        </th>
                                      ))}
                                      <th className="py-2 px-3 bg-white border-b border-border/50" />
                                    </tr>
                                  </>
                                );
                              })()}
                            </thead>
                            <tbody>
                              {selectedGeo.map((geo, idx) => {
                                const geoChannels = effectiveChannelMapping[geo] || [];
                                const allGeoSelected = LEAF_CHANNELS.every(c => geoChannels.includes(c.code));
                                const mtSubCodes = MT_SUB_CHANNELS.map(c => c.code);
                                const geoMtAllSelected = mtSubCodes.every(c => geoChannels.includes(c));
                                const geoMtSomeSelected = mtSubCodes.some(c => geoChannels.includes(c));
                                const geoKey = geo.toLowerCase().replace(/[\s-]+/g, "-");
                                return (
                                  <tr
                                    key={geo}
                                    className={`border-b border-border/30 transition-colors hover:bg-muted/20 ${idx % 2 === 0 ? "" : "bg-muted/10"}`}
                                    data-testid={`geo-channel-${geoKey}`}
                                  >
                                    {/* Cluster name */}
                                    <td className="py-3 pl-6 pr-4">
                                      <div className="flex items-center gap-1.5">
                                        <MapPin className="h-3 w-3 text-[#0d8ecf] shrink-0" />
                                        <span className="text-[13px] font-medium text-[#00b0d7] capitalize leading-tight">
                                          {geo.toLowerCase()}
                                        </span>
                                      </div>
                                    </td>
                                    {/* Top-level channels */}
                                    {TOP_CHANNELS.map(ch => (
                                      <td key={ch.code} className="text-center py-3 px-4">
                                        <Checkbox
                                          checked={geoChannels.includes(ch.code)}
                                          onCheckedChange={() => toggleGeoChannel(geo, ch.code)}
                                          data-testid={`checkbox-channel-${geoKey}-${ch.code.toLowerCase()}`}
                                          className="mx-auto"
                                        />
                                      </td>
                                    ))}
                                    {/* MT All — selects/deselects all MT sub-channels for this geo */}
                                    <td className="text-center py-3 px-4 bg-[#f0fafd]">
                                      <Checkbox
                                        checked={geoMtAllSelected}
                                        data-state={geoMtSomeSelected && !geoMtAllSelected ? "indeterminate" : undefined}
                                        onCheckedChange={() => toggleGeoChannel(geo, "MT")}
                                        data-testid={`checkbox-channel-${geoKey}-mt`}
                                        className="mx-auto"
                                      />
                                    </td>
                                    {/* MT sub-channels */}
                                    {MT_SUB_CHANNELS.map(ch => (
                                      <td key={ch.code} className="text-center py-3 px-4 bg-[#f0fafd]">
                                        <Checkbox
                                          checked={geoChannels.includes(ch.code)}
                                          onCheckedChange={() => toggleGeoChannel(geo, ch.code)}
                                          data-testid={`checkbox-channel-${geoKey}-${ch.code.toLowerCase().replace(/\s/g, "-")}`}
                                          className="mx-auto"
                                        />
                                      </td>
                                    ))}
                                    {/* All channels */}
                                    <td className="text-center py-3 px-4">
                                      <Checkbox
                                        checked={allGeoSelected}
                                        onCheckedChange={() => toggleAllGeoChannels(geo)}
                                        data-testid={`toggle-all-channels-${geoKey}`}
                                        className="mx-auto"
                                      />
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                </TabsContent>

                <TabsContent value="summary" className="mt-0">
                  <Card data-testid="distribution-matrix">
                    <CardHeader className="pb-3">
                      <div>
                        <p className="text-sm font-semibold">Distribution Matrix Preview</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Shows coverage by geography, depot, and channel (per geography)</p>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const allMatrixChannels = Array.from(new Set(
                          selectedGeo.flatMap(g => (channelMapping[g] || []).filter(c => c !== "MT"))
                        ));
                        return selectedGeo.length > 0 && selectedDepots.length > 0 && allMatrixChannels.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left py-2 pr-3 text-muted-foreground font-medium">Geography</th>
                                  <th className="text-left py-2 pr-3 text-muted-foreground font-medium">Depot</th>
                                  {allMatrixChannels.map(ch => (
                                    <th key={ch} className="text-center py-2 px-2 text-muted-foreground font-medium">{ch}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {selectedGeo.slice(0, 8).map((geo) => {
                                  const geoDepots = (GEOGRAPHY_DEPOT_MAP[geo] || []).filter(d => selectedDepots.includes(d));
                                  const depotCode = geoDepots.join(", ") || "—";
                                  const geoChannels = (channelMapping[geo] || []).filter(c => c !== "MT");
                                  return (
                                    <tr key={geo} className="border-b border-border/50">
                                      <td className="py-2 pr-3 font-medium">{geo.length > 22 ? geo.substring(0, 20) + "..." : geo}</td>
                                      <td className="py-2 pr-3 font-mono text-muted-foreground">{depotCode}</td>
                                      {allMatrixChannels.map(ch => (
                                        <td key={ch} className="text-center py-2 px-2">
                                          {geoChannels.includes(ch) ? (
                                            <div className="w-5 h-5 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                                              <Check className="h-3 w-3 text-primary" />
                                            </div>
                                          ) : (
                                            <div className="w-5 h-5 mx-auto rounded-full bg-muted/30 flex items-center justify-center">
                                              <span className="text-[10px] text-muted-foreground">-</span>
                                            </div>
                                          )}
                                        </td>
                                      ))}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                            {selectedGeo.length > 8 && (
                              <p className="text-[10px] text-muted-foreground mt-2 text-center">+ {selectedGeo.length - 8} more clusters</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground text-center py-6">Select geography, depots, and channels to see the distribution matrix.</p>
                        );
                      })()}
                    </CardContent>
                  </Card>

                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* ── Sourcing Matrix Tab ───────────────────────────────── */}
            <TabsContent value="sourcing" className="mt-0">
              {(() => {
                const isDecentralized = sourcingMode === "decentralized";
                const activeSourcingGeo = isDecentralized ? selectedGeo : centralizedGeo;
                const activeSourcingDepots = isDecentralized ? selectedDepots : centralizedDepots;
                const selectedGeoCount = isDecentralized ? selectedGeo.length : centralizedGeo.length;
                const selectedDepotCount = isDecentralized ? selectedDepots.length : centralizedDepots.length;

                return (
                  <div className="space-y-4">
                    {/* Mode toggle */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center bg-muted rounded-full p-1 gap-1">
                          <button
                            type="button"
                            data-testid="toggle-decentralized"
                            onClick={() => handleSourcingModeChange("decentralized")}
                            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${isDecentralized ? "bg-white dark:bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                          >
                            Decentralized
                          </button>
                          <button
                            type="button"
                            data-testid="toggle-centralized"
                            onClick={() => handleSourcingModeChange("centralized")}
                            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${!isDecentralized ? "bg-white dark:bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                          >
                            Centralized
                          </button>
                        </div>
                        {isDecentralized && (
                          <Badge variant="secondary" className="text-[10px] gap-1">
                            <Lock className="h-2.5 w-2.5" /> Read-only · from Distribution
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{selectedGeoCount} geo selected</Badge>
                        <Badge variant="outline" className="text-[10px]">{selectedDepotCount} depots selected</Badge>
                      </div>
                    </div>

                    {selectedGeo.length === 0 ? (
                      <Card>
                        <CardContent className="py-10 text-center">
                          <Building2 className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                          <p className="text-sm text-muted-foreground">No geography selected in Distribution tab.</p>
                          <p className="text-xs text-muted-foreground/60 mt-1">Select clusters in the Distribution tab first.</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card data-testid="sourcing-matrix-table">
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-2">
                            <Boxes className="h-4 w-4 text-primary" />
                            <h3 className="text-sm font-semibold">Sourcing by Geography & Depot</h3>
                          </div>
                          {!isDecentralized && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Select the geographies and depots for centralized sourcing.
                            </p>
                          )}
                        </CardHeader>
                        <CardContent>
                          <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-muted/50 border-b">
                                  <th className="text-left py-2 px-3 font-medium text-xs w-[200px]">Geography</th>
                                  <th className="text-left py-2 px-3 font-medium text-xs">Depots</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedGeo.map((geoName, idx) => {
                                  const geoDepots = (GEOGRAPHY_DEPOT_MAP[geoName] || []).filter(d => selectedDepots.includes(d));
                                  const isGeoActive = activeSourcingGeo.includes(geoName);
                                  const allGeoDepotsActive = geoDepots.length > 0 && geoDepots.every(d => activeSourcingDepots.includes(d));
                                  return (
                                    <tr key={geoName} className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                                      <td className="py-2 px-3 border-r font-medium text-xs whitespace-nowrap align-middle">
                                        <label className={`flex items-center gap-2 rounded px-1 py-0.5 ${isDecentralized ? "cursor-default" : "cursor-pointer"} ${isGeoActive ? "bg-primary/10" : isDecentralized ? "" : "hover:bg-muted/50"}`}>
                                          <Checkbox
                                            checked={isGeoActive}
                                            disabled={isDecentralized}
                                            onCheckedChange={isDecentralized ? undefined : () => toggleCentralizedGeo(geoName)}
                                            data-testid={`sourcing-geo-${geoName.toLowerCase().replace(/[\s-]+/g, "-")}`}
                                          />
                                          <span>{geoName}</span>
                                        </label>
                                      </td>
                                      <td className="py-2 px-3">
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                          {geoDepots.length > 1 && (
                                            <label className={`flex items-center gap-1.5 py-1 px-2 rounded border transition-colors
                                              ${isDecentralized ? "cursor-default opacity-80" : !isGeoActive ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                                              ${allGeoDepotsActive ? "bg-primary/10 border-primary/30" : "border-transparent hover:bg-muted/50"}`}>
                                              <Checkbox
                                                checked={allGeoDepotsActive}
                                                disabled={isDecentralized || !isGeoActive}
                                                onCheckedChange={isDecentralized ? undefined : () => {
                                                  geoDepots.forEach(depot => {
                                                    const isActive = centralizedDepots.includes(depot);
                                                    if (allGeoDepotsActive && isActive) toggleCentralizedDepot(depot);
                                                    else if (!allGeoDepotsActive && !isActive) toggleCentralizedDepot(depot);
                                                  });
                                                }}
                                                data-testid={`sourcing-all-depots-${geoName.toLowerCase().replace(/[\s-]+/g, "-")}`}
                                              />
                                              <span className="text-[10px] font-medium text-muted-foreground">All</span>
                                            </label>
                                          )}
                                          {geoDepots.map(depot => {
                                            const isActive = activeSourcingDepots.includes(depot);
                                            return (
                                              <label key={depot}
                                                className={`flex items-center gap-1.5 py-1 px-2 rounded transition-colors
                                                  ${isDecentralized ? "cursor-default opacity-80" : !isGeoActive ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                                                  ${isActive ? "bg-primary/10" : isDecentralized ? "" : "hover:bg-muted/50"}`}>
                                                <Checkbox
                                                  checked={isActive}
                                                  disabled={isDecentralized || !isGeoActive}
                                                  onCheckedChange={isDecentralized ? undefined : () => toggleCentralizedDepot(depot)}
                                                  data-testid={`sourcing-depot-${depot.toLowerCase()}`}
                                                />
                                                <span className="text-xs font-mono">{depot}</span>
                                              </label>
                                            );
                                          })}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                );
              })()}
            </TabsContent>

            {/* ── Pricing Tab ───────────────────────────────────────── */}
            <TabsContent value="pricing" className="mt-0">
              <Tabs defaultValue="price-lots" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="price-lots" className="text-xs">
                    <IndianRupee className="h-3.5 w-3.5 mr-1.5" />
                    Price Lots
                  </TabsTrigger>
                  <TabsTrigger value="pricing-summary" className="text-xs">
                    <Info className="h-3.5 w-3.5 mr-1.5" />
                    Pricing Summary
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="price-lots" className="mt-0">
              {(() => {
                /* derive summary badge(s) from data presence */
                const getScopePills = (lot: PriceLot) => {
                  if (lot.allIndia) return [
                    { label: "All India", icon: <Globe className="h-3 w-3" />, bg: "bg-[#00b0d7]", text: "text-white", border: "" },
                  ];
                  const pills = [];
                  if (lot.regions.length > 0)
                    pills.push({ label: "Region", icon: <MapPin className="h-3 w-3" />, bg: "bg-[#1f36c7]/10", text: "text-[#1f36c7]", border: "border border-[#1f36c7]/30" });
                  if (lot.channels.length > 0)
                    pills.push({ label: "Channel", icon: <Radio className="h-3 w-3" />, bg: "bg-amber-50", text: "text-amber-700", border: "border border-amber-300" });
                  if (lot.regionChannelPairs.length > 0)
                    pills.push({ label: "Reg×Ch", icon: <Network className="h-3 w-3" />, bg: "bg-violet-50", text: "text-violet-700", border: "border border-violet-300" });
                  return pills;
                };


                const PricingTab = () => {
                  const [expanded, setExpanded] = useState<Set<string>>(new Set());
                  const toggle = (id: string) =>
                    setExpanded(prev => {
                      const next = new Set(prev);
                      next.has(id) ? next.delete(id) : next.add(id);
                      return next;
                    });

                  // Identify the newest price lot (latest validFrom) to tag when priceUpdatedAt is set
                  const isPriceNew = isWithinOneMonth(entry.priceUpdatedAt as string | null | undefined);
                  const newestLotId = isPriceNew
                    ? MOCK_PRICE_LOTS.reduce((best, lot) =>
                        lot.validFrom > best.validFrom ? lot : best
                      ).id
                    : null;

                  return (
                    <div className="space-y-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-wrap">
                              <IndianRupee className="h-4 w-4 text-[#00b0d7]" />
                              <p className="text-sm font-semibold">Price Lots</p>
                              <Badge variant="secondary" className="text-[10px] px-2">{MOCK_PRICE_LOTS.length} lots</Badge>
                              <NewBadge updatedAt={entry.priceUpdatedAt as string | null | undefined} />
                            </div>
                            <p className="text-[10px] text-muted-foreground">Click a row to see applicability details</p>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 px-0">
                          {/* Table header */}
                          <div className="grid grid-cols-[1fr_180px_100px_80px_120px_120px_36px] gap-0 px-6 py-2 bg-muted/40 border-y border-border/60 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                            <span>Price Lot</span>
                            <span>Scope</span>
                            <span className="text-right">MRP</span>
                            <span className="text-center">Currency</span>
                            <span className="text-center">Valid From</span>
                            <span className="text-center">Valid To</span>
                            <span />
                          </div>

                          {/* Rows */}
                          {MOCK_PRICE_LOTS.map((lot, idx) => {
                            const isOpen = expanded.has(lot.id);
                            const isLast = idx === MOCK_PRICE_LOTS.length - 1;
                            const scopePills = getScopePills(lot);
                            const hasRegions = lot.regions.length > 0;
                            const hasChannels = lot.channels.length > 0;
                            const hasRxC = lot.regionChannelPairs.length > 0;
                            return (
                              <div key={lot.id} className={!isLast ? "border-b border-border/50" : ""}>
                                {/* Summary row */}
                                <button
                                  type="button"
                                  onClick={() => toggle(lot.id)}
                                  data-testid={`price-lot-row-${lot.id}`}
                                  className="w-full grid grid-cols-[1fr_180px_100px_80px_120px_120px_36px] gap-0 px-6 py-3.5 text-left hover:bg-muted/30 transition-colors select-none"
                                >
                                  <span className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-xs font-semibold text-[#1f36c7]">
                                      {form?.cbuCode ? `${form.cbuCode}-${lot.priceLot}` : lot.priceLot}
                                    </span>
                                    {lot.id === newestLotId && (
                                      <span className="inline-flex items-center rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white tracking-wide" data-testid={`badge-new-price-${lot.id}`}>
                                        NEW
                                      </span>
                                    )}
                                  </span>
                                  <span className="flex items-center gap-1 flex-wrap">
                                    {scopePills.map(p => (
                                      <span key={p.label} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${p.bg} ${p.text} ${p.border}`}>
                                        {p.icon}{p.label}
                                      </span>
                                    ))}
                                  </span>
                                  <span className="text-right font-semibold text-sm tabular-nums">
                                    {lot.mrp.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                  </span>
                                  <span className="text-center text-xs text-muted-foreground">{lot.currency}</span>
                                  <span className="text-center text-xs">{formatDateDisplay(lot.validFrom)}</span>
                                  <span className="text-center text-xs">{formatDateDisplay(lot.validTo)}</span>
                                  <span className="flex items-center justify-center text-muted-foreground">
                                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                  </span>
                                </button>

                                {/* Expanded detail panel — all applicable sections rendered */}
                                {isOpen && (
                                  <div className="px-6 pb-5 pt-3 bg-[#00b0d7]/[0.03] border-t border-border/40">

                                    {/* All India */}
                                    {lot.allIndia && (
                                      <div className="flex items-center gap-2 mb-4">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#00b0d7] text-white text-xs font-medium">
                                          <Globe className="h-3.5 w-3.5" />
                                          All India
                                        </span>
                                        <p className="text-xs text-muted-foreground italic">Applicable across all states and all channels in India.</p>
                                      </div>
                                    )}

                                    {/* Grid of the three optional sections — shown only when data present */}
                                    {(hasRegions || hasChannels || hasRxC) && (
                                      <div className={`grid gap-4 ${[hasRegions, hasChannels, hasRxC].filter(Boolean).length === 1 ? "grid-cols-1 max-w-sm" : [hasRegions, hasChannels, hasRxC].filter(Boolean).length === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-3"}`}>

                                        {/* Region Specific */}
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

                                        {/* Channel Specific */}
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
                                                <Badge key={ch} variant="outline" className="text-[10px] px-2 py-0.5 font-normal border-amber-300 text-amber-700 bg-amber-50">{ch}</Badge>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {/* Region × Channel */}
                                        {hasRxC && (
                                          <div>
                                            <div className="flex items-center gap-1.5 mb-1.5">
                                              <Network className="h-3 w-3 text-violet-600" />
                                              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                                                Region × Channel <span className="normal-case text-muted-foreground/60">({lot.regionChannelPairs.length})</span>
                                              </p>
                                            </div>
                                            <div className="border border-border/60 rounded-md overflow-hidden max-h-52 overflow-y-auto">
                                              <div className="grid grid-cols-[1fr_1fr] px-3 py-1.5 bg-muted/50 border-b border-border/60 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                                                <span>State</span>
                                                <span>Channels</span>
                                              </div>
                                              {lot.regionChannelPairs.map((pair, i) => (
                                                <div key={pair.region + i} className="grid grid-cols-[1fr_1fr] px-3 py-2 border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors">
                                                  <div className="flex items-center gap-1.5 text-xs">
                                                    <MapPin className="h-3 w-3 text-[#00b0d7] shrink-0" />
                                                    {pair.region}
                                                  </div>
                                                  <div className="flex flex-wrap gap-1">
                                                    {pair.channels.map(ch => (
                                                      <Badge key={ch} variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-normal">{ch}</Badge>
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
                        </CardContent>
                      </Card>
                    </div>
                  );
                };

                return <PricingTab />;
              })()}
                </TabsContent>

                <TabsContent value="pricing-summary" className="mt-0">
                  <Card data-testid="pricing-status-summary">
                    <CardHeader className="pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <IndianRupee className="h-4 w-4 text-[#00b0d7]" />
                          <p className="text-sm font-semibold">Pricing Status Summary</p>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Resolved MRP per geography × channel — hover a price to see valid-till date</p>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const allMatrixChannels = Array.from(new Set(
                          selectedGeo.flatMap(g => (channelMapping[g] || []).filter(c => c !== "MT"))
                        ));
                        return selectedGeo.length > 0 && selectedDepots.length > 0 && allMatrixChannels.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left py-2 pr-3 text-muted-foreground font-medium">Geography</th>
                                  <th className="text-left py-2 pr-3 text-muted-foreground font-medium">Depot</th>
                                  {allMatrixChannels.map(ch => (
                                    <th key={ch} className="text-center py-2 px-2 text-muted-foreground font-medium">{ch}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {selectedGeo.slice(0, 8).map((geo) => {
                                  const geoDepots = (GEOGRAPHY_DEPOT_MAP[geo] || []).filter(d => selectedDepots.includes(d));
                                  const depotCode = geoDepots.join(", ") || "—";
                                  const geoChannels = (channelMapping[geo] || []).filter(c => c !== "MT");
                                  return (
                                    <tr key={geo} className="border-b border-border/50">
                                      <td className="py-2 pr-3 font-medium">{geo.length > 22 ? geo.substring(0, 20) + "..." : geo}</td>
                                      <td className="py-2 pr-3 font-mono text-muted-foreground">{depotCode}</td>
                                      {allMatrixChannels.map(ch => {
                                        if (!geoChannels.includes(ch)) {
                                          return (
                                            <td key={ch} className="text-center py-2 px-2">
                                              <span className="text-[10px] text-muted-foreground/50 italic">NA</span>
                                            </td>
                                          );
                                        }
                                        const lot = resolvePriceForGeoChannel(geo, ch, MOCK_PRICE_LOTS, clusterRegionMap);
                                        return (
                                          <td key={ch} className="text-center py-2 px-2">
                                            {lot ? (
                                              <div className="relative group/pc flex items-center justify-center">
                                                <span
                                                  className="text-[10px] font-bold text-[#1f36c7] tabular-nums cursor-default"
                                                  data-testid={`price-cell-${geo}-${ch}`}
                                                >
                                                  ₹{lot.mrp.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                                </span>
                                                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-20 hidden group-hover/pc:flex flex-col items-center">
                                                  <div className="bg-slate-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap shadow-lg">
                                                    Valid till: {formatDateDisplay(lot.validTo)}
                                                  </div>
                                                  <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-800" />
                                                </div>
                                              </div>
                                            ) : (
                                              <span className="text-[10px] text-red-500 font-medium whitespace-nowrap" data-testid={`price-inactive-${geo}-${ch}`}>
                                                Price inactive
                                              </span>
                                            )}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                            {selectedGeo.length > 8 && (
                              <p className="text-[10px] text-muted-foreground mt-2 text-center">+ {selectedGeo.length - 8} more clusters</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground text-center py-6">Select geography, depots, and channels to see the pricing summary.</p>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </TabsContent>

              </Tabs>
            </TabsContent>

          </Tabs>
        </form>

        {/* Sourcing Matrix — "all selected" dialog */}
        <Dialog open={showSourcingAllDialog} onOpenChange={setShowSourcingAllDialog}>
          <DialogContent className="max-w-md" data-testid="dialog-sourcing-all">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Switch to Decentralized?
              </DialogTitle>
              <DialogDescription>
                You've selected all geographies and depots in Centralized mode — this is equivalent to Decentralized sourcing. Would you like to switch the toggle to Decentralized instead?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                data-testid="sourcing-all-keep-centralized"
                onClick={() => {
                  setShowSourcingAllDialog(false);
                  setActiveTab("sourcing");
                }}
              >
                No, keep selecting
              </Button>
              <Button
                data-testid="sourcing-all-switch-decentralized"
                onClick={() => {
                  handleSourcingModeChange("decentralized");
                  setShowSourcingAllDialog(false);
                }}
              >
                Yes, switch to Decentralized
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="max-w-lg" data-testid="dialog-confirm-submit">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Confirm Activation
              </DialogTitle>
              <DialogDescription>
                Review the summary below before moving this entry from Draft to Active.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Network Change Date</p>
                  <p className="font-medium" data-testid="summary-change-date">{formatDateDisplay(form?.networkChangeDate)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Start Date</p>
                  <p className="font-medium" data-testid="summary-start-date">{formatDateDisplay(form?.startDate)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">End Date</p>
                  <p className="font-medium" data-testid="summary-end-date">{formatDateDisplay(form?.endDate)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm border-t pt-3">
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Predecessor CBU</p>
                  <p className="font-mono text-xs" data-testid="summary-predecessor">{form?.predecessorCode || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Successor CBU</p>
                  <p className="font-mono text-xs" data-testid="summary-successor">{form?.successorCode || "-"}</p>
                </div>
              </div>
              <div className="border-t pt-3">
                <p className="text-muted-foreground text-xs mb-2">Distribution Matrix Preview</p>
                {(() => {
                  const geo = (form?.geography as string[]) || [];
                  const dep = (form?.depot as string[]) || [];
                  const mapping = (form?.channelMapping as Record<string, string[]>) || {};
                  const allCh = Array.from(new Set(geo.flatMap(g => (mapping[g] || []).filter(c => c !== "MT"))));
                  return geo.length > 0 && dep.length > 0 && allCh.length > 0 ? (
                    <div className="overflow-x-auto max-h-40">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-1 pr-2 text-muted-foreground font-medium">Cluster</th>
                            <th className="text-left py-1 pr-2 text-muted-foreground font-medium">Depot</th>
                            {allCh.slice(0, 5).map(c => (
                              <th key={c} className="text-center py-1 px-1 text-muted-foreground font-medium">{c}</th>
                            ))}
                            {allCh.length > 5 && <th className="text-center py-1 px-1 text-muted-foreground">+{allCh.length - 5}</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {geo.slice(0, 5).map((g, i) => {
                            const geoCh = (mapping[g] || []).filter(c => c !== "MT");
                            return (
                              <tr key={g} className="border-b border-border/50">
                                <td className="py-1 pr-2 font-medium">{g.length > 16 ? g.substring(0, 14) + "..." : g}</td>
                                <td className="py-1 pr-2 font-mono text-muted-foreground">{dep[i % dep.length]}</td>
                                {allCh.slice(0, 5).map(c => (
                                  <td key={c} className="text-center py-1 px-1">
                                    {geoCh.includes(c) ? (
                                      <Check className="h-3 w-3 text-primary mx-auto" />
                                    ) : (
                                      <span className="text-muted-foreground">-</span>
                                    )}
                                  </td>
                                ))}
                                {allCh.length > 5 && <td className="text-center py-1 px-1 text-muted-foreground">...</td>}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {geo.length > 5 && (
                        <p className="text-[10px] text-muted-foreground mt-1 text-center">+ {geo.length - 5} more clusters</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No distribution data selected.</p>
                  );
                })()}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)} data-testid="button-cancel-confirm">
                Cancel
              </Button>
              <Button onClick={handleConfirmSubmit} disabled={isPending} data-testid="button-confirm-activate">
                {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                Confirm & Activate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Amendment Request Dialog */}
        {entry && (
          <RaiseAmendmentDialog
            open={showAmendmentDialog}
            onOpenChange={setShowAmendmentDialog}
            cbuId={entry.id}
            cbuCode={entry.cbuCode ?? ""}
            cbuDescription={entry.materialDescription ?? ""}
            cbuNetworkStatus={entry.networkStatus ?? ""}
            basepackCode={entry.basepack ?? ""}
            brand={entry.brand ?? ""}
            bg={entry.salesCategory ?? ""}
            assignedPerson={entry.assignedPerson}
            raisedBy={
              portalUsers.find(u => u.role === "Paid Bible Owner" && u.businessGroup === (entry.salesCategory ?? "") && u.isActive)?.name
              ?? portalUsers.find(u => u.role === "Paid Bible Owner" && u.isActive)?.name
            }
            users={portalUsers}
            onSuccess={handleAmendmentSuccess}
            currentGeo={effectiveGeo}
            currentDepots={effectiveDepots}
            currentChannels={effectiveChannels}
            clusters={CLUSTERS}
            leafChannels={LEAF_CHANNELS}
            geographyDepotMap={GEOGRAPHY_DEPOT_MAP}
            pendingSrs={cbuPendingSrs}
          />
        )}
      </main>
    </div>
  );
}

function FormField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ReadOnlyField({ label, value, testId }: { label: string; value: string | null | undefined; testId: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
        <Lock className="h-3 w-3" />
        {label}
      </Label>
      <Input value={value || "-"} disabled className="bg-muted/40 cursor-not-allowed" data-testid={testId} />
    </div>
  );
}

function isWithinOneMonth(ts: string | null | undefined): boolean {
  if (!ts) return false;
  const updated = new Date(ts);
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  return updated >= oneMonthAgo;
}

function NewBadge({ updatedAt }: { updatedAt: string | null | undefined }) {
  if (!isWithinOneMonth(updatedAt)) return null;
  const d = new Date(updatedAt!);
  const label = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  return (
    <div className="flex items-center gap-1.5 mt-1" data-testid="badge-new-change">
      <span className="inline-flex items-center rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white tracking-wide">
        NEW
      </span>
      <span className="text-[11px] text-muted-foreground">Updated {label}</span>
    </div>
  );
}
