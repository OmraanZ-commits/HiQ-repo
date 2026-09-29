import { useQuery } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type BssException = {
  customer: string;
  material: string;
  batch: string;
  cl: string | null;
  dchl: string | null;
  grp4: string | null;
  priceLot: string | null;
};

export function BssExceptionList({ customerChain }: { customerChain: string }) {
  const { data, isLoading, isError } = useQuery<{ source: "sample"; rows: BssException[] }>({
    queryKey: ["/api/ccr/bss-exceptions/sample"],
    queryFn: async () => {
      const response = await fetch("/api/ccr/bss-exceptions/sample");
      if (!response.ok) throw new Error("Could not load BSS exception examples");
      return response.json();
    },
  });

  return (
    <section className="space-y-2" aria-label="BSS Exception List">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <AlertCircle className="h-4 w-4 text-muted-foreground" />BSS Exception List
      </h3>
      <p className="text-xs text-muted-foreground">
        Customer, material and batch identify each exception. Other source fields remain available in the backend.
      </p>
      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
        Example rows from the supplied screenshot — not verified exception records for {customerChain}.
      </p>
      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              {["Customer", "Material", "Batch"].map(label => (
                <TableHead key={label} className="text-xs font-semibold">{label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isError ? (
              <TableRow><TableCell colSpan={3} className="h-20 text-center text-xs text-destructive">Could not load BSS exception examples.</TableCell></TableRow>
            ) : isLoading ? (
              <TableRow><TableCell colSpan={3} className="h-20 text-center text-xs text-muted-foreground">Loading exceptions…</TableCell></TableRow>
            ) : !data?.rows.length ? (
              <TableRow><TableCell colSpan={3} className="h-20 text-center text-xs text-muted-foreground">No exception examples available.</TableCell></TableRow>
            ) : data.rows.map((row, index) => (
              <TableRow key={`${row.customer}-${row.material}-${row.batch}-${index}`}>
                <TableCell className="text-xs font-mono">{row.customer}</TableCell>
                <TableCell className="text-xs font-mono">{row.material}</TableCell>
                <TableCell className="text-xs font-mono">{row.batch}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}