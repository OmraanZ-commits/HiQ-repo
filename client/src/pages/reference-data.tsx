import React, { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  useReferenceData,
  type ChannelMaster,
  type ClusterMaster,
  type DepotMaster,
  type NetworkChangeTypeMaster,
  type RefDataAuditEntry,
  type StatusUpdatePayload,
  type CreateChannelPayload,
  type CreateClusterPayload,
  type CreateDepotPayload,
  type CreateNetworkChangeTypePayload,
} from "@/controllers/useReferenceData";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Database,
  RefreshCw,
  Radio,
  MapPin,
  Warehouse,
  CheckCircle2,
  XCircle,
  Loader2,
  GitBranch,
  Pencil,
  Paperclip,
  Shield,
  ClipboardList,
  User,
  Plus,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PortalUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge variant="default" className="bg-emerald-600 text-xs">Active</Badge>
  ) : (
    <Badge variant="secondary" className="text-xs">Inactive</Badge>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
    </div>
  );
}

function SummaryCard({
  icon, title, count, loading,
}: { icon: React.ReactNode; title: string; count: number; loading: boolean }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="bg-muted rounded-md p-3">{icon}</div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          {loading ? <Skeleton className="h-7 w-10 mt-1" /> : <p className="text-2xl font-bold">{count}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Status-change dialog ───────────────────────────────────────────────────────

interface StatusChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityLabel: string;
  entityCode: string;
  currentStatus: boolean;
  actingUserId: string;
  onConfirm: (payload: StatusUpdatePayload) => Promise<void>;
}

function StatusChangeDialog({
  open, onOpenChange, entityLabel, entityCode, currentStatus, actingUserId, onConfirm,
}: StatusChangeDialogProps) {
  const [status, setStatus] = useState<"Active" | "Inactive">(currentStatus ? "Active" : "Inactive");
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setStatus(currentStatus ? "Active" : "Inactive");
      setFile(null);
      setNotes("");
      setSubmitting(false);
    }
  }, [open, currentStatus]);

  const canSubmit = !!file && !!status && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onConfirm({
        status,
        attachmentFilename: file!.name,
        attachmentUrl: `upload://${file!.name}`,
        changedByUserId: actingUserId,
        notes: notes.trim() || undefined,
      });
      onOpenChange(false);
    } catch {
      // Error toasted by mutation's onError; keep dialog open for retry
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            Change Status — {entityLabel}
          </DialogTitle>
          <DialogDescription>
            Update status for <span className="font-mono font-medium">{entityCode}</span>.
            An approved-email attachment is required.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="rd-status">Status <span className="text-destructive">*</span></Label>
            <Select value={status} onValueChange={(v) => setStatus(v as "Active" | "Inactive")}>
              <SelectTrigger id="rd-status" data-testid="select-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
              data-testid="input-attachment"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap" }}
              tabIndex={-1}
            />
            {!file && <p className="text-xs text-amber-600">Attachment is mandatory — submit blocked without it.</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rd-notes">Notes (optional)</Label>
            <Textarea id="rd-notes" placeholder="Reason for status change…" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} data-testid="input-notes" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit} data-testid="button-submit-status">
            {submitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Save Status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Status row button ─────────────────────────────────────────────────────

interface EditStatusButtonProps {
  entityId: string;
  entityLabel: string;
  entityCode: string;
  currentStatus: boolean;
  isAdmin: boolean;
  actingUserId: string;
  onUpdateStatus: (id: string, payload: StatusUpdatePayload) => Promise<void>;
}

function EditStatusButton({ entityId, entityLabel, entityCode, currentStatus, isAdmin, actingUserId, onUpdateStatus }: EditStatusButtonProps) {
  const [open, setOpen] = useState(false);
  if (!isAdmin) return null;
  return (
    <>
      <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit Status" data-testid={`button-edit-status-${entityId}`} onClick={() => setOpen(true)}>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <StatusChangeDialog
        open={open}
        onOpenChange={setOpen}
        entityLabel={entityLabel}
        entityCode={entityCode}
        currentStatus={currentStatus}
        actingUserId={actingUserId}
        onConfirm={(payload) => onUpdateStatus(entityId, payload)}
      />
    </>
  );
}

// ── Add Channel dialog ────────────────────────────────────────────────────────

interface AddChannelDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  channels: ChannelMaster[];
  onSubmit: (payload: CreateChannelPayload) => Promise<void>;
}

