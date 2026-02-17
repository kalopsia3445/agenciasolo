import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import { AppLayout } from "./components/layout/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";
import Onboarding from "./pages/app/Onboarding";
import Generate from "./pages/app/Generate";
import TeleprompterPage from "./pages/app/Teleprompter";
import Library from "./pages/app/Library";
import BrandKit from "./pages/app/BrandKit";
import Packs from "./pages/app/Packs";
import AdminDashboard from "./pages/app/AdminDashboard";
import Checkout from "./pages/app/Checkout";
import Profile from "./pages/app/Profile";
import ResetPassword from "./pages/ResetPassword";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/app/generate" replace />} />
              <Route path="onboarding" element={<Onboarding />} />
              <Route path="generate" element={<Generate />} />
              <Route path="teleprompter/:scriptId" element={<TeleprompterPage />} />
              <Route path="library" element={<Library />} />
              <Route path="brand-kit" element={<BrandKit />} />
              <Route path="packs" element={<Packs />} />
              <Route path="admin" element={<AdminDashboard />} />
              <Route path="checkout" element={<Checkout />} />
              <Route path="profile" element={<Profile />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
