import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import TeamsPage from "./pages/TeamsPage";
import TasksPage from "./pages/TasksPage";
import AssistantPage from "./pages/AssistantPage";
import PlanPage from "./pages/PlanPage";
import BusinessPlanPage from "./pages/BusinessPlanPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/assistant" element={<AssistantPage />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/plan" element={<PlanPage />} />
          <Route path="/business-plan" element={<BusinessPlanPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
