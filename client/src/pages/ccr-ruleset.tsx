import React, { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Pencil, Paperclip, Grid3X3, Users } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CcrAccount {
  id: string;
  accountName: string;
  ccrAction: string;
  sbmListingBased: string;
  pixelRequired: string;
  contentRequired: string;
  customerUpdateTimeline: string | null;
  isActive: boolean;
  createdAt: string | null;
}

export interface CcrRule {
  id: string;
  accountId: string;
  changeType: string;
  eanScenario: string;
  newCicRequired: string;
  contentUpdateRequired: string;
  rundown: string;
  newPoRequired: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface StatusUpdatePayload {
  status: "Active" | "Inactive";
  attachmentFilename: string;
  attachmentUrl?: string;
  changedByUserId: string;
  notes?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CCR_CHANGE_TYPES = [
  "CP callout on FOP",
  "Grammage change",
  "Pricing change <10%",
  "Pricing change >10%",
  "Artwork change",
  "Packaging change",
  "Formulation change",
  "New launch",
  "Relaunch – Artwork and Packaging",
  "Brand extension",
  "No EAN Change",
];

const CCR_ACTION_COLOR: Record<string, string> = {
  National: "bg-blue-100 text-blue-800",
  Regional: "bg-green-100 text-green-800",
};

const SBM_COLOR: Record<string, string> = {
  "Listing Based": "bg-purple-100 text-purple-800",
  "SBM": "bg-amber-100 text-amber-800",
  "Non-Listing": "bg-gray-100 text-gray-800",
};

function YNBadge({ value, title }: { value: string; title?: string }) {
  if (!value || value === "N")
    return <span title={title} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">N</span>;
  return <span title={title} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700 font-semibold">{value}</span>;
}

function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge variant="default" className="bg-emerald-600 text-xs">Active</Badge>
  ) : (
    <Badge variant="secondary" className="text-xs">Inactive</Badge>
  );
}

// ── Shared attachment field ───────────────────────────────────────────────────

function AttachmentField({ file, fileRef, testId, onChange }: {
  file: File | null;
  fileRef: React.RefObject<HTMLInputElement>;
  testId: string;
  onChange: (f: File | null) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>Approved Email Attachment <span className="text-destructive">*</span></Label>
      <div
        className={`flex items-center gap-3 rounded-md border px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors ${file ? "border-emerald-400 bg-emerald-50" : "border-dashed"}`}
        onClick={() => fileRef.current?.click()}
      >
        <Paperclip className={`h-4 w-4 shrink-0 ${file ? "text-emerald-600" : "text-muted-foreground"}`} />
        <span className={`text-sm truncate ${file ? "text-emerald-700 font-medium" : "text-muted-foreground"}`}>
          {file ? file.name : "Click to attach approved email (PDF/EML/MSG)"}
        </span>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.eml,.msg,.png,.jpg,.jpeg"
        data-testid={testId}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap" }}
        tabIndex={-1}
      />
      {!file && <p className="text-xs text-amber-600">Attachment is mandatory — submit blocked without it.</p>}
    </div>
  );
}

// ── Add/Edit CCR Account Dialog ───────────────────────────────────────────────

interface AddEditCcrAccountDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  actingUserId: string;
  existing?: CcrAccount | null;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}

