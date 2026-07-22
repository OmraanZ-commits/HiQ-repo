import { useState } from "react";
import {
  Package, Globe, Waypoints, Users, Network, Calendar, DollarSign,
  Box, Trash2, ArchiveX, PowerOff, Leaf, ArrowUpRight, ChevronRight
} from "lucide-react";

// ── Data ───────────────────────────────────────────────────────────────────
const BASEPACK_SRS = [
  { code: "bp-activation",    label: "Basepack Activation",             icon: Package,   pending: 8,  approved: 12, rejected: 2, lastRaised: "2026-07-20" },
  { code: "bp-delisting",     label: "Basepack Delisting",              icon: Trash2,    pending: 3,  approved: 5,  rejected: 1, lastRaised: "2026-07-18" },
  { code: "bp-stock-delist",  label: "Basepack Stock Based Delisting",  icon: ArchiveX,  pending: 2,  approved: 3,  rejected: 0, lastRaised: "2026-07-15" },
  { code: "bp-inactivation",  label: "Basepack Inactivation",           icon: PowerOff,  pending: 5,  approved: 8,  rejected: 2, lastRaised: "2026-07-21" },
  { code: "bp-seasonal",      label: "Basepack Seasonal Pack Activation",icon: Leaf,     pending: 1,  approved: 4,  rejected: 0, lastRaised: "2026-07-10" },
];

const AMENDMENT_SRS = [
  { code: "geo-amd",          label: "Geo Amendment",                   icon: Globe,     pending: 26, approved: 6,  rejected: 1, lastRaised: "2026-07-22" },
  { code: "channel-amd",      label: "Channel Amendment",               icon: Waypoints, pending: 5,  approved: 2,  rejected: 0, lastRaised: "2026-07-21" },
  { code: "customer-amd",     label: "Customer Chain Amendment",        icon: Users,     pending: 8,  approved: 3,  rejected: 2, lastRaised: "2026-07-20" },
  { code: "sourcing-amd",     label: "Sourcing Amendment",              icon: Box,       pending: 4,  approved: 5,  rejected: 1, lastRaised: "2026-07-19" },
  { code: "nw-date-amd",      label: "Network Change Date Amendment",   icon: Calendar,  pending: 3,  approved: 7,  rejected: 0, lastRaised: "2026-07-17" },
  { code: "price-amd",        label: "Price Change Request Amendment",  icon: DollarSign,pending: 14, approved: 7,  rejected: 4, lastRaised: "2026-07-22" },
];

const totalPending  = [...BASEPACK_SRS, ...AMENDMENT_SRS].reduce((s, r) => s + r.pending, 0);
const totalApproved = [...BASEPACK_SRS, ...AMENDMENT_SRS].reduce((s, r) => s + r.approved, 0);
const totalRejected = [...BASEPACK_SRS, ...AMENDMENT_SRS].reduce((s, r) => s + r.rejected, 0);
const totalAll      = totalPending + totalApproved + totalRejected;

function subtotal(rows: typeof BASEPACK_SRS) {
  return {
    pending:  rows.reduce((s, r) => s + r.pending, 0),
    approved: rows.reduce((s, r) => s + r.approved, 0),
    rejected: rows.reduce((s, r) => s + r.rejected, 0),
    total:    rows.reduce((s, r) => s + r.pending + r.approved + r.rejected, 0),
  };
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" });
}

