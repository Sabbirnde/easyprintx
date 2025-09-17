import { useState, useEffect, createContext, useContext } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  isShopOwner: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Determine if user is shop owner based on user metadata
  const isShopOwner = user?.user_metadata?.user_type === 'shop_owner';

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        
        // Set loading to false immediately for auth state changes
        setLoading(false);
        
        // Load profile asynchronously without blocking
        if (session?.user) {
          setTimeout(() => {
            loadUserProfile(session.user.id);
            // Create profile if user signs up
            if (event === 'SIGNED_IN') {
              createProfileIfNotExists(session.user);
            }
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    // THEN check for existing session
    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          setLoading(false);
          return;
        }
        
        console.log('Session data:', session?.user?.email || 'No user');
        setSession(session);
        setUser(session?.user ?? null);
        
        // Set loading to false first
        setLoading(false);
        
        // Ensure profile exists and then load it asynchronously
        if (session?.user) {
          setTimeout(async () => {
            try {
              await createProfileIfNotExists(session.user);
            } catch (e) {
              console.error('Profile ensure error:', e);
            }
            loadUserProfile(session.user.id);
          }, 0);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setLoading(false);
      }
    };

    initializeAuth();

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error loading profile:', error);
        return;
      }

      setProfile(data || null);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const createProfileIfNotExists = async (user: User) => {
    try {
      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingProfile) {
        return; // Profile already exists
      }

      // Create new profile
      const { error: profileError } = await supabase.from('profiles').insert({
        user_id: user.id,
        full_name: user.user_metadata?.full_name || '',
      });

      if (profileError && profileError.code !== '23505') { // Ignore duplicate key errors
        console.error('Error creating profile:', profileError);
      } else {
        await loadUserProfile(user.id);
      }

      // If user is shop owner, create shop info
      if (user.user_metadata?.user_type === 'shop_owner') {
        const { data: existingShop } = await supabase
          .from('shop_info')
          .select('id')
          .eq('shop_owner_id', user.id)
          .maybeSingle();

        if (!existingShop) {
          const { error: shopError } = await supabase.from('shop_info').insert({
            shop_owner_id: user.id,
            shop_name: `${user.user_metadata?.full_name || 'My'} Print Shop`,
            email_address: user.email,
            description: 'Quality printing services available here!',
            address: 'Address not set - please update in settings',
            phone_number: 'Phone not set - please update in settings',
          });

          if (shopError) {
            console.error('Error creating shop info:', shopError);
          }
        }
      }
    } catch (error) {
      console.error('Error in createProfileIfNotExists:', error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await loadUserProfile(user.id);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      
      // Check if there's an active session before trying to sign out
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error('Error signing out:', error);
          throw error;
        }
      }
      
      // Clear local state regardless of session status
      setUser(null);
      setSession(null);
      setProfile(null);
      
    } catch (error) {
      console.error('Failed to sign out:', error);
      // Even if signOut fails, clear local state
      setUser(null);
      setSession(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile, 
      loading, 
      isShopOwner, 
      signOut, 
      refreshProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};