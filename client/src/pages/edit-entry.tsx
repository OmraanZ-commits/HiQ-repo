import { UnileverHeader } from "@/components/unilever-header";
import { StatusFlow } from "@/components/status-flow";
import { CLUSTERS as STATIC_CLUSTERS, TOP_CHANNELS as STATIC_TOP_CHANNELS, MT_SUB_CHANNELS as STATIC_MT_SUB_CHANNELS, GEOGRAPHY_DEPOT_MAP as STATIC_GEOGRAPHY_DEPOT_MAP } from "@/lib/distribution-data";
import { PeoplePicker } from "@/components/people-picker";
import { useNetworkEntryForm } from "@/controllers/useNetworkEntryForm";
import { useReferenceData, type ChannelDef } from "@/controllers/useReferenceData";
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
import { ArrowLeft, Loader2, Save, Package, MapPin, Ruler, Info, Lock, Check, Globe, Building2, Radio, AlertTriangle } from "lucide-react";
import { useEffect } from "react";

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
    handleSubmit, handleConfirmSubmit, isPending, navigate,
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

  const { lifecycleMap } = useLifecycleData();
  const lifecycle = entry ? lifecycleMap[entry.id] : undefined;


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
            <Button variant="outline" className="mt-4" onClick={() => navigate("/")}>
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
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold" data-testid="text-edit-title">
                  {entry.materialDescription || entry.cbuCode || "Edit Entry"}
                </h1>
                <Badge variant={getStatusVariant(entry.networkStatus)} data-testid="badge-edit-status">
                  {entry.networkStatus || "Draft"}
                </Badge>
                {lifecycle?.colorFlag && (
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${getLifecycleFlagClasses(lifecycle.colorFlag)}`} data-testid="flag-edit" />
                    <span className="text-xs text-muted-foreground">{lifecycle.flagLabel}</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                CBU Code: <span className="font-mono">{entry.cbuCode}</span>
                {entry.assignedPerson && (
                  <span className="ml-3">Assigned to: <span className="font-medium text-foreground">{entry.assignedPerson}</span></span>
                )}
              </p>
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={isPending} data-testid="button-save">
            {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {entry.networkStatus === "Draft" ? "Submit & Activate" : "Save Changes"}
          </Button>
        </div>

        <StatusFlow currentStatus={entry.networkStatus} colorFlag={lifecycle?.colorFlag} />

        <div className="flex items-center gap-2 mb-5 px-1">
          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Fields sourced directly from data are read-only. Only manually entered fields can be edited.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
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
                    <FormField label="Assigned Person">
                      <PeoplePicker
                        value={form.assignedPerson}
                        onChange={(val) => updateField("assignedPerson", val)}
                        testId="input-assigned-person"
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
                    <ReadOnlyField label="Case Config" value={form.caseConfig} testId="input-case-config" />
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
                                    <label className={`flex items-center gap-2 cursor-pointer rounded px-1 py-0.5 ${isGeoSelected ? "bg-primary/10" : "hover:bg-muted/50"}`}>
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
                                  const all = selectedGeo.every(g => codes.every(c => (channelMapping[g] || []).includes(c)));
                                  const some = selectedGeo.some(g => codes.some(c => (channelMapping[g] || []).includes(c)));
                                  return all ? true : some ? ("indeterminate" as const) : false;
                                };
                                const allColState = (() => {
                                  const leafCodes = LEAF_CHANNELS.map(c => c.code);
                                  const all = selectedGeo.every(g => leafCodes.every(c => (channelMapping[g] || []).includes(c)));
                                  const some = selectedGeo.some(g => leafCodes.some(c => (channelMapping[g] || []).includes(c)));
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
                                const geoChannels = channelMapping[geo] || [];
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
                                  {allMatrixChannels.slice(0, 6).map(ch => (
                                    <th key={ch} className="text-center py-2 px-2 text-muted-foreground font-medium">{ch}</th>
                                  ))}
                                  {allMatrixChannels.length > 6 && <th className="text-center py-2 px-2 text-muted-foreground font-medium">+{allMatrixChannels.length - 6}</th>}
                                </tr>
                              </thead>
                              <tbody>
                                {selectedGeo.slice(0, 8).map((geo, geoIdx) => {
                                  const depotCode = selectedDepots[geoIdx % selectedDepots.length];
                                  const geoChannels = (channelMapping[geo] || []).filter(c => c !== "MT");
                                  return (
                                    <tr key={geo} className="border-b border-border/50">
                                      <td className="py-2 pr-3 font-medium">{geo.length > 22 ? geo.substring(0, 20) + "..." : geo}</td>
                                      <td className="py-2 pr-3 font-mono text-muted-foreground">{depotCode}</td>
                                      {allMatrixChannels.slice(0, 6).map(ch => (
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
                                      {allMatrixChannels.length > 6 && (
                                        <td className="text-center py-2 px-2 text-muted-foreground">...</td>
                                      )}
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
          </Tabs>
        </form>

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
