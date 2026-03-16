import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/dialog";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

/* ── Role definitions ──────────────────────────────────────────── */

const ROLES = [
  "Admin",
  "Network Planner",
  "Paid Bible Owner",
  "Approver",
  "Viewer",
] as const;

export type Role = (typeof ROLES)[number];

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
  {
    action: "View network entries",
    Admin: "full",
    "Network Planner": "full",
    "Paid Bible Owner": "full",
    Approver: "full",
    Viewer: "full",
  },
  {
    action: "Edit network entries",
    Admin: "full",
    "Network Planner": "full",
    "Paid Bible Owner": "partial",
    Approver: "none",
    Viewer: "none",
  },
  {
    action: "Trigger status transitions",
    Admin: "full",
    "Network Planner": "full",
    "Paid Bible Owner": "none",
    Approver: "partial",
    Viewer: "none",
  },
  {
    action: "Approve transitions",
    Admin: "full",
    "Network Planner": "none",
    "Paid Bible Owner": "none",
    Approver: "full",
    Viewer: "none",
  },
  {
    action: "Manage pricing / Paid Bible",
    Admin: "full",
    "Network Planner": "none",
    "Paid Bible Owner": "full",
    Approver: "none",
    Viewer: "none",
  },
  {
    action: "Manage reference data",
    Admin: "full",
    "Network Planner": "none",
    "Paid Bible Owner": "none",
    Approver: "none",
    Viewer: "none",
  },
  {
    action: "User management",
    Admin: "full",
    "Network Planner": "none",
    "Paid Bible Owner": "none",
    Approver: "none",
    Viewer: "none",
  },
  {
    action: "View reports & analytics",
    Admin: "full",
    "Network Planner": "full",
    "Paid Bible Owner": "partial",
    Approver: "partial",
    Viewer: "full",
  },
];

/* ── Static user data ──────────────────────────────────────────── */

type AppUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  isActive: boolean;
  createdAt: string;
};

const INITIAL_USERS: AppUser[] = [
  { id: "1", name: "Rajesh Sharma", email: "rajesh.sharma@unilever.com", role: "Admin", department: "IT Operations", isActive: true, createdAt: "2025-01-10" },
  { id: "2", name: "Priya Patel", email: "priya.patel@unilever.com", role: "Network Planner", department: "Supply Chain", isActive: true, createdAt: "2025-02-14" },
  { id: "3", name: "Ankit Verma", email: "ankit.verma@unilever.com", role: "Network Planner", department: "Distribution", isActive: true, createdAt: "2025-02-20" },
  { id: "4", name: "Sneha Gupta", email: "sneha.gupta@unilever.com", role: "Paid Bible Owner", department: "Finance", isActive: true, createdAt: "2025-03-01" },
  { id: "5", name: "Vikram Singh", email: "vikram.singh@unilever.com", role: "Approver", department: "Regional Sales", isActive: true, createdAt: "2025-03-15" },
  { id: "6", name: "Meera Nair", email: "meera.nair@unilever.com", role: "Approver", department: "South Region", isActive: true, createdAt: "2025-04-02" },
  { id: "7", name: "Arun Mehta", email: "arun.mehta@unilever.com", role: "Viewer", department: "Marketing", isActive: false, createdAt: "2025-04-10" },
  { id: "8", name: "Deepa Krishnan", email: "deepa.krishnan@unilever.com", role: "Paid Bible Owner", department: "Pricing", isActive: true, createdAt: "2025-05-05" },
  { id: "9", name: "Suresh Rao", email: "suresh.rao@unilever.com", role: "Viewer", department: "Analytics", isActive: true, createdAt: "2025-05-20" },
  { id: "10", name: "Kavitha Reddy", email: "kavitha.reddy@unilever.com", role: "Network Planner", department: "West Region", isActive: false, createdAt: "2025-06-01" },
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

function AvatarInitials({ name, isActive }: { name: string; isActive: boolean }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className={cn(
      "h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0",
      isActive
        ? "bg-gradient-to-br from-[#1f36c7] to-[#00b0d7]"
        : "bg-slate-300"
    )}>
      {initials}
    </div>
  );
}

function PermIcon({ level }: { level: Permission }) {
  if (level === "full") return <Check className="h-4 w-4 text-emerald-600 mx-auto" />;
  if (level === "partial") return <Minus className="h-4 w-4 text-amber-500 mx-auto" />;
  return <span className="block text-center text-muted-foreground/40 text-sm">—</span>;
}

/* ── Add / Edit User Dialog ────────────────────────────────────── */

type UserFormState = {
  name: string;
  email: string;
  role: Role | "";
  department: string;
};

const EMPTY_FORM: UserFormState = { name: "", email: "", role: "", department: "" };

