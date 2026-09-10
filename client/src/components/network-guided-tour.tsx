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
  prepareSelectors?: string[];
  prepareEvent?: string;
  advanceSelector?: string;
  requiredAttribute?: { name: string; value: string; message: string };
  action?: { label: string; event: string };
  exitOnTargetClick?: boolean;
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
    prepareSelectors: ['[data-testid="tab-entries"]'],
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
    selector: '[data-testid="select-status-filter"]',
    title: "Filter the list to Draft CBUs",
    description: "Choose Draft so the rest of this walkthrough uses a CBU whose planning information can still be updated.",
    path: "network",
    prepareEvent: "network-tour:show-draft-filter",
    requiredAttribute: {
      name: "data-filter-value",
      value: "Draft",
      message: "Select Draft before continuing so the tour opens an editable CBU.",
    },
    action: { label: "Select Draft", event: "network-tour:select-draft" },
  },
  {
    selector: '[data-testid^="button-edit-"][data-network-status="Draft"]',
    title: "Open a Draft CBU workspace",
    description: "This pencil action belongs to a Draft CBU. Continue to update its planning information.",
    path: "network",
    advanceSelector: '[data-testid^="button-edit-"][data-network-status="Draft"]',
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
    selector: '[data-testid="basic-info-fields"]',
    title: "Review Basic Info field definitions",
    description: "Identification fields describe the CBU and are sourced from master data. Locked fields are read-only, while manually maintained fields remain editable.",
    path: "edit",
    prepareSelectors: ['[data-testid="tab-basic"]'],
  },
  {
    selector: '[data-testid="basic-info-editable-fields"]',
    title: "Maintain ownership and timeline",
    description: "Update the assignee and planning dates here. Date rules shown below each field help keep the change, start, and end dates in sequence.",
    path: "edit",
    prepareSelectors: ['[data-testid="tab-basic"]'],
  },
  {
    selector: '[data-testid="distribution-geography-depot"]',
    title: "Fill geography and depot coverage",
    description: "Select each geography the CBU will serve, then choose at least one valid depot for every selected geography.",
    path: "edit",
    prepareSelectors: [
      '[data-testid="tab-distribution"]',
      '[data-testid="tab-distribution-geo-depot"]',
    ],
  },
  {
    selector: '[data-testid="distribution-channel"]',
    title: "Map channels by geography",
    description: "Choose the sales channels available in each geography. These selections drive the distribution and pricing views.",
    path: "edit",
    prepareSelectors: [
      '[data-testid="tab-distribution"]',
      '[data-testid="tab-distribution-channel"]',
    ],
  },
  {
    selector: '[data-testid="tab-customer-mapping"]',
    title: "Open Customer Mapping",
    description: "Use this Distribution sub-tab to maintain customer-chain coverage for modern-trade geographies.",
    path: "edit",
    prepareSelectors: ['[data-testid="tab-distribution"]'],
  },
  {
    selector: '[data-testid="distribution-customer-mapping"]',
    title: "Complete customer-chain mapping",
    description: "Select the applicable customer chains for each modern-trade geography. If no MT geography is configured, this screen explains what is needed first.",
    path: "edit",
    prepareSelectors: [
      '[data-testid="tab-distribution"]',
      '[data-testid="tab-customer-mapping"]',
    ],
  },
  {
    selector: '[data-testid="distribution-matrix"]',
    title: "Review the Distribution Matrix",
    description: "Confirm the combined geography, depot, and channel coverage before moving to sourcing.",
    path: "edit",
    prepareSelectors: [
      '[data-testid="tab-distribution"]',
      '[data-testid="tab-distribution-summary"]',
    ],
  },
  {
    selector: '[data-testid="sourcing-matrix-content"]',
    title: "Configure the Sourcing Matrix",
    description: "Use decentralized sourcing when each depot supplies itself, or centralized sourcing to assign distribution depots to sourcing depots.",
    path: "edit",
    prepareSelectors: ['[data-testid="tab-sourcing"]'],
  },
  {
    selector: '[data-testid^="price-lot-row-"]',
    title: "View price-lot details",
    description: "Open a price lot to review its MRP, validity period, and geographic or channel applicability. The tour does not change pricing.",
    path: "edit",
    prepareSelectors: [
      '[data-testid="tab-pricing"]',
      '[data-testid="tab-price-lots"]',
    ],
  },
  {
    selector: '[data-testid="pricing-status-summary"]',
    title: "Review pricing coverage",
    description: "The pricing status summary shows which geography and channel combinations have an active price.",
    path: "edit",
    prepareSelectors: [
      '[data-testid="tab-pricing"]',
      '[data-testid="tab-pricing-summary"]',
    ],
  },
  {
    selector: '[data-testid="tab-content-finance"]',
    title: "Update Finance Inputs",
    description: "Enter MRP, margins, price-off, and wrapper price here. Select percentage or number where available and resolve validation messages before saving.",
    path: "edit",
    prepareSelectors: ['[data-testid="tab-finance"]'],
  },
  {
    selector: '[data-testid="button-save-draft"]',
    title: "Save the CBU as a Draft",
    description: "Save Draft keeps your updates without activating the CBU. You can use it now, or continue to review the activation action.",
    path: "edit",
    prepareSelectors: ['[data-testid="tab-basic"]'],
    exitOnTargetClick: true,
  },
  {
    selector: '[data-testid="button-activate"]',
    title: "Submit and activate the CBU",
    description: "Submit & Activate validates the required dates, distribution, sourcing, and finance inputs, then asks for confirmation. Activation only occurs after you explicitly confirm.",
    path: "edit",
    exitOnTargetClick: true,
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

function activateControl(control: HTMLElement) {
  // Radix Tabs activates on mousedown rather than a synthetic click alone.
  // Sending the real pointer sequence also remains compatible with standard buttons.
  control.dispatchEvent(new MouseEvent("mousedown", {
    bubbles: true,
    cancelable: true,
    button: 0,
  }));
  control.click();
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

  const exitForBusinessAction = useCallback(() => {
    requestRef.current += 1;
    setActive(false);
    setTransitionError(null);
    setTarget(null);
    setRect(null);
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

    if (next.prepareEvent) {
      window.dispatchEvent(new CustomEvent(next.prepareEvent));
    }

    for (const selector of next.prepareSelectors ?? []) {
      const control = await waitForTarget(selector);
      if (request !== requestRef.current) return false;
      if (!control) {
        setTransitionError("The next section is not available yet. Retry or go back.");
        return false;
      }
      activateControl(control);
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
    if (nextIndex > stepIndex && current.requiredAttribute) {
      const currentTarget = document.querySelector<HTMLElement>(current.selector);
      const { name, value, message } = current.requiredAttribute;
      if (currentTarget?.getAttribute(name) !== value) {
        setTransitionError(message);
        transitionRef.current = false;
        setTransitioning(false);
        return;
      }
    }
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
        activateControl(control);
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

  const runStepAction = useCallback(async () => {
    if (!step.action || transitionRef.current) return;
    transitionRef.current = true;
    setTransitioning(true);
    setTransitionError(null);
    window.dispatchEvent(new CustomEvent(step.action.event));
    await new Promise(resolve => window.setTimeout(resolve, 50));
    await prepareStep(stepIndex);
    transitionRef.current = false;
    setTransitioning(false);
  }, [prepareStep, step, stepIndex]);

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
    if (!active || !target || !step.exitOnTargetClick) return;
    target.addEventListener("click", exitForBusinessAction, { capture: true, once: true });
    return () => target.removeEventListener("click", exitForBusinessAction, { capture: true });
  }, [active, exitForBusinessAction, step.exitOnTargetClick, target]);

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
             aria-describedby="network-tour-description"
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
            <p id="network-tour-description" className="mt-2 text-sm leading-relaxed text-slate-600">
              {transitionError ?? (rect ? step.description : "Finding this part of the page…")}
            </p>
            <div className="mt-5 flex items-center justify-between gap-3">
              <Button variant="ghost" size="sm" onClick={() => close("dismissed")}>Skip tour</Button>
              <div className="flex gap-2">
                {step.action && (
                  <Button variant="outline" size="sm" onClick={runStepAction} disabled={transitioning}>
                    {step.action.label}
                  </Button>
                )}
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