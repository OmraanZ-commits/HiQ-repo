import { STATUS_FLOW } from "@shared/schema";
import { Check, Circle } from "lucide-react";
import { getLifecycleFlagClasses } from "@/controllers/useLifecycleData";

interface StatusFlowProps {
  currentStatus: string | null;
  colorFlag?: string | null;
}

export function StatusFlow({ currentStatus, colorFlag }: StatusFlowProps) {
  const currentIndex = STATUS_FLOW.indexOf(currentStatus as any);

  return (
    <div className="w-full rounded-xl border border-border bg-gradient-to-r from-[#1f36c7]/[0.03] via-[#0d8ecf]/[0.03] to-[#00b0d7]/[0.03] p-4 mb-6" data-testid="status-flow-container">
      <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Status Progress</p>
      <div className="flex items-center w-full overflow-x-auto pb-1">
        {STATUS_FLOW.map((status, idx) => {
          const isCompleted = currentIndex > idx;
          const isCurrent = currentIndex === idx;

          return (
            <div key={status} className="flex items-center flex-1 min-w-0 last:flex-none">
              <div className="flex flex-col items-center gap-1.5 min-w-0">
                <div className="relative">
                  <div
                    className={`flex items-center justify-center w-7 h-7 rounded-full border-2 shrink-0 transition-all ${
                      isCompleted
                        ? "bg-[#0d8ecf] border-[#0d8ecf] text-white"
                        : isCurrent
                          ? "bg-white dark:bg-background border-[#0d8ecf] text-[#0d8ecf] ring-4 ring-[#0d8ecf]/20"
                          : "bg-muted/40 border-muted-foreground/20 text-muted-foreground/40"
                    }`}
                    data-testid={`status-step-${idx}`}
                  >
                    {isCompleted ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Circle className={`h-2.5 w-2.5 ${isCurrent ? "fill-current" : ""}`} />
                    )}
                  </div>
                  {isCurrent && colorFlag && (
                    <span
                      className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-background ${getLifecycleFlagClasses(colorFlag)}`}
                      data-testid="status-flow-flag"
                    />
                  )}
                </div>
                <span
                  className={`text-[10px] leading-tight text-center max-w-[80px] ${
                    isCurrent
                      ? "font-bold text-[#0d8ecf] dark:text-[#4db8e8]"
                      : isCompleted
                        ? "font-medium text-foreground"
                        : "font-normal text-muted-foreground/60"
                  }`}
                  data-testid={`status-label-${idx}`}
                >
                  {status}
                </span>
              </div>
              {idx < STATUS_FLOW.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 mt-[-18px] min-w-[12px] ${
                    isCompleted ? "bg-[#0d8ecf]" : "bg-muted-foreground/15"
                  }`}
                  data-testid={`status-connector-${idx}`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
