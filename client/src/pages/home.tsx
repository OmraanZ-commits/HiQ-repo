import { useLocation } from "wouter";
import { Network, BookOpen, ArrowRight, BarChart3, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

const MODULES = [
  {
    id: "network",
    title: "Network Planning",
    subtitle: "Network Visibility Central",
    description:
      "Manage new launches and relaunches end-to-end. Track CBU lifecycle from creation through network transition with real-time visibility across all stakeholders.",
    icon: Network,
    path: "/network",
    accent: "from-[#1f36c7] to-[#0d8ecf]",
    features: ["CBU Listing Master", "Status Flow Tracking", "Distribution & Sourcing Matrix", "Lifecycle Flags"],
    badge: "Active",
  },
  {
    id: "paid-bible",
    title: "Paid Bible",
    subtitle: "Assortment & Listing Automation",
    description:
      "Centralized system for tracking, validating, and reporting all assortment across channels. Answers what to sell, where, to whom, how, and when.",
    icon: BookOpen,
    path: "/paid-bible",
    accent: "from-[#0d8ecf] to-[#00b0d7]",
    features: ["Basepack & Material Matrix", "Geo Applicability", "Network Updates Feed", "Amendment Requests"],
    badge: "New",
  },
];

export default function HomePage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1f36c7] via-[#0d8ecf] to-[#00b0d7] flex flex-col">
      {/* Header */}
      <header className="px-10 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1
            className="text-3xl font-bold italic text-white tracking-wide"
            style={{ fontFamily: "'Playfair Display', serif" }}
            data-testid="text-logo"
          >
            Unilever
          </h1>
          <div className="h-6 w-px bg-white/30" />
          <span className="text-white/80 text-sm font-medium tracking-wide uppercase">
            Supply Chain Command Centre
          </span>
        </div>
        <div className="flex items-center gap-2 text-white/70 text-sm">
          <BarChart3 className="h-4 w-4" />
          <span>Self-Healing Master</span>
        </div>
      </header>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/25 rounded-full px-4 py-1.5 mb-6">
            <Layers className="h-3.5 w-3.5 text-white/80" />
            <span className="text-white/90 text-xs font-medium tracking-wide uppercase">
              Network Visibility Portal
            </span>
          </div>
          <h2 className="text-5xl font-bold text-white mb-4 leading-tight">
            Choose Your Module
          </h2>
          <p className="text-white/70 text-lg max-w-xl mx-auto">
            An integrated platform for end-to-end network launch automation, assortment management, and supply chain visibility.
          </p>
        </div>

        {/* Module Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
          {MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <button
                key={mod.id}
                data-testid={`module-card-${mod.id}`}
                onClick={() => navigate(mod.path)}
                className="group relative bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 text-left hover:bg-white/20 hover:border-white/40 hover:scale-[1.02] transition-all duration-200 shadow-xl hover:shadow-2xl"
              >
                {/* Badge */}
                <div className="absolute top-5 right-5">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      mod.badge === "New"
                        ? "bg-emerald-400/20 text-emerald-200 border border-emerald-400/30"
                        : "bg-white/20 text-white/80 border border-white/25"
                    }`}
                  >
                    {mod.badge}
                  </span>
                </div>

                {/* Icon */}
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${mod.accent} flex items-center justify-center mb-5 shadow-lg`}>
                  <Icon className="h-7 w-7 text-white" />
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-white mb-1">{mod.title}</h3>
                <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-3">{mod.subtitle}</p>
                <p className="text-white/75 text-sm leading-relaxed mb-6">{mod.description}</p>

                {/* Features */}
                <ul className="space-y-1.5 mb-7">
                  {mod.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-white/70 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/50 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className="flex items-center gap-2 text-white font-semibold text-sm group-hover:gap-3 transition-all duration-150">
                  <span>Launch Module</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center pb-8 text-white/40 text-xs">
        Unilever Supply Chain · Network Visibility Portal · Part of Self-Healing Master
      </footer>
    </div>
  );
}
