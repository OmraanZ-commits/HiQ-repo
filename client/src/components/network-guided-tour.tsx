import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { NetworkGuidedTourContext } from "@/lib/network-guided-tour-context";

type TourStep = {
  selector: string;
  title: string;
  description: string;
  path: "network" | "edit";
  prepareSelector?: string;
  advanceSelector?: string;
};

const STEPS: TourStep[] = [
  {
    selector: '[data-testid="page-header"]',
    title: "Welcome to Network Planning",
    description: "This workspace gives you one view of CBU readiness, ownership, lifecycle status, and network setup.",
    path: "network",
  },
  {
    selector: '[data-testid="summary-total"]',
    title: "Review the network summary",
    description: "Start with the headline counts to understand how many entries are active, in draft, or complete.",
    path: "network",
  },
  {
    selector: '[data-testid="tab-entries"]',
    title: "Open Network entries",
    description: "Use the Network tab to find and work with individual CBUs.",
    path: "network",
  },
  {
    selector: '[data-testid="input-table-search"]',
    title: "Find a CBU quickly",
    description: "Search by CBU code, material description, or brand. You can combine search with filters.",
    path: "network",
    prepareSelector: '[data-testid="tab-entries"]',
  },
  {
    selector: '[data-testid="button-toggle-filters"]',
    title: "Narrow the list",
    description: "Filters let you focus on status, business group, category, pack status, channel, and customer chain.",
    path: "network",
  },
  {
    selector: '[data-testid="network-table-container"]',
    title: "Review network records",
    description: "Each row shows the CBU owner, network type, current status, lifecycle trigger, and available actions.",
    path: "network",
  },
  {
    selector: '[data-testid^="button-edit-"]',
    title: "Open a CBU workspace",
    description: "The pencil action opens the selected CBU. Continue to see its status flow and planning sections.",
    path: "network",
    advanceSelector: '[data-testid^="button-edit-"]',
  },
  {
    selector: '[data-testid="status-flow-container"]',
    title: "Track transition progress",
    description: "The status flow shows where this CBU is in the network transition and which milestones remain.",
    path: "edit",
  },
  {
    selector: '[data-testid="tabs-edit"]',
    title: "Work through planning sections",
    description: "Use these tabs for product data, dimensions, distribution, sourcing, pricing, finance, FTR, and demand visibility.",
    path: "edit",
  },
  {
    selector: '[data-testid="tab-distribution"]',
    title: "Set up distribution",
    description: "Distribution is where geography, depots, channels, and customer mappings are reviewed and maintained.",
    path: "edit",
  },
];

const STORAGE_KEY = "network-planning-guided-tour-status-v1";
function waitForTarget(selector: string, attempts = 30): Promise<HTMLElement | null> {
  return new Promise(resolve => {
    let count = 0;
    const find = () => {
      const element = document.querySelector<HTMLElement>(selector);
      if (element || count >= attempts) {
        resolve(element);
        return;
      }
      count += 1;
      window.setTimeout(find, 100);
    };
    find();
  });
}

function waitForPath(predicate: (path: string) => boolean, attempts = 50): Promise<boolean> {
  return new Promise(resolve => {
    let count = 0;
    const check = () => {
      if (predicate(window.location.pathname)) {
        resolve(true);
        return;
      }
      if (count >= attempts) {
        resolve(false);
        return;
      }
      count += 1;
      window.setTimeout(check, 100);
    };
    check();
  });
}

