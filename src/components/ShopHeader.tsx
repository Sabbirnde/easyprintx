import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { 
  Printer, 
  LogOut,
  User
} from "lucide-react";

interface ShopHeaderProps {
  shopName?: string;
  currentPage?: string;
}

const ShopHeader = ({ shopName = 'Print X Now Shop', currentPage = 'Print Queue' }: ShopHeaderProps) => {
  const { user, signOut, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [displayAvatarUrl, setDisplayAvatarUrl] = React.useState<string>('');
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

  React.useEffect(() => {
    (async () => {
      const url = await resolveAvatarUrl(profile?.avatar_url || '');
      setDisplayAvatarUrl(url);
    })();
  }, [profile?.avatar_url]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been logged out of your shop account.",
      });
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error signing out",
        description: "There was a problem signing you out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const navItems = [
    { name: 'Print Queue', path: '/print-queue' },
    { name: 'Slot Config', path: '/slot-config' },
    { name: 'Analytics', path: '/shop-analytics' },
    { name: 'Settings', path: '/shop-settings' },
  ];

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Printer className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-semibold">{shopName}</h1>
          </div>
          
          <nav className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => (
              <Button 
                key={item.name}
                variant="ghost" 
                onClick={() => navigate(item.path)}
                className={currentPage === item.name ? "text-primary font-medium" : ""}
              >
                {item.name}
              </Button>
            ))}
          </nav>

          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={displayAvatarUrl} />
              <AvatarFallback>
                {profile?.full_name?.[0] || user?.email?.[0] || 'S'}
              </AvatarFallback>
            </Avatar>
            <div className="text-sm">
              <p className="font-medium">{profile?.full_name || user?.email}</p>
              <p className="text-muted-foreground">Shop Owner</p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSignOut}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default ShopHeader;