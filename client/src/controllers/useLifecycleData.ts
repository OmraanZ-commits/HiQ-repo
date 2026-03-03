import { useQuery } from "@tanstack/react-query";

export interface LifecycleEntry {
  entryId: string;
  colorFlag: "amber" | "red" | "blinking-red" | null;
  flagLabel: string | null;
  urgencyLevel: number;
  doh: number | null;
  currentStatus: string;
}

interface LifecycleResponse {
  service: string;
  data: Record<string, LifecycleEntry>;
}

export function useLifecycleData() {
  const query = useQuery<LifecycleResponse>({
    queryKey: ["/api/lifecycle"],
    staleTime: 30000,
  });

  const lifecycleMap: Record<string, LifecycleEntry> = query.data?.data ?? {};

  return {
    lifecycleMap,
    isLoading: query.isLoading,
  };
}

export function getLifecycleFlagClasses(flag: string | null | undefined): string {
  switch (flag) {
    case "amber":
      return "bg-amber-500";
    case "red":
      return "bg-red-600";
    case "blinking-red":
      return "bg-red-600 lifecycle-blink";
    default:
      return "";
  }
}
