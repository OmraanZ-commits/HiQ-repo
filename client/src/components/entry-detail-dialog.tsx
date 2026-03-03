import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StatusFlow } from "@/components/status-flow";
import type { NetworkEntry } from "@shared/schema";
import { useLifecycleData, getLifecycleFlagClasses } from "@/controllers/useLifecycleData";

interface EntryDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: NetworkEntry | null;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

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

export function EntryDetailDialog({ open, onOpenChange, entry }: EntryDetailDialogProps) {
  const { lifecycleMap } = useLifecycleData();

  if (!entry) return null;

  const computedYear = entry.cbuCreatedDate ? new Date(entry.cbuCreatedDate).getFullYear() : "-";
  const lifecycle = lifecycleMap[entry.id];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 flex-wrap">
            <DialogTitle className="text-lg font-semibold" data-testid="text-detail-title">
              {entry.materialDescription || entry.cbuCode || "Network Entry"}
            </DialogTitle>
            <Badge variant={getStatusVariant(entry.networkStatus)} data-testid="badge-detail-status">
              {entry.networkStatus || "Draft"}
            </Badge>
            {lifecycle?.colorFlag && (
              <div className="flex items-center gap-1.5">
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${getLifecycleFlagClasses(lifecycle.colorFlag)}`} data-testid="flag-detail" />
                <span className="text-xs text-muted-foreground">{lifecycle.flagLabel}</span>
                {lifecycle.doh !== null && (
                  <span className="text-xs text-muted-foreground">(DOH: {lifecycle.doh}d)</span>
                )}
              </div>
            )}
          </div>
        </DialogHeader>

        <StatusFlow currentStatus={entry.networkStatus} colorFlag={lifecycle?.colorFlag} />

        <div className="space-y-6 mt-2">
          <Section title="Basic Information">
            <DetailGrid>
              <DetailItem label="CBU Code" value={entry.cbuCode} testId="detail-cbu-code" />
              <DetailItem label="Material Description" value={entry.materialDescription} testId="detail-material-desc" />
              <DetailItem label="Annexure Number" value={entry.annexureNumber} testId="detail-annexure" />
              <DetailItem label="Type of Network" value={entry.typeOfNetwork} testId="detail-network-type" />
              <DetailItem label="CBU Created Date" value={formatDate(entry.cbuCreatedDate)} testId="detail-cbu-date" />
              <DetailItem label="Year (from CBU Date)" value={String(computedYear)} testId="detail-year" />
              <DetailItem label="Network Change Date" value={formatDate(entry.networkChangeDate)} testId="detail-change-date" />
              <DetailItem label="Start Date" value={formatDate(entry.startDate)} testId="detail-start-date" />
              <DetailItem label="End Date" value={formatDate(entry.endDate)} testId="detail-end-date" />
              <DetailItem label="Copy CBU" value={entry.copyCbu} testId="detail-copy-cbu" />
              <DetailItem label="Assigned Person" value={entry.assignedPerson} testId="detail-assigned-person" />
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
              <DetailArrayItem label="Geography / Clusters" values={entry.geography} testId="detail-geography" />
              <DetailArrayItem label="Depots" values={entry.depot} testId="detail-depot" />
              {(() => {
                const mapping = (entry.channelMapping as Record<string, string[]>) || null;
                if (mapping && Object.keys(mapping).length > 0) {
                  return (
                    <div data-testid="detail-channel-mapping">
                      <p className="text-xs text-muted-foreground mb-2">Channels by Geography</p>
                      <div className="space-y-1.5">
                        {Object.entries(mapping).map(([geo, channels]) => (
                          <div key={geo} className="flex items-start gap-2">
                            <span className="text-xs font-medium min-w-[120px]">{geo.length > 20 ? geo.substring(0, 18) + "..." : geo}:</span>
                            <div className="flex flex-wrap gap-1">
                              {(channels as string[]).filter(c => c !== "MT").map(ch => (
                                <Badge key={ch} variant="secondary" className="text-[10px] px-1.5 py-0">{ch}</Badge>
                              ))}
                              {(channels as string[]).filter(c => c !== "MT").length === 0 && <span className="text-xs text-muted-foreground">-</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return <DetailArrayItem label="Channels" values={entry.channel} testId="detail-channel" />;
              })()}
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
