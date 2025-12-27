import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SupportChatBot } from "@/components/SupportChatBot";
import PWAInstallBanner from "@/components/PWAInstallBanner";
import { DemoModeProvider } from "@/components/DemoModeProvider";
import { DemoModePanel } from "@/components/DemoModePanel";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Diagnose from "./pages/Diagnose";
import Results from "./pages/Results";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Install from "./pages/Install";
import JobDetails from "./pages/JobDetails";
import TechnicianDashboard from "./pages/TechnicianDashboard";
import TechnicianSignup from "./pages/TechnicianSignup";
import CompanyDashboard from "./pages/CompanyDashboard";
import DiagnosisDetail from "./pages/DiagnosisDetail";
import DemoFlow from "./pages/DemoFlow";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <DemoModeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/diagnose" element={<Diagnose />} />
            <Route path="/results/:id" element={<Results />} />
            <Route path="/diagnosis/:id" element={<DiagnosisDetail />} />
            <Route path="/jobs/:id" element={<JobDetails />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/technician-dashboard" element={<TechnicianDashboard />} />
            <Route path="/company-dashboard" element={<CompanyDashboard />} />
            <Route path="/tech-signup" element={<TechnicianSignup />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/install" element={<Install />} />
            <Route path="/demo" element={<DemoFlow />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <SupportChatBot />
          <PWAInstallBanner />
          <DemoModePanel />
        </BrowserRouter>
      </TooltipProvider>
    </DemoModeProvider>
  </QueryClientProvider>
);

export default App;
