import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { NetworkEntry } from "@shared/schema";

interface EntryDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: NetworkEntry | null;
}

function getStatusVariant(status: string | null): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "Active": return "default";
    case "Draft": return "secondary";
    case "Production Started": return "outline";
    default: return "secondary";
  }
}

export function EntryDetailDialog({ open, onOpenChange, entry }: EntryDetailDialogProps) {
  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle className="text-lg font-semibold" data-testid="text-detail-title">
              {entry.materialDescription || entry.cbuCode || "Network Entry"}
            </DialogTitle>
            <Badge variant={getStatusVariant(entry.networkStatus)} data-testid="badge-detail-status">
              {entry.networkStatus || "Draft"}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          <Section title="Basic Information">
            <DetailGrid>
              <DetailItem label="CBU Code" value={entry.cbuCode} testId="detail-cbu-code" />
              <DetailItem label="Material Description" value={entry.materialDescription} testId="detail-material-desc" />
              <DetailItem label="Annexure Number" value={entry.annexureNumber} testId="detail-annexure" />
              <DetailItem label="Type of Network" value={entry.typeOfNetwork} testId="detail-network-type" />
              <DetailItem label="CBU Created Date" value={entry.cbuCreatedDate} testId="detail-cbu-date" />
              <DetailItem label="Network Change Date" value={entry.networkChangeDate} testId="detail-change-date" />
              <DetailItem label="Start Date" value={entry.startDate} testId="detail-start-date" />
              <DetailItem label="End Date" value={entry.endDate} testId="detail-end-date" />
              <DetailItem label="Year" value={entry.year?.toString()} testId="detail-year" />
              <DetailItem label="Copy CBU" value={entry.copyCbu} testId="detail-copy-cbu" />
            </DetailGrid>
          </Section>

          <Separator />

          <Section title="Product Details">
            <DetailGrid>
              <DetailItem label="Basepack" value={entry.basepack} testId="detail-basepack" />
              <DetailItem label="Basepack Description" value={entry.basepackDescription} testId="detail-basepack-desc" />
              <DetailItem label="BG" value={entry.bg} testId="detail-bg" />
              <DetailItem label="Profit Centre" value={entry.profitCentre} testId="detail-profit-centre" />
              <DetailItem label="Sales Category" value={entry.salesCategory} testId="detail-sales-cat" />
              <DetailItem label="Small C" value={entry.smallC} testId="detail-small-c" />
              <DetailItem label="Brand" value={entry.brand} testId="detail-brand" />
              <DetailItem label="Format" value={entry.format} testId="detail-format" />
              <DetailItem label="Predecessor Code" value={entry.predecessorCode} testId="detail-predecessor" />
              <DetailItem label="Successor Code" value={entry.successorCode} testId="detail-successor" />
              <DetailItem label="Header Code" value={entry.headerCode} testId="detail-header-code" />
              <DetailItem label="CSD Index No." value={entry.csdIndexNo} testId="detail-csd-index" />
              <DetailItem label="PC at Channel/State" value={entry.pcAtChannelState} testId="detail-pc-channel" />
              <DetailItem label="Sourcing Matrix" value={entry.sourcingMatrixSection} testId="detail-sourcing" />
              <DetailItem label="FTR Images Link" value={entry.ftrImagesLink} testId="detail-ftr" />
            </DetailGrid>
          </Section>

          <Separator />

          <Section title="Dimensions & Packaging">
            <DetailGrid>
              <DetailItem label="Case Config" value={entry.caseConfig} testId="detail-case-config" />
              <DetailItem label="EAN" value={entry.ean} testId="detail-ean" />
              <DetailItem label="ITF" value={entry.itf} testId="detail-itf" />
              <DetailItem label="Net Weight" value={entry.netWeight ? `${entry.netWeight} g` : null} testId="detail-net-weight" />
              <DetailItem label="Gross Weight" value={entry.grossWeight ? `${entry.grossWeight} g` : null} testId="detail-gross-weight" />
              <DetailItem label="Length" value={entry.length ? `${entry.length} mm` : null} testId="detail-length" />
              <DetailItem label="Width" value={entry.width ? `${entry.width} mm` : null} testId="detail-width" />
              <DetailItem label="Height" value={entry.height ? `${entry.height} mm` : null} testId="detail-height" />
            </DetailGrid>
          </Section>

          <Separator />

          <Section title="Distribution">
            <div className="space-y-4">
              <DetailArrayItem label="Geography" values={entry.geography} testId="detail-geography" />
              <DetailArrayItem label="Depot" values={entry.depot} testId="detail-depot" />
              <DetailArrayItem label="Channel" values={entry.channel} testId="detail-channel" />
            </div>
          </Section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-[#0d8ecf] dark:text-[#4db8e8] mb-3">{title}</h3>
      {children}
    </div>
  );
}

function DetailGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">{children}</div>;
}

function DetailItem({ label, value, testId }: { label: string; value: string | null | undefined; testId: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium mt-0.5" data-testid={testId}>{value || "-"}</p>
    </div>
  );
}

function DetailArrayItem({ label, values, testId }: { label: string; values: string[] | null; testId: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5" data-testid={testId}>
        {values && values.length > 0 ? (
          values.map(v => (
            <Badge key={v} variant="secondary" className="text-xs">{v}</Badge>
          ))
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        )}
      </div>
    </div>
  );
}
