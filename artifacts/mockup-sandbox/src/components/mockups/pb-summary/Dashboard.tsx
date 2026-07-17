import { useState } from "react";
import {
  Package, Clock, AlertTriangle, Globe, Waypoints, Users, Banknote,
  ChevronDown, ChevronRight, Filter, X, CheckCircle2, XCircle,
  Truck, Rocket, BarChart3, TrendingUp, RefreshCw,
} from "lucide-react";

// ── Mock data ──────────────────────────────────────────────────────────────
const SMALL_C_LIST = ["Colour Cosmetics", "Skin Care", "Hair Care", "Deos", "Oral Care"];
const BG_LIST = ["Beauty & WB", "Home Care", "Foods & Refreshments"];
const FORMAT_LIST = ["Bar", "Liquid", "Powder", "Cream", "Gel"];
const PACK_STATUS_LIST = ["Active", "Draft", "Inactive", "Seasonal", "Stock Base Delisted", "Delisted"];
const CHANNEL_LIST = ["GT", "MT", "CSD", "RD", "Ecom", "Qcom"];
const SUB_CH_LIST = ["Urban", "Rural", "Semi-Urban"];
const CUSTOMER_LIST = ["DMart", "BigBazaar", "Reliance", "Amazon", "Flipkart"];

const BP_STATUS_DEFS = [
  { key: "Active",              color: "#10b981", bg: "bg-emerald-500", light: "bg-emerald-50 text-emerald-700" },
  { key: "Draft",               color: "#94a3b8", bg: "bg-slate-400",   light: "bg-slate-50 text-slate-500"    },
  { key: "Inactive",            color: "#64748b", bg: "bg-slate-500",   light: "bg-slate-100 text-slate-600"   },
  { key: "Seasonal",            color: "#8b5cf6", bg: "bg-violet-500",  light: "bg-violet-50 text-violet-700"  },
  { key: "Stock Base Delisted", color: "#f97316", bg: "bg-orange-500",  light: "bg-orange-50 text-orange-700"  },
  { key: "Delisted",            color: "#ef4444", bg: "bg-red-500",     light: "bg-red-50 text-red-700"        },
];

const BP_BY_SCAT: Record<string, Record<string, number>> = {
  "Colour Cosmetics": { Active: 12, Draft: 3, Inactive: 1, Seasonal: 2, "Stock Base Delisted": 1, Delisted: 0 },
  "Skin Care":        { Active: 8,  Draft: 5, Inactive: 2, Seasonal: 0, "Stock Base Delisted": 2, Delisted: 1 },
  "Hair Care":        { Active: 6,  Draft: 2, Inactive: 0, Seasonal: 1, "Stock Base Delisted": 0, Delisted: 0 },
  "Deos":             { Active: 4,  Draft: 1, Inactive: 1, Seasonal: 3, "Stock Base Delisted": 0, Delisted: 0 },
  "Oral Care":        { Active: 5,  Draft: 2, Inactive: 0, Seasonal: 0, "Stock Base Delisted": 1, Delisted: 0 },
};

const SR_TYPES = [
  { code: "geo",     label: "Geo Extension",     icon: Globe,    pending: 26, approved: 6,  rejected: 1, color: "#10b981", border: "border-emerald-200", bg: "bg-emerald-50",  dot: "bg-emerald-500" },
  { code: "channel", label: "Channel Extension",  icon: Waypoints,pending: 5,  approved: 2,  rejected: 0, color: "#8b5cf6", border: "border-violet-200",  bg: "bg-violet-50",   dot: "bg-violet-500"  },
  { code: "cust",    label: "Customer Extension", icon: Users,    pending: 8,  approved: 3,  rejected: 2, color: "#3b82f6", border: "border-blue-200",    bg: "bg-blue-50",     dot: "bg-blue-500"    },
  { code: "pricing", label: "Pricing Issues",     icon: Banknote, pending: 14, approved: 7,  rejected: 4, color: "#f59e0b", border: "border-amber-200",   bg: "bg-amber-50",    dot: "bg-amber-500"   },
];

