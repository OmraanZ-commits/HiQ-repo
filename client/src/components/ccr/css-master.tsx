import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { Download, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type CssRow = {
  customer: string;
  cssCondition: string | null;
  taxBasis: "Pre-Tax" | "Post-Tax" | "Not Applicable";
  tolerance: string | null;
  costValidation: string | null;
};

export function CssMaster({ customerChain }: { customerChain: string }) {
  const [view, setView] = useState<"configuration" | "chain">("configuration");
  const { data: configuration = [], isLoading: configLoading, isError: configError } = useQuery<CssRow[]>({
    queryKey: ["/api/ccr/css-master/configuration"],
    queryFn: async () => {
      const response = await fetch("/api/ccr/css-master/configuration");
      if (!response.ok) throw new Error("Could not load CSS configuration");
      return response.json();
    },
    enabled: view === "configuration",
  });
  const { data: chainRows = [], isLoading: chainLoading, isError: chainError } = useQuery<CssRow[]>({
    queryKey: ["/api/ccr/customers", customerChain, "css-master"],
    queryFn: async () => {
      const response = await fetch(`/api/ccr/customers/${encodeURIComponent(customerChain)}/css-master`);
      if (!response.ok) throw new Error("Could not load chain CSS status");
      return response.json();
    },
    enabled: view === "chain",
  });
  const isConfiguration = view === "configuration";
  const rows = isConfiguration ? configuration : chainRows;
  const loading = isConfiguration ? configLoading : chainLoading;
  const error = isConfiguration ? configError : chainError;

  function exportRows() {
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Customer", "CSS Condition", "Tax Basis", "Tolerance"],
      ...rows.map(row => [row.customer, row.cssCondition ?? "", row.taxBasis, row.tolerance ?? ""]),
    ]);
    sheet["!cols"] = [{ wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 18 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "CSS Master");
    XLSX.writeFile(workbook, `CSS_Master_${isConfiguration ? "Configuration" : customerChain.replace(/[^a-z0-9-]/gi, "_")}.xlsx`);
  }

  return (
    <section className="space-y-3" aria-label="CSS Master">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />CSS Master
        </h3>
        <Button variant="outline" size="sm" className="h-8 text-xs" disabled={loading || error || rows.length === 0} onClick={exportRows}>
          <Download className="h-3.5 w-3.5 mr-1.5" />Export
        </Button>
      </div>
      <div role="group" aria-label="CSS data view" className="flex flex-wrap gap-2">
        <Button size="sm" className="h-8 text-xs" variant={isConfiguration ? "default" : "outline"}
          aria-pressed={isConfiguration} onClick={() => setView("configuration")}>Supplied configuration</Button>
        <Button size="sm" className="h-8 text-xs" variant={!isConfiguration ? "default" : "outline"}
          aria-pressed={!isConfiguration} onClick={() => setView("chain")}>Current chain</Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {isConfiguration
          ? "Rows from the supplied CSS configuration spreadsheet; not assigned to the selected customer chain."
          : `Mapped customers for ${customerChain}. Customers without a CSS configuration are Not Applicable.`}
      </p>
      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              {["Customer", "CSS Condition", "Tax Basis", "Tolerance"].map(column => (
                <TableHead key={column} className="text-xs font-semibold whitespace-nowrap">{column}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {error ? (
              <TableRow><TableCell colSpan={4} className="h-20 text-center text-xs text-destructive">Could not load CSS data.</TableCell></TableRow>
            ) : loading ? (
              <TableRow><TableCell colSpan={4} className="h-20 text-center text-xs text-muted-foreground">Loading CSS data…</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="h-20 text-center text-xs text-muted-foreground">No customers to display.</TableCell></TableRow>
            ) : rows.map(row => (
              <TableRow key={row.customer}>
                <TableCell className="text-xs font-mono">{row.customer}</TableCell>
                <TableCell className="text-xs font-mono">{row.cssCondition ?? "—"}</TableCell>
                <TableCell className="text-xs">{row.taxBasis}</TableCell>
                <TableCell className="text-xs font-mono">{row.tolerance ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}