import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import type { NetworkEntry, InsertNetworkEntry } from "@shared/schema";

interface EntryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: InsertNetworkEntry) => void;
  entry?: NetworkEntry | null;
  isPending?: boolean;
}

const CHANNELS = ["CD", "CSD", "COOP", "CPC", "GT", "KA", "OH", "RD", "MT", "Retail", "MT-ECOM", "MT-QCOM"];
const NETWORK_TYPES = ["New Launch", "Relaunch", "Discontinuation", "Pack Change", "Weight Change", "Price Change", "Extension"];
const SOURCING_OPTIONS = ["Updated", "Not Updated"];
const GEOGRAPHIES = ["North", "South", "East", "West", "Pan India"];
const DEPOTS = ["Mumbai", "Delhi", "Chennai", "Kolkata", "Bangalore", "Hyderabad", "Pune", "Ahmedabad"];

const emptyForm: InsertNetworkEntry = {
  cbuCreatedDate: null,
  networkChangeDate: null,
  annexureNumber: null,
  basepack: null,
  basepackDescription: null,
  bg: null,
  profitCentre: null,
  salesCategory: null,
  smallC: null,
  brand: null,
  format: null,
  cbuCode: null,
  materialDescription: null,
  typeOfNetwork: null,
  copyCbu: null,
  year: null,
  networkStatus: "Draft",
  startDate: null,
  endDate: null,
  caseConfig: null,
  ean: null,
  netWeight: null,
  grossWeight: null,
  length: null,
  width: null,
  height: null,
  itf: null,
  ftrImagesLink: null,
  predecessorCode: null,
  successorCode: null,
  headerCode: null,
  csdIndexNo: null,
  pcAtChannelState: null,
  sourcingMatrixSection: null,
  geography: [],
  depot: [],
  channel: [],
};

export function EntryFormDialog({ open, onOpenChange, onSubmit, entry, isPending }: EntryFormDialogProps) {
  const [form, setForm] = useState<InsertNetworkEntry>(emptyForm);

  useEffect(() => {
    if (entry) {
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
    } else {
      setForm(emptyForm);
    }
  }, [entry, open]);

  const updateField = (field: keyof InsertNetworkEntry, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field: "geography" | "depot" | "channel", value: string) => {
    setForm(prev => {
      const arr = (prev[field] as string[]) || [];
      return {
        ...prev,
        [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value],
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-lg font-semibold" data-testid="text-form-title">
            {entry ? "Edit Network Entry" : "Create New Network Entry"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <ScrollArea className="max-h-[calc(90vh-140px)] px-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="w-full justify-start mb-4" data-testid="tabs-form">
                <TabsTrigger value="basic" data-testid="tab-basic">Basic Info</TabsTrigger>
                <TabsTrigger value="product" data-testid="tab-product">Product Details</TabsTrigger>
                <TabsTrigger value="dimensions" data-testid="tab-dimensions">Dimensions</TabsTrigger>
                <TabsTrigger value="distribution" data-testid="tab-distribution">Distribution</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <FormField label="CBU Created Date" required>
                    <Input
                      type="date"
                      value={form.cbuCreatedDate || ""}
                      onChange={e => updateField("cbuCreatedDate", e.target.value)}
                      data-testid="input-cbu-created-date"
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
                  <FormField label="Copy from Existing CBU" required>
                    <Input
                      value={form.copyCbu || ""}
                      onChange={e => updateField("copyCbu", e.target.value)}
                      placeholder="Enter existing CBU code"
                      data-testid="input-copy-cbu"
                    />
                  </FormField>
                  <FormField label="Year" required>
                    <Input
                      type="number"
                      value={form.year ?? ""}
                      onChange={e => updateField("year", e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="e.g. 2026"
                      data-testid="input-year"
                    />
                  </FormField>
                </div>
              </TabsContent>

              <TabsContent value="product" className="space-y-4 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      placeholder="Enter header code (for kitted packs)"
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
                  <FormField label="Sourcing Matrix Section">
                    <Select
                      value={form.sourcingMatrixSection || ""}
                      onValueChange={v => updateField("sourcingMatrixSection", v)}
                    >
                      <SelectTrigger data-testid="select-sourcing-matrix">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {SOURCING_OPTIONS.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                </div>
              </TabsContent>

              <TabsContent value="dimensions" className="space-y-4 pb-4">
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
              </TabsContent>

              <TabsContent value="distribution" className="space-y-6 pb-4">
                <div>
                  <Label className="text-sm font-medium mb-3 block">Geography (Multi-select)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3" data-testid="checkboxes-geography">
                    {GEOGRAPHIES.map(g => (
                      <label key={g} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={(form.geography || []).includes(g)}
                          onCheckedChange={() => toggleArrayItem("geography", g)}
                          data-testid={`checkbox-geo-${g.toLowerCase().replace(/\s/g, "-")}`}
                        />
                        <span className="text-sm">{g}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-3 block">Depot (Multi-select)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="checkboxes-depot">
                    {DEPOTS.map(d => (
                      <label key={d} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={(form.depot || []).includes(d)}
                          onCheckedChange={() => toggleArrayItem("depot", d)}
                          data-testid={`checkbox-depot-${d.toLowerCase()}`}
                        />
                        <span className="text-sm">{d}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-3 block">Channel (Multi-select)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="checkboxes-channel">
                    {CHANNELS.map(c => (
                      <label key={c} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={(form.channel || []).includes(c)}
                          onCheckedChange={() => toggleArrayItem("channel", c)}
                          data-testid={`checkbox-channel-${c.toLowerCase()}`}
                        />
                        <span className="text-sm">{c}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </ScrollArea>
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} data-testid="button-submit">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {entry ? "Update Entry" : "Create Entry"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
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
