import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useParams } from "wouter";
import { useState, useEffect } from "react";
import { UnileverHeader } from "@/components/unilever-header";
import { StatusFlow } from "@/components/status-flow";
import { CLUSTERS, DEPOTS, CHANNELS, TOP_CHANNELS, MT_SUB_CHANNELS } from "@/lib/distribution-data";
import indiaMapImg from "@assets/image_1772525341107.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Loader2, Save, Package, MapPin, Ruler, Info, Lock, Check, Globe, Building2, Radio } from "lucide-react";
import type { NetworkEntry, InsertNetworkEntry } from "@shared/schema";

function getStatusVariant(status: string | null): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "Active": return "default";
    case "Draft": return "secondary";
    case "Production Started": return "outline";
    case "Pricing Updated": return "outline";
    case "FTR Approved": return "default";
    case "Stock Movement Initiated": return "default";
    case "CBU Transition Complete": return "default";
    default: return "secondary";
  }
}

function computeYear(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d.getFullYear();
}

export default function EditEntry() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data: entry, isLoading } = useQuery<NetworkEntry>({
    queryKey: ["/api/network-entries", id],
  });

  const [form, setForm] = useState<InsertNetworkEntry | null>(null);
  const [activeTab, setActiveTab] = useState("basic");

  useEffect(() => {
    if (entry && !form) {
      setForm({
        cbuCreatedDate: entry.cbuCreatedDate,
        networkChangeDate: entry.networkChangeDate,
        annexureNumber: entry.annexureNumber,
        basepack: entry.basepack,
        basepackDescription: entry.basepackDescription,
        bg: entry.bg,
        profitCentre: entry.profitCentre,
        salesCategory: entry.salesCategory,
        smallC: entry.smallC,
        brand: entry.brand,
        format: entry.format,
        cbuCode: entry.cbuCode,
        materialDescription: entry.materialDescription,
        typeOfNetwork: entry.typeOfNetwork,
        copyCbu: entry.copyCbu,
        year: entry.year,
        networkStatus: entry.networkStatus,
        startDate: entry.startDate,
        endDate: entry.endDate,
        caseConfig: entry.caseConfig,
        ean: entry.ean,
        netWeight: entry.netWeight,
        grossWeight: entry.grossWeight,
        length: entry.length,
        width: entry.width,
        height: entry.height,
        itf: entry.itf,
        ftrImagesLink: entry.ftrImagesLink,
        predecessorCode: entry.predecessorCode,
        successorCode: entry.successorCode,
        headerCode: entry.headerCode,
        csdIndexNo: entry.csdIndexNo,
        pcAtChannelState: entry.pcAtChannelState,
        sourcingMatrixSection: entry.sourcingMatrixSection,
        assignedPerson: entry.assignedPerson,
        geography: entry.geography || [],
        depot: entry.depot || [],
        channel: entry.channel || [],
      });
    }
  }, [entry]);

  const updateMutation = useMutation({
    mutationFn: (data: InsertNetworkEntry) =>
      apiRequest("PATCH", `/api/network-entries/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/network-entries"] });
      toast({ title: "Entry updated successfully" });
      navigate("/");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateField = (field: keyof InsertNetworkEntry, value: any) => {
    setForm(prev => {
      if (!prev) return prev;
      const updated = { ...prev, [field]: value };
      return updated;
    });
  };

  const toggleArrayItem = (field: "geography" | "depot" | "channel", value: string) => {
    setForm(prev => {
      if (!prev) return prev;
      const arr = (prev[field] as string[]) || [];
      return {
        ...prev,
        [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value],
      };
    });
  };

  const toggleAllClusters = () => {
    setForm(prev => {
      if (!prev) return prev;
      const allNames = CLUSTERS.map(c => c.name);
      const isAllSelected = allNames.every(n => (prev.geography as string[])?.includes(n));
      return { ...prev, geography: isAllSelected ? [] : allNames };
    });
  };

  const toggleAllDepots = () => {
    setForm(prev => {
      if (!prev) return prev;
      const isAllSelected = DEPOTS.every(d => (prev.depot as string[])?.includes(d));
      return { ...prev, depot: isAllSelected ? [] : [...DEPOTS] };
    });
  };

  const toggleAllChannels = () => {
    setForm(prev => {
      if (!prev) return prev;
      const allCodes = CHANNELS.map(c => c.code);
      const isAllSelected = allCodes.every(c => (prev.channel as string[])?.includes(c));
      return { ...prev, channel: isAllSelected ? [] : allCodes };
    });
  };

  const toggleMT = (checked: boolean) => {
    setForm(prev => {
      if (!prev) return prev;
      const current = (prev.channel as string[]) || [];
      const mtCodes = ["MT", ...MT_SUB_CHANNELS.map(c => c.code)];
      if (checked) {
        const merged = new Set([...current, ...mtCodes]);
        return { ...prev, channel: Array.from(merged) };
      } else {
        return { ...prev, channel: current.filter(c => !mtCodes.includes(c)) };
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    updateMutation.mutate(form);
  };

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

  const computedYear = computeYear(form.cbuCreatedDate);
  const selectedGeo = (form.geography || []) as string[];
  const selectedDepots = (form.depot || []) as string[];
  const selectedChannels = (form.channel || []) as string[];
  const allClustersSelected = CLUSTERS.every(c => selectedGeo.includes(c.name));
  const allDepotsSelected = DEPOTS.every(d => selectedDepots.includes(d));
  const allChannelsSelected = CHANNELS.every(c => selectedChannels.includes(c.code));
  const mtSelected = selectedChannels.includes("MT");
  const allMtSubsSelected = MT_SUB_CHANNELS.every(c => selectedChannels.includes(c.code));
  const someMtSubsSelected = MT_SUB_CHANNELS.some(c => selectedChannels.includes(c.code));
  const selectedClusterDefs = CLUSTERS.filter(c => selectedGeo.includes(c.name));

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
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                CBU Code: <span className="font-mono">{entry.cbuCode}</span>
                {entry.assignedPerson && (
                  <span className="ml-3">Assigned to: <span className="font-medium text-foreground">{entry.assignedPerson}</span></span>
                )}
              </p>
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={updateMutation.isPending} data-testid="button-save">
            {updateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </div>

        <StatusFlow currentStatus={entry.networkStatus} />

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
                    <ReadOnlyField label="Assigned Person" value={form.assignedPerson} testId="input-assigned-person" />
                    <FormField label="Network Change Date">
                      <Input type="date" value={form.networkChangeDate || ""} onChange={e => updateField("networkChangeDate", e.target.value)} data-testid="input-network-change-date" />
                    </FormField>
                    <FormField label="Start Date">
                      <Input type="date" value={form.startDate || ""} onChange={e => updateField("startDate", e.target.value)} data-testid="input-start-date" />
                    </FormField>
                    <FormField label="End Date">
                      <Input type="date" value={form.endDate || ""} onChange={e => updateField("endDate", e.target.value)} data-testid="input-end-date" />
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
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
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
                            <h3 className="text-sm font-semibold">Channels</h3>
                            <Badge variant="secondary" className="text-[10px]">{selectedChannels.length}/{CHANNELS.length}</Badge>
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer" data-testid="toggle-all-channels">
                            <Checkbox
                              checked={allChannelsSelected}
                              onCheckedChange={toggleAllChannels}
                            />
                            <span className="text-xs font-medium">All Channels</span>
                          </label>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3" data-testid="checkboxes-channel">
                        <div className="flex flex-wrap gap-x-6 gap-y-1">
                          {TOP_CHANNELS.map(ch => {
                            const isChecked = selectedChannels.includes(ch.code);
                            return (
                              <label key={ch.code} className={`flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer transition-colors ${isChecked ? "bg-primary/5" : "hover:bg-muted/50"}`}>
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={() => toggleArrayItem("channel", ch.code)}
                                  data-testid={`checkbox-channel-${ch.code.toLowerCase()}`}
                                />
                                <span className="text-xs font-medium">{ch.code}</span>
                                <span className="text-[10px] text-muted-foreground">({ch.type})</span>
                              </label>
                            );
                          })}
                        </div>

                        <div className="rounded-lg border p-3 bg-muted/20">
                          <label className="flex items-center gap-2 cursor-pointer mb-2" data-testid="checkbox-channel-mt">
                            <Checkbox
                              checked={mtSelected && allMtSubsSelected}
                              onCheckedChange={(checked) => toggleMT(!!checked)}
                            />
                            <span className="text-xs font-semibold">MT</span>
                            <span className="text-[10px] text-muted-foreground">(Modern Trade)</span>
                            {someMtSubsSelected && !allMtSubsSelected && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0">partial</Badge>
                            )}
                          </label>
                          <div className="ml-6 flex flex-wrap gap-x-5 gap-y-1 border-l-2 border-primary/20 pl-3">
                            {MT_SUB_CHANNELS.map(ch => {
                              const isChecked = selectedChannels.includes(ch.code);
                              return (
                                <label key={ch.code} className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer transition-colors ${isChecked ? "bg-primary/5" : "hover:bg-muted/50"}`}>
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={() => toggleArrayItem("channel", ch.code)}
                                    data-testid={`checkbox-channel-${ch.code.toLowerCase().replace(/\s/g, "-")}`}
                                  />
                                  <span className="text-xs">{ch.code}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-5">
                    <Card className="overflow-hidden" data-testid="india-map-container">
                      <div className="relative rounded-t-lg">
                        <img
                          src={indiaMapImg}
                          alt="India distribution map"
                          className="w-full h-auto object-contain"
                          data-testid="india-map-image"
                        />
                        {selectedClusterDefs.map(cluster => (
                          <div
                            key={cluster.name}
                            className="absolute transition-all duration-300"
                            style={{
                              left: `${cluster.pinX}%`,
                              top: `${cluster.pinY}%`,
                              transform: "translate(-50%, -100%)",
                            }}
                            title={cluster.name}
                            data-testid={`map-pin-${cluster.name.toLowerCase().replace(/[\s-]+/g, "-")}`}
                          >
                            <svg width="18" height="24" viewBox="0 0 18 24" fill="none">
                              <path d="M9 0C4.03 0 0 4.03 0 9c0 6.75 9 15 9 15s9-8.25 9-15c0-4.97-4.03-9-9-9z" fill="#e91e63" />
                              <circle cx="9" cy="9" r="3.5" fill="white" />
                            </svg>
                          </div>
                        ))}
                      </div>
                      <CardContent className="pt-3 pb-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold">Coverage</p>
                          <Badge variant="secondary" className="text-[10px]">{selectedGeo.length} clusters</Badge>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted">
                          <div className="h-full rounded-full bg-gradient-to-r from-[#1f36c7] to-[#00b0d7] transition-all duration-300" style={{ width: `${Math.min(100, (selectedGeo.length / CLUSTERS.length) * 100)}%` }} />
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-3">
                          <div className="text-center">
                            <p className="text-lg font-bold text-foreground">{selectedGeo.length}</p>
                            <p className="text-[9px] text-muted-foreground">Clusters</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-foreground">{selectedDepots.length}</p>
                            <p className="text-[9px] text-muted-foreground">Depots</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-foreground">{selectedChannels.length}</p>
                            <p className="text-[9px] text-muted-foreground">Channels</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {selectedGeo.length > 0 && (
                      <Card data-testid="selected-clusters-list">
                        <CardContent className="pt-4 pb-4">
                          <p className="text-xs font-semibold mb-2">Selected Clusters</p>
                          <div className="flex flex-wrap gap-1">
                            {selectedGeo.map(g => (
                              <Badge key={g} variant="secondary" className="text-[9px] px-1.5 py-0.5">{g}</Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>

                <Card data-testid="distribution-matrix">
                  <CardHeader className="pb-3">
                    <div>
                      <p className="text-sm font-semibold">Distribution Matrix Preview</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Shows coverage by geography, depot, and channel</p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {selectedGeo.length > 0 && selectedDepots.length > 0 && selectedChannels.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 pr-3 text-muted-foreground font-medium">Geography</th>
                              <th className="text-left py-2 pr-3 text-muted-foreground font-medium">Depot</th>
                              {selectedChannels.slice(0, 6).map(ch => (
                                <th key={ch} className="text-center py-2 px-2 text-muted-foreground font-medium">{ch}</th>
                              ))}
                              {selectedChannels.length > 6 && <th className="text-center py-2 px-2 text-muted-foreground font-medium">+{selectedChannels.length - 6}</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {selectedGeo.slice(0, 8).map((geo, geoIdx) => {
                              const depotCode = selectedDepots[geoIdx % selectedDepots.length];
                              return (
                                <tr key={geo} className="border-b border-border/50">
                                  <td className="py-2 pr-3 font-medium">{geo.length > 22 ? geo.substring(0, 20) + "..." : geo}</td>
                                  <td className="py-2 pr-3 font-mono text-muted-foreground">{depotCode}</td>
                                  {selectedChannels.slice(0, 6).map(ch => (
                                    <td key={ch} className="text-center py-2 px-2">
                                      <div className="w-5 h-5 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                                        <Check className="h-3 w-3 text-primary" />
                                      </div>
                                    </td>
                                  ))}
                                  {selectedChannels.length > 6 && (
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
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </form>
      </main>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
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
