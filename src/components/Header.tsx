import { Button } from "@/components/ui/button";
import { Upload, MapPin, FileText, User, Home, LogOut } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, signOut, isShopOwner, profile } = useAuth();
  const [displayAvatarUrl, setDisplayAvatarUrl] = useState<string>('');
  const AVATAR_BUCKET: string = (import.meta as any).env?.VITE_SUPABASE_AVATAR_BUCKET || 'avatars';

  const resolveAvatarUrl = async (pathOrUrl?: string | null): Promise<string> => {
    if (!pathOrUrl) return '';
    if (pathOrUrl.startsWith('http') || pathOrUrl.startsWith('data:')) return pathOrUrl;
    const { data } = await (supabase as any)
      .storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(pathOrUrl, 60 * 60 * 24 * 365);
    return data?.signedUrl || '';
  };

  useEffect(() => {
    (async () => {
      const url = await resolveAvatarUrl(profile?.avatar_url || '');
      setDisplayAvatarUrl(url);
    })();
  }, [profile?.avatar_url]);

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been logged out of your account.",
      });
      navigate("/");
    } catch (error) {
      console.error('Failed to sign out:', error);
      // Show success message even if there was an error since local state is cleared
      toast({
        title: "Signed out",
        description: "You have been logged out of your account.",
      });
      navigate("/");
    }
  };

  return (
    <header className="bg-background border-b border-border px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-primary rounded-md flex items-center justify-center">
              <Home className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-primary">EasyPrintX</h1>
          </div>
          
          <nav className="flex items-center space-x-6">
            <Button 
              variant="ghost" 
              className={`flex items-center space-x-2 ${isActive('/portal') ? 'text-primary' : ''}`}
              onClick={() => navigate('/portal')}
            >
              <Upload className="w-4 h-4" />
              <span>Upload & Print</span>
            </Button>
            <Button 
              variant="ghost" 
              className={`flex items-center space-x-2 ${isActive('/find-shops') ? 'text-primary' : ''}`}
              onClick={() => navigate('/find-shops')}
            >
              <MapPin className="w-4 h-4" />
              <span>Find Shops</span>
            </Button>
            <Button 
              variant="ghost" 
              className={`flex items-center space-x-2 ${isActive('/history') ? 'text-primary' : ''}`}
              onClick={() => navigate('/history')}
            >
              <FileText className="w-4 h-4" />
              <span>Print History</span>
            </Button>
            <Button 
              variant="ghost" 
              className={`flex items-center space-x-2 ${isActive('/profile') ? 'text-primary' : ''}`}
              onClick={() => navigate('/profile')}
            >
              <User className="w-4 h-4" />
              <span>My Profile</span>
            </Button>
          </nav>
        </div>

        <div className="flex items-center space-x-3">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={displayAvatarUrl} />
                    <AvatarFallback className="bg-primary text-white">
                      {user.email?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                    <div className="text-left hidden md:block">
                      <div className="text-sm font-medium">
                        {profile?.full_name || user.user_metadata?.full_name || "User"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {isShopOwner ? "Shop Owner" : "Customer"}
                      </div>
                    </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={() => navigate('/auth')}>
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;