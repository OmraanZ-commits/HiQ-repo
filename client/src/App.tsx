import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import EditEntry from "@/pages/edit-entry";
import AdminCenterPage from "@/pages/admin-center";
import MyQueuePage from "@/pages/my-queue";
import NotificationsPage from "@/pages/notifications";
import PaidBiblePage from "@/pages/paid-bible";
import BasepakDetailPage from "@/pages/paid-bible-basepack-detail";
import ServiceRequestDetailPage from "@/pages/service-request-detail";
import AmendmentDetailPage from "@/pages/amendment-detail";
import CcrMasterMaintenancePage from "@/pages/ccr-master-maintenance";
import CcrWorkspacePage from "@/pages/ccr-workspace";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/network" component={Dashboard} />
      <Route path="/paid-bible" component={PaidBiblePage} />
      <Route path="/paid-bible/basepacks/:bpCode" component={BasepakDetailPage} />
      <Route path="/paid-bible/requests/:id" component={ServiceRequestDetailPage} />
      <Route path="/paid-bible/amendments/:id" component={AmendmentDetailPage} />
      <Route path="/edit/:id" component={EditEntry} />
      <Route path="/my-queue" component={MyQueuePage} />
      <Route path="/notifications" component={NotificationsPage} />
      <Route path="/admin" component={AdminCenterPage} />
      <Route path="/ccr" component={CcrWorkspacePage} />
      <Route path="/ccr/master-maintenance" component={CcrMasterMaintenancePage} />
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
