import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useParams } from "wouter";
import { useState, useEffect } from "react";
import { CLUSTERS, DEPOTS, TOP_CHANNELS, MT_SUB_CHANNELS } from "@/lib/distribution-data";
import { addDays, computeYear } from "@/lib/date-utils";
import type { NetworkEntry, InsertNetworkEntry } from "@shared/schema";

export const LEAF_CHANNELS = [...TOP_CHANNELS, ...MT_SUB_CHANNELS];

export function useNetworkEntryForm() {
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
      });
    }
  }, [entry]);

  const updateMutation = useMutation({
    mutationFn: (data: InsertNetworkEntry) =>
      apiRequest("PATCH", `/api/network-entries/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/network-entries"] });
      toast({ title: "Entry updated successfully" });
      navigate("/");
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
    const mtSubCodes = MT_SUB_CHANNELS.map(c => c.code);
    if (mtSubCodes.some(c => all.has(c))) all.add("MT");
    return Array.from(all);
  };

  const toggleArrayItem = (field: "geography" | "depot", value: string) => {
    setForm(prev => {
      if (!prev) return prev;
      const arr = (prev[field] as string[]) || [];
      const updated = arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
      if (field === "geography") {
        const mapping = { ...((prev.channelMapping as Record<string, string[]>) || {}) };
        if (!arr.includes(value)) {
          if (!mapping[value]) mapping[value] = [];
        } else {
          delete mapping[value];
        }
        return { ...prev, [field]: updated, channelMapping: mapping, channel: deriveChannelFromMapping(mapping) };
      }
      return { ...prev, [field]: updated };
    });
  };

  const toggleGeoChannel = (geo: string, channelCode: string) => {
    setForm(prev => {
      if (!prev) return prev;
      const mapping = { ...((prev.channelMapping as Record<string, string[]>) || {}) };
      const geoChannels = [...(mapping[geo] || [])];
      const mtSubCodes = MT_SUB_CHANNELS.map(c => c.code);

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
      const leafCodes = LEAF_CHANNELS.map(c => c.code);
      const allCodes = ["MT", ...leafCodes];
      const geoChannels = mapping[geo] || [];
      const isAllSelected = leafCodes.every(c => geoChannels.includes(c));
      mapping[geo] = isAllSelected ? [] : [...allCodes];
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
      const allNames = CLUSTERS.map(c => c.name);
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
      const isAllSelected = DEPOTS.every(d => (prev.depot as string[])?.includes(d));
      return { ...prev, depot: isAllSelected ? [] : [...DEPOTS] };
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
      navigate("/");
    },
    onError: (err: Error) => {
      toast({ title: "Activation Failed", description: err.message, variant: "destructive" });
    },
  });

  const handleConfirmSubmit = () => {
    if (!form || !id) return;
    setShowConfirmDialog(false);
    transitionMutation.mutate({ form, entryId: id });
  };

  const selectedGeo = (form?.geography || []) as string[];
  const selectedDepots = (form?.depot || []) as string[];
  const selectedChannels = (form?.channel || []) as string[];
  const channelMapping = ((form?.channelMapping as Record<string, string[]>) || {});
  const allClustersSelected = CLUSTERS.every(c => selectedGeo.includes(c.name));
  const allDepotsSelected = DEPOTS.every(d => selectedDepots.includes(d));
  const selectedLeafCount = LEAF_CHANNELS.filter(c => selectedChannels.includes(c.code)).length;
  const computedYear = form ? computeYear(form.cbuCreatedDate) : null;
  const isDraft = entry?.networkStatus === "Draft";

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
    applyChannelsToAllGeos,
    toggleAllClusters,
    toggleAllDepots,
    handleSubmit,
    handleConfirmSubmit,
    isPending: updateMutation.isPending || transitionMutation.isPending,
    navigate,

    selectedGeo,
    selectedDepots,
    selectedChannels,
    channelMapping,
    allClustersSelected,
    allDepotsSelected,
    selectedLeafCount,
    computedYear,
    isDraft,
  };
}
