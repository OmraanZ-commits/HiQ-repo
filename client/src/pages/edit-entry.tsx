import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useParams } from "wouter";
import { useState, useEffect } from "react";
import { UnileverHeader } from "@/components/unilever-header";
import { StatusFlow } from "@/components/status-flow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Loader2, Save, Package, MapPin, Ruler, Info, Lock, Globe, Building2, Radio } from "lucide-react";
import type { NetworkEntry, InsertNetworkEntry } from "@shared/schema";

const CHANNELS = ["CD", "CSD", "COOP", "CPC", "GT", "KA", "OH", "RD", "MT", "Retail", "MT-ECOM", "MT-QCOM"];
const GEOGRAPHIES = ["North", "South", "East", "West", "Pan India"];
const DEPOTS = ["Mumbai", "Delhi", "Chennai", "Kolkata", "Bangalore", "Hyderabad", "Pune", "Ahmedabad"];

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

  return (
    <div className="min-h-screen bg-background">
      <UnileverHeader />

      <main className="max-w-[1200px] mx-auto px-6 py-6">
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              data-testid="button-back"
            >
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
          <Button
            onClick={handleSubmit}
            disabled={updateMutation.isPending}
            data-testid="button-save"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
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
                <Info className="h-4 w-4" />
                Basic Info
              </TabsTrigger>
              <TabsTrigger value="product" className="gap-2" data-testid="tab-product">
                <Package className="h-4 w-4" />
                Product Details
              </TabsTrigger>
              <TabsTrigger value="dimensions" className="gap-2" data-testid="tab-dimensions">
                <Ruler className="h-4 w-4" />
                Dimensions
              </TabsTrigger>
              <TabsTrigger value="distribution" className="gap-2" data-testid="tab-distribution">
                <MapPin className="h-4 w-4" />
                Distribution
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
                      <Input
                        type="date"
                        value={form.networkChangeDate || ""}
                        onChange={e => updateField("networkChangeDate", e.target.value)}
                        data-testid="input-network-change-date"
                      />
                    </FormField>
                    <FormField label="Start Date">
                      <Input
                        type="date"
                        value={form.startDate || ""}
                        onChange={e => updateField("startDate", e.target.value)}
                        data-testid="input-start-date"
                      />
                    </FormField>
                    <FormField label="End Date">
                      <Input
                        type="date"
                        value={form.endDate || ""}
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
                      <Input
                        value={form.ftrImagesLink || ""}
                        onChange={e => updateField("ftrImagesLink", e.target.value)}
                        placeholder="Enter FTR images link"
                        data-testid="input-ftr-link"
                      />
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
              <div className="relative rounded-xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#1f36c7]/[0.04] via-[#0d8ecf]/[0.06] to-[#00b0d7]/[0.04]" />
                <div
                  className="absolute inset-0 opacity-[0.03]"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230d8ecf' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                  }}
                />
                <div
                  className="absolute top-0 right-0 w-64 h-64 opacity-[0.06] pointer-events-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Ccircle cx='100' cy='100' r='80' fill='none' stroke='%230d8ecf' stroke-width='1'/%3E%3Ccircle cx='100' cy='100' r='60' fill='none' stroke='%230d8ecf' stroke-width='0.5'/%3E%3Ccircle cx='100' cy='100' r='40' fill='none' stroke='%230d8ecf' stroke-width='0.5'/%3E%3Cline x1='20' y1='100' x2='180' y2='100' stroke='%230d8ecf' stroke-width='0.5'/%3E%3Cline x1='100' y1='20' x2='100' y2='180' stroke='%230d8ecf' stroke-width='0.5'/%3E%3C/svg%3E")`,
                    backgroundSize: "contain",
                    backgroundRepeat: "no-repeat",
                  }}
                />

                <div className="relative z-10 p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1f36c7] to-[#00b0d7] flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="text-base font-semibold">Distribution Network</h3>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <Card className="border-[#0d8ecf]/10 bg-white/80 dark:bg-card/80 backdrop-blur-sm shadow-sm">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-[#1f36c7]" />
                          <h4 className="text-sm font-semibold text-[#1f36c7] dark:text-[#4db8e8]">Geography</h4>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2.5" data-testid="checkboxes-geography">
                        {GEOGRAPHIES.map(g => (
                          <label key={g} className="flex items-center gap-3 cursor-pointer py-1.5 px-2 rounded-md hover:bg-[#0d8ecf]/5 transition-colors">
                            <Checkbox
                              checked={(form.geography || []).includes(g)}
                              onCheckedChange={() => toggleArrayItem("geography", g)}
                              data-testid={`checkbox-geo-${g.toLowerCase().replace(/\s/g, "-")}`}
                            />
                            <span className="text-sm">{g}</span>
                          </label>
                        ))}
                      </CardContent>
                    </Card>

                    <Card className="border-[#0d8ecf]/10 bg-white/80 dark:bg-card/80 backdrop-blur-sm shadow-sm">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-[#0d8ecf]" />
                          <h4 className="text-sm font-semibold text-[#0d8ecf] dark:text-[#4db8e8]">Depot</h4>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2.5" data-testid="checkboxes-depot">
                        {DEPOTS.map(d => (
                          <label key={d} className="flex items-center gap-3 cursor-pointer py-1.5 px-2 rounded-md hover:bg-[#0d8ecf]/5 transition-colors">
                            <Checkbox
                              checked={(form.depot || []).includes(d)}
                              onCheckedChange={() => toggleArrayItem("depot", d)}
                              data-testid={`checkbox-depot-${d.toLowerCase()}`}
                            />
                            <span className="text-sm">{d}</span>
                          </label>
                        ))}
                      </CardContent>
                    </Card>

                    <Card className="border-[#0d8ecf]/10 bg-white/80 dark:bg-card/80 backdrop-blur-sm shadow-sm">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <Radio className="h-4 w-4 text-[#00b0d7]" />
                          <h4 className="text-sm font-semibold text-[#00b0d7] dark:text-[#4db8e8]">Channel</h4>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2.5" data-testid="checkboxes-channel">
                        {CHANNELS.map(c => (
                          <label key={c} className="flex items-center gap-3 cursor-pointer py-1.5 px-2 rounded-md hover:bg-[#0d8ecf]/5 transition-colors">
                            <Checkbox
                              checked={(form.channel || []).includes(c)}
                              onCheckedChange={() => toggleArrayItem("channel", c)}
                              data-testid={`checkbox-channel-${c.toLowerCase()}`}
                            />
                            <span className="text-sm">{c}</span>
                          </label>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                </div>
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
      <Input
        value={value || "-"}
        disabled
        className="bg-muted/40 cursor-not-allowed"
        data-testid={testId}
      />
    </div>
  );
}
