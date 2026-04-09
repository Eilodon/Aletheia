import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ReadingProvider } from "@/lib/reading-context";
import { I18nProvider } from "@/lib/i18n-context";
import { AnimatePresence } from "framer-motion";
import TabBar from "@/components/TabBar";
import HomeScreen from "@/pages/HomeScreen";
import ReadingScreen from "@/pages/ReadingScreen";
import MirrorScreen from "@/pages/MirrorScreen";
import SettingsScreen from "@/pages/SettingsScreen";

import OnboardingScreen from "@/pages/OnboardingScreen";
import ErrorBoundary from "@/components/ErrorBoundary";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/onboarding" element={<OnboardingScreen />} />
        <Route path="/reading" element={<ReadingScreen />} />
        <Route path="/mirror" element={<MirrorScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <I18nProvider>
          <ReadingProvider>
            <BrowserRouter>
              <AnimatedRoutes />
              <TabBar />
            </BrowserRouter>
          </ReadingProvider>
        </I18nProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