export function NetworkGuidedTourProvider({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const editPathRef = useRef<string | null>(null);
  const transitionRef = useRef(false);
  const requestRef = useRef(0);
  const launchElementRef = useRef<HTMLElement | null>(null);
  const step = STEPS[stepIndex];

  useEffect(() => {
    if (location.startsWith("/edit/")) editPathRef.current = location;
  }, [location]);

  const close = useCallback((status: "completed" | "dismissed") => {
    requestRef.current += 1;
    localStorage.setItem(STORAGE_KEY, status);
    setActive(false);
    setTransitionError(null);
    setTarget(null);
    setRect(null);
    window.setTimeout(() => {
      const currentHeaderButton = document.querySelector<HTMLElement>(
        '[data-testid="button-network-guided-tour"]'
      );
      if (currentHeaderButton) currentHeaderButton.focus();
      else if (launchElementRef.current?.isConnected) launchElementRef.current.focus();
    }, 0);
  }, []);

  const prepareStep = useCallback(async (nextIndex: number): Promise<boolean> => {
    const request = ++requestRef.current;
    const next = STEPS[nextIndex];
    if (!next) return false;
    setTarget(null);
    setRect(null);
    setTransitionError(null);

    if (next.path === "network" && window.location.pathname !== "/network") {
      navigate("/network");
      const ready = await waitForPath(path => path === "/network");
      if (!ready || request !== requestRef.current) return false;
    } else if (next.path === "edit" && !window.location.pathname.startsWith("/edit/")) {
      if (editPathRef.current) {
        navigate(editPathRef.current);
        const ready = await waitForPath(path => path.startsWith("/edit/"));
        if (!ready || request !== requestRef.current) return false;
      } else {
        setTransitionError("Open a CBU from the Network table before continuing.");
        return false;
      }
    }

    if (next.prepareSelector) {
      const control = await waitForTarget(next.prepareSelector);
      if (request !== requestRef.current) return false;
      control?.click();
    }

    const element = await waitForTarget(next.selector);
    if (request !== requestRef.current) return false;
    setTarget(element);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      window.setTimeout(() => {
        if (request === requestRef.current) setRect(element.getBoundingClientRect());
      }, 250);
      return true;
    } else {
      setRect(null);
      setTransitionError("This item is not available yet. Retry, go back, or skip the tour.");
      return false;
    }
  }, [navigate]);

  const goTo = useCallback(async (nextIndex: number) => {
    if (transitionRef.current || nextIndex < 0) return;
    if (nextIndex >= STEPS.length) {
      close("completed");
      return;
    }

    transitionRef.current = true;
    setTransitioning(true);
    setTransitionError(null);
    const current = STEPS[stepIndex];
    if (nextIndex > stepIndex && current.advanceSelector) {
      const alreadyAdvanced = window.location.pathname.startsWith("/edit/");
      if (!alreadyAdvanced) {
        const control = await waitForTarget(current.advanceSelector);
        if (!control) {
          setTransitionError("No CBU row is available. Clear any filters, then retry this step.");
          transitionRef.current = false;
          setTransitioning(false);
          return;
        }
        control.click();
        const routeReady = await waitForPath(path => path.startsWith("/edit/"));
        if (!routeReady) {
          setTransitionError("The CBU workspace did not open. Retry or go back to the Network list.");
          transitionRef.current = false;
          setTransitioning(false);
          return;
        }
      }
    }

    setStepIndex(nextIndex);
    await prepareStep(nextIndex);
    transitionRef.current = false;
    setTransitioning(false);
  }, [close, prepareStep, stepIndex]);

  const start = useCallback(() => {
    launchElementRef.current = document.activeElement as HTMLElement | null;
    localStorage.removeItem(STORAGE_KEY);
    setActive(true);
    setStepIndex(0);
    setTransitionError(null);
    void prepareStep(0);
  }, [prepareStep]);

  const retry = useCallback(async () => {
    if (transitionRef.current) return;
    transitionRef.current = true;
    setTransitioning(true);
    await prepareStep(stepIndex);
    transitionRef.current = false;
    setTransitioning(false);
  }, [prepareStep, stepIndex]);

  useEffect(() => {
    if (!active || !target) return;
    const update = () => setRect(target.getBoundingClientRect());
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [active, target]);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close("dismissed");
      const focusIsInDialog = !!dialogRef.current?.contains(document.activeElement);
      if (focusIsInDialog && event.key === "ArrowRight") {
        event.preventDefault();
        void goTo(stepIndex + 1);
      }
      if (focusIsInDialog && event.key === "ArrowLeft") {
        event.preventDefault();
        void goTo(stepIndex - 1);
      }
      if (event.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>("button:not(:disabled)")
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!dialogRef.current.contains(document.activeElement)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    window.setTimeout(() => dialogRef.current?.focus(), 0);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [active, close, goTo, stepIndex]);

  const cardStyle = useMemo(() => {
    if (!rect) return { left: 24, top: 100 };
    const width = Math.min(360, window.innerWidth - 32);
    const left = Math.max(16, Math.min(rect.left, window.innerWidth - width - 16));
    const below = rect.bottom + 16;
    const top = below + 230 < window.innerHeight
      ? below
      : Math.max(16, rect.top - 230);
    return { left, top, width };
  }, [rect]);

  return (
    <NetworkGuidedTourContext.Provider value={{ start, active }}>
      {children}
      {active && (
        <div className="pointer-events-none fixed inset-0 z-[100]" aria-live="polite">
          {rect ? (
            <>
              <div className="pointer-events-auto fixed bg-black/55" style={{ left: 0, top: 0, right: 0, height: Math.max(0, rect.top - 6) }} />
              <div className="pointer-events-auto fixed bg-black/55" style={{ left: 0, top: rect.top - 6, width: Math.max(0, rect.left - 6), height: rect.height + 12 }} />
              <div className="pointer-events-auto fixed bg-black/55" style={{ left: rect.right + 6, top: rect.top - 6, right: 0, height: rect.height + 12 }} />
              <div className="pointer-events-auto fixed bg-black/55" style={{ left: 0, top: rect.bottom + 6, right: 0, bottom: 0 }} />
              <div
                className="fixed rounded-lg ring-4 ring-cyan-400/80 pointer-events-none"
                style={{ left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12 }}
              />
            </>
          ) : (
            <div className="pointer-events-auto fixed inset-0 bg-black/55" />
          )}

          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="network-tour-title"
            tabIndex={-1}
            className="pointer-events-auto fixed rounded-xl border border-cyan-200 bg-white p-5 text-slate-900 shadow-2xl outline-none"
            style={cardStyle}
            data-testid="network-guided-tour"
          >
            <button
              onClick={() => close("dismissed")}
              className="absolute right-3 top-3 rounded-md p-1 text-slate-500 hover:bg-slate-100"
              aria-label="Skip guided tour"
              data-testid="button-tour-close"
            >
              <X className="h-4 w-4" />
            </button>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-cyan-700">
              Step {stepIndex + 1} of {STEPS.length}
            </p>
            <h2 id="network-tour-title" className="pr-6 text-lg font-bold">{step.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {rect ? step.description : transitionError ?? "Finding this part of the page…"}
            </p>
            <div className="mt-5 flex items-center justify-between gap-3">
              <Button variant="ghost" size="sm" onClick={() => close("dismissed")}>Skip tour</Button>
              <div className="flex gap-2">
                {!rect && transitionError && (
                  <Button variant="outline" size="sm" onClick={() => void retry()} disabled={transitioning}>
                    Retry
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={stepIndex === 0 || transitioning}
                  onClick={() => void goTo(stepIndex - 1)}
                  data-testid="button-tour-back"
                >
                  <ChevronLeft className="mr-1 h-4 w-4" /> Back
                </Button>
                <Button
                  size="sm"
                  disabled={transitioning || (!rect && step.path === "edit")}
                  onClick={() => void goTo(stepIndex + 1)}
                  data-testid="button-tour-next"
                >
                  {stepIndex === STEPS.length - 1 ? "Finish" : "Next"}
                  {stepIndex < STEPS.length - 1 && <ChevronRight className="ml-1 h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </NetworkGuidedTourContext.Provider>
  );
}