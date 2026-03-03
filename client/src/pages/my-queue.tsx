import { UnileverHeader } from "@/components/unilever-header";

export default function MyQueuePage() {
  return (
    <div className="min-h-screen bg-background">
      <UnileverHeader />
      <main className="flex items-center justify-center h-[calc(100vh-120px)]">
        <h1 className="text-2xl font-semibold text-muted-foreground">Coming Soon</h1>
      </main>
    </div>
  );
}
