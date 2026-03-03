import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export interface ChannelMaster {
  id: string;
  code: string;
  name: string | null;
  type: string;
  parentCode: string | null;
  isActive: boolean;
  createdAt: string | null;
}

export interface ClusterMaster {
  id: string;
  name: string;
  region: string;
  depotCount: number | null;
  stateIds: string[];
  pinX: number | null;
  pinY: number | null;
  isActive: boolean;
  createdAt: string | null;
}

export interface DepotMaster {
  id: string;
  code: string;
  name: string | null;
  clusterId: string | null;
  isActive: boolean;
  createdAt: string | null;
}

export interface ReferenceData {
  channels: ChannelMaster[];
  clusters: ClusterMaster[];
  depots: DepotMaster[];
}

interface SagaReferenceDataResponse {
  sagaId: string;
  status: string;
  data: ReferenceData;
  steps: Array<{
    name: string;
    status: string;
    result: unknown;
    error: string | null;
    compensated: boolean;
  }>;
}

/**
 * Controller hook that fetches reference data via the saga endpoint.
 * Saga orchestrator coordinates fetching channels → clusters → depots
 * with automatic compensation on failure.
 */
export function useReferenceData() {
  const { toast } = useToast();

  // Trigger saga via POST to load all reference data
  const sagaMutation = useMutation<SagaReferenceDataResponse, Error, void>({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/saga/reference-data");
      return res.json();
    },
    onSuccess: (data) => {
      // Cache the individual lists so they can be consumed independently
      queryClient.setQueryData(["/api/reference-data/channels"], data.data.channels);
      queryClient.setQueryData(["/api/reference-data/clusters"], data.data.clusters);
      queryClient.setQueryData(["/api/reference-data/depots"], data.data.depots);
      queryClient.setQueryData(["/api/reference-data"], data.data);
    },
    onError: (err: Error) => {
      toast({ title: "Reference Data Error", description: err.message, variant: "destructive" });
    },
  });

  // Direct REST queries (used as cache readers after saga populates)
  const channelsQuery = useQuery<ChannelMaster[]>({
    queryKey: ["/api/reference-data/channels"],
    staleTime: Infinity,
  });

  const clustersQuery = useQuery<ClusterMaster[]>({
    queryKey: ["/api/reference-data/clusters"],
    staleTime: Infinity,
  });

  const depotsQuery = useQuery<DepotMaster[]>({
    queryKey: ["/api/reference-data/depots"],
    staleTime: Infinity,
  });

  const channels = channelsQuery.data ?? [];
  const clusters = clustersQuery.data ?? [];
  const depots = depotsQuery.data ?? [];

  const isLoading =
    sagaMutation.isPending ||
    channelsQuery.isLoading ||
    clustersQuery.isLoading ||
    depotsQuery.isLoading;

  return {
    channels,
    clusters,
    depots,
    isLoading,
    sagaStatus: sagaMutation.data?.status ?? null,
    sagaSteps: sagaMutation.data?.steps ?? [],
    fetchViaSaga: () => sagaMutation.mutate(),
    isSagaPending: sagaMutation.isPending,
  };
}
