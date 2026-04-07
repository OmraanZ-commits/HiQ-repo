import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type NetworkEntry } from "@shared/schema";
import { ReassignmentDialog, type ReassignTrigger } from "@/components/reassignment-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Users,
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  Check,
  Minus,
  Pencil,
  ShieldCheck,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  BUSINESS_GROUPS,
  ROLES,
  type BusinessGroup,
  type Role,
  type PortalUser as AppUser,
} from "@/lib/users-data";

type RoleConfig = {
  label: Role;
  color: string;
  bg: string;
  description: string;
};

const ROLE_CONFIG: Record<Role, RoleConfig> = {
  Admin: {
    label: "Admin",
    color: "text-[#1f36c7]",
    bg: "bg-[#1f36c7]/10",
    description: "Full system access — users, config, all entries",
  },
  "Network Planner": {
    label: "Network Planner",
    color: "text-[#0d8ecf]",
    bg: "bg-[#0d8ecf]/10",
    description: "Create and manage network entries, trigger transitions",
  },
  "Paid Bible Owner": {
    label: "Paid Bible Owner",
    color: "text-purple-700",
    bg: "bg-purple-50",
    description: "Manage pricing updates and sourcing matrix",
  },
  Approver: {
    label: "Approver",
    color: "text-amber-700",
    bg: "bg-amber-50",
    description: "Review and approve status transitions",
  },
  Viewer: {
    label: "Viewer",
    color: "text-slate-600",
    bg: "bg-slate-100",
    description: "Read-only access to all data",
  },
};

type Permission = "full" | "partial" | "none";

type PermissionMatrix = {
  action: string;
  Admin: Permission;
  "Network Planner": Permission;
  "Paid Bible Owner": Permission;
  Approver: Permission;
  Viewer: Permission;
};

const PERMISSION_MATRIX: PermissionMatrix[] = [
  { action: "View network entries",        Admin: "full", "Network Planner": "full",    "Paid Bible Owner": "full",    Approver: "full",    Viewer: "full"    },
  { action: "Edit network entries",        Admin: "full", "Network Planner": "full",    "Paid Bible Owner": "partial", Approver: "none",    Viewer: "none"    },
  { action: "Trigger status transitions",  Admin: "full", "Network Planner": "full",    "Paid Bible Owner": "none",    Approver: "partial", Viewer: "none"    },
  { action: "Approve transitions",         Admin: "full", "Network Planner": "none",    "Paid Bible Owner": "none",    Approver: "full",    Viewer: "none"    },
  { action: "Manage pricing / Paid Bible", Admin: "full", "Network Planner": "none",    "Paid Bible Owner": "full",    Approver: "none",    Viewer: "none"    },
  { action: "Manage reference data",       Admin: "full", "Network Planner": "none",    "Paid Bible Owner": "none",    Approver: "none",    Viewer: "none"    },
  { action: "User management",             Admin: "full", "Network Planner": "none",    "Paid Bible Owner": "none",    Approver: "none",    Viewer: "none"    },
  { action: "View reports & analytics",    Admin: "full", "Network Planner": "full",    "Paid Bible Owner": "partial", Approver: "partial", Viewer: "full"    },
];

/* ── Helper components ─────────────────────────────────────────── */

function RoleBadge({ role }: { role: Role }) {
  const cfg = ROLE_CONFIG[role];
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", cfg.bg, cfg.color)}>
      {role}
    </span>
  );
}

function BgLeadBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
      <Crown className="h-3 w-3" />
      BG Lead
    </span>
  );
}

function AvatarInitials({ name, isActive }: { name: string; isActive: boolean }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className={cn(
      "h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0",
      isActive ? "bg-gradient-to-br from-[#1f36c7] to-[#00b0d7]" : "bg-slate-300"
    )}>
      {initials}
    </div>
  );
}

function PermIcon({ level }: { level: Permission }) {
  if (level === "full")
    return (
      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-emerald-100 mx-auto">
        <Check className="h-3.5 w-3.5 text-emerald-700" />
      </span>
    );
  if (level === "partial")
    return (
      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-100 mx-auto">
        <Minus className="h-3.5 w-3.5 text-amber-700" />
      </span>
    );
  return (
    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-100 mx-auto">
      <span className="text-xs font-bold text-slate-500 leading-none">✕</span>
    </span>
  );
}