// ── Row component ───────────────────────────────────────────────────────────
function SRRow({ sr, shade }: { sr: typeof BASEPACK_SRS[0]; shade: boolean }) {
  const [hov, setHov] = useState(false);
  const total = sr.pending + sr.approved + sr.rejected;
  const Icon = sr.icon;
  return (
    <tr
      className={`border-b border-slate-100 last:border-0 transition-colors ${shade ? "bg-slate-50/40" : "bg-white"} ${hov ? "bg-[#1f36c7]/[0.03]" : ""}`}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {/* SR Type */}
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="h-6 w-6 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
            <Icon size={12} className="text-slate-500" />
          </div>
          <span className="text-xs font-medium text-slate-700">{sr.label}</span>
        </div>
      </td>

      {/* Pending — clickable */}
      <td className="px-4 py-2.5 text-center">
        {sr.pending > 0 ? (
          <button
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-xs font-bold text-amber-700 hover:bg-amber-100 hover:border-amber-300 transition-colors group"
            title={`View pending ${sr.label} SRs`}
          >
            {sr.pending}
            <ChevronRight size={10} className="opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform" />
          </button>
        ) : (
          <span className="text-slate-200 text-xs tabular-nums">—</span>
        )}
      </td>

      {/* Approved */}
      <td className="px-4 py-2.5 text-center">
        {sr.approved > 0
          ? <span className="text-xs font-semibold tabular-nums text-emerald-600">{sr.approved}</span>
          : <span className="text-slate-200 text-xs">—</span>
        }
      </td>

      {/* Rejected */}
      <td className="px-4 py-2.5 text-center">
        {sr.rejected > 0
          ? <span className="text-xs font-semibold tabular-nums text-red-500">{sr.rejected}</span>
          : <span className="text-slate-200 text-xs">—</span>
        }
      </td>

      {/* Total */}
      <td className="px-4 py-2.5 text-center">
        <span className="text-xs font-bold tabular-nums text-[#1f36c7]">{total}</span>
      </td>

      {/* Last raised */}
      <td className="px-4 py-2.5 text-right">
        <span className="text-[10px] text-slate-400 tabular-nums">{fmt(sr.lastRaised)}</span>
      </td>
    </tr>
  );
}

// ── Subtotal row ────────────────────────────────────────────────────────────
function SubtotalRow({ data }: { data: ReturnType<typeof subtotal> }) {
  return (
    <tr className="bg-slate-100/60 border-y border-slate-200">
      <td className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide">Subtotal</td>
      <td className="px-4 py-2 text-center">
        {data.pending > 0
          ? <span className="text-xs font-black text-amber-700">{data.pending}</span>
          : <span className="text-slate-300 text-xs">—</span>}
      </td>
      <td className="px-4 py-2 text-center">
        <span className="text-xs font-black text-emerald-600">{data.approved}</span>
      </td>
      <td className="px-4 py-2 text-center">
        {data.rejected > 0
          ? <span className="text-xs font-black text-red-500">{data.rejected}</span>
          : <span className="text-slate-300 text-xs">—</span>}
      </td>
      <td className="px-4 py-2 text-center">
        <span className="text-xs font-black text-[#1f36c7]">{data.total}</span>
      </td>
      <td />
    </tr>
  );
}

