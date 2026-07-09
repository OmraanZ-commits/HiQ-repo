import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import type { NetworkEntry, InsertNetworkEntry } from "@shared/schema";

export function useNetworkEntries() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Multi-select hierarchy filters (Overview page requirement)
  const [bgFilter, setBgFilter] = useState<string[]>([]);
  const [salesCategoryFilter, setSalesCategoryFilter] = useState<string[]>([]);
  const [smallCFilter, setSmallCFilter] = useState<string[]>([]);
  const [formatFilter, setFormatFilter] = useState<string[]>([]);
  const [packStatusFilter, setPackStatusFilter] = useState<string[]>([]);
  const [channelFilter, setChannelFilter] = useState<string[]>([]);
  const [subChannelFilter, setSubChannelFilter] = useState<string[]>([]);
  const [customerChainFilter, setCustomerChainFilter] = useState<string[]>([]);

  const { data: entries = [], isLoading } = useQuery<NetworkEntry[]>({
    queryKey: ["/api/network-entries"],
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: InsertNetworkEntry }) =>
      apiRequest("PATCH", `/api/network-entries/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/network-entries"] });
      toast({ title: "Entry updated successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Sub Channel and Customer Chain filters only apply when "MT" is one of the
  // selected channels — otherwise they are ignored even if a stale selection exists.
  const isMtChannelSelected = channelFilter.includes("MT");

  const filteredEntries = entries.filter(entry => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      (entry.cbuCode?.toLowerCase().includes(q)) ||
      (entry.materialDescription?.toLowerCase().includes(q)) ||
      (entry.brand?.toLowerCase().includes(q));
    const matchesStatus = statusFilter === "all" || entry.networkStatus === statusFilter;

    const matchesBg = bgFilter.length === 0 || bgFilter.includes(entry.bg ?? "");
    const matchesSalesCategory = salesCategoryFilter.length === 0 || salesCategoryFilter.includes(entry.salesCategory ?? "");
    const matchesSmallC = smallCFilter.length === 0 || smallCFilter.includes(entry.smallC ?? "");
    const matchesFormat = formatFilter.length === 0 || formatFilter.includes(entry.format ?? "");
    const matchesPackStatus = packStatusFilter.length === 0 || packStatusFilter.includes(entry.networkStatus ?? "");
    const matchesChannel = channelFilter.length === 0 || (entry.channel ?? []).some(c => channelFilter.includes(c));

    const entrySubChannels = Object.values(entry.channelMapping ?? {}).flat();
    const matchesSubChannel = !isMtChannelSelected || subChannelFilter.length === 0 ||
      entrySubChannels.some(sc => subChannelFilter.includes(sc));

    const entryCustomerChains = Object.values(entry.customerMapping ?? {}).flat();
    const matchesCustomerChain = !isMtChannelSelected || customerChainFilter.length === 0 ||
      entryCustomerChains.some(cc => customerChainFilter.includes(cc));

    return matchesSearch && matchesStatus &&
      matchesBg && matchesSalesCategory && matchesSmallC && matchesFormat &&
      matchesPackStatus && matchesChannel && matchesSubChannel && matchesCustomerChain;
  });

  const stats = {
    total: entries.length,
    active: entries.filter(e => e.networkStatus === "Active").length,
    draft: entries.filter(e => e.networkStatus === "Draft").length,
    productionStarted: entries.filter(e => e.networkStatus === "Production Started").length,
  };

  const clearAllFilters = () => {
    setStatusFilter("all");
    setBgFilter([]);
    setSalesCategoryFilter([]);
    setSmallCFilter([]);
    setFormatFilter([]);
    setPackStatusFilter([]);
    setChannelFilter([]);
    setSubChannelFilter([]);
    setCustomerChainFilter([]);
  };

  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) +
    bgFilter.length + salesCategoryFilter.length + smallCFilter.length + formatFilter.length +
    packStatusFilter.length + channelFilter.length +
    (isMtChannelSelected ? subChannelFilter.length + customerChainFilter.length : 0);

  return {
    entries,
    filteredEntries,
    isLoading,
    stats,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    showFilters,
    setShowFilters,
    bgFilter,
    setBgFilter,
    salesCategoryFilter,
    setSalesCategoryFilter,
    smallCFilter,
    setSmallCFilter,
    formatFilter,
    setFormatFilter,
    packStatusFilter,
    setPackStatusFilter,
    channelFilter,
    setChannelFilter,
    subChannelFilter,
    setSubChannelFilter,
    customerChainFilter,
    setCustomerChainFilter,
    isMtChannelSelected,
    clearAllFilters,
    activeFilterCount,
    updateEntry: (id: string, data: InsertNetworkEntry) => updateMutation.mutate({ id, data }),
    isUpdating: updateMutation.isPending,
    getEntryById: (id: string) => entries.find(e => e.id === id) || null,
  };
}
