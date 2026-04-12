import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import { OrganizationProvider } from "@/hooks/useOrganizations";
import { CurrentProjectProvider } from "@/hooks/useCurrentProject";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ScrollToTop } from "@/components/ScrollToTop";
import Index from "./pages/Index";
import LandingPage from "./pages/LandingPage";
import TeamsPage from "./pages/TeamsPage";
import TasksPage from "./pages/TasksPage";
import AssistantPage from "./pages/AssistantPage";
import PlanPage from "./pages/PlanPage";
import BusinessPlanPage from "./pages/BusinessPlanPage";
import SettingsPage from "./pages/SettingsPage";
import AdminPage from "./pages/AdminPage";
import AuthPage from "./pages/AuthPage";
import OnboardingPage from "./pages/OnboardingPage";
import AcceptInvitationPage from "./pages/AcceptInvitationPage";
import MemberLoginPage from "./pages/MemberLoginPage";
import InstallPage from "./pages/InstallPage";
import NotFound from "./pages/NotFound";
import VideoPage from "./pages/VideoPage";
import AutomationsPage from "./pages/AutomationsPage";
import WorkflowEditorPage from "./pages/WorkflowEditorPage";
import StartupPage from "./pages/StartupPage";
import ModulesPage from "./pages/ModulesPage";
import MindMapPage from "./pages/MindMapPage";
import WebsitesPage from "./pages/WebsitesPage";
import JourneyStepsPage from "./pages/JourneyStepsPage";
import SocialInboxPage from "./pages/SocialInboxPage";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SubscriptionProvider>
          <OrganizationProvider>
            <CurrentProjectProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <ScrollToTop />
                  <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
                    <Route path="/journey" element={<ProtectedRoute><JourneyStepsPage /></ProtectedRoute>} />
                    <Route path="/install" element={<InstallPage />} />
                    <Route path="/assistant" element={<ProtectedRoute><AssistantPage /></ProtectedRoute>} />
                    <Route path="/teams" element={<ProtectedRoute><TeamsPage /></ProtectedRoute>} />
                    <Route path="/tasks" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
                    <Route path="/plan" element={<ProtectedRoute><PlanPage /></ProtectedRoute>} />
                    <Route path="/business-plan" element={<ProtectedRoute><BusinessPlanPage /></ProtectedRoute>} />
                    <Route path="/video" element={<ProtectedRoute><VideoPage /></ProtectedRoute>} />
                    <Route path="/automations" element={<ProtectedRoute><AutomationsPage /></ProtectedRoute>} />
                    <Route path="/workflow/:id" element={<ProtectedRoute><WorkflowEditorPage /></ProtectedRoute>} />
                    <Route path="/startup" element={<ProtectedRoute><StartupPage /></ProtectedRoute>} />
                    <Route path="/modules" element={<ProtectedRoute><ModulesPage /></ProtectedRoute>} />
                    <Route path="/mindmap" element={<ProtectedRoute><MindMapPage /></ProtectedRoute>} />
                    <Route path="/websites" element={<ProtectedRoute><WebsitesPage /></ProtectedRoute>} />
                    <Route path="/social-inbox" element={<ProtectedRoute><SocialInboxPage /></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                    <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
                    <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
                    <Route path="/member-login" element={<MemberLoginPage />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BrowserRouter>
              </TooltipProvider>
            </CurrentProjectProvider>
          </OrganizationProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
