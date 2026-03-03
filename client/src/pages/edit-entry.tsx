import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useParams } from "wouter";
import { useState, useEffect } from "react";
import { UnileverHeader } from "@/components/unilever-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Loader2, Save, Package, MapPin, Ruler, Info } from "lucide-react";
import type { NetworkEntry, InsertNetworkEntry } from "@shared/schema";

const CHANNELS = ["CD", "CSD", "COOP", "CPC", "GT", "KA", "OH", "RD", "MT", "Retail", "MT-ECOM", "MT-QCOM"];
const NETWORK_TYPES = ["New Launch", "Relaunch", "Discontinuation", "Pack Change", "Weight Change", "Price Change", "Extension"];
const GEOGRAPHIES = ["North", "South", "East", "West", "Pan India"];
const DEPOTS = ["Mumbai", "Delhi", "Chennai", "Kolkata", "Bangalore", "Hyderabad", "Pune", "Ahmedabad"];

function getStatusVariant(status: string | null): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "Active": return "default";
    case "Draft": return "secondary";
    case "Production Started": return "outline";
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
      if (field === "cbuCreatedDate") {
        updated.year = computeYear(value as string);
      }
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
                    <FormField label="CBU Code / Material ID" required>
                      <Input
                        value={form.cbuCode || ""}
                        onChange={e => updateField("cbuCode", e.target.value)}
                        placeholder="Enter CBU code"
                        data-testid="input-cbu-code"
                      />
                    </FormField>
                    <FormField label="Material Description" required>
                      <Input
                        value={form.materialDescription || ""}
                        onChange={e => updateField("materialDescription", e.target.value)}
                        placeholder="Enter material description"
                        data-testid="input-material-description"
                      />
                    </FormField>
                    <FormField label="Annexure Number" required>
                      <Input
                        value={form.annexureNumber || ""}
                        onChange={e => updateField("annexureNumber", e.target.value)}
                        placeholder="Enter annexure number"
                        data-testid="input-annexure-number"
                      />
                    </FormField>
                    <FormField label="Type of Network / Annexure" required>
                      <Select
                        value={form.typeOfNetwork || ""}
                        onValueChange={v => updateField("typeOfNetwork", v)}
                      >
                        <SelectTrigger data-testid="select-type-of-network">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {NETWORK_TYPES.map(t => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Copy from Existing CBU" required>
                      <Input
                        value={form.copyCbu || ""}
                        onChange={e => updateField("copyCbu", e.target.value)}
                        placeholder="Enter existing CBU code"
                        data-testid="input-copy-cbu"
                      />
                    </FormField>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-4">
                    <h3 className="text-sm font-semibold text-[#0d8ecf] dark:text-[#4db8e8]">Dates & Timeline</h3>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField label="CBU Created Date" required>
                      <Input
                        type="date"
                        value={form.cbuCreatedDate || ""}
                        onChange={e => updateField("cbuCreatedDate", e.target.value)}
                        data-testid="input-cbu-created-date"
                      />
                    </FormField>
                    <FormField label="Year (auto-calculated)">
                      <Input
                        value={computedYear ?? "-"}
                        disabled
                        className="bg-muted/50"
                        data-testid="input-year"
                      />
                    </FormField>
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
                    <FormField label="Basepack" required>
                      <Input
                        value={form.basepack || ""}
                        onChange={e => updateField("basepack", e.target.value)}
                        placeholder="Enter basepack"
                        data-testid="input-basepack"
                      />
                    </FormField>
                    <FormField label="Basepack Description" required>
                      <Input
                        value={form.basepackDescription || ""}
                        onChange={e => updateField("basepackDescription", e.target.value)}
                        placeholder="Enter basepack description"
                        data-testid="input-basepack-description"
                      />
                    </FormField>
                    <FormField label="BG" required>
                      <Input
                        value={form.bg || ""}
                        onChange={e => updateField("bg", e.target.value)}
                        placeholder="Enter BG"
                        data-testid="input-bg"
                      />
                    </FormField>
                    <FormField label="Profit Centre" required>
                      <Input
                        value={form.profitCentre || ""}
                        onChange={e => updateField("profitCentre", e.target.value)}
                        placeholder="Enter profit centre"
                        data-testid="input-profit-centre"
                      />
                    </FormField>
                    <FormField label="Sales Category" required>
                      <Input
                        value={form.salesCategory || ""}
                        onChange={e => updateField("salesCategory", e.target.value)}
                        placeholder="Enter sales category"
                        data-testid="input-sales-category"
                      />
                    </FormField>
                    <FormField label="Small C" required>
                      <Input
                        value={form.smallC || ""}
                        onChange={e => updateField("smallC", e.target.value)}
                        placeholder="Enter Small C"
                        data-testid="input-small-c"
                      />
                    </FormField>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-4">
                    <h3 className="text-sm font-semibold text-[#0d8ecf] dark:text-[#4db8e8]">Brand & References</h3>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField label="Brand" required>
                      <Input
                        value={form.brand || ""}
                        onChange={e => updateField("brand", e.target.value)}
                        placeholder="Enter brand"
                        data-testid="input-brand"
                      />
                    </FormField>
                    <FormField label="Format" required>
                      <Input
                        value={form.format || ""}
                        onChange={e => updateField("format", e.target.value)}
                        placeholder="Enter format"
                        data-testid="input-format"
                      />
                    </FormField>
                    <FormField label="Predecessor Code">
                      <Input
                        value={form.predecessorCode || ""}
                        onChange={e => updateField("predecessorCode", e.target.value)}
                        placeholder="Enter predecessor code"
                        data-testid="input-predecessor-code"
                      />
                    </FormField>
                    <FormField label="Successor Code">
                      <Input
                        value={form.successorCode || ""}
                        onChange={e => updateField("successorCode", e.target.value)}
                        placeholder="Enter successor code"
                        data-testid="input-successor-code"
                      />
                    </FormField>
                    <FormField label="Header Code">
                      <Input
                        value={form.headerCode || ""}
                        onChange={e => updateField("headerCode", e.target.value)}
                        placeholder="For kitted packs"
                        data-testid="input-header-code"
                      />
                    </FormField>
                    <FormField label="CSD Index No.">
                      <Input
                        value={form.csdIndexNo || ""}
                        onChange={e => updateField("csdIndexNo", e.target.value)}
                        placeholder="Enter CSD index number"
                        data-testid="input-csd-index"
                      />
                    </FormField>
                    <FormField label="FTR Images Link">
                      <Input
                        value={form.ftrImagesLink || ""}
                        onChange={e => updateField("ftrImagesLink", e.target.value)}
                        placeholder="Enter FTR images link"
                        data-testid="input-ftr-link"
                      />
                    </FormField>
                    <FormField label="PC at Channel/State Level">
                      <Input
                        value={form.pcAtChannelState || ""}
                        onChange={e => updateField("pcAtChannelState", e.target.value)}
                        placeholder="Enter price circular"
                        data-testid="input-pc-channel"
                      />
                    </FormField>
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
                    <FormField label="Case Config">
                      <Input
                        value={form.caseConfig || ""}
                        onChange={e => updateField("caseConfig", e.target.value)}
                        placeholder="Enter case config"
                        data-testid="input-case-config"
                      />
                    </FormField>
                    <FormField label="EAN">
                      <Input
                        value={form.ean || ""}
                        onChange={e => updateField("ean", e.target.value)}
                        placeholder="Enter EAN"
                        data-testid="input-ean"
                      />
                    </FormField>
                    <FormField label="ITF">
                      <Input
                        value={form.itf || ""}
                        onChange={e => updateField("itf", e.target.value)}
                        placeholder="Enter ITF"
                        data-testid="input-itf"
                      />
                    </FormField>
                    <FormField label="Net Weight (g)">
                      <Input
                        type="number"
                        step="0.01"
                        value={form.netWeight ?? ""}
                        onChange={e => updateField("netWeight", e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="Enter net weight"
                        data-testid="input-net-weight"
                      />
                    </FormField>
                    <FormField label="Gross Weight (g)">
                      <Input
                        type="number"
                        step="0.01"
                        value={form.grossWeight ?? ""}
                        onChange={e => updateField("grossWeight", e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="Enter gross weight"
                        data-testid="input-gross-weight"
                      />
                    </FormField>
                    <FormField label="Length (mm)">
                      <Input
                        type="number"
                        step="0.01"
                        value={form.length ?? ""}
                        onChange={e => updateField("length", e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="Enter length"
                        data-testid="input-length"
                      />
                    </FormField>
                    <FormField label="Width (mm)">
                      <Input
                        type="number"
                        step="0.01"
                        value={form.width ?? ""}
                        onChange={e => updateField("width", e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="Enter width"
                        data-testid="input-width"
                      />
                    </FormField>
                    <FormField label="Height (mm)">
                      <Input
                        type="number"
                        step="0.01"
                        value={form.height ?? ""}
                        onChange={e => updateField("height", e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="Enter height"
                        data-testid="input-height"
                      />
                    </FormField>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="distribution" className="mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-4">
                    <h3 className="text-sm font-semibold text-[#0d8ecf] dark:text-[#4db8e8]">Geography</h3>
                  </CardHeader>
                  <CardContent className="space-y-3" data-testid="checkboxes-geography">
                    {GEOGRAPHIES.map(g => (
                      <label key={g} className="flex items-center gap-3 cursor-pointer py-1">
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

                <Card>
                  <CardHeader className="pb-4">
                    <h3 className="text-sm font-semibold text-[#0d8ecf] dark:text-[#4db8e8]">Depot</h3>
                  </CardHeader>
                  <CardContent className="space-y-3" data-testid="checkboxes-depot">
                    {DEPOTS.map(d => (
                      <label key={d} className="flex items-center gap-3 cursor-pointer py-1">
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

                <Card>
                  <CardHeader className="pb-4">
                    <h3 className="text-sm font-semibold text-[#0d8ecf] dark:text-[#4db8e8]">Channel</h3>
                  </CardHeader>
                  <CardContent className="space-y-3" data-testid="checkboxes-channel">
                    {CHANNELS.map(c => (
                      <label key={c} className="flex items-center gap-3 cursor-pointer py-1">
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
            </TabsContent>
          </Tabs>
        </form>
      </main>
    </div>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}
