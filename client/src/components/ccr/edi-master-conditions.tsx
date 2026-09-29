import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { Download, Search, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type EdiMaster = {
  customer: string;
  organizationId: string;
  plant: string;
  customerGroup: string;
};
type EdiCondition = {
  customer: string;
  outputType: string;
  billType: string;
  conditionRecord: string;
};
type EdiResult<T> = { source: "sample"; rows: T[] };
type View = "masters" | "conditions";

const masterColumns: { label: string; value: (row: EdiMaster) => string }[] = [
  { label: "Customer", value: row => row.customer },
  { label: "Organization ID", value: row => row.organizationId },
  { label: "Plant", value: row => row.plant },
  { label: "Customer Group", value: row => row.customerGroup },
];
const conditionColumns: { label: string; value: (row: EdiCondition) => string }[] = [
  { label: "Customer", value: row => row.customer },
  { label: "Output Type", value: row => row.outputType },
  { label: "Bill Type", value: row => row.billType },
  { label: "Condition Record", value: row => row.conditionRecord },
];

export function EdiMasterConditions({ customerChain }: { customerChain: string }) {
  const [view, setView] = useState<View>("masters");
  const [search, setSearch] = useState("");
  const { data: masters, isLoading: mastersLoading, isError: mastersError } = useQuery<EdiResult<EdiMaster>>({
    queryKey: ["/api/ccr/edi/masters"],
    queryFn: async () => {
      const response = await fetch("/api/ccr/edi/masters");
      if (!response.ok) throw new Error("Could not load EDI masters");
      return response.json();
    },
    enabled: view === "masters",
  });
  const { data: conditions, isLoading: conditionsLoading, isError: conditionsError } = useQuery<EdiResult<EdiCondition>>({
    queryKey: ["/api/ccr/edi/conditions"],
    queryFn: async () => {
      const response = await fetch("/api/ccr/edi/conditions");
      if (!response.ok) throw new Error("Could not load EDI conditions");
      return response.json();
    },
    enabled: view === "conditions",
  });

  const isMaster = view === "masters";
  const columns = isMaster ? masterColumns : conditionColumns;
  const rows = isMaster
    ? (masters?.rows ?? []).filter(row => row.customer.toLowerCase().includes(search.trim().toLowerCase())).map(row => masterColumns.map(column => column.value(row)))
    : (conditions?.rows ?? []).filter(row => row.customer.toLowerCase().includes(search.trim().toLowerCase())).map(row => conditionColumns.map(column => column.value(row)));
  const loading = isMaster ? mastersLoading : conditionsLoading;
  const error = isMaster ? mastersError : conditionsError;
  const title = isMaster ? "EDI Masters" : "EDI Conditions";

  function exportRows() {
    const sheet = XLSX.utils.aoa_to_sheet([columns.map(column => column.label), ...rows]);
    sheet["!cols"] = columns.map(column => ({ wch: Math.max(column.label.length, 20) }));
    // Keep customer codes and condition records as text, including leading zeroes.
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, title);
    XLSX.writeFile(workbook, `EDI_${isMaster ? "Masters" : "Conditions"}_Sample.xlsx`);
  }

  return (
    <section aria-label="EDI Master & Conditions" className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Zap className="h-4 w-4 text-muted-foreground" />
        EDI Master & Conditions
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="EDI data view">
        <Button size="sm" className="h-8 text-xs" variant={isMaster ? "default" : "outline"} aria-pressed={isMaster}
          onClick={() => { setView("masters"); setSearch(""); }}>EDI Masters</Button>
        <Button size="sm" className="h-8 text-xs" variant={!isMaster ? "default" : "outline"} aria-pressed={!isMaster}
          onClick={() => { setView("conditions"); setSearch(""); }}>EDI Conditions</Button>
      </div>
      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
        Sample records from the supplied EDI specification. These are not verified records for {customerChain}.
      </p>
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div className="space-y-1.5">
          <h3 className="text-xs font-semibold">{title}</h3>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            <Input aria-label="Search Customer Code" placeholder="Search Customer Code" value={search}
              onChange={event => setSearch(event.target.value)}
              className="h-9 w-64 pl-8 text-xs" />
          </div>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={exportRows} disabled={loading || error || rows.length === 0}>
          <Download className="h-3.5 w-3.5 mr-1.5" />Export
        </Button>
      </div>
      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              {columns.map(column => <TableHead key={column.label} className="text-xs font-semibold whitespace-nowrap">{column.label}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {error ? (
              <TableRow><TableCell colSpan={columns.length} className="h-20 text-center text-xs text-destructive">Could not load {title.toLowerCase()}.</TableCell></TableRow>
            ) : loading ? (
              <TableRow><TableCell colSpan={columns.length} className="h-20 text-center text-xs text-muted-foreground">Loading {title.toLowerCase()}…</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={columns.length} className="h-20 text-center text-xs text-muted-foreground">No customers match this search.</TableCell></TableRow>
            ) : rows.map((values, index) => (
              <TableRow key={`${values[0]}-${index}`}>
                {values.map((value, columnIndex) => <TableCell key={columns[columnIndex].label} className="text-xs font-mono whitespace-nowrap">{value}</TableCell>)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}