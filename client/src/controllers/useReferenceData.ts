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

export interface NetworkChangeTypeMaster {
  id: string;
  code: string;
  name: string;
  category: string | null;
  isActive: boolean;
  createdAt: string | null;
}

export type GeographyDepotMap = Record<string, string[]>;

// Channel definition interface matching the static data structure
export interface ChannelDef {
  code: string;
  type: "Core" | "Traditional" | "Modern Trade";
  parent?: string;
}

export interface ReferenceData {
  channels: ChannelMaster[];
  clusters: ClusterMaster[];
  depots: DepotMaster[];
  networkChangeTypes: NetworkChangeTypeMaster[];
  geographyDepotMap: GeographyDepotMap;
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
      queryClient.setQueryData(["/api/reference-data/network-change-types"], data.data.networkChangeTypes);
      queryClient.setQueryData(["/api/reference-data/geography-depot-map"], data.data.geographyDepotMap);
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

  const networkChangeTypesQuery = useQuery<NetworkChangeTypeMaster[]>({
    queryKey: ["/api/reference-data/network-change-types"],
    staleTime: Infinity,
  });

  const geographyDepotMapQuery = useQuery<GeographyDepotMap>({
    queryKey: ["/api/reference-data/geography-depot-map"],
    staleTime: Infinity,
  });

  const channels = channelsQuery.data ?? [];
  const clusters = clustersQuery.data ?? [];
  const depots = depotsQuery.data ?? [];
  const networkChangeTypes = networkChangeTypesQuery.data ?? [];
  const geographyDepotMap = geographyDepotMapQuery.data ?? {};

  // Derive channel structures from API data
  // TOP_CHANNELS: Core and Traditional channels (not MT parent)
  const topChannels: ChannelDef[] = channels
    .filter(c => c.isActive && !c.parentCode && c.code !== "MT")
    .map(c => ({
      code: c.code,
      type: c.type as "Core" | "Traditional" | "Modern Trade",
    }));

  // MT_SUB_CHANNELS: Channels with MT as parent
  const mtSubChannels: ChannelDef[] = channels
    .filter(c => c.isActive && c.parentCode === "MT")
    .map(c => ({
      code: c.code,
      type: c.type as "Core" | "Traditional" | "Modern Trade",
      parent: c.parentCode || undefined,
    }));

  // LEAF_CHANNELS: All selectable channels (topChannels + mtSubChannels)
  const leafChannels: ChannelDef[] = [...topChannels, ...mtSubChannels];

  const isLoading =
    sagaMutation.isPending ||
    channelsQuery.isLoading ||
    clustersQuery.isLoading ||
    depotsQuery.isLoading ||
    networkChangeTypesQuery.isLoading ||
    geographyDepotMapQuery.isLoading;

  return {
    channels,
    clusters,
    depots,
    networkChangeTypes,
    geographyDepotMap,
    // Derived channel structures for UI components
    topChannels,
    mtSubChannels,
    leafChannels,
    isLoading,
    sagaStatus: sagaMutation.data?.status ?? null,
    sagaSteps: sagaMutation.data?.steps ?? [],
    fetchViaSaga: () => sagaMutation.mutate(),
    isSagaPending: sagaMutation.isPending,
  };
}