// ── Section header ──────────────────────────────────────────────────────────
function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <tr className="bg-[#1f36c7]/[0.04] border-y border-[#1f36c7]/10">
      <td colSpan={6} className="px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#1f36c7]">{label}</span>
          <span className="px-1.5 py-0.5 rounded bg-[#1f36c7]/10 text-[9px] font-bold text-[#1f36c7] tabular-nums">{count} types</span>
        </div>
      </td>
    </tr>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export function SRTracker() {
  const bpSub  = subtotal(BASEPACK_SRS);
  const amdSub = subtotal(AMENDMENT_SRS);

  return (
    <div className="min-h-screen bg-slate-50 p-5 font-sans text-sm space-y-4">

      {/* Design label */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">SR Tracker — Redesign</span>
        <span className="text-xs text-slate-400">Grouped matrix · 11 SR types · click Pending to filter</span>
      </div>

      {/* ── Summary strip ── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Pending",  value: totalPending,  bg: "bg-amber-50   border-amber-200",  text: "text-amber-700",  sub: "across all SR types" },
          { label: "Total Approved", value: totalApproved, bg: "bg-emerald-50 border-emerald-200",text: "text-emerald-700",sub: "all time" },
          { label: "Total Rejected", value: totalRejected, bg: "bg-red-50     border-red-200",    text: "text-red-600",    sub: "needs review" },
          { label: "Total Raised",   value: totalAll,      bg: "bg-[#1f36c7]/5 border-[#1f36c7]/20", text: "text-[#1f36c7]", sub: "11 SR types" },
        ].map(m => (
          <div key={m.label} className={`rounded-xl border px-4 py-3 ${m.bg}`}>
            <p className={`text-2xl font-black tabular-nums ${m.text}`}>{m.value}</p>
            <p className={`text-[10px] font-semibold mt-0.5 ${m.text} opacity-70`}>{m.label}</p>
            <p className="text-[9px] text-slate-400 mt-0.5">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Main table ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

        {/* Card header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Network size={14} className="text-[#1f36c7]" />
            <p className="text-sm font-bold text-slate-800">Service Request &amp; Amendment Tracker</p>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-400" /> Pending = click to view &amp; filter
            </span>
          </div>
        </div>

        <table className="w-full text-xs">

          {/* Column headers */}
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="text-left px-4 py-2.5 font-semibold text-[10px] text-slate-400 uppercase tracking-wide w-[38%]">SR Type</th>
              <th className="text-center px-4 py-2.5 font-semibold text-[10px] text-amber-600 uppercase tracking-wide w-[13%]">Pending</th>
              <th className="text-center px-4 py-2.5 font-semibold text-[10px] text-emerald-600 uppercase tracking-wide w-[13%]">Approved</th>
              <th className="text-center px-4 py-2.5 font-semibold text-[10px] text-red-500 uppercase tracking-wide w-[13%]">Rejected</th>
              <th className="text-center px-4 py-2.5 font-semibold text-[10px] text-[#1f36c7] uppercase tracking-wide w-[10%]">Total</th>
              <th className="text-right px-4 py-2.5 font-semibold text-[10px] text-slate-400 uppercase tracking-wide w-[13%]">Last Raised</th>
            </tr>
          </thead>

          <tbody>
            {/* Basepack section */}
            <SectionHeader label="Basepack Service Requests" count={BASEPACK_SRS.length} />
            {BASEPACK_SRS.map((sr, i) => <SRRow key={sr.code} sr={sr} shade={i % 2 === 1} />)}
            <SubtotalRow data={bpSub} />

            {/* Amendment section */}
            <SectionHeader label="Amendment Requests" count={AMENDMENT_SRS.length} />
            {AMENDMENT_SRS.map((sr, i) => <SRRow key={sr.code} sr={sr} shade={i % 2 === 1} />)}
            <SubtotalRow data={amdSub} />

            {/* Grand total */}
            <tr className="bg-[#1f36c7]/[0.06] border-t-2 border-[#1f36c7]/20">
              <td className="px-4 py-2.5 text-xs font-black text-[#1f36c7] uppercase tracking-wide">Grand Total</td>
              <td className="px-4 py-2.5 text-center">
                <span className="text-sm font-black text-amber-700">{totalPending}</span>
              </td>
              <td className="px-4 py-2.5 text-center">
                <span className="text-sm font-black text-emerald-600">{totalApproved}</span>
              </td>
              <td className="px-4 py-2.5 text-center">
                <span className="text-sm font-black text-red-500">{totalRejected}</span>
              </td>
              <td className="px-4 py-2.5 text-center">
                <span className="text-sm font-black text-[#1f36c7]">{totalAll}</span>
              </td>
              <td />
            </tr>
          </tbody>
        </table>

        {/* Footer note */}
        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
          <p className="text-[10px] text-slate-400">
            <span className="font-semibold text-amber-600">Pending</span> counts are clickable — navigates to Service Requests page pre-filtered by SR type and status, showing request timestamp.
          </p>
        </div>
      </div>
    </div>
  );
}
