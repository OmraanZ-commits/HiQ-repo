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
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PortalUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
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
  open,
  onOpenChange,
  entityLabel,
  entityCode,
  currentStatus,
  actingUserId,
  onConfirm,
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
      // Only close on success — error is already toasted by the mutation's onError
      onOpenChange(false);
    } catch {
      // Error handled by mutation's onError — keep dialog open so user can retry
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
            Update the Active / Inactive status for{" "}
            <span className="font-mono font-medium">{entityCode}</span>.
            An approved-email attachment is required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Status dropdown — AC2: only Active / Inactive */}
          <div className="space-y-1.5">
            <Label htmlFor="rd-status">
              Status <span className="text-destructive">*</span>
            </Label>
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

          {/* Mandatory attachment — AC3/AC4 */}
          <div className="space-y-1.5">
            <Label>
              Approved Email Attachment <span className="text-destructive">*</span>
            </Label>
            <div
              className={`flex items-center gap-3 rounded-md border px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors ${
                file ? "border-emerald-400 bg-emerald-50" : "border-dashed"
              }`}
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
            {!file && (
              <p className="text-xs text-amber-600">
                Attachment is mandatory — submit will be blocked without it.
              </p>
            )}
          </div>

          {/* Optional notes */}
          <div className="space-y-1.5">
            <Label htmlFor="rd-notes">Notes (optional)</Label>
            <Textarea
              id="rd-notes"
              placeholder="Reason for status change..."
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              data-testid="input-notes"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          {/* AC4: Submit blocked if attachment missing */}
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            data-testid="button-submit-status"
          >
            {submitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Save Status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Page exports ──────────────────────────────────────────────────────────────

export default function ReferenceDataPage() {
  return <ReferenceDataContent />;
}

export function ReferenceDataContent() {
  const { toast } = useToast();
  const {
    channels,
    clusters,
    depots,
    networkChangeTypes,
    auditLog,
    isLoading,
    isAuditLogLoading,
    fetchViaSaga,
    isSagaPending,
    updateChannelStatus,
    updateClusterStatus,
    updateDepotStatus,
    updateNetworkChangeTypeStatus,
  } = useReferenceData();

  // ── Acting-as user (Admin gate) ─────────────────────────────
  const { data: allUsers = [] } = useQuery<PortalUser[]>({ queryKey: ["/api/users"] });
  const [actingUserId, setActingUserId] = useState<string>("");

  const actingUser = allUsers.find((u) => u.id === actingUserId) ?? null;
  const isAdmin = actingUser?.role === "Admin";

  // Pre-select first active Admin on load
  useEffect(() => {
    if (!actingUserId && allUsers.length) {
      const firstAdmin = allUsers.find((u) => u.isActive && u.role === "Admin");
      if (firstAdmin) setActingUserId(firstAdmin.id);
    }
  }, [allUsers, actingUserId]);

  // Auto-fetch via saga on mount
  useEffect(() => {
    fetchViaSaga();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [activeTab, setActiveTab] = useState("channels");

  // ── Status update handlers ───────────────────────────────────

  function makeUpdateHandler(
    mutation: typeof updateChannelStatus,
    refetchKey: string[],
    successLabel: string,
  ) {
    return async (id: string, payload: StatusUpdatePayload) => {
      await mutation.mutateAsync({ id, payload });
      toast({
        title: "Status Updated",
        description: `${successLabel} status set to ${payload.status}.`,
      });
    };
  }

  const handleChannelStatus = makeUpdateHandler(updateChannelStatus, [], "Channel");
  const handleClusterStatus = makeUpdateHandler(updateClusterStatus, [], "Cluster");
  const handleDepotStatus = makeUpdateHandler(updateDepotStatus, [], "Depot");
  const handleNetworkChangeTypeStatus = makeUpdateHandler(updateNetworkChangeTypeStatus, [], "Change Type");

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-[#1f36c7] to-[#00b0d7] p-2.5 rounded-md">
            <Database className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Reference Data</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Master data for Channels, Clusters, Depots &amp; Change Types
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* AC1: Acting-as user selector for admin role gate */}
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={actingUserId} onValueChange={setActingUserId}>
              <SelectTrigger className="w-52 h-8 text-sm" data-testid="select-acting-user">
                <SelectValue placeholder="Select user…" />
              </SelectTrigger>
              <SelectContent>
                {allUsers.filter((u) => u.isActive).map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                    <span className="ml-1.5 text-xs text-muted-foreground">({u.role})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {actingUser && (
              <Badge
                variant={isAdmin ? "default" : "secondary"}
                className={`text-xs shrink-0 ${isAdmin ? "bg-emerald-600" : ""}`}
                data-testid="badge-acting-role"
              >
                {isAdmin ? <><Shield className="h-3 w-3 mr-1" />Admin</> : actingUser.role}
              </Badge>
            )}
          </div>

          <Button variant="outline" size="sm" onClick={() => fetchViaSaga()} disabled={isSagaPending}>
            {isSagaPending ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1.5" />
            )}
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
            <div className="border-b px-5 pt-4">
              <TabsList>
                <TabsTrigger value="channels"><Radio className="h-4 w-4 mr-1.5" />Channels</TabsTrigger>
                <TabsTrigger value="clusters"><MapPin className="h-4 w-4 mr-1.5" />Clusters</TabsTrigger>
                <TabsTrigger value="depots"><Warehouse className="h-4 w-4 mr-1.5" />Depots</TabsTrigger>
                <TabsTrigger value="networkChangeTypes"><GitBranch className="h-4 w-4 mr-1.5" />Change Types</TabsTrigger>
                <TabsTrigger value="auditLog"><ClipboardList className="h-4 w-4 mr-1.5" />Audit Log</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="channels" className="p-5 mt-0">
              {isLoading ? <TableSkeleton /> : (
                <ChannelsTable
                  data={channels}
                  isAdmin={isAdmin}
                  actingUserId={actingUserId}
                  onUpdateStatus={handleChannelStatus}
                />
              )}
            </TabsContent>
            <TabsContent value="clusters" className="p-5 mt-0">
              {isLoading ? <TableSkeleton /> : (
                <ClustersTable
                  data={clusters}
                  isAdmin={isAdmin}
                  actingUserId={actingUserId}
                  onUpdateStatus={handleClusterStatus}
                />
              )}
            </TabsContent>
            <TabsContent value="depots" className="p-5 mt-0">
              {isLoading ? <TableSkeleton /> : (
                <DepotsTable
                  data={depots}
                  isAdmin={isAdmin}
                  actingUserId={actingUserId}
                  onUpdateStatus={handleDepotStatus}
                />
              )}
            </TabsContent>
            <TabsContent value="networkChangeTypes" className="p-5 mt-0">
              {isLoading ? <TableSkeleton /> : (
                <NetworkChangeTypesTable
                  data={networkChangeTypes}
                  isAdmin={isAdmin}
                  actingUserId={actingUserId}
                  onUpdateStatus={handleNetworkChangeTypeStatus}
                />
              )}
            </TabsContent>
            <TabsContent value="auditLog" className="p-5 mt-0">
              {isAuditLogLoading ? <TableSkeleton /> : <AuditLogTable data={auditLog} />}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Shared sub-components ────────────────────────────────────── */

function SummaryCard({ icon, title, count, loading }: { icon: React.ReactNode; title: string; count: number; loading: boolean }) {
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

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (<Skeleton key={i} className="h-10 w-full" />))}
    </div>
  );
}

function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge variant="default" className="bg-emerald-600 text-xs">Active</Badge>
  ) : (
    <Badge variant="secondary" className="text-xs">Inactive</Badge>
  );
}

