import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { extractRollNumber, isBootstrapAdminEmail, validateUserAccess } from '@/lib/auth';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the session from the URL hash
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          navigate('/login?error=session_error');
          return;
        }

        if (!session?.user?.email) {
          navigate('/login?error=no_email');
          return;
        }

        const email = session.user.email;

        // Validate user access
        const validation = await validateUserAccess(email);
        
        if (!validation.valid) {
          // Sign out if not valid
          await supabase.auth.signOut();
          navigate(`/login?error=${encodeURIComponent(validation.error || 'access_denied')}`);
          return;
        }

        // Update user profile with roll number if not set
        const rollNumber = extractRollNumber(email);
        
        // Check if user is in admins table and sync to users table
        const { data: adminData } = await supabase
          .from('admins')
          .select('*')
          .eq('email', email.toLowerCase())
          .eq('is_active', true)
          .maybeSingle();

        const isAdminFromAdminsTable = !!adminData;
        const isBootstrap = isBootstrapAdminEmail(email);

        // Update user record
        const updateData: any = {
          email: email.toLowerCase(),
          last_login: new Date().toISOString(),
        };

        if (rollNumber) {
          updateData.roll_number = rollNumber;
        }

        // Sync admin status from admins table / bootstrap env to users table
        // (is_admin may only stick if already admin via RLS; SQL promote covers the rest)
        if (isAdminFromAdminsTable || isBootstrap) {
          updateData.is_admin = true;
        }

        const { error: updateError } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', session.user.id);

        if (updateError) {
          console.error('Error updating user:', updateError);
        }

        // Check if user is admin (from users table or admins table)
        const { data: userData } = await supabase
          .from('users')
          .select('is_admin')
          .eq('id', session.user.id)
          .single();

        const isAdmin = userData?.is_admin || isAdminFromAdminsTable || isBootstrap;

        // Redirect based on role
        if (isAdmin) {
          navigate('/admin');
        } else {
          navigate('/');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/login?error=callback_error');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
