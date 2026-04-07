import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { ChevronDown, Search, X, UserCircle, Crown } from "lucide-react";
import { PORTAL_USERS, networkPlannersForBg, type PortalUser } from "@/lib/users-data";

function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = [
    "from-[#1f36c7] to-[#0d8ecf]",
    "from-[#0d8ecf] to-[#00b0d7]",
    "from-[#1f36c7] to-[#00b0d7]",
    "from-[#2a4dd6] to-[#0d8ecf]",
    "from-[#0d6eb0] to-[#00b0d7]",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

interface PeoplePickerProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
  testId?: string;
  /** When provided, restricts the list to active Network Planners in this BG */
  bg?: string | null;
}

export function PeoplePicker({ value, onChange, testId, bg }: PeoplePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* When a BG is provided, restrict to active Network Planners in that BG.
     Otherwise fall back to all active users (legacy behaviour). */
  const pool: PortalUser[] = bg
    ? networkPlannersForBg(bg)
    : PORTAL_USERS.filter(u => u.isActive);

  const filtered = pool.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.businessGroup.toLowerCase().includes(search.toLowerCase())
  );

  const selectedUser = PORTAL_USERS.find(u => u.name === value);

  return (
    <div className="relative" ref={containerRef} data-testid={testId}>
      <button
        type="button"
        className="w-full flex items-center gap-2 border rounded-md px-3 py-2 text-sm bg-background hover:bg-muted/30 transition-colors text-left"
        onClick={() => { setOpen(!open); setSearch(""); }}
        data-testid="button-people-picker-toggle"
      >
        {value && selectedUser ? (
          <>
            <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${getAvatarColor(value)} flex items-center justify-center text-white text-[10px] font-bold shrink-0`}>
              {getInitials(value)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{value}</p>
              <p className="text-[10px] text-muted-foreground truncate">
                {selectedUser.role}
                {selectedUser.isBgLead && " · BG Lead"}
                {selectedUser.businessGroup ? ` · ${selectedUser.businessGroup}` : ""}
              </p>
            </div>
          </>
        ) : (
          <>
            <UserCircle className="h-5 w-5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground flex-1">
              {bg ? `Select a Network Planner (${bg})…` : "Select a person…"}
            </span>
          </>
        )}
        <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg overflow-hidden">
          {/* Header hint when BG-scoped */}
          {bg && (
            <div className="px-3 py-2 bg-[#1f36c7]/5 border-b flex items-center gap-2">
              <span className="text-[11px] font-medium text-[#1f36c7]">
                Network Planners — {bg}
              </span>
              {pool.length === 0 && (
                <span className="text-[11px] text-muted-foreground">(none available)</span>
              )}
            </div>
          )}

          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="pl-8 h-8 text-xs"
                autoFocus
                data-testid="input-people-search"
              />
              {search && (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setSearch("")}
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                {bg ? `No active Network Planners found in ${bg}` : "No matching team members"}
              </p>
            ) : (
              filtered.map(user => {
                const isSelected = user.name === value;
                return (
                  <button
                    key={user.id}
                    type="button"
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted/50 transition-colors ${isSelected ? "bg-primary/5" : ""}`}
                    onClick={() => {
                      onChange(user.name);
                      setOpen(false);
                      setSearch("");
                    }}
                    data-testid={`option-person-${user.name.toLowerCase().replace(/\s/g, "-")}`}
                  >
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(user.name)} flex items-center justify-center text-white text-[11px] font-bold shrink-0`}>
                      {getInitials(user.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium truncate">{user.name}</p>
                        {user.isBgLead && (
                          <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                            <Crown className="h-2.5 w-2.5" />
                            Lead
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <svg className="h-3 w-3 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
