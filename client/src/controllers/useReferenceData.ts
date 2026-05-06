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

export interface RefDataAuditEntry {
  id: string;
  entityType: string;
  entityId: string;
  entityCode: string | null;
  action: string;
  changedByName: string;
  changedByUserId: string | null;
  oldStatus: string | null;
  newStatus: string | null;
  attachmentFilename: string | null;
  attachmentUrl: string | null;
  notes: string | null;
  createdAt: string | null;
}

export interface StatusUpdatePayload {
  status: "Active" | "Inactive";
  attachmentFilename: string;
  attachmentUrl?: string;
  changedByUserId: string;
  notes?: string;
}

export type GeographyDepotMap = Record<string, string[]>;

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

const REFDATA_KEYS = {
  channels: ["/api/reference-data/channels"],
  clusters: ["/api/reference-data/clusters"],
  depots: ["/api/reference-data/depots"],
  networkChangeTypes: ["/api/reference-data/network-change-types"],
  geographyDepotMap: ["/api/reference-data/geography-depot-map"],
  auditLog: ["/api/reference-data/audit-log"],
};

interface _AuditFields {
  attachmentFilename: string;
  attachmentUrl?: string;
  changedByUserId: string;
  notes?: string;
}

export interface CreateChannelPayload extends _AuditFields {
  code: string;
  name?: string;
  type: string;
  parentCode?: string;
  isActive: boolean;
}

export interface CreateClusterPayload extends _AuditFields {
  name: string;
  region: string;
  depotCount?: number;
  stateIds?: string[];
  isActive: boolean;
}

export interface CreateDepotPayload extends _AuditFields {
  code: string;
  name?: string;
  clusterId?: string;
  isActive: boolean;
}

export interface CreateNetworkChangeTypePayload extends _AuditFields {
  code: string;
  name: string;
  category?: string;
  isActive: boolean;
}

function invalidateAll() {
  Object.values(REFDATA_KEYS).forEach((key) =>
    queryClient.invalidateQueries({ queryKey: key })
  );
}

/**
 * Controller hook that fetches reference data via the saga endpoint
 * and exposes status-update mutations.
 */
