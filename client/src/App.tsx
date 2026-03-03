import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import EditEntry from "@/pages/edit-entry";
import AdminCenterPage from "@/pages/admin-center";
import MyQueuePage from "@/pages/my-queue";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/edit/:id" component={EditEntry} />
      <Route path="/my-queue" component={MyQueuePage} />
      <Route path="/admin" component={AdminCenterPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
