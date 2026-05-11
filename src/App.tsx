import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { SiteSettingsProvider } from "@/hooks/useSiteSettings";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import MaintenanceGate from "@/components/MaintenanceGate";
import Index from "./pages/Index.tsx";
import AuthPage from "./pages/AuthPage.tsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.tsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.tsx";
import DashboardPage from "./pages/DashboardPage.tsx";
import FlightDeckPage from "./pages/FlightDeckPage.tsx";
import BridgeSetupPage from "./pages/BridgeSetupPage.tsx";
import DashboardLayout from "./components/dashboard/DashboardLayout.tsx";
import GroundSchoolPage from "./pages/GroundSchoolPage.tsx";
import OralExamPage from "./pages/OralExamPage.tsx";
import SessionHistoryPage from "./pages/SessionHistoryPage.tsx";
import ProgressPage from "./pages/ProgressPage.tsx";
import LogbookPage from "./pages/LogbookPage.tsx";
import TermsPage from "./pages/TermsPage.tsx";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage.tsx";
import CookiePreferencesPage from "./pages/CookiePreferencesPage.tsx";
import NotFound from "./pages/NotFound.tsx";
import ContactPage from "./pages/ContactPage.tsx";
import WhySimPilotPage from "./pages/WhySimPilotPage.tsx";
import CompetitorsPage from "./pages/CompetitorsPage.tsx";
import AdminPage from "./pages/AdminPage.tsx";
import MfaChallengePage from "./pages/MfaChallengePage.tsx";
import MfaGate from "./components/MfaGate.tsx";
import UnsubscribePage from "./pages/UnsubscribePage.tsx";
import MobileChatPage from "./pages/MobileChatPage.tsx";
import PublicProfilePage from "./pages/PublicProfilePage.tsx";
import WeatherBriefingPage from "./pages/WeatherBriefingPage.tsx";
import LiveToolsPage from "./pages/LiveToolsPage.tsx";
import QuickAnswerPage from "./pages/QuickAnswerPage.tsx";
import ForSchoolsPage from "./pages/ForSchoolsPage.tsx";
import ForSchoolsSuccessPage from "./pages/ForSchoolsSuccessPage.tsx";
import IntakePage from "./pages/IntakePage.tsx";
import TestModePage from "./pages/TestModePage.tsx";
import ThemeQAPage from "./pages/ThemeQAPage.tsx";
import CheckoutRedirectPage from "./pages/CheckoutRedirectPage.tsx";
import OnboardingPlanPage from "./pages/OnboardingPlanPage.tsx";
import SupportChatWidget from "./components/SupportChatWidget.tsx";
import PWAInstallBanner from "./components/PWAInstallBanner.tsx";
import ScrollToTop from "./components/ScrollToTop.tsx";
import SiteVerificationTags from "./components/SiteVerificationTags.tsx";

const queryClient = new QueryClient();

/** Detect if running as installed PWA (standalone) */
const isStandalone =
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as any).standalone === true;

const App = () => (
  <HelmetProvider>
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ScrollToTop />
        <SiteSettingsProvider>
        <SiteVerificationTags />
        <AuthProvider>
          <AnnouncementBanner />
          <MaintenanceGate>
            <Routes>
              {/* When installed as app, "/" goes straight to chat */}
              <Route path="/" element={isStandalone ? <Navigate to="/chat" replace /> : <Index />} />
              <Route path="/chat" element={<MobileChatPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              {/* Authenticated dashboard area — persistent sidebar + G3000 theme */}
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<FlightDeckPage />} />
                <Route path="/flight-deck/bridge" element={<BridgeSetupPage />} />
                <Route path="/account" element={<DashboardPage />} />
                <Route path="/ground-school" element={<GroundSchoolPage />} />
                <Route path="/oral-exam" element={<OralExamPage />} />
                <Route path="/weather-briefing" element={<WeatherBriefingPage />} />
                <Route path="/live-tools" element={<LiveToolsPage />} />
                <Route path="/quick-answer" element={<QuickAnswerPage />} />
                <Route path="/session-history" element={<SessionHistoryPage />} />
                <Route path="/progress" element={<ProgressPage />} />
                <Route path="/logbook" element={<LogbookPage />} />
                <Route path="/test-mode" element={<TestModePage />} />
              </Route>
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/cookie-preferences" element={<CookiePreferencesPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/why-simpilot" element={<WhySimPilotPage />} />
              <Route path="/competitors" element={<CompetitorsPage />} />
              <Route path="/for-schools" element={<ForSchoolsPage />} />
              <Route path="/for-schools/success" element={<ForSchoolsSuccessPage />} />
              <Route path="/intake" element={<IntakePage />} />
              <Route path="/theme-qa" element={<ThemeQAPage />} />
              <Route path="/admin" element={<MfaGate requireMfa><AdminPage /></MfaGate>} />
              <Route path="/mfa" element={<MfaChallengePage />} />
              <Route path="/unsubscribe" element={<UnsubscribePage />} />
              <Route path="/pilot/:userId" element={<PublicProfilePage />} />
              <Route path="/checkout/redirect" element={<CheckoutRedirectPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <SupportChatWidget />
            <PWAInstallBanner />
          </MaintenanceGate>
        </AuthProvider>
        </SiteSettingsProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
  </HelmetProvider>
);

export default App;
