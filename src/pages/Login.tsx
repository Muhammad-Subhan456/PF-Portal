import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Mail, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { isAllowedLoginEmail } from "@/lib/auth";

const Login = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signInWithGoogle, user } = useAuth();

  // Check for error in URL params
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        'session_error': 'Session error. Please try again.',
        'no_email': 'No email found. Please try again.',
        'access_denied': 'Access denied.',
        'callback_error': 'Authentication error. Please try again.',
      };
      setError(errorMessages[errorParam] || decodeURIComponent(errorParam));
    }
  }, [searchParams]);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await signInWithGoogle();
      // User will be redirected to Google, then to /auth/callback
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to sign in with Google. Please try again.');
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary mx-auto mb-4 shadow-soft">
            <span className="text-2xl font-bold text-primary-foreground">PF</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Programming Fundamentals Portal</h1>
          <p className="text-muted-foreground">Programming Fundamentals</p>
          <p className="text-sm text-muted-foreground">PUCIT - Fall 2026</p>
        </div>

        {/* Login Card */}
        <div 
          className="bg-card rounded-2xl border border-border p-8 shadow-card animate-fade-in"
          style={{ animationDelay: "100ms" }}
        >
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-foreground mb-1">Welcome Back</h2>
            <p className="text-sm text-muted-foreground">Sign in with your PUCIT email</p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4 rounded-xl">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address (for reference)</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="bcsf23m001@pucit.edu.pk"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  className="pl-10 rounded-xl"
                  disabled={isLoading}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Use your official @pucit.edu.pk email (or leave blank). You'll sign in with Google.
              </p>
              {email && !isAllowedLoginEmail(email) && (
                <p className="text-xs text-destructive">
                  Invalid email. Use rollnumber@pucit.edu.pk or a configured owner email.
                </p>
              )}
            </div>

            <Button 
              type="button"
              onClick={handleGoogleLogin}
              className="w-full rounded-xl gap-2 bg-primary hover:bg-primary/90 h-12"
              disabled={isLoading || (!!email && !isAllowedLoginEmail(email))}
            >
              {isLoading ? (
                <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  Continue with Google
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Footer */}
        <p 
          className="text-center text-xs text-muted-foreground mt-6 animate-fade-in"
          style={{ animationDelay: "200ms" }}
        >
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default Login;
