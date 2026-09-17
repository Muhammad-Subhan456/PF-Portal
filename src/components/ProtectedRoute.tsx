import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, loading, isAdmin, profile } = useAuth();
  const location = useLocation();

  // Show loading spinner only briefly
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If no user, redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If admin required, check admin status
  // Only redirect if profile is loaded and confirmed not admin
  // If profile is null (still loading in background), allow through
  if (requireAdmin) {
    if (profile !== null && !isAdmin) {
      return <Navigate to="/" replace />;
    }
    // If profile is null, allow through - it will load in background
    // isAdmin will update when profile loads
  }

  return <>{children}</>;
}
