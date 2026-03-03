import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { ChevronDown, Search, X, UserCircle } from "lucide-react";

const TEAM_MEMBERS = [
  { name: "Rajesh Sharma", role: "Supply Chain Lead", department: "BPC" },
  { name: "Priya Patel", role: "Network Planner", department: "Home Care" },
  { name: "Ankit Verma", role: "Category Manager", department: "Foods & Refreshment" },
  { name: "Sneha Gupta", role: "Brand Manager", department: "BPC" },
  { name: "Vikram Singh", role: "Distribution Head", department: "Foods & Refreshment" },
  { name: "Meera Nair", role: "Trade Marketing", department: "Home Care" },
  { name: "Arjun Reddy", role: "Regional Manager", department: "BPC" },
  { name: "Kavita Joshi", role: "Operations Lead", department: "Home Care" },
  { name: "Suresh Kumar", role: "Logistics Manager", department: "Foods & Refreshment" },
  { name: "Deepa Menon", role: "Planning Analyst", department: "BPC" },
];

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
}

export function PeoplePicker({ value, onChange, testId }: PeoplePickerProps) {
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

  const filtered = TEAM_MEMBERS.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.role.toLowerCase().includes(search.toLowerCase()) ||
    m.department.toLowerCase().includes(search.toLowerCase())
  );

  const selectedMember = TEAM_MEMBERS.find(m => m.name === value);

  return (
    <div className="relative" ref={containerRef} data-testid={testId}>
      <button
        type="button"
        className="w-full flex items-center gap-2 border rounded-md px-3 py-2 text-sm bg-background hover:bg-muted/30 transition-colors text-left"
        onClick={() => { setOpen(!open); setSearch(""); }}
        data-testid="button-people-picker-toggle"
      >
        {value && selectedMember ? (
          <>
            <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${getAvatarColor(value)} flex items-center justify-center text-white text-[10px] font-bold shrink-0`}>
              {getInitials(value)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{value}</p>
              <p className="text-[10px] text-muted-foreground truncate">{selectedMember.role}</p>
            </div>
          </>
        ) : (
          <>
            <UserCircle className="h-5 w-5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground flex-1">Select a person...</span>
          </>
        )}
        <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, role, or department..."
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
              <p className="text-xs text-muted-foreground text-center py-4">No matching team members</p>
            ) : (
              filtered.map(member => {
                const isSelected = member.name === value;
                return (
                  <button
                    key={member.name}
                    type="button"
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted/50 transition-colors ${isSelected ? "bg-primary/5" : ""}`}
                    onClick={() => {
                      onChange(member.name);
                      setOpen(false);
                      setSearch("");
                    }}
                    data-testid={`option-person-${member.name.toLowerCase().replace(/\s/g, "-")}`}
                  >
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(member.name)} flex items-center justify-center text-white text-[11px] font-bold shrink-0`}>
                      {getInitials(member.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{member.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{member.role} · {member.department}</p>
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
