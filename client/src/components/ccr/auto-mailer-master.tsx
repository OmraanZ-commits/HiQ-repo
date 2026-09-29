import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Pencil, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

const categories = [
  { id: "appointment-portal", label: "Appointment Portal" },
  { id: "error-logs", label: "Error Logs" },
  { id: "exception-reports", label: "Exception Reports" },
  { id: "sob-trigger", label: "SOB Trigger" },
] as const;
type Category = (typeof categories)[number]["id"];
type MailerRecord = { customerCode: string; category: Category; emails: string[] };
type CustomerCodeMapping = { customerCode: string };

// Illustrative only: these addresses cannot be delivered and are never saved to a chain.
const sampleRecords: MailerRecord[] = [
  ...([["0000132685", 5], ["0000132823", 10], ["0000132858", 10], ["0000132906", 4]] as const)
    .map(([customerCode, count]) => ({
      customerCode,
      category: "appointment-portal" as const,
      emails: Array.from({ length: count }, (_, index) => `contact${index + 1}@example.invalid`),
    })),
];

export function AutoMailerMaster({
  customerChain, customerMappings, mappingsLoading, mappingsError,
}: {
  customerChain: string;
  customerMappings: CustomerCodeMapping[];
  mappingsLoading: boolean;
  mappingsError: boolean;
}) {
  const [category, setCategory] = useState<Category>("appointment-portal");
  const [showSample, setShowSample] = useState(false);
  const [activeCustomer, setActiveCustomer] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [validationError, setValidationError] = useState("");
  const queryClient = useQueryClient();
  const queryKey = ["/api/ccr/customers", customerChain, "auto-mailer"];
  const { data: savedRecords = [], isLoading, isError } = useQuery<MailerRecord[]>({
    queryKey,
    queryFn: async () => {
      const response = await fetch(`/api/ccr/customers/${encodeURIComponent(customerChain)}/auto-mailer`);
      if (!response.ok) throw new Error("Could not load auto-mailer addresses");
      return response.json();
    },
  });
  const save = useMutation({
    mutationFn: async (emails: string[]) => {
      if (!activeCustomer) throw new Error("No customer selected");
      const response = await fetch(`/api/ccr/customers/${encodeURIComponent(customerChain)}/auto-mailer/${encodeURIComponent(activeCustomer)}/${category}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.detail || "Could not save email addresses");
      }
      return response.json() as Promise<MailerRecord>;
    },
    onSuccess: (record) => {
      queryClient.setQueryData<MailerRecord[]>(queryKey, previous => [
        ...(previous ?? []).filter(row => row.customerCode !== record.customerCode || row.category !== record.category),
        record,
      ]);
      setEditing(false);
      setValidationError("");
    },
  });

  const customers = showSample
    ? sampleRecords.map(record => record.customerCode)
    : Array.from(new Set(customerMappings.map(row => row.customerCode))).sort();
  const records = showSample ? sampleRecords : savedRecords;
  const emailsFor = (customerCode: string) =>
    records.find(row => row.customerCode === customerCode && row.category === category)?.emails ?? [];
  const activeEmails = activeCustomer ? emailsFor(activeCustomer) : [];

  function openDetails(customerCode: string) {
    setActiveCustomer(customerCode);
    setEditing(false);
    setValidationError("");
    save.reset();
  }

  function saveDraft() {
    const emails = draft.split(/[\n,;]+/).map(value => value.trim()).filter(Boolean);
    if (emails.some(email => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      setValidationError("Enter valid email addresses, one per line.");
      return;
    }
    if (new Set(emails.map(email => email.toLowerCase())).size !== emails.length) {
      setValidationError("Remove duplicate email addresses.");
      return;
    }
    setValidationError("");
    save.mutate(emails);
  }

  return (
    <section className="space-y-3" aria-label="Auto-Mailer Email IDs">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><Mail className="h-4 w-4 text-muted-foreground" />Auto-Mailer Email IDs</h3>
        <div className="flex gap-1" aria-label="Auto-mailer data view">
          <Button size="sm" className="h-7 text-xs" variant={showSample ? "outline" : "secondary"} onClick={() => { setShowSample(false); setActiveCustomer(null); }}>Current chain</Button>
          <Button size="sm" className="h-7 text-xs" variant={showSample ? "secondary" : "outline"} onClick={() => { setShowSample(true); setActiveCustomer(null); }}>Sample output</Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Select a mailer category to see customer-level counts. View opens the full list of email IDs.</p>
      {showSample && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          Sample output only — these customer codes and example.invalid email IDs are illustrative, not records for {customerChain}.
        </p>
      )}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Mailer category">
        {categories.map(item => (
          <Button key={item.id} size="sm" variant={category === item.id ? "default" : "outline"}
            aria-pressed={category === item.id}
            onClick={() => { setCategory(item.id); setActiveCustomer(null); }}
            className="h-8 text-xs">
            {item.label}
          </Button>
        ))}
      </div>
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="text-xs font-semibold">Customer Code</TableHead>
              <TableHead className="text-xs font-semibold w-36">Email Count</TableHead>
              <TableHead className="text-xs font-semibold w-36">View Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!showSample && (mappingsError || isError) ? (
              <TableRow><TableCell colSpan={3} className="h-20 text-center text-xs text-destructive">Could not load auto-mailer data.</TableCell></TableRow>
            ) : !showSample && (mappingsLoading || isLoading) ? (
              <TableRow><TableCell colSpan={3} className="h-20 text-center text-xs text-muted-foreground">Loading auto-mailer data…</TableCell></TableRow>
            ) : customers.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="h-20 text-center text-xs text-muted-foreground">No customers mapped to this chain.</TableCell></TableRow>
            ) : customers.map(customerCode => (
              <TableRow key={customerCode}>
                <TableCell className="text-xs font-mono">{customerCode}</TableCell>
                <TableCell className="text-xs">{emailsFor(customerCode).length}</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openDetails(customerCode)} aria-label={`View ${category} emails for ${customerCode}`}>View</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Sheet open={activeCustomer !== null} onOpenChange={open => { if (!open) { setActiveCustomer(null); setEditing(false); } }}>
        <SheetContent className="flex flex-col w-full sm:max-w-md">
          <SheetHeader className="text-left pr-5">
            <SheetTitle>{categories.find(item => item.id === category)?.label}</SheetTitle>
            <SheetDescription>
              Customer <span className="font-mono">{activeCustomer}</span> · {activeEmails.length} email {activeEmails.length === 1 ? "ID" : "IDs"}
              {showSample ? " · Sample only" : ""}
            </SheetDescription>
          </SheetHeader>
          {editing ? (
            <div className="space-y-3 min-h-0 flex-1 overflow-y-auto pt-4">
              <label htmlFor="auto-mailer-emails" className="text-sm font-medium">Email IDs</label>
              <p className="text-xs text-muted-foreground">One address per line. Remove all addresses and save to clear this category.</p>
              <Textarea id="auto-mailer-emails" className="min-h-[220px] font-mono text-sm" value={draft} onChange={event => setDraft(event.target.value)} placeholder="name@example.com" />
              {(validationError || save.error) && <p role="alert" className="text-xs text-destructive">{validationError || save.error?.message}</p>}
              <div className="flex gap-2">
                <Button size="sm" onClick={saveDraft} disabled={save.isPending}><Save className="h-3.5 w-3.5 mr-1.5" />{save.isPending ? "Saving…" : "Save addresses"}</Button>
                <Button variant="outline" size="sm" onClick={() => { setEditing(false); setValidationError(""); save.reset(); }} disabled={save.isPending}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col min-h-0 flex-1 pt-4">
              {!showSample && (
                <Button variant="outline" size="sm" className="self-start mb-4" onClick={() => { setDraft(activeEmails.join("\n")); setEditing(true); }}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />Edit email IDs
                </Button>
              )}
              <div className="overflow-y-auto min-h-0 space-y-2">
                {activeEmails.length === 0 ? (
                  <p className="text-sm text-muted-foreground border rounded-md p-4">No email IDs configured for this customer and category.</p>
                ) : activeEmails.map((email, index) => (
                  <div key={`${email}-${index}`} className="flex items-start gap-3 rounded-md border px-3 py-2.5 text-sm">
                    <span className="text-muted-foreground w-6 shrink-0">{index + 1}.</span>
                    <span className="break-all select-text">{email}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}