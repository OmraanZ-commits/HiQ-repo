import React, { useEffect, useState } from "react";
import { useReferenceData, type ChannelMaster, type ClusterMaster, type DepotMaster } from "@/controllers/useReferenceData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Database,
  RefreshCw,
  Radio,
  MapPin,
  Warehouse,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";

export default function ReferenceDataPage() {
  return <ReferenceDataContent />;
}

export function ReferenceDataContent() {
  const {
    channels,
    clusters,
    depots,
    isLoading,
    fetchViaSaga,
    isSagaPending,
    sagaStatus,
    sagaSteps,
  } = useReferenceData();

  // Auto-fetch via saga on mount
  useEffect(() => {
    fetchViaSaga();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [activeTab, setActiveTab] = useState("channels");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-[#1f36c7] to-[#00b0d7] p-2.5 rounded-md">
            <Database className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Reference Data</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Master data for Channels, Clusters &amp; Depots — fetched via Saga orchestration
            </p>
          </div>
        </div>
        <Button
            variant="outline"
            size="sm"
            onClick={() => fetchViaSaga()}
            disabled={isSagaPending}
          >
            {isSagaPending ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1.5" />
            )}
            Refresh
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SummaryCard
            icon={<Radio className="h-5 w-5 text-[#1f36c7]" />}
            title="Channels"
            count={channels.length}
            loading={isLoading}
          />
          <SummaryCard
            icon={<MapPin className="h-5 w-5 text-[#0d8ecf]" />}
            title="Clusters"
            count={clusters.length}
            loading={isLoading}
          />
          <SummaryCard
            icon={<Warehouse className="h-5 w-5 text-[#00b0d7]" />}
            title="Depots"
            count={depots.length}
            loading={isLoading}
          />
        </div>

        {/* Tabs */}
        <Card>
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="border-b px-5 pt-4">
                <TabsList>
                  <TabsTrigger value="channels">
                    <Radio className="h-4 w-4 mr-1.5" /> Channels
                  </TabsTrigger>
                  <TabsTrigger value="clusters">
                    <MapPin className="h-4 w-4 mr-1.5" /> Clusters
                  </TabsTrigger>
                  <TabsTrigger value="depots">
                    <Warehouse className="h-4 w-4 mr-1.5" /> Depots
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="channels" className="p-5 mt-0">
                {isLoading ? <TableSkeleton /> : <ChannelsTable data={channels} />}
              </TabsContent>
              <TabsContent value="clusters" className="p-5 mt-0">
                {isLoading ? <TableSkeleton /> : <ClustersTable data={clusters} />}
              </TabsContent>
              <TabsContent value="depots" className="p-5 mt-0">
                {isLoading ? <TableSkeleton /> : <DepotsTable data={depots} />}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
}

/* ── Sub-components ───────────────────────────────────────────── */

function SummaryCard({
  icon,
  title,
  count,
  loading,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="bg-muted rounded-md p-3">{icon}</div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          {loading ? (
            <Skeleton className="h-7 w-10 mt-1" />
          ) : (
            <p className="text-2xl font-bold">{count}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SagaStatusStrip({
  status,
  steps,
}: {
  status: string;
  steps: Array<{ name: string; status: string; error: string | null }>;
}) {
  const isOk = status === "completed";
  return (
    <Card className={isOk ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
      <CardContent className="p-4 flex items-center gap-4 flex-wrap">
        {isOk ? (
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
        ) : (
          <XCircle className="h-5 w-5 text-red-600 shrink-0" />
        )}
        <span className="text-sm font-medium">
          Saga status: <span className="font-bold">{status}</span>
        </span>
        <div className="flex items-center gap-2 ml-auto">
          {steps.map((s) => (
            <Badge
              key={s.name}
              variant={s.status === "completed" ? "default" : "destructive"}
              className="text-xs"
            >
              {s.name.replace(/_/g, " ")}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge variant="default" className="bg-green-600">Active</Badge>
  ) : (
    <Badge variant="secondary">Inactive</Badge>
  );
}

/* ── Channels Table ─────────────────────────────────────────── */

function ChannelsTable({ data }: { data: ChannelMaster[] }) {
  if (!data.length) return <p className="text-muted-foreground text-sm">No channels found.</p>;

  const typeColor: Record<string, string> = {
    Core: "bg-blue-100 text-blue-800",
    Traditional: "bg-amber-100 text-amber-800",
    "Modern Trade": "bg-purple-100 text-purple-800",
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Code</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Parent</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((ch) => (
          <TableRow key={ch.id}>
            <TableCell className="font-mono font-medium">{ch.code}</TableCell>
            <TableCell>{ch.name ?? "—"}</TableCell>
            <TableCell>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColor[ch.type] ?? ""}`}>
                {ch.type}
              </span>
            </TableCell>
            <TableCell>{ch.parentCode ?? "—"}</TableCell>
            <TableCell><ActiveBadge active={ch.isActive} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/* ── Clusters Table ─────────────────────────────────────────── */

function ClustersTable({ data }: { data: ClusterMaster[] }) {
  if (!data.length) return <p className="text-muted-foreground text-sm">No clusters found.</p>;

  const regionColor: Record<string, string> = {
    South: "bg-green-100 text-green-800",
    West: "bg-orange-100 text-orange-800",
    North: "bg-sky-100 text-sky-800",
    East: "bg-indigo-100 text-indigo-800",
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Region</TableHead>
          <TableHead>Depot Count</TableHead>
          <TableHead>States</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((cl) => (
          <TableRow key={cl.id}>
            <TableCell className="font-medium">{cl.name}</TableCell>
            <TableCell>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${regionColor[cl.region] ?? ""}`}>
                {cl.region}
              </span>
            </TableCell>
            <TableCell>{cl.depotCount ?? "—"}</TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {(cl.stateIds ?? []).map((s) => (
                  <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                ))}
              </div>
            </TableCell>
            <TableCell><ActiveBadge active={cl.isActive} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/* ── Depots Table ───────────────────────────────────────────── */

function DepotsTable({ data }: { data: DepotMaster[] }) {
  if (!data.length) return <p className="text-muted-foreground text-sm">No depots found.</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Code</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Cluster ID</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((dp) => (
          <TableRow key={dp.id}>
            <TableCell className="font-mono font-medium">{dp.code}</TableCell>
            <TableCell>{dp.name ?? "—"}</TableCell>
            <TableCell>{dp.clusterId ?? "—"}</TableCell>
            <TableCell><ActiveBadge active={dp.isActive} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