const SLOB_DATA = [
  { scat: "Colour Cosmetics", cbUs: 4, dcCombos: 12, mrpExposure: 18.4 },
  { scat: "Skin Care",        cbUs: 2, dcCombos: 6,  mrpExposure: 9.1  },
  { scat: "Hair Care",        cbUs: 1, dcCombos: 3,  mrpExposure: 4.7  },
];

const DISPATCH_BUCKETS = [
  { label: "0 – 15 days",  accent: "text-emerald-700", ring: "ring-1 ring-emerald-200", bg: "bg-emerald-50", items: [
    { code: "CBU-5001", desc: "Lux Rose Bar 100g",    grammage: "100g", mrp: "₹25", artwork: "v2", cc: "CC01", cp: "CP03" },
    { code: "CBU-5002", desc: "Dove Cream Bar 75g",   grammage: "75g",  mrp: "₹30", artwork: "v1", cc: "CC02", cp: "CP01" },
  ]},
  { label: "16 – 30 days", accent: "text-amber-700",   ring: "ring-1 ring-amber-200",   bg: "bg-amber-50",   items: [
    { code: "CBU-5010", desc: "Sunsilk Shampoo 180ml", grammage: "180ml", mrp: "₹85", artwork: "v3", cc: "CC01", cp: "CP02" },
  ]},
  { label: "31 – 60 days", accent: "text-orange-700",  ring: "ring-1 ring-orange-200",  bg: "bg-orange-50",  items: [
    { code: "CBU-5020", desc: "Pepsodent 100g",        grammage: "100g",  mrp: "₹50", artwork: "v1", cc: "CC03", cp: "CP02" },
    { code: "CBU-5021", desc: "Close-Up 80g",          grammage: "80g",   mrp: "₹40", artwork: "v2", cc: "CC01", cp: "CP01" },
  ]},
];

const RELAUNCH_DATA = [
  { label: "0 – 15 days",  accent: "text-emerald-700", bg: "bg-emerald-50", ring: "ring-1 ring-emerald-200", items: [
    { code: "CBU-6001", desc: "Dove Body Bar 100g", grammage: "100g", mrp: "₹55", artwork: "v3", cc: "CC02", cp: "CP01" },
  ]},
  { label: "16 – 30 days", accent: "text-amber-700",   bg: "bg-amber-50",   ring: "ring-1 ring-amber-200",   items: [
    { code: "CBU-6010", desc: "TRESemmé 400ml",      grammage: "400ml", mrp: "₹220", artwork: "v1", cc: "CC01", cp: "CP03" },
    { code: "CBU-6011", desc: "Clinic Plus 100ml",   grammage: "100ml", mrp: "₹75",  artwork: "v2", cc: "CC02", cp: "CP01" },
  ]},
  { label: "31 – 60 days", accent: "text-orange-700",  bg: "bg-orange-50",  ring: "ring-1 ring-orange-200",  items: [] },
];

const MSTN_SCATS: Record<string, { cleared: number; notCleared: number; exception: number }> = {
  "Colour Cosmetics": { cleared: 8,  notCleared: 4, exception: 1 },
  "Skin Care":        { cleared: 5,  notCleared: 7, exception: 2 },
  "Hair Care":        { cleared: 6,  notCleared: 2, exception: 0 },
  "Deos":             { cleared: 4,  notCleared: 3, exception: 1 },
  "Oral Care":        { cleared: 3,  notCleared: 4, exception: 0 },
};

const MOC_OPTIONS = ["MOC 1","MOC 2","MOC 3","MOC 4","MOC 5","MOC 6","MOC 7","MOC 8","MOC 9","MOC 10","MOC 11","MOC 12"];