function UserDialog({
  open,
  onClose,
  onSave,
  initial,
  mode,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: UserFormState) => void;
  initial?: Partial<UserFormState>;
  mode: "add" | "edit";
}) {
  const [form, setForm] = useState<UserFormState>({ ...EMPTY_FORM, ...initial });

  const isValid = form.name.trim() && form.email.trim() && form.role;

  const handleSave = () => {
    if (!isValid) return;
    onSave(form);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add New User" : "Edit User"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
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

          <div className="space-y-1.5">
            <Label htmlFor="um-role">Role <span className="text-destructive">*</span></Label>
            <Select
              value={form.role}
              onValueChange={(v) => setForm((p) => ({ ...p, role: v as Role }))}
            >
              <SelectTrigger id="um-role" data-testid="select-user-role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r} data-testid={`option-role-${r}`}>
                    <div className="flex items-center gap-2">
                      <span>{r}</span>
                      <span className="text-xs text-muted-foreground">— {ROLE_CONFIG[r].description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.role && (
              <p className="text-xs text-muted-foreground">{ROLE_CONFIG[form.role as Role]?.description}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="um-dept">Department</Label>
            <Input
              id="um-dept"
              data-testid="input-user-department"
              placeholder="e.g. Supply Chain"
              value={form.department}
              onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-user-dialog-cancel">Cancel</Button>
          <Button
            disabled={!isValid}
            onClick={handleSave}
            data-testid="button-user-dialog-save"
            className="bg-gradient-to-r from-[#1f36c7] to-[#0d8ecf] text-white hover:opacity-90"
          >
            {mode === "add" ? "Add User" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Roles & Permissions tab ───────────────────────────────────── */

function RolesPermissionsTab() {
  return (
    <div className="space-y-5">
      {/* Role cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {ROLES.map((role) => {
          const cfg = ROLE_CONFIG[role];
          return (
            <div key={role} className="rounded-lg border bg-card p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className={cn("h-7 w-7 rounded-md flex items-center justify-center text-xs font-bold", cfg.bg, cfg.color)}>
                  {role[0]}
                </span>
                <span className={cn("text-sm font-semibold", cfg.color)}>{role}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{cfg.description}</p>
            </div>
          );
        })}
      </div>

      {/* Permissions matrix */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Permissions Matrix</h3>
          <span className="ml-auto text-xs text-muted-foreground flex items-center gap-2">
            <span className="flex items-center gap-1"><Check className="h-3 w-3 text-emerald-600" /> Full</span>
            <span className="flex items-center gap-1"><Minus className="h-3 w-3 text-amber-500" /> Partial</span>
            <span className="text-muted-foreground/50">— None</span>
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
  const [users, setUsers] = useState<AppUser[]>(INITIAL_USERS);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "All">("All");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Inactive">("All");
  const [showDialog, setShowDialog] = useState<"add" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<AppUser | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => {
      const matchSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.department.toLowerCase().includes(q);
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

  const handleToggleStatus = (id: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u;
        const next = { ...u, isActive: !u.isActive };
        toast({
          title: next.isActive ? "User activated" : "User deactivated",
          description: `${next.name} is now ${next.isActive ? "active" : "inactive"}.`,
        });
        return next;
      })
    );
  };

  const handleAdd = (form: UserFormState) => {
    const newUser: AppUser = {
      id: String(Date.now()),
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role as Role,
      department: form.department.trim(),
      isActive: true,
      createdAt: new Date().toISOString().split("T")[0],
    };
    setUsers((prev) => [newUser, ...prev]);
    toast({ title: "User added", description: `${newUser.name} has been added as ${newUser.role}.` });
  };

  const handleEdit = (form: UserFormState) => {
    if (!editTarget) return;
    setUsers((prev) =>
      prev.map((u) =>
        u.id === editTarget.id
          ? { ...u, name: form.name, email: form.email, role: form.role as Role, department: form.department }
          : u
      )
    );
    toast({ title: "User updated", description: `${form.name}'s details have been updated.` });
    setEditTarget(null);
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
        <StatCard label="Total Users" value={stats.total} color="from-[#1f36c7] to-[#0d8ecf]" testId="stat-total-users" />
        <StatCard label="Active" value={stats.active} color="from-emerald-500 to-emerald-600" testId="stat-active-users" />
        <StatCard label="Inactive" value={stats.inactive} color="from-slate-400 to-slate-500" testId="stat-inactive-users" />
        <StatCard label="Roles" value={ROLES.length} color="from-purple-500 to-purple-600" testId="stat-roles-count" />
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
                placeholder="Search name, email, department…"
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
                  <TableHead>Department</TableHead>
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
                      <TableCell className="text-sm text-muted-foreground">{user.department || "—"}</TableCell>
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
                          size="sm"
                          variant="ghost"
                          onClick={() => openEdit(user)}
                          data-testid={`button-edit-user-${user.id}`}
                          className="h-8 px-2 text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          Edit
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
      <UserDialog
        open={showDialog === "add"}
        onClose={() => setShowDialog(null)}
        onSave={handleAdd}
        mode="add"
      />
      {editTarget && (
        <UserDialog
          open={showDialog === "edit"}
          onClose={() => { setShowDialog(null); setEditTarget(null); }}
          onSave={handleEdit}
          initial={{ name: editTarget.name, email: editTarget.email, role: editTarget.role, department: editTarget.department }}
          mode="edit"
        />
      )}
    </div>
  );
}

/* ── Stat card ─────────────────────────────────────────────────── */
function StatCard({ label, value, color, testId }: { label: string; value: number; color: string; testId: string }) {
  return (
    <div className="rounded-lg border bg-card p-4 flex items-center gap-3">
      <div className={cn("h-9 w-9 rounded-md bg-gradient-to-br flex items-center justify-center text-white text-sm font-bold shrink-0", color)}>
        {value}
      </div>
      <span className="text-sm text-muted-foreground leading-tight" data-testid={testId}>{label}</span>
    </div>
  );
}
