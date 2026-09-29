import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Settings, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type BssRow = {
  customerChain: string;
  customerCode: string;
  bg: string;
  cbu: string;
  cbuDescription: string;
  priceLot: string | null;
  sortingRule: string;
  freshness: number;
};

const columns: { label: string; value: (row: BssRow) => string }[] = [
  { label: "Customer Chain", value: row => row.customerChain },
  { label: "Customer Code", value: row => row.customerCode },
  { label: "BG", value: row => row.bg },
  { label: "CBU", value: row => row.cbu },
  { label: "CBU Description", value: row => row.cbuDescription },
  { label: "Price Lot", value: row => row.priceLot ?? "Not available" },
  { label: "Sorting Rule", value: row => row.sortingRule },
  { label: "Freshness", value: row => `${row.freshness} days` },
];

const levels = [
  { id: "l1", label: "Chain Level", description: "Customer chain × Sorting Rule × Freshness", fields: [0, 6, 7] },
  { id: "l2", label: "Chain × BG", description: "Customer chain × BG × Sorting Rule × Freshness", fields: [0, 2, 6, 7] },
  { id: "l3", label: "Chain × BG × CBU", description: "Customer chain × BG × CBU × Sorting Rule × Freshness", fields: [0, 2, 3, 4, 5, 6, 7] },
  { id: "l4", label: "Code × BG × CBU", description: "Customer code × BG × CBU × Sorting Rule × Freshness", fields: [0, 1, 2, 3, 4, 5, 6, 7] },
] as const;

export function BssMasterLevels({ customerChain }: { customerChain: string }) {
  const [showExamples, setShowExamples] = useState(false);
  const { data, isLoading, isError } = useQuery<{ source: "sample"; rows: BssRow[] }>({
    queryKey: ["/api/ccr/bss-master/sample"],
    queryFn: async () => {
      const response = await fetch("/api/ccr/bss-master/sample");
      if (!response.ok) throw new Error("Could not load BSS examples");
      return response.json();
    },
    enabled: showExamples,
  });

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button size="sm" className="h-7 text-xs" variant={showExamples ? "outline" : "secondary"} onClick={() => setShowExamples(false)}>
          Selected chain
        </Button>
        <Button size="sm" className="h-7 text-xs" variant={showExamples ? "secondary" : "outline"} onClick={() => setShowExamples(true)}>
          Supplied examples
        </Button>
      </div>
      {showExamples && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          Supplied Myntra examples, not verified configuration for {customerChain}. These are customer-code × CBU records shown with the columns of each view; they do not establish a chain-wide rule.
        </p>
      )}
      <Tabs defaultValue="l1">
        <TabsList className="h-7">
          {levels.map(level => (
            <TabsTrigger key={level.id} value={level.id} className="text-[11px] h-6 px-2.5">{level.label}</TabsTrigger>
          ))}
        </TabsList>
        {levels.map(level => {
          const visibleColumns = level.fields.map(index => columns[index]);
          return (
            <TabsContent key={level.id} value={level.id} className="mt-3 space-y-3">
              <p className="text-xs text-muted-foreground">{level.description}</p>
              <section className="space-y-2" aria-label={`BSS — ${level.label}`}>
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />BSS — {level.label}
                  </h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-7 text-xs" disabled><Download className="h-3 w-3 mr-1" />Export</Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs" disabled><Settings className="h-3 w-3 mr-1" />Configure</Button>
                  </div>
                </div>
                <div className="border rounded-md overflow-x-auto">
                  <Table className="min-w-max">
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        {visibleColumns.map(column => <TableHead key={column.label} className="text-xs font-semibold whitespace-nowrap">{column.label}</TableHead>)}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!showExamples || isLoading || isError || !data?.rows.length ? (
                        <TableRow>
                          <TableCell colSpan={visibleColumns.length} className="h-20 text-center text-xs text-muted-foreground">
                            {!showExamples ? `No BSS configuration available for ${customerChain}.` :
                              isError ? "Could not load BSS examples." :
                              isLoading ? "Loading BSS examples…" : "No BSS examples available."}
                          </TableCell>
                        </TableRow>
                      ) : data.rows.map(row => (
                        <TableRow key={`${row.customerCode}-${row.cbu}`}>
                          {visibleColumns.map(column => <TableCell key={column.label} className="text-xs whitespace-nowrap">{column.value(row)}</TableCell>)}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </section>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}