export function useReferenceData() {
  const { toast } = useToast();

  const sagaMutation = useMutation<SagaReferenceDataResponse, Error, void>({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/saga/reference-data");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(REFDATA_KEYS.channels, data.data.channels);
      queryClient.setQueryData(REFDATA_KEYS.clusters, data.data.clusters);
      queryClient.setQueryData(REFDATA_KEYS.depots, data.data.depots);
      queryClient.setQueryData(REFDATA_KEYS.networkChangeTypes, data.data.networkChangeTypes);
      queryClient.setQueryData(REFDATA_KEYS.geographyDepotMap, data.data.geographyDepotMap);
      queryClient.setQueryData(["/api/reference-data"], data.data);
    },
    onError: (err: Error) => {
      toast({ title: "Reference Data Error", description: err.message, variant: "destructive" });
    },
  });

  // ── Status update mutations ──────────────────────────────────

  function makeStatusMutationFn(entityPath: string) {
    return async ({ id, payload }: { id: string; payload: StatusUpdatePayload }) => {
      await apiRequest("PATCH", `/api/reference-data/${entityPath}/${id}/status`, payload);
    };
  }

  const updateChannelStatus = useMutation<unknown, Error, { id: string; payload: StatusUpdatePayload }>({
    mutationFn: makeStatusMutationFn("channels"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REFDATA_KEYS.channels });
      queryClient.invalidateQueries({ queryKey: REFDATA_KEYS.auditLog });
    },
    onError: (err: Error) => toast({ title: "Status Update Failed", description: err.message, variant: "destructive" }),
  });

  const updateClusterStatus = useMutation<unknown, Error, { id: string; payload: StatusUpdatePayload }>({
    mutationFn: makeStatusMutationFn("clusters"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REFDATA_KEYS.clusters });
      queryClient.invalidateQueries({ queryKey: REFDATA_KEYS.auditLog });
    },
    onError: (err: Error) => toast({ title: "Status Update Failed", description: err.message, variant: "destructive" }),
  });

  const updateDepotStatus = useMutation<unknown, Error, { id: string; payload: StatusUpdatePayload }>({
    mutationFn: makeStatusMutationFn("depots"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REFDATA_KEYS.depots });
      queryClient.invalidateQueries({ queryKey: REFDATA_KEYS.auditLog });
    },
    onError: (err: Error) => toast({ title: "Status Update Failed", description: err.message, variant: "destructive" }),
  });

  const updateNetworkChangeTypeStatus = useMutation<unknown, Error, { id: string; payload: StatusUpdatePayload }>({
    mutationFn: makeStatusMutationFn("network-change-types"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REFDATA_KEYS.networkChangeTypes });
      queryClient.invalidateQueries({ queryKey: REFDATA_KEYS.auditLog });
    },
    onError: (err: Error) => toast({ title: "Status Update Failed", description: err.message, variant: "destructive" }),
  });

  // ── Create mutations ─────────────────────────────────────────

  const createChannel = useMutation<ChannelMaster, Error, CreateChannelPayload>({
    mutationFn: async (payload) => {
      const res = await apiRequest("POST", "/api/reference-data/channels", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REFDATA_KEYS.channels });
      queryClient.invalidateQueries({ queryKey: REFDATA_KEYS.auditLog });
    },
    onError: (err: Error) => toast({ title: "Failed to Create Channel", description: err.message, variant: "destructive" }),
  });

  const createCluster = useMutation<ClusterMaster, Error, CreateClusterPayload>({
    mutationFn: async (payload) => {
      const res = await apiRequest("POST", "/api/reference-data/clusters", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REFDATA_KEYS.clusters });
      queryClient.invalidateQueries({ queryKey: REFDATA_KEYS.auditLog });
    },
    onError: (err: Error) => toast({ title: "Failed to Create Cluster", description: err.message, variant: "destructive" }),
  });

  const createDepot = useMutation<DepotMaster, Error, CreateDepotPayload>({
    mutationFn: async (payload) => {
      const res = await apiRequest("POST", "/api/reference-data/depots", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REFDATA_KEYS.depots });
      queryClient.invalidateQueries({ queryKey: REFDATA_KEYS.auditLog });
    },
    onError: (err: Error) => toast({ title: "Failed to Create Depot", description: err.message, variant: "destructive" }),
  });

  const createNetworkChangeType = useMutation<NetworkChangeTypeMaster, Error, CreateNetworkChangeTypePayload>({
    mutationFn: async (payload) => {
      const res = await apiRequest("POST", "/api/reference-data/network-change-types", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REFDATA_KEYS.networkChangeTypes });
      queryClient.invalidateQueries({ queryKey: REFDATA_KEYS.auditLog });
    },
    onError: (err: Error) => toast({ title: "Failed to Create Change Type", description: err.message, variant: "destructive" }),
  });

  // ── Queries ──────────────────────────────────────────────────

  const channelsQuery = useQuery<ChannelMaster[]>({ queryKey: REFDATA_KEYS.channels, staleTime: Infinity });
  const clustersQuery = useQuery<ClusterMaster[]>({ queryKey: REFDATA_KEYS.clusters, staleTime: Infinity });
  const depotsQuery = useQuery<DepotMaster[]>({ queryKey: REFDATA_KEYS.depots, staleTime: Infinity });
  const networkChangeTypesQuery = useQuery<NetworkChangeTypeMaster[]>({ queryKey: REFDATA_KEYS.networkChangeTypes, staleTime: Infinity });
  const geographyDepotMapQuery = useQuery<GeographyDepotMap>({ queryKey: REFDATA_KEYS.geographyDepotMap, staleTime: Infinity });
  const auditLogQuery = useQuery<RefDataAuditEntry[]>({ queryKey: REFDATA_KEYS.auditLog, staleTime: 0 });

  const channels = channelsQuery.data ?? [];
  const clusters = clustersQuery.data ?? [];
  const depots = depotsQuery.data ?? [];
  const networkChangeTypes = networkChangeTypesQuery.data ?? [];
  const geographyDepotMap = geographyDepotMapQuery.data ?? {};
  const auditLog = auditLogQuery.data ?? [];

  const topChannels: ChannelDef[] = channels
    .filter(c => c.isActive && !c.parentCode && c.code !== "MT")
    .map(c => ({ code: c.code, type: c.type as "Core" | "Traditional" | "Modern Trade" }));

  const mtSubChannels: ChannelDef[] = channels
    .filter(c => c.isActive && c.parentCode === "MT")
    .map(c => ({ code: c.code, type: c.type as "Core" | "Traditional" | "Modern Trade", parent: c.parentCode || undefined }));

  const leafChannels: ChannelDef[] = [...topChannels, ...mtSubChannels];

  const isLoading =
    sagaMutation.isPending ||
    channelsQuery.isLoading ||
    clustersQuery.isLoading ||
    depotsQuery.isLoading ||
    networkChangeTypesQuery.isLoading;

  return {
    channels,
    clusters,
    depots,
    networkChangeTypes,
    geographyDepotMap,
    auditLog,
    topChannels,
    mtSubChannels,
    leafChannels,
    isLoading,
    isAuditLogLoading: auditLogQuery.isLoading,
    sagaStatus: sagaMutation.data?.status ?? null,
    sagaSteps: sagaMutation.data?.steps ?? [],
    fetchViaSaga: () => sagaMutation.mutate(),
    isSagaPending: sagaMutation.isPending,
    updateChannelStatus,
    updateClusterStatus,
    updateDepotStatus,
    updateNetworkChangeTypeStatus,
    createChannel,
    createCluster,
    createDepot,
    createNetworkChangeType,
  };
}