// ── Helpers ────────────────────────────────────────────────────────────────
function MultiChip({ label, options, selected, onChange }: {
  label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const toggle = (o: string) => {
    onChange(selected.includes(o) ? selected.filter(x => x !== o) : [...selected, o]);
  };
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
          selected.length > 0
            ? "bg-[#1f36c7] text-white border-[#1f36c7]"
            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
        }`}
      >
        <Filter className="h-3 w-3" />
        {label}
        {selected.length > 0 && (
          <span className="ml-0.5 bg-white/25 text-white rounded-full px-1.5 text-[10px] font-bold">{selected.length}</span>
        )}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[160px] py-1">
          {options.map(o => (
            <button
              key={o}
              onClick={() => toggle(o)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-slate-50"
            >
              <div className={`h-3.5 w-3.5 rounded border flex-shrink-0 flex items-center justify-center ${
                selected.includes(o) ? "bg-[#1f36c7] border-[#1f36c7]" : "border-slate-300"
              }`}>
                {selected.includes(o) && <span className="text-white text-[8px]">✓</span>}
              </div>
              <span className="text-slate-700">{o}</span>
            </button>
          ))}
          {selected.length > 0 && (
            <div className="border-t border-slate-100 mt-1 pt-1 px-3 pb-1">
              <button onClick={() => { onChange([]); setOpen(false); }} className="text-[10px] text-slate-400 hover:text-slate-600">
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, badge, color = "#1f36c7" }: {
  icon: React.ElementType; title: string; badge?: string | number; color?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + "15" }}>
        <Icon className="h-3.5 w-3.5" style={{ color }} />
      </div>
      <h2 className="text-sm font-bold text-slate-800">{title}</h2>
      {badge !== undefined && (
        <span className="ml-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">{badge}</span>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export function Dashboard() {
  // Filter state
  const [fBg, setFBg]           = useState<string[]>([]);
  const [fScat, setFScat]       = useState<string[]>([]);
  const [fFormat, setFFormat]   = useState<string[]>([]);
  const [fStatus, setFStatus]   = useState<string[]>([]);
  const [fChannel, setFChannel] = useState<string[]>([]);
  const [fSub, setFSub]         = useState<string[]>([]);
  const [fCust, setFCust]       = useState<string[]>([]);

  const hasFilters = [fBg, fScat, fFormat, fStatus, fChannel, fSub, fCust].some(f => f.length > 0);
  const clearAll = () => { setFBg([]); setFScat([]); setFFormat([]); setFStatus([]); setFChannel([]); setFSub([]); setFCust([]); };

  const [selMoc, setSelMoc] = useState("MOC 7");
  const [expandedSlob, setExpandedSlob] = useState<string | null>(null);
  const [expandedDispatch, setExpandedDispatch] = useState<number | null>(0);
  const [expandedRelaunch, setExpandedRelaunch] = useState<number | null>(0);
  const [agingOpen, setAgingOpen] = useState<string | null>(null);

  // Totals for KPI strip
  const allBps = Object.values(BP_BY_SCAT);
  const totalBps   = allBps.reduce((s, row) => s + Object.values(row).reduce((a,b) => a+b, 0), 0);
  const activeBps  = allBps.reduce((s, row) => s + row.Active, 0);
  const draftBps   = allBps.reduce((s, row) => s + row.Draft, 0);
  const totalSrPending = SR_TYPES.reduce((s, t) => s + t.pending, 0);
  const slobTotal  = SLOB_DATA.reduce((s, r) => s + r.cbUs, 0);
  const slobMrp    = SLOB_DATA.reduce((s, r) => s + r.mrpExposure, 0);

  return (
    <div className="min-h-screen bg-slate-50 font-['Inter',sans-serif]">

      {/* ── Page header ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-3.5 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#1f36c7] to-[#0d8ecf] flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900">Paid Bible · Summary</h1>
              <p className="text-[10px] text-slate-400">Assortment & network health overview</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <RefreshCw className="h-3 w-3" />
            Synced: Jul 17, 2026 — 09:30
          </div>
        </div>
      </div>

      <div className="px-6 py-5 space-y-7 max-w-[1300px] mx-auto">

        {/* ── Filter bar ── */}
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Filters</span>
            <MultiChip label="BG"           options={BG_LIST}          selected={fBg}      onChange={setFBg}      />
            <MultiChip label="Sales Cat."   options={SMALL_C_LIST}     selected={fScat}    onChange={setFScat}    />
            <MultiChip label="Format"       options={FORMAT_LIST}      selected={fFormat}  onChange={setFFormat}  />
            <MultiChip label="Pack Status"  options={PACK_STATUS_LIST} selected={fStatus}  onChange={setFStatus}  />
            <MultiChip label="Channel"      options={CHANNEL_LIST}     selected={fChannel} onChange={setFChannel} />
            <MultiChip label="Sub Channel"   options={SUB_CH_LIST}      selected={fSub}     onChange={setFSub}     />
            <MultiChip label="Customer"     options={CUSTOMER_LIST}    selected={fCust}    onChange={setFCust}    />
            {hasFilters && (
              <button onClick={clearAll} className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 ml-auto">
                <X className="h-3 w-3" /> Clear all filters
              </button>
            )}
          </div>
        </div>

        {/* ── KPI strip — compact inline row ── */}
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: "Total Basepacks", value: totalBps, sub: `${activeBps} active · ${draftBps} draft`, icon: Package,       gFrom: "from-[#1f36c7]", gTo: "to-[#0d8ecf]" },
            { label: "Active",          value: activeBps, sub: `${Math.round(activeBps/totalBps*100)}% of portfolio`,    icon: CheckCircle2,   gFrom: "from-emerald-500", gTo: "to-emerald-600" },
            { label: "Pending SRs",     value: totalSrPending, sub: `${SR_TYPES.reduce((s,t)=>s+t.approved,0)} approved this month`, icon: Clock,          gFrom: "from-amber-400",   gTo: "to-amber-600" },
            { label: "SLOB CBUs",       value: slobTotal, sub: `₹${slobMrp.toFixed(1)}L exposure (MRP)`, icon: AlertTriangle,  gFrom: "from-red-400",     gTo: "to-rose-600" },
            { label: "Price Inactive",  value: 1,         sub: "MSTN ≥ 80%, price not live",              icon: Banknote,       gFrom: "from-orange-400",  gTo: "to-orange-600" },
          ].map(kpi => (
            <div key={kpi.label} className={`rounded-xl p-3.5 text-white bg-gradient-to-br ${kpi.gFrom} ${kpi.gTo} shadow-sm`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest opacity-75">{kpi.label}</p>
                  <p className="text-2xl font-black tabular-nums leading-tight mt-1">{kpi.value}</p>
                  <p className="text-[10px] opacity-65 font-medium mt-0.5">{kpi.sub}</p>
                </div>
                <kpi.icon className="h-5 w-5 opacity-40 mt-0.5 shrink-0" />
              </div>
            </div>
          ))}
        </div>

        {/* ── Section 1: Pack Summary ── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b border-slate-100">
            <SectionHeader icon={BarChart3} title="Pack Summary & Status" badge={`${totalBps} basepacks`} />
            <div className="flex items-center gap-4 flex-wrap">
              {BP_STATUS_DEFS.map(d => (
                <span key={d.key} className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <span className={`inline-block h-2 w-2 rounded-sm ${d.bg}`} />{d.key}
                </span>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-5 py-2 font-semibold text-slate-500 text-[10px] uppercase tracking-wider">Small C</th>
                  {BP_STATUS_DEFS.map(d => (
                    <th key={d.key} className="text-center px-3 py-2 font-semibold text-[10px] uppercase tracking-wider" style={{ color: d.color }}>{d.key}</th>
                  ))}
                  <th className="text-center px-4 py-2 font-semibold text-[10px] uppercase tracking-wider text-[#1f36c7]">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {Object.entries(BP_BY_SCAT).map(([cat, counts]) => {
                  const total = Object.values(counts).reduce((a, b) => a + b, 0);
                  return (
                    <tr key={cat} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-2.5 font-medium text-slate-700">{cat}</td>
                      {BP_STATUS_DEFS.map(d => (
                        <td key={d.key} className="text-center px-3 py-2.5 tabular-nums">
                          {counts[d.key] > 0
                            ? <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${d.light}`}>{counts[d.key]}</span>
                            : <span className="text-slate-200 text-sm">—</span>
                          }
                        </td>
                      ))}
                      <td className="text-center px-4 py-2.5 font-bold text-slate-700 tabular-nums">{total}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td className="px-5 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wide">Total</td>
                  {BP_STATUS_DEFS.map(d => {
                    const n = Object.values(BP_BY_SCAT).reduce((s, row) => s + (row[d.key] || 0), 0);
                    return (
                      <td key={d.key} className="text-center px-3 py-2.5 tabular-nums font-bold" style={{ color: n > 0 ? d.color : "#e2e8f0" }}>
                        {n > 0 ? n : "—"}
                      </td>
                    );
                  })}
                  <td className="text-center px-4 py-2.5 font-black text-[#1f36c7] tabular-nums">{totalBps}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ── Section 2: SR Tracker ── */}
        <div>
          <SectionHeader icon={TrendingUp} title="Service Request & Amendment Tracker" />
          <div className="grid grid-cols-4 gap-3">
            {SR_TYPES.map(sr => {
              const Icon = sr.icon;
              const total = sr.pending + sr.approved + sr.rejected;
              return (
                <div key={sr.code} className={`rounded-xl border ${sr.border} ${sr.bg} overflow-hidden`}>
                  <div className="px-3.5 py-2.5 flex items-center gap-2 border-b border-white/70">
                    <div className={`h-6 w-6 rounded-full ${sr.dot} flex items-center justify-center shrink-0`}>
                      <Icon className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 flex-1">{sr.label}</span>
                    <button
                      className="text-[10px] text-slate-400 hover:text-slate-700 underline underline-offset-2"
                      onClick={() => {}}
                    >
                      {total} →
                    </button>
                  </div>
                  <div className="flex divide-x divide-white/60">
                    {[
                      { label: "Pending",  val: sr.pending,  color: sr.pending > 0  ? "text-amber-600" : "text-slate-300", hint: "Double-click for aging" },
                      { label: "Approved", val: sr.approved, color: sr.approved > 0 ? "text-emerald-600" : "text-slate-300" },
                      { label: "Rejected", val: sr.rejected, color: sr.rejected > 0 ? "text-red-600" : "text-slate-300" },
                    ].map(col => (
                      <div
                        key={col.label}
                        className="flex-1 flex flex-col items-center justify-center py-3 gap-0.5 cursor-pointer"
                        title={col.hint}
                        onDoubleClick={() => col.label === "Pending" && setAgingOpen(sr.code)}
                      >
                        <span className={`text-xl font-black tabular-nums leading-none ${col.color}`}>{col.val}</span>
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">{col.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5 ml-0.5">Double-click Pending count to view aging report</p>
        </div>

        {/* ── Section 3: SLOB Risk ── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center gap-3">
            <div className="h-7 w-7 rounded-lg bg-red-50 flex items-center justify-center">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
            </div>
            <h2 className="text-sm font-bold text-slate-800">SLOB Risk & Network Exposure</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 ml-1">
              {slobTotal} CBUs · {SLOB_DATA.reduce((s,r)=>s+r.dcCombos,0)} CBU×DC combos
            </span>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-5 py-2 font-semibold text-slate-500 text-[10px] uppercase tracking-wider">Small C</th>
                <th className="text-center px-4 py-2 font-semibold text-[10px] uppercase tracking-wider text-red-600">CBUs at Risk</th>
                <th className="text-center px-4 py-2 font-semibold text-[10px] uppercase tracking-wider text-orange-600">CBU × DC Combos</th>
                <th className="text-right px-5 py-2 font-semibold text-[10px] uppercase tracking-wider text-slate-500">MRP Exposure</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {SLOB_DATA.map(row => (
                <>
                  <tr
                    key={row.scat}
                    className="hover:bg-red-50/30 cursor-pointer"
                    onClick={() => setExpandedSlob(expandedSlob === row.scat ? null : row.scat)}
                  >
                    <td className="px-5 py-2.5 font-medium text-slate-700">{row.scat}</td>
                    <td className="text-center px-4 py-2.5">
                      <span className="font-black text-red-600 tabular-nums">{row.cbUs}</span>
                    </td>
                    <td className="text-center px-4 py-2.5">
                      <span className="font-bold text-orange-600 tabular-nums">{row.dcCombos}</span>
                    </td>
                    <td className="text-right px-5 py-2.5 font-semibold text-slate-700 tabular-nums">₹{row.mrpExposure}L</td>
                    <td className="pr-4 text-slate-400">
                      {expandedSlob === row.scat ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </td>
                  </tr>
                  {expandedSlob === row.scat && (
                    <tr key={`${row.scat}-detail`}>
                      <td colSpan={5} className="px-5 py-3 bg-red-50/20">
                        <p className="text-[10px] text-slate-400 italic">Depot-level breakdown available — click to drill down to {row.scat} SLOB detail view</p>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50">
                <td className="px-5 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wide">Total</td>
                <td className="text-center px-4 py-2.5 font-black text-red-600 tabular-nums">{slobTotal}</td>
                <td className="text-center px-4 py-2.5 font-bold text-orange-600 tabular-nums">{SLOB_DATA.reduce((s,r)=>s+r.dcCombos,0)}</td>
                <td className="text-right px-5 py-2.5 font-black text-slate-700 tabular-nums">₹{slobMrp.toFixed(1)}L</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ── Sections 4 + 5: Side-by-side Relaunch + Dispatch ── */}
        <div className="grid grid-cols-2 gap-4">

          {/* Relaunch Buckets */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 pt-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5 mb-0">
                <div className="h-7 w-7 rounded-lg bg-violet-50 flex items-center justify-center">
                  <Rocket className="h-3.5 w-3.5 text-violet-600" />
                </div>
                <h2 className="text-sm font-bold text-slate-800">Relaunch & Network Buckets</h2>
              </div>
            </div>
            <div className="divide-y divide-slate-100 flex-1">
              {RELAUNCH_DATA.map((bucket, i) => (
                <div key={i}>
                  <div
                    className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-slate-50/60 select-none"
                    onClick={() => setExpandedRelaunch(expandedRelaunch === i ? null : i)}
                  >
                    <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${bucket.bg} ${bucket.accent} ${bucket.ring}`}>
                      {bucket.label}
                    </div>
                    <span className="text-sm font-black text-slate-700 tabular-nums ml-auto">{bucket.items.length}</span>
                    <span className="text-[10px] text-slate-400">basepacks</span>
                    {expandedRelaunch === i ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                  </div>
                  {expandedRelaunch === i && bucket.items.length > 0 && (
                    <div className="px-5 pb-3">
                      <table className="w-full text-[11px] border border-slate-100 rounded-lg overflow-hidden">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            {["CBU", "Description", "Grammage", "MRP", "Artwork", "CC", "CP"].map(h => (
                              <th key={h} className="text-left px-2.5 py-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {bucket.items.map(item => (
                            <tr key={item.code} className="hover:bg-blue-50/30">
                              <td className="px-2.5 py-1.5 font-mono font-semibold text-slate-700">{item.code}</td>
                              <td className="px-2.5 py-1.5 text-slate-600 max-w-[8rem] truncate" title={item.desc}>{item.desc}</td>
                              <td className="px-2.5 py-1.5 text-slate-600">{item.grammage}</td>
                              <td className="px-2.5 py-1.5 font-semibold text-slate-700">{item.mrp}</td>
                              <td className="px-2.5 py-1.5 text-slate-500">{item.artwork}</td>
                              <td className="px-2.5 py-1.5 text-slate-500">{item.cc}</td>
                              <td className="px-2.5 py-1.5 text-slate-500">{item.cp}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {expandedRelaunch === i && bucket.items.length === 0 && (
                    <p className="px-5 pb-3 text-xs text-slate-400 italic">No basepacks in this window</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Dispatch Start Tracking */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 pt-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Truck className="h-3.5 w-3.5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Dispatch Start Tracking</h2>
                  <p className="text-[10px] text-slate-400">ITR stock entering pipeline networks</p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-slate-100 flex-1">
              {DISPATCH_BUCKETS.map((bucket, i) => (
                <div key={i}>
                  <div
                    className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-slate-50/60 select-none"
                    onClick={() => setExpandedDispatch(expandedDispatch === i ? null : i)}
                  >
                    <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${bucket.bg} ${bucket.accent} ${bucket.ring}`}>
                      {bucket.label}
                    </div>
                    <span className="text-sm font-black text-slate-700 tabular-nums ml-auto">{bucket.items.length}</span>
                    <span className="text-[10px] text-slate-400">basepacks</span>
                    {expandedDispatch === i ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                  </div>
                  {expandedDispatch === i && bucket.items.length > 0 && (
                    <div className="px-5 pb-3">
                      <table className="w-full text-[11px] border border-slate-100 rounded-lg overflow-hidden">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            {["CBU", "Description", "Grammage", "MRP", "Artwork", "CC", "CP"].map(h => (
                              <th key={h} className="text-left px-2.5 py-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {bucket.items.map(item => (
                            <tr key={item.code} className="hover:bg-blue-50/30">
                              <td className="px-2.5 py-1.5 font-mono font-semibold text-slate-700">{item.code}</td>
                              <td className="px-2.5 py-1.5 text-slate-600 max-w-[8rem] truncate" title={item.desc}>{item.desc}</td>
                              <td className="px-2.5 py-1.5 text-slate-600">{item.grammage}</td>
                              <td className="px-2.5 py-1.5 font-semibold text-slate-700">{item.mrp}</td>
                              <td className="px-2.5 py-1.5 text-slate-500">{item.artwork}</td>
                              <td className="px-2.5 py-1.5 text-slate-500">{item.cc}</td>
                              <td className="px-2.5 py-1.5 text-slate-500">{item.cp}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Section 6: MSTN Readiness ── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              <h2 className="text-sm font-bold text-slate-800">MSTN & Launch Readiness</h2>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[10px] text-slate-400">MOC</span>
              <select
                value={selMoc}
                onChange={e => setSelMoc(e.target.value)}
                className="h-7 text-xs px-2.5 border border-slate-200 rounded-lg bg-white text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#1f36c7]"
              >
                {MOC_OPTIONS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-5 px-5 py-2.5 border-b border-slate-50 bg-slate-50/40 text-[10px]">
            {[
              { label: "MSTN Cleared",         color: "bg-emerald-500" },
              { label: "MSTN Not Cleared",      color: "bg-red-500"     },
              { label: "Exception Clearance",   color: "bg-amber-500"   },
            ].map(l => (
              <span key={l.label} className="flex items-center gap-1.5 text-slate-500">
                <span className={`inline-block h-2 w-2 rounded-full ${l.color}`} />{l.label}
              </span>
            ))}
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-5 py-2 font-semibold text-slate-500 text-[10px] uppercase tracking-wider">Small C</th>
                <th className="text-center px-4 py-2 font-semibold text-[10px] uppercase tracking-wider text-emerald-600">MSTN Cleared</th>
                <th className="text-center px-4 py-2 font-semibold text-[10px] uppercase tracking-wider text-red-600">Not Cleared</th>
                <th className="text-center px-4 py-2 font-semibold text-[10px] uppercase tracking-wider text-amber-600">Exception</th>
                <th className="text-center px-4 py-2 font-semibold text-[10px] uppercase tracking-wider text-slate-400">Total CBUs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {Object.entries(MSTN_SCATS).map(([cat, counts]) => {
                const total = counts.cleared + counts.notCleared + counts.exception;
                const pct = total > 0 ? Math.round(counts.cleared / total * 100) : 0;
                return (
                  <tr key={cat} className="hover:bg-slate-50/50">
                    <td className="px-5 py-2.5 font-medium text-slate-700">
                      {cat}
                      <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                    <td className="text-center px-4 py-2.5">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-black text-xs">{counts.cleared}</span>
                    </td>
                    <td className="text-center px-4 py-2.5">
                      {counts.notCleared > 0
                        ? <span className="inline-block px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 font-black text-xs">{counts.notCleared}</span>
                        : <span className="text-slate-200">—</span>}
                    </td>
                    <td className="text-center px-4 py-2.5">
                      {counts.exception > 0
                        ? <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-black text-xs">{counts.exception}</span>
                        : <span className="text-slate-200">—</span>}
                    </td>
                    <td className="text-center px-4 py-2.5 font-bold text-slate-600 tabular-nums">{total}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50">
                <td className="px-5 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wide">All Small C</td>
                <td className="text-center px-4 py-2.5">
                  <span className="font-black text-emerald-600 tabular-nums">
                    {Object.values(MSTN_SCATS).reduce((s, c) => s + c.cleared, 0)}
                  </span>
                </td>
                <td className="text-center px-4 py-2.5">
                  <span className="font-black text-red-600 tabular-nums">
                    {Object.values(MSTN_SCATS).reduce((s, c) => s + c.notCleared, 0)}
                  </span>
                </td>
                <td className="text-center px-4 py-2.5">
                  <span className="font-black text-amber-600 tabular-nums">
                    {Object.values(MSTN_SCATS).reduce((s, c) => s + c.exception, 0)}
                  </span>
                </td>
                <td className="text-center px-4 py-2.5 font-black text-[#1f36c7] tabular-nums">
                  {Object.values(MSTN_SCATS).reduce((s, c) => s + c.cleared + c.notCleared + c.exception, 0)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Aging dialog simulation */}
        {agingOpen && (
          <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" onClick={() => setAgingOpen(null)}>
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-96 p-5" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm text-slate-800">
                  Aging — {SR_TYPES.find(s => s.code === agingOpen)?.label}
                </h3>
                <button onClick={() => setAgingOpen(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-1.5 font-semibold text-slate-500 text-[10px] uppercase">SR ID</th>
                    <th className="text-left py-1.5 font-semibold text-slate-500 text-[10px] uppercase">Basepack</th>
                    <th className="text-right py-1.5 font-semibold text-slate-500 text-[10px] uppercase">Age (days)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {[
                    { id: "SR-000012", bp: "BP-FTR1", age: 12 },
                    { id: "SR-000018", bp: "BP-FTR3", age: 7  },
                    { id: "SR-000024", bp: "BP-FTR6", age: 21 },
                  ].map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="py-1.5 font-mono text-slate-700">{r.id}</td>
                      <td className="py-1.5 text-slate-600">{r.bp}</td>
                      <td className={`py-1.5 text-right font-bold tabular-nums ${r.age > 14 ? "text-red-600" : r.age > 7 ? "text-amber-600" : "text-emerald-600"}`}>
                        {r.age}d
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