function StatCard({ label, value, color, testId }: { label: string; value: number; color: string; testId: string }) {
  return (
    <div className="rounded-lg border bg-card p-4 flex items-center gap-3" data-testid={testId}>
      <div className={cn("w-2 self-stretch rounded-full bg-gradient-to-b", color)} />
      <div>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

/* ── Add / Edit User Dialog ────────────────────────────────────── */

type UserFormState = {
  name: string;
  email: string;
  role: Role | "";
  businessGroup: BusinessGroup | "";
  isBgLead: boolean;
};

const EMPTY_FORM: UserFormState = { name: "", email: "", role: "", businessGroup: "", isBgLead: false };

function UserDialog({
  open,
  onClose,
  onSave,
  initial,
  mode,
  existingBgLead,
  editingUserId,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: UserFormState) => void;
  initial?: Partial<UserFormState>;
  mode: "add" | "edit";
  existingBgLead: (bg: BusinessGroup) => AppUser | undefined;
  editingUserId?: string;
}) {
  const [form, setForm] = useState<UserFormState>({ ...EMPTY_FORM, ...initial });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingConflict, setPendingConflict] = useState<AppUser | null>(null);

  const isValid = form.name.trim() && form.email.trim() && form.role;

  const handleSaveClick = () => {
    if (!isValid) return;

    // If marking as BG lead, check for existing lead in the same BG
    if (form.isBgLead && form.businessGroup) {
      const existing = existingBgLead(form.businessGroup as BusinessGroup);
      // Conflict = existing lead exists and it's not the user being edited
      const isConflict = existing && existing.id !== editingUserId;
      if (isConflict) {
        setPendingConflict(existing!);
        setConfirmOpen(true);
        return;
      }
    }

    onSave(form);
    onClose();
  };

  const handleConfirmReplace = () => {
    setConfirmOpen(false);
    setPendingConflict(null);
    onSave(form);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{mode === "add" ? "Add New User" : "Edit User"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Full Name */}
            <div className="space-y-1.5">
              <Label htmlFor="um-name">Full Name <span className="text-destructive">*</span></Label>
              <Input
                id="um-name"
                data-testid="input-user-name"
                placeholder="e.g. Priya Patel"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="um-email">Email <span className="text-destructive">*</span></Label>
              <Input
                id="um-email"
                data-testid="input-user-email"
                type="email"
                placeholder="name@unilever.com"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              />
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <Label htmlFor="um-role">Role <span className="text-destructive">*</span></Label>
              <Select
                value={form.role}
                onValueChange={(v) => {
                  const newRole = v as Role;
                  setForm((p) => ({
                    ...p,
                    role: newRole,
                    isBgLead: newRole === "Network Planner" ? p.isBgLead : false,
                  }));
                }}
              >
                <SelectTrigger id="um-role" data-testid="select-user-role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r} data-testid={`option-role-${r}`}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.role && (
                <p className="text-xs text-muted-foreground">{ROLE_CONFIG[form.role as Role]?.description}</p>
              )}
            </div>

            {/* Business Group */}
            <div className="space-y-1.5">
              <Label htmlFor="um-bg">Business Group</Label>
              <Select
                value={form.businessGroup}
                onValueChange={(v) => setForm((p) => ({ ...p, businessGroup: v as BusinessGroup, isBgLead: false }))}
              >
                <SelectTrigger id="um-bg" data-testid="select-user-business-group">
                  <SelectValue placeholder="Select business group" />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_GROUPS.map((bg) => (
                    <SelectItem key={bg} value={bg} data-testid={`option-bg-${bg}`}>{bg}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* BG Lead checkbox — only shown for Network Planners with a BG selected */}
            {form.role === "Network Planner" && form.businessGroup && (
              <div className="flex items-start gap-3 rounded-lg border bg-amber-50/50 border-amber-100 px-3 py-3">
                <Checkbox
                  id="um-bg-lead"
                  data-testid="checkbox-bg-lead"
                  checked={form.isBgLead}
                  onCheckedChange={(checked) =>
                    setForm((p) => ({ ...p, isBgLead: checked === true }))
                  }
                  className="mt-0.5 border-amber-400 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                />
                <div className="flex-1">
                  <Label htmlFor="um-bg-lead" className="cursor-pointer font-medium flex items-center gap-1.5">
                    <Crown className="h-3.5 w-3.5 text-amber-600" />
                    BG Lead for {form.businessGroup}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Only one Network Planner can be BG Lead per Business Group.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} data-testid="button-user-dialog-cancel">
              Cancel
            </Button>
            <Button
              disabled={!isValid}
              onClick={handleSaveClick}
              data-testid="button-user-dialog-save"
              className="bg-gradient-to-r from-[#1f36c7] to-[#0d8ecf] text-white hover:opacity-90"
            >
              {mode === "add" ? "Add User" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BG Lead conflict confirmation */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent data-testid="dialog-bg-lead-conflict">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              BG Lead Already Exists
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  <span className="font-semibold text-foreground">{pendingConflict?.name}</span> is
                  currently the BG Lead for{" "}
                  <span className="font-semibold text-foreground">{form.businessGroup}</span>.
                </p>
                <p>
                  If you proceed, <span className="font-semibold text-foreground">{pendingConflict?.name}</span> will
                  be demoted and <span className="font-semibold text-foreground">{form.name || "this user"}</span> will
                  become the new BG Lead.
                </p>
                <p>Do you want to continue?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-conflict-cancel">
              No, keep existing lead
            </AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-conflict-confirm"
              onClick={handleConfirmReplace}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              Yes, replace BG Lead
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* ── Roles & Permissions tab ───────────────────────────────────── */

function RolesPermissionsTab() {
  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Permissions Matrix</h3>
          <span className="ml-auto text-xs text-muted-foreground flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-emerald-100">
                <Check className="h-3 w-3 text-emerald-700" />
              </span>
              Full
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-amber-100">
                <Minus className="h-3 w-3 text-amber-700" />
              </span>
              Partial
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-slate-100">
                <span className="text-[10px] font-bold text-slate-500 leading-none">✕</span>
              </span>
              None
            </span>
          </span>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20">
                <TableHead className="min-w-[200px]">Permission</TableHead>
                {ROLES.map((r) => (
                  <TableHead key={r} className="text-center min-w-[130px]">
                    <span className={cn("text-xs font-semibold", ROLE_CONFIG[r].color)}>{r}</span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {PERMISSION_MATRIX.map((row) => (
                <TableRow key={row.action}>
                  <TableCell className="text-sm">{row.action}</TableCell>
                  {ROLES.map((r) => (
                    <TableCell key={r} className="text-center py-2">
                      <PermIcon level={row[r]} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

/* ── Main export ───────────────────────────────────────────────── */

type SubTab = "users" | "roles";

export function UserManagementContent() {
  const { toast } = useToast();

  const [subTab, setSubTab] = useState<SubTab>("users");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "All">("All");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Inactive">("All");
  const [showDialog, setShowDialog] = useState<"add" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<AppUser | null>(null);

  /* ── Users API ─────────────────────────────────────────────── */

  const { data: users = [] } = useQuery<AppUser[]>({
    queryKey: ["/api/users"],
  });

  const createUserMutation = useMutation({
    mutationFn: (data: Omit<AppUser, "id" | "createdAt">) =>
      apiRequest("POST", "/api/users", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/users"] }),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<AppUser> & { id: string }) =>
      apiRequest("PATCH", `/api/users/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/users"] }),
  });

  /* Find existing BG lead for a given BG (excluding the user being edited) */
  const getExistingBgLead = (bg: BusinessGroup): AppUser | undefined =>
    users.find((u) => u.businessGroup === bg && u.isBgLead && u.id !== editTarget?.id);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => {
      const matchSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.businessGroup.toLowerCase().includes(q);
      const matchRole = roleFilter === "All" || u.role === roleFilter;
      const matchStatus =
        statusFilter === "All" ||
        (statusFilter === "Active" ? u.isActive : !u.isActive);
      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const stats = useMemo(() => {
    const active = users.filter((u) => u.isActive).length;
    const byRole = ROLES.reduce(
      (acc, r) => ({ ...acc, [r]: users.filter((u) => u.role === r).length }),
      {} as Record<Role, number>
    );
    return { total: users.length, active, inactive: users.length - active, byRole };
  }, [users]);

  /* ── Reassignment dialog state ─────────────────────────────── */

  type PendingChange =
    | { type: "deactivate"; userId: string }
    | { type: "edit"; form: UserFormState };

  const [reassignState, setReassignState] = useState<{
    open: boolean;
    pending: PendingChange | null;
    affectedEntries: NetworkEntry[];
    availablePlanners: AppUser[];
    trigger: ReassignTrigger;
    userName: string;
  }>({ open: false, pending: null, affectedEntries: [], availablePlanners: [], trigger: "deactivation", userName: "" });

  /* Fetch all network entries (background — used for affected-entry detection) */
  const { data: allEntries = [] } = useQuery<NetworkEntry[]>({
    queryKey: ["/api/network-entries"],
  });

  /* Reassign mutation — PATCHes each affected entry */
  const reassignMutation = useMutation({
    mutationFn: async (assignments: Record<string, string>) => {
      await Promise.all(
        Object.entries(assignments).map(([entryId, assignedPerson]) =>
          apiRequest("PATCH", `/api/network-entries/${entryId}`, { assignedPerson })
        )
      );
    },
    onSuccess: (_, assignments) => {
      queryClient.invalidateQueries({ queryKey: ["/api/network-entries"] });
      const count = Object.keys(assignments).length;
      toast({
        title: "Entries reassigned",
        description: `${count} network ${count === 1 ? "entry has" : "entries have"} been reassigned successfully.`,
      });
    },
  });

  /** Entries assigned to a user that are NOT yet "Network transition complete" */
  const getAffectedEntries = (userName: string): NetworkEntry[] =>
    allEntries.filter(
      (e) =>
        e.assignedPerson === userName &&
        e.networkStatus !== "Network transition complete"
    );

  /** Available planners for reassignment — same BG, active NPs, not the user themselves */
  const getAvailablePlanners = (bg: string, excludeName: string): AppUser[] =>
    users.filter(
      (p) =>
        p.role === "Network Planner" &&
        p.isActive &&
        p.businessGroup === bg &&
        p.name !== excludeName
    );

  /* Apply a pending change (deactivation or edit) to users via API */
  const applyPendingChange = (pending: PendingChange) => {
    if (pending.type === "deactivate") {
      const user = users.find((u) => u.id === pending.userId);
      updateUserMutation.mutate(
        { id: pending.userId, isActive: false },
        {
          onSuccess: () =>
            toast({ title: "User deactivated", description: `${user?.name ?? "User"} is now inactive.` }),
        }
      );
    } else {
      handleEditApply(pending.form);
    }
  };

  /* Low-level apply for edit (no trigger checks) */
  const handleEditApply = (form: UserFormState) => {
    if (!editTarget) return;
    const id = editTarget.id;
    updateUserMutation.mutate(
      { id, name: form.name, email: form.email, role: form.role as Role, businessGroup: form.businessGroup as BusinessGroup | "", isBgLead: form.isBgLead },
      {
        onSuccess: () =>
          toast({
            title: "User updated",
            description: form.isBgLead
              ? `${form.name} is now the BG Lead for ${form.businessGroup}.`
              : `${form.name}'s details have been updated.`,
          }),
      }
    );
    setEditTarget(null);
    setShowDialog(null);
  };

  /* Reassignment dialog handlers */
  const handleReassignCancel = () => {
    /* Cancel — close the dialog; the pending user change is NOT applied */
    setReassignState((s) => ({ ...s, open: false, pending: null }));
  };

  const handleReassignConfirm = async (assignments: Record<string, string>) => {
    await reassignMutation.mutateAsync(assignments);
    const pending = reassignState.pending;
    setReassignState((s) => ({ ...s, open: false, pending: null }));
    if (pending) applyPendingChange(pending);
  };

  /* ── Toggle active/inactive ──────────────────────────────────── */

  const handleToggleStatus = (id: string) => {
    const user = users.find((u) => u.id === id);
    if (!user) return;

    /* Activating: no affected-entry check needed */
    if (!user.isActive) {
      updateUserMutation.mutate(
        { id, isActive: true },
        { onSuccess: () => toast({ title: "User activated", description: `${user.name} is now active.` }) }
      );
      return;
    }

    /* Deactivating a Network Planner — check for affected entries */
    if (user.role === "Network Planner") {
      const affected = getAffectedEntries(user.name);
      if (affected.length > 0) {
        setReassignState({
          open: true,
          pending: { type: "deactivate", userId: id },
          affectedEntries: affected,
          availablePlanners: getAvailablePlanners(user.businessGroup, user.name),
          trigger: "deactivation",
          userName: user.name,
        });
        return;
      }
    }

    /* No affected entries — deactivate directly */
    updateUserMutation.mutate(
      { id, isActive: false },
      { onSuccess: () => toast({ title: "User deactivated", description: `${user.name} is now inactive.` }) }
    );
  };

  const handleAdd = (form: UserFormState) => {
    createUserMutation.mutate(
      {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role as Role,
        businessGroup: form.businessGroup as BusinessGroup,
        isBgLead: form.isBgLead,
        isActive: true,
      },
      {
        onSuccess: () =>
          toast({
            title: "User added",
            description: form.isBgLead
              ? `${form.name.trim()} added as ${form.role} and BG Lead for ${form.businessGroup}.`
              : `${form.name.trim()} has been added as ${form.role}.`,
          }),
      }
    );
  };

  const handleEdit = (form: UserFormState) => {
    if (!editTarget) return;

    const wasNP = editTarget.role === "Network Planner";
    const roleChanged = wasNP && form.role !== "Network Planner";
    const bgChanged = wasNP && form.businessGroup !== editTarget.businessGroup;

    if (wasNP && (roleChanged || bgChanged)) {
      /* Check for incomplete entries in the OLD BG under the user's current name */
      const affected = getAffectedEntries(editTarget.name);
      if (affected.length > 0) {
        const trigger: ReassignTrigger = roleChanged ? "role-change" : "bg-change";
        /* Offer planners from the OLD BG (entries belong there) */
        const planners = getAvailablePlanners(editTarget.businessGroup, editTarget.name);
        setReassignState({
          open: true,
          pending: { type: "edit", form },
          affectedEntries: affected,
          availablePlanners: planners,
          trigger,
          userName: editTarget.name,
        });
        return;
      }
    }

    handleEditApply(form);
  };

  const openEdit = (user: AppUser) => {
    setEditTarget(user);
    setShowDialog("edit");
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-[#1f36c7] to-[#00b0d7] p-2.5 rounded-md">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold">User Management</h2>
            <p className="text-sm text-muted-foreground">Manage users and assign roles</p>
          </div>
        </div>
        {subTab === "users" && (
          <Button
            onClick={() => setShowDialog("add")}
            data-testid="button-add-user"
            className="bg-gradient-to-r from-[#1f36c7] to-[#0d8ecf] text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add User
          </Button>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Users"  value={stats.total}    color="from-[#1f36c7] to-[#0d8ecf]"      testId="stat-total-users"    />
        <StatCard label="Active"       value={stats.active}   color="from-emerald-500 to-emerald-600"   testId="stat-active-users"   />
        <StatCard label="Inactive"     value={stats.inactive} color="from-slate-400 to-slate-500"       testId="stat-inactive-users" />
        <StatCard label="Roles"        value={ROLES.length}   color="from-purple-500 to-purple-600"     testId="stat-roles-count"    />
      </div>

      {/* Sub-tab strip */}
      <div className="flex items-center gap-1 border-b">
        {([
          { id: "users" as SubTab, label: "Users", icon: Users },
          { id: "roles" as SubTab, label: "Roles & Permissions", icon: ShieldCheck },
        ]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            data-testid={`tab-${id}`}
            onClick={() => setSubTab(id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              subTab === id
                ? "border-[#1f36c7] text-[#1f36c7]"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Users tab */}
      {subTab === "users" && (
        <div className="space-y-4">
          {/* Role filter chips */}
          <div className="flex flex-wrap gap-2">
            {ROLES.map((role) => (
              <button
                key={role}
                data-testid={`chip-role-${role}`}
                onClick={() => setRoleFilter(roleFilter === role ? "All" : role)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                  roleFilter === role
                    ? cn(ROLE_CONFIG[role].bg, ROLE_CONFIG[role].color, "border-current")
                    : "bg-background text-muted-foreground border-border hover:bg-muted"
                )}
              >
                <span>{role}</span>
                <span className={cn(
                  "rounded-full px-1.5 py-0 text-[10px] font-bold",
                  roleFilter === role ? ROLE_CONFIG[role].bg : "bg-muted"
                )}>
                  {stats.byRole[role]}
                </span>
              </button>
            ))}
            {roleFilter !== "All" && (
              <button
                onClick={() => setRoleFilter("All")}
                className="text-xs text-muted-foreground hover:text-foreground underline"
                data-testid="link-clear-role-filter"
              >
                Clear filter
              </button>
            )}
          </div>

          {/* Search + status filter */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, email, business group…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
                data-testid="input-user-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="w-36 h-9" data-testid="select-status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground ml-auto" data-testid="text-user-count">
              {filtered.length} of {users.length} users
            </span>
          </div>

          {/* User Table */}
          <div className="rounded-lg border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-[260px]">User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Business Group</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                      No users match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((user) => (
                    <TableRow
                      key={user.id}
                      className={cn("transition-colors", !user.isActive && "opacity-60")}
                      data-testid={`row-user-${user.id}`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <AvatarInitials name={user.name} isActive={user.isActive} />
                          <div>
                            <p className="font-medium text-sm leading-tight" data-testid={`text-user-name-${user.id}`}>
                              {user.name}
                            </p>
                            <p className="text-xs text-muted-foreground" data-testid={`text-user-email-${user.id}`}>
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><RoleBadge role={user.role} /></TableCell>
                      <TableCell data-testid={`text-bg-${user.id}`}>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm text-muted-foreground">{user.businessGroup || "—"}</span>
                          {user.isBgLead && <BgLeadBadge />}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground tabular-nums">
                        {new Date(user.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </TableCell>
                      <TableCell className="text-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleToggleStatus(user.id)}
                              data-testid={`button-toggle-status-${user.id}`}
                              className="inline-flex items-center gap-1 text-xs font-medium"
                            >
                              {user.isActive ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-slate-400" />
                              )}
                              <span className={user.isActive ? "text-emerald-700" : "text-slate-500"}>
                                {user.isActive ? "Active" : "Inactive"}
                              </span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Click to {user.isActive ? "deactivate" : "activate"}</TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(user)}
                          data-testid={`button-edit-user-${user.id}`}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Roles & Permissions tab */}
      {subTab === "roles" && <RolesPermissionsTab />}

      {/* Dialogs */}
      {showDialog === "add" && (
        <UserDialog
          open
          mode="add"
          onClose={() => setShowDialog(null)}
          onSave={handleAdd}
          existingBgLead={getExistingBgLead}
        />
      )}
      {showDialog === "edit" && editTarget && (
        <UserDialog
          open
          mode="edit"
          editingUserId={editTarget.id}
          onClose={() => { setShowDialog(null); setEditTarget(null); }}
          onSave={handleEdit}
          existingBgLead={getExistingBgLead}
          initial={{
            name: editTarget.name,
            email: editTarget.email,
            role: editTarget.role,
            businessGroup: editTarget.businessGroup,
            isBgLead: editTarget.isBgLead,
          }}
        />
      )}

      {/* Reassignment dialog — shown when a NP's role/BG changes or they are deactivated */}
      <ReassignmentDialog
        open={reassignState.open}
        onCancel={handleReassignCancel}
        onConfirm={handleReassignConfirm}
        affectedEntries={reassignState.affectedEntries}
        availablePlanners={reassignState.availablePlanners}
        trigger={reassignState.trigger}
        userName={reassignState.userName}
        isPending={reassignMutation.isPending}
      />
    </div>
  );
}
