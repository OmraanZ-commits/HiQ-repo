import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, ChevronLeft, ChevronRight, User } from "lucide-react";
import type { NetworkEntry } from "@shared/schema";
import { useState, useEffect } from "react";
import type { LifecycleEntry } from "@/controllers/useLifecycleData";
import { getLifecycleFlagClasses } from "@/controllers/useLifecycleData";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getNetworkChangeTypeName } from "@/lib/constants";

interface NetworkTableProps {
  entries: NetworkEntry[];
  onView: (entry: NetworkEntry) => void;
  onEdit: (entry: NetworkEntry) => void;
  lifecycleMap?: Record<string, LifecycleEntry>;
}

const PAGE_SIZE = 10;

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

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function LifecycleFlag({ lifecycle }: { lifecycle?: LifecycleEntry }) {
  if (!lifecycle?.colorFlag) return null;

  const flagClasses = getLifecycleFlagClasses(lifecycle.colorFlag);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${flagClasses}`}
          data-testid={`flag-${lifecycle.entryId}`}
        />
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <p className="font-medium">{lifecycle.flagLabel}</p>
        {lifecycle.doh !== null && (
          <p className="text-muted-foreground">DOH: {lifecycle.doh} days</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

function NetworkChangeTypeCell({ code }: { code: string | null | undefined }) {
  if (!code) return <span className="text-muted-foreground">-</span>;
  
  const name = getNetworkChangeTypeName(code);
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="text-sm cursor-help">{code}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs max-w-[250px]">
        <p>{name}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function NetworkTable({ entries, onView, onEdit, lifecycleMap = {} }: NetworkTableProps) {
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [entries.length]);

  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const paged = entries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <TooltipProvider>
    <div data-testid="network-table-container">
      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-[#1f36c7]/5 via-[#0d8ecf]/5 to-[#00b0d7]/5">
              <TableHead className="w-[120px] font-semibold text-xs">CBU Code</TableHead>
              <TableHead className="font-semibold text-xs">Material Description</TableHead>
              <TableHead className="font-semibold text-xs">Brand</TableHead>
              <TableHead className="font-semibold text-xs">BG</TableHead>
              <TableHead className="font-semibold text-xs">Type of Network</TableHead>
              <TableHead className="font-semibold text-xs">Assigned Person</TableHead>
              <TableHead className="font-semibold text-xs">CBU Created Date</TableHead>
              <TableHead className="font-semibold text-xs">Status</TableHead>
              <TableHead className="font-semibold text-xs">Trigger</TableHead>
              <TableHead className="text-right font-semibold text-xs w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                  No network entries found matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              paged.map((entry, idx) => {
                const lifecycle = lifecycleMap[entry.id];
                return (
                  <TableRow
                    key={entry.id}
                    className={`group transition-colors ${idx % 2 === 0 ? "" : "bg-muted/20"}`}
                    data-testid={`row-entry-${entry.id}`}
                  >
                    <TableCell className="font-mono text-sm font-medium" data-testid={`text-cbu-${entry.id}`}>
                      {entry.cbuCode || "-"}
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate text-sm" data-testid={`text-desc-${entry.id}`}>
                      {entry.materialDescription || "-"}
                    </TableCell>
                    <TableCell className="text-sm font-medium">{entry.brand || "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{entry.bg || "-"}</TableCell>
                    <TableCell data-testid={`text-network-type-${entry.id}`}>
                      <NetworkChangeTypeCell code={entry.typeOfNetwork} />
                    </TableCell>
                    <TableCell className="text-sm" data-testid={`text-assigned-${entry.id}`}>
                      {entry.assignedPerson ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#1f36c7] to-[#0d8ecf] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                            {entry.assignedPerson.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </div>
                          <span className="truncate max-w-[100px]">{entry.assignedPerson}</span>
                        </div>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground" data-testid={`text-date-${entry.id}`}>
                      {formatDate(entry.cbuCreatedDate)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(entry.networkStatus)} data-testid={`badge-status-${entry.id}`}>
                        {entry.networkStatus || "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell data-testid={`cell-trigger-${entry.id}`}>
                      {lifecycle?.colorFlag ? (
                        <LifecycleFlag lifecycle={lifecycle} />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onView(entry)}
                          data-testid={`button-view-${entry.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onEdit(entry)}
                          data-testid={`button-edit-${entry.id}`}
                         data-network-status={entry.networkStatus || ""}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      {entries.length > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-2 mt-4 px-1">
          <p className="text-sm text-muted-foreground" data-testid="text-pagination-info">
            Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, entries.length)} of {entries.length}
          </p>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              data-testid="button-prev-page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => (
              <Button
                key={i}
                size="sm"
                variant={page === i ? "default" : "outline"}
                onClick={() => setPage(i)}
                data-testid={`button-page-${i}`}
              >
                {i + 1}
              </Button>
            ))}
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
              data-testid="button-next-page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
    </TooltipProvider>
  );
}
