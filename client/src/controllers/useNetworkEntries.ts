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

  const filteredEntries = entries.filter(entry => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      (entry.cbuCode?.toLowerCase().includes(q)) ||
      (entry.materialDescription?.toLowerCase().includes(q)) ||
      (entry.brand?.toLowerCase().includes(q));
    const matchesStatus = statusFilter === "all" || entry.networkStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: entries.length,
    active: entries.filter(e => e.networkStatus === "Active").length,
    draft: entries.filter(e => e.networkStatus === "Draft").length,
    productionStarted: entries.filter(e => e.networkStatus === "Production Started").length,
  };

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
    updateEntry: (id: string, data: InsertNetworkEntry) => updateMutation.mutate({ id, data }),
    isUpdating: updateMutation.isPending,
    getEntryById: (id: string) => entries.find(e => e.id === id) || null,
  };
}