function AddEditCcrAccountDialog({ open, onOpenChange, actingUserId, existing, onSubmit }: AddEditCcrAccountDialogProps) {
  const blank = () => ({
    accountName: existing?.accountName ?? "",
    ccrAction: existing?.ccrAction ?? "National",
    sbmListingBased: existing?.sbmListingBased ?? "Listing Based",
    pixelRequired: existing?.pixelRequired ?? "N",
    contentRequired: existing?.contentRequired ?? "N",
    customerUpdateTimeline: existing?.customerUpdateTimeline ?? "",
    isActive: existing?.isActive ?? true,
  });
  const [form, setForm] = useState(blank());
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setForm(blank());
      setFile(null);
      setNotes("");
      setSaving(false);
    }
  }, [open, existing]);

  const canSave = form.accountName.trim().length > 0 && !!file && !saving;
  const isEdit = !!existing;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        accountName: form.accountName.trim(),
        customerUpdateTimeline: form.customerUpdateTimeline.trim() || null,
        attachmentFilename: file!.name,
        attachmentUrl: `upload://${file!.name}`,
        changedByUserId: actingUserId,
        notes: notes.trim() || undefined,
      });
      onOpenChange(false);
    } catch {
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {isEdit ? "Edit Account" : "Add CCR Account"}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? `Update details for ${existing?.accountName}.` : "Enter details for the new customer account. An approved-email attachment is required."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="ccra-name">Account Name <span className="text-destructive">*</span></Label>
            <Input id="ccra-name" placeholder="e.g. BIGBASKET" value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} data-testid="input-ccr-account-name" disabled={isEdit} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ccra-action">CCR Action <span className="text-destructive">*</span></Label>
              <Select value={form.ccrAction} onValueChange={(v) => setForm({ ...form, ccrAction: v })}>
                <SelectTrigger id="ccra-action" data-testid="select-ccr-action"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="National">National</SelectItem>
                  <SelectItem value="Regional">Regional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ccra-sbm">SBM / Listing Based <span className="text-destructive">*</span></Label>
              <Select value={form.sbmListingBased} onValueChange={(v) => setForm({ ...form, sbmListingBased: v })}>
                <SelectTrigger id="ccra-sbm" data-testid="select-ccr-sbm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SBM">SBM</SelectItem>
                  <SelectItem value="Listing Based">Listing Based</SelectItem>
                  <SelectItem value="Non-Listing">Non-Listing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ccra-pixel">Pixel Required</Label>
              <Select value={form.pixelRequired} onValueChange={(v) => setForm({ ...form, pixelRequired: v })}>
                <SelectTrigger id="ccra-pixel" data-testid="select-ccr-pixel"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Y">Y</SelectItem>
                  <SelectItem value="N">N</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ccra-content">Content Required</Label>
              <Select value={form.contentRequired} onValueChange={(v) => setForm({ ...form, contentRequired: v })}>
                <SelectTrigger id="ccra-content" data-testid="select-ccr-content"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Y">Y</SelectItem>
                  <SelectItem value="N">N</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ccra-timeline">Customer Update Timeline</Label>
              <Input id="ccra-timeline" placeholder="e.g. 4 weeks" value={form.customerUpdateTimeline} onChange={(e) => setForm({ ...form, customerUpdateTimeline: e.target.value })} data-testid="input-ccr-timeline" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ccra-status">Status</Label>
              <Select value={form.isActive ? "Active" : "Inactive"} onValueChange={(v) => setForm({ ...form, isActive: v === "Active" })}>
                <SelectTrigger id="ccra-status" data-testid="select-ccr-account-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ccra-notes">Notes (optional)</Label>
            <Textarea id="ccra-notes" placeholder="Reason for change…" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} data-testid="input-ccr-account-notes" />
          </div>
          <AttachmentField file={file} fileRef={fileRef} testId="input-ccr-account-attachment" onChange={setFile} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={!canSave} data-testid="button-save-ccr-account">
            {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            {isEdit ? "Save Changes" : "Add Account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Status Change Dialog ──────────────────────────────────────────────────────

function StatusChangeDialog({
  open, onOpenChange, entityName, currentStatus, actingUserId, onConfirm,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; entityName: string;
  currentStatus: boolean; actingUserId: string;
  onConfirm: (p: StatusUpdatePayload) => Promise<void>;
}) {
  const [status, setStatus] = useState<"Active" | "Inactive">(currentStatus ? "Active" : "Inactive");
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setStatus(currentStatus ? "Active" : "Inactive");
      setFile(null);
      setNotes("");
      setSaving(false);
    }
  }, [open, currentStatus]);

  const canSave = !!file && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      await onConfirm({ status, attachmentFilename: file!.name, attachmentUrl: `upload://${file!.name}`, changedByUserId: actingUserId, notes: notes.trim() || undefined });
      onOpenChange(false);
    } catch {
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Change Status — {entityName}</DialogTitle>
          <DialogDescription>An approved-email attachment is required.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Status <span className="text-destructive">*</span></Label>
            <Select value={status} onValueChange={(v) => setStatus(v as "Active" | "Inactive")}>
              <SelectTrigger data-testid="select-ccr-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AttachmentField file={file} fileRef={fileRef} testId="input-ccr-status-attachment" onChange={setFile} />
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea placeholder="Reason…" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} data-testid="input-ccr-status-notes" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={!canSave} data-testid="button-confirm-ccr-status">
            {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Save Status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Rule Dialog ──────────────────────────────────────────────────────────

function EditRuleDialog({
  open, onOpenChange, rule, accountName, actingUserId, onSubmit,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  rule: CcrRule | null; accountName: string; actingUserId: string;
  onSubmit: (ruleId: string, payload: Record<string, unknown>) => Promise<void>;
}) {
  const isNoEan = rule?.changeType === "No EAN Change";
  const [form, setForm] = useState({ newCicRequired: "N", contentUpdateRequired: "N", rundown: "N", newPoRequired: "N" });
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && rule) {
      setForm({
        newCicRequired: rule.newCicRequired,
        contentUpdateRequired: rule.contentUpdateRequired,
        rundown: rule.rundown,
        newPoRequired: rule.newPoRequired ?? "N",
      });
      setFile(null);
      setNotes("");
      setSaving(false);
    }
  }, [open, rule]);

  const canSave = !!file && !saving;
  const scenarioLabel = rule?.eanScenario === "with_ean" ? "With EAN" : rule?.eanScenario === "without_ean" ? "Without EAN" : "N/A";

  async function handleSave() {
    if (!canSave || !rule) return;
    setSaving(true);
    try {
      await onSubmit(rule.id, {
        newCicRequired: form.newCicRequired,
        contentUpdateRequired: form.contentUpdateRequired,
        rundown: form.rundown,
        newPoRequired: isNoEan ? form.newPoRequired : undefined,
        attachmentFilename: file!.name,
        attachmentUrl: `upload://${file!.name}`,
        changedByUserId: actingUserId,
        notes: notes.trim() || undefined,
      });
      onOpenChange(false);
    } catch {
    } finally {
      setSaving(false);
    }
  }

  if (!rule) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Pencil className="h-4 w-4" />Edit Rule</DialogTitle>
          <DialogDescription>
            <span className="font-medium">{accountName}</span> · {rule.changeType} · <span className="text-muted-foreground">{scenarioLabel}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>New CIC Required</Label>
              <Input value={form.newCicRequired} onChange={(e) => setForm({ ...form, newCicRequired: e.target.value })} placeholder="Y / N / Conditional" data-testid="input-rule-new-cic" />
            </div>
            <div className="space-y-1.5">
              <Label>Content Update</Label>
              <Input value={form.contentUpdateRequired} onChange={(e) => setForm({ ...form, contentUpdateRequired: e.target.value })} placeholder="Y / N" data-testid="input-rule-content-update" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Rundown</Label>
              <Input value={form.rundown} onChange={(e) => setForm({ ...form, rundown: e.target.value })} placeholder="Y / N" data-testid="input-rule-rundown" />
            </div>
            {isNoEan && (
              <div className="space-y-1.5">
                <Label>New PO Required</Label>
                <Input value={form.newPoRequired} onChange={(e) => setForm({ ...form, newPoRequired: e.target.value })} placeholder="Y / N" data-testid="input-rule-new-po" />
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea placeholder="Reason for change…" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} data-testid="input-rule-notes" />
          </div>
          <AttachmentField file={file} fileRef={fileRef} testId="input-rule-attachment" onChange={setFile} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={!canSave} data-testid="button-save-rule">
            {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Save Rule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Accounts Sub-tab ──────────────────────────────────────────────────────────

function AccountsTab({
  accounts, isAdmin, actingUserId,
  onAdd, onEdit, onUpdateStatus,
}: {
  accounts: CcrAccount[]; isAdmin: boolean; actingUserId: string;
  onAdd: () => void; onEdit: (a: CcrAccount) => void;
  onUpdateStatus: (id: string, payload: StatusUpdatePayload) => Promise<void>;
}) {
  const [statusTarget, setStatusTarget] = useState<CcrAccount | null>(null);

  if (!accounts.length) {
    return <p className="text-muted-foreground text-sm py-4">No accounts found.</p>;
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted-foreground">{accounts.length} account{accounts.length !== 1 ? "s" : ""}</p>
        {isAdmin && (
          <Button size="sm" onClick={onAdd} data-testid="button-add-ccr-account">
            <Plus className="h-4 w-4 mr-1.5" />Add Account
          </Button>
        )}
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead>CCR Action</TableHead>
              <TableHead>SBM / Listing</TableHead>
              <TableHead>Pixel Req</TableHead>
              <TableHead>Content Req</TableHead>
              <TableHead>Update Timeline</TableHead>
              <TableHead>Status</TableHead>
              {isAdmin && <TableHead className="w-20" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((a) => (
              <TableRow key={a.id} data-testid={`row-ccr-account-${a.id}`}>
                <TableCell className="font-medium">{a.accountName}</TableCell>
                <TableCell>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${CCR_ACTION_COLOR[a.ccrAction] ?? ""}`}>{a.ccrAction}</span>
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${SBM_COLOR[a.sbmListingBased] ?? ""}`}>{a.sbmListingBased}</span>
                </TableCell>
                <TableCell><YNBadge value={a.pixelRequired} /></TableCell>
                <TableCell><YNBadge value={a.contentRequired} /></TableCell>
                <TableCell className="text-sm text-muted-foreground">{a.customerUpdateTimeline ?? "—"}</TableCell>
                <TableCell>
                  <button
                    onClick={() => isAdmin && setStatusTarget(a)}
                    disabled={!isAdmin}
                    className={isAdmin ? "cursor-pointer hover:opacity-80 transition-opacity" : "cursor-default"}
                    data-testid={`button-status-ccr-account-${a.id}`}
                    title={isAdmin ? "Click to change status" : undefined}
                  >
                    <ActiveBadge active={a.isActive} />
                  </button>
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit Account" data-testid={`button-edit-ccr-account-${a.id}`} onClick={() => onEdit(a)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {statusTarget && (
        <StatusChangeDialog
          open={!!statusTarget}
          onOpenChange={(v) => { if (!v) setStatusTarget(null); }}
          entityName={statusTarget.accountName}
          currentStatus={statusTarget.isActive}
          actingUserId={actingUserId}
          onConfirm={async (p) => {
            await onUpdateStatus(statusTarget.id, p);
            setStatusTarget(null);
          }}
        />
      )}
    </>
  );
}

// ── Rules Matrix Sub-tab ──────────────────────────────────────────────────────

function RulesMatrixTab({
  accounts, rules, isAdmin, actingUserId, onEditRule,
}: {
  accounts: CcrAccount[]; rules: CcrRule[]; isAdmin: boolean; actingUserId: string;
  onEditRule: (rule: CcrRule) => void;
}) {
  const activeAccounts = accounts.filter((a) => a.isActive);

  const ruleMap = new Map<string, CcrRule>();
  for (const r of rules) {
    ruleMap.set(`${r.accountId}::${r.changeType}::${r.eanScenario}`, r);
  }

  function getRule(accountId: string, changeType: string, scenario: string): CcrRule | undefined {
    return ruleMap.get(`${accountId}::${changeType}::${scenario}`);
  }

  function CellContent({ rule }: { rule: CcrRule | undefined }) {
    if (!rule) return <span className="text-muted-foreground text-xs">—</span>;
    const isNoEan = rule.changeType === "No EAN Change";
    return (
      <div className="flex flex-col gap-0.5 text-xs min-w-[56px] items-center">
        <YNBadge value={rule.newCicRequired} title="New CIC Required" />
        <YNBadge value={rule.contentUpdateRequired} title="Content Update" />
        <YNBadge value={rule.rundown} title="Rundown" />
        {isNoEan && <YNBadge value={rule.newPoRequired ?? "N"} title="New PO Required" />}
      </div>
    );
  }

  const rows: Array<{ changeType: string; scenario: string; label: string }> = [];
  for (const ct of CCR_CHANGE_TYPES) {
    if (ct === "No EAN Change") {
      rows.push({ changeType: ct, scenario: "na", label: "N/A" });
    } else {
      rows.push({ changeType: ct, scenario: "with_ean", label: "W/ EAN" });
      rows.push({ changeType: ct, scenario: "without_ean", label: "W/O EAN" });
    }
  }

  if (!activeAccounts.length) {
    return <p className="text-muted-foreground text-sm py-4">No active accounts to display.</p>;
  }

  return (
    <div className="overflow-auto max-h-[620px] rounded-md border">
      <table className="text-xs border-collapse" style={{ minWidth: `${200 + activeAccounts.length * 90}px` }}>
        <thead className="sticky top-0 z-20 bg-background">
          <tr>
            <th className="sticky left-0 z-30 bg-muted/90 border border-muted-foreground/20 px-3 py-2 text-left font-semibold text-sm min-w-[160px]">Change Type</th>
            <th className="sticky left-[160px] z-30 bg-muted/90 border border-muted-foreground/20 px-2 py-2 text-center font-semibold min-w-[60px]">Scenario</th>
            {activeAccounts.map((a) => (
              <th key={a.id} className="border border-muted-foreground/20 px-2 py-2 text-center font-semibold max-w-[90px] truncate bg-muted/70" title={a.accountName}>
                <span className="block max-w-[80px] truncate">{a.accountName}</span>
              </th>
            ))}
          </tr>
          <tr className="bg-muted/50">
            <th className="sticky left-0 z-30 bg-muted/50 border border-muted-foreground/20 px-3 py-1 text-[10px] text-muted-foreground" />
            <th className="sticky left-[160px] z-30 bg-muted/50 border border-muted-foreground/20 px-2 py-1 text-[10px] text-center text-muted-foreground" />
            {activeAccounts.map((a) => (
              <th key={a.id} className="border border-muted-foreground/20 px-1 py-1 text-[10px] text-center text-muted-foreground bg-muted/50">
                <div className="flex flex-col items-center gap-0.5">
                  <span className={`px-1 py-0.5 rounded ${CCR_ACTION_COLOR[a.ccrAction] ?? ""}`}>{a.ccrAction.slice(0, 3)}</span>
                  <span>{a.sbmListingBased === "Listing Based" ? "List" : a.sbmListingBased === "SBM" ? "SBM" : "Non-L"}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const isFirstOfType = row.scenario === "with_ean" || row.changeType === "No EAN Change";
            return (
              <tr key={`${row.changeType}::${row.scenario}`} className={idx % 4 < 2 ? "bg-white" : "bg-slate-50/60"}>
                {isFirstOfType ? (
                  <td
                    rowSpan={row.changeType === "No EAN Change" ? 1 : 2}
                    className="sticky left-0 z-10 bg-inherit border border-muted-foreground/20 px-3 py-2 font-medium align-middle"
                    style={{ minWidth: 160 }}
                  >
                    {row.changeType}
                  </td>
                ) : null}
                <td className="sticky left-[160px] z-10 bg-inherit border border-muted-foreground/20 px-2 py-2 text-center text-muted-foreground">
                  {row.label}
                </td>
                {activeAccounts.map((a) => {
                  const rule = getRule(a.id, row.changeType, row.scenario);
                  return (
                    <td
                      key={a.id}
                      className={`border border-muted-foreground/20 px-2 py-1.5 text-center ${isAdmin && rule ? "cursor-pointer hover:bg-blue-50/60 transition-colors" : ""}`}
                      onClick={() => { if (isAdmin && rule) onEditRule(rule); }}
                      data-testid={`cell-rule-${a.id}-${row.changeType}-${row.scenario}`}
                    >
                      <CellContent rule={rule} />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="border-t px-4 py-2 bg-muted/30 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        <span className="font-medium">Per cell (top→bottom):</span>
        <span>New CIC · Content Update · Rundown</span>
        <span className="text-muted-foreground/60">· New PO (No EAN Change only)</span>
        {isAdmin && <span className="ml-auto text-blue-600">Click a cell to edit rule values</span>}
      </div>
    </div>
  );
}

// ── Main CCR Ruleset Content ──────────────────────────────────────────────────

interface CcrRulesetContentProps {
  isAdmin: boolean;
  actingUserId: string;
}

export function CcrRulesetContent({ isAdmin, actingUserId }: CcrRulesetContentProps) {
  const { toast } = useToast();

  const { data: accounts = [], isLoading: acctLoading } = useQuery<CcrAccount[]>({
    queryKey: ["/api/reference-data/ccr-accounts"],
    staleTime: 0,
  });
  const { data: rules = [], isLoading: rulesLoading } = useQuery<CcrRule[]>({
    queryKey: ["/api/reference-data/ccr-rules"],
    staleTime: 0,
  });

  const createAccount = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/reference-data/ccr-accounts", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reference-data/ccr-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reference-data/audit-log"] });
    },
    onError: (e: Error) => toast({ title: "Failed to create account", description: e.message, variant: "destructive" }),
  });

  const updateAccount = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/reference-data/ccr-accounts/${id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reference-data/ccr-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reference-data/audit-log"] });
    },
    onError: (e: Error) => toast({ title: "Failed to update account", description: e.message, variant: "destructive" }),
  });

  const updateAccountStatus = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: StatusUpdatePayload }) => {
      await apiRequest("PATCH", `/api/reference-data/ccr-accounts/${id}/status`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reference-data/ccr-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reference-data/audit-log"] });
    },
    onError: (e: Error) => toast({ title: "Failed to update status", description: e.message, variant: "destructive" }),
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/reference-data/ccr-rules/${id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reference-data/ccr-rules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reference-data/audit-log"] });
    },
    onError: (e: Error) => toast({ title: "Failed to update rule", description: e.message, variant: "destructive" }),
  });

  const [addOpen, setAddOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<CcrAccount | null>(null);
  const [editRule, setEditRule] = useState<CcrRule | null>(null);

  async function handleAddAccount(payload: Record<string, unknown>) {
    await createAccount.mutateAsync(payload);
    toast({ title: "Account Added", description: `${payload.accountName} has been created.` });
  }

  async function handleEditAccount(payload: Record<string, unknown>) {
    if (!editAccount) return;
    await updateAccount.mutateAsync({ id: editAccount.id, payload });
    toast({ title: "Account Updated" });
    setEditAccount(null);
  }

  async function handleAccountStatus(id: string, payload: StatusUpdatePayload) {
    await updateAccountStatus.mutateAsync({ id, payload });
    toast({ title: "Status Updated", description: `Status set to ${payload.status}.` });
  }

  async function handleEditRule(ruleId: string, payload: Record<string, unknown>) {
    await updateRule.mutateAsync({ id: ruleId, payload });
    toast({ title: "Rule Updated" });
    setEditRule(null);
  }

  const editRuleAccount = editRule ? accounts.find((a) => a.id === editRule.accountId) : null;
  const isLoading = acctLoading || rulesLoading;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-br from-[#1f36c7] to-[#00b0d7] p-2 rounded-md">
          <Grid3X3 className="h-4 w-4 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">CCR Ruleset</h3>
          <p className="text-xs text-muted-foreground">Customer Change Request rules — per-account action requirements for each change type</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : (
        <Tabs defaultValue="accounts">
          <TabsList>
            <TabsTrigger value="accounts"><Users className="h-4 w-4 mr-1.5" />Accounts ({accounts.length})</TabsTrigger>
            <TabsTrigger value="matrix"><Grid3X3 className="h-4 w-4 mr-1.5" />Rules Matrix</TabsTrigger>
          </TabsList>

          <TabsContent value="accounts" className="mt-4">
            <AccountsTab
              accounts={accounts}
              isAdmin={isAdmin}
              actingUserId={actingUserId}
              onAdd={() => setAddOpen(true)}
              onEdit={(a) => setEditAccount(a)}
              onUpdateStatus={handleAccountStatus}
            />
          </TabsContent>

          <TabsContent value="matrix" className="mt-4">
            <RulesMatrixTab
              accounts={accounts}
              rules={rules}
              isAdmin={isAdmin}
              actingUserId={actingUserId}
              onEditRule={(r) => setEditRule(r)}
            />
          </TabsContent>
        </Tabs>
      )}

      <AddEditCcrAccountDialog
        open={addOpen || !!editAccount}
        onOpenChange={(v) => { if (!v) { setAddOpen(false); setEditAccount(null); } }}
        actingUserId={actingUserId}
        existing={editAccount ?? null}
        onSubmit={editAccount ? handleEditAccount : handleAddAccount}
      />

      <EditRuleDialog
        open={!!editRule}
        onOpenChange={(v) => { if (!v) setEditRule(null); }}
        rule={editRule}
        accountName={editRuleAccount?.accountName ?? ""}
        actingUserId={actingUserId}
        onSubmit={handleEditRule}
      />
    </div>
  );
}
