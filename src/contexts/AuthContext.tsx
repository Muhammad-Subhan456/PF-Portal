import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { isBootstrapAdminEmail, validateUserAccess } from '@/lib/auth';
import type { Tables } from '@/integrations/supabase/types';

type UserProfile = Tables<'users'>;

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      // Fetch user profile
      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      // Check if user is in admins table and sync admin status
      if (userProfile?.email) {
        const { data: adminData } = await supabase
          .from('admins')
          .select('*')
          .eq('email', userProfile.email.toLowerCase())
          .eq('is_active', true)
          .maybeSingle();

        // If user is in admins table but is_admin is false in users table, sync it
        if (adminData && !userProfile.is_admin) {
          await supabase
            .from('users')
            .update({ is_admin: true })
            .eq('id', userId);
          userProfile.is_admin = true;
        }

        // Fetch enrolled student details to get section
        const { data: studentData } = await supabase
          .from('enrolled_students')
          .select('section, roll_number')
          .eq('email', userProfile.email)
          .maybeSingle();

        if (studentData) {
          // Merge section and roll_number if missing from user profile or to ensure accuracy
          setProfile({
            ...userProfile,
            section: studentData.section || userProfile.section,
            roll_number: studentData.roll_number || userProfile.roll_number
          });
          return;
        }
      }

      setProfile(userProfile);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Get initial session - set loading to false immediately after session check
    // Profile can load in background
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;

      if (error) {
        console.error('Error getting session:', error);
        setLoading(false);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);

      // Set loading to false immediately - don't wait for profile
      setLoading(false);

      // Fetch profile in background (non-blocking)
      if (session?.user) {
        fetchProfile(session.user.id).catch(err => {
          console.error('Background profile fetch failed:', err);
        });
      }
    }).catch((error) => {
      console.error('Error in getSession:', error);
      if (mounted) setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      // Set loading to false immediately
      setLoading(false);

      // Fetch profile in background (non-blocking)
      if (session?.user) {
        fetchProfile(session.user.id).catch(err => {
          console.error('Background profile fetch failed:', err);
        });
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      // Ensure we always use the current origin, not a hardcoded production URL
      const currentOrigin = window.location.origin;
      const redirectUrl = `${currentOrigin}/auth/callback`;
      
      // Log for debugging (remove in production if needed)
      console.log('OAuth redirect URL:', redirectUrl);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setProfile(null);
      setSession(null);
    } catch (error: any) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const isAdmin =
    (profile?.is_admin ?? false) ||
    (!!user?.email && isBootstrapAdminEmail(user.email));

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        isAdmin,
        signInWithGoogle,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
