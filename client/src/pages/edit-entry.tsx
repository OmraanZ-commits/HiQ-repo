import { UnileverHeader } from "@/components/unilever-header";
import { StatusFlow } from "@/components/status-flow";
import { CLUSTERS, DEPOTS, TOP_CHANNELS, MT_SUB_CHANNELS } from "@/lib/distribution-data";
import { PeoplePicker } from "@/components/people-picker";
import { useNetworkEntryForm, LEAF_CHANNELS } from "@/controllers/useNetworkEntryForm";
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

function getStatusVariant(status: string | null): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "Active": return "default";
    case "Draft": return "secondary";
    case "Production Started": return "outline";
    case "Pricing Updated": return "outline";
    case "FTR Approved": return "default";
    case "Stock Movement Initiated": return "default";
    case "CBU Ready for Transition": return "default";
    default: return "secondary";
  }
}

export default function EditEntry() {
  const {
    entry, form, isLoading, activeTab, setActiveTab,
    showConfirmDialog, setShowConfirmDialog,
    updateField, toggleArrayItem,
    toggleGeoChannel, toggleAllGeoChannels, applyChannelsToAllGeos,
    toggleAllClusters, toggleAllDepots,
    handleSubmit, handleConfirmSubmit, isPending, navigate,
    selectedGeo, selectedDepots, selectedChannels, channelMapping,
    allClustersSelected, allDepotsSelected,
    selectedLeafCount,
    computedYear, isDraft,
  } = useNetworkEntryForm();

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
              <div className="space-y-5">
                    <Card data-testid="distribution-geography">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-primary" />
                            <h3 className="text-sm font-semibold">Geography / Clusters</h3>
                            <Badge variant="secondary" className="text-[10px]">{selectedGeo.length}/{CLUSTERS.length}</Badge>
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer" data-testid="toggle-all-clusters">
                            <Checkbox
                              checked={allClustersSelected}
                              onCheckedChange={toggleAllClusters}
                            />
                            <span className="text-xs font-medium">All Clusters</span>
                          </label>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1" data-testid="checkboxes-geography">
                          {CLUSTERS.map(cluster => {
                            const isChecked = selectedGeo.includes(cluster.name);
                            return (
                              <label key={cluster.name} className={`flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer transition-colors ${isChecked ? "bg-primary/5" : "hover:bg-muted/50"}`}>
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={() => toggleArrayItem("geography", cluster.name)}
                                  data-testid={`checkbox-geo-${cluster.name.toLowerCase().replace(/[\s-]+/g, "-")}`}
                                />
                                <span className="text-xs">{cluster.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>

                    <Card data-testid="distribution-depot">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-primary" />
                            <h3 className="text-sm font-semibold">Depots</h3>
                            <Badge variant="secondary" className="text-[10px]">{selectedDepots.length}/{DEPOTS.length}</Badge>
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer" data-testid="toggle-all-depots">
                            <Checkbox
                              checked={allDepotsSelected}
                              onCheckedChange={toggleAllDepots}
                            />
                            <span className="text-xs font-medium">All Depots</span>
                          </label>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-4 md:grid-cols-6 gap-x-3 gap-y-1" data-testid="checkboxes-depot">
                          {DEPOTS.map(depot => {
                            const isChecked = selectedDepots.includes(depot);
                            return (
                              <label key={depot} className={`flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer transition-colors ${isChecked ? "bg-primary/5" : "hover:bg-muted/50"}`}>
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={() => toggleArrayItem("depot", depot)}
                                  data-testid={`checkbox-depot-${depot.toLowerCase()}`}
                                />
                                <span className="text-xs font-mono">{depot}</span>
                              </label>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>

                    <Card data-testid="distribution-channel">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Radio className="h-4 w-4 text-primary" />
                            <h3 className="text-sm font-semibold">Channels by Geography</h3>
                            <Badge variant="secondary" className="text-[10px]">{selectedLeafCount} channel(s)</Badge>
                          </div>
                        </div>
                        {selectedGeo.length === 0 && (
                          <p className="text-xs text-muted-foreground mt-1">Select geographies above to configure channels per cluster.</p>
                        )}
                      </CardHeader>
                      {selectedGeo.length > 0 && (
                        <CardContent className="space-y-3" data-testid="checkboxes-channel">
                          {selectedGeo.map((geo, geoIdx) => {
                            const geoChannels = channelMapping[geo] || [];
                            const geoLeafCount = LEAF_CHANNELS.filter(c => geoChannels.includes(c.code)).length;
                            const allGeoSelected = LEAF_CHANNELS.every(c => geoChannels.includes(c.code));
                            const mtSubCodes = MT_SUB_CHANNELS.map(c => c.code);
                            const geoMtAllSelected = mtSubCodes.every(c => geoChannels.includes(c));
                            const geoMtSomeSelected = mtSubCodes.some(c => geoChannels.includes(c));
                            return (
                              <div key={geo} className="rounded-lg border p-3" data-testid={`geo-channel-${geo.toLowerCase().replace(/[\s-]+/g, "-")}`}>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-3.5 w-3.5 text-primary" />
                                    <span className="text-xs font-semibold">{geo}</span>
                                    <Badge variant="secondary" className="text-[9px]">{geoLeafCount}/{LEAF_CHANNELS.length}</Badge>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {geoIdx === 0 && selectedGeo.length > 1 && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-[10px] px-2"
                                        onClick={() => applyChannelsToAllGeos(geo)}
                                        data-testid="btn-apply-channels-to-all"
                                      >
                                        Apply to all
                                      </Button>
                                    )}
                                    <label className="flex items-center gap-1.5 cursor-pointer" data-testid={`toggle-all-channels-${geo.toLowerCase().replace(/[\s-]+/g, "-")}`}>
                                      <Checkbox
                                        checked={allGeoSelected}
                                        onCheckedChange={() => toggleAllGeoChannels(geo)}
                                      />
                                      <span className="text-[10px] font-medium">All</span>
                                    </label>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
                                  {TOP_CHANNELS.map(ch => {
                                    const isChecked = geoChannels.includes(ch.code);
                                    return (
                                      <label key={ch.code} className={`flex items-center gap-1.5 py-1 px-2 rounded cursor-pointer transition-colors ${isChecked ? "bg-primary/5" : "hover:bg-muted/50"}`}>
                                        <Checkbox
                                          checked={isChecked}
                                          onCheckedChange={() => toggleGeoChannel(geo, ch.code)}
                                          data-testid={`checkbox-channel-${geo.toLowerCase().replace(/[\s-]+/g, "-")}-${ch.code.toLowerCase()}`}
                                        />
                                        <span className="text-[11px]">{ch.code}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                                <div className="rounded border p-2 bg-muted/10">
                                  <label className="flex items-center gap-1.5 cursor-pointer mb-1.5">
                                    <Checkbox
                                      checked={geoMtAllSelected}
                                      onCheckedChange={() => toggleGeoChannel(geo, "MT")}
                                      data-testid={`checkbox-channel-${geo.toLowerCase().replace(/[\s-]+/g, "-")}-mt`}
                                    />
                                    <span className="text-[11px] font-semibold">MT</span>
                                    {geoMtSomeSelected && !geoMtAllSelected && (
                                      <Badge variant="outline" className="text-[8px] px-1 py-0">partial</Badge>
                                    )}
                                  </label>
                                  <div className="ml-5 flex flex-wrap gap-x-3 gap-y-0.5 border-l-2 border-primary/20 pl-2">
                                    {MT_SUB_CHANNELS.map(ch => {
                                      const isChecked = geoChannels.includes(ch.code);
                                      return (
                                        <label key={ch.code} className={`flex items-center gap-1.5 py-0.5 px-1.5 rounded cursor-pointer transition-colors ${isChecked ? "bg-primary/5" : "hover:bg-muted/50"}`}>
                                          <Checkbox
                                            checked={isChecked}
                                            onCheckedChange={() => toggleGeoChannel(geo, ch.code)}
                                            data-testid={`checkbox-channel-${geo.toLowerCase().replace(/[\s-]+/g, "-")}-${ch.code.toLowerCase().replace(/\s/g, "-")}`}
                                          />
                                          <span className="text-[10px]">{ch.code}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </CardContent>
                      )}
                    </Card>

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
              </div>
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
