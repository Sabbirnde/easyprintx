import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireShopOwner?: boolean;
}

const ProtectedRoute = ({ children, requireShopOwner = false }: ProtectedRouteProps) => {
  const { user, loading, isShopOwner } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/auth");
        return;
      }

      // Check if route requires shop owner access
      if (requireShopOwner && !isShopOwner) {
        navigate("/portal"); // Redirect regular users to their portal
        return;
      }

      // Check if shop owner is trying to access user routes (but allow find-shops and book-slot)
      if (isShopOwner && !requireShopOwner && 
          (window.location.pathname === '/portal' || 
           window.location.pathname === '/history' ||
           window.location.pathname === '/profile')) {
        navigate("/print-queue"); // Redirect shop owners to their print queue
        return;
      }
    }
  }, [user, loading, navigate, isShopOwner, requireShopOwner]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;