/* ── Edit Status button + dialog trigger ──────────────────────── */

interface EditStatusButtonProps {
  entityId: string;
  entityLabel: string;
  entityCode: string;
  currentStatus: boolean;
  isAdmin: boolean;
  actingUserId: string;
  onUpdateStatus: (id: string, payload: StatusUpdatePayload) => Promise<void>;
}

function EditStatusButton({
  entityId,
  entityLabel,
  entityCode,
  currentStatus,
  isAdmin,
  actingUserId,
  onUpdateStatus,
}: EditStatusButtonProps) {
  const [open, setOpen] = useState(false);

  if (!isAdmin) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        title="Edit Status"
        data-testid={`button-edit-status-${entityId}`}
        onClick={() => setOpen(true)}
      >
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

/* ── Channels Table ─────────────────────────────────────────── */

function ChannelsTable({
  data,
  isAdmin,
  actingUserId,
  onUpdateStatus,
}: {
  data: ChannelMaster[];
  isAdmin: boolean;
  actingUserId: string;
  onUpdateStatus: (id: string, payload: StatusUpdatePayload) => Promise<void>;
}) {
  if (!data.length) return <p className="text-muted-foreground text-sm">No channels found.</p>;

  const typeColor: Record<string, string> = {
    Core: "bg-blue-100 text-blue-800",
    Traditional: "bg-amber-100 text-amber-800",
    "Modern Trade": "bg-purple-100 text-purple-800",
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Code</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Parent</TableHead>
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
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColor[ch.type] ?? ""}`}>{ch.type}</span>
            </TableCell>
            <TableCell>{ch.parentCode ?? "—"}</TableCell>
            <TableCell data-testid={`status-channel-${ch.id}`}><ActiveBadge active={ch.isActive} /></TableCell>
            {isAdmin && (
              <TableCell>
                <EditStatusButton
                  entityId={ch.id}
                  entityLabel="Channel"
                  entityCode={ch.code}
                  currentStatus={ch.isActive}
                  isAdmin={isAdmin}
                  actingUserId={actingUserId}
                  onUpdateStatus={onUpdateStatus}
                />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/* ── Clusters Table ─────────────────────────────────────────── */

function ClustersTable({
  data,
  isAdmin,
  actingUserId,
  onUpdateStatus,
}: {
  data: ClusterMaster[];
  isAdmin: boolean;
  actingUserId: string;
  onUpdateStatus: (id: string, payload: StatusUpdatePayload) => Promise<void>;
}) {
  if (!data.length) return <p className="text-muted-foreground text-sm">No clusters found.</p>;

  const regionColor: Record<string, string> = {
    South: "bg-green-100 text-green-800",
    West: "bg-orange-100 text-orange-800",
    North: "bg-sky-100 text-sky-800",
    East: "bg-indigo-100 text-indigo-800",
  };

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
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${regionColor[cl.region] ?? ""}`}>{cl.region}</span>
            </TableCell>
            <TableCell>{cl.depotCount ?? "—"}</TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {(cl.stateIds ?? []).slice(0, 3).map((s) => (
                  <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                ))}
                {(cl.stateIds ?? []).length > 3 && (
                  <Badge variant="outline" className="text-xs">+{cl.stateIds.length - 3}</Badge>
                )}
              </div>
            </TableCell>
            <TableCell data-testid={`status-cluster-${cl.id}`}><ActiveBadge active={cl.isActive} /></TableCell>
            {isAdmin && (
              <TableCell>
                <EditStatusButton
                  entityId={cl.id}
                  entityLabel="Cluster"
                  entityCode={cl.name}
                  currentStatus={cl.isActive}
                  isAdmin={isAdmin}
                  actingUserId={actingUserId}
                  onUpdateStatus={onUpdateStatus}
                />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/* ── Depots Table ───────────────────────────────────────────── */

function DepotsTable({
  data,
  isAdmin,
  actingUserId,
  onUpdateStatus,
}: {
  data: DepotMaster[];
  isAdmin: boolean;
  actingUserId: string;
  onUpdateStatus: (id: string, payload: StatusUpdatePayload) => Promise<void>;
}) {
  if (!data.length) return <p className="text-muted-foreground text-sm">No depots found.</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Code</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Cluster ID</TableHead>
          <TableHead>Status</TableHead>
          {isAdmin && <TableHead className="w-12" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((dp) => (
          <TableRow key={dp.id} data-testid={`row-depot-${dp.id}`}>
            <TableCell className="font-mono font-medium">{dp.code}</TableCell>
            <TableCell>{dp.name ?? "—"}</TableCell>
            <TableCell>{dp.clusterId ?? "—"}</TableCell>
            <TableCell data-testid={`status-depot-${dp.id}`}><ActiveBadge active={dp.isActive} /></TableCell>
            {isAdmin && (
              <TableCell>
                <EditStatusButton
                  entityId={dp.id}
                  entityLabel="Depot"
                  entityCode={dp.code}
                  currentStatus={dp.isActive}
                  isAdmin={isAdmin}
                  actingUserId={actingUserId}
                  onUpdateStatus={onUpdateStatus}
                />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/* ── Network Change Types Table ─────────────────────────────── */

function NetworkChangeTypesTable({
  data,
  isAdmin,
  actingUserId,
  onUpdateStatus,
}: {
  data: NetworkChangeTypeMaster[];
  isAdmin: boolean;
  actingUserId: string;
  onUpdateStatus: (id: string, payload: StatusUpdatePayload) => Promise<void>;
}) {
  if (!data.length) return <p className="text-muted-foreground text-sm">No network change types found.</p>;

  const categoryColor: Record<string, string> = {
    Promotion: "bg-pink-100 text-pink-800",
    Relaunch: "bg-violet-100 text-violet-800",
    Launch: "bg-emerald-100 text-emerald-800",
    Other: "bg-gray-100 text-gray-800",
  };

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
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${categoryColor[nct.category ?? ""] ?? categoryColor.Other}`}>
                {nct.category ?? "—"}
              </span>
            </TableCell>
            <TableCell data-testid={`status-nct-${nct.id}`}><ActiveBadge active={nct.isActive} /></TableCell>
            {isAdmin && (
              <TableCell>
                <EditStatusButton
                  entityId={nct.id}
                  entityLabel="Change Type"
                  entityCode={nct.code}
                  currentStatus={nct.isActive}
                  isAdmin={isAdmin}
                  actingUserId={actingUserId}
                  onUpdateStatus={onUpdateStatus}
                />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/* ── Audit Log Table ────────────────────────────────────────── */

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
            <TableCell>
              <Badge variant="outline" className="text-xs">
                {ENTITY_TYPE_LABELS[entry.entityType] ?? entry.entityType}
              </Badge>
            </TableCell>
            <TableCell className="font-mono text-xs font-medium">{entry.entityCode ?? "—"}</TableCell>
            <TableCell>
              <span className="text-xs capitalize">{entry.action.replace(/_/g, " ")}</span>
            </TableCell>
            <TableCell>
              {entry.oldStatus ? <ActiveBadge active={entry.oldStatus === "Active"} /> : <span className="text-muted-foreground text-xs">—</span>}
            </TableCell>
            <TableCell>
              {entry.newStatus ? <ActiveBadge active={entry.newStatus === "Active"} /> : <span className="text-muted-foreground text-xs">—</span>}
            </TableCell>
            <TableCell className="text-sm">{entry.changedByName}</TableCell>
            <TableCell>
              {entry.attachmentFilename ? (
                <div className="flex items-center gap-1 text-xs text-blue-600">
                  <Paperclip className="h-3 w-3 shrink-0" />
                  <span className="max-w-32 truncate" title={entry.attachmentFilename}>{entry.attachmentFilename}</span>
                </div>
              ) : (
                <span className="text-muted-foreground text-xs">—</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
