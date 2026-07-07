import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useParams } from "wouter";
import { useState, useEffect } from "react";
import { TOP_CHANNELS as STATIC_TOP_CHANNELS, MT_SUB_CHANNELS as STATIC_MT_SUB_CHANNELS, GEOGRAPHY_DEPOT_MAP as STATIC_GEOGRAPHY_DEPOT_MAP, CLUSTERS as STATIC_CLUSTERS, CUSTOMER_CHAINS, type ClusterDef } from "@/lib/distribution-data";
import { addDays, computeYear } from "@/lib/date-utils";
import type { NetworkEntry, InsertNetworkEntry } from "@shared/schema";
import { STATUS_FLOW } from "@shared/schema";
import type { GeographyDepotMap, ChannelDef } from "@/controllers/useReferenceData";

interface UseNetworkEntryFormOptions {
  geographyDepotMap?: GeographyDepotMap;
  topChannels?: ChannelDef[];
  mtSubChannels?: ChannelDef[];
  clusters?: ClusterDef[];
}

export function useNetworkEntryForm(options: UseNetworkEntryFormOptions = {}) {
  const { 
    geographyDepotMap = STATIC_GEOGRAPHY_DEPOT_MAP,
    topChannels = STATIC_TOP_CHANNELS,
    mtSubChannels = STATIC_MT_SUB_CHANNELS,
    clusters = STATIC_CLUSTERS,
  } = options;
  
  // Derive leafChannels from the provided channel arrays
  const leafChannels = [...topChannels, ...mtSubChannels];
  
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data: entry, isLoading } = useQuery<NetworkEntry>({
    queryKey: ["/api/network-entries", id],
  });

  const [form, setForm] = useState<InsertNetworkEntry | null>(null);
  const [activeTab, setActiveTab] = useState("basic");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    if (entry && !form) {
      const autoChangeDate = (!entry.networkChangeDate && entry.cbuCreatedDate)
        ? addDays(entry.cbuCreatedDate, 15)
        : entry.networkChangeDate;
      setForm({
        cbuCreatedDate: entry.cbuCreatedDate,
        networkChangeDate: autoChangeDate,
        annexureNumber: entry.annexureNumber,
        basepack: entry.basepack,
        basepackDescription: entry.basepackDescription,
        bg: entry.bg,
        profitCentre: entry.profitCentre,
        salesCategory: entry.salesCategory,
        smallC: entry.smallC,
        brand: entry.brand,
        format: entry.format,
        cbuCode: entry.cbuCode,
        materialDescription: entry.materialDescription,
        typeOfNetwork: entry.typeOfNetwork,
        copyCbu: entry.copyCbu,
        year: entry.year,
        networkStatus: entry.networkStatus,
        startDate: entry.startDate,
        endDate: entry.endDate,
        caseConfig: entry.caseConfig,
        ean: entry.ean,
        netWeight: entry.netWeight,
        grossWeight: entry.grossWeight,
        length: entry.length,
        width: entry.width,
        height: entry.height,
        itf: entry.itf,
        ftrImagesLink: entry.ftrImagesLink,
        predecessorCode: entry.predecessorCode,
        successorCode: entry.successorCode,
        headerCode: entry.headerCode,
        csdIndexNo: entry.csdIndexNo,
        pcAtChannelState: entry.pcAtChannelState,
        sourcingMatrixSection: entry.sourcingMatrixSection,
        assignedPerson: entry.assignedPerson,
        geography: entry.geography || [],
        depot: entry.depot || [],
        channel: entry.channel || [],
        channelMapping: (entry.channelMapping as Record<string, string[]>) || {},
        customerMapping: (entry.customerMapping as Record<string, string[]>) || {},
      });
    }
  }, [entry]);

  const updateMutation = useMutation({
    mutationFn: (data: InsertNetworkEntry) =>
      apiRequest("PATCH", `/api/network-entries/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/network-entries"] });
      toast({ title: "Entry updated successfully" });
      navigate("/network");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateField = (field: keyof InsertNetworkEntry, value: any) => {
    setForm(prev => {
      if (!prev) return prev;
      return { ...prev, [field]: value };
    });
  };

  const deriveChannelFromMapping = (mapping: Record<string, string[]>): string[] => {
    const all = new Set<string>();
    Object.values(mapping).forEach(channels => channels.forEach(c => all.add(c)));
    const mtSubCodes = mtSubChannels.map(c => c.code);
    if (mtSubCodes.some(c => all.has(c))) all.add("MT");
    return Array.from(all);
  };

  // Helper to get available depots based on selected geographies using the provided map
  const getAvailableDepotsFromMap = (selectedGeographies: string[]): string[] => {
    if (selectedGeographies.length === 0) return [];
    const depotSet = new Set<string>();
    selectedGeographies.forEach(geo => {
      const depots = geographyDepotMap[geo] || [];
      depots.forEach(d => depotSet.add(d));
    });
    return Array.from(depotSet).sort();
  };

  const toggleArrayItem = (field: "geography" | "depot", value: string) => {
    setForm(prev => {
      if (!prev) return prev;
      const arr = (prev[field] as string[]) || [];
      const updated = arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
      if (field === "geography") {
        const mapping = { ...((prev.channelMapping as Record<string, string[]>) || {}) };
        const isAdding = !arr.includes(value);
        if (isAdding) {
          if (!mapping[value]) mapping[value] = [];
        } else {
          delete mapping[value];
        }
        // Clean up depots that are no longer valid for the selected geographies
        const availableDepots = getAvailableDepotsFromMap(updated);
        const currentDepots = (prev.depot as string[]) || [];
        let cleanedDepots = currentDepots.filter(d => availableDepots.includes(d));
        
        // Auto-select depot if geography has only 1 depot
        if (isAdding) {
          const geoDepots = geographyDepotMap[value] || [];
          if (geoDepots.length === 1 && !cleanedDepots.includes(geoDepots[0])) {
            cleanedDepots = [...cleanedDepots, geoDepots[0]];
          }
        }
        
        return { ...prev, [field]: updated, depot: cleanedDepots, channelMapping: mapping, channel: deriveChannelFromMapping(mapping) };
      }
      return { ...prev, [field]: updated };
    });
  };

  const toggleGeoChannel = (geo: string, channelCode: string) => {
    setForm(prev => {
      if (!prev) return prev;
      const mapping = { ...((prev.channelMapping as Record<string, string[]>) || {}) };
      const geoChannels = [...(mapping[geo] || [])];
      const mtSubCodes = mtSubChannels.map(c => c.code);

      if (channelCode === "MT") {
        const hasMT = mtSubCodes.every(c => geoChannels.includes(c));
        if (hasMT) {
          mapping[geo] = geoChannels.filter(c => c !== "MT" && !mtSubCodes.includes(c));
        } else {
          const merged = new Set([...geoChannels, "MT", ...mtSubCodes]);
          mapping[geo] = Array.from(merged);
        }
      } else {
        if (geoChannels.includes(channelCode)) {
          mapping[geo] = geoChannels.filter(c => c !== channelCode);
          if (mtSubCodes.includes(channelCode)) {
            mapping[geo] = mapping[geo].filter(c => c !== "MT");
          }
        } else {
          mapping[geo] = [...geoChannels, channelCode];
          if (mtSubCodes.includes(channelCode) && mtSubCodes.every(c => c === channelCode || mapping[geo].includes(c))) {
            mapping[geo] = [...mapping[geo], "MT"];
          }
        }
      }
      return { ...prev, channelMapping: mapping, channel: deriveChannelFromMapping(mapping) };
    });
  };

  const toggleAllGeoChannels = (geo: string) => {
    setForm(prev => {
      if (!prev) return prev;
      const mapping = { ...((prev.channelMapping as Record<string, string[]>) || {}) };
      const leafCodes = leafChannels.map(c => c.code);
      const allCodes = ["MT", ...leafCodes];
      const geoChannels = mapping[geo] || [];
      const isAllSelected = leafCodes.every(c => geoChannels.includes(c));
      mapping[geo] = isAllSelected ? [] : [...allCodes];
      return { ...prev, channelMapping: mapping, channel: deriveChannelFromMapping(mapping) };
    });
  };

  // Toggle a single channel (or "MT" = all MT sub-channels) across ALL selected geos at once.
  // If every geo already has it → remove; otherwise → add to all.
  const toggleColumnChannel = (channelCode: string) => {
    setForm(prev => {
      if (!prev) return prev;
      const geos = (prev.geography as string[]) || [];
      const mapping = { ...((prev.channelMapping as Record<string, string[]>) || {}) };
      const mtSubCodes = mtSubChannels.map(c => c.code);

      if (channelCode === "MT") {
        const allHave = geos.every(geo => mtSubCodes.every(c => (mapping[geo] || []).includes(c)));
        geos.forEach(geo => {
          const cur = [...(mapping[geo] || [])];
          if (allHave) {
            mapping[geo] = cur.filter(c => c !== "MT" && !mtSubCodes.includes(c));
          } else {
            mapping[geo] = Array.from(new Set([...cur, "MT", ...mtSubCodes]));
          }
        });
      } else {
        const allHave = geos.every(geo => (mapping[geo] || []).includes(channelCode));
        geos.forEach(geo => {
          const cur = [...(mapping[geo] || [])];
          if (allHave) {
            let next = cur.filter(c => c !== channelCode);
            if (mtSubCodes.includes(channelCode)) next = next.filter(c => c !== "MT");
            mapping[geo] = next;
          } else {
            if (!cur.includes(channelCode)) {
              const next = [...cur, channelCode];
              if (mtSubCodes.includes(channelCode) && mtSubCodes.every(c => c === channelCode || next.includes(c))) {
                next.push("MT");
              }
              mapping[geo] = next;
            }
          }
        });
      }
      return { ...prev, channelMapping: mapping, channel: deriveChannelFromMapping(mapping) };
    });
  };

  // Toggle ALL channels across ALL selected geos.
  const toggleAllColumnsAllGeos = () => {
    setForm(prev => {
      if (!prev) return prev;
      const geos = (prev.geography as string[]) || [];
      const mapping = { ...((prev.channelMapping as Record<string, string[]>) || {}) };
      const leafCodes = leafChannels.map(c => c.code);
      const allCodes = ["MT", ...leafCodes];
      const allSelected = geos.every(geo => leafCodes.every(c => (mapping[geo] || []).includes(c)));
      geos.forEach(geo => { mapping[geo] = allSelected ? [] : [...allCodes]; });
      return { ...prev, channelMapping: mapping, channel: deriveChannelFromMapping(mapping) };
    });
  };

  const applyChannelsToAllGeos = (sourceGeo: string) => {
    setForm(prev => {
      if (!prev) return prev;
      const mapping = { ...((prev.channelMapping as Record<string, string[]>) || {}) };
      const sourceChannels = [...(mapping[sourceGeo] || [])];
      const selectedGeos = (prev.geography as string[]) || [];
      selectedGeos.forEach(geo => { mapping[geo] = [...sourceChannels]; });
      return { ...prev, channelMapping: mapping, channel: deriveChannelFromMapping(mapping) };
    });
  };

  const toggleAllClusters = () => {
    setForm(prev => {
      if (!prev) return prev;
      const allNames = clusters.map(c => c.name);
      const isAllSelected = allNames.every(n => (prev.geography as string[])?.includes(n));
      if (isAllSelected) {
        return { ...prev, geography: [], channelMapping: {}, channel: [] };
      }
      const mapping = { ...((prev.channelMapping as Record<string, string[]>) || {}) };
      allNames.forEach(n => { if (!mapping[n]) mapping[n] = []; });
      return { ...prev, geography: allNames, channelMapping: mapping, channel: deriveChannelFromMapping(mapping) };
    });
  };

  const toggleAllDepots = () => {
    setForm(prev => {
      if (!prev) return prev;
      const selectedGeos = (prev.geography as string[]) || [];
      const availableDepots = getAvailableDepotsFromMap(selectedGeos);
      const currentDepots = (prev.depot as string[]) || [];
      const isAllSelected = availableDepots.length > 0 && availableDepots.every(d => currentDepots.includes(d));
      return { ...prev, depot: isAllSelected ? [] : [...availableDepots] };
    });
  };

  const validateForActivation = (): string[] => {
    if (!form || !entry) return [];
    const errors: string[] = [];
    const isDraft = entry.networkStatus === "Draft";
    if (!isDraft) return [];

    if (!form.networkChangeDate) errors.push("Network Change Date is required");
    if (!form.startDate) errors.push("Start Date is required");
    if (!form.endDate) errors.push("End Date is required");

    if (form.networkChangeDate && form.cbuCreatedDate) {
      const minChangeDate = addDays(form.cbuCreatedDate, 1);
      if (form.networkChangeDate < minChangeDate) {
        errors.push("Network Change Date must be after CBU Created Date");
      }
    }
    if (form.networkChangeDate && form.startDate && form.startDate < form.networkChangeDate) {
      errors.push("Start Date must be on or after Network Change Date");
    }
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      errors.push("End Date must be on or after Start Date");
    }

    const geo = (form.geography as string[]) || [];
    const dep = (form.depot as string[]) || [];
    const ch = (form.channel as string[]) || [];
    if (geo.length === 0) errors.push("At least one cluster must be selected");
    if (dep.length === 0) errors.push("At least one depot must be selected");
    if (ch.filter(c => c !== "MT").length === 0) errors.push("At least one channel must be selected");

    return errors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !entry) return;

    const isDraft = entry.networkStatus === "Draft";
    if (isDraft) {
      const errors = validateForActivation();
      if (errors.length > 0) {
        toast({
          title: "Validation Failed",
          description: errors.join(". "),
          variant: "destructive",
        });
        return;
      }
      setShowConfirmDialog(true);
    } else {
      updateMutation.mutate(form);
    }
  };

  const transitionMutation = useMutation({
    mutationFn: async (data: { form: InsertNetworkEntry; entryId: string }) => {
      await apiRequest("PATCH", `/api/list-master/${data.entryId}`, data.form);
      await apiRequest("POST", `/api/saga/transition/${data.entryId}`, {
        toStatus: "Active",
        triggeredBy: data.form.assignedPerson || "System",
        metadata: {
          networkChangeDate: data.form.networkChangeDate,
          startDate: data.form.startDate,
          endDate: data.form.endDate,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/network-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lifecycle"] });
      toast({ title: "Entry activated successfully" });
      navigate("/network");
    },
    onError: (err: Error) => {
      toast({ title: "Activation Failed", description: err.message, variant: "destructive" });
    },
  });

  // ── Advance-status mutation (Active → Pricing Updated → … → Network transition complete) ─
  const currentStatusIdx = STATUS_FLOW.indexOf((entry?.networkStatus ?? "Draft") as any);
  const nextStatus: string | null = currentStatusIdx >= 0 && currentStatusIdx < STATUS_FLOW.length - 1
    ? STATUS_FLOW[currentStatusIdx + 1]
    : null;

  const advanceStatusMutation = useMutation({
    mutationFn: async () => {
      if (!id || !nextStatus) throw new Error("No next status available");
      return apiRequest("POST", `/api/saga/transition/${id}`, {
        toStatus: nextStatus,
        triggeredBy: form?.assignedPerson || "System",
        metadata: {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/network-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lifecycle"] });
      toast({ title: "Status advanced", description: `Now: ${nextStatus}` });
    },
    onError: (err: Error) => {
      toast({ title: "Transition failed", description: err.message, variant: "destructive" });
    },
  });

  const handleAdvanceStatus = () => { advanceStatusMutation.mutate(); };

  const handleConfirmSubmit = () => {
    if (!form || !id) return;
    setShowConfirmDialog(false);
    transitionMutation.mutate({ form, entryId: id });
  };

  /* Plain save — never triggers activation; always available regardless of status */
  const handleSaveDraft = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!form) return;
    updateMutation.mutate(form);
  };

  const selectedGeo = (form?.geography || []) as string[];
  const selectedDepots = (form?.depot || []) as string[];
  const selectedChannels = (form?.channel || []) as string[];
  const channelMapping = ((form?.channelMapping as Record<string, string[]>) || {});
  const customerMapping = ((form?.customerMapping as Record<string, string[]>) || {});
  const allClustersSelected = clusters.every(c => selectedGeo.includes(c.name));
  const availableDepotsForGeo = getAvailableDepotsFromMap(selectedGeo);
  const allDepotsSelected = availableDepotsForGeo.length > 0 && availableDepotsForGeo.every(d => selectedDepots.includes(d));
  const selectedLeafCount = leafChannels.filter(c => selectedChannels.includes(c.code)).length;
  const computedYear = form ? computeYear(form.cbuCreatedDate) : null;
  const isDraft = entry?.networkStatus === "Draft";

  // Geos where at least one MT sub-channel is selected (or the MT parent itself)
  const mtGeos = selectedGeo.filter(geo => {
    const geoChans = channelMapping[geo] || [];
    return geoChans.includes("MT") || mtSubChannels.some(sc => geoChans.includes(sc.code));
  });

  const updateCustomerMapping = (geo: string, chains: string[]) => {
    setForm(prev => {
      if (!prev) return prev;
      const cm = { ...((prev.customerMapping as Record<string, string[]>) || {}) };
      if (chains.length === 0) {
        delete cm[geo];
      } else {
        cm[geo] = chains;
      }
      return { ...prev, customerMapping: cm };
    });
  };

  // Select all customer chains for every MT cluster (only for their active sub-channels)
  const selectAllCustomerChains = () => {
    setForm(prev => {
      if (!prev) return prev;
      const cm = { ...((prev.customerMapping as Record<string, string[]>) || {}) };
      const mapping = (prev.channelMapping as Record<string, string[]>) || {};
      const geos = (prev.geography as string[]) || [];
      const currentMtGeos = geos.filter(geo => {
        const geoChans = mapping[geo] || [];
        return geoChans.includes("MT") || mtSubChannels.some(sc => geoChans.includes(sc.code));
      });
      currentMtGeos.forEach(geo => {
        const geoChans = mapping[geo] || [];
        const activeSubs = mtSubChannels.filter(sc => geoChans.includes(sc.code)).map(sc => sc.code);
        const allChainsForGeo = CUSTOMER_CHAINS.filter(c => activeSubs.includes(c.subChannel)).map(c => c.code);
        cm[geo] = allChainsForGeo;
      });
      return { ...prev, customerMapping: cm };
    });
  };

  // Clear all customer chains for every MT cluster
  const clearAllCustomerChains = () => {
    setForm(prev => {
      if (!prev) return prev;
      const cm = { ...((prev.customerMapping as Record<string, string[]>) || {}) };
      const mapping = (prev.channelMapping as Record<string, string[]>) || {};
      const geos = (prev.geography as string[]) || [];
      const currentMtGeos = geos.filter(geo => {
        const geoChans = mapping[geo] || [];
        return geoChans.includes("MT") || mtSubChannels.some(sc => geoChans.includes(sc.code));
      });
      currentMtGeos.forEach(geo => { delete cm[geo]; });
      return { ...prev, customerMapping: cm };
    });
  };

  return {
    entry,
    form,
    isLoading,
    activeTab,
    setActiveTab,
    showConfirmDialog,
    setShowConfirmDialog,
    updateField,
    toggleArrayItem,
    toggleGeoChannel,
    toggleAllGeoChannels,
    toggleColumnChannel,
    toggleAllColumnsAllGeos,
    applyChannelsToAllGeos,
    toggleAllClusters,
    toggleAllDepots,
    handleSubmit,
    handleSaveDraft,
    handleConfirmSubmit,
    isPending: updateMutation.isPending || transitionMutation.isPending,
    nextStatus,
    handleAdvanceStatus,
    isAdvancePending: advanceStatusMutation.isPending,
    navigate,

    selectedGeo,
    selectedDepots,
    selectedChannels,
    channelMapping,
    customerMapping,
    updateCustomerMapping,
    selectAllCustomerChains,
    clearAllCustomerChains,
    mtGeos,
    allClustersSelected,
    allDepotsSelected,
    selectedLeafCount,
    computedYear,
    isDraft,
  };
}
