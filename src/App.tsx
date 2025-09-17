import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { useFileAutoExpiry } from "@/hooks/useFileAutoExpiry";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import UserPortal from "./pages/UserPortal";
import FindShops from "./pages/FindShops";
import BookSlot from "./pages/BookSlot";
import PrintHistory from "./pages/PrintHistory";
import CustomerHistory from "./pages/CustomerHistory";
import MyProfile from "./pages/MyProfile";
import PrintQueue from "./pages/PrintQueue";
import SlotConfig from "./pages/SlotConfig";
import ShopAnalytics from "./pages/ShopAnalytics";
import ShopSettings from "./pages/ShopSettings";
import ShopProfile from "./pages/ShopProfile";
import ShopCustomers from "./pages/ShopCustomers";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  // Initialize file auto-expiry system
  useFileAutoExpiry(true);
  
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/print-queue" element={<ProtectedRoute requireShopOwner><PrintQueue /></ProtectedRoute>} />
      <Route path="/slot-config" element={<ProtectedRoute requireShopOwner><SlotConfig /></ProtectedRoute>} />
      <Route path="/shop-analytics" element={<ProtectedRoute requireShopOwner><ShopAnalytics /></ProtectedRoute>} />
      <Route path="/shop-settings" element={<ProtectedRoute requireShopOwner><ShopSettings /></ProtectedRoute>} />
      <Route path="/shop-profile" element={<ProtectedRoute requireShopOwner><ShopProfile /></ProtectedRoute>} />
      <Route path="/shop-customers" element={<ProtectedRoute requireShopOwner><ShopCustomers /></ProtectedRoute>} />
      <Route path="/portal" element={<ProtectedRoute><UserPortal /></ProtectedRoute>} />
      <Route path="/find-shops" element={<ProtectedRoute><FindShops /></ProtectedRoute>} />
      <Route path="/book-slot/:shopId" element={<ProtectedRoute><BookSlot /></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute><CustomerHistory /></ProtectedRoute>} />
      <Route path="/print-history" element={<ProtectedRoute><PrintHistory /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><MyProfile /></ProtectedRoute>} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;