function AddChannelDialog({ open, onOpenChange, channels, onSubmit }: AddChannelDialogProps) {
  const blank = () => ({ code: "", name: "", type: "", parentCode: "", isActive: true } as const);
  const [form, setForm] = useState<{ code: string; name: string; type: string; parentCode: string; isActive: boolean }>(blank);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setForm(blank()); setSaving(false); } }, [open]);

  const canSave = form.code.trim().length > 0 && form.type.length > 0 && !saving;

  const topLevelChannels = channels.filter((c) => !c.parentCode);

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSubmit({
        code: form.code.trim().toUpperCase(),
        name: form.name.trim() || undefined,
        type: form.type,
        parentCode: form.parentCode || undefined,
        isActive: form.isActive,
      });
      onOpenChange(false);
    } catch {
      // error toasted by mutation
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Plus className="h-4 w-4" />Add Channel</DialogTitle>
          <DialogDescription>Enter the details for the new channel record.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ch-code">Code <span className="text-destructive">*</span></Label>
              <Input id="ch-code" placeholder="e.g. GT" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} data-testid="input-channel-code" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ch-name">Name</Label>
              <Input id="ch-name" placeholder="Channel name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="input-channel-name" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ch-type">Type <span className="text-destructive">*</span></Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger id="ch-type" data-testid="select-channel-type">
                <SelectValue placeholder="Select type…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Core">Core</SelectItem>
                <SelectItem value="Traditional">Traditional</SelectItem>
                <SelectItem value="Modern Trade">Modern Trade</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ch-parent">Parent Channel (optional)</Label>
            <Select value={form.parentCode || "__none__"} onValueChange={(v) => setForm({ ...form, parentCode: v === "__none__" ? "" : v })}>
              <SelectTrigger id="ch-parent" data-testid="select-channel-parent">
                <SelectValue placeholder="None (top-level)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None (top-level)</SelectItem>
                {topLevelChannels.map((c) => (
                  <SelectItem key={c.id} value={c.code}>{c.code}{c.name ? ` — ${c.name}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ch-status">Status <span className="text-destructive">*</span></Label>
            <Select value={form.isActive ? "Active" : "Inactive"} onValueChange={(v) => setForm({ ...form, isActive: v === "Active" })}>
              <SelectTrigger id="ch-status" data-testid="select-channel-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={!canSave} data-testid="button-add-channel-save">
            {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Add Channel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Add Cluster dialog ────────────────────────────────────────────────────────

interface AddClusterDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (payload: CreateClusterPayload) => Promise<void>;
}

function AddClusterDialog({ open, onOpenChange, onSubmit }: AddClusterDialogProps) {
  const blank = () => ({ name: "", region: "", depotCount: "", stateIds: "", isActive: true });
  const [form, setForm] = useState(blank());
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setForm(blank()); setSaving(false); } }, [open]);

  const canSave = form.name.trim().length > 0 && form.region.length > 0 && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const stateList = form.stateIds.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
      await onSubmit({
        name: form.name.trim(),
        region: form.region,
        depotCount: form.depotCount ? parseInt(form.depotCount) : undefined,
        stateIds: stateList.length ? stateList : undefined,
        isActive: form.isActive,
      });
      onOpenChange(false);
    } catch {
      // error toasted
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Plus className="h-4 w-4" />Add Cluster</DialogTitle>
          <DialogDescription>Enter the details for the new cluster record.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="cl-name">Name <span className="text-destructive">*</span></Label>
            <Input id="cl-name" placeholder="e.g. Maharashtra West" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="input-cluster-name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cl-region">Region <span className="text-destructive">*</span></Label>
            <Select value={form.region} onValueChange={(v) => setForm({ ...form, region: v })}>
              <SelectTrigger id="cl-region" data-testid="select-cluster-region">
                <SelectValue placeholder="Select region…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="South">South</SelectItem>
                <SelectItem value="West">West</SelectItem>
                <SelectItem value="North">North</SelectItem>
                <SelectItem value="East">East</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cl-depot-count">Depot Count</Label>
              <Input id="cl-depot-count" type="number" min={0} placeholder="0" value={form.depotCount} onChange={(e) => setForm({ ...form, depotCount: e.target.value })} data-testid="input-cluster-depot-count" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cl-status">Status <span className="text-destructive">*</span></Label>
              <Select value={form.isActive ? "Active" : "Inactive"} onValueChange={(v) => setForm({ ...form, isActive: v === "Active" })}>
                <SelectTrigger id="cl-status" data-testid="select-cluster-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cl-states">State IDs (comma-separated)</Label>
            <Input id="cl-states" placeholder="e.g. MH, GJ, RJ" value={form.stateIds} onChange={(e) => setForm({ ...form, stateIds: e.target.value })} data-testid="input-cluster-states" />
            <p className="text-xs text-muted-foreground">Enter state abbreviations separated by commas</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={!canSave} data-testid="button-add-cluster-save">
            {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Add Cluster
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Add Depot dialog ──────────────────────────────────────────────────────────

interface AddDepotDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clusters: ClusterMaster[];
  onSubmit: (payload: CreateDepotPayload) => Promise<void>;
}

function AddDepotDialog({ open, onOpenChange, clusters, onSubmit }: AddDepotDialogProps) {
  const blank = () => ({ code: "", name: "", clusterId: "", isActive: true });
  const [form, setForm] = useState(blank());
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setForm(blank()); setSaving(false); } }, [open]);

  const canSave = form.code.trim().length > 0 && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSubmit({
        code: form.code.trim().toUpperCase(),
        name: form.name.trim() || undefined,
        clusterId: form.clusterId || undefined,
        isActive: form.isActive,
      });
      onOpenChange(false);
    } catch {
      // error toasted
    } finally {
      setSaving(false);
    }
  }

  const activeCluster = clusters.filter((c) => c.isActive);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Plus className="h-4 w-4" />Add Depot</DialogTitle>
          <DialogDescription>Enter the details for the new depot record.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="dp-code">Code <span className="text-destructive">*</span></Label>
              <Input id="dp-code" placeholder="e.g. MUM" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} data-testid="input-depot-code" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dp-name">Name</Label>
              <Input id="dp-name" placeholder="Depot name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="input-depot-name" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dp-cluster">Cluster (optional)</Label>
            <Select value={form.clusterId || "__none__"} onValueChange={(v) => setForm({ ...form, clusterId: v === "__none__" ? "" : v })}>
              <SelectTrigger id="dp-cluster" data-testid="select-depot-cluster">
                <SelectValue placeholder="No cluster" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No cluster</SelectItem>
                {activeCluster.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name} ({c.region})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dp-status">Status <span className="text-destructive">*</span></Label>
            <Select value={form.isActive ? "Active" : "Inactive"} onValueChange={(v) => setForm({ ...form, isActive: v === "Active" })}>
              <SelectTrigger id="dp-status" data-testid="select-depot-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={!canSave} data-testid="button-add-depot-save">
            {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Add Depot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Add Network Change Type dialog ────────────────────────────────────────────

interface AddNetworkChangeTypeDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (payload: CreateNetworkChangeTypePayload) => Promise<void>;
}

function AddNetworkChangeTypeDialog({ open, onOpenChange, onSubmit }: AddNetworkChangeTypeDialogProps) {
  const blank = () => ({ code: "", name: "", category: "", isActive: true });
  const [form, setForm] = useState(blank());
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setForm(blank()); setSaving(false); } }, [open]);

  const canSave = form.code.trim().length > 0 && form.name.trim().length > 0 && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSubmit({
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        category: form.category || undefined,
        isActive: form.isActive,
      });
      onOpenChange(false);
    } catch {
      // error toasted
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Plus className="h-4 w-4" />Add Network Change Type</DialogTitle>
          <DialogDescription>Enter the details for the new network change type record.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="nct-code">Code <span className="text-destructive">*</span></Label>
              <Input id="nct-code" placeholder="e.g. PROMO" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} data-testid="input-nct-code" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nct-status">Status <span className="text-destructive">*</span></Label>
              <Select value={form.isActive ? "Active" : "Inactive"} onValueChange={(v) => setForm({ ...form, isActive: v === "Active" })}>
                <SelectTrigger id="nct-status" data-testid="select-nct-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nct-name">Name <span className="text-destructive">*</span></Label>
            <Input id="nct-name" placeholder="e.g. Price Promotion" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="input-nct-name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nct-category">Category (optional)</Label>
            <Select value={form.category || "__none__"} onValueChange={(v) => setForm({ ...form, category: v === "__none__" ? "" : v })}>
              <SelectTrigger id="nct-category" data-testid="select-nct-category">
                <SelectValue placeholder="Select category…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No category</SelectItem>
                <SelectItem value="Promotion">Promotion</SelectItem>
                <SelectItem value="Relaunch">Relaunch</SelectItem>
                <SelectItem value="Launch">Launch</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={!canSave} data-testid="button-add-nct-save">
            {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Add Change Type
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Entity tables ─────────────────────────────────────────────────────────────

const CHANNEL_TYPE_COLOR: Record<string, string> = {
  Core: "bg-blue-100 text-blue-800",
  Traditional: "bg-amber-100 text-amber-800",
  "Modern Trade": "bg-purple-100 text-purple-800",
};

function ChannelsTable({
  data, isAdmin, actingUserId, onUpdateStatus, clusters,
}: {
  data: ChannelMaster[];
  isAdmin: boolean;
  actingUserId: string;
  onUpdateStatus: (id: string, payload: StatusUpdatePayload) => Promise<void>;
  clusters?: ClusterMaster[];
}) {
  if (!data.length) return <p className="text-muted-foreground text-sm py-4">No channels found.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Code</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Parent Channel</TableHead>
          <TableHead>Status</TableHead>
          {isAdmin && <TableHead className="w-12" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((ch) => (
          <TableRow key={ch.id} data-testid={`row-channel-${ch.id}`}>
            <TableCell className="font-mono font-medium">{ch.code}</TableCell>
            <TableCell>{ch.name ?? "—"}</TableCell>
            <TableCell>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${CHANNEL_TYPE_COLOR[ch.type] ?? ""}`}>{ch.type}</span>
            </TableCell>
            <TableCell>{ch.parentCode ?? "—"}</TableCell>
            <TableCell data-testid={`status-channel-${ch.id}`}><ActiveBadge active={ch.isActive} /></TableCell>
            {isAdmin && (
              <TableCell>
                <EditStatusButton entityId={ch.id} entityLabel="Channel" entityCode={ch.code} currentStatus={ch.isActive} isAdmin={isAdmin} actingUserId={actingUserId} onUpdateStatus={onUpdateStatus} />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

const CLUSTER_REGION_COLOR: Record<string, string> = {
  South: "bg-green-100 text-green-800",
  West: "bg-orange-100 text-orange-800",
  North: "bg-sky-100 text-sky-800",
  East: "bg-indigo-100 text-indigo-800",
};

function ClustersTable({
  data, isAdmin, actingUserId, onUpdateStatus,
}: {
  data: ClusterMaster[];
  isAdmin: boolean;
  actingUserId: string;
  onUpdateStatus: (id: string, payload: StatusUpdatePayload) => Promise<void>;
}) {
  if (!data.length) return <p className="text-muted-foreground text-sm py-4">No clusters found.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Region</TableHead>
          <TableHead>Depot Count</TableHead>
          <TableHead>States</TableHead>
          <TableHead>Status</TableHead>
          {isAdmin && <TableHead className="w-12" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((cl) => (
          <TableRow key={cl.id} data-testid={`row-cluster-${cl.id}`}>
            <TableCell className="font-medium">{cl.name}</TableCell>
            <TableCell>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${CLUSTER_REGION_COLOR[cl.region] ?? ""}`}>{cl.region}</span>
            </TableCell>
            <TableCell>{cl.depotCount ?? "—"}</TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {(cl.stateIds ?? []).slice(0, 3).map((s) => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}
                {(cl.stateIds ?? []).length > 3 && <Badge variant="outline" className="text-xs">+{cl.stateIds.length - 3}</Badge>}
              </div>
            </TableCell>
            <TableCell data-testid={`status-cluster-${cl.id}`}><ActiveBadge active={cl.isActive} /></TableCell>
            {isAdmin && (
              <TableCell>
                <EditStatusButton entityId={cl.id} entityLabel="Cluster" entityCode={cl.name} currentStatus={cl.isActive} isAdmin={isAdmin} actingUserId={actingUserId} onUpdateStatus={onUpdateStatus} />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function DepotsTable({
  data, isAdmin, actingUserId, onUpdateStatus, clusters,
}: {
  data: DepotMaster[];
  isAdmin: boolean;
  actingUserId: string;
  onUpdateStatus: (id: string, payload: StatusUpdatePayload) => Promise<void>;
  clusters: ClusterMaster[];
}) {
  const clusterMap = Object.fromEntries(clusters.map((c) => [c.id, c.name]));
  if (!data.length) return <p className="text-muted-foreground text-sm py-4">No depots found.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Code</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Cluster</TableHead>
          <TableHead>Status</TableHead>
          {isAdmin && <TableHead className="w-12" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((dp) => (
          <TableRow key={dp.id} data-testid={`row-depot-${dp.id}`}>
            <TableCell className="font-mono font-medium">{dp.code}</TableCell>
            <TableCell>{dp.name ?? "—"}</TableCell>
            <TableCell>{dp.clusterId ? (clusterMap[dp.clusterId] ?? dp.clusterId) : "—"}</TableCell>
            <TableCell data-testid={`status-depot-${dp.id}`}><ActiveBadge active={dp.isActive} /></TableCell>
            {isAdmin && (
              <TableCell>
                <EditStatusButton entityId={dp.id} entityLabel="Depot" entityCode={dp.code} currentStatus={dp.isActive} isAdmin={isAdmin} actingUserId={actingUserId} onUpdateStatus={onUpdateStatus} />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

const NCT_CATEGORY_COLOR: Record<string, string> = {
  Promotion: "bg-pink-100 text-pink-800",
  Relaunch: "bg-violet-100 text-violet-800",
  Launch: "bg-emerald-100 text-emerald-800",
  Other: "bg-gray-100 text-gray-800",
};

function NetworkChangeTypesTable({
  data, isAdmin, actingUserId, onUpdateStatus,
}: {
  data: NetworkChangeTypeMaster[];
  isAdmin: boolean;
  actingUserId: string;
  onUpdateStatus: (id: string, payload: StatusUpdatePayload) => Promise<void>;
}) {
  if (!data.length) return <p className="text-muted-foreground text-sm py-4">No network change types found.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Code</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Status</TableHead>
          {isAdmin && <TableHead className="w-12" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((nct) => (
          <TableRow key={nct.id} data-testid={`row-nct-${nct.id}`}>
            <TableCell className="font-mono font-medium">{nct.code}</TableCell>
            <TableCell>{nct.name}</TableCell>
            <TableCell>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${NCT_CATEGORY_COLOR[nct.category ?? ""] ?? NCT_CATEGORY_COLOR.Other}`}>
                {nct.category ?? "—"}
              </span>
            </TableCell>
            <TableCell data-testid={`status-nct-${nct.id}`}><ActiveBadge active={nct.isActive} /></TableCell>
            {isAdmin && (
              <TableCell>
                <EditStatusButton entityId={nct.id} entityLabel="Change Type" entityCode={nct.code} currentStatus={nct.isActive} isAdmin={isAdmin} actingUserId={actingUserId} onUpdateStatus={onUpdateStatus} />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ── Audit Log table ───────────────────────────────────────────────────────────

const ENTITY_TYPE_LABELS: Record<string, string> = {
  channel: "Channel",
  cluster: "Cluster",
  depot: "Depot",
  network_change_type: "Change Type",
};

function AuditLogTable({ data }: { data: RefDataAuditEntry[] }) {
  if (!data.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <ClipboardList className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">No audit entries yet. Status changes will appear here.</p>
      </div>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>When</TableHead>
          <TableHead>Entity</TableHead>
          <TableHead>Code / Name</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Old Status</TableHead>
          <TableHead>New Status</TableHead>
          <TableHead>Changed By</TableHead>
          <TableHead>Attachment</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((entry) => (
          <TableRow key={entry.id} data-testid={`row-audit-${entry.id}`}>
            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
              {entry.createdAt ? new Date(entry.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"}
            </TableCell>
            <TableCell><Badge variant="outline" className="text-xs">{ENTITY_TYPE_LABELS[entry.entityType] ?? entry.entityType}</Badge></TableCell>
            <TableCell className="font-mono text-xs font-medium">{entry.entityCode ?? "—"}</TableCell>
            <TableCell><span className="text-xs capitalize">{entry.action.replace(/_/g, " ")}</span></TableCell>
            <TableCell>{entry.oldStatus ? <ActiveBadge active={entry.oldStatus === "Active"} /> : <span className="text-muted-foreground text-xs">—</span>}</TableCell>
            <TableCell>{entry.newStatus ? <ActiveBadge active={entry.newStatus === "Active"} /> : <span className="text-muted-foreground text-xs">—</span>}</TableCell>
            <TableCell className="text-sm">{entry.changedByName}</TableCell>
            <TableCell>
              {entry.attachmentFilename ? (
                <div className="flex items-center gap-1 text-xs text-blue-600">
                  <Paperclip className="h-3 w-3 shrink-0" />
                  <span className="max-w-32 truncate" title={entry.attachmentFilename}>{entry.attachmentFilename}</span>
                </div>
              ) : <span className="text-muted-foreground text-xs">—</span>}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ReferenceDataPage() {
  return <ReferenceDataContent />;
}

export function ReferenceDataContent() {
  const { toast } = useToast();
  const {
    channels, clusters, depots, networkChangeTypes, auditLog,
    isLoading, isAuditLogLoading,
    fetchViaSaga, isSagaPending,
    updateChannelStatus, updateClusterStatus, updateDepotStatus, updateNetworkChangeTypeStatus,
    createChannel, createCluster, createDepot, createNetworkChangeType,
  } = useReferenceData();

  // Acting-as user (Admin gate)
  const { data: allUsers = [] } = useQuery<PortalUser[]>({ queryKey: ["/api/users"] });
  const [actingUserId, setActingUserId] = useState<string>("");
  const actingUser = allUsers.find((u) => u.id === actingUserId) ?? null;
  const isAdmin = actingUser?.role === "Admin";

  useEffect(() => {
    if (!actingUserId && allUsers.length) {
      const firstAdmin = allUsers.find((u) => u.isActive && u.role === "Admin");
      if (firstAdmin) setActingUserId(firstAdmin.id);
    }
  }, [allUsers, actingUserId]);

  useEffect(() => { fetchViaSaga(); }, []);

  const [activeTab, setActiveTab] = useState("channels");

  // Add dialog open states
  const [addChannelOpen, setAddChannelOpen] = useState(false);
  const [addClusterOpen, setAddClusterOpen] = useState(false);
  const [addDepotOpen, setAddDepotOpen] = useState(false);
  const [addNctOpen, setAddNctOpen] = useState(false);

  // Status update handlers
  function makeUpdateHandler(mutation: typeof updateChannelStatus, label: string) {
    return async (id: string, payload: StatusUpdatePayload) => {
      await mutation.mutateAsync({ id, payload });
      toast({ title: "Status Updated", description: `${label} status set to ${payload.status}.` });
    };
  }
  const handleChannelStatus = makeUpdateHandler(updateChannelStatus, "Channel");
  const handleClusterStatus = makeUpdateHandler(updateClusterStatus, "Cluster");
  const handleDepotStatus = makeUpdateHandler(updateDepotStatus, "Depot");
  const handleNctStatus = makeUpdateHandler(updateNetworkChangeTypeStatus, "Change Type");

  // Create handlers
  async function handleCreateChannel(payload: CreateChannelPayload) {
    await createChannel.mutateAsync(payload);
    toast({ title: "Channel Added", description: `${payload.code} has been created.` });
  }
  async function handleCreateCluster(payload: CreateClusterPayload) {
    await createCluster.mutateAsync(payload);
    toast({ title: "Cluster Added", description: `${payload.name} has been created.` });
  }
  async function handleCreateDepot(payload: CreateDepotPayload) {
    await createDepot.mutateAsync(payload);
    toast({ title: "Depot Added", description: `${payload.code} has been created.` });
  }
  async function handleCreateNct(payload: CreateNetworkChangeTypePayload) {
    await createNetworkChangeType.mutateAsync(payload);
    toast({ title: "Change Type Added", description: `${payload.code} has been created.` });
  }

  // Per-tab add button
  const addButton: Record<string, React.ReactNode> = {
    channels: (
      <Button size="sm" onClick={() => setAddChannelOpen(true)} data-testid="button-add-channel">
        <Plus className="h-4 w-4 mr-1.5" />Add Channel
      </Button>
    ),
    clusters: (
      <Button size="sm" onClick={() => setAddClusterOpen(true)} data-testid="button-add-cluster">
        <Plus className="h-4 w-4 mr-1.5" />Add Cluster
      </Button>
    ),
    depots: (
      <Button size="sm" onClick={() => setAddDepotOpen(true)} data-testid="button-add-depot">
        <Plus className="h-4 w-4 mr-1.5" />Add Depot
      </Button>
    ),
    networkChangeTypes: (
      <Button size="sm" onClick={() => setAddNctOpen(true)} data-testid="button-add-nct">
        <Plus className="h-4 w-4 mr-1.5" />Add Change Type
      </Button>
    ),
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-[#1f36c7] to-[#00b0d7] p-2.5 rounded-md">
            <Database className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Reference Data</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Master data for Channels, Clusters, Depots &amp; Change Types</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={actingUserId} onValueChange={setActingUserId}>
              <SelectTrigger className="w-52 h-8 text-sm" data-testid="select-acting-user">
                <SelectValue placeholder="Select user…" />
              </SelectTrigger>
              <SelectContent>
                {allUsers.filter((u) => u.isActive).map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}<span className="ml-1.5 text-xs text-muted-foreground">({u.role})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {actingUser && (
              <Badge variant={isAdmin ? "default" : "secondary"} className={`text-xs shrink-0 ${isAdmin ? "bg-emerald-600" : ""}`} data-testid="badge-acting-role">
                {isAdmin ? <><Shield className="h-3 w-3 mr-1" />Admin</> : actingUser.role}
              </Badge>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchViaSaga()} disabled={isSagaPending}>
            {isSagaPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <SummaryCard icon={<Radio className="h-5 w-5 text-[#1f36c7]" />} title="Channels" count={channels.length} loading={isLoading} />
        <SummaryCard icon={<MapPin className="h-5 w-5 text-[#0d8ecf]" />} title="Clusters" count={clusters.length} loading={isLoading} />
        <SummaryCard icon={<Warehouse className="h-5 w-5 text-[#00b0d7]" />} title="Depots" count={depots.length} loading={isLoading} />
        <SummaryCard icon={<GitBranch className="h-5 w-5 text-[#6366f1]" />} title="Change Types" count={networkChangeTypes.length} loading={isLoading} />
      </div>

      {/* Main tabs */}
      <Card>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="border-b px-5 pt-4 flex items-center justify-between gap-4">
              <TabsList>
                <TabsTrigger value="channels"><Radio className="h-4 w-4 mr-1.5" />Channels</TabsTrigger>
                <TabsTrigger value="clusters"><MapPin className="h-4 w-4 mr-1.5" />Clusters</TabsTrigger>
                <TabsTrigger value="depots"><Warehouse className="h-4 w-4 mr-1.5" />Depots</TabsTrigger>
                <TabsTrigger value="networkChangeTypes"><GitBranch className="h-4 w-4 mr-1.5" />Change Types</TabsTrigger>
                <TabsTrigger value="auditLog"><ClipboardList className="h-4 w-4 mr-1.5" />Audit Log</TabsTrigger>
              </TabsList>
              {/* Per-tab Add button */}
              {addButton[activeTab] ?? null}
            </div>

            <TabsContent value="channels" className="p-5 mt-0">
              {isLoading ? <TableSkeleton /> : (
                <ChannelsTable data={channels} isAdmin={isAdmin} actingUserId={actingUserId} onUpdateStatus={handleChannelStatus} />
              )}
            </TabsContent>
            <TabsContent value="clusters" className="p-5 mt-0">
              {isLoading ? <TableSkeleton /> : (
                <ClustersTable data={clusters} isAdmin={isAdmin} actingUserId={actingUserId} onUpdateStatus={handleClusterStatus} />
              )}
            </TabsContent>
            <TabsContent value="depots" className="p-5 mt-0">
              {isLoading ? <TableSkeleton /> : (
                <DepotsTable data={depots} isAdmin={isAdmin} actingUserId={actingUserId} onUpdateStatus={handleDepotStatus} clusters={clusters} />
              )}
            </TabsContent>
            <TabsContent value="networkChangeTypes" className="p-5 mt-0">
              {isLoading ? <TableSkeleton /> : (
                <NetworkChangeTypesTable data={networkChangeTypes} isAdmin={isAdmin} actingUserId={actingUserId} onUpdateStatus={handleNctStatus} />
              )}
            </TabsContent>
            <TabsContent value="auditLog" className="p-5 mt-0">
              {isAuditLogLoading ? <TableSkeleton /> : <AuditLogTable data={auditLog} />}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Add dialogs */}
      <AddChannelDialog
        open={addChannelOpen}
        onOpenChange={setAddChannelOpen}
        channels={channels}
        onSubmit={handleCreateChannel}
      />
      <AddClusterDialog
        open={addClusterOpen}
        onOpenChange={setAddClusterOpen}
        onSubmit={handleCreateCluster}
      />
      <AddDepotDialog
        open={addDepotOpen}
        onOpenChange={setAddDepotOpen}
        clusters={clusters}
        onSubmit={handleCreateDepot}
      />
      <AddNetworkChangeTypeDialog
        open={addNctOpen}
        onOpenChange={setAddNctOpen}
        onSubmit={handleCreateNct}
      />
    </div>
  );
}
